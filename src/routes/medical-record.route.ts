import { authenticateToken, checkRole } from '@src/middleware/auth.middleware';
import { Router } from 'express';
import { validateDto } from '@src/middleware/validatation.middleware';
import {
    CreateMedicalRecordDto,
    UpdateMedicalRecordDto,
    GetMedicalRecordsQueryDto,
} from '@src/dtos/medical-record.dto';
import asyncHandler from '@utils/asyncHandler';
import medicalRecordController from '@controllers/medical-record.controller';
import { uploadMedicalRecordFiles } from '@src/config/multer';

const router = Router();

/**
 * @swagger
 * /api/v1/medical-records:
 *   post:
 *     summary: Tạo mới bản ghi khám chữa bệnh
 *     description: Chỉ bác sĩ được phép tạo bản ghi khám chữa bệnh. Có thể kèm file ảnh hoặc PDF
 *     tags:
 *       - Medical Records
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - visitId
 *               - title
 *               - symptoms
 *               - diagnosis
 *               - treatments
 *             properties:
 *               visitId:
 *                 type: string
 *                 format: uuid
 *                 description: ID của lượt khám (phải ở trạng thái in_progress)
 *               title:
 *                 type: string
 *                 description: Tiêu đề bản ghi
 *               symptoms:
 *                 type: string
 *                 description: Triệu chứng bệnh nhân
 *               diagnosis:
 *                 type: string
 *                 description: Chẩn đoán của bác sĩ
 *               treatments:
 *                 type: string
 *                 description: Phương pháp điều trị
 *               notes:
 *                 type: string
 *                 description: Ghi chú thêm (optional)
 *               files:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: Danh sách file đính kèm (JPG, PNG, PDF < 5MB)
 *     responses:
 *       200:
 *         description: Tạo bản ghi khám chữa bệnh thành công
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MedicalRecord'
 *       400:
 *         description: Dữ liệu không hợp lệ hoặc visit không hợp lệ
 *       403:
 *         description: Không có quyền tạo (chỉ doctor)
 *       404:
 *         description: Visit không tồn tại
 */
router.post(
    '/',
    authenticateToken(),
    checkRole(['doctor']),
    uploadMedicalRecordFiles.array('files', 10), // Max 10 files
    validateDto(CreateMedicalRecordDto, 'body'),
    asyncHandler(medicalRecordController.createMedicalRecord)
);

/**
 * @swagger
 * /api/v1/medical-records:
 *   get:
 *     summary: Lấy danh sách bản ghi khám chữa bệnh
 *     description: Hỗ trợ phân trang và filter theo visitId, doctorId
 *     tags:
 *       - Medical Records
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
 *         description: Số lượng mỗi trang
 *       - in: query
 *         name: visitId
 *         schema:
 *           type: string
 *         description: Lọc theo ID lượt khám
 *       - in: query
 *         name: doctorId
 *         schema:
 *           type: string
 *         description: Lọc theo ID bác sĩ
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [createdAt, title]
 *           default: createdAt
 *         description: Trường sắp xếp
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Thứ tự sắp xếp
 *     responses:
 *       200:
 *         description: Lấy danh sách thành công
 */
router.get(
    '/',
    authenticateToken(),
    checkRole(['doctor', 'admin', 'patient']),
    validateDto(GetMedicalRecordsQueryDto, 'query'),
    asyncHandler(medicalRecordController.getMedicalRecords)
);

/**
 * @swagger
 * /api/v1/medical-records/{id}:
 *   get:
 *     summary: Lấy chi tiết bản ghi khám chữa bệnh
 *     description: Bác sĩ chỉ xem được bản ghi của mình, admin xem hết
 *     tags:
 *       - Medical Records
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của bản ghi khám chữa bệnh
 *     responses:
 *       200:
 *         description: Lấy bản ghi thành công
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MedicalRecord'
 *       404:
 *         description: Bản ghi không tồn tại
 *       403:
 *         description: Không có quyền xem
 */
router.get(
    '/:id',
    authenticateToken(),
    checkRole(['doctor', 'admin', 'patient']),
    asyncHandler(medicalRecordController.getMedicalRecord)
);

/**
 * @swagger
 * /api/v1/medical-records/{id}:
 *   patch:
 *     summary: Cập nhật bản ghi khám chữa bệnh
 *     description: Chỉ bác sĩ tạo bản ghi mới được cập nhật
 *     tags:
 *       - Medical Records
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của bản ghi khám chữa bệnh
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               symptoms:
 *                 type: string
 *               diagnosis:
 *                 type: string
 *               treatments:
 *                 type: string
 *               notes:
 *                 type: string
 *               files:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MedicalRecord'
 *       403:
 *         description: Không có quyền cập nhật
 *       404:
 *         description: Bản ghi không tồn tại
 */
router.put(
    '/:id',
    authenticateToken(),
    checkRole(['doctor', 'admin']),
    uploadMedicalRecordFiles.array('files', 10),
    validateDto(UpdateMedicalRecordDto, 'body'),
    asyncHandler(medicalRecordController.updateMedicalRecord)
);

/**
 * @swagger
 * /api/v1/medical-records/{id}:
 *   delete:
 *     summary: Xóa bản ghi khám chữa bệnh
 *     description: Chỉ bác sĩ tạo bản ghi mới được xóa
 *     tags:
 *       - Medical Records
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của bản ghi khám chữa bệnh
 *     responses:
 *       200:
 *         description: Xóa thành công
 *       403:
 *         description: Không có quyền xóa
 *       404:
 *         description: Bản ghi không tồn tại
 */
router.delete(
    '/:id',
    authenticateToken(),
    checkRole(['doctor']),
    asyncHandler(medicalRecordController.deleteMedicalRecord)
);

router.delete(
    '/file-asset/:id',
    authenticateToken(),
    checkRole(['doctor']),
    asyncHandler(medicalRecordController.deleteFileAsset)
);

export default router;
