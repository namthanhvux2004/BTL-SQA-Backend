import prisma from '@src/config/prisma';
import { DoctorQueryDto } from '@src/dtos/doctor.dto';
import { Prisma } from '@prisma/client';
import { PaginatedResponse } from '@src/dtos/common.dto';
import { PaginationQuery } from '@src/types';
import { createQueryBuilder } from '@src/helpers/queryBuilder';

// Lấy danh sách bác sĩ với các điều kiện lọc và phân trang
const getDoctors = async (query: DoctorQueryDto) => {
    const {
        page = 1,
        limit,
        search,
        specialization,
        level,
        medicalServiceId,
        departmentId,
        minExperience,
        maxExperience,
        sortBy = 'name',
        sortOrder = 'asc',
    } = query;

    // Build where condition
    const whereCondition: Prisma.DoctorWhereInput = {};
    const staffCondition: any = {};

    if (search) {
        staffCondition.user = {
            OR: [
                {
                    name: {
                        OR: [
                            {
                                firstName: {
                                    contains: search,
                                    mode: 'insensitive',
                                },
                            },
                            {
                                lastName: {
                                    contains: search,
                                    mode: 'insensitive',
                                },
                            },
                        ],
                    },
                },
                { username: { contains: search, mode: 'insensitive' } },
            ],
        };
    }

    if (departmentId) {
        staffCondition.departmentId = departmentId;
    }

    if (medicalServiceId) {
        // Find doctors that provide the specified medical service and the doctorService entry is active
        // Use `some` with both conditions so that at least one doctorService matches
        whereCondition.doctorServices = {
            some: { medicalServiceId: medicalServiceId, isActive: true },
        } as any;
    }

    if (Object.keys(staffCondition).length > 0) {
        whereCondition.staff = staffCondition;
    }

    if (specialization) {
        whereCondition.specialization = {
            contains: specialization,
            mode: 'insensitive',
        };
    }

    if (level) {
        whereCondition.level = level;
    }

    if (minExperience !== undefined || maxExperience !== undefined) {
        const experienceFilter: any = {};
        if (minExperience !== undefined) experienceFilter.gte = minExperience;
        if (maxExperience !== undefined) experienceFilter.lte = maxExperience;
        if (Object.keys(experienceFilter).length > 0) {
            whereCondition.experienceYears = experienceFilter;
        }
    }

    // Build orderBy mapping: preserve complex nested mappings
    let orderBy: Prisma.DoctorOrderByWithRelationInput = {} as any;
    switch (sortBy) {
        case 'name':
            orderBy = {
                staff: {
                    user: { name: { lastName: sortOrder as 'asc' | 'desc' } },
                },
            } as any;
            break;
        case 'experienceYears':
            orderBy = { experienceYears: sortOrder as 'asc' | 'desc' } as any;
            break;
        case 'level':
            orderBy = { level: sortOrder as 'asc' | 'desc' } as any;
            break;
        case 'specialization':
            orderBy = { specialization: sortOrder as 'asc' | 'desc' } as any;
            break;
        case 'createdAt':
            orderBy = {
                staff: { user: { createdAt: sortOrder as 'asc' | 'desc' } },
            } as any;
            break;
        default:
            orderBy = { experienceYears: 'desc' } as any;
    }

    // If sortBy is nested (name or createdAt), pass undefined to pagination.sortBy
    // so QueryBuilder doesn't add a top-level invalid orderBy field
    const qbSortBy =
        sortBy === 'name' || sortBy === 'createdAt' ? undefined : sortBy;
    const pagination: PaginationQuery = {
        page: String(page),
        limit: limit ? String(limit) : undefined,
        sortBy: qbSortBy ?? '',
        sortOrder: sortOrder,
        search: '',
    };

    const queryBuilder = createQueryBuilder('doctor');

    const result = await queryBuilder.findManyWithPagination(
        {
            where: whereCondition,
            orderBy,
            include: {
                staff: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                username: true,
                                email: true,
                                avatar: true,
                                phone: true,
                                createdAt: true,
                                name: {
                                    select: {
                                        firstName: true,
                                        lastName: true,
                                    },
                                },
                            },
                        },
                        department: true,
                    },
                },
            },
        },
        pagination
    );

    return result;
};

// Lấy thông tin bác sĩ theo ID
const getDoctorById = async (id: string) => {
    return await prisma.doctor.findUnique({
        where: {
            userId: id,
        },
        include: {
            staff: {
                include: {
                    user: {
                        select: {
                            id: true,
                            username: true,
                            email: true,
                            avatar: true,
                            phone: true,
                            createdAt: true,
                            name: {
                                select: {
                                    firstName: true,
                                    lastName: true,
                                },
                            },
                        },
                    },
                    department: true,
                },
            },
            medicalRecords: {
                select: {
                    id: true,
                    createdAt: true,
                },
                orderBy: {
                    createdAt: 'desc',
                },
            },
        },
    });
};

// Lấy danh sách bác sĩ theo chuyên khoa
const getDoctorsBySpecialization = async (
    specialization: string
): Promise<PaginatedResponse<any>> => {
    const doctors = await prisma.doctor.findMany({
        where: {
            specialization: {
                contains: specialization,
                mode: 'insensitive',
            },
        },
        include: {
            staff: {
                include: {
                    user: {
                        select: {
                            id: true,
                            username: true,
                            email: true,
                            avatar: true,
                            phone: true,
                            createdAt: true,
                            name: {
                                select: {
                                    firstName: true,
                                    lastName: true,
                                },
                            },
                        },
                    },
                    department: true,
                },
            },
        },
        orderBy: {
            experienceYears: 'desc',
        },
    });

    const totalItems = doctors.length;

    return {
        data: doctors,
        metadata: {
            page: 1,
            limit: totalItems,
            totalItems,
            totalPages: 1,
            hasPrev: false,
            hasNext: false,
        },
    };
};

// Lấy danh sách bác sĩ theo khoa
const getDoctorsByDepartment = async (
    departmentId: number,
    query: PaginationQuery
) => {
    const pagination: PaginationQuery = {
        page: query.page || '1',
        limit: query.limit,
        sortBy: query.sortBy || 'experienceYears',
        sortOrder: query.sortOrder || 'desc',
    };
    const queryBuilder = createQueryBuilder('doctor');
    return await queryBuilder.findManyWithPagination(
        {
            where: {
                staff: {
                    departmentId: departmentId,
                },
            },
            include: {
                staff: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                username: true,
                                email: true,
                                avatar: true,
                                phone: true,
                                createdAt: true,
                                name: {
                                    select: {
                                        firstName: true,
                                        lastName: true,
                                    },
                                },
                            },
                        },
                        department: true,
                    },
                },
            },
        },
        pagination
    );
};

// Lấy danh sách bác sĩ hàng đầu (theo kinh nghiệm)
const getTopDoctors = async (
    options: {
        page?: string | number;
        limit?: string | number;
        sortBy?: string;
        sortOrder?: 'asc' | 'desc';
    } = {}
) => {
    const {
        page = 1,
        limit = 10,
        sortBy = 'experienceYears',
        sortOrder = 'desc',
    } = options as any;

    const pageNum =
        Number.isFinite(Number(page)) && Number(page) > 0
            ? Math.floor(Number(page))
            : 1;
    let limitNum =
        Number.isFinite(Number(limit)) && Number(limit) > 0
            ? Math.floor(Number(limit))
            : 10;
    if (limitNum > 100) limitNum = 100;
    const skip = (pageNum - 1) * limitNum;

    const where: Prisma.DoctorWhereInput = {};
    const [totalCount, doctors] = await Promise.all([
        prisma.doctor.count({ where }),
        prisma.doctor.findMany({
            where,
            orderBy: { [sortBy]: sortOrder },
            skip,
            take: limitNum,
            include: {
                staff: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                username: true,
                                email: true,
                                avatar: true,
                                phone: true,
                                createdAt: true,
                                name: {
                                    select: {
                                        firstName: true,
                                        lastName: true,
                                    },
                                },
                            },
                        },
                        department: true,
                    },
                },
            },
        }),
    ]);

    const totalPages = Math.max(1, Math.ceil(totalCount / limitNum));

    return {
        data: doctors,
        metadata: {
            page: pageNum,
            limit: limitNum,
            totalItems: totalCount,
            totalPages,
            hasPrev: pageNum > 1,
            hasNext: pageNum < totalPages,
        },
    };
};

// Lấy thống kê bác sĩ theo chuyên khoa
const getDoctorStatsBySpecialization = async () => {
    const stats = await prisma.doctor.groupBy({
        by: ['specialization'],
        _count: {
            specialization: true,
        },
        orderBy: {
            _count: {
                specialization: 'desc',
            },
        },
    });

    const total = await prisma.doctor.count();

    return stats.map((stat) => ({
        specialization: stat.specialization,
        count: stat._count.specialization,
        percentage: Math.round((stat._count.specialization / total) * 100),
    }));
};

// Lấy thống kê bác sĩ theo cấp độ
const getDoctorStatsByLevel = async () => {
    const stats = await prisma.doctor.groupBy({
        by: ['level'],
        _count: {
            level: true,
        },
        orderBy: {
            _count: {
                level: 'desc',
            },
        },
    });

    const total = await prisma.doctor.count();

    return stats.map((stat) => ({
        level: stat.level,
        count: stat._count.level,
        percentage: Math.round((stat._count.level / total) * 100),
    }));
};

// Lấy thống kê bác sĩ theo khoa
const getDoctorStatsByDepartment = async () => {
    const stats = await prisma.doctor.findMany({
        select: {
            staff: {
                select: {
                    department: {
                        select: {
                            name: true,
                        },
                    },
                },
            },
        },
    });

    const departmentCounts: { [key: string]: number } = {};
    stats.forEach((doctor) => {
        const deptName = doctor.staff.department.name;
        departmentCounts[deptName] = (departmentCounts[deptName] || 0) + 1;
    });

    const total = stats.length;

    return Object.entries(departmentCounts)
        .map(([department, count]) => ({
            department,
            count,
            percentage: Math.round((count / total) * 100),
        }))
        .sort((a, b) => b.count - a.count);
};

// Lấy thống kê kinh nghiệm bác sĩ
const getDoctorExperienceStats = async () => {
    const doctors = await prisma.doctor.findMany({
        select: {
            experienceYears: true,
        },
    });

    const experiences = doctors.map((d) => d.experienceYears);
    const total = experiences.length;
    const sum = experiences.reduce((a, b) => a + b, 0);
    const average = total > 0 ? Math.round(sum / total) : 0;
    const min = experiences.length > 0 ? Math.min(...experiences) : 0;
    const max = experiences.length > 0 ? Math.max(...experiences) : 0;

    // Phân phối kinh nghiệm theo khoảng
    const distribution = [
        { range: '0-2 năm', count: experiences.filter((e) => e <= 2).length },
        {
            range: '3-5 năm',
            count: experiences.filter((e) => e >= 3 && e <= 5).length,
        },
        {
            range: '6-10 năm',
            count: experiences.filter((e) => e >= 6 && e <= 10).length,
        },
        {
            range: '11-15 năm',
            count: experiences.filter((e) => e >= 11 && e <= 15).length,
        },
        { range: '16+ năm', count: experiences.filter((e) => e >= 16).length },
    ];

    return {
        average,
        min,
        max,
        distribution,
    };
};

export default {
    getDoctors,
    getDoctorById,
    getDoctorsBySpecialization,
    getDoctorsByDepartment,
    getTopDoctors,
    getDoctorStatsBySpecialization,
    getDoctorStatsByLevel,
    getDoctorStatsByDepartment,
    getDoctorExperienceStats,
};
