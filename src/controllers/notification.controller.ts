import { Request, Response } from 'express';
import { SuccessResponse } from '@src/core/ApiResponse';
import notificationService from '@src/services/notification.service';
import { PaginationQuery } from '@src/types/common/api.types';

const getNotifications = async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const pagination: PaginationQuery = {
        page: req.query.page as string,
        limit: req.query.limit as string,
        sortBy: '',
        sortOrder: 'asc',
    };
    const isRead =
        req.query.isRead === 'true'
            ? true
            : req.query.isRead === 'false'
              ? false
              : undefined;
    const result = await notificationService.getNotifications(
        userId,
        pagination,
        isRead
    );
    return new SuccessResponse(
        result.data,
        'Notifications loaded successfully',
        result.metadata
    ).send(res);
};

const getNotificationById = async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { id } = req.params;
    if (!id) {
        throw new Error('ID không hợp lệ');
    }
    const result = await notificationService.getNotificationById(id, userId);
    return new SuccessResponse(result, 'Notification loaded').send(res);
};

const getUnreadCount = async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const result = await notificationService.getUnreadCount(userId);
    return new SuccessResponse(result, 'Unread count loaded').send(res);
};

const markAsRead = async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { id } = req.params;
    if (!id) {
        throw new Error('ID không hợp lệ');
    }
    const result = await notificationService.markAsRead(id, userId);
    return new SuccessResponse(result, 'Notification marked as read').send(res);
};

const markAllAsRead = async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const result = await notificationService.markAllAsRead(userId);
    return new SuccessResponse(result, 'All notifications marked as read').send(
        res
    );
};

const deleteNotification = async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { id } = req.params;
    if (!id) {
        throw new Error('ID không hợp lệ');
    }
    const result = await notificationService.deleteNotification(id, userId);
    return new SuccessResponse(result, 'Notification deleted').send(res);
};

export default {
    getNotifications,
    getNotificationById,
    getUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
};
