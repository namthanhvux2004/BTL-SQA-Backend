import { Router } from 'express';
import asyncHandler from '@src/helpers/asyncHandler';
import { authenticateToken } from '@src/middleware/auth.middleware';
import notificationController from '@src/controllers/notification.controller';
const router = Router();
/**
 * @swagger
 * /api/v1/notifications:
 *   get:
 *     summary: Lấy danh sách thông báo
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: string
 *           default: "1"
 *       - in: query
 *         name: limit
 *         schema:
 *           type: string
 *           default: "20"
 *       - in: query
 *         name: isRead
 *         schema:
 *           type: string
 *           enum: ["true", "false"]
 *     responses:
 *       200:
 *         description: Danh sách thông báo
 */
router.get(
    '/',
    authenticateToken(),
    asyncHandler(notificationController.getNotifications)
);
/**
 * @swagger
 * /api/v1/notifications/unread-count:
 *   get:
 *     summary: Đếm số thông báo chưa đọc
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Số lượng chưa đọc
 */
router.get(
    '/unread-count',
    authenticateToken(),
    asyncHandler(notificationController.getUnreadCount)
);
/**
 * @swagger
 * /api/v1/notifications/read-all:
 *   patch:
 *     summary: Đánh dấu tất cả đã đọc
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Thành công
 */
router.patch(
    '/read-all',
    authenticateToken(),
    asyncHandler(notificationController.markAllAsRead)
);
/**
 * @swagger
 * /api/v1/notifications/{id}:
 *   get:
 *     summary: Lấy chi tiết thông báo
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Chi tiết thông báo
 */
router.get(
    '/:id',
    authenticateToken(),
    asyncHandler(notificationController.getNotificationById)
);
/**
 * @swagger
 * /api/v1/notifications/{id}/read:
 *   patch:
 *     summary: Đánh dấu đã đọc
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Thành công
 */
router.patch(
    '/:id/read',
    authenticateToken(),
    asyncHandler(notificationController.markAsRead)
);
/**
 * @swagger
 * /api/v1/notifications/{id}:
 *   delete:
 *     summary: Xóa thông báo
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Đã xóa
 */
router.delete(
    '/:id',
    authenticateToken(),
    asyncHandler(notificationController.deleteNotification)
);
export default router;
