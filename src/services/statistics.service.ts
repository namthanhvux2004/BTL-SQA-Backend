import {
    countAppointmentsByDoctor,
    countCompletedAppointments,
    countNewPatients,
    countPatientsByDepartment,
    countPatientsByMonth,
    countPatientsByWeek,
    countUpcomingAppointments,
    getDashboardSummaryStats,
    getStaffCountByDepartment,
    getRevenueByDayOfWeek as getRevenueByDayOfWeekDao,
    getAppointmentsByDayOfWeek as getAppointmentsByDayOfWeekDao,
    getMondayOfWeek,
    getDoctorDashboardSummary as getDoctorDashboardSummaryDao,
    getDoctorAppointmentsByDay as getDoctorAppointmentsByDayDao,
    getDoctorAppointmentStatus as getDoctorAppointmentStatusDao,
} from '@src/daos/statistics.dao';
import prisma from '@config/prisma';
import { CustomError, ErrorType } from '@src/core/Error';
import visitDao from '@src/daos/visit.dao';
import { DateTime } from 'luxon';

const getPatientStatistics = async (userId: string) => {
    const patient = await prisma.patient.findUnique({
        where: { userId },
        select: { userId: true },
    });

    if (!patient) {
        throw new CustomError(ErrorType.NOT_FOUND, 'Patient profile not found');
    }

    const [totalCompletedAppointments, totalUpcomingAppointments] =
        await Promise.all([
            countCompletedAppointments(userId),
            countUpcomingAppointments(userId),
        ]);

    return {
        summary: {
            totalCompletedAppointments,
            totalUpcomingAppointments,
        },
    };
};

const getAdminStatistics = async (
    period: 'week' | 'month' = 'month',
    fromDate?: string,
    toDate?: string
) => {
    const from = fromDate ? new Date(fromDate) : undefined;
    const to = toDate ? new Date(toDate) : undefined;

    // Thống kê số bệnh nhân mới đăng ký
    const newPatientsCount = await countNewPatients(from, to);

    // Thống kê số bệnh nhân tới khám theo tuần hoặc tháng
    const patientVisits =
        period === 'week'
            ? await countPatientsByWeek(from, to)
            : await countPatientsByMonth(from, to);

    return {
        newPatientsCount,
        patientVisits: {
            period,
            data: patientVisits ?? [],
            total: (patientVisits ?? []).reduce(
                (sum, item) => sum + item.count,
                0
            ),
        },
    };
};

const getPatientsByDepartment = async (fromDate?: string, toDate?: string) => {
    const from = fromDate ? new Date(fromDate) : undefined;
    const to = toDate ? new Date(toDate) : undefined;

    const stats = await countPatientsByDepartment(from, to);

    const allPatientIds = new Set<string>();
    stats.forEach((stat) => {
        stat.patientIds.forEach((patientId) => {
            allPatientIds.add(patientId);
        });
    });

    return {
        data: stats.map(({ patientIds, ...rest }) => rest),
        total: allPatientIds.size,
    };
};

const getAppointmentsByDoctor = async (
    fromDate?: string,
    toDate?: string,
    specialization?: string
) => {
    const from = fromDate ? new Date(fromDate) : undefined;
    const to = toDate ? new Date(toDate) : undefined;

    const stats = await countAppointmentsByDoctor(specialization, from, to);

    return {
        data: stats,
        total: stats.reduce((sum, item) => sum + item.count, 0),
    };
};

const getVisitCountsByStatus = async (
    fromDate?: string,
    toDate?: string,
    timezone: string = 'UTC',
    patientId?: string
) => {
    const from = fromDate
        ? DateTime.fromISO(fromDate, { zone: timezone }).toJSDate()
        : undefined;
    const to = toDate
        ? DateTime.fromISO(toDate, { zone: timezone }).toJSDate()
        : undefined;

    return visitDao.getVisitCountsByStatus(from, to, patientId);
};

const getVisitCountsByYear = async (
    year: number,
    timezone: string = 'UTC',
    patientId?: string
) => {
    const rows = await visitDao.getMonthlyVisitCountsByYear(
        year,
        timezone,
        patientId
    );
    const mapping = rows.reduce<Record<string, number>>((acc, r) => {
        acc[r.month] = Number((r as any).count ?? 0);
        return acc;
    }, {});
    const months = [] as Array<{ month: string; count: number }>;
    for (let m = 1; m <= 12; m++) {
        const key = `${year}-${String(m).padStart(2, '0')}`;
        months.push({ month: key, count: mapping[key] ?? 0 });
    }
    return { year: String(year), months };
};

// ADMIN DASHBOARD SERVICES
const getDashboardSummary = async (timezone: string, date?: string) => {
    const targetDate = date ? new Date(date) : new Date();
    return getDashboardSummaryStats(targetDate, timezone);
};

const getStaffByDepartment = async () => {
    return getStaffCountByDepartment();
};

const getRevenueByDayOfWeek = async (timezone: string, weekStart?: string) => {
    const start = weekStart ? new Date(weekStart) : getMondayOfWeek(timezone);
    return getRevenueByDayOfWeekDao(start, timezone);
};

const getAppointmentsByDayOfWeek = async (
    timezone: string,
    weekStart?: string
) => {
    const start = weekStart ? new Date(weekStart) : getMondayOfWeek(timezone);
    return getAppointmentsByDayOfWeekDao(start, timezone);
};

// DOCTOR DASHBOARD SERVICES
const getDoctorDashboardSummary = async (
    doctorId: string,
    timezone: string
) => {
    return getDoctorDashboardSummaryDao(doctorId, timezone);
};

const getDoctorAppointmentsByDay = async (
    doctorId: string,
    timezone: string
) => {
    return getDoctorAppointmentsByDayDao(doctorId, timezone);
};

const getDoctorAppointmentStatus = async (
    doctorId: string,
    timezone: string
) => {
    return getDoctorAppointmentStatusDao(doctorId, timezone);
};

export default {
    getPatientStatistics,
    getAdminStatistics,
    getPatientsByDepartment,
    getAppointmentsByDoctor,
    getDashboardSummary,
    getStaffByDepartment,
    getRevenueByDayOfWeek,
    getAppointmentsByDayOfWeek,
    getDoctorDashboardSummary,
    getDoctorAppointmentsByDay,
    getDoctorAppointmentStatus,
    getVisitCountsByStatus,
    getVisitCountsByYear,
};
