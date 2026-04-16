import healthInsuranceController from '@src/controllers/healthInsurance.controller';
import { HealthInsuranceDto } from '@src/dtos/healthInsurance.dto';
import asyncHandler from '@src/helpers/asyncHandler';
import { validateDto } from '@src/middleware/validatation.middleware';
import { Router } from 'express';
import { z } from 'zod';

/**
 * @swagger
 * /api/v1/health-insurances/user/{userId}:
 *   get:
 *     summary: Lấy thông tin bảo hiểm y tế của người dùng
 *     description: Lấy thông tin chi tiết của tất cả thẻ bảo hiểm y tế của một người dùng. Yêu cầu quyền admin, doctor hoặc chính bệnh nhân sở hữu thẻ.
 *     tags: [HealthInsurances]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID của người dùng (bệnh nhân)
 *     responses:
 *       200:
 *         description: Lấy thông tin thành công
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
 *                   example: "Health insurances retrieved successfully"
 *                 data:
 *                   type: array
 *                   description: Danh sách thẻ bảo hiểm y tế
 *                   items:
 *                     $ref: '#/components/schemas/HealthInsurance'
 *                 metadata:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                       example: 1
 *                     limit:
 *                       type: integer
 *                       example: 10
 *                     totalItems:
 *                       type: integer
 *                       example: 10
 *                     totalPages:
 *                       type: integer
 *                       example: 1
 *                     hasNext:
 *                       type: boolean
 *                       example: false
 *                     hasPrevious:
 *                       type: boolean
 *                       example: false

 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */

const router = Router();
router.get(
    '/user/:userId',
    validateDto(z.object({ userId: z.uuid('ID không hợp lệ') }), 'params'),
    asyncHandler(healthInsuranceController.getHealthInsurances as any)
);

/**
 * @swagger
 * /api/v1/health-insurances/{id}:
 *   get:
 *     summary: Lấy thông tin bảo hiểm y tế bằng ID
 *     description: Lấy thông tin chi tiết của một thẻ bảo hiểm y tế. Yêu cầu quyền admin, doctor hoặc chính bệnh nhân sở hữu thẻ.
 *     tags: [HealthInsurances]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID của thẻ bảo hiểm y tế
 *     responses:
 *       200:
 *         description: Lấy thông tin thành công
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthInsurance'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get(
    '/:id',
    validateDto(z.object({ id: z.uuid('ID không hợp lệ') }), 'params'),
    healthInsuranceController.getHealthInsuranceById
);

/**
 * @swagger
 * /api/v1/health-insurances/{userId}:
 *   post:
 *     summary: Tạo một thẻ bảo hiểm y tế mới
 *     description: Tạo một thẻ bảo hiểm y tế mới cho một bệnh nhân. Yêu cầu quyền admin hoặc chính bệnh nhân đó.
 *     tags: [HealthInsurances]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID của người dùng (bệnh nhân)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/HealthInsuranceDto'
 *           example:
 *             type: "NL"
 *             insuranceId: "DN4010123456789"
 *             startAt: "2023-01-01T00:00:00.000Z"
 *             endAt: "2024-12-31T23:59:59.999Z"
 *             level_of_benefit: 5
 *             province_code: "01"
 *             initial_kcb_code: "001"
 *             initial_kcb_name: "Bệnh viện Bạch Mai"
 *     responses:
 *       200:
 *         description: Tạo thành công
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthInsurance'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post(
    '/:userId',
    validateDto(HealthInsuranceDto, 'body'),
    asyncHandler(healthInsuranceController.createHealthInsurance as any)
);

/**
 * @swagger
 * /api/v1/health-insurances/{id}:
 *   patch:
 *     summary: Cập nhật thông tin bảo hiểm y tế
 *     description: Cập nhật một phần thông tin của một thẻ bảo hiểm y tế. Yêu cầu quyền admin hoặc chính bệnh nhân sở hữu thẻ.
 *     tags: [HealthInsurances]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID của thẻ bảo hiểm y tế
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/HealthInsuranceDto'
 *           example:
 *             level_of_benefit: 5
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthInsurance'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.patch(
    '/:id',
    validateDto(z.object({ id: z.uuid('ID không hợp lệ') }), 'params'),
    validateDto(HealthInsuranceDto.partial(), 'body'),
    healthInsuranceController.updateHealthInsurance
);

/**
 * @swagger
 * /api/v1/health-insurances/{id}:
 *   delete:
 *     summary: Xóa một thẻ bảo hiểm y tế
 *     description: Xóa một thẻ bảo hiểm y tế bằng ID. Yêu cầu quyền admin hoặc chính bệnh nhân sở hữu thẻ.
 *     tags: [HealthInsurances]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID của thẻ bảo hiểm y tế
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
 *                   example: "Health insurance deleted successfully"
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.delete(
    '/:id',
    validateDto(z.object({ id: z.uuid('ID không hợp lệ') }), 'params'),
    healthInsuranceController.deleteHealthInsurance
);

export default router;
