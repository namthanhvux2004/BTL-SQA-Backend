import { Request, Response, NextFunction } from 'express';
import { ForbiddenResponse } from '@src/core/ApiResponse';
import appointmentDao from '@src/daos/appointment.dao';

/**
 * Helper: Check if user is staff/admin
 */
function isAdmin(userRole?: string): boolean {
    return userRole === 'admin';
}

/**
 * Middleware kiểm tra quyền theo role
 * @param allowedRoles - Mảng các role được phép truy cập
 */
export const checkRole = (allowedRoles: string[]) => {
    return (req: Request, res: Response, next: NextFunction): void => {
        const userRole = req.user?.role;

        if (!userRole) {
            new ForbiddenResponse('Không xác định được role người dùng').send(
                res
            );
            return;
        }

        if (!allowedRoles.includes(userRole)) {
            new ForbiddenResponse(
                `Chỉ ${allowedRoles.join(', ')} mới có quyền thực hiện thao tác này`
            ).send(res);
            return;
        }

        next();
    };
};

/**
 * Middleware kiểm tra quyền sở hữu appointment
 * Staff có quyền truy cập tất cả appointments
 * Patient chỉ có quyền truy cập appointment của mình
 * Doctor có quyền truy cập appointment của mình (là bác sĩ phụ trách)
 */
export const checkAppointmentOwnership = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const appointmentId = req.params.id;
        const userId = req.user?.id;
        const userRole = req.user?.role;

        if (!appointmentId) {
            new ForbiddenResponse('Không tìm thấy appointment ID').send(res);
            return;
        }

        if (!userId || !userRole) {
            new ForbiddenResponse(
                'Không xác định được thông tin người dùng'
            ).send(res);
            return;
        }

        // Admin có full quyền truy cập
        if (isAdmin(userRole)) {
            next();
            return;
        }

        // Lấy thông tin appointment
        const appointment =
            await appointmentDao.getAppointmentById(appointmentId);

        if (!appointment) {
            new ForbiddenResponse('Không tìm thấy appointment').send(res);
            return;
        }

        // Patient chỉ có quyền với appointment của mình
        if (userRole === 'patient') {
            if (appointment.patientId !== userId) {
                new ForbiddenResponse(
                    'Bạn không có quyền truy cập appointment này'
                ).send(res);
                return;
            }
            next();
            return;
        }

        // Doctor chỉ có quyền với appointment của mình
        if (userRole === 'doctor') {
            if (appointment.doctorId !== userId) {
                new ForbiddenResponse(
                    'Bạn không có quyền truy cập appointment này'
                ).send(res);
                return;
            }
            next();
            return;
        }

        // Role không hợp lệ
        new ForbiddenResponse(
            'Bạn không có quyền truy cập appointment này'
        ).send(res);
    } catch (error) {
        new ForbiddenResponse('Có lỗi xảy ra khi kiểm tra quyền truy cập').send(
            res
        );
    }
};

/**
 * Middleware kiểm tra quyền tạo appointment cho người khác
 * Chỉ Staff mới có quyền tạo appointment cho bệnh nhân khác
 */
export const checkCreateAppointmentPermission = (
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    const userId = req.user?.id;
    const userRole = req.user?.role;
    const patientId = req.body.patientId;

    // Nếu không chỉ định patientId, mặc định là tạo cho chính mình
    if (!patientId) {
        next();
        return;
    }

    // Nếu patientId = userId, bệnh nhân tạo cho chính mình
    if (patientId === userId) {
        next();
        return;
    }

    // Nếu patientId khác userId, chỉ admin mới được phép
    if (!isAdmin(userRole)) {
        new ForbiddenResponse(
            'Chỉ admin có quyền tạo appointment cho bệnh nhân khác'
        ).send(res);
        return;
    }

    next();
};

/**
 * Middleware kiểm tra quyền cập nhật appointment
 * Staff: Có thể cập nhật tất cả
 * Patient: Chỉ có thể cập nhật appointment của mình và trước 24h
 * Doctor: Có thể cập nhật appointment của mình
 */
export const checkUpdateAppointmentPermission = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    await checkAppointmentOwnership(req, res, next);
};

/**
 * Middleware kiểm tra quyền hủy appointment
 * Patient: Chỉ có thể hủy appointment của mình
 */
export const checkCancelAppointmentPermission = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    const userRole = req.user?.role;

    // Chỉ patient có quyền hủy appointment
    if (userRole !== 'patient') {
        new ForbiddenResponse('Chỉ bệnh nhân mới có quyền hủy lịch hẹn').send(
            res
        );
        return;
    }

    // Sử dụng checkAppointmentOwnership cho staff và patient
    await checkAppointmentOwnership(req, res, next);
};

/**
 * Middleware kiểm tra quyền từ chối appointment
 * Chỉ Doctor và Admin có quyền từ chối appointment
 */
export const checkRejectAppointmentPermission = (
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    const userRole = req.user?.role;

    // Chỉ doctor và admin có quyền từ chối appointment
    if (userRole !== 'doctor' && userRole !== 'admin') {
        new ForbiddenResponse(
            'Chỉ bác sĩ hoặc admin mới có quyền từ chối lịch hẹn'
        ).send(res);
        return;
    }

    next();
};

/**
 * Middleware kiểm tra quyền duyệt appointment
 * Chỉ Doctor và Admin có quyền duyệt appointment
 */
export const checkApproveAppointmentPermission = (
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    const userRole = req.user?.role;

    // Chỉ doctor và admin có quyền duyệt appointment
    if (userRole !== 'doctor' && userRole !== 'admin') {
        new ForbiddenResponse(
            'Chỉ bác sĩ hoặc admin mới có quyền duyệt lịch hẹn'
        ).send(res);
        return;
    }

    next();
};

export default {
    checkRole,
    checkAppointmentOwnership,
    checkCreateAppointmentPermission,
    checkUpdateAppointmentPermission,
    checkCancelAppointmentPermission,
    checkRejectAppointmentPermission,
    checkApproveAppointmentPermission,
};
