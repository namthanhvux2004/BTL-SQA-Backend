import prisma from '@src/config/prisma';
import { InvoiceStatus, Prisma } from '@prisma/client';
import { GetInvoicesQueryDataDto } from '@src/dtos/invoice.dto';
import { createQueryBuilder } from '@src/helpers/queryBuilder';
import { PaginationQuery } from '@src/types';

export class InvoiceDAO {
    /**
     * Find invoices with filters, search, and pagination
     */
    async findMany(params: GetInvoicesQueryDataDto) {
        const pagination: PaginationQuery = {
            page: String(params.page || 1),
            limit: params.limit ? String(params.limit) : undefined,
            sortBy: params.sortBy || 'createdAt',
            sortOrder: params.order || 'desc',
        };

        const queryBuilder = createQueryBuilder('invoice');

        const where: Prisma.InvoiceWhereInput = {};

        // Filter by status
        if (params.status) {
            where.status = params.status as InvoiceStatus;
        }

        // Filter by creation date
        if (params.createdAt) {
            const date = new Date(params.createdAt);
            const nextDay = new Date(date);
            nextDay.setDate(nextDay.getDate() + 1);

            where.createdAt = {
                gte: date,
                lt: nextDay,
            };
        }

        // Search by patient name or invoice ID
        if (params.search) {
            where.OR = [
                {
                    id: {
                        contains: params.search,
                        mode: 'insensitive',
                    },
                },
                {
                    patient: {
                        user: {
                            OR: [
                                {
                                    name: {
                                        firstName: {
                                            contains: params.search,
                                            mode: 'insensitive',
                                        },
                                    },
                                },
                                {
                                    name: {
                                        lastName: {
                                            contains: params.search,
                                            mode: 'insensitive',
                                        },
                                    },
                                },
                            ],
                        },
                    },
                },
            ];
        }

        // Get invoices with patient info
        return await queryBuilder.findManyWithPagination(
            {
                where,
                include: {
                    patient: {
                        include: {
                            user: {
                                include: {
                                    name: true,
                                },
                            },
                        },
                    },
                    payment: true,
                },
            },
            pagination
        );
    }

    /**
     * Tìm hóa đơn theo ID với đầy đủ chi tiết bao gồm:
     * Thông tin bệnh nhân, Danh sách dịch vụ/thuốc và Lịch sử thanh toán.
     */
    async findById(id: string) {
        return await prisma.invoice.findUnique({
            where: { id },
            include: {
                // 1. Thông tin bệnh nhân (lấy tên từ bảng User)
                patient: {
                    include: {
                        user: {
                            include: {
                                name: true,
                            },
                        },
                        // Lấy health insurance của patient
                        healthInsurances: {
                            where: {
                                endAt: {
                                    gte: new Date(),
                                },
                            },
                            orderBy: {
                                createdAt: 'desc',
                            },
                            take: 1,
                        },
                    },
                },
                // 2. Lịch sử thanh toán
                payment: true,
                // 3. Nhân viên lập hóa đơn
                issuedBy: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                healthInsurance: true,
            },
        });
    }

    /**
     * Update invoice status
     */
    async updateStatus(id: string, status: InvoiceStatus) {
        return await prisma.invoice.update({
            where: { id },
            data: { status },
        });
    }

    /**
     * Check if invoice exists
     */
    async exists(id: string): Promise<boolean> {
        const count = await prisma.invoice.count({
            where: { id },
        });
        return count > 0;
    }

    /**
     * Update medicine purchase status
     */
    async updateMedicinePurchaseStatus(
        medicineUsageIds: string[],
        isPurchased: boolean
    ) {
        return await prisma.medicineUsage.updateMany({
            where: {
                id: {
                    in: medicineUsageIds,
                },
            },
            data: {
                isPurchased,
            } as any,
        });
    }

    /**
     * Cancel service usages
     */
    async cancelVisitServices(visitServiceIds: string[]) {
        return await prisma.visitService.updateMany({
            where: {
                id: {
                    in: visitServiceIds,
                },
            },
            data: {
                status: 'cancelled',
            } as any,
        });
    }

    /**
     * Verify medicine usages belong to invoice
     */
    async verifyMedicineUsagesBelongToVisit(
        visitId: string,
        medicineUsageIds: string[]
    ): Promise<boolean> {
        const count = await prisma.medicineUsage.count({
            where: {
                id: {
                    in: medicineUsageIds,
                },
                prescription: {
                    visitId,
                },
            },
        });
        return count === medicineUsageIds.length;
    }

    /**
     * Verify service usages belong to invoice
     */
    async verifyVisitServicesBelongToVisit(
        visitId: string,
        visitServiceIds: string[]
    ): Promise<boolean> {
        const count = await prisma.visitService.count({
            where: {
                id: {
                    in: visitServiceIds,
                },
                visitId,
            },
        });
        return count === visitServiceIds.length;
    }

    /**
     * Get invoice with basic info for validation
     */
    async findByIdBasic(id: string) {
        return await prisma.invoice.findUnique({
            where: { id },
            select: {
                id: true,
                status: true,
                patientId: true,
                discountAmount: true,
                taxAmount: true,
                totalAmount: true,
            },
        });
    }

    /**
     * Add item to invoice
     */
    async addItemToInvoice(data: {
        invoiceId: string;
        item_type: 'service' | 'medicine';
        refId: string;
        name: string;
        quantity: number;
        unitPrice: number;
        description?: string;
    }) {
        return await prisma.invoiceItem.create({
            data: {
                invoiceId: data.invoiceId,
                item_type: data.item_type,
                refId: data.refId,
                name: data.name,
                quantity: data.quantity,
                unitPrice: data.unitPrice,
                description: data.description || '',
            },
        });
    }

    /**
     * Remove item from invoice
     */
    async removeItemFromInvoice(itemId: string) {
        return await prisma.invoiceItem.delete({
            where: { id: itemId },
        });
    }

    /**
     * Check if invoice item exists and belongs to invoice
     */
    async verifyItemBelongsToInvoice(
        itemId: string,
        invoiceId: string
    ): Promise<boolean> {
        const count = await prisma.invoiceItem.count({
            where: {
                id: itemId,
                invoiceId: invoiceId,
            },
        });
        return count > 0;
    }

    /**
     * Delete all invoice items for an invoice
     */
    async deleteAllInvoiceItems(invoiceId: string) {
        return await prisma.invoiceItem.deleteMany({
            where: { invoiceId },
        });
    }

    /**
     * Update invoice basic info
     */
    async updateInvoice(
        invoiceId: string,
        data: {
            patientId?: string;
            notes?: string | null;
            issuedByUserId?: string | null;
            healthInsuranceId?: string | null;
            discountAmount?: number;
            discountReason?: string | null;
            totalAmount?: number;
            totalTax?: number;
        }
    ) {
        return await prisma.invoice.update({
            where: { id: invoiceId },
            data,
        });
    }
}

export const invoiceDao = new InvoiceDAO();
