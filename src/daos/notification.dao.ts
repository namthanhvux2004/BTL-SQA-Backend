import prisma from '@src/config/prisma';
import { CreateNotificationDataDto } from '@src/dtos/notification.dto';
import { createQueryBuilder } from '@src/helpers/queryBuilder';
import { PaginationQuery } from '@src/types/common/api.types';
const notificationQuery = createQueryBuilder('notification');

// Tạo notification mới
const createNotification = async (data: CreateNotificationDataDto) => {
    return prisma.notification.create({
        data: {
            userId: data.userId,
            title: data.title ?? null,
            content: data.content,
            type: data.type ?? null,
        },
    });
};

// Lấy notification theo ID
const getNotificationById = async (id: string, userId: string) => {
    return prisma.notification.findFirst({
        where: {
            id,
            userId,
            isDeleted: false,
        },
    });
};

// Lấy danh sách notifications của user
const getNotificationsByUserId = async (
    userId: string,
    options: {
        pagination: PaginationQuery;
        isRead?: boolean;
    }
) => {
    const { pagination, isRead } = options;
    const where: any = {
        userId,
        isDeleted: false,
    };
    if (typeof isRead === 'boolean') {
        where.isRead = isRead;
    }
    return await notificationQuery.findManyWithPagination(
        {
            where,
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                title: true,
                content: true,
                type: true,
                isRead: true,
                createdAt: true,
            },
        },
        pagination
    );
};

// Đánh dấu đã đọc
const markAsRead = async (id: string, userId: string) => {
    return prisma.notification.updateMany({
        where: { id, userId },
        data: { isRead: true },
    });
};

// Đánh dấu tất cả đã đọc
const markAllAsRead = async (userId: string) => {
    return prisma.notification.updateMany({
        where: { userId, isRead: false, isDeleted: false },
        data: { isRead: true },
    });
};

// Soft delete
const softDeleteNotification = async (id: string, userId: string) => {
    return prisma.notification.updateMany({
        where: { id, userId },
        data: { isDeleted: true },
    });
};

// Đếm số chưa đọc
const countUnread = async (userId: string) => {
    return prisma.notification.count({
        where: { userId, isRead: false, isDeleted: false },
    });
};

export default {
    createNotification,
    getNotificationById,
    getNotificationsByUserId,
    markAsRead,
    markAllAsRead,
    softDeleteNotification,
    countUnread,
};
