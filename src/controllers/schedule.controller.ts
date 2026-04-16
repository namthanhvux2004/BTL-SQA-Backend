import { Request, Response } from 'express';
import { SuccessResponse } from '@src/core/ApiResponse';
import scheduleService from '@src/services/schedule.service';
import {
    GetListSchedulesQueryDataDto,
    CreateScheduleDto,
    UpdateScheduleDto,
} from '@src/dtos/schedule.dto';
import { TokenPayload } from '@src/middleware/auth.middleware';
import { ValidationError } from '@src/core/Error';
import type { ScheduleStatus } from '@prisma/client';

const getListSchedulesAdmin = async (
    req: Request<{}, {}, GetListSchedulesQueryDataDto>,
    res: Response<SuccessResponse<any>>
) => {
    const query = { ...req.query };
    const { data, metadata } = await scheduleService.getSchedulesAdmin(query);
    return new SuccessResponse(
        data,
        'Schedules retrieved successfully',
        metadata
    ).send(res);
};

const getListSchedules = async (
    req: Request<{}, {}, GetListSchedulesQueryDataDto>,
    res: Response<SuccessResponse<any>>
) => {
    const user = req.user as TokenPayload;
    const query = { ...req.query };
    const { data, metadata } = await scheduleService.getSchedules(
        query,
        user.id
    );
    return new SuccessResponse(
        data,
        'Schedules retrieved successfully',
        metadata
    ).send(res);
};
const getScheduleById = async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!id) {
        return new ValidationError([
            { field: 'id', message: 'Medical result ID is required' },
        ]);
    }
    const schedule = await scheduleService.getScheduleByIdService(id);
    return new SuccessResponse(
        schedule,
        'Schedule retrieved successfully'
    ).send(res);
};
const createSchedule = async (
    req: Request<{}, {}, CreateScheduleDto>,
    res: Response<SuccessResponse<any>>
) => {
    const user = req.user as TokenPayload;
    const data = { ...req.body, staffId: user.id };
    const created = await scheduleService.createScheduleService(data);
    return new SuccessResponse(created, 'Schedule created successfully').send(
        res
    );
};
const updateSchedule = async (
    req: Request<{}, {}, UpdateScheduleDto>,
    res: Response<SuccessResponse<any>>
) => {
    const user = req.user as TokenPayload;
    const data = req.body;
    const updated = await scheduleService.updateScheduleService(data, user.id);
    return new SuccessResponse(updated, 'Schedule updated successfully').send(
        res
    );
};
const deleteSchedule = async (req: Request, res: Response) => {
    const user = req.user as TokenPayload;
    const { id } = req.params;
    if (!id) {
        return new ValidationError([
            { field: 'id', message: 'Schedule ID is required' },
        ]);
    }
    await scheduleService.deleteScheduleService(id, user.id);
    return new SuccessResponse(null, 'Schedule deleted successfully').send(res);
};
const approveSchedule = async (
    req: Request<{ id?: string }, {}, ScheduleStatus>,
    res: Response<SuccessResponse<any>>
) => {
    const { id } = req.params;
    if (!id) {
        return new ValidationError([
            { field: 'id', message: 'Schedule ID is required' },
        ]);
    }
    const status = 'confirmed' as ScheduleStatus;
    const updated = await scheduleService.approveScheduleAdmin(id, status);
    return new SuccessResponse(updated, 'Duyệt lịch thành công').send(res);
};

const rejectSchedule = async (
    req: Request<{ id?: string }, {}, ScheduleStatus>,
    res: Response<SuccessResponse<any>>
) => {
    const { id } = req.params;
    if (!id) {
        return new ValidationError([
            { field: 'id', message: 'Schedule ID is required' },
        ]);
    }
    const status = 'cancelled' as ScheduleStatus;
    const updated = await scheduleService.approveScheduleAdmin(id, status);
    return new SuccessResponse(updated, 'Hủy duyệt lịch thành công').send(res);
};

export default {
    getListSchedulesAdmin,
    getListSchedules,
    getScheduleById,
    createSchedule,
    updateSchedule,
    deleteSchedule,
    approveSchedule,
    rejectSchedule,
};
