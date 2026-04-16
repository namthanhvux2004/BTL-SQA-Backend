// src/routes/appointment.routes.ts
import { Router } from 'express';
import appointmentController from '@src/controllers/appointment.controller';
import {
    checkAppointmentOwnership,
    checkCreateAppointmentPermission,
    checkUpdateAppointmentPermission,
    checkCancelAppointmentPermission,
    checkRejectAppointmentPermission,
    checkApproveAppointmentPermission,
} from '@src/middleware/appointment-authorization.middleware';

const router = Router();

/**
 * @swagger
 * /api/v1/appointments/available-slots:
 *   get:
 *     summary: Lấy danh sách slots khả dụng cho một bác sĩ trong ngày
 *     tags: [Appointments]
 *     parameters:
 *       - in: query
 *         name: doctorId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID của bác sĩ
 *       - in: query
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Ngày cần kiểm tra (YYYY-MM-DD)
 *       - in: query
 *         name: departmentId
 *         schema:
 *           type: integer
 *         description: ID khoa (tùy chọn)
 *       - in: query
 *         name: slotDuration
 *         schema:
 *           type: integer
 *           minimum: 15
 *           maximum: 120
 *         description: Thời lượng mỗi slot (phút), mặc định 30
 *     responses:
 *       200:
 *         description: Danh sách slots khả dụng
 *       400:
 *         description: Tham số không hợp lệ
 *       404:
 *         description: Không tìm thấy bác sĩ
 */
router.get('/available-slots', appointmentController.getAvailableSlots);

/**
 * @swagger
 * /api/v1/appointments:
 *   get:
 *     summary: Lấy danh sách appointments với phân trang và lọc
 *     tags: [Appointments]
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
 *         description: Số lượng mỗi trang (mặc định 10)
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, confirmed, cancelled, completed]
 *         description: Lọc theo trạng thái
 *       - in: query
 *         name: doctorId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Lọc theo ID bác sĩ
 *       - in: query
 *         name: patientId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Lọc theo ID bệnh nhân
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
 *           enum: [startTime, createdAt, status]
 *         description: Sắp xếp theo trường
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *         description: Thứ tự sắp xếp
 *     responses:
 *       200:
 *         description: Danh sách appointments
 *       400:
 *         description: Tham số không hợp lệ
 */
router.get('/', appointmentController.getAppointments);

/**
 * @swagger
 * /api/v1/appointments/{id}:
 *   get:
 *     summary: Lấy chi tiết một appointment
 *     tags: [Appointments]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID của appointment
 *     responses:
 *       200:
 *         description: Chi tiết appointment
 *       404:
 *         description: Không tìm thấy appointment
 */
router.get(
    '/:id',
    checkAppointmentOwnership,
    appointmentController.getAppointmentById
);

/**
 * @swagger
 * /api/v1/appointments:
 *   post:
 *     summary: Tạo appointment mới
 *     tags: [Appointments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - doctorId
 *               - startTime
 *               - reason
 *             properties:
 *               doctorId:
 *                 type: string
 *                 format: uuid
 *               patientId:
 *                 type: string
 *                 format: uuid
 *                 description: Tùy chọn, nếu không có sẽ lấy từ user hiện tại
 *               scheduleId:
 *                 type: string
 *                 format: uuid
 *               type:
 *                 type: string
 *                 enum: [new, followUp, checkUp, consultation, telehealth]
 *               startTime:
 *                 type: string
 *                 format: date-time
 *               endTime:
 *                 type: string
 *                 format: date-time
 *               reason:
 *                 type: string
 *                 minLength: 10
 *                 maxLength: 500
 *               notes:
 *                 type: string
 *                 maxLength: 1000
 *     responses:
 *       200:
 *         description: Tạo appointment thành công
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       401:
 *         description: Chưa đăng nhập
 */
router.post(
    '/',
    checkCreateAppointmentPermission,
    appointmentController.createAppointment
);

/**
 * @swagger
 * /api/v1/appointments/{id}:
 *   put:
 *     summary: Cập nhật appointment
 *     tags: [Appointments]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               startTime:
 *                 type: string
 *                 format: date-time
 *               endTime:
 *                 type: string
 *                 format: date-time
 *               reason:
 *                 type: string
 *                 minLength: 10
 *                 maxLength: 500
 *               notes:
 *                 type: string
 *                 maxLength: 1000
 *               status:
 *                 type: string
 *                 enum: [pending, confirmed, cancelled, completed]
 *     responses:
 *       200:
 *         description: Cập nhật appointment thành công
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       404:
 *         description: Không tìm thấy appointment
 */
router.put(
    '/:id',
    checkUpdateAppointmentPermission,
    appointmentController.updateAppointment
);

/**
 * @swagger
 * /api/v1/appointments/{id}/cancel:
 *   patch:
 *     summary: Hủy appointment
 *     tags: [Appointments]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 minLength: 10
 *                 maxLength: 500
 *     responses:
 *       200:
 *         description: Hủy appointment thành công
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       404:
 *         description: Không tìm thấy appointment
 */
router.patch(
    '/:id/cancel',
    checkCancelAppointmentPermission,
    appointmentController.cancelAppointment
);

/**
 * @swagger
 * /api/v1/appointments/{id}/reject:
 *   patch:
 *     summary: Từ chối appointment (chỉ doctor/admin)
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID của appointment cần từ chối
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reasonCancel
 *             properties:
 *               reasonCancel:
 *                 type: string
 *                 minLength: 10
 *                 maxLength: 500
 *                 description: Lý do từ chối lịch hẹn (bắt buộc)
 *                 example: "Bác sĩ có lịch đột xuất trong thời gian này"
 *     responses:
 *       200:
 *         description: Từ chối appointment thành công
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
 *                   example: "Từ chối appointment thành công"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     status:
 *                       type: string
 *                       example: "cancelled"
 *                     reasonCancel:
 *                       type: string
 *                       example: "Bác sĩ có lịch đột xuất trong thời gian này"
 *       400:
 *         description: Dữ liệu không hợp lệ hoặc appointment không ở trạng thái pending
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
 *                   example: "Chỉ có thể từ chối appointment đang ở trạng thái pending"
 *       403:
 *         description: Không có quyền thực hiện thao tác này
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
 *                   example: "Chỉ bác sĩ hoặc admin mới có quyền từ chối lịch hẹn"
 *       404:
 *         description: Không tìm thấy appointment
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
 *                   example: "Không tìm thấy appointment với ID \"xxx\""
 */
router.patch(
    '/:id/reject',
    checkRejectAppointmentPermission,
    appointmentController.rejectAppointment
);

/**
 * @swagger
 * /api/v1/appointments/{id}/approve:
 *   patch:
 *     summary: Duyệt appointment (chỉ doctor/admin)
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID của appointment cần duyệt
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               notes:
 *                 type: string
 *                 maxLength: 1000
 *                 description: Ghi chú khi duyệt lịch hẹn (tùy chọn)
 *                 example: "Lịch hẹn đã được xác nhận, vui lòng đến đúng giờ"
 *     responses:
 *       200:
 *         description: Duyệt appointment thành công
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
 *                   example: "Duyệt appointment thành công"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     status:
 *                       type: string
 *                       example: "confirmed"
 *                     notes:
 *                       type: string
 *                       example: "Lịch hẹn đã được xác nhận, vui lòng đến đúng giờ"
 *       400:
 *         description: Dữ liệu không hợp lệ hoặc appointment không ở trạng thái pending
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
 *                   example: "Chỉ có thể duyệt appointment đang ở trạng thái pending"
 *       403:
 *         description: Không có quyền thực hiện thao tác này
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
 *                   example: "Chỉ bác sĩ hoặc admin mới có quyền duyệt lịch hẹn"
 *       404:
 *         description: Không tìm thấy appointment
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
 *                   example: "Không tìm thấy appointment với ID \"xxx\""
 */
router.patch(
    '/:id/approve',
    checkApproveAppointmentPermission,
    appointmentController.approveAppointment
);

export default router;
