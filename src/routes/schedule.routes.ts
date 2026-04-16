import asyncHandler from '@src/helpers/asyncHandler';
import { validateDto } from '@src/middleware/validatation.middleware';
import { authenticateToken, checkRole } from '@src/middleware/auth.middleware';
import { Router } from 'express';
import scheduleController from '@src/controllers/schedule.controller';
import {
    GetListSchedulesQueryDto,
    CreateScheduleSchema,
    UpdateScheduleSchema,
} from '@src/dtos/schedule.dto';
const router = Router();

/**
 * @swagger
 * /api/v1/schedules/create:
 *   post:
 *     summary: Create a new schedule
 *     tags:
 *       - Schedules
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               staffId:
 *                 type: string
 *               departmentId:
 *                 type: integer
 *               type:
 *                 type: string
 *                 enum: [appointment, work, surgery, duty, admin, off]
 *               roomId:
 *                 type: string
 *               date:
 *                 type: string
 *                 format: date
 *               status:
 *                 type: string
 *                 enum: [pending, confirmed, cancelled, completed]
 *               maxSlot:
 *                 type: integer
 *               startTime:
 *                 type: string
 *                 format: date-time
 *               endTime:
 *                 type: string
 *                 format: date-time
 *           example:
 *             staffId: "465f1fee-3c1d-4be2-b3fa-54a31d02a356"
 *             departmentId: 1
 *             type: "appointment"
 *             roomId: "eaefb43a-28f7-4241-b4da-ec40f5ab1f05"
 *             date: "2025-11-10"
 *             status: "confirmed"
 *             maxSlot: 10
 *             startTime: "2025-11-10T09:00:00.000Z"
 *             endTime: "2025-11-10T12:00:00.000Z"
 *     responses:
 *       '201':
 *         description: Schedule created successfully
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
 *                 data:
 *                   type: object
 *                   properties:
 *                     id: { type: string }
 *                     staffId: { type: string }
 *                     departmentId: { type: integer }
 *                     type: { type: string }
 *                     roomId: { type: string }
 *                     date: { type: string, format: date-time }
 *                     status: { type: string }
 *                     maxSlot: { type: integer }
 *                     startTime: { type: string, format: date-time }
 *                     endTime: { type: string, format: date-time }
 *                     createdAt: { type: string, format: date-time }
 *                     updatedAt: { type: string, format: date-time }
 *               example:
 *                 success: true
 *                 message: "Schedule created successfully"
 *                 code: "10000"
 *                 data:
 *                   id: "40ae85d2-e598-42aa-b565-42040ffef306"
 *                   staffId: "465f1fee-3c1d-4be2-b3fa-54a31d02a356"
 *                   departmentId: 1
 *                   type: "appointment"
 *                   roomId: "eaefb43a-28f7-4241-b4da-ec40f5ab1f05"
 *                   date: "2025-11-10T00:00:00.000Z"
 *                   status: "confirmed"
 *                   maxSlot: 10
 *                   startTime: "1970-01-01T09:00:00.000Z"
 *                   endTime: "1970-01-01T12:00:00.000Z"
 *                   createdAt: "2025-11-01T10:13:51.685Z"
 *                   updatedAt: "2025-11-01T10:13:51.685Z"
 */
router.post(
    '/create',
    authenticateToken(),
    checkRole(['admin', 'doctor']),
    validateDto(CreateScheduleSchema),
    asyncHandler(scheduleController.createSchedule)
);

/**
 * @swagger
 * /api/v1/schedules/update:
 *   put:
 *     summary: Update an existing schedule
 *     tags:
 *       - Schedules
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               id:
 *                 type: string
 *               departmentId:
 *                 type: integer
 *               type:
 *                 type: string
 *                 enum: [appointment, work, surgery, duty, admin, off]
 *               roomId:
 *                 type: string
 *               date:
 *                 type: string
 *                 format: date
 *               status:
 *                 type: string
 *                 enum: [pending, confirmed, cancelled, completed]
 *               maxSlot:
 *                 type: integer
 *               startTime:
 *                 type: string
 *                 format: date-time
 *               endTime:
 *                 type: string
 *                 format: date-time
 *           example:
 *             id: "40ae85d2-e598-42aa-b565-42040ffef306"
 *             departmentId: 2
 *             type: "appointment"
 *             roomId: "eaefb43a-28f7-4241-b4da-ec40f5ab1f05"
 *             date: "2025-11-12"
 *             status: "confirmed"
 *             maxSlot: 12
 *             startTime: "2025-11-12T10:00:00.000Z"
 *             endTime: "2025-11-12T12:00:00.000Z"
 *     responses:
 *       '200':
 *         description: Schedule updated successfully
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
 *                 data:
 *                   type: object
 *                   properties:
 *                     id: { type: string }
 *                     staffId: { type: string }
 *                     departmentId: { type: integer }
 *                     type: { type: string }
 *                     roomId: { type: string }
 *                     date: { type: string, format: date-time }
 *                     status: { type: string }
 *                     maxSlot: { type: integer, nullable: true }
 *                     startTime: { type: string, format: date-time }
 *                     endTime: { type: string, format: date-time }
 *                     createdAt: { type: string, format: date-time }
 *                     updatedAt: { type: string, format: date-time }
 *               example:
 *                 success: true
 *                 message: "Schedule updated successfully"
 *                 code: "10000"
 *                 data:
 *                   id: "40ae85d2-e598-42aa-b565-42040ffef306"
 *                   staffId: "465f1fee-3c1d-4be2-b3fa-54a31d02a356"
 *                   departmentId: 2
 *                   type: "appointment"
 *                   roomId: "eaefb43a-28f7-4241-b4da-ec40f5ab1f05"
 *                   date: "2025-11-12T00:00:00.000Z"
 *                   status: "confirmed"
 *                   maxSlot: 12
 *                   startTime: "1970-01-01T10:00:00.000Z"
 *                   endTime: "1970-01-01T12:00:00.000Z"
 *                   createdAt: "2025-11-01T10:13:51.685Z"
 *                   updatedAt: "2025-11-12T10:00:00.000Z"
 */
router.put(
    '/update',
    authenticateToken(),
    checkRole(['admin', 'doctor']),
    validateDto(UpdateScheduleSchema),
    asyncHandler(scheduleController.updateSchedule)
);

/**
 * @swagger
 * /api/v1/schedules/delete/{id}:
 *   delete:
 *     summary: Delete a schedule by ID
 *     tags:
 *       - Schedules
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The schedule ID
 *     responses:
 *       '200':
 *         description: Schedule deleted successfully
 *       '400':
 *         description: Invalid request
 *       '401':
 *         description: Unauthorized
 *       '403':
 *         description: Forbidden
 *       '404':
 *         description: Schedule not found
 */
router.delete(
    '/delete/:id',
    authenticateToken(),
    checkRole(['admin', 'doctor']),
    asyncHandler(scheduleController.deleteSchedule)
);

/**
 * @swagger
 * /api/v1/schedules/doctor/{id}:
 *   get:
 *     summary: Get a schedule by ID
 *     tags:
 *       - Schedules
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The schedule ID
 *     responses:
 *       '200':
 *         description: Schedule retrieved successfully
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
 *                 data:
 *                   type: object
 *                   properties:
 *                     id: { type: string }
 *                     staffId: { type: string }
 *                     departmentId: { type: integer }
 *                     type: { type: string }
 *                     roomId: { type: string }
 *                     date: { type: string, format: date-time }
 *                     status: { type: string }
 *                     maxSlot: { type: integer, nullable: true }
 *                     startTime: { type: string, format: date-time }
 *                     endTime: { type: string, format: date-time }
 *                     createdAt: { type: string, format: date-time }
 *                     updatedAt: { type: string, format: date-time }
 *               example:
 *                 success: true
 *                 message: "Schedule retrieved successfully"
 *                 code: "10000"
 *                 data:
 *                   id: "584abbc4-8851-4c3b-a3c7-f592d1d9dcfc"
 *                   staffId: "465f1fee-3c1d-4be2-b3fa-54a31d02a356"
 *                   departmentId: 7
 *                   type: "work"
 *                   roomId: "eaefb43a-28f7-4241-b4da-ec40f5ab1f05"
 *                   date: "2025-11-01T08:26:50.120Z"
 *                   status: "completed"
 *                   maxSlot: null
 *                   startTime: "1970-01-01T08:00:00.000Z"
 *                   endTime: "1970-01-01T13:00:00.000Z"
 *                   createdAt: "2025-11-01T08:26:50.120Z"
 *                   updatedAt: "2025-11-01T08:26:50.120Z"
 */
router.get(
    '/doctor/:id',
    authenticateToken(),
    checkRole(['doctor']),
    asyncHandler(scheduleController.getScheduleById)
);

/**
 * @swagger
 * /api/v1/schedules/doctor:
 *   get:
 *     summary: Get list of schedules for authenticated staff
 *     tags:
 *       - Schedules
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *         required: false
 *         description: "Một ngày thuộc tháng cần lấy lịch (ví dụ: 2025-11-01). Nếu không truyền, lấy lịch cho tháng hiện tại."
 *     responses:
 *       '200':
 *         description: Schedules retrieved successfully
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
 *                 metadata:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     totalItems:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *                     hasPrev:
 *                       type: boolean
 *                     hasNext:
 *                       type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id: { type: string }
 *                       staffId: { type: string }
 *                       departmentId: { type: integer }
 *                       type: { type: string }
 *                       roomId: { type: string }
 *                       date: { type: string, format: date-time }
 *                       status: { type: string }
 *                       maxSlot: { type: integer, nullable: true }
 *                       startTime: { type: string, format: date-time }
 *                       endTime: { type: string, format: date-time }
 *                       createdAt: { type: string, format: date-time }
 *                       updatedAt: { type: string, format: date-time }
 *             example:
 *               success: true
 *               message: "Schedules retrieved successfully"
 *               code: "10000"
 *               metadata:
 *                 page: 1
 *                 limit: 3
 *                 totalItems: 3
 *                 totalPages: 1
 *                 hasPrev: false
 *                 hasNext: false
 *               data:
 *                 - id: "584abbc4-8851-4c3b-a3c7-f592d1d9dcfc"
 *                   staffId: "465f1fee-3c1d-4be2-b3fa-54a31d02a356"
 *                   departmentId: 7
 *                   type: "work"
 *                   roomId: "eaefb43a-28f7-4241-b4da-ec40f5ab1f05"
 *                   date: "2025-11-01T08:26:50.120Z"
 *                   status: "completed"
 *                   maxSlot: null
 *                   startTime: "1970-01-01T08:00:00.000Z"
 *                   endTime: "1970-01-01T13:00:00.000Z"
 *                   createdAt: "2025-11-01T08:26:50.120Z"
 *                   updatedAt: "2025-11-01T08:26:50.120Z"
 *                 - id: "8e91560a-7e60-48e3-81cc-5a99c8f7effa"
 *                   staffId: "465f1fee-3c1d-4be2-b3fa-54a31d02a356"
 *                   departmentId: 4
 *                   type: "appointment"
 *                   roomId: "e3b5a1e2-3ba5-4465-bad3-ec77cfad56c9"
 *                   date: "2025-11-05T08:26:50.119Z"
 *                   status: "pending"
 *                   maxSlot: 11
 *                   startTime: "1970-01-01T09:00:00.000Z"
 *                   endTime: "1970-01-01T13:00:00.000Z"
 *                   createdAt: "2025-11-01T08:26:50.119Z"
 *                   updatedAt: "2025-11-01T08:26:50.119Z"
 *                 - id: "40ae85d2-e598-42aa-b565-42040ffef306"
 *                   staffId: "465f1fee-3c1d-4be2-b3fa-54a31d02a356"
 *                   departmentId: 1
 *                   type: "appointment"
 *                   roomId: "eaefb43a-28f7-4241-b4da-ec40f5ab1f05"
 *                   date: "2025-11-10T00:00:00.000Z"
 *                   status: "confirmed"
 *                   maxSlot: 10
 *                   startTime: "1970-01-01T09:00:00.000Z"
 *                   endTime: "1970-01-01T12:00:00.000Z"
 *                   createdAt: "2025-11-01T10:13:51.685Z"
 *                   updatedAt: "2025-11-01T10:13:51.685Z"
 */
router.get(
    '/doctor',
    authenticateToken(),
    checkRole(['doctor']),
    validateDto(GetListSchedulesQueryDto, 'query'),
    asyncHandler(scheduleController.getListSchedules)
);

/**
 * @swagger
 * /api/v1/schedules/approve/{id}:
 *   put:
 *     summary: Approve a schedule (Admin)
 *     tags:
 *       - Schedules
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The schedule ID to approve
 *     responses:
 *       '200':
 *         description: Schedule approved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 message: { type: string }
 *                 code: { type: string }
 *                 data:
 *                   type: object
 *                   properties:
 *                     id: { type: string }
 *                     staffId: { type: string }
 *                     departmentId: { type: integer }
 *                     type: { type: string }
 *                     roomId: { type: string }
 *                     date: { type: string, format: date-time }
 *                     status: { type: string }
 *                     maxSlot: { type: integer, nullable: true }
 *                     startTime: { type: string, format: date-time }
 *                     endTime: { type: string, format: date-time }
 *                     createdAt: { type: string, format: date-time }
 *                     updatedAt: { type: string, format: date-time }
 *             example:
 *               success: true
 *               message: "Duyệt lịch thành công"
 *               code: "10000"
 *               data:
 *                 id: "584abbc4-8851-4c3b-a3c7-f592d1d9dcfc"
 *                 staffId: "465f1fee-3c1d-4be2-b3fa-54a31d02a356"
 *                 departmentId: 7
 *                 type: "work"
 *                 roomId: "eaefb43a-28f7-4241-b4da-ec40f5ab1f05"
 *                 date: "2025-11-01T08:26:50.120Z"
 *                 status: "confirmed"
 *                 maxSlot: null
 *                 startTime: "1970-01-01T08:00:00.000Z"
 *                 endTime: "1970-01-01T13:00:00.000Z"
 *                 createdAt: "2025-11-01T08:26:50.120Z"
 *                 updatedAt: "2025-11-01T08:26:50.120Z"
 */
router.put(
    '/approve/:id',
    authenticateToken(),
    checkRole(['admin']),
    asyncHandler(scheduleController.approveSchedule)
);

/**
 * @swagger
 * /api/v1/schedules/reject/{id}:
 *   put:
 *     summary: Reject (cancel) a schedule (Admin)
 *     tags:
 *       - Schedules
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The schedule ID to reject (cancel)
 *     responses:
 *       '200':
 *         description: Schedule rejected/cancelled successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 message: { type: string }
 *                 code: { type: string }
 *                 data:
 *                   type: object
 *                   properties:
 *                     id: { type: string }
 *                     staffId: { type: string }
 *                     departmentId: { type: integer }
 *                     type: { type: string }
 *                     roomId: { type: string }
 *                     date: { type: string, format: date-time }
 *                     status: { type: string }
 *                     maxSlot: { type: integer, nullable: true }
 *                     startTime: { type: string, format: date-time }
 *                     endTime: { type: string, format: date-time }
 *                     createdAt: { type: string, format: date-time }
 *                     updatedAt: { type: string, format: date-time }
 *             example:
 *               success: true
 *               message: "Hủy duyệt lịch thành công"
 *               code: "10000"
 *               data:
 *                 id: "584abbc4-8851-4c3b-a3c7-f592d1d9dcfc"
 *                 staffId: "465f1fee-3c1d-4be2-b3fa-54a31d02a356"
 *                 departmentId: 7
 *                 type: "work"
 *                 roomId: "eaefb43a-28f7-4241-b4da-ec40f5ab1f05"
 *                 date: "2025-11-01T08:26:50.120Z"
 *                 status: "cancelled"
 *                 maxSlot: null
 *                 startTime: "1970-01-01T08:00:00.000Z"
 *                 endTime: "1970-01-01T13:00:00.000Z"
 *                 createdAt: "2025-11-01T08:26:50.120Z"
 *                 updatedAt: "2025-11-01T08:26:50.120Z"
 */
router.put(
    '/reject/:id',
    authenticateToken(),
    checkRole(['admin']),
    asyncHandler(scheduleController.rejectSchedule)
);
/**
 * @swagger
 * /api/v1/schedules/{id}:
 *   get:
 *     summary: Get a schedule by ID (Admin)
 *     tags:
 *       - Schedules
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The schedule ID
 *     responses:
 *       '200':
 *         description: Schedule retrieved successfully
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
 *                 data:
 *                   type: object
 *                   properties:
 *                     id: { type: string }
 *                     staffId: { type: string }
 *                     departmentId: { type: integer }
 *                     type: { type: string }
 *                     roomId: { type: string }
 *                     date: { type: string, format: date-time }
 *                     status: { type: string }
 *                     maxSlot: { type: integer, nullable: true }
 *                     startTime: { type: string, format: date-time }
 *                     endTime: { type: string, format: date-time }
 *                     createdAt: { type: string, format: date-time }
 *                     updatedAt: { type: string, format: date-time }
 *               example:
 *                 success: true
 *                 message: "Schedule retrieved successfully"
 *                 code: "10000"
 *                 data:
 *                   id: "584abbc4-8851-4c3b-a3c7-f592d1d9dcfc"
 *                   staffId: "465f1fee-3c1d-4be2-b3fa-54a31d02a356"
 *                   departmentId: 7
 *                   type: "work"
 *                   roomId: "eaefb43a-28f7-4241-b4da-ec40f5ab1f05"
 *                   date: "2025-11-01T08:26:50.120Z"
 *                   status: "completed"
 *                   maxSlot: null
 *                   startTime: "1970-01-01T08:00:00.000Z"
 *                   endTime: "1970-01-01T13:00:00.000Z"
 *                   createdAt: "2025-11-01T08:26:50.120Z"
 *                   updatedAt: "2025-11-01T08:26:50.120Z"
 */
router.get(
    '/:id',
    authenticateToken(),
    checkRole(['admin']),
    asyncHandler(scheduleController.getScheduleById)
);

/**
 * @swagger
 * /api/v1/schedules/:
 *   get:
 *     summary: Get list of schedules for authenticated staff (Admin)
 *     tags:
 *       - Schedules
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *         required: false
 *         description: "Một ngày thuộc tháng cần lấy lịch (ví dụ: 2025-11-01). Nếu không truyền, lấy lịch cho tháng hiện tại."
 *       - in: query
 *         name: doctorId
 *         schema:
 *           type: string
 *         required: false
 *         description: "Lọc theo id bác sĩ (staffId) — nếu truyền sẽ trả lịch của bác sĩ đó trong tháng."
 *       - in: query
 *         name: page
 *         schema:
 *           type: string
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: string
 *         description: Number of items per page
 *     responses:
 *       '200':
 *         description: Schedules retrieved successfully
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
 *                 metadata:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     totalItems:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *                     hasPrev:
 *                       type: boolean
 *                     hasNext:
 *                       type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id: { type: string }
 *                       staffId: { type: string }
 *                       departmentId: { type: integer }
 *                       type: { type: string }
 *                       roomId: { type: string }
 *                       date: { type: string, format: date-time }
 *                       status: { type: string }
 *                       maxSlot: { type: integer, nullable: true }
 *                       startTime: { type: string, format: date-time }
 *                       endTime: { type: string, format: date-time }
 *                       createdAt: { type: string, format: date-time }
 *                       updatedAt: { type: string, format: date-time }
 *             example:
 *               success: true
 *               message: "Schedules retrieved successfully"
 *               code: "10000"
 *               metadata:
 *                 page: 1
 *                 limit: 3
 *                 totalItems: 3
 *                 totalPages: 1
 *                 hasPrev: false
 *                 hasNext: false
 *               data:
 *                 - id: "584abbc4-8851-4c3b-a3c7-f592d1d9dcfc"
 *                   staffId: "465f1fee-3c1d-4be2-b3fa-54a31d02a356"
 *                   departmentId: 7
 *                   type: "work"
 *                   roomId: "eaefb43a-28f7-4241-b4da-ec40f5ab1f05"
 *                   date: "2025-11-01T08:26:50.120Z"
 *                   status: "completed"
 *                   maxSlot: null
 *                   startTime: "1970-01-01T08:00:00.000Z"
 *                   endTime: "1970-01-01T13:00:00.000Z"
 *                   createdAt: "2025-11-01T08:26:50.120Z"
 *                   updatedAt: "2025-11-01T08:26:50.120Z"
 *                 - id: "8e91560a-7e60-48e3-81cc-5a99c8f7effa"
 *                   staffId: "465f1fee-3c1d-4be2-b3fa-54a31d02a356"
 *                   departmentId: 4
 *                   type: "appointment"
 *                   roomId: "e3b5a1e2-3ba5-4465-bad3-ec77cfad56c9"
 *                   date: "2025-11-05T08:26:50.119Z"
 *                   status: "pending"
 *                   maxSlot: 11
 *                   startTime: "1970-01-01T09:00:00.000Z"
 *                   endTime: "1970-01-01T13:00:00.000Z"
 *                   createdAt: "2025-11-01T08:26:50.119Z"
 *                   updatedAt: "2025-11-01T08:26:50.119Z"
 *                 - id: "40ae85d2-e598-42aa-b565-42040ffef306"
 *                   staffId: "465f1fee-3c1d-4be2-b3fa-54a31d02a356"
 *                   departmentId: 1
 *                   type: "appointment"
 *                   roomId: "eaefb43a-28f7-4241-b4da-ec40f5ab1f05"
 *                   date: "2025-11-10T00:00:00.000Z"
 *                   status: "confirmed"
 *                   maxSlot: 10
 *                   startTime: "1970-01-01T09:00:00.000Z"
 *                   endTime: "1970-01-01T12:00:00.000Z"
 *                   createdAt: "2025-11-01T10:13:51.685Z"
 *                   updatedAt: "2025-11-01T10:13:51.685Z"
 */
router.get(
    '/',
    authenticateToken(),
    checkRole(['admin']),
    validateDto(GetListSchedulesQueryDto, 'query'),
    asyncHandler(scheduleController.getListSchedulesAdmin)
);

export default router;
