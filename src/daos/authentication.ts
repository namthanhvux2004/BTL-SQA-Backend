import { Authentication } from '@prisma/client';
import prisma from '@src/config/prisma';

export const updateAuthentication = async (
    userId: string,
    data: Omit<Authentication, 'userId'>
) => {
    await prisma.authentication.update({
        where: {
            userId,
        },
        data,
    });
};
