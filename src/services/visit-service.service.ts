import { visitServiceDao } from '@src/daos/visit-service.dao';
import { CustomError, ErrorType } from '@src/core/Error';
import {
    CreateServiceUsageDataDto,
    UpdateServiceUsageDataDto,
    ServiceUsageQueryDataDto,
    BulkCreateServiceUsageDataDto,
} from '@src/dtos/visit-service.dto';
import medicalServiceDao from '@src/daos/medical-service.dao';
import prisma from '@src/config/prisma';

/**
 * Service class for VisitService
 * Handles validation, authorization, and business rules
 */
export class VisitServiceService {
    /**
     * Create a new visit service
     * Automatically creates an InvoiceItem if the visit has an associated invoice
     */
    async createServiceUsage(data: CreateServiceUsageDataDto) {
        // Validate visit exists
        const visit = await prisma.visit.findUnique({
            where: { id: data.visitId },
            include: {
                patient: {
                    include: {
                        user: true,
                    },
                },
            },
        });

        if (!visit) {
            throw new CustomError(
                ErrorType.NOT_FOUND,
                `Visit with ID ${data.visitId} not found`
            );
        }

        // Validate medical service exists
        const medicalService = await medicalServiceDao.getMedicalServiceById(
            data.medicalServiceId
        );
        if (!medicalService) {
            throw new CustomError(
                ErrorType.NOT_FOUND,
                `Medical service with ID ${data.medicalServiceId} not found`
            );
        }

        // Auto-pricing: use provided price or fetch from medical service
        const finalPrice = medicalService.price;

        return await visitServiceDao.create({
            visitId: data.visitId,
            medicalServiceId: data.medicalServiceId,
            quantity: data.quantity,
            price: finalPrice,
            orderedByUserId: data.orderedByUserId,
            orderedAt: new Date().toISOString(),
        });
    }

    /**
     * Get visit service by ID
     */
    async getServiceUsageById(id: string, userRole: string, userId: string) {
        const visitService = await visitServiceDao.findById(id);

        if (!visitService) {
            throw new CustomError(
                ErrorType.NOT_FOUND,
                `Visit service with ID ${id} not found`
            );
        }

        // Patient can only view their own visit services
        if (
            userRole === 'patient' &&
            visitService.visit?.patient?.userId !== userId
        ) {
            throw new CustomError(
                ErrorType.FORBIDDEN,
                'You can only access your own visit services'
            );
        }

        return visitService;
    }

    /**
     * List all visit services with filters
     */
    async listServiceUsages(
        filters: ServiceUsageQueryDataDto,
        userRole: string,
        patientUserId?: string
    ) {
        const queryFilters = { ...filters } as any;

        // If patient, only show their visit services
        if (userRole === 'patient' && patientUserId) {
            // Need to filter by patient's visits
            const visits = await prisma.visit.findMany({
                where: {
                    patient: {
                        userId: patientUserId,
                    },
                },
                select: { id: true },
            });

            const visitIds = visits.map((v) => v.id);
            queryFilters.visitId = { in: visitIds };
        }

        return await visitServiceDao.findAll(queryFilters);
    }

    /**
     * Update a visit service
     */
    async updateServiceUsage(id: string, data: UpdateServiceUsageDataDto) {
        const visitService = await visitServiceDao.findById(id);
        if (!visitService) {
            throw new CustomError(
                ErrorType.NOT_FOUND,
                `Visit service with ID ${id} not found`
            );
        }

        // Check if visit service can be updated based on status
        if (
            visitService.status === 'done' ||
            visitService.status === 'cancelled'
        ) {
            throw new CustomError(
                ErrorType.BAD_REQUEST,
                `Cannot update visit service with status: ${visitService.status}`
            );
        }

        return await visitServiceDao.update(id, data);
    }

    /**
     * Delete a visit service
     */
    async deleteServiceUsage(id: string) {
        const visitService = await visitServiceDao.findById(id);
        if (!visitService) {
            throw new CustomError(
                ErrorType.NOT_FOUND,
                `Visit service with ID ${id} not found`
            );
        }

        // Can only delete ordered.
        const deletableStatuses = ['ordered'];

        if (!deletableStatuses.includes(visitService.status)) {
            throw new CustomError(
                ErrorType.BAD_REQUEST,
                `Cannot delete visit service with status: ${visitService.status}. Only ordered services can be deleted.`
            );
        }

        await visitServiceDao.delete(id);
        return { message: 'Visit service deleted successfully' };
    }

    /**
     * Get visit service history by visit ID
     */
    async getVisitHistory(
        visitId: string,
        filters: ServiceUsageQueryDataDto,
        userRole: string,
        userId: string
    ) {
        // Validate visit exists
        const visit = await prisma.visit.findUnique({
            where: { id: visitId },
            include: {
                patient: {
                    include: {
                        user: true,
                    },
                },
            },
        });

        if (!visit) {
            throw new CustomError(
                ErrorType.NOT_FOUND,
                `Visit with ID ${visitId} not found`
            );
        }

        // Patient can only view their own visit history
        if (userRole === 'patient' && visit?.patient?.userId !== userId) {
            throw new CustomError(
                ErrorType.FORBIDDEN,
                'You can only access your own visit history'
            );
        }

        const daoFilters: any = {
            page: filters.page,
            limit: filters.limit,
            sortBy: filters.sortBy,
            order: filters.order,
        };

        if (filters.status) daoFilters.status = filters.status;
        if (filters.startDate) daoFilters.startDate = filters.startDate;
        if (filters.endDate) daoFilters.endDate = filters.endDate;

        return await visitServiceDao.findByVisit(visitId, daoFilters);
    }

    /**
     * Bulk create visit services
     */
    async bulkCreateServiceUsages(data: BulkCreateServiceUsageDataDto) {
        const { items } = data;
        const results: any = { success: [], failed: [] };

        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (!item) continue;

            try {
                // Validate visit exists
                const visit = await prisma.visit.findUnique({
                    where: { id: item.visitId },
                });

                if (!visit) {
                    results.failed.push({
                        index: i,
                        item,
                        error: `Visit with ID ${item.visitId} not found`,
                    });
                    continue;
                }

                // Validate medical service exists
                const medicalService =
                    await medicalServiceDao.getMedicalServiceById(
                        item.medicalServiceId
                    );

                if (!medicalService) {
                    results.failed.push({
                        index: i,
                        item,
                        error: `Medical service with ID ${item.medicalServiceId} not found`,
                    });
                    continue;
                }

                // Auto-pricing: use provided price or fetch from medical service
                const finalPrice = medicalService.price;

                results.success.push({
                    ...item,
                    price: finalPrice,
                });
            } catch (error: any) {
                results.failed.push({
                    index: i,
                    item,
                    error: error.message || 'Unknown error during validation',
                });
            }
        }

        if (results.success.length === 0) {
            throw new CustomError(
                ErrorType.BAD_REQUEST,
                'All items failed validation. No visit services were created.'
            );
        }

        try {
            // Xử lý trùng lặp: gộp các items có cùng visitId và medicalServiceId
            const mergedMap = new Map<string, any>();

            for (const item of results.success) {
                const key = `${item.visitId}-${item.medicalServiceId}`;

                if (mergedMap.has(key)) {
                    const existing = mergedMap.get(key);
                    existing.quantity += item.quantity;
                } else {
                    mergedMap.set(key, { ...item });
                }
            }

            const itemsToCreate = Array.from(mergedMap.values()).map(
                (item) => ({
                    visitId: item.visitId,
                    medicalServiceId: item.medicalServiceId,
                    quantity: item.quantity,
                    price: item.price,
                    orderedByUserId: item.orderedByUserId,
                })
            );

            const createdItems =
                await visitServiceDao.bulkCreate(itemsToCreate);

            return {
                created: createdItems,
                createdCount: createdItems.length,
                failedCount: results.failed.length,
                failed: results.failed,
                message: `Successfully created ${createdItems.length} visit service(s).`,
            };
        } catch (error: any) {
            throw new CustomError(
                ErrorType.INTERNAL_ERROR,
                `Failed to create visit services: ${error.message}`
            );
        }
    }
}

export const visitServiceService = new VisitServiceService();
