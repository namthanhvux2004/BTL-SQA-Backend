import z from 'zod';
import { multerFileDto } from './image.dto';

export const GetArticleByIdDto = z.object({
    id: z.uuid('Invalid article format'),
});

export const GetArticleBySlugDto = z.object({
    slug: z.string().min(3, 'Slug is required'),
});

export const getFeaturedArticlesDto = z.object({
    page: z.string().optional().default('1'),
    limit: z.string().optional().default('10'),
    sortBy: z
        .enum(['viewCount', 'createdAt', 'publishedAt', 'title'])
        .optional()
        .default('viewCount'),
    sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
    search: z.string().optional(),
    featured: z
        .string()
        .optional()
        .transform((val) => {
            if (val === undefined || val === '') return undefined;
            return val === 'true';
        }),
    minViews: z
        .string()
        .optional()
        .transform((val) => (val ? parseInt(val) : 1)),
    categoryId: z.uuid('Category ID không hợp lệ').optional(),
    slug: z.string().optional(),
});

// DTO lấy bài viết theo chuyên mục
export const getArticlesByCategoryDto = z.object({
    categoryId: z.uuid('Category ID không hợp lệ'),
});

export const getArticlesByCategoryQueryDto = z.object({
    page: z.string().optional().default('1'),
    limit: z.string().optional().default('10'),
    sortBy: z
        .enum(['name', 'createdAt', 'updatedAt'])
        .optional()
        .default('name'),
    sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
    search: z.string().optional(),
});

// DTO lấy bài viết xem nhiều nhất của tất cả chuyên mục
export const getMostViewedArticlesDto = z.object({
    page: z.string().optional().default('1'),
    limit: z.string().optional().default('10'),
    sortBy: z
        .enum(['name', 'createdAt', 'updatedAt'])
        .optional()
        .default('name'),
    sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
    search: z.string().optional(),
    minViews: z
        .string()
        .optional()
        .transform((val) => (val ? parseInt(val) : 1)),
});

export const getRelatedArticlesDto = z.object({
    page: z.coerce
        .number()
        .min(1, 'Số trang phải lớn hơn 0')
        .optional()
        .default(1),
    limit: z.coerce
        .number()
        .min(1)
        .max(100, 'Giới hạn tối đa là 100')
        .optional(),
    sortBy: z
        .enum(['name', 'createdAt', 'updatedAt'], 'Trường sắp xếp không hợp lệ')
        .optional()
        .default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
    articleId: z.string(),
});

export const getArticlesDto = z.object({
    page: z.coerce
        .number()
        .min(1, 'Số trang phải lớn hơn 0')
        .optional()
        .default(1),
    limit: z.coerce.number().min(1, 'Số lượng phải lớn hơn 0').optional(),
    sortBy: z
        .enum(['title', 'createdAt', 'updatedAt', 'viewCount', 'publishedAt'])
        .optional()
        .default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
    search: z.string().optional(),
    categoryId: z.uuid('Category ID không hợp lệ').optional(),
    authorId: z.uuid('Author ID không hợp lệ').optional(),
    assigneeId: z.uuid('Assignee ID không hợp lệ').optional(),
    status: z
        .enum([
            'draft',
            'pending_review',
            'published',
            'rejected',
            'reedited',
            'pending_review',
        ])
        .optional(),
});

export type GetFeaturedArticlesDataDto = z.infer<typeof getFeaturedArticlesDto>;
export type GetArticleByIdDataDto = z.infer<typeof GetArticleByIdDto>;
export type GetArticleBySlugDataDto = z.infer<typeof GetArticleBySlugDto>;
export type GetArticlesByCategoryDataDto = z.infer<
    typeof getArticlesByCategoryDto
>;
export type GetArticlesByCategoryQueryDataDto = z.infer<
    typeof getArticlesByCategoryQueryDto
>;
export type GetMostViewedArticlesDataDto = z.infer<
    typeof getMostViewedArticlesDto
>;

export type GetRelatedArticlesDataDto = z.infer<typeof getRelatedArticlesDto>;
export type GetArticlesDataDto = z.infer<typeof getArticlesDto>;

export const UploadImageCreateArticleDto = z
    .object({
        thumbnail: z.array(multerFileDto).length(1, 'Thumbnail is required'),
        images: z
            .array(multerFileDto)
            .max(10, 'Maximum 10 images allowed')
            .optional(),
    })
    .loose();

export type UploadImageCreateArticleDto = z.infer<
    typeof UploadImageCreateArticleDto
>;

export const UploadImageUpdateArticleDto = z
    .object({
        newThumbnail: z
            .array(multerFileDto)
            .max(1, 'Maximum 1 thumbnail allowed')
            .optional(),
        newImages: z
            .array(multerFileDto)
            .max(10, 'Maximum 10 images allowed')
            .optional(),
    })
    .loose();

export type UploadImageUpdateArticleDto = z.infer<
    typeof UploadImageUpdateArticleDto
>;

// DTO để tạo bài viết mới
export const CreateArticleDto = z.object({
    slug: z.string().optional(),
    title: z.string().min(3, 'Tiêu đề phải có ít nhất 3 ký tự'),
    content: z.string().min(10, 'Nội dung phải có ít nhất 10 ký tự'),
    summary: z.string().optional(),
    categoryId: z.uuid('Category ID không hợp lệ'),
    authorId: z.string().uuid('Author ID không hợp lệ').optional(),
    status: z
        .enum(['draft', 'pending_review', 'published', 'rejected'])
        .optional()
        .default('draft'),
    featured: z
        .string()
        .optional()
        .transform((val) => {
            if (val === undefined || val === '' || !val) return false;
            return val === 'true' || val === '1';
        }),
    extras: z
        .string()
        .optional()
        .transform((val) => {
            if (!val || val === '') return undefined;
            try {
                return JSON.parse(val);
            } catch {
                return undefined;
            }
        }),
    toc: z
        .string()
        .optional()
        .transform((val) => {
            if (!val || val === '') return undefined;
            try {
                return JSON.parse(val);
            } catch {
                return undefined;
            }
        }),
    publishedAt: z
        .string()
        .optional()
        .refine((v) => v === 'now' || (v && !Number.isNaN(Date.parse(v))), {
            message: 'publishedAt không hợp lệ',
        }),
    imagesUrl: z
        .string()
        .optional()
        .transform((val) => {
            if (!val || val === '') return undefined;
            try {
                return JSON.parse(val);
            } catch {
                return undefined;
            }
        }),
    deletedImages: z.array(z.string()).optional(),
});

// DTO để cập nhật bài viết
export const UpdateArticleDto = z.object({
    slug: z.string().optional(),
    title: z
        .string()
        .optional()
        .transform((val) => (val === '' ? undefined : val))
        .pipe(z.string().min(3, 'Tiêu đề phải có ít nhất 3 ký tự').optional()),
    content: z
        .string()
        .optional()
        .transform((val) => (val === '' ? undefined : val))
        .pipe(
            z.string().min(10, 'Nội dung phải có ít nhất 10 ký tự').optional()
        ),
    summary: z
        .string()
        .optional()
        .transform((val) => (val === '' ? undefined : val)),
    categoryId: z
        .string()
        .optional()
        .transform((val) => (val === '' ? undefined : val))
        .pipe(z.string().uuid('Category ID không hợp lệ').optional()),
    status: z
        .enum(['draft', 'pending_review', 'published', 'rejected'])
        .optional(),
    featured: z
        .string()
        .optional()
        .transform((val) => {
            if (val === undefined || val === '' || !val) return undefined;
            return val === 'true' || val === '1';
        }),
    extras: z
        .string()
        .optional()
        .transform((val) => {
            if (!val || val === '') return undefined;
            try {
                return JSON.parse(val);
            } catch {
                return undefined;
            }
        }),
    toc: z
        .string()
        .optional()
        .transform((val) => {
            if (!val || val === '') return undefined;
            try {
                return JSON.parse(val);
            } catch {
                return undefined;
            }
        }),
    publishedAt: z
        .string()
        .optional()
        .refine((v) => v === 'now' || (v && !Number.isNaN(Date.parse(v))), {
            message: 'publishedAt không hợp lệ',
        }),
    thumbnail: z.string().optional(),
    imagesUrl: z
        .string()
        .optional()
        .transform((val) => {
            if (!val || val === '') return undefined;
            try {
                return JSON.parse(val);
            } catch {
                return undefined;
            }
        }),
    deletedImages: z
        .string()
        .optional()
        .transform((val) => {
            if (!val || val === '') return undefined;
            try {
                return JSON.parse(val);
            } catch {
                return undefined;
            }
        }),
});

// DTO để xóa bài viết
export const DeleteArticleDto = z.object({
    id: z.uuid('Invalid article ID'),
});

export type CreateArticleDataDto = z.infer<typeof CreateArticleDto>;
export type UpdateArticleDataDto = z.infer<typeof UpdateArticleDto>;
export type DeleteArticleDataDto = z.infer<typeof DeleteArticleDto>;
