// src/routes/medical-service.routes.ts
import { Router } from 'express';
import medicalServiceController from '@src/controllers/medical-service.controller';
import { validateDto } from '@src/middleware/validatation.middleware';
import { MedicalServiceQueryDto } from '@src/dtos/medical-service.dto';
import asyncHandler from '@src/helpers/asyncHandler';
import { authenticateToken, checkRole } from '@src/middleware/auth.middleware';
import {
    createMedicalServiceDto,
    updateMedicalServiceDto,
} from '@src/dtos/medical-service.dto';

const router = Router();

/**
 * @swagger
 * /api/v1/medical-services:
 *   get:
 *     summary: Lấy danh sách dịch vụ y tế với lọc và phân trang
 *     description: Lấy danh sách dịch vụ y tế với các tùy chọn lọc khác nhau bao gồm chuyên khoa
 *     tags:
 *       - Medical Services
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Số trang
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Số lượng mục trên mỗi trang
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Tìm kiếm theo tên dịch vụ hoặc mô tả
 *       - in: query
 *         name: departmentId
 *         schema:
 *           type: integer
 *         description: Lọc theo ID khoa
 *       - in: query
 *         name: specialization
 *         schema:
 *           type: string
 *         description: Lọc theo chuyên khoa bác sĩ
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: number
 *         description: Lọc theo trạng thái hoạt động
 *       - in: query
 *         name: minPrice
 *         schema:
 *           type: number
 *         description: Lọc giá tối thiểu
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: number
 *         description: Lọc giá tối đa
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [name, price, createdAt, updatedAt]
 *           default: name
 *         description: Trường để sắp xếp
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: asc
 *         description: Thứ tự sắp xếp
 *     responses:
 *       200:
 *         description: Lấy danh sách dịch vụ y tế thành công
 */
router.get(
    '/',
    validateDto(MedicalServiceQueryDto, 'query'),
    asyncHandler(medicalServiceController.getMedicalServices)
);

/**
 * @swagger
 * /api/v1/medical-services/price-range:
 *   get:
 *     summary: Lấy dịch vụ theo khoảng giá
 *     description: Lấy danh sách dịch vụ trong khoảng giá cụ thể
 *     tags:
 *       - Medical Services
 *     parameters:
 *       - in: query
 *         name: minPrice
 *         required: true
 *         schema:
 *           type: number
 *         description: Giá tối thiểu
 *       - in: query
 *         name: maxPrice
 *         required: true
 *         schema:
 *           type: number
 *         description: Giá tối đa
 *     responses:
 *       200:
 *         description: Lấy dịch vụ theo khoảng giá thành công
 */
router.get(
    '/price-range',
    asyncHandler(medicalServiceController.getServicesByPriceRange)
);

/**
 * @swagger
 * /api/v1/medical-services/department/{departmentId}:
 *   get:
 *     summary: Lấy dịch vụ theo khoa
 *     description: Lấy tất cả dịch vụ đang hoạt động của khoa cụ thể
 *     tags:
 *       - Medical Services
 *     parameters:
 *       - in: path
 *         name: departmentId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID khoa
 *     responses:
 *       200:
 *         description: Lấy dịch vụ của khoa thành công
 */
router.get(
    '/department/:departmentId',
    asyncHandler(medicalServiceController.getServicesByDepartment)
);

/**
 * @swagger
 * /api/v1/medical-services/{medicalServiceId}/doctors:
 *   get:
 *     summary: Lấy danh sách bác sĩ theo dịch vụ y tế
 *     description: Trả về danh sách bác sĩ cung cấp dịch vụ cụ thể cùng thông tin giá và thời lượng. Kết quả phân trang.
 *     tags:
 *       - Medical Services
 *     parameters:
 *       - in: path
 *         name: medicalServiceId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của MedicalService
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Số trang
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Số phần tử trên mỗi trang
 *     responses:
 *       200:
 *         description: Danh sách bác sĩ theo dịch vụ y tế
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
 *                   example: "Lấy danh sách dịch vụ y tế của bác sĩ thành công"
 *                 code:
 *                   type: string
 *                   example: "10000"
 *                 data:
 *                   type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           doctorId:
 *                             type: string
 *                           medicalServiceId:
 *                             type: string
 *                           price:
 *                             type: number
 *                           durationMinutes:
 *                             type: number
 *                           isActive:
 *                             type: boolean
 *                           doctor:
 *                             type: object
 *                             properties:
 *                               userId:
 *                                 type: string
 *                               specialization:
 *                                 type: string
 *                               licenseNumber:
 *                                 type: string
 *                               experienceYears:
 *                                 type: integer
 *                               level:
 *                                 type: string
 *                               staff:
 *                                 type: object
 *                                 properties:
 *                                   userId:
 *                                     type: string
 *                                   staffId:
 *                                     type: string
 *                                   departmentId:
 *                                     type: integer
 *                                   position:
 *                                     type: string
 *                                   joinTime:
 *                                     type: string
 *                                     format: date-time
 *                                   leaveTime:
 *                                     type: string
 *                                     format: date-time
 *                                     nullable: true
 *                                   user:
 *                                     type: object
 *                                     properties:
 *                                       id:
 *                                         type: string
 *                                       username:
 *                                         type: string
 *                                       email:
 *                                         type: string
 *                                       avatar:
 *                                         type: string
 *                                       phone:
 *                                         type: string
 *                                       createdAt:
 *                                         type: string
 *                                         format: date-time
 *                                       name:
 *                                         type: object
 *                                         properties:
 *                                           firstName:
 *                                             type: string
 *                                           lastName:
 *                                             type: string
 *                     metadata:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         totalItems:
 *                           type: integer
 *                         totalPages:
 *                           type: integer
 *                         hasPrev:
 *                           type: boolean
 *                         hasNext:
 *                           type: boolean
 *             example:
 *               success: true
 *               message: "Lấy danh sách dịch vụ y tế của bác sĩ thành công"
 *               code: "10000"
 *               data:
 *                 data:
 *                   - doctorId: "1a9a6186-1036-44ae-bf1e-0db7304f9b8c"
 *                     medicalServiceId: "MSV-550e8400-e29b-41d4-a716-446655440002"
 *                     price: 20000000
 *                     durationMinutes: 60
 *                     isActive: true
 *                     doctor:
 *                       userId: "1a9a6186-1036-44ae-bf1e-0db7304f9b8c"
 *                       specialization: "Khám mắt"
 *                       licenseNumber: "MD-123456"
 *                       experienceYears: 10
 *                       level: "Thạc sĩ"
 *                       staff:
 *                         userId: "1a9a6186-1036-44ae-bf1e-0db7304f9b8c"
 *                         staffId: "DOC002"
 *                         departmentId: 1
 *                         position: "Bác sĩ"
 *                         joinTime: "2010-01-01T00:00:00.000Z"
 *                         leaveTime: null
 *                         user:
 *                           id: "1a9a6186-1036-44ae-bf1e-0db7304f9b8c"
 *                           username: "hoangvantrung1"
 *                           email: "hoangvantrung@gmail.com"
 *                           avatar: "https://cdn.pixabay.com/photo/2016/08/08/09/17/avatar-1577909_960_720.png"
 *                           phone: "0912345678"
 *                           createdAt: "2025-10-24T08:37:56.679Z"
 *                           name:
 *                             firstName: "Nguyễn"
 *                             lastName: "Minh Tuấn"
 *                 metadata:
 *                   page: 1
 *                   limit: 10
 *                   totalItems: 1
 *                   totalPages: 1
 *                   hasPrev: false
 *                   hasNext: false
 *       400:
 *         description: Yêu cầu không hợp lệ (ví dụ missing/invalid medicalServiceId)
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Medical service không tồn tại
 */
router.get(
    '/:medicalServiceId/doctors',
    asyncHandler(medicalServiceController.getListDoctorMedicalServices)
);

/**
 * @swagger
 * /api/v1/medical-services/create:
 *   post:
 *     summary: Tạo dịch vụ y tế mới
 *     tags:
 *       - Medical Services
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - roomId
 *               - name
 *               - price
 *               - unit
 *               - durationMinutes
 *               - departmentId
 *             properties:
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uri
 *               roomId:
 *                 type: string
 *                 description: UUID của phòng (nullable được nếu không có)
 *               name:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 100
 *               description:
 *                 type: string
 *                 maxLength: 500
 *               price:
 *                 type: number
 *                 minimum: 0
 *               unit:
 *                 type: string
 *               durationMinutes:
 *                 type: number
 *                 description: Thời lượng (phút)
 *               isActive:
 *                 type: boolean
 *                 default: true
 *               percentApplyHealthInsurance:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 100
 *                 default: 0
 *               departmentId:
 *                 type: integer
 *                 minimum: 1
 *           examples:
 *             valid:
 *               summary: Ví dụ hợp lệ
 *               value:
 *                 images: ["https://example.com/img1.jpg"]
 *                 roomId: "eaefb43a-28f7-4241-b4da-ec40f5ab1f05"
 *                 name: "Khám tim mạch cơ bản"
 *                 description: "Gói khám tim mạch tổng quát"
 *                 price: 250000
 *                 unit: "lần"
 *                 durationMinutes: 30
 *                 isActive: true
 *                 percentApplyHealthInsurance: 20
 *                 departmentId: 3
 *             missing_required:
 *               summary: Thiếu trường bắt buộc (sẽ lỗi)
 *               value:
 *                 name: "Thiếu price"
 *                 unit: "lần"
 *                 durationMinutes: 30
 *                 departmentId: 3
 *     responses:
 *       201:
 *         description: Tạo thành công
 *       400:
 *         description: Dữ liệu vào không hợp lệ
 */
router.post(
    '/create',
    authenticateToken(),
    checkRole(['admin']),
    validateDto(createMedicalServiceDto, 'body'),
    asyncHandler(medicalServiceController.createMedicalService)
);

/**
 * @swagger
 * /api/v1/medical-services/update/{id}:
 *   put:
 *     summary: Cập nhật dịch vụ y tế
 *     tags:
 *       - Medical Services
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của MedicalService cần cập nhật
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uri
 *               roomId:
 *                 type: string
 *               name:
 *                 type: string
 *                 minLength: 2
 *               description:
 *                 type: string
 *               price:
 *                 type: number
 *                 minimum: 0
 *               unit:
 *                 type: string
 *               durationMinutes:
 *                 type: number
 *               isActive:
 *                 type: boolean
 *               percentApplyHealthInsurance:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 100
 *               departmentId:
 *                 type: integer
 *             example:
 *               images: ["https://example.com/new.jpg"]
 *               roomId: "eaefb43a-28f7-4241-b4da-ec40f5ab1f05"
 *               name: "Khám tim mạch nâng cao"
 *               description: "Cập nhật mô tả"
 *               price: 300000
 *               unit: "lần"
 *               durationMinutes: 45
 *               isActive: true
 *               percentApplyHealthInsurance: 10
 *               departmentId: 3
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *       400:
 *         description: Dữ liệu vào không hợp lệ
 *       404:
 *         description: Không tìm thấy dịch vụ để cập nhật
 */
router.put(
    '/update/:id',
    authenticateToken(),
    checkRole(['admin']),
    validateDto(updateMedicalServiceDto, 'body'),
    asyncHandler(medicalServiceController.updateMedicalService)
);

/**
 * @swagger
 * /api/v1/medical-services/delete/{id}:
 *   delete:
 *     summary: Xóa dịch vụ y tế
 *     tags:
 *       - Medical Services
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của MedicalService cần xóa
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
 *                 message:
 *                   type: string
 *                 code:
 *                   type: string
 *             example:
 *               success: true
 *               message: "Xóa dịch vụ y tế thành công"
 *               code: "10000"
 *       400:
 *         description: Yêu cầu không hợp lệ
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Không tìm thấy dịch vụ để xóa
 */
router.delete(
    '/delete/:id',
    authenticateToken(),
    checkRole(['admin']),
    asyncHandler(medicalServiceController.deleteMedicalService)
);
/**
 * @swagger
 * /api/v1/medical-services/doctor-service/create:
 *   post:
 *     summary: Tạo dịch vụ y tế cho bác sĩ
 *     tags:
 *       - Medical Services
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           example:
 *             doctorId: "2b1f4a9e-3d7a-4f3a-9b2b-1a2b3c4d5e6f"
 *             medicalServiceId: "e7f8d9c0-1a2b-3c4d-5e6f-7a8b9c0d1e2f"
 *             price: 150000
 *             durationMinutes: 30
 *     responses:
 *       '201':
 *         description: DoctorService created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   description: Created DoctorService object
 *       '400':
 *         description: Validation error (invalid payload)
 *       '401':
 *         description: Unauthorized (missing or invalid token)
 *       '403':
 *         description: Forbidden (insufficient role)
 *       '409':
 *         description: Conflict (e.g. duplicate doctor-service pair)
 *       '500':
 *         description: Server error
 */
router.post(
    '/doctor-service/create',
    authenticateToken(),
    checkRole(['admin']),
    asyncHandler(medicalServiceController.createDoctorService)
);

/**
 * @swagger
 * /api/v1/medical-services/doctor-service/delete/{doctorId}/{medicalServiceId}:
 *   delete:
 *     summary: Xóa dịch vụ y tế của bác sĩ
 *     description: Xóa mapping giữa bác sĩ và dịch vụ y tế theo doctorId và medicalServiceId. Sử dụng khóa ghép doctorId + medicalServiceId để xóa chính xác một mapping.
 *     tags:
 *       - Medical Services
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: doctorId
 *         required: true
 *         schema:
 *           type: string
 *         description: UUID của bác sĩ (doctorId)
 *       - in: path
 *         name: medicalServiceId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của dịch vụ y tế (medicalServiceId)
 *     responses:
 *       200:
 *         description: Xóa mapping doctor-service thành công
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: "Xóa dịch vụ của bác sĩ thành công"
 *               code: "10000"
 *       400:
 *         description: Yêu cầu không hợp lệ
 *       401:
 *         description: Unauthorized (thiếu hoặc token không hợp lệ)
 *       403:
 *         description: Forbidden (không đủ quyền)
 *       404:
 *         description: Không tìm thấy mapping doctor-service tương ứng
 *       500:
 *         description: Lỗi server
 */
router.delete(
    '/doctor-service/delete/:doctorId/:medicalServiceId',
    authenticateToken(),
    checkRole(['admin']),
    asyncHandler(medicalServiceController.deleteDoctorService)
);

/**
 * @swagger
 * /api/v1/medical-services/{id}:
 *   get:
 *     summary: Lấy dịch vụ y tế theo ID
 *     description: Lấy thông tin chi tiết của dịch vụ y tế theo ID
 *     tags:
 *       - Medical Services
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID dịch vụ y tế
 *     responses:
 *       200:
 *         description: Lấy thông tin dịch vụ y tế thành công
 */
router.get(
    '/:id',
    asyncHandler(medicalServiceController.getMedicalServiceById)
);

export default router;
