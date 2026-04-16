import prisma from '@src/config/prisma';
import { createQueryBuilder } from '@src/helpers/queryBuilder';
import { PaginationQuery } from '@src/types';

const getPatientById = async (id: string) => {
    return prisma.patient.findFirst({
        where: {
            OR: [{ userId: id }, { patientId: id }],
        },
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
            healthInsurances: true,
            healthInfo: true,
            emergencyContacts: true,
            ehr: true,
        },
    });
};

const getAllPatients = async (query: PaginationQuery) => {
    const pagination: Partial<PaginationQuery> = {
        page: String(query.page || 1),
        limit: query.limit ? String(query.limit) : undefined,
    };
    const search = query.search ? String(query.search) : undefined;
    const queryBuilder = createQueryBuilder('patient');
    return await queryBuilder.findManyWithPagination(
        {
            where: search
                ? {
                      OR: [
                          {
                              patientId: {
                                  contains: search,
                                  mode: 'insensitive',
                              },
                          },
                          {
                              user: {
                                  username: {
                                      contains: search,
                                      mode: 'insensitive',
                                  },
                              },
                          },
                          {
                              user: {
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
                          },
                      ],
                  }
                : {},
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
        pagination
    );
};

export default {
    getPatientById,
    getAllPatients,
};
