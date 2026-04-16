import { Router } from 'express';
import statisticsController from '@src/controllers/statistics.controller';
import { validateDto } from '@src/middleware/validatation.middleware';
import {
    getAdminStatisticsDto,
    getAppointmentsByDayOfWeekDto,
    getAppointmentsByDoctorDto,
    getDashboardSummaryDto,
    getPatientsByDepartmentDto,
    getPatientStatisticsDto,
    getRevenueByDayOfWeekDto,
    getStaffByDepartmentDto,
    getDoctorDashboardSummaryDto,
    getDoctorAppointmentsByDayDto,
    getDoctorAppointmentStatusDto,
} from '@src/dtos/statistics.dto';
import { getVisitStatusDto, getVisitsByYearDto } from '@src/dtos/visit.dto';
import asyncHandler from '@src/helpers/asyncHandler';
import { authenticateToken, checkRole } from '@src/middleware/auth.middleware';

const router = Router();

/**
 * @swagger
 * /api/v1/statistics/patient:
 *   get:
 *     summary: Get patient statistics
 *     description: Retrieve statistics for the currently logged in patient (total completed appointments and upcoming appointments count)
 *     tags:
 *       - Statistics
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Patient statistics retrieved successfully
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
 *                   example: Patient statistics retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalCompletedAppointments:
 *                       type: integer
 *                       example: 15
 *                       description: Tổng số lần đã khám
 *                     totalUpcomingAppointments:
 *                       type: integer
 *                       example: 3
 *                       description: Số lần hẹn tiếp theo
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Only patients can access
 *       404:
 *         description: Patient profile not found
 *       500:
 *         description: Internal server error
 */
router.get(
    '/patient',
    validateDto(getPatientStatisticsDto, 'query'),
    asyncHandler(statisticsController.getPatientStatistics)
);

/**
 * @swagger
 * /api/v1/statistics/admin:
 *   get:
 *     summary: Get admin statistics
 *     description: Retrieve statistics for admin (new patient registrations and patient visits by week/month)
 *     tags:
 *       - Statistics
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [week, month]
 *           default: month
 *         description: Period grouping for patient visits statistics (week or month)
 *       - in: query
 *         name: fromDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for filtering (ISO format)
 *       - in: query
 *         name: toDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for filtering (ISO format)
 *     responses:
 *       200:
 *         description: Admin statistics retrieved successfully
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
 *                   example: Admin statistics retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     newPatientsCount:
 *                       type: integer
 *                       example: 50
 *                       description: Số bệnh nhân mới đăng ký
 *                     patientVisits:
 *                       type: object
 *                       properties:
 *                         period:
 *                           type: string
 *                           example: month
 *                           description: Loại nhóm (week hoặc month)
 *                         data:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               period:
 *                                 type: string
 *                                 example: "2024-01"
 *                                 description: Kỳ (tuần hoặc tháng)
 *                               count:
 *                                 type: integer
 *                                 example: 25
 *                                 description: Số bệnh nhân unique tới khám
 *                               patients:
 *                                 type: array
 *                                 items:
 *                                   type: string
 *                                 description: Danh sách patient IDs
 *                         total:
 *                           type: integer
 *                           example: 150
 *                           description: Tổng số bệnh nhân tới khám (có thể trùng)
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Only admin can access
 *       500:
 *         description: Internal server error
 */
router.get(
    '/admin',
    authenticateToken(),
    checkRole(['admin']),
    validateDto(getAdminStatisticsDto, 'query'),
    asyncHandler(statisticsController.getAdminStatistics)
);

/**
 * @swagger
 * /api/v1/statistics/admin/department:
 *   get:
 *     summary: Get patient statistics by department
 *     description: Retrieve statistics of unique patients grouped by department
 *     tags:
 *       - Statistics
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: fromDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for filtering (ISO format)
 *       - in: query
 *         name: toDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for filtering (ISO format)
 *     responses:
 *       200:
 *         description: Patient statistics by department retrieved successfully
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
 *                   example: Patient statistics by department retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           departmentId:
 *                             type: integer
 *                             example: 1
 *                           departmentName:
 *                             type: string
 *                             example: "Cardiology"
 *                           patientCount:
 *                             type: integer
 *                             example: 45
 *                     total:
 *                       type: integer
 *                       example: 120
 *                       description: Tổng số bệnh nhân duy nhất trong tất cả các khoa
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Only admin can access
 *       500:
 *         description: Internal server error
 */
router.get(
    '/admin/department',
    authenticateToken(),
    checkRole(['admin']),
    validateDto(getPatientsByDepartmentDto, 'query'),
    asyncHandler(statisticsController.getPatientsByDepartment)
);

/**
 * @swagger
 * /api/v1/statistics/admin/doctor:
 *   get:
 *     summary: Get appointments statistics by doctor
 *     description: Retrieve statistics of completed appointments grouped by doctor
 *     tags:
 *       - Statistics
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: fromDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for filtering (ISO format)
 *       - in: query
 *         name: toDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for filtering (ISO format)
 *       - in: query
 *         name: specialization
 *         schema:
 *           type: string
 *         description: Filter by specialization (optional)
 *     responses:
 *       200:
 *         description: Appointments by doctor statistics retrieved successfully
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
 *                   example: Appointments by doctor statistics retrieved successfully
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
 *                             example: "uuid"
 *                             description: ID của bác sĩ
 *                           count:
 *                             type: integer
 *                             example: 30
 *                             description: Số lượt khám
 *                           doctor:
 *                             type: object
 *                             properties:
 *                               specialization:
 *                                 type: string
 *                                 example: "Cardiology"
 *                               experienceYears:
 *                                 type: integer
 *                                 example: 10
 *                               level:
 *                                 type: string
 *                                 example: "Senior"
 *                               user:
 *                                 type: object
 *                                 properties:
 *                                   id:
 *                                     type: string
 *                                   username:
 *                                     type: string
 *                                   email:
 *                                     type: string
 *                                   avatar:
 *                                     type: string
 *                                   name:
 *                                     type: object
 *                                     properties:
 *                                       firstName:
 *                                         type: string
 *                                       lastName:
 *                                         type: string
 *                               department:
 *                                 type: object
 *                                 properties:
 *                                   id:
 *                                     type: integer
 *                                   name:
 *                                     type: string
 *                                   code:
 *                                     type: string
 *                     total:
 *                       type: integer
 *                       example: 200
 *                       description: Tổng số lượt khám
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Only admin can access
 *       500:
 *         description: Internal server error
 */
router.get(
    '/admin/doctor',
    authenticateToken(),
    checkRole(['admin']),
    validateDto(getAppointmentsByDoctorDto, 'query'),
    asyncHandler(statisticsController.getAppointmentsByDoctor)
);

/**
 * @swagger
 * /api/v1/statistics/patient/visits/status:
 *   get:
 *     summary: Get patient's visit counts by status
 *     description: Retrieve total number of visits and counts grouped by Visit.status for the authenticated patient (date range optional)
 *     tags:
 *       - Statistics
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: header
 *         name: timezone
 *         schema:
 *           type: string
 *         required: false
 *         description: IANA timezone (e.g., Asia/Ho_Chi_Minh). If omitted, server default is used.
 *       - in: query
 *         name: patientId
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: fromDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for filtering (ISO format)
 *       - in: query
 *         name: toDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for filtering (ISO format)
 *     responses:
 *       200:
 *         description: Visit counts by status retrieved successfully
 */
router.get(
    '/patient/visits/status',
    authenticateToken(),
    validateDto(getVisitStatusDto, 'query'),
    asyncHandler(statisticsController.getVisitCountsByStatus)
);

/**
 * @swagger
 * /api/v1/statistics/patient/visits/monthly:
 *   get:
 *     summary: Get patient's monthly visit counts for a year
 *     description: Retrieve number of visits grouped by month for the provided year for the authenticated patient. Returns all months with zero counts included.
 *     tags:
 *       - Statistics
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: header
 *         name: timezone
 *         schema:
 *           type: string
 *         required: false
 *         description: IANA timezone (e.g., Asia/Ho_Chi_Minh). If omitted, server default is used.
 *       - in: query
 *         name: year
 *         schema:
 *           type: string
 *           pattern: '^\\d{4}$'
 *         required: true
 *         description: Year to retrieve statistics for (YYYY)
 *       - in: query
 *         name: patientId
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Monthly visit counts retrieved successfully
 */
router.get(
    '/patient/visits/monthly',
    authenticateToken(),
    validateDto(getVisitsByYearDto, 'query'),
    asyncHandler(statisticsController.getVisitCountsByYear)
);

// ADMIN DASHBOARD ROUTES
/**
 * @swagger
 * /api/v1/statistics/admin/dashboard/summary:
 *   get:
 *     summary: Get dashboard summary statistics (4 cards)
 *     description: Retrieve summary statistics for admin dashboard including patients today, new accounts, total departments, and total doctors
 *     tags:
 *       - Statistics
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *         description: Target date for statistics (YYYY-MM-DD format, defaults to today)
 *     responses:
 *       200:
 *         description: Dashboard summary retrieved successfully
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
 *                   example: Dashboard summary retrieved successfully
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 1
 *                       title:
 *                         type: string
 *                         example: "Số bệnh nhân tới khám trong ngày"
 *                       value:
 *                         type: integer
 *                         example: 124
 *                       change:
 *                         type: string
 *                         example: "+12%"
 *                       trend:
 *                         type: string
 *                         enum: [up, down, neutral]
 *                         example: "up"
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Only admin can access
 *       500:
 *         description: Internal server error
 */
router.get(
    '/admin/dashboard/summary',
    authenticateToken(),
    checkRole(['admin']),
    validateDto(getDashboardSummaryDto, 'query'),
    asyncHandler(statisticsController.getDashboardSummary)
);
/**
 * @swagger
 * /api/v1/statistics/admin/dashboard/staff-by-department:
 *   get:
 *     summary: Get staff count by department (bar chart data)
 *     description: Retrieve staff statistics grouped by department for bar chart visualization
 *     tags:
 *       - Statistics
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Staff by department retrieved successfully
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
 *                   example: Staff by department retrieved successfully
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       department:
 *                         type: string
 *                         example: "Nội"
 *                       count:
 *                         type: integer
 *                         example: 12
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Only admin can access
 *       500:
 *         description: Internal server error
 */
router.get(
    '/admin/dashboard/staff-by-department',
    authenticateToken(),
    checkRole(['admin']),
    validateDto(getStaffByDepartmentDto, 'query'),
    asyncHandler(statisticsController.getStaffByDepartment)
);
/**
 * @swagger
 * /api/v1/statistics/admin/dashboard/revenue-by-day:
 *   get:
 *     summary: Get revenue by day of week (line chart data)
 *     description: Retrieve revenue statistics grouped by day of week for line chart visualization
 *     tags:
 *       - Statistics
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: weekStart
 *         schema:
 *           type: string
 *           format: date
 *         description: Start of the week (Monday) in YYYY-MM-DD format, defaults to current week
 *     responses:
 *       200:
 *         description: Revenue by day of week retrieved successfully
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
 *                   example: Revenue by day of week retrieved successfully
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       day:
 *                         type: string
 *                         example: "Thứ 2"
 *                       value:
 *                         type: number
 *                         example: 15000000
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Only admin can access
 *       500:
 *         description: Internal server error
 */
router.get(
    '/admin/dashboard/revenue-by-day',
    authenticateToken(),
    checkRole(['admin']),
    validateDto(getRevenueByDayOfWeekDto, 'query'),
    asyncHandler(statisticsController.getRevenueByDayOfWeek)
);
/**
 * @swagger
 * /api/v1/statistics/admin/dashboard/appointments-by-day:
 *   get:
 *     summary: Get appointments by day of week (line chart data)
 *     description: Retrieve appointment statistics grouped by day of week for line chart visualization
 *     tags:
 *       - Statistics
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: weekStart
 *         schema:
 *           type: string
 *           format: date
 *         description: Start of the week (Monday) in YYYY-MM-DD format, defaults to current week
 *     responses:
 *       200:
 *         description: Appointments by day of week retrieved successfully
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
 *                   example: Appointments by day of week retrieved successfully
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       day:
 *                         type: string
 *                         example: "Thứ 2"
 *                       value:
 *                         type: integer
 *                         example: 45
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Only admin can access
 *       500:
 *         description: Internal server error
 */
router.get(
    '/admin/dashboard/appointments-by-day',
    authenticateToken(),
    checkRole(['admin']),
    validateDto(getAppointmentsByDayOfWeekDto, 'query'),
    asyncHandler(statisticsController.getAppointmentsByDayOfWeek)
);

// DOCTOR DASHBOARD ROUTES
/**
 * @swagger
 * /api/v1/statistics/doctor/dashboard/summary:
 *   get:
 *     summary: Get doctor dashboard summary statistics
 *     description: Retrieve summary statistics for doctor dashboard including completed, pending, and weekly appointments
 *     tags:
 *       - Statistics
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Doctor dashboard summary retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     completedAppointments:
 *                       type: integer
 *                       example: 48
 *                       description: Ca khám đã hoàn thành
 *                     pendingAppointments:
 *                       type: integer
 *                       example: 12
 *                       description: Ca khám chưa hoàn thành
 *                     weeklyAppointments:
 *                       type: integer
 *                       example: 86
 *                       description: Số lịch khám tuần này
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Only doctor can access
 *       500:
 *         description: Internal server error
 */
router.get(
    '/doctor/dashboard/summary',
    authenticateToken(),
    checkRole(['doctor']),
    validateDto(getDoctorDashboardSummaryDto, 'query'),
    asyncHandler(statisticsController.getDoctorDashboardSummary)
);

/**
 * @swagger
 * /api/v1/statistics/doctor/dashboard/appointments-by-day:
 *   get:
 *     summary: Get doctor appointments by day of week
 *     description: Retrieve appointment statistics grouped by day of week for line chart visualization
 *     tags:
 *       - Statistics
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Doctor appointments by day retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     labels:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "CN"]
 *                     values:
 *                       type: array
 *                       items:
 *                         type: integer
 *                       example: [12, 18, 15, 25, 22, 30, 10]
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Only doctor can access
 *       500:
 *         description: Internal server error
 */
router.get(
    '/doctor/dashboard/appointments-by-day',
    authenticateToken(),
    checkRole(['doctor']),
    validateDto(getDoctorAppointmentsByDayDto, 'query'),
    asyncHandler(statisticsController.getDoctorAppointmentsByDay)
);

/**
 * @swagger
 * /api/v1/statistics/doctor/dashboard/appointment-status:
 *   get:
 *     summary: Get doctor appointment status distribution
 *     description: Retrieve appointment status distribution for pie chart visualization
 *     tags:
 *       - Statistics
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Doctor appointment status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       name:
 *                         type: string
 *                         example: "Hoàn thành"
 *                       value:
 *                         type: integer
 *                         example: 45
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Only doctor can access
 *       500:
 *         description: Internal server error
 */
router.get(
    '/doctor/dashboard/appointment-status',
    authenticateToken(),
    checkRole(['doctor']),
    validateDto(getDoctorAppointmentStatusDto, 'query'),
    asyncHandler(statisticsController.getDoctorAppointmentStatus)
);

export default router;
