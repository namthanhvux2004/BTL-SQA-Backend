import { AppointmentStatus } from '@prisma/client';
import prisma from '@config/prisma';
import { DateTime } from 'luxon';

export const countCompletedAppointments = async (userId: string) => {
    return prisma.appointment.count({
        where: {
            patientId: userId,
            status: AppointmentStatus.completed,
        },
    });
};

// Thống kê số lần hẹn tiếp theo (appointment confirmed hoặc pending, startTime > now)
export const countUpcomingAppointments = async (userId: string) => {
    return prisma.appointment.count({
        where: {
            patientId: userId,
            status: {
                in: [AppointmentStatus.confirmed, AppointmentStatus.pending],
            },
            startTime: {
                gte: new Date(),
            },
        },
    });
};

// Thống kê số bệnh nhân mới đăng ký trong một khoảng thời gian
export const countNewPatients = async (fromDate?: Date, toDate?: Date) => {
    const whereClause: any = {
        patient: {
            isNot: null,
        },
        role: {
            name: 'patient',
        },
    };

    if (fromDate || toDate) {
        whereClause.createdAt = {};
        if (fromDate) whereClause.createdAt.gte = fromDate;
        if (toDate) whereClause.createdAt.lte = toDate;
    }

    return prisma.user.count({
        where: whereClause,
    });
};

// Thống kê số bệnh nhân tới khám theo tuần

export const countPatientsByWeek = async (fromDate?: Date, toDate?: Date) => {
    const whereClause: any = {
        status: AppointmentStatus.completed,
    };

    if (fromDate || toDate) {
        whereClause.startTime = {};
        if (fromDate) whereClause.startTime.gte = fromDate;
        if (toDate) whereClause.startTime.lte = toDate;
    }

    // Lấy tất cả appointments completed với thông tin startTime
    const appointments = await prisma.appointment.findMany({
        where: whereClause,
        select: {
            startTime: true,
            patientId: true,
        },
    });

    // Group theo tuần
    const weeklyStats: Record<string, Set<string>> = {};
    appointments.forEach((appointment) => {
        const date = new Date(appointment.startTime);
        // Tính số tuần trong năm (ISO week)
        const weekNumber = getWeekNumber(date);
        const year = date.getFullYear();
        const weekKey = `${year}-W${weekNumber.toString().padStart(2, '0')}`;

        if (!weeklyStats[weekKey]) {
            weeklyStats[weekKey] = new Set();
        }
        weeklyStats[weekKey].add(appointment.patientId);
    });
};

// Thống kê số bệnh nhân tới khám theo tháng
export const countPatientsByMonth = async (fromDate?: Date, toDate?: Date) => {
    const where: any = {
        status: AppointmentStatus.completed,
    };

    if (fromDate || toDate) {
        where.startTime = {};
        if (fromDate) where.startTime.gte = fromDate;
        if (toDate) where.startTime.lte = toDate;
    }

    // Lấy tất cả appointments completed với thông tin startTime
    const appointments = await prisma.appointment.findMany({
        where,
        select: {
            startTime: true,
            patientId: true,
        },
    });

    // Group by month
    const monthlyStats: Record<string, Set<string>> = {};

    appointments.forEach((appointment) => {
        const date = new Date(appointment.startTime);
        const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;

        if (!monthlyStats[monthKey]) {
            monthlyStats[monthKey] = new Set();
        }
        monthlyStats[monthKey].add(appointment.patientId);
    });

    // Chuyển đổi thành array với số lượng bệnh nhân unique
    return Object.entries(monthlyStats)
        .map(([month, patientSet]) => ({
            period: month,
            count: patientSet.size,
            patients: Array.from(patientSet),
        }))
        .sort((a, b) => a.period.localeCompare(b.period));
};

function getWeekNumber(date: Date): number {
    const d = new Date(
        Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
    );
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

// Thống kê số bệnh nhân tới khám theo từng chuyên khoa (department)
export const countPatientsByDepartment = async (
    fromDate?: Date,
    toDate?: Date
) => {
    const whereClause: any = {
        status: AppointmentStatus.completed,
    };

    if (fromDate || toDate) {
        whereClause.startTime = {};
        if (fromDate) whereClause.startTime.gte = fromDate;
        if (toDate) whereClause.startTime.lte = toDate;
    }

    // Lấy tất cả appointments completed với thông tin department và patientId
    const appointments = await prisma.appointment.findMany({
        where: whereClause,
        select: {
            patientId: true,
            doctor: {
                select: {
                    staff: {
                        select: {
                            department: {
                                select: {
                                    id: true,
                                    name: true,
                                },
                            },
                        },
                    },
                },
            },
        },
    });

    // Group by department and count unique patients
    const departmentStats: Record<
        string,
        { name: string; patientIds: Set<string> }
    > = {};
    appointments.forEach((appointment) => {
        const department = appointment.doctor?.staff?.department;
        if (!department) return;

        const deptKey = String(department.id);
        const stat = (departmentStats[deptKey] ??= {
            name: department.name,
            patientIds: new Set<string>(),
        });

        if (appointment.patientId) {
            stat.patientIds.add(appointment.patientId);
        }
    });

    // Chuyển đổi thành array và sắp xếp theo số lượng bệnh nhân giảm dần
    return Object.entries(departmentStats)
        .map(([departmentId, stat]) => ({
            departmentId: parseInt(departmentId),
            departmentName: stat.name,
            patientCount: stat.patientIds.size,
            patientIds: stat.patientIds,
        }))
        .sort((a, b) => b.patientCount - a.patientCount);
};

// Thống kê số lượt khám theo từng bác sĩ
export const countAppointmentsByDoctor = async (
    specialization?: string,
    fromDate?: Date,
    toDate?: Date
) => {
    const whereClause: any = {
        status: AppointmentStatus.completed,
    };

    if (fromDate || toDate) {
        whereClause.startTime = {};
        if (fromDate) whereClause.startTime.gte = fromDate;
        if (toDate) whereClause.startTime.lte = toDate;
    }

    // Filter by specialization if provided
    if (specialization) {
        whereClause.doctor = {
            specialization: {
                contains: specialization,
                mode: 'insensitive',
            },
        };
    }

    // Lấy tất cả appointments completed với thông tin doctor
    const appointments = await prisma.appointment.findMany({
        where: whereClause,
        select: {
            doctorId: true,
            doctor: {
                select: {
                    specialization: true,
                    staff: {
                        select: {
                            user: {
                                select: {
                                    id: true,
                                    username: true,
                                    email: true,
                                    avatar: true,
                                    name: {
                                        select: {
                                            firstName: true,
                                            lastName: true,
                                        },
                                    },
                                },
                            },
                            department: {
                                select: {
                                    id: true,
                                    name: true,
                                    code: true,
                                },
                            },
                        },
                    },
                    experienceYears: true,
                    level: true,
                },
            },
        },
    });

    // Group by doctorId
    const doctorStats: Record<
        string,
        {
            doctorId: string;
            count: number;
            doctor: {
                specialization: string;
                staff: {
                    user: any;
                    department: any;
                };
                experienceYears: number;
                level: string;
            };
        }
    > = {};

    appointments.forEach((appointment) => {
        const doctorId = appointment.doctorId!;
        if (!appointment.doctor) {
            // Skip if doctor info is missing
            return;
        }
        if (!doctorStats[doctorId]) {
            doctorStats[doctorId] = {
                doctorId,
                count: 0,
                doctor: appointment.doctor,
            };
        }
        doctorStats[doctorId].count++;
    });

    // Chuyển đổi thành array và sắp xếp theo số lượt khám giảm dần
    return Object.values(doctorStats)
        .map((stat) => ({
            doctorId: stat.doctorId,
            count: stat.count,
            doctor: {
                specialization: stat.doctor.specialization,
                experienceYears: stat.doctor.experienceYears,
                level: stat.doctor.level,
                user: stat.doctor.staff.user,
                department: stat.doctor.staff.department,
            },
        }))
        .sort((a, b) => b.count - a.count);
};

// ADMIN DASHBOARD DAOs
// Helper function to calculate percentage change and trend
const calculateChange = (
    oldValue: number,
    newValue: number
): { change: string; trend: 'up' | 'down' | 'neutral' } => {
    const diff = newValue - oldValue;

    if (diff > 0) {
        return { change: `+${diff}`, trend: 'up' };
    } else if (diff < 0) {
        return { change: `${diff}`, trend: 'down' };
    } else {
        return { change: '0', trend: 'neutral' };
    }
};

// Helper function: Get start and end of day
export const getStartEndOfDay = (date: Date, timezone: string) => {
    const localDt = DateTime.fromJSDate(date).setZone(timezone);
    return {
        startOfDay: localDt.startOf('day').toJSDate(),
        endOfDay: localDt.endOf('day').toJSDate(),
    };
};

// Helper function: Get Monday of current week
export const getMondayOfWeek = (
    timezone: string,
    date: Date = new Date()
): Date => {
    return DateTime.fromJSDate(date)
        .setZone(timezone)
        .startOf('week')
        .toJSDate();
};

// 1. Dashboard Summary Stats
export const getDashboardSummaryStats = async (
    date: Date,
    timezone: string
) => {
    const { startOfDay, endOfDay } = getStartEndOfDay(date, timezone);
    // Yesterday for comparison
    const yesterday = new Date(date);
    yesterday.setDate(yesterday.getDate() - 1);
    const { startOfDay: startOfYesterday, endOfDay: endOfYesterday } =
        getStartEndOfDay(yesterday, timezone);
    // Run all queries in parallel
    const [
        todayPatients,
        yesterdayPatients,
        todayNewAccounts,
        yesterdayNewAccounts,
        totalDepartments,
        yesterdayDepartments,
        totalDoctors,
        yesterdayDoctors,
    ] = await Promise.all([
        // Today's completed appointments (patients visited)
        prisma.appointment.count({
            where: {
                startTime: { gte: startOfDay, lte: endOfDay },
                status: AppointmentStatus.completed,
            },
        }),
        // Yesterday's completed appointments
        prisma.appointment.count({
            where: {
                startTime: { gte: startOfYesterday, lte: endOfYesterday },
                status: AppointmentStatus.completed,
            },
        }),
        // Today's new user accounts
        prisma.user.count({
            where: {
                createdAt: { gte: startOfDay, lte: endOfDay },
            },
        }),
        // Yesterday's new user accounts
        prisma.user.count({
            where: {
                createdAt: { gte: startOfYesterday, lte: endOfYesterday },
            },
        }),
        // Total departments (current)
        prisma.department.count(),
        // Departments created before today (to calculate change)
        prisma.department.count({
            where: {
                createdAt: { lt: startOfDay },
            },
        }),
        // Total doctors (current)
        prisma.doctor.count(),
        // Doctors before today
        prisma.doctor.count({
            where: {
                staff: {
                    joinTime: { lt: startOfDay },
                },
            },
        }),
    ]);
    // Calculate changes
    const patientsChange = calculateChange(yesterdayPatients, todayPatients);
    const accountsChange = calculateChange(
        yesterdayNewAccounts,
        todayNewAccounts
    );
    const departmentsChange = calculateChange(
        yesterdayDepartments,
        totalDepartments
    );
    const doctorsChange = calculateChange(yesterdayDoctors, totalDoctors);
    return [
        {
            id: 1,
            title: 'Số bệnh nhân tới khám trong ngày',
            value: todayPatients,
            change: patientsChange.change,
            trend: patientsChange.trend,
        },
        {
            id: 2,
            title: 'Số tài khoản mới được tạo',
            value: todayNewAccounts,
            change: accountsChange.change,
            trend: accountsChange.trend,
        },
        {
            id: 3,
            title: 'Tổng số phòng khám, khoa',
            value: totalDepartments,
            change: departmentsChange.change,
            trend: departmentsChange.trend,
        },
        {
            id: 4,
            title: 'Tổng số bác sĩ trong bệnh viện',
            value: totalDoctors,
            change: doctorsChange.change,
            trend: doctorsChange.trend,
        },
    ];
};

// 2. Staff Count by Department
export const getStaffCountByDepartment = async () => {
    const departments = await prisma.department.findMany({
        select: {
            name: true,
            _count: {
                select: { staffs: true },
            },
        },
        orderBy: {
            staffs: { _count: 'desc' },
        },
    });
    return departments.map((dept) => ({
        department: dept.name,
        count: dept._count.staffs,
    }));
};

// 3. Revenue by Day of Week
export const getRevenueByDayOfWeek = async (
    weekStart: Date,
    timezone: string
) => {
    const weekEnd = DateTime.fromJSDate(weekStart)
        .setZone(timezone)
        .plus({ days: 6 })
        .endOf('day')
        .toJSDate();
    const payments = await prisma.payment.findMany({
        where: {
            createdAt: { gte: weekStart, lte: weekEnd },
            status: 'completed',
        },
        select: {
            amount: true,
            createdAt: true,
        },
    });
    // Group by day of week
    const days = ['CN', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
    const result: Record<number, number> = {
        0: 0,
        1: 0,
        2: 0,
        3: 0,
        4: 0,
        5: 0,
        6: 0,
    };
    payments.forEach((payment) => {
        const vnTime = DateTime.fromJSDate(payment.createdAt).setZone(timezone);
        const dayOfWeek = vnTime.weekday === 7 ? 0 : vnTime.weekday;
        result[dayOfWeek]! += payment.amount;
    });
    // Return in order: Mon, Tue, Wed, Thu, Fri, Sat, Sun
    return [1, 2, 3, 4, 5, 6, 0].map((i) => ({
        day: days[i],
        value: result[i],
    }));
};

// 4. Appointments by Day of Week
export const getAppointmentsByDayOfWeek = async (
    weekStart: Date,
    timezone: string
) => {
    const weekEnd = DateTime.fromJSDate(weekStart)
        .setZone(timezone)
        .plus({ days: 6 })
        .endOf('day')
        .toJSDate();
    const appointments = await prisma.appointment.findMany({
        where: {
            startTime: { gte: weekStart, lte: weekEnd },
        },
        select: {
            startTime: true,
        },
    });
    // Group by day of week
    const days = ['CN', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
    const result: Record<number, number> = {
        0: 0,
        1: 0,
        2: 0,
        3: 0,
        4: 0,
        5: 0,
        6: 0,
    };
    appointments.forEach((appointment) => {
        const vnTime = DateTime.fromJSDate(appointment.startTime).setZone(
            timezone
        );
        const dayOfWeek = vnTime.weekday === 7 ? 0 : vnTime.weekday;
        result[dayOfWeek]!++;
    });
    // Return in order: Mon, Tue, Wed, Thu, Fri, Sat, Sun
    return [1, 2, 3, 4, 5, 6, 0].map((dayIndex) => ({
        day: days[dayIndex],
        value: result[dayIndex],
    }));
};

// DOCTOR DASHBOARD DAOs
// 1. Doctor Dashboard Summary - Get completed, pending, and weekly appointments for a doctor
export const getDoctorDashboardSummary = async (
    doctorId: string,
    timezone: string
) => {
    const mondayOfWeek = getMondayOfWeek(timezone);
    const sundayOfWeek = DateTime.fromJSDate(mondayOfWeek)
        .setZone(timezone)
        .plus({ days: 6 })
        .endOf('day')
        .toJSDate();

    const [completedAppointments, pendingAppointments, weeklyAppointments] =
        await Promise.all([
            // Count completed appointments for this doctor
            prisma.appointment.count({
                where: {
                    doctorId,
                    status: AppointmentStatus.completed,
                },
            }),
            // Count pending/confirmed appointments for this doctor
            prisma.appointment.count({
                where: {
                    doctorId,
                    status: {
                        in: [
                            AppointmentStatus.pending,
                            AppointmentStatus.confirmed,
                        ],
                    },
                },
            }),
            // Count all appointments for this doctor in current week
            prisma.appointment.count({
                where: {
                    doctorId,
                    startTime: { gte: mondayOfWeek, lte: sundayOfWeek },
                },
            }),
        ]);

    return {
        completedAppointments,
        pendingAppointments,
        weeklyAppointments,
    };
};

// 2. Doctor Appointments by Day - Get appointments count by day of week for a doctor
export const getDoctorAppointmentsByDay = async (
    doctorId: string,
    timezone: string
) => {
    const mondayOfWeek = getMondayOfWeek(timezone);
    const sundayOfWeek = new Date(mondayOfWeek);
    sundayOfWeek.setDate(sundayOfWeek.getDate() + 6);
    sundayOfWeek.setHours(23, 59, 59, 999);

    const appointments = await prisma.appointment.findMany({
        where: {
            doctorId,
            startTime: { gte: mondayOfWeek, lte: sundayOfWeek },
        },
        select: {
            startTime: true,
        },
    });

    // Group by day of week
    const result: Record<number, number> = {
        0: 0,
        1: 0,
        2: 0,
        3: 0,
        4: 0,
        5: 0,
        6: 0,
    };

    appointments.forEach((appointment) => {
        const dayOfWeek = new Date(appointment.startTime).getDay();
        result[dayOfWeek]!++;
    });

    // Return in Vietnamese format: Mon -> Sun
    const labels = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'CN'];
    const values = [1, 2, 3, 4, 5, 6, 0].map((dayIndex) => result[dayIndex]);

    return { labels, values };
};

// 3. Doctor Appointment Status - Get appointment status distribution for a doctor
export const getDoctorAppointmentStatus = async (
    doctorId: string,
    timezone: string
) => {
    const mondayOfWeek = getMondayOfWeek(timezone);
    const sundayOfWeek = new Date(mondayOfWeek);
    sundayOfWeek.setDate(sundayOfWeek.getDate() + 6);
    sundayOfWeek.setHours(23, 59, 59, 999);

    const [completed, cancelled, pending, confirmed] = await Promise.all([
        prisma.appointment.count({
            where: {
                doctorId,
                startTime: { gte: mondayOfWeek, lte: sundayOfWeek },
                status: AppointmentStatus.completed,
            },
        }),
        prisma.appointment.count({
            where: {
                doctorId,
                startTime: { gte: mondayOfWeek, lte: sundayOfWeek },
                status: AppointmentStatus.cancelled,
            },
        }),
        prisma.appointment.count({
            where: {
                doctorId,
                startTime: { gte: mondayOfWeek, lte: sundayOfWeek },
                status: AppointmentStatus.pending,
            },
        }),
        prisma.appointment.count({
            where: {
                doctorId,
                startTime: { gte: mondayOfWeek, lte: sundayOfWeek },
                status: AppointmentStatus.confirmed,
            },
        }),
    ]);

    // Combine pending + confirmed as "Chờ khám"
    return [
        { name: 'Hoàn thành', value: completed },
        { name: 'Hủy', value: cancelled },
        { name: 'Chờ khám', value: pending + confirmed },
    ];
};
