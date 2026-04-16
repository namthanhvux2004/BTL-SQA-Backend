import prisma from '@src/config/prisma';
import {
    GetListDoctorMedicalServiceDataDto,
    MedicalServiceQueryDataDto,
    CreateMedicalServiceDataDto,
    UpdateMedicalServiceDataDto,
    CreateDoctorServiceDataDto,
} from '@src/dtos/medical-service.dto';
import { PaginatedResponse } from '@src/dtos/common.dto';
import { v4 as uuidv4 } from 'uuid';

class MedicalServiceDao {
    // Truy vấn danh sách dịch vụ y tế với các điều kiện lọc và phân trang
    async getMedicalServices(
        query: MedicalServiceQueryDataDto
    ): Promise<PaginatedResponse<any>> {
        const {
            page = 1,
            limit = 10,
            search,
            departmentId,
            specialization,
            isActive = 1,
            minPrice,
            maxPrice,
            sortBy = 'name',
            sortOrder = 'asc',
        } = query;

        const skip = (page - 1) * limit;
        const whereCondition: any = {};

        if (search) {
            whereCondition.name = {
                contains: search,
                mode: 'insensitive',
            };
        }

        if (departmentId) {
            whereCondition.departmentId = departmentId;
        }

        if (specialization) {
            whereCondition.department = {
                staff: {
                    some: {
                        doctor: {
                            specialization: {
                                contains: specialization,
                                mode: 'insensitive',
                            },
                        },
                    },
                },
            };
        }

        if (isActive !== undefined) {
            whereCondition.isActive = Boolean(isActive);
        }

        if (minPrice !== undefined || maxPrice !== undefined) {
            whereCondition.price = {};
            if (minPrice !== undefined) {
                whereCondition.price.gte = minPrice;
            }
            if (maxPrice !== undefined) {
                whereCondition.price.lte = maxPrice;
            }
        }

        const orderBy: any = {};
        if (
            sortBy === 'name' ||
            sortBy === 'price' ||
            sortBy === 'createdAt' ||
            sortBy === 'updatedAt'
        ) {
            orderBy[sortBy] = sortOrder;
        }

        const total = await prisma.medicalService.count({
            where: whereCondition,
        });

        const services = await prisma.medicalService.findMany({
            where: whereCondition,
            skip,
            take: limit,
            orderBy,
            include: {
                department: true,
                _count: {
                    select: {
                        visitServices: true,
                    },
                },
            },
        });

        const totalPages = Math.max(1, Math.ceil(total / limit));

        return {
            data: services,
            metadata: {
                page,
                limit,
                totalItems: total,
                totalPages,
                hasNext: page < totalPages,
                hasPrev: page > 1,
            },
        };
    }

    // Truy vấn dịch vụ y tế theo ID
    async getMedicalServiceById(id: string) {
        return await prisma.medicalService.findUnique({
            where: { id },
            include: {
                room: true,
                department: {
                    select: {
                        id: true,
                        name: true,
                        code: true,
                        type: true,
                        description: true,
                    },
                },
                _count: {
                    select: {
                        visitServices: true,
                    },
                },
                doctorServices: {
                    where: { isActive: true },
                    include: {
                        doctor: {
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
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });
    }

    // Truy vấn dịch vụ theo khoa/phòng ban (mặc định có phân trang)
    async getServicesByDepartment(
        departmentId: number,
        page: number = 1,
        limit: number = 10
    ): Promise<PaginatedResponse<any>> {
        const skip = (page - 1) * limit;

        const total = await prisma.medicalService.count({
            where: {
                departmentId,
                isActive: true,
            },
        });

        const services = await prisma.medicalService.findMany({
            where: {
                departmentId,
                isActive: true,
            },
            skip,
            take: limit,
            orderBy: {
                name: 'asc',
            },
            include: {
                department: {
                    select: {
                        id: true,
                        name: true,
                        code: true,
                        type: true,
                    },
                },
            },
        });

        const totalPages = Math.max(1, Math.ceil(total / limit));

        return {
            data: services,
            metadata: {
                page,
                limit,
                totalItems: total,
                totalPages,
                hasPrev: page > 1,
                hasNext: page < totalPages,
            },
        };
    }

    // Truy vấn dịch vụ phổ biến theo số lần sử dụng (mặc định có phân trang)
    async getPopularServices(
        page: number = 1,
        limit: number = 10
    ): Promise<PaginatedResponse<any>> {
        // Lấy tổng dùng count để metadata
        const total = await prisma.medicalService.count({
            where: {
                isActive: true,
            },
        });

        const skip = (page - 1) * limit;

        const services = await prisma.medicalService.findMany({
            where: {
                isActive: true,
            },
            include: {
                department: {
                    select: {
                        id: true,
                        name: true,
                        code: true,
                        type: true,
                    },
                },
                _count: {
                    select: {
                        visitServices: true,
                    },
                },
            },
            orderBy: {
                visitServices: {
                    _count: 'desc',
                },
            },
            skip,
            take: limit,
        });

        const totalPages = Math.max(1, Math.ceil(total / limit));

        return {
            data: services,
            metadata: {
                page,
                limit,
                totalItems: total,
                totalPages,
                hasPrev: page > 1,
                hasNext: page < totalPages,
            },
        };
    }

    // Truy vấn dịch vụ theo khoảng giá (mặc định có phân trang)
    async getServicesByPriceRange(
        minPrice: number,
        maxPrice: number,
        page: number = 1,
        limit: number = 10
    ): Promise<PaginatedResponse<any>> {
        const whereCondition: any = {
            isActive: true,
            price: {
                gte: minPrice,
                lte: maxPrice,
            },
        };

        const total = await prisma.medicalService.count({
            where: whereCondition,
        });
        const skip = (page - 1) * limit;

        const services = await prisma.medicalService.findMany({
            where: whereCondition,
            skip,
            take: limit,
            orderBy: {
                price: 'asc',
            },
            include: {
                department: {
                    select: {
                        id: true,
                        name: true,
                        code: true,
                        type: true,
                    },
                },
            },
        });

        const totalPages = Math.max(1, Math.ceil(total / limit));

        return {
            data: services,
            metadata: {
                page,
                limit,
                totalItems: total,
                totalPages,
                hasPrev: page > 1,
                hasNext: page < totalPages,
            },
        };
    }
    async getListDoctorMedicalServices(
        data: GetListDoctorMedicalServiceDataDto
    ): Promise<PaginatedResponse<any>> {
        const pageNum = Number(data.page) || 1;
        const limitNum =
            data.limit === undefined ? undefined : Number(data.limit) || 10;
        const skip = limitNum ? (pageNum - 1) * limitNum : 0;

        const totalCount = await prisma.doctorService.count({
            where: {
                medicalServiceId: data.medicalServiceId,
                isActive: true,
            },
        });

        const findOptions: any = {
            where: {
                medicalServiceId: data.medicalServiceId,
                isActive: true,
            },
            include: {
                doctor: {
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
                            },
                        },
                    },
                },
            },
            orderBy: {
                price: 'asc',
            },
        };

        if (limitNum !== undefined) {
            findOptions.skip = skip;
            findOptions.take = limitNum;
        }

        const doctorServices = await prisma.doctorService.findMany(findOptions);

        const totalPages =
            limitNum === undefined
                ? totalCount === 0
                    ? 0
                    : 1
                : totalCount === 0
                  ? 0
                  : Math.ceil(totalCount / limitNum);

        return {
            data: doctorServices,
            metadata: {
                page: limitNum === undefined ? 1 : pageNum,
                limit: limitNum === undefined ? totalCount : limitNum,
                totalItems: totalCount,
                totalPages,
                hasPrev: limitNum === undefined ? false : pageNum > 1,
                hasNext: limitNum === undefined ? false : pageNum < totalPages,
            },
        };
    }

    async createMedicalService(data: CreateMedicalServiceDataDto) {
        return prisma.$transaction(async (prisma) => {
            const createData: any = {
                id: `MSV-${uuidv4()}`,
                roomId: data.roomId,
                name: data.name,
                description: data.description,
                price: data.price,
                unit: data.unit,
                durationMinutes: data.durationMinutes,
                isActive: data.isActive,
                percentApplyHealthInsurance: data.percentApplyHealthInsurance,
                departmentId: data.departmentId,
            };
            if (data.images) {
                createData.images = data.images;
            }
            const medicalService = await prisma.medicalService.create({
                data: createData,
            });
            return prisma.medicalService.findUnique({
                where: { id: medicalService.id },
                include: {
                    room: true,
                    department: true,
                },
            });
        });
    }
    async updateMedicalService(data: UpdateMedicalServiceDataDto, id: string) {
        return prisma.$transaction(async (prisma) => {
            const updateData: any = {
                roomId: data.roomId,
                name: data.name,
                description: data.description,
                price: data.price,
                unit: data.unit,
                durationMinutes: data.durationMinutes,
                isActive: data.isActive,
                percentApplyHealthInsurance: data.percentApplyHealthInsurance,
                departmentId: data.departmentId,
            };
            if (data.images) {
                updateData.images = data.images;
            }
            const medicalService = await prisma.medicalService.update({
                where: { id: id },
                data: updateData,
            });

            return prisma.medicalService.findUnique({
                where: { id: medicalService.id },
                include: {
                    room: true,
                    department: true,
                },
            });
        });
    }
    async deleteMedicalService(id: string) {
        return prisma.$transaction(async (prisma) => {
            return prisma.medicalService.delete({
                where: { id: id },
            });
        });
    }

    async createDoctorService(data: CreateDoctorServiceDataDto) {
        return prisma.$transaction(async (prisma) => {
            const createData: any = {
                doctorId: data.doctorId,
                medicalServiceId: data.medicalServiceId,
                price: data.price,
                durationMinutes: data.durationMinutes,
                isActive: true,
            };
            const doctorService = await prisma.doctorService.create({
                data: createData,
            });
            return await prisma.medicalService.findUnique({
                where: { id: doctorService.medicalServiceId },
                include: {
                    department: {
                        select: {
                            id: true,
                            name: true,
                            code: true,
                            type: true,
                            description: true,
                        },
                    },
                    _count: {
                        select: {
                            visitServices: true,
                        },
                    },
                    doctorServices: {
                        where: { isActive: true },
                        include: {
                            doctor: {
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
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            });
        });
    }
    async deleteDoctorService(doctorId: string, medicalServiceId: string) {
        return prisma.$transaction(async (prisma) => {
            await prisma.doctorService.delete({
                where: {
                    doctorId_medicalServiceId: {
                        doctorId: doctorId,
                        medicalServiceId: medicalServiceId,
                    },
                },
            });

            return await prisma.medicalService.findUnique({
                where: { id: medicalServiceId },
                include: {
                    department: {
                        select: {
                            id: true,
                            name: true,
                            code: true,
                            type: true,
                            description: true,
                        },
                    },
                    _count: {
                        select: {
                            visitServices: true,
                        },
                    },
                    doctorServices: {
                        where: { isActive: true },
                        include: {
                            doctor: {
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
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            });
        });
    }
}

const medicalServiceDao = new MedicalServiceDao();
export default medicalServiceDao;
