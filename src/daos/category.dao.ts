import prisma from '@src/config/prisma';
import { createQueryBuilder } from '@src/helpers/queryBuilder';
import { PaginationQuery } from '@src/types/common/api.types';
import {
    AddCategoryDataDto,
    GetCategoriesDataDto,
    UpdateCategoryDataDto,
} from '@src/dtos/category.dto';
import { Prisma } from '@prisma/client';
import slugify from 'slugify';

export const findCategories = async (options: GetCategoriesDataDto) => {
    const queryBuilder = createQueryBuilder('category');

    const pagination: PaginationQuery = {
        page: options.page || '1',
        limit: options.limit,
        sortBy: options.sortBy || 'name',
        sortOrder: options.sortOrder || 'asc',
        search: options.search || '',
    };

    const whereCondition: Prisma.CategoryWhereInput = {};

    if (options.parentId !== undefined) {
        whereCondition.parentId =
            options.parentId === 'null' ? null : options.parentId;
    }

    if (options.search) {
        whereCondition.OR = [
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
        ];
    }

    return await queryBuilder.findManyWithPagination(
        {
            where: whereCondition,
            include: {
                parent: {
                    select: {
                        id: true,
                        name: true,
                        slug: true,
                    },
                },
                ...(options.includeChildren && {
                    children: {
                        select: {
                            id: true,
                            name: true,
                            slug: true,
                            description: true,
                            createdAt: true,
                            _count: {
                                select: {
                                    articles: true,
                                },
                            },
                        },
                    },
                }),
                _count: {
                    select: {
                        articles: true,
                    },
                },
            },
        },
        pagination
    );
};

export const findCategoryById = async (id: string) => {
    return prisma.category.findUnique({
        where: { id },
        include: {
            parent: {
                select: {
                    id: true,
                    name: true,
                    slug: true,
                },
            },
            children: {
                select: {
                    id: true,
                    name: true,
                    slug: true,
                    description: true,
                    createdAt: true,
                    _count: {
                        select: {
                            articles: true,
                        },
                    },
                },
            },
            _count: {
                select: {
                    articles: true,
                },
            },
        },
    });
};

export const findCategoryByName = async (name: string) => {
    return prisma.category.findFirst({
        where: {
            name: {
                equals: name,
                mode: 'insensitive',
            },
        },
    });
};

export const findCategoryBySlug = async (slug: string) => {
    return prisma.category.findUnique({
        where: { slug },
    });
};

export const createCategory = async (data: AddCategoryDataDto) => {
    const { parentId, name, description, ...rest } = data;
    const slug = slugify(name, { lower: true, strict: true });

    const categoryData: Prisma.CategoryCreateInput = {
        name,
        slug,
        description: description ?? null,
        ...rest,
    };

    if (parentId) {
        categoryData.parent = {
            connect: { id: parentId },
        };
    }

    return prisma.category.create({
        data: categoryData,
    });
};

export const updateCategory = async (
    id: string,
    data: Partial<UpdateCategoryDataDto>
) => {
    const { parentId, name, description, ...rest } = data;

    const categoryData: Prisma.CategoryUpdateInput = {
        ...rest,
    };

    if (name) {
        categoryData.name = name;
        categoryData.slug = slugify(name, { lower: true, strict: true });
    }

    if (description !== undefined) {
        categoryData.description = description;
    }

    if (parentId !== undefined) {
        if (parentId === null) {
            categoryData.parent = {
                disconnect: true,
            };
        } else {
            categoryData.parent = {
                connect: { id: parentId },
            };
        }
    }

    return prisma.category.update({
        where: { id },
        data: categoryData,
    });
};

export const deleteCategory = async (id: string) => {
    return prisma.category.delete({
        where: { id },
    });
};
