import { Request, Response } from 'express';
import statisticsService from '@src/services/statistics.service';
import { SuccessResponse } from '@src/core/ApiResponse';
import {
    GetAdminStatisticsDto,
    GetAppointmentsByDoctorDto,
    GetPatientsByDepartmentDto,
    GetDashboardSummaryDto,
    GetRevenueByDayOfWeekDto,
    GetAppointmentsByDayOfWeekDto,
} from '@src/dtos/statistics.dto';
import { GetVisitStatusDto, GetVisitsByYearDto } from '@src/dtos/visit.dto';

const getPatientStatistics = async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const result = await statisticsService.getPatientStatistics(userId);
    return new SuccessResponse(
        result,
        'Patient statistics retrieved successfully'
    ).send(res);
};

const getAdminStatistics = async (req: Request, res: Response) => {
    const { period, fromDate, toDate } = req.query as GetAdminStatisticsDto;
    const result = await statisticsService.getAdminStatistics(
        period,
        fromDate,
        toDate
    );
    return new SuccessResponse(result, 'Lấy thống kê quản trị thành công').send(
        res
    );
};

const getPatientsByDepartment = async (req: Request, res: Response) => {
    const { fromDate, toDate } = req.query as GetPatientsByDepartmentDto;
    const result = await statisticsService.getPatientsByDepartment(
        fromDate,
        toDate
    );
    return new SuccessResponse(
        result,
        'Lấy thống kê bệnh nhân theo khoa thành công'
    ).send(res);
};

const getAppointmentsByDoctor = async (req: Request, res: Response) => {
    const { fromDate, toDate, specialization } =
        req.query as GetAppointmentsByDoctorDto;
    const result = await statisticsService.getAppointmentsByDoctor(
        fromDate,
        toDate,
        specialization
    );
    return new SuccessResponse(
        result,
        'Lấy thống kê số lượt khám theo bác sĩ thành công'
    ).send(res);
};

// Visits statistics
const getVisitCountsByStatus = async (req: Request, res: Response) => {
    const { fromDate, toDate, patientId } = req.query as GetVisitStatusDto;
    const timezone =
        (req.headers['timezone'] as string) || req.timezone || 'UTC';
    const result = await statisticsService.getVisitCountsByStatus(
        fromDate,
        toDate,
        timezone,
        patientId
    );
    return new SuccessResponse(
        result,
        'Lấy thống kê lượt khám theo trạng thái (patient) thành công'
    ).send(res);
};

const getVisitCountsByYear = async (req: Request, res: Response) => {
    const { year, patientId } = req.query as GetVisitsByYearDto;
    const timezone =
        (req.headers['timezone'] as string) || req.timezone || 'UTC';
    const result = await statisticsService.getVisitCountsByYear(
        Number(year),
        timezone,
        patientId
    );
    return new SuccessResponse(
        result,
        'Lấy thống kê lượt khám theo tháng trong năm (patient) thành công'
    ).send(res);
};

// ADMIN DASHBOARD CONTROLLERS
const getDashboardSummary = async (req: Request, res: Response) => {
    const { date } = req.query as GetDashboardSummaryDto;
    const timezone = req.timezone || 'UTC';
    const result = await statisticsService.getDashboardSummary(timezone, date);
    return new SuccessResponse(
        result,
        'Lấy thống kê dashboard thành công'
    ).send(res);
};
const getStaffByDepartment = async (req: Request, res: Response) => {
    const result = await statisticsService.getStaffByDepartment();
    return new SuccessResponse(
        result,
        'Staff by department retrieved successfully'
    ).send(res);
};
const getRevenueByDayOfWeek = async (req: Request, res: Response) => {
    const { weekStart } = req.query as GetRevenueByDayOfWeekDto;
    const timezone = req.timezone || 'UTC';
    const result = await statisticsService.getRevenueByDayOfWeek(
        timezone,
        weekStart
    );
    return new SuccessResponse(
        result,
        'Lấy doanh thu theo ngày trong tuần thành công'
    ).send(res);
};
const getAppointmentsByDayOfWeek = async (req: Request, res: Response) => {
    const { weekStart } = req.query as GetAppointmentsByDayOfWeekDto;
    const timezone = req.timezone || 'UTC';
    const result = await statisticsService.getAppointmentsByDayOfWeek(
        timezone,
        weekStart
    );
    return new SuccessResponse(
        result,
        'Lấy số lượt khám theo ngày trong tuần thành công'
    ).send(res);
};

// DOCTOR DASHBOARD CONTROLLERS
const getDoctorDashboardSummary = async (req: Request, res: Response) => {
    const doctorId = req.user!.id;
    const timezone = req.timezone!;
    const result = await statisticsService.getDoctorDashboardSummary(
        doctorId,
        timezone
    );
    return new SuccessResponse(
        result,
        'Doctor dashboard summary retrieved successfully'
    ).send(res);
};

const getDoctorAppointmentsByDay = async (req: Request, res: Response) => {
    const doctorId = req.user!.id;
    const timezone = req.timezone!;
    const result = await statisticsService.getDoctorAppointmentsByDay(
        doctorId,
        timezone
    );
    return new SuccessResponse(
        result,
        'Doctor appointments by day retrieved successfully'
    ).send(res);
};

const getDoctorAppointmentStatus = async (req: Request, res: Response) => {
    const doctorId = req.user!.id;
    const timezone = req.timezone!;
    const result = await statisticsService.getDoctorAppointmentStatus(
        doctorId,
        timezone
    );
    return new SuccessResponse(
        result,
        'Doctor appointment status retrieved successfully'
    ).send(res);
};

export default {
    getPatientStatistics,
    getAdminStatistics,
    getPatientsByDepartment,
    getAppointmentsByDoctor,
    getVisitCountsByStatus,
    getVisitCountsByYear,
    getDashboardSummary,
    getStaffByDepartment,
    getRevenueByDayOfWeek,
    getAppointmentsByDayOfWeek,
    getDoctorDashboardSummary,
    getDoctorAppointmentsByDay,
    getDoctorAppointmentStatus,
};
