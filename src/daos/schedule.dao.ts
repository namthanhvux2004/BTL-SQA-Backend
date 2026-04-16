import prisma from '@src/config/prisma';
import {
    GetListSchedulesQueryDataDto,
    CreateScheduleDto,
    UpdateScheduleDto,
} from '@src/dtos/schedule.dto';
import type { ScheduleStatus } from '@prisma/client';
import { startOfMonth, addMonths, parse, parseISO, isValid } from 'date-fns';

const parseDateString = (v: any): Date | null => {
    if (!v) return null;
    if (v instanceof Date) return v;
    const s = String(v).trim();

    if (/^\d{1,2}[-/]\d{1,2}[-/]\d{4}$/.test(s)) {
        const d = parse(s.replace(/\//g, '-'), 'dd-MM-yyyy', new Date());
        if (isValid(d)) {
            const year = d.getFullYear();
            const month = d.getMonth(); // 0-based
            const day = d.getDate();
            return new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
        }
        return null;
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
        const d = parse(s, 'yyyy-MM-dd', new Date());
        if (isValid(d)) {
            const year = d.getFullYear();
            const month = d.getMonth();
            const day = d.getDate();
            return new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
        }
        return null;
    }
    try {
        const d = parseISO(s);
        if (isValid(d)) return d;
    } catch {
        return null;
    }

    return null;
};

const toDate = (v: any) =>
    v instanceof Date ? v : v ? new Date(String(v)) : v;

export const getListSchedulesAdmin = async (
    query: GetListSchedulesQueryDataDto
) => {
    const page = query.page ? parseInt(String(query.page), 10) : 1;
    const limitNum =
        query.limit === undefined
            ? undefined
            : parseInt(String(query.limit), 10) || 10;
    const offset = limitNum ? (page - 1) * limitNum : 0;

    const provided = parseDateString(query.date);
    const base = provided ?? new Date();
    const startOfMon = startOfMonth(base);
    const monthStart = new Date(
        Date.UTC(
            startOfMon.getUTCFullYear(),
            startOfMon.getUTCMonth() + 1,
            1,
            0,
            0,
            0,
            0
        )
    );
    const nextMonthStart = addMonths(startOfMon, 1);
    const monthEnd = new Date(
        Date.UTC(
            nextMonthStart.getUTCFullYear(),
            nextMonthStart.getUTCMonth() + 1,
            1,
            0,
            0,
            0,
            0
        )
    );
    const [totalCount, data] = await prisma.$transaction(async (tx) => {
        const whereBase: any = {
            date: {
                gte: monthStart,
                lt: monthEnd,
            },
        };
        if (query.doctorId) {
            whereBase.staffId = query.doctorId;
        }
        const total = await tx.schedule.count({
            where: whereBase,
        });

        const findOptions: any = {
            where: whereBase,
            orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
            include: {
                room: true,
                department: true,
                staff: true,
            },
        };

        if (limitNum !== undefined) {
            findOptions.skip = offset;
            findOptions.take = limitNum;
        }

        const items = await tx.schedule.findMany(findOptions);
        return [total, items];
    });

    const totalPages =
        limitNum === undefined
            ? totalCount === 0
                ? 0
                : 1
            : Math.max(1, Math.ceil(totalCount / limitNum));

    return {
        data,
        metadata: {
            page: limitNum === undefined ? 1 : page,
            limit: limitNum === undefined ? totalCount : limitNum,
            totalItems: totalCount,
            totalPages,
            hasPrev: limitNum === undefined ? false : page > 1,
            hasNext: limitNum === undefined ? false : page < totalPages,
        },
    };
};

export const getListSchedules = async (
    query: GetListSchedulesQueryDataDto,
    staffId: string
) => {
    if (!staffId) {
        return {
            data: [],
            metadata: {
                page: 1,
                limit: 0,
                totalItems: 0,
                totalPages: 0,
                hasPrev: false,
                hasNext: false,
            },
        };
    }

    const page = query.page ? parseInt(String(query.page), 10) : 1;
    const limitNum =
        query.limit === undefined
            ? undefined
            : parseInt(String(query.limit), 10) || 10;
    const offset = limitNum ? (page - 1) * limitNum : 0;

    const provided = parseDateString(query.date);
    const base = provided ?? new Date();
    const startOfMon = startOfMonth(base);
    const monthStart = new Date(
        Date.UTC(
            startOfMon.getUTCFullYear(),
            startOfMon.getUTCMonth() + 1,
            1,
            0,
            0,
            0,
            0
        )
    );
    const nextMonthStart = addMonths(startOfMon, 1);
    const monthEnd = new Date(
        Date.UTC(
            nextMonthStart.getUTCFullYear(),
            nextMonthStart.getUTCMonth() + 1,
            1,
            0,
            0,
            0,
            0
        )
    );

    const [totalCount, data] = await prisma.$transaction(async (tx) => {
        const whereBase: any = {
            staffId,
            date: {
                gte: monthStart,
                lt: monthEnd,
            },
        };

        const total = await tx.schedule.count({
            where: whereBase,
        });

        const findOptions: any = {
            where: whereBase,
            orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
            include: {
                room: true,
                department: true,
                staff: true,
            },
        };

        if (limitNum !== undefined) {
            findOptions.skip = offset;
            findOptions.take = limitNum;
        }

        const items = await tx.schedule.findMany(findOptions);
        return [total, items];
    });

    const totalPages =
        limitNum === undefined
            ? totalCount === 0
                ? 0
                : 1
            : Math.max(1, Math.ceil(totalCount / limitNum));

    return {
        data,
        metadata: {
            page: limitNum === undefined ? 1 : page,
            limit: limitNum === undefined ? totalCount : limitNum,
            totalItems: totalCount,
            totalPages,
            hasPrev: limitNum === undefined ? false : page > 1,
            hasNext: limitNum === undefined ? false : page < totalPages,
        },
    };
};

export const getScheduleById = async (id: string) => {
    return prisma.$transaction(async (tx) => {
        return tx.schedule.findUnique({
            where: { id },
            include: {
                room: true,
                department: true,
                staff: true,
            },
        });
    });
};

export const createSchedule = async (data: CreateScheduleDto) => {
    if (data === null) return [];
    return prisma.$transaction(async (tx) => {
        const createData: any = {
            staffId: data.staffId,
            departmentId: data.departmentId,
            type: data.type,
            roomId: data.roomId,
            date: parseDateString(data.date) || new Date(data.date),
            status: data.status,
            startTime: data.startTime,
            endTime: data.endTime,
        };

        // Only set maxSlot if explicitly provided, let Prisma set null otherwise
        if (data.maxSlot !== undefined) {
            createData.maxSlot = data.maxSlot;
        }

        return tx.schedule.create({
            data: createData,
        });
    });
};

export const updateSchedule = async (id: string, data: UpdateScheduleDto) => {
    return prisma.$transaction(async (tx) => {
        const updateData: any = { ...data };
        if (updateData.maxSlot === undefined) delete updateData.maxSlot;
        if (updateData.date !== undefined)
            updateData.date =
                parseDateString(updateData.date) || new Date(updateData.date);
        if (updateData.startTime !== undefined)
            updateData.startTime =
                parseDateString(updateData.startTime) ||
                toDate(updateData.startTime);
        if (updateData.endTime !== undefined)
            updateData.endTime =
                parseDateString(updateData.endTime) ||
                toDate(updateData.endTime);

        return tx.schedule.update({
            where: { id },
            data: updateData,
        });
    });
};

export const deleteSchedule = async (id: string) => {
    return prisma.$transaction(async (tx) => {
        return tx.schedule.delete({
            where: { id },
        });
    });
};

export const setScheduleStatus = async (id: string, status: ScheduleStatus) => {
    return prisma.$transaction(async (tx) => {
        return tx.schedule.update({
            where: { id },
            data: { status },
        });
    });
};
