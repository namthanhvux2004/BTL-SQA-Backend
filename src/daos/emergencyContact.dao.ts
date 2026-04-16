import prisma from '@src/config/prisma';
import { EmergencyContactDataDto } from '@src/dtos/emergency-contact.dto';
import { cleanObject } from '@src/helpers/cleanObject';
import { createQueryBuilder } from '@src/helpers/queryBuilder';
import { PaginationQuery } from '@src/types';

const getEmergencyContactById = async (id: string) => {
    return prisma.emergencyContact.findUnique({
        where: {
            id: id,
        },
        include: {
            patient: {
                include: {
                    user: {
                        omit: {
                            password: true,
                        },
                        include: {
                            role: true,
                            name: true,
                            address: true,
                        },
                    },
                },
            },
        },
    });
};

const getEmergencyContactsByPatientId = async (
    patientId: string,
    queryParams?: PaginationQuery
) => {
    const pagination: PaginationQuery = {
        page: queryParams?.page || '1',
        limit: queryParams?.limit,
        sortBy: queryParams?.sortBy || 'createdAt',
        sortOrder: queryParams?.sortOrder || 'asc',
    };
    const queryBuilder = createQueryBuilder('emergencyContact');
    return await queryBuilder.findManyWithPagination(
        {
            where: {
                patientId: patientId,
            },
        },
        pagination
    );
};

const createEmergencyContact = async (
    patientId: string,
    data: EmergencyContactDataDto
) => {
    const existingContact = await prisma.emergencyContact.findFirst({
        where: {
            patientId: patientId,
            fullName: data.fullName,
        },
    });
    if (existingContact) return false;
    const queryBuilder = createQueryBuilder('emergencyContact');
    const cleanedData = cleanObject(data);
    const newContact = await queryBuilder.create({
        patientId: patientId,
        ...cleanedData,
    });
    return newContact;
};

const updateEmergencyContact = async (
    id: string,
    data: Partial<EmergencyContactDataDto>
) => {
    const queryBuilder = createQueryBuilder('emergencyContact');
    const cleanedData = cleanObject(data);
    if (!data.email && Object.hasOwn(data, 'email')) cleanedData.email = null;
    return queryBuilder.update({ id: id }, cleanedData);
};

const deleteEmergencyContact = async (id: string) => {
    const queryBuilder = createQueryBuilder('emergencyContact');
    return queryBuilder.delete({ id: id });
};

export default {
    getEmergencyContactById,
    getEmergencyContactsByPatientId,
    createEmergencyContact,
    updateEmergencyContact,
    deleteEmergencyContact,
};
