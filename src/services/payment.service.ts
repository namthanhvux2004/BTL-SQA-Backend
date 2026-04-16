import { paymentDao } from '@src/daos/payment.dao';
import { invoiceDao } from '@src/daos/invoice.dao';
import prisma from '@src/config/prisma';
import { CustomError, ErrorType } from '@src/core/Error';
import {
    CreatePaymentBodyDataDto,
    CreatePaymentResponse,
} from '@src/dtos/payment.dto';
import { calculateInvoiceTotal } from '@src/helpers/calculateInvoiceTotal';
import { vnpayService } from './vnpay.service';
import { Request } from 'express';

/**
 * Service class for Payment business logic
 */
export class PaymentService {
    /**
     * Validate invoice for payment
     * Checks if invoice exists, is not paid, and is not cancelled
     * Allow retry if existing payment has failed status
     * @param invoiceId - Invoice ID to validate
     * @returns Invoice if valid
     * @throws CustomError if invoice is invalid
     */
    private async validateInvoiceForPayment(invoiceId: string) {
        const invoice = await invoiceDao.findByIdBasic(invoiceId);

        if (!invoice) {
            throw new CustomError(ErrorType.NOT_FOUND, 'Invoice not found');
        }

        if (invoice.status === 'paid') {
            throw new CustomError(
                ErrorType.BAD_REQUEST,
                'Invoice has already been paid'
            );
        }

        if (invoice.status === 'cancelled') {
            throw new CustomError(
                ErrorType.BAD_REQUEST,
                'Cannot pay for a cancelled invoice'
            );
        }

        // Check existing payment - allow retry if failed
        const existingPayment = await paymentDao.findByInvoiceId(invoiceId);
        if (existingPayment && existingPayment.status === 'completed') {
            throw new CustomError(
                ErrorType.BAD_REQUEST,
                'Invoice already has a completed payment'
            );
        }

        return { invoice, existingPayment };
    }
    /**
     * Create a new payment and update invoice status
     * Uses transaction to ensure atomicity
     * @param data - Payment creation data
     * @returns Payment creation result with invoice breakdown
     */
    async createPayment(
        data: CreatePaymentBodyDataDto
    ): Promise<CreatePaymentResponse> {
        // Validate invoice using helper method
        const { invoice, existingPayment } =
            await this.validateInvoiceForPayment(data.invoiceId);

        // Calculate invoice total
        const invoiceTotalAmount = await calculateInvoiceTotal(data.invoiceId);

        // Validate invoice has a valid total
        if (invoiceTotalAmount.totalAmount <= 0) {
            throw new CustomError(
                ErrorType.BAD_REQUEST,
                'Invoice total amount must be greater than 0'
            );
        }

        // Create or update payment in a transaction
        const result = await prisma.$transaction(async (tx) => {
            // Get invoice
            const invoice = await tx.invoice.findUnique({
                where: { id: data.invoiceId },
                include: {
                    invoiceItems: true,
                },
            });

            let payment;

            // If payment exists but failed, update it (retry mechanism)
            if (existingPayment && existingPayment.status !== 'completed') {
                payment = await tx.payment.update({
                    where: { id: existingPayment.id },
                    data: {
                        userName: data.userName || null,
                        paymentMethod: data.paymentMethod,
                        amount: invoiceTotalAmount.totalAmount,
                        status: 'completed',
                        message: data.message || null,
                        metadata: (data.metadata as any) || null,
                    },
                });
            } else {
                // Create new payment record
                payment = await tx.payment.create({
                    data: {
                        invoiceId: data.invoiceId,
                        userName: data.userName || null,
                        paymentMethod: data.paymentMethod,
                        amount: invoiceTotalAmount.totalAmount,
                        status: 'completed',
                        message: data.message || null,
                        metadata: (data.metadata as any) || null,
                    },
                });
            }

            // Update invoice status to paid
            await tx.invoice.update({
                where: { id: data.invoiceId },
                data: { status: 'paid' },
            });

            // Auto-complete all pending visit services if invoice has visitId
            if (invoice?.invoiceItems) {
                await tx.visitService.updateMany({
                    where: {
                        id: {
                            in: invoice.invoiceItems
                                .filter(
                                    (item) =>
                                        item.item_type === 'service' &&
                                        item.refId
                                )
                                .map((item) => item.refId as string),
                        },
                        status: 'ordered',
                    },
                    data: {
                        status: 'done',
                    },
                });

                // Mark all prescriptions as paid
                await tx.prescription.updateMany({
                    where: {
                        id: {
                            in: invoice.invoiceItems
                                .filter(
                                    (item) =>
                                        item.item_type === 'medicine' &&
                                        item.refId
                                )
                                .map((item) => item.refId as string),
                        },
                    },
                    data: {
                        paid: true,
                    },
                });
            }

            return payment;
        });

        // Get updated invoice for breakdown info
        const updatedInvoice = await invoiceDao.findByIdBasic(data.invoiceId);

        // Build response data
        const responseData: CreatePaymentResponse['data'] = {
            paymentId: result.id,
            invoiceId: result.invoiceId,
            amount: result.amount,
            paymentMethod: result.paymentMethod,
            status: result.status,
            createdAt: result.createdAt,
            message: result.message as string | null,
            metadata: result.metadata as Record<string, any> | null,
        };

        // Add invoice breakdown if available
        if (updatedInvoice) {
            responseData.invoiceBreakdown = {
                subtotal: invoiceTotalAmount.subtotal,
                discountAmount: updatedInvoice.discountAmount,
                insuranceAmount: invoiceTotalAmount.insuranceAmount,
                totalAmount: invoiceTotalAmount.totalAmount,
            };
        }

        return {
            success: true,
            message: 'Payment processed successfully',
            data: responseData,
        };
    }

    /**
     * Generate VNPay payment URL for invoice
     * @param params - Invoice ID and return URL
     * @param req - Express request object for extracting IP
     * @returns Payment URL for VNPay gateway
     */
    async getLinkPaymentUrlVnpay({ invoiceId, returnUrl }, req: Request) {
        return await vnpayService.createPaymentUrl(
            { invoiceId, language: 'vn', returnUrl },
            req
        );
    }

    /**
     * Get payment detail by ID
     * @param id - Payment ID
     * @returns Payment details with invoice and patient information
     */
    async getPaymentById(id: string): Promise<any> {
        const payment = await paymentDao.findById(id);

        if (!payment || !payment.invoice) {
            throw new CustomError(ErrorType.NOT_FOUND, 'Payment not found');
        }

        // Extract patient name
        const firstName = payment.invoice.patient.user?.name?.firstName || '';
        const lastName = payment.invoice.patient.user?.name?.lastName || '';
        const fullName = `${firstName} ${lastName}`.trim() || 'N/A';

        return {
            id: payment.id,
            invoiceId: payment.invoiceId,
            userName: payment.userName,
            paymentMethod: payment.paymentMethod,
            amount: payment.amount,
            status: payment.status,
            message: payment.message || null,
            metadata: payment.metadata || null,
            createdAt: payment.createdAt,
            updatedAt: payment.updatedAt,
            invoice: {
                id: payment.invoice.id,
                patientId: payment.invoice.patientId,
                status: payment.invoice.status,
                createdAt: payment.invoice.createdAt,
                patient: {
                    userId: payment.invoice.patient.userId,
                    fullName,
                    email: payment.invoice.patient.user?.email,
                },
            },
        };
    }

    /**
     * Get payment by invoice ID
     * @param invoiceId - Invoice ID
     * @returns Payment information for the specified invoice
     */
    async getPaymentByInvoiceId(invoiceId: string): Promise<any> {
        const payment = await paymentDao.findByInvoiceId(invoiceId);

        if (!payment) {
            throw new CustomError(
                ErrorType.NOT_FOUND,
                'Payment not found for this invoice'
            );
        }

        return {
            id: payment.id,
            invoiceId: payment.invoiceId,
            userName: payment.userName,
            paymentMethod: payment.paymentMethod,
            amount: payment.amount,
            status: payment.status,
            message: payment.message || null,
            metadata: payment.metadata || null,
            createdAt: payment.createdAt,
            updatedAt: payment.updatedAt,
        };
    }
}

export const paymentService = new PaymentService();
