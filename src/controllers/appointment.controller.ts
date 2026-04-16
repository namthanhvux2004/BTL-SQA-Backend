import { Request, Response } from 'express';
import appointmentService from '@src/services/appointment.service';
import { SuccessResponse } from '@src/core/ApiResponse';
import asyncHandler from '@src/helpers/asyncHandler';
import { CustomError, ErrorType } from '@src/core/Error';

/**
 * Lấy danh sách slots khả dụng
 */
export const getAvailableSlots = asyncHandler(
    async (req: Request, res: Response) => {
        const timezone = req.timezone!;
        const result = await appointmentService.getAvailableSlots(
            req.query,
            timezone
        );
        return new SuccessResponse(
            result,
            'Lấy danh sách slots khả dụng thành công'
        ).send(res);
    }
);

/**
 * Lấy danh sách appointments
 */
export const getAppointments = asyncHandler(
    async (req: Request, res: Response) => {
        const result = await appointmentService.getAppointments(req.query);
        return new SuccessResponse(
            result.appointments,
            'Lấy danh sách appointments thành công',
            result.pagination
        ).send(res);
    }
);

/**
 * Lấy chi tiết một appointment
 */
export const getAppointmentById = asyncHandler(
    async (req: Request, res: Response) => {
        const { id } = req.params;
        if (!id) {
            throw new CustomError(ErrorType.BAD_REQUEST, 'ID không hợp lệ');
        }
        const result = await appointmentService.getAppointmentById(id);
        return new SuccessResponse(
            result,
            'Lấy chi tiết appointment thành công'
        ).send(res);
    }
);

/**
 * Tạo appointment mới
 */
export const createAppointment = asyncHandler(
    async (req: Request, res: Response) => {
        const userId = req.user?.id; // Lấy từ middleware auth
        if (!userId) {
            throw new CustomError(ErrorType.UNAUTHORIZED, 'Bạn chưa đăng nhập');
        }
        const result = await appointmentService.createAppointment(
            req.body,
            userId
        );
        return new SuccessResponse(result, 'Tạo appointment thành công').send(
            res
        );
    }
);

/**
 * Cập nhật appointment
 */
export const updateAppointment = asyncHandler(
    async (req: Request, res: Response) => {
        const { id } = req.params;
        if (!id) {
            throw new CustomError(ErrorType.BAD_REQUEST, 'ID không hợp lệ');
        }
        const userRole = req.user?.role;
        const result = await appointmentService.updateAppointment(
            id,
            req.body,
            userRole
        );
        return new SuccessResponse(
            result,
            'Cập nhật appointment thành công'
        ).send(res);
    }
);

/**
 * Hủy appointment
 */
export const cancelAppointment = asyncHandler(
    async (req: Request, res: Response) => {
        const { id } = req.params;
        if (!id) {
            throw new CustomError(ErrorType.BAD_REQUEST, 'ID không hợp lệ');
        }
        const userRole = req.user?.role;
        const result = await appointmentService.cancelAppointment(
            id,
            req.body,
            userRole
        );
        return new SuccessResponse(result, 'Hủy appointment thành công').send(
            res
        );
    }
);

/**
 * Từ chối appointment (chỉ doctor/admin)
 */
export const rejectAppointment = asyncHandler(
    async (req: Request, res: Response) => {
        const { id } = req.params;
        if (!id) {
            throw new CustomError(ErrorType.BAD_REQUEST, 'ID không hợp lệ');
        }
        const userRole = req.user?.role;
        const result = await appointmentService.rejectAppointment(
            id,
            req.body,
            userRole
        );
        return new SuccessResponse(
            result,
            'Từ chối appointment thành công'
        ).send(res);
    }
);

/**
 * Duyệt appointment (chỉ doctor/admin)
 */
export const approveAppointment = asyncHandler(
    async (req: Request, res: Response) => {
        const { id } = req.params;
        if (!id) {
            throw new CustomError(ErrorType.BAD_REQUEST, 'ID không hợp lệ');
        }
        const userRole = req.user?.role;
        const result = await appointmentService.approveAppointment(
            id,
            req.body,
            userRole
        );
        return new SuccessResponse(result, 'Duyệt appointment thành công').send(
            res
        );
    }
);

export default {
    getAvailableSlots,
    getAppointments,
    getAppointmentById,
    createAppointment,
    updateAppointment,
    cancelAppointment,
    rejectAppointment,
    approveAppointment,
};
