import prisma from '@config/prisma';
import { Prisma } from '@prisma/client';
import {
    CreateMedicalRecordDataDto,
    UpdateMedicalRecordDataDto,
} from '@src/dtos/medical-record.dto';
import fileAssetDao from './fileAsset.dao';

const medicalRecordInclude: Prisma.MedicalRecordInclude = {
    doctor: {
        include: {
            staff: {
                include: {
                    user: {
                        select: {
                            id: true,
                            username: true,
                            email: true,
                            name: true,
                        },
                    },
                },
            },
        },
    },
    visit: {
        include: {
            patient: {
                include: {
                    user: {
                        select: {
                            id: true,
                            username: true,
                            email: true,
                            name: true,
                        },
                    },
                },
            },
        },
    },
};

/**
 * Create a new medical record
 * @param doctorId - ID of the doctor creating the record
 * @param data - Medical record data
 * @returns Created medical record
 */
export const createMedicalRecord = async (
    doctorId: string,
    data: CreateMedicalRecordDataDto
) => {
    return await prisma.medicalRecord.create({
        data: {
            doctorId,
            visitId: data.visitId,
            title: data.title,
            symptoms: data.symptoms,
            diagnosis: data.diagnosis,
            treatments: data.treatments,
            notes: data.notes || null,
        },
        include: medicalRecordInclude,
    });
};

/**
 * Find medical record by ID
 * @param id - Medical record ID
 * @returns Medical record or null
 */
export const findMedicalRecordById = async (id: string) => {
    const medicalRecord = await prisma.medicalRecord.findUnique({
        where: { id },
        include: medicalRecordInclude,
    });
    if (medicalRecord) {
        const fileAssets = await fileAssetDao.getFileAssetsOfMedicalRecord(id);
        return {
            ...medicalRecord,
            fileAssets,
        };
    } else {
        return null;
    }
};

/**
 * Update medical record
 * @param id - Medical record ID
 * @param data - Updated medical record data
 * @returns Updated medical record
 */
export const updateMedicalRecord = async (
    id: string,
    data: UpdateMedicalRecordDataDto
) => {
    return await prisma.medicalRecord.update({
        where: { id },
        data: {
            ...(data.title && { title: data.title }),
            ...(data.symptoms && { symptoms: data.symptoms }),
            ...(data.diagnosis && { diagnosis: data.diagnosis }),
            ...(data.treatments && { treatments: data.treatments }),
            ...(data.notes !== undefined && { notes: data.notes }),
        },
        include: medicalRecordInclude,
    });
};

/**
 * Delete medical record (soft delete by marking as inactive or hard delete)
 * @param id - Medical record ID
 * @returns Deleted medical record
 */
export const deleteMedicalRecord = async (id: string) => {
    return await prisma.medicalRecord.delete({
        where: { id },
    });
};

/**
 * Check if doctor is the owner of the medical record
 * @param medicalRecordId - Medical record ID
 * @param doctorId - Doctor ID
 * @returns True if doctor is owner, false otherwise
 */
export const checkDoctorOwnership = async (
    medicalRecordId: string,
    doctorId: string
): Promise<boolean> => {
    const record = await prisma.medicalRecord.findUnique({
        where: { id: medicalRecordId },
        select: { doctorId: true },
    });

    return record?.doctorId === doctorId;
};

/**
 * Get medical records with pagination and filtering
 * @param filters - Query filters
 * @returns Paginated medical records
 */
export const getMedicalRecords = async (filters: {
    visitId?: string;
    doctorId?: string;
    page: number;
    limit: number;
    sortBy: string;
    sortOrder: 'asc' | 'desc';
}) => {
    const { visitId, doctorId, page, limit, sortBy, sortOrder } = filters;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (visitId) where.visitId = visitId;
    if (doctorId) where.doctorId = doctorId;

    const [records, total] = await Promise.all([
        prisma.medicalRecord.findMany({
            where,
            skip,
            take: limit,
            orderBy: {
                [sortBy]: sortOrder,
            },
            include: medicalRecordInclude,
        }),
        prisma.medicalRecord.count({ where }),
    ]);

    return {
        data: records,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        },
    };
};
