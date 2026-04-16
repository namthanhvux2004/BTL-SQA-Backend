import { ForbiddenResponse, SuccessResponse } from '@src/core/ApiResponse';
import {
    CreateVisitDto,
    GetVisitsByDateDto,
    GetVisitsOfDoctorDto,
    GetVisitsOfPatientDto,
    CancelVisitDataDto,
    SearchVisitsDto,
    GetTasksOfDoctorDto,
} from '@src/dtos/visit.dto';
import { endOfDayISO, startOfDayISO } from '@src/helpers/datetime';
import visitService from '@src/services/visit.service';
import { Request, Response } from 'express';
import { DateTime } from 'luxon';

const getVisitsOfPatient = async (
    req: Request<{ patientId: string }, {}, {}, GetVisitsOfPatientDto>,
    res: Response
) => {
    const patientId = req.params.patientId;
    const user = req.user!;

    // check authorization
    if (user.role == 'patient' && user.id !== patientId) {
        return new ForbiddenResponse(
            'Bạn không có quyền truy cập thông tin này'
        ).send(res);
    }

    const visits = await visitService.getVisitsOfPatient(patientId, req.query);
    return new SuccessResponse(
        visits.data,
        'Lấy danh sách lượt khám thành công',
        visits.metadata
    ).send(res);
};

const getVisitsOfDoctor = async (
    req: Request<{ doctorId: string }, {}, {}, GetVisitsOfDoctorDto>,
    res: Response
) => {
    const doctorId = req.params.doctorId;
    const user = req.user!;
    // check authorization
    if (user.role == 'doctor' && user.id !== doctorId) {
        return new ForbiddenResponse(
            'Bạn không có quyền truy cập thông tin này'
        ).send(res);
    }
    const visits = await visitService.getVisitsOfDoctor(doctorId, req.query);
    return new SuccessResponse(
        visits.data,
        'Lấy danh sách lượt khám của bác sĩ thành công',
        visits.metadata
    ).send(res);
};

const getDetailsOfVisit = async (
    req: Request<{ id: string }>,
    res: Response
) => {
    const visitId = req.params.id;
    const user = req.user!;
    const details = await visitService.getDetailsOfVisit(visitId, user);
    return new SuccessResponse(
        details,
        'Lấy chi tiết lượt khám thành công'
    ).send(res);
};

const getVisitStatsByDate = async (
    req: Request<{}, {}, {}, GetVisitsByDateDto>,
    res: Response
) => {
    const tz = req.timezone || 'UTC';
    const startOfDay = startOfDayISO(
        req.query.fromDate
            ? new Date(req.query.fromDate)
            : DateTime.now().setZone(tz).toJSDate(),
        tz
    );
    const endOfDay = endOfDayISO(new Date(req.query.toDate || startOfDay!), tz);
    const stats = await visitService.getVisitStatsByDate(
        startOfDay!,
        endOfDay!
    );
    return new SuccessResponse(stats, 'Lấy thống kê lượt khám thành công').send(
        res
    );
};

const getVisitsByDate = async (
    req: Request<{}, {}, {}, GetVisitsByDateDto>,
    res: Response
) => {
    const userId = req.user!.id;
    const role = req.user!.role;
    if (role === 'doctor' && userId !== req.query.doctorId) {
        return new ForbiddenResponse(
            'Bạn không có quyền truy cập thông tin này'
        ).send(res);
    }
    const visits = await visitService.getVisitsByDate(req.query);
    return new SuccessResponse(
        visits.data,
        'Lấy danh sách lượt khám thành công',
        visits.metadata
    ).send(res);
};

const createVisit = async (
    req: Request<{}, {}, CreateVisitDto>,
    res: Response
) => {
    const visit = await visitService.createVisit(req.body);
    return new SuccessResponse(visit, 'Tạo lượt khám thành công').send(res);
};

// ==================== Visit Management Controllers ====================

/**
 * Get visit summary with all related data
 */
const getVisitSummary = async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!id) {
        throw new Error('Visit ID is required');
    }
    const user = req.user!;

    const summary = await visitService.getVisitSummary(id, user.id, user.role);

    return new SuccessResponse(
        summary,
        'Lấy tổng quan lượt khám thành công'
    ).send(res);
};

/**
 * Complete a visit
 */
const completeVisit = async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!id) {
        throw new Error('Visit ID is required');
    }
    const user = req.user!;

    const visit = await visitService.completeVisit(id, user.id, user.role);

    return new SuccessResponse(visit, 'Hoàn thành lượt khám thành công').send(
        res
    );
};

/**
 * Cancel a visit
 */
const cancelVisit = async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!id) {
        throw new Error('Visit ID is required');
    }
    const user = req.user!;
    const data: CancelVisitDataDto = req.body;

    const visit = await visitService.cancelVisit(id, user.id, user.role, data);

    return new SuccessResponse(visit, 'Hủy lượt khám thành công').send(res);
};

/**
 * Calculate visit cost
 */
const calculateVisitCost = async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!id) {
        throw new Error('Visit ID is required');
    }

    const cost = await visitService.calculateVisitCost(id);

    return new SuccessResponse(
        cost,
        'Tính toán chi phí lượt khám thành công'
    ).send(res);
};

const updateVisitStatus = async (req: Request, res: Response) => {
    const { status } = req.body;
    const { id } = req.params;

    const updatedVisit = await visitService.updateVisitStatus(
        id as string,
        status
    );

    return new SuccessResponse(
        updatedVisit,
        'Cập nhật trạng thái lượt khám thành công'
    ).send(res);
};

const updateNextVisitDate = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { nextVisitDate } = req.body;

    const updatedVisit = await visitService.updateNextVisitDate(
        id as string,
        nextVisitDate
    );

    return new SuccessResponse(
        updatedVisit,
        'Cập nhật ngày tái khám thành công'
    ).send(res);
};

const searchVisits = async (
    req: Request<{}, {}, {}, SearchVisitsDto>,
    res: Response
) => {
    const { patientId, fromDate, toDate, ...queryParams } = req.query;
    const user = req.user!;

    // Check authorization: only admin/doctor can search any patient, patients can only search themselves
    if (user.role === 'patient' && user.id !== patientId) {
        return new ForbiddenResponse(
            'Bạn không có quyền truy cập thông tin này'
        ).send(res);
    }

    const visits = await visitService.searchVisits(patientId, {
        fromDate,
        toDate,
        ...queryParams,
    });

    console.log('visits', visits);

    return new SuccessResponse(
        visits.data,
        'Tìm kiếm lượt khám thành công',
        visits.metadata
    ).send(res);
};

/**
 * Get tasks of doctor - includes direct visits and visits with services doctor can perform
 */
const getTasksOfDoctor = async (
    req: Request<{ doctorId: string }, {}, {}, GetTasksOfDoctorDto>,
    res: Response
) => {
    const doctorId = req.params.doctorId;
    const user = req.user!;

    // Check authorization: doctors can only view their own tasks
    if (user.role === 'doctor' && user.id !== doctorId) {
        return new ForbiddenResponse(
            'Bạn không có quyền truy cập thông tin này'
        ).send(res);
    }

    const tasks = await visitService.getTasksOfDoctor(doctorId, req.query);

    return new SuccessResponse(
        tasks.data,
        'Lấy danh sách công việc của bác sĩ thành công',
        tasks.metadata
    ).send(res);
};

const updateVisitServiceStatus = async (req: Request, res: Response) => {
    const { visitServiceId } = req.params;
    const { status } = req.body;

    const updatedVisitService = await visitService.updateVisitServiceStatus(
        visitServiceId as string,
        status
    );

    return new SuccessResponse(
        updatedVisitService,
        'Cập nhật trạng thái dịch vụ lượt khám thành công'
    ).send(res);
};

export default {
    getVisitsOfPatient,
    getVisitsOfDoctor,
    getDetailsOfVisit,
    getVisitStatsByDate,
    getVisitsByDate,
    createVisit,
    getVisitSummary,
    completeVisit,
    cancelVisit,
    calculateVisitCost,
    updateVisitStatus,
    updateNextVisitDate,
    searchVisits,
    getTasksOfDoctor,
    updateVisitServiceStatus,
};
