import { Router } from 'express';
import asyncHandler from '@src/helpers/asyncHandler';
import autofillController from '@src/controllers/autofill.controller';

const router = Router();

/**
 * @swagger
 * /api/v1/autofill/doctors:
 *   get:
 *     summary: Auto fill doctors
 *     description: Auto fill doctors
 *     tags:
 *       - Autofill
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Tìm kiếm theo tên bác sĩ
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Số trang (mặc định 1)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *         description: Số lượng bác sĩ mỗi trang (mặc định 10)
 *     responses:
 *       200:
 *         description: Lấy danh sách bác sĩ thành công
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
 *                   example: Lấy danh sách bác sĩ thành công
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       name:
 *                         type: string
 *                       avatar:
 *                         type: string
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                       example: 1
 *                     limit:
 *                       type: integer
 *                       example: 10
 *                     totalPages:
 *                       type: integer
 *                       example: 1
 *                     totalItems:
 *                       type: integer
 *                       example: 10
 *                     hasNext:
 *                       type: boolean
 *                       example: false
 *                     hasPrev:
 *                       type: boolean
 *                       example: false
 */
router.get('/doctors', asyncHandler(autofillController.autoFillDoctor));

export default router;
