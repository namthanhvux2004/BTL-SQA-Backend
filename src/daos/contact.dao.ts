import { Contact } from '@prisma/client';
import prisma from '@src/config/prisma';
import { CreateContactDataDto } from '@src/dtos/contact.dto';
import { createQueryBuilder } from '@src/helpers/queryBuilder';
import { PaginationQuery } from '@src/types/common/api.types';

const contactQuery = createQueryBuilder('contact');

export const createContact = async (
    data: CreateContactDataDto & { userId?: string }
) => {
    return prisma.contact.create({
        data: {
            fullname: data.fullname,
            email: data.email,
            phone: data.phone ?? null,
            subject: data.subject ?? null,
            content: data.content,
            ...(data?.userId
                ? { user: { connect: { id: data?.userId } } }
                : {}),
        },
    });
};

export const getContactById = async (id: string) => {
    return prisma.contact.findFirst({
        where: { id },
        include: {
            user: {
                select: {
                    id: true,
                    username: true,
                    email: true,
                },
            },
            userReply: {
                select: {
                    userId: true,
                    staffId: true,
                    position: true,
                    user: {
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
                },
            },
        },
    });
};

export const getContacts = async (options: {
    pagination: PaginationQuery;
    isRead?: boolean;
    userId?: string;
}) => {
    const { pagination, isRead, userId } = options;
    const { search, ...restPagination } = pagination;

    const where: any = {};
    if (typeof isRead === 'boolean') {
        where.isRead = isRead;
    }
    if (userId) {
        where.userId = userId;
    }

    return await contactQuery.findManyWithPagination(
        {
            where: {
                ...where,
                ...(search
                    ? {
                          OR: [
                              {
                                  fullname: {
                                      contains: search,
                                      mode: 'insensitive',
                                  },
                              },
                              {
                                  email: {
                                      contains: search,
                                      mode: 'insensitive',
                                  },
                              },
                          ],
                      }
                    : {}),
            },
            orderBy: { createdAt: 'desc' },
            include: {
                user: {
                    select: {
                        id: true,
                        username: true,
                        email: true,
                    },
                },
                userReply: {
                    select: {
                        userId: true,
                        position: true,
                        staffId: true,
                        user: {
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
                    },
                },
            },
        },
        restPagination
    );
};

export const updateContact = async (id: string, data: Partial<Contact>) => {
    return prisma.contact.update({
        where: { id },
        data,
        include: {
            user: {
                select: {
                    id: true,
                    username: true,
                    email: true,
                },
            },
            userReply: {
                select: {
                    userId: true,
                    staffId: true,
                    position: true,
                    user: {
                        select: {
                            id: true,
                            username: true,
                            email: true,
                        },
                    },
                },
            },
        },
    });
};

export const deleteContact = async (id: string) => {
    return prisma.contact.delete({
        where: { id },
    });
};

export const countContacts = async (options: {
    isRead?: boolean;
    userId?: string;
}) => {
    const { isRead, userId } = options;

    const where: any = {};
    if (typeof isRead === 'boolean') {
        where.isRead = isRead;
    }
    if (userId) {
        where.userId = userId;
    }

    return prisma.contact.count({ where });
};
