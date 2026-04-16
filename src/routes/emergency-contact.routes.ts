import emergencyContactController from '@src/controllers/emergencyContact.controller';
import { EmergencyContactDto } from '@src/dtos/emergency-contact.dto';
import { validateDto } from '@src/middleware/validatation.middleware';
import { Router } from 'express';
import { z } from 'zod';

const router = Router();

/**
 * @swagger
 * /api/v1/emergency-contacts/{id}:
 *   get:
 *     summary: Lấy thông tin liên hệ khẩn cấp bằng ID
 *     description: Lấy thông tin chi tiết của một liên hệ khẩn cấp. Yêu cầu quyền admin, doctor hoặc chính bệnh nhân sở hữu liên hệ đó.
 *     tags: [EmergencyContacts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID của liên hệ khẩn cấp
 *     responses:
 *       200:
 *         description: Lấy thông tin thành công
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/EmergencyContact'
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
    emergencyContactController.getEmergencyContactById
);

/**
 * @swagger
 * /api/v1/emergency-contacts/{patientId}:
 *   post:
 *     summary: Tạo một liên hệ khẩn cấp mới
 *     description: Tạo một liên hệ khẩn cấp mới cho một bệnh nhân. Yêu cầu quyền admin hoặc chính bệnh nhân đó.
 *     tags: [EmergencyContacts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: patientId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID của bệnh nhân
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/EmergencyContactDto'
 *           example:
 *             fullName: "Trần Thị B"
 *             relationship: "Vợ"
 *             phone: "0987654321"
 *             email: "tran.b@example.com"
 *     responses:
 *       200:
 *         description: Tạo thành công
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/EmergencyContact'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post(
    '/:patientId',
    validateDto(EmergencyContactDto, 'body'),
    emergencyContactController.createEmergencyContact
);

/**
 * @swagger
 * /api/v1/emergency-contacts/{id}:
 *   patch:
 *     summary: Cập nhật thông tin liên hệ khẩn cấp
 *     description: Cập nhật một phần thông tin của một liên hệ khẩn cấp. Yêu cầu quyền admin hoặc chính bệnh nhân sở hữu liên hệ đó.
 *     tags: [EmergencyContacts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID của liên hệ khẩn cấp
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/EmergencyContactDto'
 *           example:
 *             phone: "0123456789"
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/EmergencyContact'
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
    validateDto(EmergencyContactDto.partial(), 'body'),
    emergencyContactController.updateEmergencyContact
);

/**
 * @swagger
 * /api/v1/emergency-contacts/{id}:
 *   delete:
 *     summary: Xóa một liên hệ khẩn cấp
 *     description: Xóa một liên hệ khẩn cấp bằng ID. Yêu cầu quyền admin hoặc chính bệnh nhân sở hữu liên hệ đó.
 *     tags: [EmergencyContacts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID của liên hệ khẩn cấp
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
 *                   example: "Emergency contact deleted successfully"
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
    emergencyContactController.deleteEmergencyContact
);

export default router;
