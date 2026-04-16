import prisma from '@src/config/prisma';

export const findUserByEmail = async (email: string) => {
    return prisma.user.findUnique({
        where: { email },
        include: {
            role: true,
            name: true,
            address: true,
        },
    });
};

export const findUserById = async (id: string) => {
    return prisma.user.findUnique({
        where: { id },
        include: {
            role: true,
            name: true,
            address: true,
        },
    });
};
