import { Router } from 'express';
import patientController from '@src/controllers/patient.controller';
import { validateDto } from '@src/middleware/validatation.middleware';
import { GetPatientByIdDto } from '@src/dtos/patient.dto';
import asyncHandler from '@src/helpers/asyncHandler';
import { authenticateToken, checkRole } from '@src/middleware/auth.middleware';

const router = Router();

/**
 * @swagger
 * /api/v1/patients/{id}/detail:
 *   get:
 *     summary: Lấy thông tin chi tiết bệnh nhân
 *     description: Lấy thông tin chi tiết của bệnh nhân bao gồm thông tin cá nhân, bảo hiểm y tế, thông tin sức khỏe và hồ sơ bệnh án điện tử. Chỉ admin, doctor hoặc chính bệnh nhân đó mới có quyền truy cập.
 *     tags: [Patients]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID hoặc Patient ID của bệnh nhân
 *         example: "PAT001"
 *     responses:
 *       200:
 *         description: Lấy thông tin bệnh nhân thành công
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
 *                   example: "Lấy thông tin bệnh nhân thành công"
 *                 data:
 *                   $ref: '#/components/schemas/PatientDetail'
 *             example:
 *               success: true
 *               message: "Lấy thông tin bệnh nhân thành công"
 *               data:
 *                 userId: "123e4567-e89b-12d3-a456-426614174000"
 *                 patientId: "cljabcdef1234567890"
 *                 user:
 *                   id: "123e4567-e89b-12d3-a456-426614174000"
 *                   username: "patient01"
 *                   email: "patient@example.com"
 *                   avatar: "https://example.com/avatar.jpg"
 *                   birthday: "1990-01-01T00:00:00.000Z"
 *                   gender: "male"
 *                   phone: "+84123456789"
 *                   roleId: 1
 *                   role:
 *                     id: 1
 *                     name: "patient"
 *                     prefix: "BN"
 *                   name:
 *                     firstName: "Nguyễn Văn"
 *                     lastName: "A"
 *                   address:
 *                     detail: "123 Đường ABC"
 *                     ward: "Phường 1"
 *                     district: "Quận 1"
 *                     city: "TP. Hồ Chí Minh"
 *                     country: "Việt Nam"
 *                 healthInsurance:
 *                   - id: "456e7890-e89b-12d3-a456-426614174001"
 *                     userId: "123e4567-e89b-12d3-a456-426614174000"
 *                     type: "BHYT"
 *                     insuranceId: "INS123456789"
 *                     startAt: "2024-01-01T00:00:00.000Z"
 *                     endAt: "2024-12-31T23:59:59.999Z"
 *                     percentage: 80.0
 *                     createdAt: "2024-01-01T00:00:00.000Z"
 *                     updatedAt: "2024-01-01T00:00:00.000Z"
 *                 healthInfo:
 *                   id: "789e0123-e89b-12d3-a456-426614174002"
 *                   patientId: "123e4567-e89b-12d3-a456-426614174000"
 *                   weight: 70.5
 *                   height: 175.0
 *                   bloodType: "O+"
 *                   has_high_blood_pressure: false
 *                   has_diabetes: false
 *                   has_allergies: false
 *                   has_cancer: false
 *                   createdAt: "2024-01-01T00:00:00.000Z"
 *                   updatedAt: "2024-01-01T00:00:00.000Z"
 *                 ehr:
 *                   id: "012e3456-e89b-12d3-a456-426614174003"
 *                   patientId: "123e4567-e89b-12d3-a456-426614174000"
 *                   createdAt: "2024-01-01T00:00:00.000Z"
 *                   updatedAt: "2024-01-01T00:00:00.000Z"
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         description: Không có quyền truy cập
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
 *                   example: "Bạn không có quyền truy cập hồ sơ bệnh án này"
 *                 error:
 *                   type: string
 *                   example: "FORBIDDEN"
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get(
    '/:id/detail',
    validateDto(GetPatientByIdDto, 'params'),
    asyncHandler(patientController.getPatient as any)
);

/**
 * @swagger
 * /api/v1/patients/{patientId}/emergency-contacts:
 *   get:
 *     summary: Lấy danh sách liên hệ khẩn cấp của bệnh nhân
 *     description: Lấy danh sách tất cả các liên hệ khẩn cấp của một bệnh nhân cụ thể. Yêu cầu quyền admin, doctor hoặc chính bệnh nhân đó.
 *     tags: [Patients]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: patientId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID của bệnh nhân
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Số trang
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Số lượng kết quả mỗi trang
 *     responses:
 *       200:
 *         description: Lấy danh sách liên hệ khẩn cấp thành công
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
 *                   example: "Emergency contact retrieved successfully"
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/EmergencyContact'
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
    '/:patientId/emergency-contacts',
    asyncHandler(patientController.getEmergencyContacts as any)
);

/**
 * @swagger
 * /api/v1/patients/{patientId}/health-insurances:
 *   get:
 *     summary: Lấy danh sách bảo hiểm y tế của bệnh nhân
 *     description: Lấy danh sách tất cả các bảo hiểm y tế của một bệnh nhân cụ thể. Yêu cầu quyền admin, doctor hoặc chính bệnh nhân đó.
 *     tags: [Patients]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: patientId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID của bệnh nhân
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Số trang
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Số lượng kết quả mỗi trang
 *     responses:
 *       200:
 *         description: Lấy danh sách bảo hiểm y tế thành công
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
 *                   items:
 *                     $ref: '#/components/schemas/HealthInsurance'
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
    '/:patientId/health-insurances',
    asyncHandler(patientController.getHealthInsurances as any)
);

/**
 * @swagger
 * /api/v1/patients/search:
 *   get:
 *     summary: Lấy danh sách bệnh nhân
 *     description: Lấy danh sách tất cả bệnh nhân với phân trang. Chỉ admin và doctor mới có quyền truy cập.
 *     tags: [Patients]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Số trang
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Số lượng kết quả mỗi trang
 *     responses:
 *       200:
 *         description: Lấy danh sách bệnh nhân thành công
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
 *                   example: "Patients retrieved successfully"
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Patient'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */

router.get(
    '/search',
    authenticateToken(),
    checkRole(['admin', 'doctor']),
    asyncHandler(patientController.getPatients as any)
);

export default router;
