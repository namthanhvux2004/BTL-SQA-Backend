import prisma from '@src/config/prisma';
import { Prisma, VisitServiceStatus } from '@prisma/client';
import { ServiceUsageQueryDataDto } from '@src/dtos/visit-service.dto';
import { createQueryBuilder } from '@src/helpers/queryBuilder';
import { PaginationQuery } from '@src/types';

export class VisitServiceDAO {
    /**
     * Create a new visit service
     * This will also create an InvoiceItem if the visit has an associated invoice
     */
    async create(data: {
        visitId: string;
        medicalServiceId: string;
        quantity: number;
        price: number;
        orderedByUserId: string | undefined;
        orderedAt: string;
    }) {
        return await prisma.$transaction(async (tx) => {
            // Get medical service details
            const medicalService = await tx.medicalService.findUnique({
                where: { id: data.medicalServiceId },
            });

            if (!medicalService) {
                throw new Error('Medical service not found');
            }

            // Create visit service
            const visitService = await tx.visitService.create({
                data: {
                    visitId: data.visitId,
                    medicalServiceId: data.medicalServiceId,
                    quantity: data.quantity,
                    price: data.price,
                    orderedByUserId: data.orderedByUserId || null,
                    status: 'ordered',
                },
                include: {
                    visit: {
                        include: {
                            patient: {
                                include: {
                                    user: {
                                        select: {
                                            name: true,
                                            phone: true,
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
                            price: true,
                            description: true,
                        },
                    },
                },
            });
            return visitService;
        });
    }
    /**
     * Find visit service by ID with all relations
     */
    async findById(id: string) {
        return await prisma.visitService.findUnique({
            where: { id },
            include: {
                visit: {
                    include: {
                        patient: {
                            include: {
                                user: {
                                    select: {
                                        name: true,
                                        phone: true,
                                        email: true,
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
                        price: true,
                        description: true,
                    },
                },
                orderedBy: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        });
    }

    /**
     * Find all visit services with filters and pagination
     */
    async findAll(filters: ServiceUsageQueryDataDto) {
        const queryBuilder = createQueryBuilder('visitService');
        const pagination: PaginationQuery = {
            page: String(filters.page) || '1',
            limit: String(filters.limit) || '10',
            sortBy: filters.sortBy || 'createdAt',
            sortOrder: filters.order || 'asc',
        };

        const where: Prisma.VisitServiceWhereInput = {};

        // Apply filters
        if (filters.visitId) {
            where.visitId = filters.visitId;
        }

        if (filters.medicalServiceId) {
            where.medicalServiceId = filters.medicalServiceId;
        }

        if (filters.status) {
            where.status = filters.status as VisitServiceStatus;
        }

        // Date range filter
        if (filters.startDate || filters.endDate) {
            where.createdAt = {};
            if (filters.startDate) {
                where.createdAt.gte = new Date(filters.startDate);
            }
            if (filters.endDate) {
                where.createdAt.lte = new Date(filters.endDate);
            }
        }

        // Get items
        return await queryBuilder.findManyWithPagination(
            {
                where,
                include: {
                    visit: {
                        include: {
                            patient: {
                                include: {
                                    user: {
                                        select: {
                                            name: true,
                                            phone: true,
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
                            price: true,
                        },
                    },
                },
                orderBy: {
                    [filters.sortBy || 'createdAt']: filters.order || 'desc',
                },
            },
            pagination
        );
    }

    /**
     * Update a visit service
     */
    async update(
        id: string,
        data: {
            quantity?: number | undefined;
            price?: number | undefined;
            status?: VisitServiceStatus | undefined;
        }
    ) {
        return await prisma.$transaction(async (tx) => {
            const visitService = await tx.visitService.findUnique({
                where: { id },
                include: {
                    visit: true,
                    medicalService: true,
                },
            });

            if (!visitService) {
                throw new Error('Visit service not found');
            }

            // Update visit service
            const updated = await tx.visitService.update({
                where: { id },
                data: {
                    ...(data.quantity !== undefined && {
                        quantity: data.quantity,
                    }),
                    ...(data.price !== undefined && { price: data.price }),
                    ...(data.status !== undefined && { status: data.status }),
                },
                include: {
                    visit: {
                        include: {
                            patient: {
                                include: {
                                    user: {
                                        select: {
                                            name: true,
                                            phone: true,
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
                            price: true,
                        },
                    },
                },
            });

            // Update corresponding invoice item if exists
            const invoiceItem = await tx.invoiceItem.findFirst({
                where: {
                    refId: id,
                    item_type: 'service',
                },
                include: {
                    invoice: true,
                },
            });

            if (invoiceItem) {
                const oldTotal = invoiceItem.quantity * invoiceItem.unitPrice;
                const newTotal =
                    (data.quantity !== undefined
                        ? data.quantity
                        : invoiceItem.quantity) *
                    (data.price !== undefined
                        ? data.price
                        : invoiceItem.unitPrice);
                const difference = newTotal - oldTotal;

                await tx.invoiceItem.update({
                    where: { id: invoiceItem.id },
                    data: {
                        ...(data.quantity !== undefined && {
                            quantity: data.quantity,
                        }),
                        ...(data.price !== undefined && {
                            unitPrice: data.price,
                        }),
                    },
                });

                // Update invoice total
                await tx.invoice.update({
                    where: { id: invoiceItem.invoiceId },
                    data: {
                        totalAmount:
                            invoiceItem.invoice.totalAmount + difference,
                    },
                });
            }

            return updated;
        });
    }

    /**
     * Delete a visit service (hard delete)
     */
    async delete(id: string) {
        return await prisma.$transaction(async (tx) => {
            // Find invoice item related to this visit service
            const invoiceItem = await tx.invoiceItem.findFirst({
                where: {
                    refId: id,
                    item_type: 'service',
                },
                include: {
                    invoice: true,
                },
            });

            // Delete visit service
            const deleted = await tx.visitService.delete({
                where: { id },
            });

            // If invoice item exists, delete it and update invoice total
            if (invoiceItem) {
                const itemTotal = invoiceItem.quantity * invoiceItem.unitPrice;

                await tx.invoiceItem.delete({
                    where: { id: invoiceItem.id },
                });

                await tx.invoice.update({
                    where: { id: invoiceItem.invoiceId },
                    data: {
                        totalAmount:
                            invoiceItem.invoice.totalAmount - itemTotal,
                    },
                });
            }

            return deleted;
        });
    }

    /**
     * Update visit service status
     */
    async updateStatus(id: string, status: VisitServiceStatus) {
        return await prisma.visitService.update({
            where: { id },
            data: { status },
            include: {
                visit: {
                    include: {
                        patient: true,
                    },
                },
                medicalService: true,
            },
        });
    }

    /**
     * Bulk create visit services (with transaction)
     */
    async bulkCreate(
        items: Array<{
            visitId: string;
            medicalServiceId: string;
            quantity: number;
            price: number;
            orderedByUserId?: string;
        }>
    ) {
        return await prisma.$transaction(async (tx) => {
            const results: any[] = [];

            for (const item of items) {
                // Get medical service details
                const medicalService = await tx.medicalService.findUnique({
                    where: { id: item.medicalServiceId },
                });

                if (!medicalService) {
                    continue; // Skip if service not found
                }

                // Create visit service
                const visitService = await tx.visitService.create({
                    data: {
                        visitId: item.visitId,
                        medicalServiceId: item.medicalServiceId,
                        quantity: item.quantity,
                        price: item.price,
                        orderedByUserId: item.orderedByUserId || null,
                        status: 'ordered',
                    },
                    include: {
                        visit: {
                            include: {
                                patient: {
                                    include: {
                                        user: {
                                            select: {
                                                name: true,
                                                phone: true,
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
                                price: true,
                            },
                        },
                    },
                });
                results.push(visitService);
            }

            return results;
        });
    }

    /**
     * Find visit services by visit ID
     */
    async findByVisit(
        visitId: string,
        filters: {
            status?: VisitServiceStatus;
            startDate?: string;
            endDate?: string;
            page?: number;
            limit?: number;
            sortBy?: string;
            order?: 'asc' | 'desc';
        }
    ) {
        const where: Prisma.VisitServiceWhereInput = {
            visitId,
        };

        // Apply filters
        if (filters.status) {
            where.status = filters.status;
        }

        // Date range filter
        if (filters.startDate || filters.endDate) {
            where.createdAt = {};
            if (filters.startDate) {
                where.createdAt.gte = new Date(filters.startDate);
            }
            if (filters.endDate) {
                where.createdAt.lte = new Date(filters.endDate);
            }
        }

        // Calculate pagination
        const page = filters.page || 1;
        const limit = filters.limit || 20;
        const skip = (page - 1) * limit;

        // Get total count
        const total = await prisma.visitService.count({ where });

        // Get items
        const items = await prisma.visitService.findMany({
            where,
            include: {
                medicalService: {
                    select: {
                        id: true,
                        name: true,
                        price: true,
                        description: true,
                    },
                },
                orderedBy: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
            orderBy: {
                [filters.sortBy || 'createdAt']: filters.order || 'desc',
            },
            skip,
            take: limit,
        });

        // Calculate summary statistics
        const stats = await prisma.visitService.groupBy({
            by: ['status'],
            where: { visitId },
            _count: { id: true },
            _sum: { price: true },
        });

        return {
            items,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
            summary: {
                totalCount: total,
                totalCost: stats.reduce(
                    (sum, stat) =>
                        sum + (stat._sum.price || 0) * (stat._count.id || 0),
                    0
                ),
                byStatus: stats.reduce(
                    (acc, stat) => {
                        acc[stat.status] = {
                            count: stat._count.id,
                            totalCost: stat._sum.price || 0,
                        };
                        return acc;
                    },
                    {} as Record<string, { count: number; totalCost: number }>
                ),
            },
        };
    }

    /**
     * Count visit services with filters
     */
    async count(where: Prisma.VisitServiceWhereInput) {
        return await prisma.visitService.count({ where });
    }

    /**
     * Update all visit services for a visit to 'done' status
     * Used when visit is completed
     */
    async completeVisitServicesByVisit(visitId: string) {
        return await prisma.visitService.updateMany({
            where: {
                visitId,
                status: 'in_progress',
            },
            data: {
                status: 'done',
            },
        });
    }
}

export const visitServiceDao = new VisitServiceDAO();
