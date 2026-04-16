import { FileAsset } from '@prisma/client';
import prisma from '@src/config/prisma';

const getFileAsset = async (id: string) => {
    return await prisma.fileAsset.findUnique({
        where: { id },
    });
};

const getFileAssetsOfMedicalRecord = async (medicalRecordId: string) => {
    return await prisma.fileAsset.findMany({
        where: {
            entityId: medicalRecordId,
            entityType: 'medical_record',
        },
    });
};

const deleteFileAsset = async (id: string) => {
    return await prisma.fileAsset.delete({
        where: { id },
    });
};

const createFileAsset = async (
    data: Omit<FileAsset, 'id' | 'createdAt' | 'updatedAt'>
) => {
    return await prisma.fileAsset.create({
        data: data,
    });
};

export default {
    getFileAsset,
    getFileAssetsOfMedicalRecord,
    deleteFileAsset,
    createFileAsset,
};
