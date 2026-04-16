import { Router } from 'express';
import upload from '@src/config/multer';
import asyncHandler from '@src/helpers/asyncHandler';
import uploadController from '@controllers/upload.controller';
import { authenticateToken } from '@src/middleware/auth.middleware';

const router = Router();

/**
 * @swagger
 * /api/v1/uploads:
 *   post:
 *     summary: Upload multiple files to Cloudinary
 *     description: |
 *       Nhận nhiều file dạng `multipart/form-data` với field name `file`, upload lên Cloudinary và trả về danh sách URL.
 *       Có thể truyền thêm các trường `folder`, `publicId`, `uploadPreset` (optional, áp dụng cho tất cả file) trong form-data để tùy chỉnh upload.
 *     tags:
 *       - Uploads
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               files:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: Danh sách file cần upload (jpeg/png/webp)
 *               folder:
 *                 type: string
 *                 description: Tên thư mục lưu trên Cloudinary
 *               publicId:
 *                 type: string
 *                 description: Định danh mong muốn cho file (áp dụng cho tất cả file, nếu không sẽ tự sinh)
 *               uploadPreset:
 *                 type: string
 *                 description: Tên upload preset nếu đã cấu hình trên Cloudinary
 *     responses:
 *       200:
 *         description: Upload thành công
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
 *                   example: Upload file thành công
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/CloudinaryUploadResult'
 *       400:
 *         description: Thiếu file upload hoặc dữ liệu không hợp lệ
 *       401:
 *         description: Không có quyền truy cập
 */
router.post(
    '/',
    authenticateToken(),
    upload.array('files', 5),
    asyncHandler(uploadController.uploadFiles)
);

export default router;
