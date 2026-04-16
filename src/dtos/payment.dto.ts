import { z } from 'zod';
import { PaymentMethod, PaymentStatus } from '@prisma/client';

export const CreatePaymentBodyDto = z.object({
    invoiceId: z
        .string()
        .uuid({ message: 'Invalid invoice ID format' })
        .describe('ID of the invoice to pay'),
    userName: z
        .string()
        .min(1, { message: 'User name is required' })
        .max(255)
        .optional()
        .describe('Name of the person making the payment'),
    paymentMethod: z
        .enum(['cash_on_delivery', 'credit_card', 'bank_transfer'])
        .default('cash_on_delivery')
        .describe('Payment method'),
    message: z
        .string()
        .optional()
        .describe('Optional message for this payment (internal use)'),
    metadata: z
        .record(z.string(), z.any())
        .optional()
        .describe('Optional metadata object (internal or gateway)'),
});

export type CreatePaymentBodyDataDto = z.infer<typeof CreatePaymentBodyDto>;

export const GetPaymentParamsDto = z.object({
    id: z.string().uuid({ message: 'Invalid payment ID format' }),
});

export type GetPaymentParamsDataDto = z.infer<typeof GetPaymentParamsDto>;

export const GetPaymentByInvoiceParamsDto = z.object({
    invoiceId: z.uuid({ message: 'Invalid invoice ID format' }),
});

export type GetPaymentByInvoiceParamsDataDto = z.infer<
    typeof GetPaymentByInvoiceParamsDto
>;

export interface CreatePaymentResponse {
    success: boolean;
    message: string;
    data: {
        paymentId: string;
        invoiceId: string;
        amount: number;
        paymentMethod: PaymentMethod;
        status: PaymentStatus;
        createdAt: Date;
        message?: string | null;
        metadata?: Record<string, any> | null;
        invoiceBreakdown?: {
            subtotal: number;
            discountAmount: number;
            insuranceAmount: number;
            totalAmount: number;
        };
    };
}

export interface PaymentDetailResponse {
    id: string;
    invoiceId: string;
    userName?: string;
    paymentMethod: PaymentMethod;
    amount: number;
    status: PaymentStatus;
    createdAt: Date;
    updatedAt: Date;
    message?: string | null;
    metadata?: Record<string, any> | null;
    invoice: {
        id: string;
        patientId: string;
        status: string;
        createdAt: Date;
        patient: {
            userId: string;
            fullName: string;
            email?: string;
        };
    };
}
