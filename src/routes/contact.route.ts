import { Router } from 'express';
import contactController from '@src/controllers/contact.controller';
import { validateDto } from '@src/middleware/validatation.middleware';
import { CreateContactDto } from '@src/dtos/contact.dto';
import asyncHandler from '@src/helpers/asyncHandler';
import { authenticateToken, checkRole } from '@src/middleware/auth.middleware';

const router = Router();

/**
 * @swagger
 * /api/v1/contacts:
 *   post:
 *     summary: Gửi form liên hệ/ý kiến
 *     description: |
 *       Cho phép người dùng gửi form liên hệ.
 *       - Nếu đã đăng nhập: Tự động liên kết với tài khoản và có thể tự động điền email
 *       - Nếu chưa đăng nhập: Gửi như khách, bắt buộc nhập đầy đủ thông tin
 *     tags:
 *       - Contact
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fullname:
 *                 type: string
 *                 example: Nguyễn Văn An
 *                 description: Họ và tên đầy đủ
 *               email:
 *                 type: string
 *                 format: email
 *                 example: nguyen.van.an@example.com
 *                 description: Địa chỉ email (tự động lấy từ tài khoản nếu đã đăng nhập)
 *               phone:
 *                 type: string
 *                 example: "0123456789"
 *                 description: Số điện thoại (tùy chọn)
 *               subject:
 *                 type: string
 *                 example: Câu hỏi về việc đặt lịch khám
 *                 description: Tiêu đề (tùy chọn)
 *               content:
 *                 type: string
 *                 example: Tôi muốn biết thêm thông tin về dịch vụ khám sức khỏe...
 *                 description: Nội dung tin nhắn
 *             required:
 *               - fullname
 *               - email
 *               - content
 *     responses:
 *       200:
 *         description: Gửi form liên hệ thành công
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
 *                   example: Cảm ơn bạn đã gửi ý kiến! Chúng tôi sẽ phản hồi trong thời gian sớm nhất.
 *                 data:
 *                   $ref: '#/components/schemas/Contact'
 */
router.post(
    '/',
    authenticateToken(['/contact']),
    validateDto(CreateContactDto, 'body'),
    asyncHandler(contactController.submitContact)
);

/**
 * @swagger
 * /api/v1/contacts/my:
 *   get:
 *     summary: Lấy danh sách tin nhắn liên hệ của tôi
 *     description: Lấy danh sách tất cả tin nhắn liên hệ mà user đã gửi (chỉ dành cho user đã đăng nhập)
 *     tags:
 *       - Contact
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
 *           default: "10"
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           default: createdAt
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *       - in: query
 *         name: isRead
 *         schema:
 *           type: string
 *           enum: ["true", "false"]
 *         description: Lọc theo trạng thái đã được admin đọc
 *     responses:
 *       200:
 *         description: Danh sách tin nhắn của user
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
 *                   example: Your contact messages loaded successfully
 *                 data:
 *                   $ref: '#/components/schemas/ContactList'
 *       401:
 *         description: Chưa đăng nhập
 */
router.get(
    '/my',
    authenticateToken(),
    checkRole([]),
    asyncHandler(contactController.getMyContacts)
);

/**
 * @swagger
 * /api/v1/contacts:
 *   get:
 *     summary: Lấy danh sách tất cả tin nhắn liên hệ (Admin)
 *     description: Truy xuất tất cả tin nhắn liên hệ với phân trang và tìm kiếm (chỉ dành cho Admin)
 *     tags:
 *       - Contact
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
 *           default: "10"
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           default: createdAt
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Tìm kiếm theo tên, email, tiêu đề, nội dung
 *       - in: query
 *         name: isRead
 *         schema:
 *           type: string
 *           enum: ["true", "false"]
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Danh sách tin nhắn
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
 *                   example: Contact list loaded successfully
 *                 data:
 *                   $ref: '#/components/schemas/ContactList'
 *       403:
 *         description: Không có quyền truy cập
 */
router.get(
    '/',
    authenticateToken(),
    checkRole(['admin']),
    asyncHandler(contactController.getContacts)
);

/**
 * @swagger
 * /api/v1/contacts/statistics:
 *   get:
 *     summary: Lấy thống kê tin nhắn liên hệ (Admin)
 *     description: Lấy thống kê về số lượng tin nhắn liên hệ (tổng, đã đọc, chưa đọc)
 *     tags:
 *       - Contact
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Thống kê tin nhắn
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
 *                   example: Contact message statistics loaded successfully
 *                 data:
 *                   $ref: '#/components/schemas/ContactStatistics'
 *       403:
 *         description: Không có quyền truy cập
 */
router.get(
    '/statistics',
    authenticateToken(),
    checkRole(['admin']),
    asyncHandler(contactController.getContactStatistics)
);

/**
 * @swagger
 * /api/v1/contacts/{id}:
 *   get:
 *     summary: Lấy chi tiết tin nhắn liên hệ (Admin)
 *     description: Lấy thông tin chi tiết của một tin nhắn liên hệ cụ thể
 *     tags:
 *       - Contact
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID của tin nhắn liên hệ
 *     responses:
 *       200:
 *         description: Chi tiết tin nhắn
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
 *                   example: Contact details loaded successfully
 *                 data:
 *                   $ref: '#/components/schemas/Contact'
 *       404:
 *         description: Không tìm thấy tin nhắn
 *       403:
 *         description: Không có quyền truy cập
 */
router.get(
    '/:id',
    authenticateToken(),
    checkRole(['admin']),
    asyncHandler(contactController.getContactById as any)
);

/**
 * @swagger
 * /api/v1/contacts/{id}:
 *   delete:
 *     summary: Xóa tin nhắn liên hệ (Admin)
 *     description: Xóa vĩnh viễn một tin nhắn liên hệ khỏi hệ thống
 *     tags:
 *       - Contact
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID của tin nhắn liên hệ cần xóa
 *     responses:
 *       200:
 *         description: Xóa thành công
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
 *                   example: Message deleted successfully
 *                 data:
 *                   type: null
 *                   nullable: true
 *       404:
 *         description: Không tìm thấy tin nhắn
 *       403:
 *         description: Không có quyền truy cập
 */
router.delete(
    '/:id',
    authenticateToken(),
    checkRole(['admin']),
    asyncHandler(contactController.deleteContact as any)
);

/**
 * @swagger
 * /api/v1/contacts/{id}/reply:
 *   post:
 *     summary: Phản hồi tin nhắn liên hệ (Admin)
 *     description: |
 *       Admin phản hồi tin nhắn liên hệ của người dùng.
 *       - Tự động đánh dấu tin nhắn là đã đọc (isRead = true)
 *       - Lưu thời gian phản hồi (replyAt)
 *       - Lưu thông tin admin đã phản hồi (userIdReply)
 *     tags:
 *       - Contact
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID của tin nhắn liên hệ cần phản hồi
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               message:
 *                 type: string
 *                 description: Nội dung phản hồi
 *                 example: Cảm ơn bạn đã liên hệ. Chúng tôi đã ghi nhận yêu cầu và sẽ xử lý trong thời gian sớm nhất.
 *             required:
 *               - message
 *     responses:
 *       200:
 *         description: Phản hồi thành công
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
 *                   example: Message replied successfully
 *                 data:
 *                   $ref: '#/components/schemas/Contact'
 *       404:
 *         description: Không tìm thấy tin nhắn
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Contact not found.
 *       403:
 *         description: Không có quyền truy cập
 *       400:
 *         description: Thiếu hoặc sai định dạng dữ liệu
 */
router.post(
    '/:id/reply',
    authenticateToken(),
    checkRole(['admin']),
    asyncHandler(contactController.replyContact as any)
);

export default router;
