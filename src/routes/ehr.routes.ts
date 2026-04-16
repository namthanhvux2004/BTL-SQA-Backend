import { Router } from 'express';
import { authenticateToken, checkRole } from '@src/middleware/auth.middleware';
import { validateDto } from '@src/middleware/validatation.middleware';
import {
    GetEHRDto,
    CreateHealthInfoDto,
    UpdateHealthInfoDto,
    CreateEHRDto,
    GetEHRsQueryDto,
    GetEHRByIdDto,
    DeleteEHRDto,
} from '@src/dtos/ehr.dto';
import asyncHandler from '@utils/asyncHandler';
import ehrController from '@controllers/ehr.controller';

const router = Router();

/**
 * @swagger
 * /api/v1/ehr/patient/{patientId}:
 *   get:
 *     summary: Lấy hồ sơ bệnh án của bệnh nhân
 *     description: Lấy thông tin EHR và các kết quả khám bệnh của bệnh nhân
 *     tags:
 *       - Medical Records
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: patientId
 *         required: true
 *         schema:
 *           type: string
 *           format: string
 *         description: ID của bệnh nhân
 *     responses:
 *       200:
 *         description: Lấy hồ sơ bệnh án thành công
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
 *                   example: Lấy hồ sơ bệnh án thành công
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     patient:
 *                       type: object
 *                       properties:
 *                         patientId:
 *                           type: string
 *                         user:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: string
 *                             username:
 *                               type: string
 *                             email:
 *                               type: string
 *                             name:
 *                               type: object
 *                               properties:
 *                                 firstName:
 *                                   type: string
 *                                 lastName:
 *                                   type: string
 *                     medicalResult:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/MedicalRecord'
 *       404:
 *         description: Hồ sơ bệnh án không tồn tại
 *       403:
 *         description: Không có quyền truy cập
 */
router.get(
    '/patient/:patientId',
    authenticateToken(),
    validateDto(GetEHRDto, 'params'),
    asyncHandler(ehrController.getEHR)
);

/**
 * @swagger
 * /api/v1/ehr/patient/{patientId}/health-info:
 *   get:
 *     summary: Lấy thông tin sức khỏe của bệnh nhân
 *     description: Lấy thông tin sức khỏe tổng quát của bệnh nhân
 *     tags:
 *       - Medical Records
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: patientId
 *         required: true
 *         schema:
 *           type: string
 *           format: string
 *         description: Mã của bệnh nhân
 *     responses:
 *       200:
 *         description: Lấy thông tin sức khỏe thành công
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
 *                   example: Lấy thông tin sức khỏe thành công
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     weight:
 *                       type: number
 *                       example: 70.5
 *                     height:
 *                       type: number
 *                       example: 175
 *                     bloodType:
 *                       type: string
 *                       enum: [A+, A-, B+, B-, AB+, AB-, O+, O-]
 *                       example: A+
 *                     has_high_blood_pressure:
 *                       type: boolean
 *                       example: false
 *                     has_diabetes:
 *                       type: boolean
 *                       example: false
 *                     has_allergies:
 *                       type: boolean
 *                       example: true
 *                     has_cancer:
 *                       type: boolean
 *                       example: false
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *       404:
 *         description: Thông tin sức khỏe chưa được tạo
 *       403:
 *         description: Không có quyền truy cập
 */
router.get(
    '/patient/:patientId/health-info',
    authenticateToken(),
    validateDto(GetEHRDto, 'params'),
    asyncHandler(ehrController.getHealthInformation)
);

/**
 * @swagger
 * /api/v1/ehr/patient/{patientId}/health-info:
 *   post:
 *     summary: Tạo mới thông tin sức khỏe của bệnh nhân
 *     description: Tạo mới thông tin sức khỏe tổng quát của bệnh nhân
 *     tags:
 *       - Medical Records
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: patientId
 *         required: true
 *         schema:
 *           type: string
 *           format: string
 *         description: Mã của bệnh nhân
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               weight:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 500
 *                 example: 70.5
 *                 description: Cân nặng (kg)
 *               height:
 *                 type: number
 *                 minimum: 50
 *                 maximum: 300
 *                 example: 175
 *                 description: Chiều cao (cm)
 *               bloodType:
 *                 type: string
 *                 enum: [A+, A-, B+, B-, AB+, AB-, O+, O-]
 *                 example: A+
 *                 description: Nhóm máu
 *               has_high_blood_pressure:
 *                 type: boolean
 *                 example: false
 *                 description: Có bị cao huyết áp không
 *               has_diabetes:
 *                 type: boolean
 *                 example: false
 *                 description: Có bị tiểu đường không
 *               has_allergies:
 *                 type: boolean
 *                 example: true
 *                 description: Có dị ứng không
 *               has_cancer:
 *                 type: boolean
 *                 example: false
 *                 description: Có bị ung thư không
 *             required:
 *               - weight
 *               - height
 *               - bloodType
 *               - has_high_blood_pressure
 *               - has_diabetes
 *               - has_allergies
 *               - has_cancer
 *     responses:
 *       201:
 *         description: Tạo thông tin sức khỏe thành công
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
 *                   example: Tạo thông tin sức khỏe thành công
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     weight:
 *                       type: number
 *                     height:
 *                       type: number
 *                     bloodType:
 *                       type: string
 *                     has_high_blood_pressure:
 *                       type: boolean
 *                     has_diabetes:
 *                       type: boolean
 *                     has_allergies:
 *                       type: boolean
 *                     has_cancer:
 *                       type: boolean
 *                     bmi:
 *                       type: number
 *                       description: Chỉ số BMI được tính tự động
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       403:
 *         description: Không có quyền truy cập
 *       409:
 *         description: Thông tin sức khỏe đã tồn tại
 */
router.post(
    '/patient/:patientId/health-info',
    authenticateToken(),
    validateDto(GetEHRDto, 'params'),
    validateDto(CreateHealthInfoDto, 'body'),
    asyncHandler(ehrController.createHealthInformation)
);

/**
 * @swagger
 * /api/v1/ehr/patient/{patientId}/health-info:
 *   put:
 *     summary: Cập nhật thông tin sức khỏe của bệnh nhân
 *     description: Cập nhật thông tin sức khỏe tổng quát của bệnh nhân
 *     tags:
 *       - Medical Records
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: patientId
 *         required: true
 *         schema:
 *           type: string
 *           format: string
 *         description: Mã của bệnh nhân
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               weight:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 500
 *                 example: 70.5
 *                 description: Cân nặng (kg)
 *               height:
 *                 type: number
 *                 minimum: 50
 *                 maximum: 300
 *                 example: 175
 *                 description: Chiều cao (cm)
 *               bloodType:
 *                 type: string
 *                 enum: [A+, A-, B+, B-, AB+, AB-, O+, O-]
 *                 example: A+
 *                 description: Nhóm máu
 *               has_high_blood_pressure:
 *                 type: boolean
 *                 example: false
 *                 description: Có bị cao huyết áp không
 *               has_diabetes:
 *                 type: boolean
 *                 example: false
 *                 description: Có bị tiểu đường không
 *               has_allergies:
 *                 type: boolean
 *                 example: true
 *                 description: Có dị ứng không
 *               has_cancer:
 *                 type: boolean
 *                 example: false
 *                 description: Có bị ung thư không
 *     responses:
 *       200:
 *         description: Cập nhật thông tin sức khỏe thành công
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
 *                   example: Cập nhật thông tin sức khỏe thành công
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     weight:
 *                       type: number
 *                     height:
 *                       type: number
 *                     bloodType:
 *                       type: string
 *                     has_high_blood_pressure:
 *                       type: boolean
 *                     has_diabetes:
 *                       type: boolean
 *                     has_allergies:
 *                       type: boolean
 *                     has_cancer:
 *                       type: boolean
 *                     bmi:
 *                       type: number
 *                       description: Chỉ số BMI được tính tự động
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       403:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Thông tin sức khỏe không tồn tại
 */
router.put(
    '/patient/:patientId/health-info',
    authenticateToken(),
    validateDto(GetEHRDto, 'params'),
    validateDto(UpdateHealthInfoDto, 'body'),
    asyncHandler(ehrController.updateHealthInformation)
);

/**
 * @swagger
 * /api/v1/ehr/create:
 *   post:
 *     summary: Tạo mới hồ sơ bệnh án cho bệnh nhân
 *     description: Admin tạo mới EHR cho bệnh nhân lần đầu đến khám
 *     tags:
 *       - Medical Records
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               patientId:
 *                 type: string
 *                 format: uuid
 *                 example: 123e4567-e89b-12d3-a456-426614174000
 *                 description: ID của bệnh nhân
 *             required:
 *               - patientId
 *     responses:
 *       201:
 *         description: Tạo hồ sơ bệnh án thành công
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
 *                   example: Tạo hồ sơ bệnh án thành công
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     patientId:
 *                       type: string
 *                       format: uuid
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     patient:
 *                       type: object
 *                       properties:
 *                         patientId:
 *                           type: string
 *                         user:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: string
 *                             username:
 *                               type: string
 *                             email:
 *                               type: string
 *                             name:
 *                               type: object
 *                               properties:
 *                                 firstName:
 *                                   type: string
 *                                 lastName:
 *                                   type: string
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       409:
 *         description: Bệnh nhân đã có hồ sơ bệnh án
 *       404:
 *         description: Bệnh nhân không tồn tại
 *       403:
 *         description: Không có quyền truy cập
 */
router.post(
    '/create',
    authenticateToken(),
    validateDto(CreateEHRDto, 'body'),
    asyncHandler(ehrController.createEHR)
);

/**
 * @swagger
 * /api/v1/ehr:
 *   get:
 *     summary: Lấy danh sách tất cả hồ sơ bệnh án
 *     description: Admin xem tất cả hồ sơ bệnh án với phân trang và tìm kiếm
 *     tags:
 *       - Medical Records
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: string
 *           default: "1"
 *         description: Số trang
 *       - in: query
 *         name: limit
 *         schema:
 *           type: string
 *           default: "10"
 *         description: Số lượng mỗi trang
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [createdAt, patientId, patientName]
 *           default: createdAt
 *         description: Sắp xếp theo
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Thứ tự sắp xếp
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Tìm kiếm theo tên bệnh nhân, email, username
 *       - in: query
 *         name: patientId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Lọc theo ID bệnh nhân
 *     responses:
 *       200:
 *         description: Lấy danh sách hồ sơ bệnh án thành công
 *       404:
 *         description: Không tìm thấy hồ sơ bệnh án nào
 *       403:
 *         description: Không có quyền truy cập
 */
router.get(
    '/',
    authenticateToken(),
    checkRole(['admin']),
    validateDto(GetEHRsQueryDto, 'query'),
    asyncHandler(ehrController.getAllEHRs)
);

/**
 * @swagger
 * /api/v1/ehr/{ehrId}:
 *   get:
 *     summary: Lấy hồ sơ bệnh án theo ID
 *     description: Admin xem chi tiết hồ sơ bệnh án
 *     tags:
 *       - Medical Records
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: ehrId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID của EHR
 *     responses:
 *       200:
 *         description: Lấy hồ sơ bệnh án thành công
 *       404:
 *         description: Hồ sơ bệnh án không tồn tại
 *       403:
 *         description: Không có quyền truy cập
 */
router.get(
    '/:ehrId',
    authenticateToken(),
    checkRole(['admin']),
    validateDto(GetEHRByIdDto, 'params'),
    asyncHandler(ehrController.getEHRById)
);

/**
 * @swagger
 * /api/v1/ehr/{ehrId}:
 *   delete:
 *     summary: Xóa hồ sơ bệnh án
 *     description: Admin xóa hồ sơ bệnh án
 *     tags:
 *       - Medical Records
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: ehrId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID của EHR
 *     responses:
 *       200:
 *         description: Xóa hồ sơ bệnh án thành công
 *       404:
 *         description: Hồ sơ bệnh án không tồn tại
 *       403:
 *         description: Không có quyền truy cập
 */
router.delete(
    '/:ehrId',
    authenticateToken(),
    checkRole(['admin']),
    validateDto(DeleteEHRDto, 'params'),
    asyncHandler(ehrController.deleteEHR)
);

export default router;
