import {
    getListSchedules,
    getScheduleById,
    createSchedule,
    updateSchedule,
    deleteSchedule,
    getListSchedulesAdmin,
} from '@src/daos/schedule.dao';
import {
    GetListSchedulesQueryDataDto,
    CreateScheduleDto,
    UpdateScheduleDto,
} from '@src/dtos/schedule.dto';
import prisma from '@src/config/prisma';
import { setScheduleStatus } from '@src/daos/schedule.dao';
import type { ScheduleStatus } from '@prisma/client';
import { CustomError, ErrorType } from '@src/core/Error';
import { createQueryBuilder } from '@src/helpers/queryBuilder';
import { DateTime } from 'luxon';

const getSchedulesAdmin = async (query: GetListSchedulesQueryDataDto) => {
    try {
        const parsedQuery = await getListSchedulesAdmin(query);
        if (!parsedQuery || parsedQuery.data === null) {
            throw new CustomError(
                ErrorType.NOT_FOUND,
                'Lịch làm việc không tồn tại'
            );
        }
        return parsedQuery;
    } catch (err: any) {
        if (err instanceof CustomError) throw err;
        throw new CustomError(
            ErrorType.INTERNAL_ERROR,
            'Lấy danh sách lịch làm việc thất bại'
        );
    }
};

const getSchedules = async (
    query: GetListSchedulesQueryDataDto,
    staffId: string
) => {
    try {
        const staff = await createQueryBuilder('staff').findUnique({
            userId: staffId,
        });
        if (!staff) {
            throw new CustomError(
                ErrorType.NOT_FOUND,
                'Nhân viên không tồn tại'
            );
        }
        const parsedQuery = await getListSchedules(query, staffId);
        if (!parsedQuery || parsedQuery.data === null) {
            throw new CustomError(
                ErrorType.NOT_FOUND,
                'Lịch làm việc không tồn tại'
            );
        }
        return parsedQuery;
    } catch (err: any) {
        if (err instanceof CustomError) throw err;
        throw new CustomError(
            ErrorType.INTERNAL_ERROR,
            'Lấy danh sách lịch làm việc thất bại'
        );
    }
};
const getScheduleByIdService = async (id: string) => {
    try {
        const schedule = await getScheduleById(id);
        if (!schedule) {
            throw new CustomError(
                ErrorType.NOT_FOUND,
                'Lịch làm việc không tồn tại'
            );
        }
        return schedule;
    } catch (err: any) {
        if (err instanceof CustomError) throw err;
        throw new CustomError(
            ErrorType.INTERNAL_ERROR,
            'Lấy lịch làm việc thất bại'
        );
    }
};
const createScheduleService = async (data: CreateScheduleDto) => {
    try {
        const staff = await createQueryBuilder('staff').findUnique({
            userId: data.staffId,
        });
        if (!staff) {
            throw new CustomError(
                ErrorType.NOT_FOUND,
                'Nhân viên không tồn tại'
            );
        }
        const created = await createSchedule(data);
        return created;
    } catch (err: any) {
        if (err instanceof CustomError) throw err;
        throw new CustomError(
            ErrorType.INTERNAL_ERROR,
            'Tạo lịch làm việc thất bại'
        );
    }
};
const updateScheduleService = async (
    data: UpdateScheduleDto,
    userId: string
) => {
    try {
        const schedule = await getScheduleById(data.id);
        if (!schedule) {
            throw new CustomError(
                ErrorType.NOT_FOUND,
                'Lịch làm việc không tồn tại'
            );
        }
        // kiểm tra ràng buộc lịch phải của nhân viên đó mới được xóa
        if (schedule.staffId !== userId) {
            throw new CustomError(
                ErrorType.FORBIDDEN,
                'Bạn không có quyền sửa lịch làm việc này'
            );
        }
        return updateSchedule(data.id, data);
    } catch (err: any) {
        if (err instanceof CustomError) throw err;
        throw new CustomError(
            ErrorType.INTERNAL_ERROR,
            'Cập nhật lịch làm việc thất bại'
        );
    }
};
const deleteScheduleService = async (id: string, userId: string) => {
    try {
        const schedule = await getScheduleById(id);
        if (!schedule) {
            throw new CustomError(
                ErrorType.NOT_FOUND,
                'Lịch làm việc không tồn tại'
            );
        }
        // kiểm tra ràng buộc lịch phải của nhân viên đó mới được xóa
        if (schedule.staffId !== userId) {
            throw new CustomError(
                ErrorType.FORBIDDEN,
                'Bạn không có quyền xóa lịch làm việc này'
            );
        }
        const deleted = await deleteSchedule(id);
        return deleted;
    } catch (err: any) {
        if (err instanceof CustomError) throw err;
        throw new CustomError(
            ErrorType.INTERNAL_ERROR,
            'Xóa lịch làm việc thất bại'
        );
    }
};
const approveScheduleAdmin = async (id: string, status: ScheduleStatus) => {
    try {
        const schedule = await getScheduleById(id);
        if (!schedule) {
            throw new CustomError(
                ErrorType.NOT_FOUND,
                'Lịch làm việc không tồn tại'
            );
        }
        const updated = await setScheduleStatus(id, status);
        return updated;
    } catch (err: any) {
        if (err instanceof CustomError) throw err;
        throw new CustomError(ErrorType.INTERNAL_ERROR, 'Duyệt lịch thất bại');
    }
};
/**
 * Tính datetime kết thúc thực tế của schedule (xử lý ca qua đêm).
 * schedule.date, schedule.startTime, schedule.endTime đều là Date (DB)
 */
function computeScheduleEndDatetime(schedule: any): Date {
    const tz = 'Asia/Ho_Chi_Minh';

    const dateDt =
        schedule.date instanceof Date
            ? DateTime.fromJSDate(schedule.date, { zone: tz }).startOf('day')
            : DateTime.fromISO(String(schedule.date), { zone: tz }).startOf(
                  'day'
              );

    const stDtRaw =
        schedule.startTime instanceof Date
            ? DateTime.fromJSDate(schedule.startTime, { zone: 'utc' })
            : DateTime.fromISO(String(schedule.startTime), { zone: 'utc' });
    const enDtRaw =
        schedule.endTime instanceof Date
            ? DateTime.fromJSDate(schedule.endTime, { zone: 'utc' })
            : DateTime.fromISO(String(schedule.endTime), { zone: 'utc' });

    const startDt = dateDt.set({
        hour: stDtRaw.hour,
        minute: stDtRaw.minute,
        second: 0,
        millisecond: 0,
    });
    let endDt = dateDt.set({
        hour: enDtRaw.hour,
        minute: enDtRaw.minute,
        second: 0,
        millisecond: 0,
    });

    if (endDt <= startDt) endDt = endDt.plus({ days: 1 });

    return endDt.toUTC().toJSDate();
}

export const completePastSchedules = async () => {
    const now = new Date();

    const since = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const candidates = await prisma.schedule.findMany({
        where: {
            status: 'confirmed',
            date: { gte: since, lte: now },
        },
        select: {
            id: true,
            date: true,
            startTime: true,
            endTime: true,
            status: true,
        },
    });

    const updates: Promise<any>[] = [];

    for (const s of candidates) {
        try {
            const endDt = computeScheduleEndDatetime(s);
            if (endDt.getTime() <= now.getTime()) {
                updates.push(
                    setScheduleStatus(s.id, 'completed' as ScheduleStatus)
                );
                console.log(
                    `[schedules-job] mark completed: ${s.id} end=${endDt.toISOString()} now=${now.toISOString()}`
                );
            }
        } catch (err) {
            console.error('[schedules-job] compute/update error', s.id, err);
        }
    }

    if (updates.length) await Promise.all(updates);
    return { processed: candidates.length, updated: updates.length };
};

export default {
    getSchedulesAdmin,
    getSchedules,
    getScheduleByIdService,
    createScheduleService,
    updateScheduleService,
    deleteScheduleService,
    approveScheduleAdmin,
};
