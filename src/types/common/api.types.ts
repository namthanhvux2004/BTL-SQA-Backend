import { z } from 'zod'; // Query Parameters

export const PaginationQueryDto = z.object({
    page: z.string().optional().default('1'),
    limit: z.string().optional(),
    sortBy: z.string().optional().default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
    search: z.string().optional(),
    filter: z.string().optional(),
});

export type PaginationQuery = z.infer<typeof PaginationQueryDto>;
