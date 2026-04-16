import z from 'zod';

export const getPatientStatisticsDto = z.object({});
export type GetPatientStatisticsDto = z.infer<typeof getPatientStatisticsDto>;

// Admin statistics DTOs
export const getAdminStatisticsDto = z.object({
    period: z.enum(['week', 'month']).optional().default('month'),
    fromDate: z.string().optional(),
    toDate: z.string().optional(),
});

export type GetAdminStatisticsDto = z.infer<typeof getAdminStatisticsDto>;

// Thống kê số bệnh nhân theo khoa
export const getPatientsByDepartmentDto = z.object({
    fromDate: z.string().optional(),
    toDate: z.string().optional(),
});

export type GetPatientsByDepartmentDto = z.infer<
    typeof getPatientsByDepartmentDto
>;

// Thống kê số lượt khám theo bác sĩ
export const getAppointmentsByDoctorDto = z.object({
    fromDate: z.string().optional(),
    toDate: z.string().optional(),
    specialization: z.string().optional(),
});

export type GetAppointmentsByDoctorDto = z.infer<
    typeof getAppointmentsByDoctorDto
>;

// ADMIN DASHBOARD DTOs
// Dashboard Summary Statistics DTO
export const getDashboardSummaryDto = z.object({
    date: z.string().optional(), // Default to today, format: 'YYYY-MM-DD'
});
export type GetDashboardSummaryDto = z.infer<typeof getDashboardSummaryDto>;

// Staff Stastistics by Department DTO
export const getStaffByDepartmentDto = z.object({});
export type GetStaffByDepartmentDto = z.infer<typeof getStaffByDepartmentDto>;

// Revenue by Day of Week DTO
export const getRevenueByDayOfWeekDto = z.object({
    weekStart: z.string().optional(), // Start date of the week (Monday), format: 'YYYY-MM-DD'
});
export type GetRevenueByDayOfWeekDto = z.infer<typeof getRevenueByDayOfWeekDto>;

// Appointments Stats by Day of Week DTO
export const getAppointmentsByDayOfWeekDto = z.object({
    weekStart: z.string().optional(), // Start of the week (Monday), format: YYYY-MM-DD
});
export type GetAppointmentsByDayOfWeekDto = z.infer<
    typeof getAppointmentsByDayOfWeekDto
>;

// DOCTOR DASHBOARD DTOs
export const getDoctorDashboardSummaryDto = z.object({});
export type GetDoctorDashboardSummaryDto = z.infer<
    typeof getDoctorDashboardSummaryDto
>;

export const getDoctorAppointmentsByDayDto = z.object({});
export type GetDoctorAppointmentsByDayDto = z.infer<
    typeof getDoctorAppointmentsByDayDto
>;

export const getDoctorAppointmentStatusDto = z.object({});
export type GetDoctorAppointmentStatusDto = z.infer<
    typeof getDoctorAppointmentStatusDto
>;
