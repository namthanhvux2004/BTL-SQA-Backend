import { Router } from 'express';
import chatController from '@src/controllers/chat.controller';
import asyncHandler from '@src/helpers/asyncHandler';
import { validateDto } from '@src/middleware/validatation.middleware';
import { RateMessageDto, SendMessageDto } from '@src/dtos/chat.dto';

const router = Router();

/**
 * @swagger
 * tags:
 *   - name: Chat
 *     description: API quản lý Chatbot AI và lịch sử hội thoại
 */

/**
 * @swagger
 * /api/v1/chat/send:
 *   post:
 *     summary: Gửi tin nhắn tới AI (Bắt đầu hội thoại mới hoặc Chat tiếp)
 *     description: Gửi tin nhắn. Nếu không có conversationId, hệ thống sẽ tạo hội thoại mới.
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - message
 *             properties:
 *               message:
 *                 type: string
 *                 description: Nội dung câu hỏi của người dùng
 *                 example: "Tôi bị đau đầu thì nên uống thuốc gì?"
 *               conversationId:
 *                 type: string
 *                 format: uuid
 *                 nullable: true
 *                 description: ID của hội thoại (Gửi null nếu là hội thoại mới)
 *                 example: "123e4567-e89b-12d3-a456-426614174000"
 *     responses:
 *       200:
 *         description: Trả lời thành công từ AI
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Gửi tin nhắn thành công"
 *                 data:
 *                   type: object
 *                   properties:
 *                     conversationId:
 *                       type: string
 *                       format: uuid
 *                       description: ID của hội thoại (hữu ích khi vừa tạo mới)
 *                     response:
 *                       type: string
 *                       description: Câu trả lời của AI
 *                     source:
 *                       type: string
 *                       description: Nguồn tham khảo (nếu có)
 *                     timestamp:
 *                       type: string
 *       400:
 *         description: Dữ liệu đầu vào không hợp lệ
 *       401:
 *         description: Chưa đăng nhập
 *       500:
 *         description: Lỗi server hoặc lỗi từ AI Service
 */
router.post(
    '/send',
    validateDto(SendMessageDto),
    asyncHandler(chatController.sendMessage)
);

/**
 * @swagger
 * /api/v1/chat/history:
 *   get:
 *     summary: Lấy danh sách lịch sử các cuộc hội thoại
 *     description: Trả về danh sách các cuộc hội thoại của user hiện tại để hiển thị ở Sidebar.
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lấy danh sách thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       title:
 *                         type: string
 *                         description: Tiêu đề hội thoại (thường là tin nhắn đầu)
 *                       updatedAt:
 *                         type: string
 *                         format: date-time
 *       401:
 *         description: Chưa đăng nhập
 */
router.get('/history', asyncHandler(chatController.getHistory));

/**
 * @swagger
 * /api/v1/chat/messages/{conversationId}:
 *   get:
 *     summary: Lấy toàn bộ nội dung tin nhắn của một cuộc hội thoại
 *     description: Trả về chi tiết tất cả tin nhắn (User và Bot) trong một hội thoại cụ thể.
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID của cuộc hội thoại cần lấy tin nhắn
 *     responses:
 *       200:
 *         description: Lấy nội dung hội thoại thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       content:
 *                         type: string
 *                         description: Nội dung tin nhắn
 *                       sender:
 *                         type: string
 *                         enum: [user, bot]
 *                         description: Người gửi (User hoặc Bot)
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                       useFul:
 *                         type: boolean
 *                         nullable: true
 *                         description: Đánh giá hữu ích hay không (null nếu chưa đánh giá)
 *                       star:
 *                         type: number
 *                         nullable: true
 *                         description: Đánh giá số sao (null nếu chưa đánh giá)
 *       403:
 *         description: Không có quyền truy cập hội thoại này
 *       404:
 *         description: Không tìm thấy hội thoại
 */
router.get(
    '/messages/:conversationId',
    asyncHandler(chatController.getMessages)
);

/**
 * @swagger
 * /api/v1/chat/rate/{messageId}:
 *   post:
 *     summary: Đánh giá phản hồi của AI
 *     description: Cho phép người dùng đánh giá phản hồi của AI bằng cách vote useful hoặc cho sao.
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID của tin nhắn cần đánh giá
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userFul:
 *                 type: boolean
 *                 description: Đánh giá có hữu ích không
 *                 example: true
 *               star:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *                 description: Số sao đánh giá (1-5)
 *                 example: 5
 *     responses:
 *       200:
 *         description: Đánh giá thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Đánh giá thành công"
 *                 data:
 *                   type: object
 *                   description: Thông tin tin nhắn đã được cập nhật
 *       400:
 *         description: Dữ liệu đầu vào không hợp lệ
 *       401:
 *         description: Chưa đăng nhập
 *       404:
 *         description: Không tìm thấy tin nhắn
 */
router.post(
    '/rate/:messageId',
    validateDto(RateMessageDto, 'body'),
    asyncHandler(chatController.rateResponse as any)
);

/**
 * @swagger
 * /api/v1/chat/conversations/{conversationId}:
 *   delete:
 *     summary: Xóa một cuộc hội thoại
 *     description: Xóa cuộc hội thoại và tất cả tin nhắn liên quan của user hiện tại.
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID của cuộc hội thoại cần xóa
 *     responses:
 *       200:
 *         description: Xóa hội thoại thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Xóa hội thoại thành công"
 *       401:
 *         description: Chưa đăng nhập
 *       404:
 *         description: Không tìm thấy hội thoại
 */
router.delete(
    '/conversations/:conversationId',
    asyncHandler(chatController.deleteConversation as any)
);

export default router;
