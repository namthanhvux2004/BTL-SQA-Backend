/**
 * BUSINESS RULES:
 * 1. 24-Hour Rule: Patients must modify/cancel appointments at least 24h before
 * 2. Staff Override: Staff/Admin can bypass time restrictions
 * 3. Status Flow: pending -> confirmed -> completed (or cancelled anytime)
 */

// Constants
const DEFAULT_MINIMUM_HOURS = 24;
const STAFF_ROLES = ['staff', 'admin'];
const MS_PER_HOUR = 1000 * 60 * 60;

/**
 * Helper: Check if user is staff
 */
function isStaff(userRole: string): boolean {
    return STAFF_ROLES.includes(userRole);
}

/**
 * Kiểm tra xem thời gian còn cách bao nhiêu giờ so với hiện tại
 * @param targetTime - Thời gian cần kiểm tra
 * @returns Số giờ chênh lệch (dương nếu trong tương lai, âm nếu đã qua)
 */
export function getHoursUntil(targetTime: Date): number {
    const now = new Date();
    const diffMs = targetTime.getTime() - now.getTime();
    return diffMs / MS_PER_HOUR;
}

/**
 * Kiểm tra xem có được phép sửa/hủy appointment không (quy tắc 24h)
 * Staff/Admin luôn được phép
 * Patient chỉ được phép nếu còn ít nhất 24h
 * @param appointmentStartTime - Thời gian bắt đầu của appointment
 * @param userRole - Role của người dùng
 * @param minimumHours - Số giờ tối thiểu cần trước appointment
 * @returns { allowed: boolean, reason?: string }
 */
export function canModifyAppointment(
    appointmentStartTime: Date,
    userRole: string,
    minimumHours: number = DEFAULT_MINIMUM_HOURS
): { allowed: boolean; reason?: string } {
    // Staff/Admin luôn được phép
    if (isStaff(userRole)) {
        return { allowed: true };
    }

    // Kiểm tra thời gian
    const hoursUntil = getHoursUntil(appointmentStartTime);

    // Nếu appointment đã qua
    if (hoursUntil < 0) {
        return {
            allowed: false,
            reason: 'Không thể sửa/hủy appointment đã qua thời gian',
        };
    }

    // Nếu còn ít hơn minimumHours
    if (hoursUntil < minimumHours) {
        return {
            allowed: false,
            reason: `Chỉ có thể sửa/hủy appointment trước ${minimumHours} giờ. Hiện còn ${Math.floor(hoursUntil)} giờ ${Math.floor((hoursUntil % 1) * 60)} phút.`,
        };
    }

    return { allowed: true };
}

/**
 * Kiểm tra xem appointment có thể được hủy không
 * @param appointmentStartTime - Thời gian bắt đầu của appointment
 * @param appointmentStatus - Trạng thái hiện tại của appointment
 * @param userRole - Role của người dùng
 * @returns { allowed: boolean, reason?: string }
 */
export function canCancelAppointment(
    appointmentStartTime: Date,
    appointmentStatus: string,
    userRole: string
): { allowed: boolean; reason?: string } {
    // Kiểm tra status
    if (appointmentStatus === 'cancelled') {
        return {
            allowed: false,
            reason: 'Appointment này đã bị hủy trước đó',
        };
    }

    if (appointmentStatus === 'completed') {
        return {
            allowed: false,
            reason: 'Không thể hủy appointment đã hoàn thành',
        };
    }

    // Kiểm tra quy tắc 24h
    return canModifyAppointment(appointmentStartTime, userRole);
}

/**
 * Format thời gian còn lại thành chuỗi dễ đọc
 * @param hours - Số giờ
 * @returns Chuỗi formatted
 */
export function formatHoursRemaining(hours: number): string {
    if (hours < 0) {
        return 'đã qua';
    }

    const fullHours = Math.floor(hours);
    const minutes = Math.floor((hours % 1) * 60);

    if (fullHours === 0) {
        return `${minutes} phút`;
    }

    if (minutes === 0) {
        return `${fullHours} giờ`;
    }

    return `${fullHours} giờ ${minutes} phút`;
}

export default {
    getHoursUntil,
    canModifyAppointment,
    canCancelAppointment,
    formatHoursRemaining,
};
