import { Prisma } from '@prisma/client';
import prisma from '@config/prisma';
import {
    CreateHealthInfoDataDto,
    UpdateHealthInfoDataDto,
} from '@src/dtos/ehr.dto';
import { createQueryBuilder } from '@utils/queryBuilder';
import { PaginationQuery } from '@src/types';
import { CustomError, ErrorType } from '@src/core/Error';

// Define a reusable include object with the correct Prisma type to avoid duplication
const ehrInclude: Prisma.EHRInclude = {
    patient: {
        include: {
            user: {
                select: {
                    id: true,
                    username: true,
                    email: true,
                    avatar: true,
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
    visits: {
        orderBy: {
            createdAt: 'desc',
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
            prescriptions: {
                include: {
                    medicineUsages: {
                        include: {
                            medicine: {
                                select: {
                                    id: true,
                                    name: true,
                                    description: true,
                                    unit: true,
                                },
                            },
                        },
                    },
                },
            },
            visitServices: {
                include: {
                    medicalService: {
                        select: {
                            id: true,
                            name: true,
                            description: true,
                            unit: true,
                        },
                    },
                },
            },
            medicalRecords: true,
        },
    },
};

// Lấy EHR theo patientId (Refactored)
export const findEHRByPatientId = async (patientId: string) => {
    return prisma.eHR.findFirst({
        where: { patientId },
        include: ehrInclude,
    });
};

// Lấy EHR theo ehrId (Refactored)
export const findEHRById = async (ehrId: string) => {
    return prisma.eHR.findFirst({
        where: { id: ehrId },
        include: ehrInclude,
    });
};

// Lấy thông tin sức khoẻ của bệnh nhân theo patientId
export const findHealthInfoByPatientId = async (patientId: string) => {
    const patient = await prisma.patient.findFirst({
        where: { patientId: patientId },
    });

    if (!patient) {
        throw new CustomError(ErrorType.NOT_FOUND, 'Bệnh nhân không tồn tại');
    }

    return prisma.healthInformation.findFirst({
        where: { patientId: patient.userId },
    });
};

// Tạo mới thông tin sức khoẻ của bệnh nhân
export const createHealthInfoByPatientId = async (
    patientId: string,
    data: CreateHealthInfoDataDto
) => {
    return prisma.healthInformation.create({
        data: {
            patientId,
            ...data,
            createdAt: new Date(),
            updatedAt: new Date(),
        },
    });
};

// Cập nhật thông tin sức khoẻ của bệnh nhân theo patientId
export const updateHealthInfoByPatientId = async (
    patientId: string,
    data: UpdateHealthInfoDataDto
) => {
    return prisma.healthInformation.update({
        where: { patientId },
        data: {
            ...(data.weight !== undefined && { weight: { set: data.weight } }),
            ...(data.height !== undefined && { height: { set: data.height } }),
            ...(data.bloodType !== undefined && {
                bloodType: { set: data.bloodType },
            }),
            ...(data.has_high_blood_pressure !== undefined && {
                has_high_blood_pressure: { set: data.has_high_blood_pressure },
            }),
            ...(data.has_diabetes !== undefined && {
                has_diabetes: { set: data.has_diabetes },
            }),
            ...(data.has_allergies !== undefined && {
                has_allergies: { set: data.has_allergies },
            }),
            ...(data.has_cancer !== undefined && {
                has_cancer: { set: data.has_cancer },
            }),
            updatedAt: new Date(),
        },
    });
};

// Tạo EHR mới cho bệnh nhân theo patientId
export const createEHRForPatient = async (patientId: string) => {
    // Kiểm tra xem bệnh nhân đã có EHR chưa
    const existingEHR = await prisma.eHR.findFirst({
        where: { patientId },
    });

    if (existingEHR) {
        throw new Error('Bệnh nhân đã có hồ sơ bệnh án');
    }

    // Kiểm tra xem bệnh nhân có tồn tại không
    const patient = await prisma.patient.findFirst({
        where: { userId: patientId },
    });

    if (!patient) {
        throw new Error('Bệnh nhân không tồn tại');
    }

    return prisma.eHR.create({
        data: {
            patientId,
            createdAt: new Date(),
        },
        include: {
            patient: {
                include: {
                    user: {
                        select: {
                            id: true,
                            username: true,
                            email: true,
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
    });
};

// Xoá EHR theo ehrId (chặn xoá nếu đã có MedicalRecord)
export const deleteEHRById = async (ehrId: string) => {
    const existVisit = await prisma.visit.findFirst({
        where: { ehrId: ehrId },
        select: { id: true },
    });

    if (existVisit) {
        throw new Error('EHR has medical results, cannot delete');
    }

    const ehr = await prisma.eHR.findFirst({
        where: { id: ehrId },
    });

    if (!ehr) {
        throw new Error('Hồ sơ bệnh án không tồn tại');
    }

    return prisma.eHR.delete({
        where: { id: ehrId },
    });
};

// Get list EHR với phân trang
export const getListEHRs = async (options: {
    page?: string;
    limit?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    search?: string | undefined;
    patientId?: string | undefined;
}) => {
    const queryBuilder = createQueryBuilder('eHR');

    const pagination: PaginationQuery = {
        page: options.page || '1',
        limit: options.limit || '10',
        sortBy: options.sortBy || 'createdAt',
        sortOrder: options.sortOrder || 'desc',
        search: options.search || '',
    };

    const whereCondition: any = {};
    // Lọc theo patientId nếu có
    if (options.patientId) {
        whereCondition.patientId = options.patientId;
    }

    // Tìm kiếm theo tên bệnh nhân
    if (options.search) {
        whereCondition.patient = {
            user: {
                OR: [
                    {
                        name: {
                            OR: [
                                {
                                    firstName: {
                                        contains: options.search,
                                        mode: 'insensitive',
                                    },
                                },
                                {
                                    lastName: {
                                        contains: options.search,
                                        mode: 'insensitive',
                                    },
                                },
                            ],
                        },
                    },
                    {
                        username: {
                            contains: options.search,
                            mode: 'insensitive',
                        },
                    },
                    {
                        email: {
                            contains: options.search,
                            mode: 'insensitive',
                        },
                    },
                ],
            },
        };
    }

    return await queryBuilder.findManyWithPagination(
        {
            where: whereCondition,
            include: {
                patient: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                username: true,
                                email: true,
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
                visits: {
                    select: {
                        id: true,
                        status: true,
                        createdAt: true,
                    },
                    orderBy: {
                        createdAt: 'desc',
                    },
                },
                _count: {
                    select: {
                        visits: true,
                    },
                },
            },
        },
        pagination
    );
};

// Kiểm tra xem bệnh nhân đã có EHR chưa
export const checkEHRExistsByPatientId = async (patientId: string) => {
    const ehr = await prisma.eHR.findFirst({
        where: { patientId },
    });
    return !!ehr;
};
