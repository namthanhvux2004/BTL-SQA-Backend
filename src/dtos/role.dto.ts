import z from 'zod';

export const addRoleDto = z.object({
    name: z.string().min(1, 'Role name is required'),
    prefix: z.string().min(1, 'Role prefix is required'),
});

export type AddRoleDataDto = z.infer<typeof addRoleDto>;
