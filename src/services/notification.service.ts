import notificationDao from '@src/daos/notification.dao';
import { CreateNotificationDataDto } from '@src/dtos/notification.dto';
import { CustomError, ErrorType } from '@src/core/Error';
import { PaginationQuery } from '@src/types/common/api.types';
import { emitToUser } from '@src/config/socket';

// Tạo notification + emit real-time
const createAndEmit = async (
    data: CreateNotificationDataDto,
    eventType: string = 'contact:new'
) => {
    const notification = await notificationDao.createNotification(data);
    // Emit real-time qua Socket.IO
    emitToUser(data.userId, eventType, {
        id: notification.id,
        title: notification.title,
        content: notification.content,
        type: notification.type,
        isRead: notification.isRead,
        createdAt: notification.createdAt,
    });
    return notification;
};

// Lấy danh sách
const getNotifications = async (
    userId: string,
    pagination: PaginationQuery,
    isRead?: boolean
) => {
    const filter: any = { pagination };
    if (isRead !== undefined) {
        filter.isRead = isRead;
    }
    return notificationDao.getNotificationsByUserId(userId, filter);
};

// Lấy chi tiết
const getNotificationById = async (id: string, userId: string) => {
    const notification = await notificationDao.getNotificationById(id, userId);
    if (!notification) {
        throw new CustomError(ErrorType.NOT_FOUND, 'Notification not found');
    }
    return notification;
};

// Đánh dấu đã đọc
const markAsRead = async (id: string, userId: string) => {
    const result = await notificationDao.markAsRead(id, userId);
    if (result.count === 0) {
        throw new CustomError(ErrorType.NOT_FOUND, 'Notification not found');
    }
    return { success: true };
};

// Đánh dấu tất cả đã đọc
const markAllAsRead = async (userId: string) => {
    const result = await notificationDao.markAllAsRead(userId);
    return { success: true, count: result.count };
};

// Xóa (soft delete)
const deleteNotification = async (id: string, userId: string) => {
    const result = await notificationDao.softDeleteNotification(id, userId);
    if (result.count === 0) {
        throw new CustomError(ErrorType.NOT_FOUND, 'Notification not found');
    }
    return { success: true };
};

// Đếm chưa đọc
const getUnreadCount = async (userId: string) => {
    const count = await notificationDao.countUnread(userId);
    return { unreadCount: count };
};

export default {
    createAndEmit,
    getNotifications,
    getNotificationById,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    getUnreadCount,
};
