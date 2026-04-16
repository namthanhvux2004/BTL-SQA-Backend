import { Router } from 'express';
import departmentController from '@src/controllers/department.controller';
import asyncHandler from '@src/helpers/asyncHandler';
import {
    createDepartmentDto,
    updateDepartmentDto,
} from '@src/dtos/department.dto';
import { authenticateToken, checkRole } from '@src/middleware/auth.middleware';
import { validateDto } from '@src/middleware/validatation.middleware';

const router = Router();

/**
 * @swagger
 * /api/v1/departments:
 *   get:
 *     summary: Lấy danh sách khoa với phân trang và lọc
 *     tags: [Departments]
 *     parameters:
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
 *         description: Số lượng khoa mỗi trang (mặc định 10)
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Tìm kiếm theo tên, mô tả hoặc mã khoa
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *         description: Lọc theo loại khoa. Có thể truyền vào danh sách các loại khoa, cách nhau bằng dấu phẩy (clinical,paraclinical,administrative)
 *       - in: query
 *         name: code
 *         schema:
 *           type: string
 *         description: Lọc theo mã khoa
 *       - in: query
 *         name: hasHead
 *         schema:
 *           type: boolean
 *         description: Chỉ lấy khoa có trưởng khoa
 *       - in: query
 *         name: hasStaff
 *         schema:
 *           type: boolean
 *         description: Chỉ lấy khoa có nhân viên
 *       - in: query
 *         name: hasServices
 *         schema:
 *           type: boolean
 *         description: Chỉ lấy khoa có dịch vụ y tế
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [name, code, type, createdAt, staffCount]
 *         description: Sắp xếp theo trường (mặc định name)
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *         description: Thứ tự sắp xếp (mặc định asc)
 *       - in: query
 *         name: includeStats
 *         schema:
 *           type: boolean
 *         description: Bao gồm thông tin thống kê (mặc định false)
 *     responses:
 *       200:
 *         description: Lấy danh sách khoa thành công
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DepartmentListResponse'
 *             example:
 *               departments:
 *                 - id: 2
 *                   code: "CARD"
 *                   name: "Tim mạch"
 *                   description: "Khoa tim mạch - khám và can thiệp"
 *                   type: "clinical"
 *                   head:
 *                     id: "user-45"
 *                     name:
 *                       firstName: "Nguyen"
 *                       lastName: "An"
 *                     position: "Trưởng khoa"
 *                   staffCount: 28
 *                   servicesCount: 12
 *                   createdAt: "2024-01-02T08:00:00.000Z"
 *                   updatedAt: "2025-09-01T10:00:00.000Z"
 *               total: 1
 *               page: 1
 *               limit: 10
 *               totalPages: 1
 *       400:
 *         description: Tham số không hợp lệ
 */
router.get('/', asyncHandler(departmentController.getDepartments));

/**
 * @swagger
 * /api/v1/departments/search:
 *   get:
 *     summary: Tìm kiếm khoa theo từ khóa
 *     tags: [Departments]
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Từ khóa tìm kiếm (tên, mô tả hoặc mã khoa)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Số lượng kết quả trả về
 *     responses:
 *       200:
 *         description: Tìm kiếm khoa thành công
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DepartmentListResponse'
 *             example:
 *               departments:
 *                 - id: 4
 *                   code: "OBG"
 *                   name: "Sản"
 *                   description: "Khoa sản"
 *                   type: "clinical"
 *                   head: null
 *                   staffCount: 12
 *                   servicesCount: 5
 *                   createdAt: "2023-05-10T08:00:00.000Z"
 *                   updatedAt: "2025-05-10T08:00:00.000Z"
 *               total: 1
 *               page: 1
 *               limit: 10
 *               totalPages: 1
 */
router.get('/search', asyncHandler(departmentController.searchDepartments));

/**
 * @swagger
 * /api/v1/departments/stats:
 *   get:
 *     summary: Lấy thống kê khoa
 *     tags: [Departments]
 *     parameters:
 *       - in: query
 *         name: groupByType
 *         schema:
 *           type: boolean
 *         description: Nhóm theo loại khoa
 *       - in: query
 *         name: includeStaffStats
 *         schema:
 *           type: boolean
 *         description: Bao gồm thống kê nhân viên
 *       - in: query
 *         name: includeServiceStats
 *         schema:
 *           type: boolean
 *         description: Bao gồm thống kê dịch vụ
 *     responses:
 *       200:
 *         description: Lấy thống kê khoa thành công
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DepartmentStatsResponse'
 *             example:
 *               typeStats:
 *                 - type: "clinical"
 *                   count: 12
 *                   percentage: 60
 *                 - type: "paraclinical"
 *                   count: 6
 *                   percentage: 30
 *                 - type: "administrative"
 *                   count: 2
 *                   percentage: 10
 *               staffStats:
 *                 - department: "Tim mạch"
 *                   staffCount: 28
 *               serviceStats:
 *                 - department: "Tim mạch"
 *                   servicesCount: 12
 */
router.get('/stats', asyncHandler(departmentController.getDepartmentStats));

/**
 * @swagger
 * /api/v1/departments/with-services:
 *   get:
 *     summary: Lấy danh sách khoa có dịch vụ y tế
 *     tags: [Departments]
 *     responses:
 *       200:
 *         description: Lấy danh sách khoa có dịch vụ thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 departments:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/DepartmentSummary'
 *             example:
 *               departments:
 *                 - id: 2
 *                   code: "CARD"
 *                   name: "Tim mạch"
 *                   services:
 *                     - id: 101
 *                       name: "Siêu âm tim"
 *                       price: 500000
 *                 - id: 5
 *                   code: "DERM"
 *                   name: "Da liễu"
 *                   services:
 *                     - id: 201
 *                       name: "Khám da"
 *                       price: 200000
 */
router.get(
    '/with-services',
    asyncHandler(departmentController.getDepartmentsWithServices)
);

/**
 * @swagger
 * /api/v1/departments/type/{type}:
 *   get:
 *     summary: Lấy danh sách khoa theo loại
 *     tags: [Departments]
 *     parameters:
 *       - in: path
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *           enum: [clinical, paraclinical, administrative]
 *         description: Loại khoa
 *     responses:
 *       200:
 *         description: Lấy danh sách khoa theo loại thành công
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DepartmentListResponse'
 *             example:
 *               departments:
 *                 - id: 2
 *                   code: "CARD"
 *                   name: "Tim mạch"
 *                   description: "Khoa tim mạch"
 *                   type: "clinical"
 *                   head:
 *                     id: "user-45"
 *                     name:
 *                       firstName: "Nguyen"
 *                       lastName: "An"
 *                   staffCount: 28
 *                   servicesCount: 12
 *               total: 1
 *               page: 1
 *               limit: 10
 *               totalPages: 1
 *       404:
 *         description: Không tìm thấy khoa thuộc loại này
 */
router.get(
    '/type/:type',
    asyncHandler(departmentController.getDepartmentsByType)
);

/**
 * @swagger
 * /api/v1/departments/create:
 *   post:
 *     summary: Tạo mới khoa
 *     tags: [Departments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           example:
 *             name: "Khoa Chẩn đoán Hình Ảnh"
 *             description: "Dịch vụ chụp X-quang, CT, MRI..."
 *             code: "IMG007"
 *             phone: "0123456789"
 *             thumbnail: "https://example.com/thumb.png"
 *             image:
 *               - "https://example.com/img1.png"
 *             type: "paraclinical"
 *             headId: "user-123"
 *             roomId: "room-1"
 *             deputies:
 *               - userId: "user-456"
 *     responses:
 *       201:
 *         description: Khoa được tạo thành công
 *       400:
 *         description: Dữ liệu gửi lên không hợp lệ
 *       401:
 *         description: Không có quyền (Unauthorized)
 *       403:
 *         description: Bị cấm (Forbidden)
 *       500:
 *         description: Lỗi server
 */
router.post(
    '/create',
    authenticateToken(),
    checkRole(['admin']),
    validateDto(createDepartmentDto, 'body'),
    asyncHandler(departmentController.createDepartment)
);

/**
 * @swagger
 * /api/v1/departments/update/{id}:
 *   put:
 *     summary: Cập nhật thông tin khoa
 *     tags: [Departments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID của khoa cần cập nhật
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           example:
 *             name: "Khoa Chẩn đoán Hình Ảnh (Cập nhật)"
 *             description: "Cập nhật mô tả..."
 *             code: "IMG007"
 *             phone: "0987654321"
 *             thumbnail: "https://example.com/new-thumb.png"
 *             image:
 *               - "https://example.com/new-img1.png"
 *             type: "paraclinical"
 *             headId: "user-789"
 *             roomId: "room-2"
 *             deputies:
 *               - userId: "user-999"
 *     responses:
 *       200:
 *         description: Cập nhật khoa thành công
 *       400:
 *         description: Dữ liệu gửi lên không hợp lệ
 *       401:
 *         description: Không có quyền (Unauthorized)
 *       403:
 *         description: Bị cấm (Forbidden)
 *       404:
 *         description: Không tìm thấy khoa
 *       500:
 *         description: Lỗi server
 */
router.put(
    '/update/:id',
    authenticateToken(),
    checkRole(['admin']),
    validateDto(updateDepartmentDto, 'body'),
    asyncHandler(departmentController.updateDepartment as any)
);

/**
 * @swagger
 * /api/v1/departments/delete/{id}:
 *   delete:
 *     summary: Xóa khoa theo ID
 *     tags: [Departments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID của khoa cần xóa
 *     responses:
 *       200:
 *         description: Xóa khoa thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   nullable: true
 *             example:
 *               success: true
 *               message: "Xóa khoa thành công"
 *               data: null
 *       400:
 *         description: Yêu cầu không hợp lệ
 *       401:
 *         description: Unauthorized (thiếu hoặc token không hợp lệ)
 *       403:
 *         description: Forbidden (không đủ quyền)
 *       404:
 *         description: Không tìm thấy khoa với ID này
 *       500:
 *         description: Lỗi server
 */
router.delete(
    '/delete/:id',
    authenticateToken(),
    checkRole(['admin']),
    asyncHandler(departmentController.deleteDepartment as any)
);

/**
 * @swagger
 * /api/v1/departments/{id}:
 *   get:
 *     summary: Lấy thông tin chi tiết khoa theo ID
 *     tags: [Departments]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID của khoa
 *     responses:
 *       200:
 *         description: Lấy thông tin khoa thành công
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DepartmentResponse'
 *             example:
 *               id: 2
 *               code: "CARD"
 *               name: "Tim mạch"
 *               description: "Khoa tim mạch - khám và can thiệp"
 *               type: "clinical"
 *               head:
 *                 id: "user-45"
 *                 name:
 *                   firstName: "Nguyen"
 *                   lastName: "An"
 *                 position: "Trưởng khoa"
 *               deputies:
 *                 - id: "user-46"
 *                   name:
 *                     firstName: "Tran"
 *                     lastName: "Binh"
 *                   position: "Phó khoa"
 *               staffCount: 28
 *               servicesCount: 12
 *               createdAt: "2024-01-02T08:00:00.000Z"
 *               updatedAt: "2025-09-01T10:00:00.000Z"
 *       404:
 *         description: Không tìm thấy khoa
 */
router.get('/:id', asyncHandler(departmentController.getDepartmentById));

export default router;
