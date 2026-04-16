import prisma from '@src/config/prisma';
import { PaymentMethod, PaymentStatus } from '@prisma/client';

export class PaymentDAO {
    /**
     * Create a new payment record
     */
    async create(data: {
        invoiceId: string;
        userName?: string;
        paymentMethod: PaymentMethod;
        amount: number;
        status?: PaymentStatus;
        message?: string | null;
        metadata?: any; // JSON metadata from payment gateway
    }) {
        // Cast to any to avoid type mismatch if Prisma client isn't regenerated
        return await prisma.payment.create({
            data: {
                invoiceId: data.invoiceId,
                userName: data.userName || null,
                paymentMethod: data.paymentMethod,
                amount: data.amount,
                status: data.status || 'completed',
                message: data.message || null,
                metadata: data.metadata || null,
            } as any,
        });
    }

    /**
     * Find payment by ID with invoice details
     */
    async findById(id: string) {
        return await prisma.payment.findUnique({
            where: { id },
            include: {
                invoice: {
                    include: {
                        patient: {
                            include: {
                                user: {
                                    select: {
                                        id: true,
                                        email: true,
                                        phone: true,
                                        name: true,
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });
    }

    /**
     * Find payment by invoice ID
     * Uses findUnique since invoiceId has unique constraint (1-1 relationship)
     */
    async findByInvoiceId(invoiceId: string) {
        return await prisma.payment.findUnique({
            where: { invoiceId },
        });
    }

    /**
     * Update payment status
     */
    async updateStatus(id: string, status: PaymentStatus) {
        return await prisma.payment.update({
            where: { id },
            data: { status },
        });
    }

    /**
     * Update payment status and message
     */
    async updateStatusAndMessage(
        id: string,
        status: PaymentStatus,
        message?: string | null
    ) {
        return await prisma.payment.update({
            where: { id },
            data: { status, message: message || null } as any,
        });
    }

    /**
     * Check if payment exists for invoice
     * More efficient using findUnique on unique field (1-1 relationship)
     */
    async existsForInvoice(invoiceId: string): Promise<boolean> {
        const payment = await prisma.payment.findUnique({
            where: { invoiceId },
            select: { id: true }, // Only select id for efficiency
        });
        return payment !== null;
    }
}

export const paymentDao = new PaymentDAO();
