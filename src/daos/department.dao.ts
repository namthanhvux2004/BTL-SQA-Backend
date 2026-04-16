import prisma from '@src/config/prisma';
import {
    DepartmentQueryDto,
    CreateDepartmentDto,
    UpdateDepartmentDto,
} from '@src/dtos/department.dto';
import { Prisma } from '@prisma/client';
import { PaginatedResponse } from '@src/dtos/common.dto';
import { CustomError, ErrorType } from '@src/core/Error';

// Lấy danh sách khoa với các điều kiện lọc và phân trang
const getDepartments = async (
    query: DepartmentQueryDto
): Promise<PaginatedResponse<any>> => {
    const {
        page = 1,
        limit = 10,
        search,
        type,
        code,
        hasHead,
        hasStaff,
        hasServices,
        sortBy = 'name',
        sortOrder = 'asc',
        includeStats = false,
    } = query;

    // Tính offset cho phân trang
    const offset = (page - 1) * limit;

    // Xây dựng điều kiện WHERE
    const whereCondition: Prisma.DepartmentWhereInput = {};

    // Tìm kiếm theo tên khoa hoặc mô tả
    if (search) {
        whereCondition.OR = [
            { name: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
            { code: { contains: search, mode: 'insensitive' } },
        ];
    }

    // Lọc theo loại khoa
    if (type) {
        whereCondition.type = {
            in: type.split(',').map((t) => t.trim()) as any,
        };
    }

    // Lọc theo mã khoa
    if (code) {
        whereCondition.code = {
            contains: code,
            mode: 'insensitive',
        };
    }

    // Lọc khoa có trưởng khoa
    if (hasHead) {
        whereCondition.headId = hasHead ? { not: null } : null;
    }

    // Lọc khoa có nhân viên
    if (hasStaff) {
        whereCondition.staffs = hasStaff ? { some: {} } : { none: {} };
    }

    // Lọc khoa có dịch vụ y tế
    if (hasServices) {
        whereCondition.medicalServices = hasServices
            ? { some: {} }
            : { none: {} };
    }

    // Xây dựng orderBy
    let orderBy: Prisma.DepartmentOrderByWithRelationInput = {};

    switch (sortBy) {
        case 'name':
            orderBy = { name: sortOrder as 'asc' | 'desc' };
            break;
        case 'code':
            orderBy = { code: sortOrder as 'asc' | 'desc' };
            break;
        case 'type':
            orderBy = { type: sortOrder as 'asc' | 'desc' };
            break;
        case 'createdAt':
            orderBy = { createdAt: sortOrder as 'asc' | 'desc' };
            break;
        case 'staffCount':
            orderBy = { staffs: { _count: sortOrder as 'asc' | 'desc' } };
            break;
        default:
            orderBy = { name: 'asc' };
    }

    // Thực hiện query: lấy danh sách và đếm khoa phù hợp
    const [departments, totalCount] = await Promise.all([
        prisma.department.findMany({
            where: whereCondition,
            orderBy,
            skip: offset,
            take: limit,
            include: {
                head: {
                    include: {
                        user: { include: { name: true } },
                        doctor: true,
                    },
                },
                deputies: {
                    include: {
                        staff: {
                            include: { user: { include: { name: true } } },
                        },
                    },
                },
                room: { include: { building: true } },
                staffs: includeStats ? { include: { doctor: true } } : false,
                medicalServices: false,
                _count: {
                    select: {
                        staffs: true,
                        medicalServices: true,
                    },
                },
            },
        }),
        prisma.department.count({ where: whereCondition }),
    ]);

    const totalPages = Math.max(1, Math.ceil(totalCount / limit));

    return {
        data: departments,
        metadata: {
            page,
            limit,
            totalItems: totalCount,
            totalPages,
            hasPrev: page > 1,
            hasNext: page < totalPages,
        },
    };
};

// Lấy thông tin chi tiết 1 chuyên khoa khám bệnh theo ID
const getDepartmentById = async (id: number | string) => {
    const deptId = typeof id === 'string' ? Number(id) : id;
    const existingDepartment = await prisma.department.findUnique({
        where: { id: deptId },
        select: { id: true, type: true },
    });
    if (!existingDepartment)
        throw new CustomError(ErrorType.NOT_FOUND, 'Khoa không tồn tại');

    const department = await prisma.department.findUnique({
        where: { id: deptId },
        include: {
            head: {
                include: {
                    user: { include: { name: true } },
                    doctor: true,
                },
            },
            deputies: {
                include: {
                    staff: {
                        include: {
                            user: { include: { name: true } },
                            doctor: true,
                        },
                    },
                },
            },
            room: { include: { building: true } },
            staffs: {
                include: {
                    user: { include: { name: true } },
                },
            },
            medicalServices: existingDepartment.type !== 'administrative',
        },
    });

    return department;
};

const createDepartment = async (data: CreateDepartmentDto) => {
    return prisma.$transaction(async (tx) => {
        const createData: any = {
            name: data.name,
            description: data.description,
            code: data.code,
            type: data.type,
            phone: data.phone,
            thumbnail: data.thumbnail,
            images: data.image || [],
            headId: data.headId,
            roomId: data.roomId || null,
        };

        try {
            const created = await tx.department.create({
                data: createData,
            });
            if (data.deputies && data.deputies.length > 0) {
                const ids = Array.from(
                    new Set(data.deputies.map((d) => d?.userId).filter(Boolean))
                ).filter((uid) => uid !== data.headId);

                for (const userId of ids) {
                    await tx.departmentDeputy.upsert({
                        where: { userId },
                        update: { departmentId: created.id },
                        create: {
                            departmentId: created.id,
                            userId,
                        },
                    });
                }
            }
            const department = await tx.department.findUnique({
                where: { id: created.id },
                include: {
                    head: {
                        include: {
                            user: { include: { name: true } },
                            doctor: true,
                        },
                    },
                    deputies: {
                        include: {
                            staff: {
                                include: { user: { include: { name: true } } },
                            },
                        },
                    },
                    room: { include: { building: true } },
                    _count: {
                        select: { staffs: true, medicalServices: true },
                    },
                },
            });

            return department;
        } catch (err: any) {
            if (err?.code === 'P2002') {
                const target = err?.meta?.target ?? [];
                throw new Error(
                    `Duplicate constraint failed on fields: ${Array.isArray(target) ? target.join(', ') : target}`
                );
            }
            throw err;
        }
    });
};

const updateDepartment = async (
    id: number | string,
    data: UpdateDepartmentDto
) => {
    // normalize id to number and validate
    const deptId = typeof id === 'string' ? Number(id) : id;
    if (!Number.isInteger(deptId) || deptId <= 0) {
        throw new Error('Invalid department id');
    }

    try {
        await prisma.$transaction(
            async (tx) => {
                const updateData: any = {
                    name: data.name,
                    description: data.description,
                    code: data.code,
                    type: data.type,
                    phone: data.phone,
                    thumbnail: data.thumbnail,
                    images: data.image ?? undefined,
                    headId: data.headId ?? undefined,
                    roomId: data.roomId ?? undefined,
                };

                if (data.headId) {
                    await tx.department.updateMany({
                        where: { headId: data.headId, id: { not: deptId } },
                        data: { headId: null },
                    });
                }
                if (data.roomId) {
                    await tx.department.updateMany({
                        where: { roomId: data.roomId, id: { not: deptId } },
                        data: { roomId: null },
                    });
                }

                await tx.department.update({
                    where: { id: deptId },
                    data: updateData,
                });

                if (Array.isArray(data.deputies)) {
                    const newIds = Array.from(
                        new Set(
                            data.deputies.map((d) => d?.userId).filter(Boolean)
                        )
                    ).filter((uid) => uid !== data.headId);

                    const current = await tx.departmentDeputy.findMany({
                        where: { departmentId: deptId },
                        select: { userId: true },
                    });
                    const currentIds = current.map((c) => c.userId);

                    const toRemove = currentIds.filter(
                        (u) => !newIds.includes(u)
                    );
                    if (toRemove.length) {
                        await tx.departmentDeputy.deleteMany({
                            where: {
                                departmentId: deptId,
                                userId: { in: toRemove },
                            },
                        });
                    }

                    for (const userId of newIds) {
                        await tx.departmentDeputy.upsert({
                            where: { userId },
                            update: { departmentId: deptId },
                            create: { departmentId: deptId, userId },
                        });
                    }
                }
            },
            { timeout: 10000 }
        );

        // Query data sau khi transaction hoàn thành
        const department = await prisma.department.findUnique({
            where: { id: deptId },
            include: {
                head: {
                    include: {
                        user: { include: { name: true } },
                        doctor: true,
                    },
                },
                deputies: {
                    include: {
                        staff: {
                            include: { user: { include: { name: true } } },
                        },
                    },
                },
                room: { include: { building: true } },
                _count: { select: { staffs: true, medicalServices: true } },
            },
        });
        return department;
    } catch (err: any) {
        if (err?.code === 'P2002') {
            const target = err?.meta?.target ?? [];
            throw new Error(
                `Duplicate constraint failed on fields: ${Array.isArray(target) ? target.join(', ') : target}`
            );
        }
        if (err?.code === 'P2025') {
            throw new Error('Khoa không tồn tại');
        }
        throw err;
    }
};

const deleteDepartment = async (id: number | string) => {
    const deptId = typeof id === 'string' ? Number(id) : id;
    if (!Number.isInteger(deptId) || deptId <= 0) {
        throw new Error('Invalid department id');
    }

    return prisma
        .$transaction(async (tx) => {
            await tx.departmentDeputy.deleteMany({
                where: { departmentId: deptId },
            });

            const [staffCount, svcCount] = await Promise.all([
                tx.staff.count({ where: { departmentId: deptId } }),
                tx.medicalService.count({ where: { departmentId: deptId } }),
            ]);

            if (staffCount > 0 || svcCount > 0) {
                throw new Error(
                    'Không thể xóa khoa: còn nhân viên hoặc dịch vụ liên quan. Vui lòng gán lại hoặc xóa phụ thuộc trước khi xóa khoa.'
                );
            }

            const deleted = await tx.department.delete({
                where: { id: deptId },
            });
            return deleted;
        })
        .catch((err: any) => {
            if (err?.code === 'P2003' || err?.code === 'P2014') {
                throw new Error(
                    'Không thể xóa khoa do ràng buộc khoá ngoại. Vui lòng dọn sạch phụ thuộc trước.'
                );
            }
            throw err;
        });
};

const getDepartmentByCode = async (code: string) => {
    return await prisma.department.findUnique({
        where: {
            code: code,
        },
        include: {
            head: {
                include: {
                    user: {
                        include: {
                            name: true,
                        },
                    },
                    doctor: true,
                },
            },
            deputies: {
                include: {
                    staff: {
                        include: {
                            user: {
                                include: {
                                    name: true,
                                },
                            },
                        },
                    },
                },
            },
            staffs: {
                include: {
                    doctor: true,
                },
            },
            medicalServices: true,
        },
    });
};

// Lấy danh sách khoa theo loại
const getDepartmentsByType = async (
    type: 'clinical' | 'paraclinical' | 'administrative'
): Promise<PaginatedResponse<any>> => {
    const departments = await prisma.department.findMany({
        where: {
            type: type,
        },
        include: {
            head: {
                include: {
                    user: {
                        include: {
                            name: true,
                        },
                    },
                },
            },
            _count: {
                select: {
                    staffs: true,
                    medicalServices: true,
                },
            },
        },
        orderBy: {
            name: 'asc',
        },
    });

    const totalItems = departments.length;
    return {
        data: departments,
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

// Lấy thống kê khoa theo loại
const getDepartmentStatsByType = async () => {
    const stats = await prisma.department.groupBy({
        by: ['type'],
        _count: {
            type: true,
        },
        orderBy: {
            _count: {
                type: 'desc',
            },
        },
    });

    const total = await prisma.department.count();

    return stats.map((stat) => ({
        type: stat.type,
        count: stat._count.type,
        percentage: Math.round((stat._count.type / total) * 100),
    }));
};

// Lấy thống kê nhân viên theo khoa
const getStaffStatsByDepartment = async () => {
    const departments = await prisma.department.findMany({
        select: {
            id: true,
            name: true,
            staffs: {
                select: {
                    userId: true,
                    doctor: {
                        select: {
                            userId: true,
                            experienceYears: true,
                        },
                    },
                },
            },
        },
    });

    return departments.map((dept) => ({
        departmentId: dept.id,
        departmentName: dept.name,
        staffCount: dept.staffs.length,
        doctorCount: dept.staffs.filter((s) => s.doctor).length,
        averageExperience:
            dept.staffs
                .filter((s) => s.doctor)
                .reduce((sum, s) => sum + (s.doctor?.experienceYears || 0), 0) /
            Math.max(dept.staffs.filter((s) => s.doctor).length, 1),
    }));
};

// Lấy thống kê dịch vụ theo khoa
const getServiceStatsByDepartment = async () => {
    const departments = await prisma.department.findMany({
        select: {
            id: true,
            name: true,
            medicalServices: {
                select: {
                    id: true,
                    price: true,
                    isActive: true,
                },
            },
        },
    });

    return departments.map((dept) => ({
        departmentId: dept.id,
        departmentName: dept.name,
        serviceCount: dept.medicalServices.length,
        activeServiceCount: dept.medicalServices.filter((s) => s.isActive)
            .length,
        totalServiceValue: dept.medicalServices.reduce(
            (sum, s) => sum + s.price,
            0
        ),
    }));
};

// Tìm kiếm khoa theo từ khóa
const searchDepartments = async (
    searchTerm: string
): Promise<PaginatedResponse<any>> => {
    const departments = await prisma.department.findMany({
        where: {
            OR: [
                { name: { contains: searchTerm, mode: 'insensitive' } },
                { description: { contains: searchTerm, mode: 'insensitive' } },
                { code: { contains: searchTerm, mode: 'insensitive' } },
            ],
        },
        include: {
            head: {
                include: {
                    user: {
                        include: {
                            name: true,
                        },
                    },
                },
            },
            _count: {
                select: {
                    staffs: true,
                    medicalServices: true,
                },
            },
        },
        orderBy: [{ name: 'asc' }],
    });

    const totalItems = departments.length;
    return {
        data: departments,
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

// Lấy danh sách khoa có dịch vụ y tế
const getDepartmentsWithServices = async (): Promise<
    PaginatedResponse<any>
> => {
    const departments = await prisma.department.findMany({
        where: {
            medicalServices: {
                some: {
                    isActive: true,
                },
            },
        },
        include: {
            medicalServices: {
                where: {
                    isActive: true,
                },
                select: {
                    id: true,
                    name: true,
                    price: true,
                },
            },
            _count: {
                select: {
                    medicalServices: true,
                },
            },
        },
        orderBy: {
            name: 'asc',
        },
    });

    const totalItems = departments.length;
    return {
        data: departments,
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

export default {
    getDepartments,
    getDepartmentById,
    createDepartment,
    updateDepartment,
    deleteDepartment,
    getDepartmentByCode,
    getDepartmentsByType,
    getDepartmentStatsByType,
    getStaffStatsByDepartment,
    getServiceStatsByDepartment,
    searchDepartments,
    getDepartmentsWithServices,
};
