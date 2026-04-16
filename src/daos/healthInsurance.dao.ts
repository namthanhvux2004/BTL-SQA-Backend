import prisma from '@src/config/prisma';
import { HealthInsuranceDataDto } from '@src/dtos/healthInsurance.dto';
import { createQueryBuilder } from '@src/helpers/queryBuilder';
import { PaginationQuery } from '@src/types';
import { cleanObject } from '@src/helpers/cleanObject';

const getHealthInsuranceById = async (id: string) => {
    return prisma.healthInsurance.findUnique({
        where: {
            id: id,
        },
        include: {
            user: {
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
                    ehr: true,
                },
            },
        },
    });
};

const getHealthInsurancesByUserId = async (
    userId: string,
    queryParams?: PaginationQuery
) => {
    const pagination: PaginationQuery = {
        page: queryParams?.page || '1',
        limit: queryParams?.limit,
        sortBy: queryParams?.sortBy || 'createdAt',
        sortOrder: queryParams?.sortOrder || 'asc',
    };
    const queryBuilder = createQueryBuilder('healthInsurance');
    return await queryBuilder.findManyWithPagination(
        {
            where: {
                userId: userId,
            },
        },
        pagination
    );
};

const createHealthInsurance = async (
    userId: string,
    data: HealthInsuranceDataDto
) => {
    const existingHealthInsurance = await prisma.healthInsurance.findFirst({
        where: {
            userId: userId,
            insuranceId: data.insuranceId,
        },
    });
    if (existingHealthInsurance) return false;
    const cleanedData = cleanObject(data);

    const queryBuilder = createQueryBuilder('healthInsurance');
    const newHealthInsurance = await queryBuilder.create({
        ...cleanedData,
        userId: userId,
    });
    return newHealthInsurance;
};

const updateHealthInsurance = async (
    id: string,
    data: Partial<HealthInsuranceDataDto>
) => {
    // Loại bỏ các trường undefined/null để tránh ghi đè lên DB
    const cleanedData = cleanObject(data);

    const queryBuilder = createQueryBuilder('healthInsurance');
    return queryBuilder.update({ id: id }, cleanedData);
};

const deleteHealthInsurance = async (id: string) => {
    const queryBuilder = createQueryBuilder('healthInsurance');
    return queryBuilder.delete({ id: id });
};

export default {
    getHealthInsuranceById,
    getHealthInsurancesByUserId,
    createHealthInsurance,
    updateHealthInsurance,
    deleteHealthInsurance,
};
