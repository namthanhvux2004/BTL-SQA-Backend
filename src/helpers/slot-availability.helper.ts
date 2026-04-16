/**
 * Các hàm hỗ trợ kiểm tra tính khả dụng của slot
 */
import prisma from '@src/config/prisma';

/**
 * Kiểm tra xem một slot có đầy hay không.
 * Một slot được coi là đầy nếu số lượng Appointment (status != 'cancelled') >= maxSlot.
 * @param scheduleId string - ID của schedule
 * @param slotStart Date - Thời gian bắt đầu slot
 * @param slotEnd Date - Thời gian kết thúc slot
 * @param maxSlot number - Số lượng tối đa appointments trong slot
 * @returns Promise<boolean> - true nếu slot đã đầy
 */
export async function isSlotFull(
    scheduleId: string,
    slotStart: Date,
    slotEnd: Date,
    maxSlot: number
): Promise<boolean> {
    const count = await prisma.appointment.count({
        where: {
            scheduleId,
            status: { not: 'cancelled' },
            startTime: slotStart,
            endTime: slotEnd,
        },
    });
    return count >= maxSlot;
}

/**
 * Lấy số lượng appointment còn trống trong một slot
 * @param scheduleId string - ID của schedule
 * @param slotStart Date - Thời gian bắt đầu slot
 * @param slotEnd Date - Thời gian kết thúc slot
 * @param maxSlot number - Số lượng tối đa appointments trong slot
 * @returns Promise<number> - Số lượng chỗ trống còn lại
 */
export async function getAvailableCountInSlot(
    scheduleId: string,
    slotStart: Date,
    slotEnd: Date,
    maxSlot: number
): Promise<number> {
    const count = await prisma.appointment.count({
        where: {
            scheduleId,
            status: { not: 'cancelled' },
            startTime: slotStart,
            endTime: slotEnd,
        },
    });
    return Math.max(0, maxSlot - count);
}

/**
 * Kiểm tra xem một bác sĩ có rảnh trong khoảng thời gian cụ thể không
 * @param doctorId string - ID của bác sĩ
 * @param startTime Date - Thời gian bắt đầu
 * @param endTime Date - Thời gian kết thúc
 * @returns Promise<boolean> - true nếu bác sĩ rảnh
 */
export async function isDoctorAvailable(
    doctorId: string,
    startTime: Date,
    endTime: Date
): Promise<boolean> {
    const conflictingAppointments = await prisma.appointment.count({
        where: {
            doctorId,
            status: { not: 'cancelled' },
            OR: [
                {
                    AND: [
                        { startTime: { lte: startTime } },
                        { endTime: { gt: startTime } },
                    ],
                },
                {
                    AND: [
                        { startTime: { lt: endTime } },
                        { endTime: { gte: endTime } },
                    ],
                },
                {
                    AND: [
                        { startTime: { gte: startTime } },
                        { endTime: { lte: endTime } },
                    ],
                },
            ],
        },
    });

    return conflictingAppointments === 0;
}
