import prisma from '@src/config/prisma';
import { ArticleStatus } from '@prisma/client';
import { createQueryBuilder } from '@src/helpers/queryBuilder';
import { PaginationQuery } from '@src/types/common/api.types';
import {
    GetArticlesDataDto,
    GetFeaturedArticlesDataDto,
    GetRelatedArticlesDataDto,
} from '@src/dtos/article.dto';

export const findArticleById = async (id: string) => {
    return prisma.healthArticle.findFirst({
        where: {
            id,
        },
        include: {
            author: {
                select: {
                    id: true,
                    username: true,
                    email: true,
                    avatar: true,
                    name: {
                        select: {
                            firstName: true,
                            lastName: true,
                        },
                    },
                    role: {
                        select: {
                            id: true,
                            name: true,
                            prefix: true,
                        },
                    },
                },
            },
            category: {
                select: {
                    id: true,
                    name: true,
                    slug: true,
                    description: true,
                    parent: {
                        select: {
                            id: true,
                            name: true,
                            slug: true,
                        },
                    },
                },
            },
        },
    });
};

export const findArticleBySlug = async (slug: string) => {
    return prisma.healthArticle.findFirst({
        where: {
            slug,
        },
        include: {
            author: {
                select: {
                    id: true,
                    username: true,
                    email: true,
                    avatar: true,
                    name: {
                        select: {
                            firstName: true,
                            lastName: true,
                        },
                    },
                    role: {
                        select: {
                            id: true,
                            name: true,
                            prefix: true,
                        },
                    },
                },
            },
            category: {
                select: {
                    id: true,
                    name: true,
                    slug: true,
                    description: true,
                    parent: {
                        select: {
                            id: true,
                            name: true,
                            slug: true,
                        },
                    },
                },
            },
        },
    });
};

export const incrementViewCount = async (id: string) => {
    return prisma.healthArticle.update({
        where: { id },
        data: {
            viewCount: {
                increment: 1,
            },
        },
    });
};

// Lấy các bài viết nổi bật
export const findFeaturedArticles = async (
    options: GetFeaturedArticlesDataDto
) => {
    const queryBuilder = createQueryBuilder('healthArticle');

    const pagination: PaginationQuery = {
        page: options.page || '1',
        limit: options.limit || '10',
        sortBy: options.sortBy || 'viewCount',
        sortOrder: options.sortOrder || 'desc',
        search: options.search || '',
    };

    return await queryBuilder.findManyWithPagination(
        {
            where: {
                status: ArticleStatus.published,
                ...(options.categoryId && { categoryId: options.categoryId }),
                ...(options.slug && { category: { slug: options.slug } }),
                viewCount: {
                    gte: options.minViews || 1,
                },
                ...(options.featured === undefined
                    ? { featured: true }
                    : { featured: options.featured }),
                ...(options.search && {
                    OR: [
                        {
                            title: {
                                contains: options.search,
                                mode: 'insensitive',
                            },
                        },
                        {
                            content: {
                                contains: options.search,
                                mode: 'insensitive',
                            },
                        },
                    ],
                }),
            },
            select: {
                id: true,
                title: true,
                slug: true,
                status: true,
                summary: true,
                imageUrl: true,
                viewCount: true,
                publishedAt: true,
                createdAt: true,
                updatedAt: true,
                author: {
                    select: {
                        id: true,
                        avatar: true,
                        name: {
                            select: {
                                firstName: true,
                                lastName: true,
                            },
                        },
                    },
                },
                category: {
                    select: {
                        id: true,
                        name: true,
                        slug: true,
                    },
                },
            },
        },
        pagination
    );
};

// Lấy bài viết mới nhất của tất cả các chuyên mục
export const findLatestArticlesByAllCategory = async (options: {
    page: string;
    limit: string;
    sortBy: 'name' | 'createdAt' | 'updatedAt';
    sortOrder: 'asc' | 'desc';
    search?: string | undefined;
}) => {
    const queryBuilder = createQueryBuilder('category');

    const pagination: PaginationQuery = {
        page: options.page || '1',
        limit: options.limit || '10',
        sortBy: options.sortBy || 'createdAt',
        sortOrder: options.sortOrder || 'desc',
        search: options.search || '',
    };

    // Lấy danh sách chuyên mục có bài viết
    const categoriesResult = await queryBuilder.findManyWithPagination(
        {
            where: {
                articles: {
                    some: {
                        status: ArticleStatus.published,
                    },
                },
                ...(options.search && {
                    OR: [
                        {
                            name: {
                                contains: options.search,
                                mode: 'insensitive',
                            },
                            description: {
                                contains: options.search,
                                mode: 'insensitive',
                            },
                        },
                    ],
                }),
            },
            select: {
                id: true,
                name: true,
                slug: true,
                description: true,
                status: true,
                _count: {
                    select: {
                        articles: {
                            where: {
                                status: ArticleStatus.published,
                            },
                        },
                    },
                },
            },
        },
        pagination
    );

    // Lấy bài viết mới nhất của từng chuyên mục
    const categoriesWithLatestArticles = await Promise.all(
        categoriesResult.data.map(async (category) => {
            const latestArticle = await prisma.healthArticle.findFirst({
                where: {
                    categoryId: category.id,
                    status: ArticleStatus.published,
                },
                orderBy: {
                    createdAt: 'desc',
                },
                select: {
                    id: true,
                    title: true,
                    slug: true,
                    summary: true,
                    status: true,
                    imageUrl: true,
                    viewCount: true,
                    publishedAt: true,
                    author: {
                        select: {
                            id: true,
                            avatar: true,
                            name: {
                                select: {
                                    firstName: true,
                                    lastName: true,
                                },
                            },
                        },
                    },
                },
            });
            return {
                ...category,
                latestArticle,
            };
        })
    );
    return {
        data: categoriesWithLatestArticles,
        metadata: categoriesResult.metadata,
    };
};

// Lấy tất cả các bài viết của một chuyên mục cụ thể
export const findArticlesByCategory = async (
    categoryId: string,
    options: {
        page?: string;
        limit?: string;
        sortBy?: string;
        sortOrder?: 'asc' | 'desc';
        search?: string | undefined;
    }
) => {
    const queryBuilder = createQueryBuilder('healthArticle');

    const pagination: PaginationQuery = {
        page: options.page || '1',
        limit: options.limit || '10',
        sortBy: options.sortBy || 'createdAt',
        sortOrder: options.sortOrder || 'desc',
        search: options.search || '',
    };

    return await queryBuilder.findManyWithPagination(
        {
            where: {
                categoryId: categoryId,
                status: ArticleStatus.published,
                ...(options.search && {
                    OR: [
                        {
                            title: {
                                contains: options.search,
                                mode: 'insensitive',
                            },
                            summary: {
                                contains: options.search,
                                mode: 'insensitive',
                            },
                        },
                    ],
                }),
            },
            select: {
                id: true,
                title: true,
                slug: true,
                status: true,
                updatedAt: true,
                summary: true,
                imageUrl: true,
                viewCount: true,
                publishedAt: true,
                createdAt: true,
                author: {
                    select: {
                        id: true,
                        avatar: true,
                        name: {
                            select: {
                                firstName: true,
                                lastName: true,
                            },
                        },
                    },
                },
                category: {
                    select: {
                        id: true,
                        name: true,
                        slug: true,
                    },
                },
            },
        },
        pagination
    );
};

// Lấy bài viết xem nhiều nhất của tất cả các chuyên mục
export const findMostViewedArticlesByAllCategory = async (options: {
    page: string;
    limit: string;
    sortBy: 'name' | 'createdAt' | 'updatedAt';
    sortOrder: 'asc' | 'desc';
    minViews: number;
    search?: string | undefined;
}) => {
    const queryBuilder = createQueryBuilder('category');

    const pagination: PaginationQuery = {
        page: options.page || '1',
        limit: options.limit || '10',
        sortBy: options.sortBy || 'name',
        sortOrder: options.sortOrder || 'asc',
        search: options.search || '',
    };

    // Lấy danh sách chuyên mục có bài viết thỏa minViews
    const categoriesResult = await queryBuilder.findManyWithPagination(
        {
            where: {
                articles: {
                    some: {
                        status: ArticleStatus.published,
                        ...(options.minViews !== undefined
                            ? { viewCount: { gte: options.minViews } }
                            : {}),
                    },
                },
                ...(options.search && {
                    OR: [
                        {
                            name: {
                                contains: options.search,
                                mode: 'insensitive',
                            },
                        },
                        {
                            description: {
                                contains: options.search,
                                mode: 'insensitive',
                            },
                        },
                    ],
                }),
            },
            select: {
                id: true,
                name: true,
                slug: true,
                status: true,
                description: true,
                _count: {
                    select: {
                        articles: {
                            where: {
                                status: ArticleStatus.published,
                                ...(options.minViews !== undefined
                                    ? { viewCount: { gte: options.minViews } }
                                    : {}),
                            },
                        },
                    },
                },
            },
        },
        pagination
    );

    // Lấy bài viết có viewCount cao nhất của từng chuyên mục
    const categoriesWithTopArticles = await Promise.all(
        categoriesResult.data.map(async (category) => {
            const topArticle = await prisma.healthArticle.findFirst({
                where: {
                    categoryId: category.id,
                    status: ArticleStatus.published,
                    ...(options.minViews !== undefined
                        ? { viewCount: { gte: options.minViews } }
                        : {}),
                },
                orderBy: {
                    viewCount: 'desc',
                },
                select: {
                    id: true,
                    title: true,
                    slug: true,
                    summary: true,
                    status: true,
                    imageUrl: true,
                    viewCount: true,
                    publishedAt: true,
                    author: {
                        select: {
                            id: true,
                            avatar: true,
                            name: {
                                select: {
                                    firstName: true,
                                    lastName: true,
                                },
                            },
                        },
                    },
                },
            });

            return {
                ...category,
                mostViewedArticle: topArticle,
            };
        })
    );

    return {
        data: categoriesWithTopArticles,
        metadata: categoriesResult.metadata,
    };
};

export const findRelatedArticles = async (
    options: GetRelatedArticlesDataDto
) => {
    const queryBuilder = createQueryBuilder('healthArticle');
    const pagination: PaginationQuery = {
        page: String(options.page || 1),
        limit: String(options.limit || 10),
        sortBy: options.sortBy || 'createdAt',
        sortOrder: options.sortOrder || 'desc',
    };

    const article = await prisma.healthArticle.findUnique({
        where: {
            id: options.articleId,
        },
        select: {
            categoryId: true,
        },
    });

    if (!article) {
        return {
            data: [],
            metadata: {
                page: 1,
                limit: 10,
                totalItems: 0,
                totalPages: 0,
                hasNext: false,
                hasPrev: false,
            },
        };
    }
    return await queryBuilder.findManyWithPagination(
        {
            where: {
                categoryId: article.categoryId,
                status: ArticleStatus.published,
                id: {
                    not: options.articleId,
                },
            },
            select: {
                id: true,
                title: true,
                slug: true,
                summary: true,
                imageUrl: true,
                viewCount: true,
                status: true,
                publishedAt: true,
                createdAt: true,
                author: {
                    select: {
                        id: true,
                        avatar: true,
                        name: {
                            select: {
                                firstName: true,
                                lastName: true,
                            },
                        },
                    },
                },
                category: {
                    select: {
                        id: true,
                        name: true,
                        slug: true,
                    },
                },
            },
        },
        pagination
    );
};

export const findArticles = async (options: GetArticlesDataDto) => {
    const pagination: PaginationQuery = {
        page: String(options.page || 1),
        limit: options.limit ? String(options.limit) : undefined,
        sortBy: options.sortBy || 'createdAt',
        sortOrder: options.sortOrder || 'desc',
    };
    const queryBuilder = createQueryBuilder('healthArticle');
    return await queryBuilder.findManyWithPagination(
        {
            where: {
                ...(options.categoryId
                    ? { categoryId: options.categoryId }
                    : {}),
                ...(options.authorId ? { authorId: options.authorId } : {}),
                ...(options.assigneeId
                    ? { assigneeId: options.assigneeId }
                    : {}),
                ...(options.status ? { status: options.status } : {}),
                ...(options.search && {
                    OR: [
                        {
                            title: {
                                contains: options.search,
                                mode: 'insensitive',
                            },
                        },
                        {
                            summary: {
                                contains: options.search,
                                mode: 'insensitive',
                            },
                        },
                    ],
                }),
            },
            select: {
                id: true,
                title: true,
                slug: true,
                summary: true,
                imageUrl: true,
                viewCount: true,
                publishedAt: true,
                createdAt: true,
                updatedAt: true,
                status: true,
                featured: true,
                reasonReject: true,
                author: {
                    select: {
                        id: true,
                        avatar: true,
                        name: {
                            select: {
                                firstName: true,
                                lastName: true,
                            },
                        },
                    },
                },
                category: {
                    select: {
                        id: true,
                        name: true,
                        slug: true,
                    },
                },
            },
        },
        pagination
    );
};

// Tìm bài viết theo ID (cho chỉnh sửa - không phân biệt status)
export const findArticleByIdForEdit = async (id: string) => {
    return prisma.healthArticle.findUnique({
        where: { id },
        include: {
            author: {
                select: {
                    id: true,
                    username: true,
                    email: true,
                    avatar: true,
                    name: {
                        select: {
                            firstName: true,
                            lastName: true,
                        },
                    },
                    role: {
                        select: {
                            id: true,
                            name: true,
                            prefix: true,
                        },
                    },
                },
            },
            category: {
                select: {
                    id: true,
                    name: true,
                    slug: true,
                    description: true,
                },
            },
        },
    });
};

// Tạo bài viết mới
export const createArticle = async (data: {
    title: string;
    content: string;
    summary?: string;
    slug: string;
    imageUrl?: string;
    images?: string[];
    authorId: string;
    categoryId: string;
    status?: ArticleStatus;
    featured?: boolean;
    extras?: any;
    toc?: any;
}) => {
    return prisma.healthArticle.create({
        data: {
            ...data,
            publishedAt:
                data.status === ArticleStatus.published ? new Date() : null,
        },
        include: {
            author: {
                select: {
                    id: true,
                    username: true,
                    email: true,
                    avatar: true,
                    name: {
                        select: {
                            firstName: true,
                            lastName: true,
                        },
                    },
                },
            },
            category: {
                select: {
                    id: true,
                    name: true,
                    slug: true,
                },
            },
        },
    });
};

// Cập nhật bài viết
export const updateArticle = async (
    id: string,
    data: {
        title?: string;
        content?: string;
        summary?: string;
        slug?: string;
        imageUrl?: string | null;
        images?: string[];
        categoryId?: string;
        status?: ArticleStatus;
        featured?: boolean;
        extras?: any;
        toc?: any;
        reasonReject?: string;
        assigneeId?: string;
    }
) => {
    // Nếu status thay đổi thành published, cập nhật publishedAt
    const updateData: any = { ...data };
    if (data.status === ArticleStatus.published) {
        updateData.publishedAt = new Date();
    }

    return prisma.healthArticle.update({
        where: { id },
        data: updateData,
        include: {
            author: {
                select: {
                    id: true,
                    username: true,
                    email: true,
                    avatar: true,
                    name: {
                        select: {
                            firstName: true,
                            lastName: true,
                        },
                    },
                },
            },
            category: {
                select: {
                    id: true,
                    name: true,
                    slug: true,
                },
            },
        },
    });
};

// Xóa bài viết
export const deleteArticle = async (id: string) => {
    return prisma.healthArticle.delete({
        where: { id },
    });
};

// Kiểm tra slug đã tồn tại chưa
export const checkSlugExists = async (slug: string, excludeId?: string) => {
    return prisma.healthArticle.findFirst({
        where: {
            slug,
            ...(excludeId && { id: { not: excludeId } }),
        },
        select: { id: true },
    });
};
