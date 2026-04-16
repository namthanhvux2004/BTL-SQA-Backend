import { authenticateToken, checkRole } from '@src/middleware/auth.middleware';
import { Router } from 'express';
import { validateDto } from '@src/middleware/validatation.middleware';
import {
    CreatePrescriptionDto,
    UpdatePrescriptionDto,
    UpdatePrescriptionWithMedicinesDto,
    GetPrescriptionsQueryDto,
    PrescriptionIdParamsDto,
    VisitIdParamsDto,
    CreateMedicineUsageDto,
    UpdateMedicineUsageDto,
    MedicineUsageIdParamsDto,
    BatchAddMedicinesToPrescriptionDto,
} from '@src/dtos/prescription.dto';
import asyncHandler from '@utils/asyncHandler';
import prescriptionController from '@controllers/prescription.controller';

const router = Router();

// ==================== Prescription Routes ====================

/**
 * @swagger
 * /api/v1/prescriptions:
 *   post:
 *     summary: Tạo đơn thuốc mới
 *     description: Chỉ bác sĩ và admin được phép tạo đơn thuốc. Có thể tạo đơn rỗng hoặc kèm danh sách thuốc.
 *     tags:
 *       - Prescriptions
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - visitId
 *             properties:
 *               visitId:
 *                 type: string
 *                 format: uuid
 *                 description: ID của lượt khám
 *               medicines:
 *                 type: array
 *                 description: Danh sách thuốc (optional)
 *                 items:
 *                   type: object
 *                   required:
 *                     - drugName
 *                     - quantity
 *                   properties:
 *                     medicineId:
 *                       type: string
 *                       format: uuid
 *                       description: ID thuốc trong hệ thống (optional, nếu có sẽ auto-price)
 *                     drugName:
 *                       type: string
 *                       description: Tên thuốc
 *                     quantity:
 *                       type: integer
 *                       minimum: 1
 *                       description: Số lượng
 *                     duration:
 *                       type: string
 *                       description: Thời gian sử dụng (optional)
 *                     note:
 *                       type: string
 *                       description: Ghi chú liều dùng (optional)
 *                     price:
 *                       type: number
 *                       description: Giá thuốc (optional, tự động tính nếu có medicineId)
 *     responses:
 *       200:
 *         description: Tạo đơn thuốc thành công
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       403:
 *         description: Không có quyền
 *       404:
 *         description: Visit không tồn tại
 */
router.post(
    '/',
    authenticateToken(),
    checkRole(['doctor', 'admin']),
    validateDto(CreatePrescriptionDto, 'body'),
    asyncHandler(prescriptionController.createPrescription)
);

/**
 * @swagger
 * /api/v1/prescriptions:
 *   get:
 *     summary: Lấy danh sách đơn thuốc với phân trang
 *     description: Lấy danh sách đơn thuốc với các bộ lọc
 *     tags:
 *       - Prescriptions
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
 *           format: uuid
 *         description: Lọc theo ID lượt khám
 *       - in: query
 *         name: paid
 *         schema:
 *           type: boolean
 *         description: Lọc theo trạng thái thanh toán
 *       - in: query
 *         name: fromDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Lọc từ ngày
 *       - in: query
 *         name: toDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Lọc đến ngày
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [createdAt, updatedAt]
 *           default: createdAt
 *         description: Sắp xếp theo trường
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
    validateDto(GetPrescriptionsQueryDto, 'query'),
    asyncHandler(prescriptionController.getPrescriptions)
);

/**
 * @swagger
 * /api/v1/prescriptions/{id}:
 *   get:
 *     summary: Lấy chi tiết đơn thuốc
 *     description: Lấy thông tin chi tiết một đơn thuốc
 *     tags:
 *       - Prescriptions
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID đơn thuốc
 *     responses:
 *       200:
 *         description: Lấy thông tin thành công
 *       404:
 *         description: Đơn thuốc không tồn tại
 */
router.get(
    '/:id',
    authenticateToken(),
    validateDto(PrescriptionIdParamsDto, 'params'),
    asyncHandler(prescriptionController.getPrescription)
);

/**
 * @swagger
 * /api/v1/prescriptions/visit/{visitId}:
 *   get:
 *     summary: Lấy tất cả đơn thuốc của một lượt khám
 *     description: Lấy danh sách đơn thuốc theo visit ID
 *     tags:
 *       - Prescriptions
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: visitId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID lượt khám
 *     responses:
 *       200:
 *         description: Lấy danh sách thành công
 *       404:
 *         description: Visit không tồn tại
 */
router.get(
    '/visit/:visitId',
    authenticateToken(),
    validateDto(VisitIdParamsDto, 'params'),
    asyncHandler(prescriptionController.getPrescriptionsByVisitId)
);

/**
 * @swagger
 * /api/v1/prescriptions/{id}:
 *   put:
 *     summary: Cập nhật đơn thuốc
 *     description: Cập nhật thông tin đơn thuốc (chỉ trạng thái thanh toán). Chỉ người tạo mới có quyền cập nhật.
 *     tags:
 *       - Prescriptions
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID đơn thuốc
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               paid:
 *                 type: boolean
 *                 description: Trạng thái thanh toán
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *       403:
 *         description: Không có quyền cập nhật
 *       404:
 *         description: Đơn thuốc không tồn tại
 */
router.put(
    '/:id',
    authenticateToken(),
    checkRole(['doctor', 'admin']),
    validateDto(PrescriptionIdParamsDto, 'params'),
    validateDto(UpdatePrescriptionDto, 'body'),
    asyncHandler(prescriptionController.updatePrescription)
);

/**
 * @swagger
 * /api/v1/prescriptions/{id}/medicines:
 *   put:
 *     summary: Cập nhật toàn bộ danh sách thuốc của đơn
 *     description: Thay thế toàn bộ danh sách thuốc trong đơn. Chỉ người tạo mới có quyền cập nhật.
 *     tags:
 *       - Prescriptions
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID đơn thuốc
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - medicines
 *             properties:
 *               medicines:
 *                 type: array
 *                 minItems: 1
 *                 description: Danh sách thuốc mới (thay thế toàn bộ)
 *                 items:
 *                   type: object
 *                   required:
 *                     - drugName
 *                     - quantity
 *                   properties:
 *                     medicineId:
 *                       type: string
 *                       format: uuid
 *                     drugName:
 *                       type: string
 *                     quantity:
 *                       type: integer
 *                       minimum: 1
 *                     duration:
 *                       type: string
 *                     note:
 *                       type: string
 *                     price:
 *                       type: number
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *       403:
 *         description: Không có quyền cập nhật
 *       404:
 *         description: Đơn thuốc không tồn tại
 */
router.put(
    '/:id/medicines',
    authenticateToken(),
    checkRole(['doctor', 'admin']),
    validateDto(PrescriptionIdParamsDto, 'params'),
    validateDto(UpdatePrescriptionWithMedicinesDto, 'body'),
    asyncHandler(prescriptionController.updatePrescriptionWithMedicines)
);

/**
 * @swagger
 * /api/v1/prescriptions/{id}:
 *   delete:
 *     summary: Xóa đơn thuốc
 *     description: Xóa đơn thuốc và toàn bộ thuốc trong đơn. Chỉ người tạo mới có quyền xóa.
 *     tags:
 *       - Prescriptions
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID đơn thuốc
 *     responses:
 *       200:
 *         description: Xóa thành công
 *       403:
 *         description: Không có quyền xóa
 *       404:
 *         description: Đơn thuốc không tồn tại
 */
router.delete(
    '/:id',
    authenticateToken(),
    checkRole(['doctor', 'admin']),
    validateDto(PrescriptionIdParamsDto, 'params'),
    asyncHandler(prescriptionController.deletePrescription)
);

// ==================== Medicine Usage Routes ====================

/**
 * @swagger
 * /api/v1/medicine-usages/prescription/{prescriptionId}:
 *   get:
 *     summary: Lấy danh sách thuốc trong đơn
 *     description: Lấy tất cả thuốc của một đơn thuốc
 *     tags:
 *       - Medicine Usages
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: prescriptionId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID đơn thuốc
 *     responses:
 *       200:
 *         description: Lấy danh sách thành công
 *       404:
 *         description: Đơn thuốc không tồn tại
 */
router.get(
    '/medicine-usages/prescription/:prescriptionId',
    authenticateToken(),
    asyncHandler(prescriptionController.getMedicineUsagesByPrescriptionId)
);

router.put(
    '/medicine-usages/toggle-purchase',
    authenticateToken(),
    checkRole(['admin']),
    asyncHandler(prescriptionController.togglePurchaseMedicines as any)
);

/**
 * @swagger
 * /api/v1/medicine-usages:
 *   post:
 *     summary: Thêm thuốc vào đơn
 *     description: Thêm một thuốc vào đơn thuốc. Chỉ người tạo đơn mới có quyền thêm.
 *     tags:
 *       - Medicine Usages
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - prescriptionId
 *               - drugName
 *               - quantity
 *             properties:
 *               prescriptionId:
 *                 type: string
 *                 format: uuid
 *                 description: ID đơn thuốc
 *               medicineId:
 *                 type: string
 *                 format: uuid
 *                 description: ID thuốc (optional)
 *               drugName:
 *                 type: string
 *                 description: Tên thuốc
 *               quantity:
 *                 type: integer
 *                 minimum: 1
 *                 description: Số lượng
 *               duration:
 *                 type: string
 *                 description: Thời gian sử dụng (optional)
 *               note:
 *                 type: string
 *                 description: Ghi chú (optional)
 *               price:
 *                 type: number
 *                 description: Giá (optional)
 *     responses:
 *       200:
 *         description: Thêm thuốc thành công
 *       403:
 *         description: Không có quyền
 *       404:
 *         description: Đơn thuốc không tồn tại
 */
router.post(
    '/medicine-usages',
    authenticateToken(),
    checkRole(['doctor', 'admin']),
    validateDto(CreateMedicineUsageDto, 'body'),
    asyncHandler(prescriptionController.createMedicineUsage)
);

/**
 * @swagger
 * /api/v1/medicine-usages/batch:
 *   post:
 *     summary: Thêm nhiều thuốc vào đơn cùng lúc
 *     description: Thêm batch thuốc vào đơn thuốc
 *     tags:
 *       - Medicine Usages
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - prescriptionId
 *               - medicines
 *             properties:
 *               prescriptionId:
 *                 type: string
 *                 format: uuid
 *               medicines:
 *                 type: array
 *                 minItems: 1
 *                 maxItems: 50
 *                 items:
 *                   type: object
 *                   required:
 *                     - drugName
 *                     - quantity
 *                   properties:
 *                     medicineId:
 *                       type: string
 *                       format: uuid
 *                     drugName:
 *                       type: string
 *                     quantity:
 *                       type: integer
 *                       minimum: 1
 *                     duration:
 *                       type: string
 *                     note:
 *                       type: string
 *                     price:
 *                       type: number
 *     responses:
 *       200:
 *         description: Thêm danh sách thuốc thành công
 */
router.post(
    '/medicine-usages/batch',
    authenticateToken(),
    checkRole(['doctor', 'admin']),
    validateDto(BatchAddMedicinesToPrescriptionDto, 'body'),
    asyncHandler(prescriptionController.addMedicinesToPrescription)
);

/**
 * @swagger
 * /api/v1/medicine-usages/{id}:
 *   put:
 *     summary: Cập nhật thông tin thuốc
 *     description: Cập nhật thông tin thuốc trong đơn. Chỉ người tạo đơn mới có quyền cập nhật.
 *     tags:
 *       - Medicine Usages
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID medicine usage
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               medicineId:
 *                 type: string
 *                 format: uuid
 *               drugName:
 *                 type: string
 *               quantity:
 *                 type: integer
 *                 minimum: 1
 *               duration:
 *                 type: string
 *               note:
 *                 type: string
 *               price:
 *                 type: number
 *               isPurchased:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *       403:
 *         description: Không có quyền
 *       404:
 *         description: Medicine usage không tồn tại
 */
router.put(
    '/medicine-usages/:id',
    authenticateToken(),
    checkRole(['doctor', 'admin']),
    validateDto(MedicineUsageIdParamsDto, 'params'),
    validateDto(UpdateMedicineUsageDto, 'body'),
    asyncHandler(prescriptionController.updateMedicineUsage)
);

/**
 * @swagger
 * /api/v1/medicine-usages/{id}:
 *   delete:
 *     summary: Xóa thuốc khỏi đơn
 *     description: Xóa một thuốc khỏi đơn thuốc. Chỉ người tạo đơn mới có quyền xóa.
 *     tags:
 *       - Medicine Usages
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID medicine usage
 *     responses:
 *       200:
 *         description: Xóa thành công
 *       403:
 *         description: Không có quyền
 *       404:
 *         description: Medicine usage không tồn tại
 */
router.delete(
    '/medicine-usages/:id',
    authenticateToken(),
    checkRole(['doctor', 'admin']),
    validateDto(MedicineUsageIdParamsDto, 'params'),
    asyncHandler(prescriptionController.deleteMedicineUsage)
);

export default router;
