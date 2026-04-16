import {
    Prisma,
    VisitServiceStatus,
    VisitStatus,
    VisitType,
} from '@prisma/client';
import prisma from '@src/config/prisma';
import {
    GetVisitsByDateDto,
    GetVisitsOfDoctorDto,
    GetVisitsOfPatientDto,
    GetTasksOfDoctorDto,
} from '@src/dtos/visit.dto';
import { createQueryBuilder } from '@src/helpers/queryBuilder';
import { PaginationQuery } from '@src/types';

const visitInclude: Prisma.VisitInclude = {
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
                    department: {
                        select: {
                            id: true,
                            name: true,
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
                    medicine: true,
                },
            },
            createdBy: {
                include: {
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
    medicalRecords: {
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
        },
    },
    ehr: {
        include: {
            patient: {
                include: {
                    user: {
                        select: {
                            id: true,
                            name: {
                                select: { firstName: true, lastName: true },
                            },
                            birthday: true,
                            gender: true,
                        },
                    },
                },
            },
        },
    },
    medicalService: {
        select: {
            id: true,
            name: true,
            description: true,
            unit: true,
        },
    },
};

const getVisitsOfPatient = async (
    patientId: string,
    query: GetVisitsOfPatientDto
) => {
    const pagination: PaginationQuery = {
        page: query.page || '1',
        limit: query.limit || undefined,
        sortBy: query.sortBy || 'createdAt',
        sortOrder: query.sortOrder || 'desc',
    };
    const ehr = await prisma.eHR.findFirst({
        where: { patientId },
    });
    if (!ehr) {
        return {
            data: [],
            metadata: {
                totalItems: 0,
                itemCount: 0,
                itemsPerPage: pagination.limit ? parseInt(pagination.limit) : 0,
                totalPages: 0,
                currentPage: pagination.page ? parseInt(pagination.page) : 1,
            },
        };
    }
    const queryBuilder = createQueryBuilder('visit');
    return await queryBuilder.findManyWithPagination(
        {
            where: {
                ehrId: ehr.id,
                ...(query.fromDate
                    ? {
                          startTime: {
                              gte: new Date(query.fromDate),
                          },
                      }
                    : {}),
                ...(query.toDate
                    ? {
                          startTime: {
                              lte: new Date(query.toDate),
                          },
                      }
                    : {}),
            },
            include: visitInclude,
        },
        pagination
    );
};

const getDetailsOfVisit = async (visitId: string) => {
    return await prisma.visit.findUnique({
        where: { id: visitId },
        include: {
            ...visitInclude,
        },
    });
};

const getVisitStatsByDate = async (fromDate: string, toDate: string) => {
    const [waiting, inProgress, completed, cancelled] = await Promise.all([
        prisma.visit.count({
            where: {
                startTime: {
                    gte: fromDate,
                    lte: toDate,
                },
                status: VisitStatus.waiting,
            },
        }),
        prisma.visit.count({
            where: {
                startTime: {
                    gte: fromDate,
                    lte: toDate,
                },
                status: VisitStatus.in_progress,
            },
        }),
        prisma.visit.count({
            where: {
                startTime: {
                    gte: fromDate,
                    lte: toDate,
                },
                status: VisitStatus.completed,
            },
        }),
        prisma.visit.count({
            where: {
                startTime: {
                    gte: fromDate,
                    lte: toDate,
                },
                status: VisitStatus.cancelled,
            },
        }),
    ]);

    return {
        fromDate,
        toDate,
        waiting,
        inProgress,
        completed,
        cancelled,
        total: waiting + inProgress + completed + cancelled,
    };
};

const getVisitsOfDoctor = async (
    doctorId: string,
    query: GetVisitsOfDoctorDto
) => {
    const pagination: PaginationQuery = {
        page: query.page || '1',
        limit: query.limit || undefined,
        sortBy: query.sortBy || 'createdAt',
        sortOrder: query.sortOrder || 'desc',
    };
    const queryBuilder = createQueryBuilder('visit');
    return await queryBuilder.findManyWithPagination(
        {
            where: {
                doctorId: doctorId,
                ...(query.fromDate
                    ? {
                          startTime: {
                              gte: new Date(query.fromDate),
                          },
                      }
                    : {}),
                ...(query.toDate
                    ? {
                          startTime: {
                              lte: new Date(query.toDate),
                          },
                      }
                    : {}),
            },
            include: visitInclude,
        },
        pagination
    );
};

// More efficient single-query counts by Visit.status using groupBy (patient-scoped)
const getVisitCountsByStatus = async (
    fromDate?: Date,
    toDate?: Date,
    patientId?: string
) => {
    const whereClause: any = {};
    if (fromDate || toDate) {
        whereClause.startTime = {};
        if (fromDate) whereClause.startTime.gte = fromDate;
        if (toDate) whereClause.startTime.lte = toDate;
    }
    if (patientId) {
        whereClause.patientUserId = patientId;
    }

    const groups = await prisma.visit.groupBy({
        by: ['status'],
        _count: { _all: true },
        where: whereClause,
    });

    const result: Record<string, number> = {};
    let total = 0;
    groups.forEach((g) => {
        const status = String(g.status);
        const c =
            typeof g._count._all === 'bigint'
                ? Number(g._count._all)
                : g._count._all;
        result[status] = c;
        total += c;
    });

    return { total, byStatus: result };
};

// Monthly counts for a given year (timezone-aware). Returns rows of { month: 'YYYY-MM', count }
const getMonthlyVisitCountsByYear = async (
    year: number,
    timezone: string = 'UTC',
    patientId?: string
) => {
    // Filter by year in the specified timezone for consistency
    const baseQuery = Prisma.sql`
        SELECT to_char(date_trunc('month', start_time AT TIME ZONE ${timezone}), 'YYYY-MM') as month,
               count(*)::int as count
        FROM visits
        WHERE EXTRACT(YEAR FROM start_time AT TIME ZONE ${timezone}) = ${year}`;

    const patientCondition = patientId
        ? Prisma.sql` AND "patientUserId" = ${patientId}`
        : Prisma.empty;

    const groupOrder = Prisma.sql` GROUP BY 1
        ORDER BY 1`;

    const rows: Array<{ month: string; count: number }> =
        await prisma.$queryRaw(
            Prisma.sql`${baseQuery}${patientCondition}${groupOrder}`
        );

    return rows;
};

const getVisitsByDate = async (query: GetVisitsByDateDto) => {
    const pagination: PaginationQuery = {
        page: query.page || '1',
        limit: query.limit || undefined,
        sortBy: query.sortBy || 'startTime',
        sortOrder: query.sortOrder || 'asc',
    };

    const queryBuilder = createQueryBuilder('visit');
    return await queryBuilder.findManyWithPagination(
        {
            where: {
                ...(query.fromDate
                    ? {
                          startTime: {
                              gte: new Date(query.fromDate),
                          },
                      }
                    : {}),
                ...(query.toDate
                    ? {
                          startTime: {
                              lte: new Date(query.toDate),
                          },
                      }
                    : {}),
                ...(query.status ? { status: query.status } : {}),
                ...(query.doctorId ? { doctorId: query.doctorId } : {}),
            },
            include: visitInclude,
        },
        pagination
    );
};

/**
 * Find visit by ID
 * @param visitId - Visit ID
 * @returns Visit or null
 */
export const findVisitById = async (visitId: string) => {
    return await prisma.visit.findUnique({
        where: { id: visitId },
        select: {
            id: true,
            status: true,
            doctorId: true,
        },
    });
};

/**
 * Create a new visit
 * @param data - Visit data
 * @returns Created visit
 */
type createVisitData = {
    ehrId: string;
    appointmentId?: string;
    medicalServiceId?: string;
    doctorId?: string;
    status?: VisitStatus;
    startTime?: string;
    type?: VisitType;
    note?: string;
    patientUserId: string;
};

const createVisit = async (data: createVisitData) => {
    const visitData = {
        ehrId: data.ehrId,
        appointmentId: data.appointmentId || null,
        medicalServiceId: data.medicalServiceId || null,
        doctorId: data.doctorId || null,
        status: data.status || VisitStatus.in_progress,
        startTime: data.startTime ? new Date(data.startTime) : null,
        type: data.type || 'new',
        patientUserId: data.patientUserId,
    };

    return await prisma.visit.create({
        data: visitData,
        include: visitInclude,
    });
};

const searchVisits = async (patientId: string, query: any) => {
    const pagination: PaginationQuery = {
        page: query.page || '1',
        limit: query.limit || undefined,
        sortBy: query.sortBy || 'startTime',
        sortOrder: query.sortOrder || 'desc',
    };

    const queryBuilder = createQueryBuilder('visit');
    return await queryBuilder.findManyWithPagination(
        {
            where: {
                OR: [
                    { patientUserId: patientId },
                    {
                        ehr: {
                            patient: {
                                patientId: patientId,
                            },
                        },
                    },
                ],
                ...(query.fromDate
                    ? {
                          startTime: {
                              gte: new Date(query.fromDate),
                          },
                      }
                    : {}),
                ...(query.toDate
                    ? {
                          startTime: {
                              lte: new Date(query.toDate),
                          },
                      }
                    : {}),
                ...(query.status ? { status: query.status } : {}),
            },
            include: visitInclude,
        },
        pagination
    );
};

/**
 * Get tasks of doctor - includes visits assigned to doctor and visits with services doctor can perform
 * @param doctorId - Doctor user ID
 * @param query - Query parameters with filters and pagination
 * @returns Paginated list of tasks with taskSource field
 */
const getTasksOfDoctor = async (
    doctorId: string,
    query: GetTasksOfDoctorDto
) => {
    const pagination: PaginationQuery = {
        page: query.page || '1',
        limit: query.limit || undefined,
        sortBy: query.sortBy || 'startTime',
        sortOrder: query.sortOrder || 'asc',
    };

    // Build where clause for date and status filters
    const whereFilters: any = {
        ...(query.fromDate
            ? {
                  startTime: {
                      gte: new Date(query.fromDate),
                  },
              }
            : {}),
        ...(query.toDate
            ? {
                  startTime: {
                      ...(query.fromDate
                          ? { gte: new Date(query.fromDate) }
                          : {}),
                      lte: new Date(query.toDate),
                  },
              }
            : {}),
        ...(query.status ? { status: query.status } : {}),
    };

    //Visits directly assigned to doctor
    const directVisits = await prisma.visit.findMany({
        where: {
            doctorId: doctorId,
            ...whereFilters,
        },
        include: visitInclude,
    });

    const directVisitIds = directVisits.map((v) => v.id);

    // Query 2: Visits with services that doctor can perform
    let serviceVisitStatusQuery: VisitServiceStatus | null = null;
    if (query.status === 'waiting') {
        serviceVisitStatusQuery = 'ordered';
    } else if (query.status === 'in_progress') {
        serviceVisitStatusQuery = 'in_progress';
    } else if (query.status === 'completed') {
        serviceVisitStatusQuery = 'done';
    }

    const serviceVisits = await prisma.visit.findMany({
        where: {
            id: {
                notIn: directVisitIds,
            },
            ...(serviceVisitStatusQuery
                ? {
                      visitServices: {
                          some: { status: serviceVisitStatusQuery },
                      },
                  }
                : {}),
            visitServices: {
                some: {
                    medicalService: {
                        doctorServices: {
                            some: {
                                doctorId: doctorId,
                                isActive: true,
                            },
                        },
                    },
                },
            },
            ...whereFilters,
        },
        include: visitInclude,
    });

    // Merge and tag with taskSource
    const directTasksWithSource = directVisits.map((visit) => ({
        ...visit,
        taskSource: 'visit' as const,
    }));

    const serviceTasksWithSource = serviceVisits.map((visit) => ({
        ...visit,
        taskSource: 'visit_service' as const,
    }));

    // Combine results (no duplicates because Query 2 excludes Query 1 IDs)
    const allTasks = [...directTasksWithSource, ...serviceTasksWithSource];

    // Sort manually
    const sortField = pagination.sortBy || 'startTime';
    const sortOrder = pagination.sortOrder || 'asc';
    allTasks.sort((a: any, b: any) => {
        const aVal = a[sortField];
        const bVal = b[sortField];
        if (aVal === bVal) return 0;
        if (sortOrder === 'asc') {
            return aVal < bVal ? -1 : 1;
        } else {
            return aVal > bVal ? -1 : 1;
        }
    });

    // Manual pagination
    const page = parseInt(pagination.page || '1');
    const limit = pagination.limit
        ? parseInt(pagination.limit)
        : allTasks.length;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedData = allTasks.slice(startIndex, endIndex);
    const totalItems = allTasks.length;
    const totalPages = Math.ceil(totalItems / limit);

    return {
        data: paginatedData,
        metadata: {
            page,
            limit,
            totalItems,
            totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1,
        },
    };
};

export default {
    getVisitsOfPatient,
    getDetailsOfVisit,
    getVisitsOfDoctor,
    getVisitStatsByDate,
    getVisitCountsByStatus,
    getMonthlyVisitCountsByYear,
    getVisitsByDate,
    findVisitById,
    createVisit,
    searchVisits,
    getTasksOfDoctor,
};
