import prisma from '@src/config/prisma';
import {
    GetAllPatientDataDto,
    GetAllStaffDataDto,
} from '@src/dtos/adminuser.dto';

export const getAllUserDao = async (params: GetAllPatientDataDto) => {
    const page = Math.max(Number(params.page || '1'), 1);
    const limit = Math.max(Number(params.limit || '10'), 1);
    const skip = (page - 1) * limit;
    const search = params.search?.trim() || '';
    const sortBy = params.sortBy || 'createdAt';
    const sortOrder = (params.sortOrder || 'desc') as 'asc' | 'desc';

    const where: any = {
        role: {
            name: 'patient', // Chỉ lấy bệnh nhân
        },
    };

    if (search) {
        where.OR = [
            { username: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
            { phone: { contains: search, mode: 'insensitive' } },
            {
                patient: {
                    patientId: { contains: search, mode: 'insensitive' },
                },
            },
            { name: { firstName: { contains: search, mode: 'insensitive' } } },
            { name: { lastName: { contains: search, mode: 'insensitive' } } },
        ];
    }

    const orderByMap: Record<string, any> = {
        username: { username: sortOrder },
        createdAt: { createdAt: sortOrder },
        updatedAt: { updatedAt: sortOrder },
        email: { email: sortOrder },
    };

    const orderBy = orderByMap[sortBy] ?? { createdAt: sortOrder };

    const [total, data] = await Promise.all([
        prisma.user.count({ where }),
        prisma.user.findMany({
            where,
            skip,
            take: limit,
            orderBy,
            include: {
                role: true,
                name: true,
                address: true,
                patient: {
                    include: {
                        healthInsurances: true,
                        ehr: true,
                        appointments: true,
                        emergencyContacts: true,
                    },
                },
                authentication: true,
            },
        }),
    ]);

    return {
        data,
        metadata: {
            page,
            limit,
            totalItems: total,
            totalPages: Math.ceil(total / limit),
            hasPrev: page > 1,
            hasNext: page * limit < total,
        },
    };
};

export const getAllStaffDao = async (params: GetAllStaffDataDto) => {
    const page = Math.max(Number(params.page || '1'), 1);
    const limit = Math.max(Number(params.limit || '10'), 1);
    const skip = (page - 1) * limit;
    const search = params.search?.trim() || '';
    const sortBy = params.sortBy || 'createdAt';
    const sortOrder = (params.sortOrder || 'desc') as 'asc' | 'desc';
    const role = params.role;
    const where: any = {};
    if (role) {
        where.role = { name: role };
    } else {
        where.role = { NOT: { name: 'patient' } };
    }
    if (search) {
        where.OR = [
            { username: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
            { phone: { contains: search, mode: 'insensitive' } },
            { name: { firstName: { contains: search, mode: 'insensitive' } } },
            { name: { lastName: { contains: search, mode: 'insensitive' } } },
        ];
    }
    const orderByMap: Record<string, any> = {
        username: { username: sortOrder },
        createdAt: { createdAt: sortOrder },
        updatedAt: { updatedAt: sortOrder },
        email: { email: sortOrder },
    };
    const orderBy = orderByMap[sortBy] ?? { createdAt: sortOrder };

    const [total, data] = await Promise.all([
        prisma.user.count({ where }),
        prisma.user.findMany({
            where,
            skip,
            take: limit,
            orderBy,
            include: {
                role: true,
                name: true,
                address: true,
                staff: {
                    include: {
                        department: true,
                        doctor: true,
                    },
                },
                authentication: true,
            },
        }),
    ]);
    return {
        data,
        metadata: {
            page,
            limit,
            totalItems: total,
            totalPages: Math.ceil(total / limit),
            hasPrev: page > 1,
            hasNext: page * limit < total,
        },
    };
};

export const getStaffStatsDao = async () => {
    // Total number of staff (users that have a staff record)
    const total = await prisma.user.count({
        where: { staff: { isNot: null } },
    });

    // Group staff users by roleId for an efficient aggregation
    const groups = await prisma.user.groupBy({
        by: ['roleId'],
        where: { staff: { isNot: null } },
        _count: { roleId: true },
    });

    const roleIds = groups.map((g) => g.roleId);
    const roles =
        roleIds.length > 0
            ? await prisma.role.findMany({ where: { id: { in: roleIds } } })
            : [];

    const byRole: Record<string, number> = {};
    for (const g of groups) {
        const r = roles.find((x) => x.id === g.roleId);
        const roleName = r ? r.name : String(g.roleId);
        byRole[roleName] = g._count.roleId;
    }

    return {
        total,
        byRole,
    };
};

export const getPatientStatsDao = async () => {
    // Single optimized query using Postgres expressions and subqueries to avoid multiple round-trips
    const rows: any = await prisma.$queryRaw`
        SELECT
            COUNT(u.id) AS total,
            SUM(CASE WHEN u.gender = 'male' THEN 1 ELSE 0 END) AS male,
            SUM(CASE WHEN u.gender = 'female' THEN 1 ELSE 0 END) AS female,
            SUM(CASE WHEN u.gender = 'other' THEN 1 ELSE 0 END) AS other,
            SUM(CASE WHEN EXISTS (SELECT 1 FROM health_insurances hi WHERE hi.user_id = u.id) THEN 1 ELSE 0 END) AS with_health_insurance,
            SUM(CASE WHEN EXISTS (SELECT 1 FROM ehrs e WHERE e.patient_id = u.id) THEN 1 ELSE 0 END) AS with_ehr,
            SUM(CASE WHEN EXISTS (SELECT 1 FROM appointments a WHERE a.patient_id = u.id) THEN 1 ELSE 0 END) AS with_appointments,
            SUM(CASE WHEN u.birthday IS NOT NULL AND DATE_PART('year', AGE(now(), u.birthday)) < 18 THEN 1 ELSE 0 END) AS under18,
            SUM(CASE WHEN u.birthday IS NOT NULL AND DATE_PART('year', AGE(now(), u.birthday)) BETWEEN 18 AND 35 THEN 1 ELSE 0 END) AS between_18_35,
            SUM(CASE WHEN u.birthday IS NOT NULL AND DATE_PART('year', AGE(now(), u.birthday)) BETWEEN 36 AND 60 THEN 1 ELSE 0 END) AS between_36_60,
            SUM(CASE WHEN u.birthday IS NOT NULL AND DATE_PART('year', AGE(now(), u.birthday)) >= 61 THEN 1 ELSE 0 END) AS above_60
        FROM users u
        WHERE EXISTS (SELECT 1 FROM patients p WHERE p.user_id = u.id);
    `;

    const row = Array.isArray(rows) && rows.length > 0 ? rows[0] : {};

    return {
        total: Number(row.total || 0),
        byGender: {
            male: Number(row.male || 0),
            female: Number(row.female || 0),
            other: Number(row.other || 0),
        },
        withHealthInsurance: Number(row.with_health_insurance || 0),
        withEhr: Number(row.with_ehr || 0),
        withAppointments: Number(row.with_appointments || 0),
        ageGroups: {
            under18: Number(row.under18 || 0),
            '18-35': Number(row.between_18_35 || 0),
            '36-60': Number(row.between_36_60 || 0),
            '60+': Number(row.above_60 || 0),
        },
    };
};

export default {
    getAllUserDao,
    getAllStaffDao,
    getStaffStatsDao,
    getPatientStatsDao,
};
