import { Role, UserRole } from '@prisma/client';
import prisma from '@src/config/prisma';
import { AddRoleDataDto } from '@src/dtos/role.dto';

const getRoleByName = (value: string): Promise<Role | null> => {
    return prisma.role.findUnique({
        where: {
            name: value as UserRole,
        },
    });
};

const getRoleById = (id: number): Promise<Role | null> => {
    return prisma.role.findUnique({
        where: {
            id,
        },
    });
};

const addRole = (data: AddRoleDataDto): Promise<Role> => {
    return prisma.role.create({
        data: data,
    });
};

export default {
    getRoleByName,
    getRoleById,
    addRole,
};
