import prisma from '@src/config/prisma';
import { Prisma } from '@prisma/client';
import type {
    GetAppointmentsQuery,
    CreateAppointmentDto,
    UpdateAppointmentDto,
} from '@src/dtos/appointment.dto';
import { getStartEndOfDay } from './statistics.dao';

const APPOINTMENT_INCLUDE_BASE = {
    patient: {
        include: {
            user: {
                select: {
                    id: true,
                    email: true,
                    phone: true,
                    avatar: true,
                    name: {
                        select: {
                            firstName: true,
                            lastName: true,
                        },
                    },
                },
            },
        },
    },
    doctor: {
        include: {
            staff: {
                include: {
                    user: {
                        select: {
                            name: {
                                select: {
                                    firstName: true,
                                    lastName: true,
                                },
                            },
                            avatar: true,
                        },
                    },
                },
            },
        },
    },
    schedule: {
        include: {
            room: {
                select: {
                    name: true,
                },
            },
            department: {
                select: {
                    name: true,
                },
            },
        },
    },
    bookedBy: {
        select: {
            id: true,
            name: {
                select: {
                    firstName: true,
                    lastName: true,
                },
            },
        },
    },
    medicalService: {
        select: {
            id: true,
            name: true,
            durationMinutes: true,
            price: true,
            department: {
                select: {
                    id: true,
                    name: true,
                },
            },
        },
    },
} as const;

// ==================== Helper Functions ====================

/**
 * Lấy danh sách schedules của một bác sĩ trong ngày cụ thể
 * @param doctorId ID của bác sĩ
 * @param date Ngày cần kiểm tra
 * @param departmentId (Optional) ID khoa để lọc
 * @param timezone Timezone để tính start/end of day
 * @returns Danh sách schedules
 */
const getDoctorSchedulesByDate = async (
    doctorId: string,
    date: Date,
    timezone: string,
    departmentId?: number
) => {
    // Sử dụng helper function
    const { startOfDay, endOfDay } = getStartEndOfDay(date, timezone);

    const whereClause: Prisma.ScheduleWhereInput = {
        staffId: doctorId,
        type: {
            notIn: ['admin', 'off', 'surgery'],
        },
        status: 'confirmed',
        startTime: {
            lte: endOfDay,
        },
        endTime: {
            gte: startOfDay,
        },
        ...(departmentId && { departmentId }), // Conditional spread
    };

    const schedules = await prisma.schedule.findMany({
        where: whereClause,
        select: {
            id: true,
            startTime: true,
            endTime: true,
            maxSlot: true,
            room: {
                select: {
                    id: true,
                    name: true,
                },
            },
            department: {
                select: {
                    id: true,
                    name: true,
                },
            },
        },
        orderBy: {
            startTime: 'asc',
        },
    });

    return schedules;
};

/**
 * Đếm số lượng appointments cho một slot cụ thể
 * Kiểm tra xem appointment có giao nhau với slot hay không
 * @param scheduleId ID của schedule
 * @param slotStart Thời gian bắt đầu slot
 * @param slotEnd Thời gian kết thúc slot
 * @returns Số lượng appointments
 */
const countAppointmentsInSlot = async (
    scheduleId: string,
    slotStart: Date,
    slotEnd: Date
): Promise<number> => {
    const count = await prisma.appointment.count({
        where: {
            scheduleId,
            // Chỉ đếm các appointment đang hoạt động (chưa bị hủy/từ chối)
            // Loại trừ: cancelled, rejected (đã giải phóng slot)
            status: {
                notIn: ['cancelled', 'rejected'],
            },
            // Kiểm tra xem appointment có giao nhau với slot
            // Appointment giao nhau nếu: startTime < slotEnd AND (endTime > slotStart OR endTime IS NULL)
            AND: [
                { startTime: { lt: slotEnd } },
                {
                    OR: [{ endTime: { gt: slotStart } }, { endTime: null }],
                },
            ],
        },
    });

    return count;
};

/**
 * Đếm số lượng appointments cho một bác sĩ trong slot không có scheduleId
 * Kiểm tra xem appointment có giao nhau với slot hay không
 * @param doctorId ID của bác sĩ
 * @param slotStart Thời gian bắt đầu slot
 * @param slotEnd Thời gian kết thúc slot
 * @returns Số lượng appointments
 */
const countAppointmentsByDoctorInSlot = async (
    doctorId: string,
    slotStart: Date,
    slotEnd: Date
): Promise<number> => {
    const count = await prisma.appointment.count({
        where: {
            doctorId,
            // Chỉ đếm các appointment đang hoạt động (chưa bị hủy/từ chối)
            // Loại trừ: cancelled, rejected (đã giải phóng slot)
            status: {
                notIn: ['cancelled', 'rejected'],
            },
            // Kiểm tra xem appointment có giao nhau với slot
            // Appointment giao nhau nếu: startTime < slotEnd AND (endTime > slotStart OR endTime IS NULL)
            AND: [
                { startTime: { lt: slotEnd } },
                {
                    OR: [{ endTime: { gt: slotStart } }, { endTime: null }],
                },
            ],
        },
    });

    return count;
};

/**
 * Lấy danh sách appointments với phân trang và filter
 * @param query Query parameters
 * @returns Danh sách appointments và metadata
 */
const getAppointments = async (query: GetAppointmentsQuery) => {
    const {
        page = 1,
        limit = 10,
        status,
        doctorId,
        patientId,
        fromDate,
        toDate,
        search,
        sortBy = 'startTime',
        sortOrder = 'asc',
    } = query;

    const skip = (page - 1) * limit;

    // Build where clause
    const whereClause: Prisma.AppointmentWhereInput = {};

    if (status) {
        whereClause.status = status;
    }

    if (doctorId) {
        whereClause.doctorId = doctorId;
    }

    if (patientId) {
        whereClause.patientId = patientId;
    }

    if (fromDate || toDate) {
        whereClause.startTime = {};
        if (fromDate) {
            whereClause.startTime.gte = fromDate;
        }
        if (toDate) {
            whereClause.startTime.lte = toDate;
        }
    }

    if (search) {
        whereClause.OR = [
            {
                patient: {
                    user: {
                        name: {
                            firstName: {
                                contains: search,
                                mode: 'insensitive',
                            },
                        },
                    },
                },
            },
            {
                patient: {
                    user: {
                        name: {
                            lastName: { contains: search, mode: 'insensitive' },
                        },
                    },
                },
            },
            {
                patient: {
                    patientId: { contains: search, mode: 'insensitive' },
                },
            },
            {
                doctor: {
                    staff: {
                        user: {
                            name: {
                                firstName: {
                                    contains: search,
                                    mode: 'insensitive',
                                },
                            },
                        },
                    },
                },
            },
            {
                doctor: {
                    staff: {
                        user: {
                            name: {
                                lastName: {
                                    contains: search,
                                    mode: 'insensitive',
                                },
                            },
                        },
                    },
                },
            },
        ];
    }

    // Execute queries sử dụng reusable include object
    const [appointments, totalItems] = await Promise.all([
        prisma.appointment.findMany({
            where: whereClause,
            include: APPOINTMENT_INCLUDE_BASE,
            skip,
            take: limit,
            orderBy: {
                [sortBy]: sortOrder,
            },
        }),
        prisma.appointment.count({ where: whereClause }),
    ]);

    const totalPages = Math.ceil(totalItems / limit);

    return {
        data: appointments,
        metadata: {
            page,
            limit,
            totalItems,
            totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1,
        },
    };
};

/**
 * Lấy chi tiết một appointment theo ID
 * @param id ID của appointment
 * @returns Appointment hoặc null
 */
const getAppointmentById = async (id: string) => {
    return await prisma.appointment.findUnique({
        where: { id },
        include: APPOINTMENT_INCLUDE_BASE,
    });
};

/**
 * Tạo appointment mới
 * @param data Dữ liệu appointment
 * @param bookedByUserId ID người đặt (staff hoặc chính bệnh nhân)
 * @returns Appointment được tạo
 */
const createAppointment = async (
    data: CreateAppointmentDto,
    bookedByUserId: string
) => {
    // Build appointment data với conditional fields
    const appointmentData = {
        patientId: data.patientId || bookedByUserId,
        doctorId: data.doctorId,
        bookedByUserId,
        type: data.type || 'new',
        startTime: data.startTime,
        reason: data.reason,
        status: 'pending' as const,
        ...(data.scheduleId && { scheduleId: data.scheduleId }),
        ...(data.endTime && { endTime: data.endTime }),
        ...(data.notes && { notes: data.notes }),
    };

    return await prisma.appointment.create({
        data: appointmentData,
        include: APPOINTMENT_INCLUDE_BASE,
    });
};

/**
 * Cập nhật appointment
 * @param id ID của appointment
 * @param data Dữ liệu cập nhật
 * @returns Appointment đã cập nhật
 */
const updateAppointment = async (id: string, data: UpdateAppointmentDto) => {
    // Build update object dynamically - chỉ update các field có giá trị
    const updateData: Prisma.AppointmentUpdateInput = Object.entries(data)
        .filter(([, value]) => value !== undefined)
        .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});

    return await prisma.appointment.update({
        where: { id },
        data: updateData,
        include: APPOINTMENT_INCLUDE_BASE,
    });
};

/**
 * Hủy appointment
 * @param id ID của appointment
 * @param cancelReason Lý do hủy
 * @returns Appointment đã hủy
 */
const cancelAppointment = async (id: string, cancelReason?: string) => {
    return await prisma.appointment.update({
        where: { id },
        data: {
            status: 'cancelled',
            reasonCancel: cancelReason
                ? `Đã hủy. Lý do: ${cancelReason}`
                : 'Đã hủy',
        },
    });
};

/**
 * Kiểm tra xem bệnh nhân có appointment trùng thời gian không
 * @param patientId ID bệnh nhân
 * @param startTime Thời gian bắt đầu
 * @param endTime Thời gian kết thúc
 * @param excludeAppointmentId ID appointment cần loại trừ (dùng khi update)
 * @returns Boolean
 */
const hasConflictingAppointment = async (
    patientId: string,
    startTime: Date,
    endTime: Date,
    excludeAppointmentId?: string
): Promise<boolean> => {
    const whereClause: Prisma.AppointmentWhereInput = {
        patientId,
        status: {
            not: 'cancelled',
        },
        OR: [
            {
                // Appointment mới bắt đầu trong khoảng thời gian của appointment cũ
                AND: [
                    { startTime: { lte: startTime } },
                    { endTime: { gt: startTime } },
                ],
            },
            {
                // Appointment mới kết thúc trong khoảng thời gian của appointment cũ
                AND: [
                    { startTime: { lt: endTime } },
                    { endTime: { gte: endTime } },
                ],
            },
            {
                // Appointment mới bao trùm appointment cũ
                AND: [
                    { startTime: { gte: startTime } },
                    { endTime: { lte: endTime } },
                ],
            },
        ],
    };

    if (excludeAppointmentId) {
        whereClause.id = { not: excludeAppointmentId };
    }

    const count = await prisma.appointment.count({
        where: whereClause,
    });

    return count > 0;
};

/**
 * Đếm tổng số appointments trong một schedule (ca làm việc)
 * @param scheduleId ID của schedule
 * @returns Số lượng appointments đã đặt trong schedule
 */
const countAppointmentsInSchedule = async (
    scheduleId: string
): Promise<number> => {
    const count = await prisma.appointment.count({
        where: {
            scheduleId,
            // Chỉ đếm các appointment đang hoạt động (chưa bị hủy/từ chối)
            status: {
                notIn: ['cancelled', 'rejected'],
            },
        },
    });

    return count;
};

/**
 * Lấy danh sách các thời gian đã được đặt trong một schedule
 * @param scheduleId ID của schedule
 * @returns Danh sách startTime của các appointments đã đặt
 */
const getBookedTimesInSchedule = async (
    scheduleId: string
): Promise<Date[]> => {
    const appointments = await prisma.appointment.findMany({
        where: {
            scheduleId,
            status: {
                notIn: ['cancelled', 'rejected'],
            },
        },
        select: {
            startTime: true,
        },
    });

    return appointments.map((apt) => apt.startTime);
};

export default {
    getDoctorSchedulesByDate,
    countAppointmentsInSlot,
    countAppointmentsByDoctorInSlot,
    countAppointmentsInSchedule,
    getBookedTimesInSchedule,
    getAppointments,
    getAppointmentById,
    createAppointment,
    updateAppointment,
    cancelAppointment,
    hasConflictingAppointment,
};
