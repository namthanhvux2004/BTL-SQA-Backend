import { Router } from 'express';
import doctorController from '@src/controllers/doctor.controller';
import asyncHandler from '@src/helpers/asyncHandler';

const router = Router();

/**
 * @swagger
 * /api/v1/doctors:
 *   get:
 *     summary: Lấy danh sách bác sĩ với phân trang và lọc
 *     tags: [Doctors]
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
 *         description: Số lượng bác sĩ mỗi trang (mặc định 10)
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Tìm kiếm theo tên bác sĩ
 *       - in: query
 *         name: specialization
 *         schema:
 *           type: string
 *         description: Lọc theo chuyên khoa
 *       - in: query
 *         name: level
 *         schema:
 *           type: string
 *           enum: [thạc sĩ, tiến sĩ, phó giáo sư, giáo sư, chuyên khoa I, chuyên khoa II]
 *         description: Lọc theo cấp độ bác sĩ
 *       - in: query
 *         name: departmentId
 *         schema:
 *           type: integer
 *         description: Lọc theo ID khoa
 *       - in: query
 *         name: minExperience
 *         schema:
 *           type: integer
 *         description: Số năm kinh nghiệm tối thiểu
 *       - in: query
 *         name: maxExperience
 *         schema:
 *           type: integer
 *         description: Số năm kinh nghiệm tối đa
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [name, experienceYears, level, specialization, createdAt]
 *         description: Sắp xếp theo trường (mặc định name)
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *         description: Thứ tự sắp xếp (mặc định asc)
 *     responses:
 *       200:
 *         description: Lấy danh sách bác sĩ thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 doctors:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id: { type: string }
 *                       user:
 *                         type: object
 *                         properties:
 *                           id: { type: string }
 *                           username: { type: string }
 *                           email: { type: string }
 *                           avatar: { type: string, nullable: true }
 *                           phone: { type: string, nullable: true }
 *                           name:
 *                             type: object
 *                             properties:
 *                               firstName: { type: string }
 *                               lastName: { type: string }
 *                       staff:
 *                         type: object
 *                         properties:
 *                           staffId: { type: string, nullable: true }
 *                           position: { type: string, nullable: true }
 *                           department:
 *                             type: object
 *                             properties:
 *                               id: { type: integer }
 *                               name: { type: string }
 *                       specialization: { type: string, nullable: true }
 *                       experienceYears: { type: integer }
 *                       level: { type: string, nullable: true }
 *                       rating: { type: number }
 *                       isAvailable: { type: boolean }
 *                 total: { type: integer }
 *                 page: { type: integer }
 *                 limit: { type: integer }
 *                 totalPages: { type: integer }
 *             example:
 *               doctors:
 *                 - id: "user-123"
 *                   user:
 *                     id: "user-123"
 *                     username: "dr.nguyen"
 *                     email: "dr.nguyen@example.com"
 *                     avatar: null
 *                     phone: "+84901234567"
 *                     name:
 *                       firstName: "Nguyen"
 *                       lastName: "An"
 *                   staff:
 *                     staffId: "staff-45"
 *                     position: "Bác sĩ chuyên khoa"
 *                     department:
 *                       id: 2
 *                       name: "Tim mạch"
 *                   specialization: "Tim mạch can thiệp"
 *                   experienceYears: 12
 *                   level: "Thạc sĩ"
 *                   rating: 4.6
 *                   isAvailable: true
 *               total: 1
 *               page: 1
 *               limit: 10
 *               totalPages: 1
 *       400:
 *         description: Tham số không hợp lệ
 */
router.get('/', asyncHandler(doctorController.getDoctors));

/**
 * @swagger
 * /api/v1/doctors/search:
 *   get:
 *     summary: Tìm kiếm bác sĩ theo từ khóa
 *     tags: [Doctors]
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Từ khóa tìm kiếm (tên hoặc chuyên khoa)
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Số trang
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Số lượng mỗi trang
 *     responses:
 *       200:
 *         description: Tìm kiếm bác sĩ thành công
 *         content:
 *           application/json:
 *             schema:
 *             example:
 *               doctors:
 *                 - id: "user-234"
 *                   user:
 *                     id: "user-234"
 *                     username: "dr.le"
 *                     email: "dr.le@example.com"
 *                     avatar: null
 *                     phone: "+84901112233"
 *                     name:
 *                       firstName: "Le"
 *                       lastName: "Minh"
 *                   staff:
 *                     staffId: "staff-12"
 *                     position: "Bác sĩ"
 *                     department:
 *                       id: 3
 *                       name: "Nhi"
 *                   specialization: "Nhi khoa"
 *                   experienceYears: 8
 *                   level: "Thạc sĩ"
 *                   rating: 4.4
 *                   isAvailable: false
 *               total: 1
 *               page: 1
 *               limit: 20
 *               totalPages: 1
 */
router.get('/search', asyncHandler(doctorController.searchDoctors));

/**
 * @swagger
 * /api/v1/doctors/top:
 *   get:
 *     summary: Lấy danh sách bác sĩ hàng đầu
 *     tags: [Doctors]
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
 *         description: Số lượng bác sĩ mỗi trang (mặc định 10)
 *     responses:
 *       200:
 *         description: Lấy danh sách bác sĩ hàng đầu thành công
 *         content:
 *           application/json:
 *             schema:
 *             example:
 *               doctors:
 *                 - id: "user-999"
 *                   user:
 *                     id: "user-999"
 *                     username: "dr.hoang"
 *                     email: "dr.hoang@example.com"
 *                     avatar: null
 *                     phone: "+84909998877"
 *                     name:
 *                       firstName: "Hoang"
 *                       lastName: "Quoc"
 *                   staff:
 *                     staffId: "staff-90"
 *                     position: "Bác sĩ trưởng khoa"
 *                     department:
 *                       id: 1
 *                       name: "Ngoại"
 *                   specialization: "Ngoại tổng quát"
 *                   experienceYears: 20
 *                   level: "Giáo sư"
 *                   rating: 4.9
 *                   isAvailable: true
 *               total: 1
 *               page: 1
 *               limit: 10
 *               totalPages: 1
 */
router.get('/top', asyncHandler(doctorController.getTopDoctors));

/**
 * @swagger
 * /api/v1/doctors/stats:
 *   get:
 *     summary: Lấy thống kê bác sĩ
 *     tags: [Doctors]
 *     parameters:
 *       - in: query
 *         name: groupBySpecialization
 *         schema:
 *           type: boolean
 *         description: Nhóm theo chuyên khoa
 *       - in: query
 *         name: groupByLevel
 *         schema:
 *           type: boolean
 *         description: Nhóm theo cấp độ
 *       - in: query
 *         name: groupByDepartment
 *         schema:
 *           type: boolean
 *         description: Nhóm theo khoa
 *     responses:
 *       200:
 *         description: Lấy thống kê bác sĩ thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 specializationStats:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       specialization: { type: string }
 *                       count: { type: integer }
 *                       percentage: { type: integer }
 *                 levelStats:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       level: { type: string }
 *                       count: { type: integer }
 *                       percentage: { type: integer }
 *                 departmentStats:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       department: { type: string }
 *                       count: { type: integer }
 *                       percentage: { type: integer }
 *             example:
 *               specializationStats:
 *                 - specialization: "Tim mạch"
 *                   count: 10
 *                   percentage: 25
 *               levelStats:
 *                 - level: "Thạc sĩ"
 *                   count: 15
 *                   percentage: 37
 *               departmentStats:
 *                 - department: "Tim mạch"
 *                   count: 10
 *                   percentage: 25
 */
router.get('/stats', asyncHandler(doctorController.getDoctorStats));

/**
 * @swagger
 * /api/v1/doctors/specialization/{specialization}:
 *   get:
 *     summary: Lấy danh sách bác sĩ theo chuyên khoa
 *     tags: [Doctors]
 *     parameters:
 *       - in: path
 *         name: specialization
 *         required: true
 *         schema:
 *           type: string
 *         description: Tên chuyên khoa
 *     responses:
 *       200:
 *         description: Lấy danh sách bác sĩ theo chuyên khoa thành công
 *         content:
 *           application/json:
 *             schema:
 *             example:
 *               doctors:
 *                 - id: "user-345"
 *                   user:
 *                     id: "user-345"
 *                     username: "dr.pham"
 *                     email: "dr.pham@example.com"
 *                     avatar: null
 *                     phone: "+84903334455"
 *                     name:
 *                       firstName: "Pham"
 *                       lastName: "Dung"
 *                   staff:
 *                     staffId: "staff-22"
 *                     position: "Bác sĩ"
 *                     department:
 *                       id: 4
 *                       name: "Sản"
 *                   specialization: "Sản khoa"
 *                   experienceYears: 6
 *                   level: "Chuyên khoa I"
 *                   rating: 4.2
 *                   isAvailable: true
 *               total: 1
 *               page: 1
 *               limit: 10
 *               totalPages: 1
 *       404:
 *         description: Không tìm thấy bác sĩ thuộc chuyên khoa này
 */
router.get(
    '/specialization/:specialization',
    asyncHandler(doctorController.getDoctorsBySpecialization)
);

/**
 * @swagger
 * /api/v1/doctors/department/{departmentId}:
 *   get:
 *     summary: Lấy danh sách bác sĩ theo khoa
 *     tags: [Doctors]
 *     parameters:
 *       - in: path
 *         name: departmentId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID của khoa
 *     responses:
 *       200:
 *         description: Lấy danh sách bác sĩ theo khoa thành công
 *         content:
 *           application/json:
 *             schema:
 *             example:
 *               doctors:
 *                 - id: "user-456"
 *                   user:
 *                     id: "user-456"
 *                     username: "dr.tran"
 *                     email: "dr.tran@example.com"
 *                     avatar: null
 *                     phone: "+84904445566"
 *                     name:
 *                       firstName: "Tran"
 *                       lastName: "Binh"
 *                   staff:
 *                     staffId: "staff-33"
 *                     position: "Bác sĩ"
 *                     department:
 *                       id: 5
 *                       name: "Da liễu"
 *                   specialization: "Da liễu"
 *                   experienceYears: 9
 *                   level: "Thạc sĩ"
 *                   rating: 4.5
 *                   isAvailable: false
 *               total: 1
 *               page: 1
 *               limit: 10
 *               totalPages: 1
 *       404:
 *         description: Không tìm thấy bác sĩ thuộc khoa này
 */
router.get(
    '/department/:departmentId',
    asyncHandler(doctorController.getDoctorsByDepartment as any)
);

/**
 * @swagger
 * /api/v1/doctors/{id}:
 *   get:
 *     summary: Lấy thông tin chi tiết bác sĩ theo ID
 *     tags: [Doctors]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của bác sĩ
 *     responses:
 *       200:
 *         description: Lấy thông tin bác sĩ thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id: { type: string }
 *                 user:
 *                   type: object
 *                   properties:
 *                     id: { type: string }
 *                     username: { type: string }
 *                     email: { type: string }
 *                     phone: { type: string, nullable: true }
 *                     name:
 *                       type: object
 *                       properties:
 *                         firstName: { type: string }
 *                         lastName: { type: string }
 *                 staff:
 *                   type: object
 *                   properties:
 *                     staffId: { type: string, nullable: true }
 *                     department:
 *                       type: object
 *                       properties:
 *                         id: { type: integer }
 *                         name: { type: string }
 *                 specialization: { type: string, nullable: true }
 *                 licenseNumber: { type: string, nullable: true }
 *                 experienceYears: { type: integer }
 *                 level: { type: string, nullable: true }
 *                 rating: { type: number }
 *                 isAvailable: { type: boolean }
 *             example:
 *               id: "user-123"
 *               user:
 *                 id: "user-123"
 *                 username: "dr.nguyen"
 *                 email: "dr.nguyen@example.com"
 *                 phone: "+84901234567"
 *                 name:
 *                   firstName: "Nguyen"
 *                   lastName: "An"
 *               staff:
 *                 staffId: "staff-45"
 *                 department:
 *                   id: 2
 *                   name: "Tim mạch"
 *               specialization: "Tim mạch can thiệp"
 *               licenseNumber: "MD-987654"
 *               experienceYears: 12
 *               level: "Thạc sĩ"
 *               rating: 4.6
 *               isAvailable: true
 *       404:
 *         description: Không tìm thấy bác sĩ
 */
router.get('/:id', asyncHandler(doctorController.getDoctorById));

export default router;
