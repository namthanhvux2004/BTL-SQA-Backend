import { Router } from 'express';
import visitController from '@src/controllers/visit.controller';
import { validateDto } from '@src/middleware/validatation.middleware';
import {
    createVisitDto,
    getVisitsByDateDto,
    getVisitsOfPatientDto,
    CompleteVisitDto,
    CancelVisitDto,
    VisitIdParamsDto,
    getVisitsOfDoctorDto,
    UpdateVisitStatusDto,
    searchVisitsDto,
    getTasksOfDoctorDto,
} from '@src/dtos/visit.dto';
import { authenticateToken, checkRole } from '@src/middleware/auth.middleware';
import asyncHandler from '@src/helpers/asyncHandler';
import {
    ServiceUsageQueryDto,
    VisitServiceHistoryParamsDto,
} from '@src/dtos/visit-service.dto';
import * as serviceUsageController from '@src/controllers/service-usage.controller';

const router = Router();

/**
 * @swagger
 * /api/v1/visits/stats:
 *   get:
 *     summary: Lấy thống kê số lượng lượt khám theo trạng thái trong một ngày
 *     tags: [Visits]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: date
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *           example: "2025-12-26"
 *         description: Ngày cần thống kê (YYYY-MM-DD), mặc định là hôm nay
 *     responses:
 *       200:
 *         description: Thống kê lượt khám thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 statusCode:
 *                   type: number
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: "Lấy thống kê lượt khám thành công"
 *                 data:
 *                   type: object
 *                   properties:
 *                     date:
 *                       type: string
 *                       example: "2025-12-26"
 *                     waiting:
 *                       type: number
 *                       example: 5
 *                       description: Số lượt khám đang chờ
 *                     inProgress:
 *                       type: number
 *                       example: 3
 *                       description: Số lượt khám đang thực hiện
 *                     completed:
 *                       type: number
 *                       example: 12
 *                       description: Số lượt khám đã hoàn thành
 *                     total:
 *                       type: number
 *                       example: 20
 *                       description: Tổng số lượt khám
 *       401:
 *         description: Chưa xác thực
 *       400:
 *         description: Tham số không hợp lệ
 */
router.get(
    '/stats',
    authenticateToken(),
    checkRole(['admin', 'doctor']),
    validateDto(getVisitsByDateDto, 'query'),
    asyncHandler(visitController.getVisitStatsByDate as any)
);

/**
 * @swagger
 * /api/v1/visits/by-date:
 *   get:
 *     summary: Lấy danh sách lượt khám trong một ngày
 *     tags: [Visits]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: date
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *           example: "2025-12-26"
 *         description: Ngày cần lấy danh sách (YYYY-MM-DD), mặc định là hôm nay
 *       - in: query
 *         name: status
 *         required: false
 *         schema:
 *           type: string
 *           enum: [waiting, in_progress, completed, cancelled]
 *         description: Lọc theo trạng thái lượt khám
 *       - in: query
 *         name: page
 *         schema:
 *           type: string
 *           example: "1"
 *         description: Số trang
 *       - in: query
 *         name: limit
 *         schema:
 *           type: string
 *           example: "10"
 *         description: Số lượng bản ghi mỗi trang
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           example: "startTime"
 *         description: Trường sắp xếp
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           example: "asc"
 *         description: Thứ tự sắp xếp
 *     responses:
 *       200:
 *         description: Lấy danh sách lượt khám thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 statusCode:
 *                   type: number
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: "Lấy danh sách lượt khám thành công"
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       ehrId:
 *                         type: string
 *                       startTime:
 *                         type: string
 *                         format: date-time
 *                       endTime:
 *                         type: string
 *                         format: date-time
 *                       status:
 *                         type: string
 *                         enum: [waiting, in_progress, completed, cancelled]
 *                       notes:
 *                         type: string
 *                       medicalRecords:
 *                         type: array
 *                         items:
 *                           $ref: '#/components/schemas/MedicalRecord'
 *                 metadata:
 *                   type: object
 *                   properties:
 *                     totalItems:
 *                       type: number
 *                     itemCount:
 *                       type: number
 *                     itemsPerPage:
 *                       type: number
 *                     totalPages:
 *                       type: number
 *                     currentPage:
 *                       type: number
 *       401:
 *         description: Chưa xác thực
 *       400:
 *         description: Tham số không hợp lệ
 */
router.get(
    '/by-date',
    authenticateToken(),
    checkRole(['admin', 'doctor']),
    validateDto(getVisitsByDateDto, 'query'),
    asyncHandler(visitController.getVisitsByDate as any)
);

router.get(
    '/search',
    authenticateToken(),
    validateDto(searchVisitsDto, 'query'),
    asyncHandler(visitController.searchVisits as any)
);

/**
 * @swagger
 * /api/v1/visits/patient/{patientId}:
 *   get:
 *     summary: Lấy danh sách lượt khám của một bệnh nhân
 *     tags: [Visits]
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
 *       - in: query
 *         name: page
 *         schema:
 *           type: string
 *           example: "1"
 *         description: Số trang
 *       - in: query
 *         name: limit
 *         schema:
 *           type: string
 *           example: "10"
 *         description: Số lượng bản ghi mỗi trang
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           example: "createdAt"
 *         description: Trường sắp xếp
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           example: "desc"
 *         description: Thứ tự sắp xếp
 *       - in: query
 *         name: fromDate
 *         schema:
 *           type: string
 *           format: date
 *           example: "2025-01-01"
 *         description: Lọc từ ngày (YYYY-MM-DD)
 *       - in: query
 *         name: toDate
 *         schema:
 *           type: string
 *           format: date
 *           example: "2025-12-31"
 *         description: Lọc đến ngày (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Lấy danh sách lượt khám thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 statusCode:
 *                   type: number
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: "Lấy danh sách lượt khám thành công"
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                 metadata:
 *                   type: object
 *       401:
 *         description: Chưa xác thực
 *       403:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không tìm thấy bệnh nhân
 */
router.get(
    '/patient/:patientId',
    authenticateToken(),
    validateDto(getVisitsOfPatientDto, 'query'),
    asyncHandler(visitController.getVisitsOfPatient as any)
);

/**
 * @swagger
 * /api/v1/visits/doctor/{doctorId}:
 *   get:
 *     summary: Lấy danh sách lượt khám của một bác sĩ
 *     tags: [Visits]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: doctorId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID của bác sĩ
 *       - in: query
 *         name: page
 *         schema:
 *           type: string
 *           example: "1"
 *         description: Số trang
 *       - in: query
 *         name: limit
 *         schema:
 *           type: string
 *           example: "10"
 *         description: Số lượng bản ghi mỗi trang
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           example: "createdAt"
 *         description: Trường sắp xếp
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           example: "desc"
 *         description: Thứ tự sắp xếp
 *       - in: query
 *         name: fromDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Lọc từ ngày (YYYY-MM-DD)
 *       - in: query
 *         name: toDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Lọc đến ngày (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Lấy danh sách lượt khám thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 statusCode:
 *                   type: number
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: "Lấy danh sách lượt khám thành công"
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                 metadata:
 *                   type: object
 *       401:
 *         description: Chưa xác thực
 *       403:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không tìm thấy bác sĩ
 */
router.get(
    '/doctor/:doctorId',
    authenticateToken(),
    validateDto(getVisitsOfDoctorDto, 'query'),
    asyncHandler(visitController.getVisitsOfDoctor as any)
);

/**
 * @swagger
 * /api/v1/visits/{id}:
 *   get:
 *     summary: Lấy chi tiết một lượt khám
 *     tags: [Visits]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID của lượt khám
 *     responses:
 *       200:
 *         description: Lấy chi tiết lượt khám thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 statusCode:
 *                   type: number
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: "Lấy chi tiết lượt khám thành công"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     ehrId:
 *                       type: string
 *                     startTime:
 *                       type: string
 *                       format: date-time
 *                     endTime:
 *                       type: string
 *                       format: date-time
 *                     status:
 *                       type: string
 *                       enum: [waiting, in_progress, completed, cancelled]
 *                     notes:
 *                       type: string
 *                     medicalRecords:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/MedicalRecord'
 *                     doctor:
 *                       type: object
 *                     prescriptions:
 *                       type: array
 *                     visitServices:
 *                       type: array
 *                     ehr:
 *                       type: object
 *       401:
 *         description: Chưa xác thực
 *       403:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không tìm thấy lượt khám
 */
router.get(
    '/:id',
    authenticateToken(),
    asyncHandler(visitController.getDetailsOfVisit as any)
);

/**
 * @swagger
 * /api/v1/visits:
 *   post:
 *     summary: Tạo lượt khám mới
 *     tags: [Visits]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - ehrId
 *               - startTime
 *             properties:
 *               ehrId:
 *                 type: string
 *                 format: uuid
 *                 description: ID của hồ sơ sức khỏe điện tử
 *                 example: "550e8400-e29b-41d4-a716-446655440000"
 *               doctorId:
 *                 type: string
 *                 format: uuid
 *                 description: ID của bác sĩ (optional)
 *                 example: "550e8400-e29b-41d4-a716-446655440001"
 *               appointmentId:
 *                 type: string
 *                 format: uuid
 *                 description: ID của lịch hẹn (optional)
 *                 example: "550e8400-e29b-41d4-a716-446655440002"
 *               medicalServiceId:
 *                 type: string
 *                 format: uuid
 *                 description: ID của dịch vụ y tế (optional)
 *                 example: "550e8400-e29b-41d4-a716-446655440003"
 *               startTime:
 *                 type: string
 *                 format: date-time
 *                 description: Thời gian bắt đầu lượt khám
 *                 example: "2025-12-29T10:00:00Z"
 *               status:
 *                 type: string
 *                 enum: [waiting, in_progress, completed, cancelled]
 *                 description: Trạng thái lượt khám (optional, mặc định là in_progress)
 *                 example: "in_progress"
 *               nextVisitDate:
 *                 type: string
 *                 format: date-time
 *                 description: Ngày tái khám (optional)
 *                 example: "2026-01-15T10:00:00Z"
 *     responses:
 *       200:
 *         description: Tạo lượt khám thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 statusCode:
 *                   type: number
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: "Tạo lượt khám thành công"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     ehrId:
 *                       type: string
 *                       format: uuid
 *                     doctorId:
 *                       type: string
 *                       format: uuid
 *                     appointmentId:
 *                       type: string
 *                       format: uuid
 *                     medicalServiceId:
 *                       type: string
 *                       format: uuid
 *                     status:
 *                       type: string
 *                       enum: [waiting, in_progress, completed, cancelled]
 *                     startTime:
 *                       type: string
 *                       format: date-time
 *                     endTime:
 *                       type: string
 *                       format: date-time
 *                     nextVisitDate:
 *                       type: string
 *                       format: date-time
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *                     doctor:
 *                       type: object
 *                     prescriptions:
 *                       type: array
 *                     visitServices:
 *                       type: array
 *                     medicalRecords:
 *                       type: array
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       401:
 *         description: Chưa xác thực
 *       404:
 *         description: Không tìm thấy EHR, Doctor, Appointment hoặc MedicalService
 */
router.post(
    '/',
    authenticateToken(),
    checkRole(['admin', 'doctor']),
    validateDto(createVisitDto, 'body'),
    asyncHandler(visitController.createVisit)
);

// ==================== Visit Management Routes ====================

/**
 * @swagger
 * /api/v1/visits/{id}/summary:
 *   get:
 *     summary: Lấy tổng quan chi tiết của lượt khám
 *     description: Lấy thông tin tổng quan bao gồm dịch vụ, thuốc, bệnh án và tổng chi phí. Patient chỉ xem được lượt khám của mình, Doctor chỉ xem được lượt khám được phân công.
 *     tags: [Visits]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID lượt khám
 *     responses:
 *       200:
 *         description: Lấy tổng quan thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 statusCode:
 *                   type: number
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: "Lấy tổng quan lượt khám thành công"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     status:
 *                       type: string
 *                     startTime:
 *                       type: string
 *                       format: date-time
 *                     endTime:
 *                       type: string
 *                       format: date-time
 *                     visitServices:
 *                       type: array
 *                     prescriptions:
 *                       type: array
 *                     medicalRecords:
 *                       type: array
 *                     summary:
 *                       type: object
 *                       properties:
 *                         servicesCost:
 *                           type: number
 *                         medicinesCost:
 *                           type: number
 *                         totalCost:
 *                           type: number
 *                         servicesCount:
 *                           type: number
 *                         medicinesCount:
 *                           type: number
 *                         medicalRecordsCount:
 *                           type: number
 *       401:
 *         description: Chưa xác thực
 *       403:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không tìm thấy lượt khám
 */
router.get(
    '/:id/summary',
    authenticateToken(),
    validateDto(VisitIdParamsDto, 'params'),
    asyncHandler(visitController.getVisitSummary)
);

/**
 * @swagger
 * /api/v1/visits/{id}/complete:
 *   post:
 *     summary: Hoàn thành lượt khám
 *     description: Đánh dấu lượt khám là hoàn thành. Chỉ bác sĩ được phân công hoặc admin mới có quyền. Không thể hoàn thành lượt khám đã cancelled.
 *     tags: [Visits]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID lượt khám
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               notes:
 *                 type: string
 *                 description: Ghi chú khi hoàn thành (optional)
 *     responses:
 *       200:
 *         description: Hoàn thành lượt khám thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 statusCode:
 *                   type: number
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: "Hoàn thành lượt khám thành công"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     status:
 *                       type: string
 *                       example: "completed"
 *                     endTime:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Lượt khám đã hoàn thành hoặc đã hủy
 *       401:
 *         description: Chưa xác thực
 *       403:
 *         description: Không có quyền (chỉ bác sĩ được phân công hoặc admin)
 *       404:
 *         description: Không tìm thấy lượt khám
 */
router.post(
    '/:id/complete',
    authenticateToken(),
    checkRole(['doctor', 'admin']),
    validateDto(VisitIdParamsDto, 'params'),
    validateDto(CompleteVisitDto, 'body'),
    asyncHandler(visitController.completeVisit)
);

/**
 * @swagger
 * /api/v1/visits/{id}/cancel:
 *   post:
 *     summary: Hủy lượt khám
 *     description: Hủy lượt khám với lý do. Chỉ bác sĩ được phân công hoặc admin mới có quyền. Không thể hủy lượt khám đã completed.
 *     tags: [Visits]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID lượt khám
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reason
 *             properties:
 *               reason:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 500
 *                 description: Lý do hủy lượt khám
 *                 example: "Bệnh nhân không đến khám"
 *     responses:
 *       200:
 *         description: Hủy lượt khám thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 statusCode:
 *                   type: number
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: "Hủy lượt khám thành công"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     status:
 *                       type: string
 *                       example: "cancelled"
 *                     notes:
 *                       type: string
 *       400:
 *         description: Lượt khám đã completed hoặc đã cancelled
 *       401:
 *         description: Chưa xác thực
 *       403:
 *         description: Không có quyền (chỉ bác sĩ được phân công hoặc admin)
 *       404:
 *         description: Không tìm thấy lượt khám
 */
router.post(
    '/:id/cancel',
    authenticateToken(),
    checkRole(['doctor', 'admin']),
    validateDto(VisitIdParamsDto, 'params'),
    validateDto(CancelVisitDto, 'body'),
    asyncHandler(visitController.cancelVisit)
);

/**
 * @swagger
 * /api/v1/visits/{id}/cost:
 *   get:
 *     summary: Tính tổng chi phí lượt khám
 *     description: Tính tổng chi phí bao gồm dịch vụ y tế và thuốc. Trả về chi tiết từng khoản.
 *     tags: [Visits]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID lượt khám
 *     responses:
 *       200:
 *         description: Tính toán thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 statusCode:
 *                   type: number
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: "Tính toán chi phí lượt khám thành công"
 *                 data:
 *                   type: object
 *                   properties:
 *                     visitId:
 *                       type: string
 *                     servicesCost:
 *                       type: number
 *                       example: 500000
 *                     medicinesCost:
 *                       type: number
 *                       example: 150000
 *                     totalCost:
 *                       type: number
 *                       example: 650000
 *                     breakdown:
 *                       type: object
 *                       properties:
 *                         services:
 *                           type: array
 *                         medicines:
 *                           type: array
 *       401:
 *         description: Chưa xác thực
 *       404:
 *         description: Không tìm thấy lượt khám
 */
router.get(
    '/:id/cost',
    authenticateToken(),
    validateDto(VisitIdParamsDto, 'params'),
    asyncHandler(visitController.calculateVisitCost)
);

/**
 * @swagger
 * /api/v1/visits/{id}/service-usages:
 *   get:
 *     summary: Get visit service history
 *     description: Retrieve service history for a specific visit with filters and summary statistics. Patients can only view their own visit history, while doctors/admins can view any visit's history.
 *     tags:
 *       - Service Usages
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Visit ID
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [ordered, in_progress, done, cancelled]
 *         description: Filter by status
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter by start date (ISO 8601)
 *         example: "2025-01-01T00:00:00Z"
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter by end date (ISO 8601)
 *         example: "2025-12-31T23:59:59Z"
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Items per page
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [createdAt, updatedAt, price]
 *           default: createdAt
 *         description: Sort by field
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
 *     responses:
 *       200:
 *         description: Visit service history retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Cannot view other patients' visit history
 *       404:
 *         description: Visit not found
 */
router.get(
    '/visits/:id/service-usages',
    validateDto(VisitServiceHistoryParamsDto, 'params'),
    validateDto(ServiceUsageQueryDto, 'query'),
    authenticateToken(),
    checkRole(['doctor', 'admin', 'accountant', 'patient']),
    asyncHandler(serviceUsageController.getVisitHistory as any)
);

/**
 * @swagger
 * /api/v1/visits/{id}/status:
 *   patch:
 *     summary: Cập nhật trạng thái lượt khám
 *     description: Cập nhật trạng thái của lượt khám. Chỉ admin mới có quyền.
 *     tags: [Visits]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID lượt khám
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [waiting, in_progress, completed, cancelled]
 *                 description: Trạng thái mới của lượt khám
 *     responses:
 *       200:
 *         description: Cập nhật trạng thái thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 statusCode:
 *                   type: number
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: "Cập nhật trạng thái lượt khám thành công"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     status:
 *                       type: string
 *                       example: "completed"
 *       400:
 *         description: Trạng thái không hợp lệ
 *       401:
 *         description: Chưa xác thực
 *       403:
 *         description: Không có quyền (chỉ admin)
 *       404:
 *         description: Không tìm thấy lượt khám
 */
router.patch(
    '/:id/status',
    authenticateToken(),
    checkRole(['admin', 'doctor']),
    validateDto(VisitIdParamsDto, 'params'),
    validateDto(UpdateVisitStatusDto, 'body'),
    asyncHandler(visitController.updateVisitStatus)
);

router.patch(
    '/:id/next-visit-date',
    authenticateToken(),
    checkRole(['admin', 'doctor']),
    validateDto(VisitIdParamsDto, 'params'),
    asyncHandler(visitController.updateNextVisitDate)
);

/**
 * @swagger
 * /api/v1/doctors/{doctorId}/tasks:
 *   get:
 *     summary: Lấy danh sách công việc của bác sĩ
 *     description: Trả về các ca khám mà bác sĩ có thể nhận, bao gồm visit được gán trực tiếp và visit có dịch vụ mà bác sĩ có thể thực hiện
 *     tags: [Doctors]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: doctorId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của bác sĩ
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [waiting, in_progress, completed, cancelled]
 *         description: Lọc theo trạng thái visit
 *       - in: query
 *         name: fromDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Ngày bắt đầu (YYYY-MM-DD)
 *       - in: query
 *         name: toDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Ngày kết thúc (YYYY-MM-DD)
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
 *         description: Số lượng mỗi trang (mặc định 10)
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *         description: Trường sắp xếp (mặc định startTime)
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *         description: Thứ tự sắp xếp (mặc định asc)
 *     responses:
 *       200:
 *         description: Lấy danh sách công việc thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 statusCode: { type: integer, example: 200 }
 *                 message: { type: string, example: "Lấy danh sách công việc của bác sĩ thành công" }
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id: { type: string }
 *                       taskSource: { type: string, enum: [visit, visit_service], description: "Nguồn gốc công việc" }
 *                       status: { type: string }
 *                       startTime: { type: string, format: date-time }
 *                       ehr: { type: object }
 *                       doctor: { type: object }
 *                       visitServices: { type: array }
 *                 metadata:
 *                   type: object
 *                   properties:
 *                     page: { type: integer }
 *                     limit: { type: integer }
 *                     totalItems: { type: integer }
 *                     totalPages: { type: integer }
 *                     hasNext: { type: boolean }
 *                     hasPrev: { type: boolean }
 *       401:
 *         description: Chưa xác thực
 *       403:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không tìm thấy bác sĩ
 */
router.get(
    '/doctor/:doctorId/tasks',
    authenticateToken(),
    checkRole(['admin', 'doctor']),
    validateDto(getTasksOfDoctorDto, 'query'),
    asyncHandler(visitController.getTasksOfDoctor as any)
);

router.patch(
    '/visit-service/:visitServiceId/status',
    authenticateToken(),
    checkRole(['admin', 'doctor']),
    asyncHandler(visitController.updateVisitServiceStatus as any)
);

export default router;
