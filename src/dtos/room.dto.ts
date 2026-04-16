import z from 'zod';

export const RoomStatus = z.enum(['not_used', 'used', 'maintenance']);
export type RoomStatus = z.infer<typeof RoomStatus>;

export const RoomType = z.string();

export const getBuildingsDto = z.object({
    page: z.string().optional().default('1'),
    limit: z.string().optional().default('10'),
    search: z.string().optional(),
    sortBy: z
        .enum(['name', 'createdAt', 'updatedAt'])
        .optional()
        .default('name'),
    sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
});

export const getListRoomDto = z.object({
    page: z.string().optional().default('1'),
    limit: z.string().optional().default('10'),
    search: z.string().optional(),
    sortBy: z
        .enum(['name', 'createdAt', 'updatedAt'])
        .optional()
        .default('name'),
    sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
    buildingId: z.string().optional(),
    type: RoomType.optional(),
    status: RoomStatus.optional(),
});

export const createRoomDto = z.object({
    buildingId: z.string().min(1),
    name: z.string().min(1).max(150),
    numberRoom: z.number().int().nonnegative(),
    floor: z.number().int(),
    type: RoomType,
    status: RoomStatus.optional().default('not_used'),
});

export const updateRoomDto = z
    .object({
        name: z.string().min(1).max(150).optional(),
        numberRoom: z.number().int().nonnegative().optional(),
        floor: z.number().int().optional(),
        type: RoomType.optional(),
        status: RoomStatus.optional(),
    })
    .partial();

export type GetBuildingsDTO = z.infer<typeof getBuildingsDto>;
export type GetListRoomDTO = z.infer<typeof getListRoomDto>;
export type CreateRoomDto = z.infer<typeof createRoomDto>;
export type UpdateRoomDto = z.infer<typeof updateRoomDto>;
