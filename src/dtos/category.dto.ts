import z from 'zod';

export const GetCategoriesDto = z.object({
    page: z.string().optional().default('1'),
    limit: z.string().optional(),
    sortBy: z
        .enum(['name', 'createdAt', 'updatedAt'])
        .optional()
        .default('name'),
    sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
    search: z.string().optional(),
    parentId: z.string().uuid().optional(),
    includeChildren: z
        .string()
        .optional()
        .transform((val) => val === 'true')
        .default(false),
});

export const GetCategoryByIdDto = z.object({
    id: z.uuid('Invalid category ID format'),
});

export const GetCategoryBySlugDto = z.object({
    slug: z.string().min(3, 'Slug is required'),
});

export const UpdateCategoryDto = z.object({
    name: z.string().min(1, 'Tên danh mục không được để trống'),
    description: z.string().optional(),
    parentId: z.uuid('ID danh mục cha không hợp lệ').optional(),
});

export const AddCategoryDto = z.object({
    name: z.string().min(1, 'Tên danh mục không được để trống'),
    description: z.string().optional(),
    parentId: z.uuid('ID danh mục cha không hợp lệ').optional(),
});

export type GetCategoriesDataDto = z.infer<typeof GetCategoriesDto>;
export type GetCategoryByIdDataDto = z.infer<typeof GetCategoryByIdDto>;
export type GetCategoryBySlugDataDto = z.infer<typeof GetCategoryBySlugDto>;
export type AddCategoryDataDto = z.infer<typeof UpdateCategoryDto>;
export type UpdateCategoryDataDto = z.infer<typeof AddCategoryDto>;
