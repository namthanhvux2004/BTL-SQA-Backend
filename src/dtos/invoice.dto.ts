import { z } from 'zod';
import { InvoiceStatus, PaymentMethod, PaymentStatus } from '@prisma/client';

export const GetInvoicesQueryDto = z.object({
    status: z
        .enum(['pending', 'paid', 'cancelled', 'needs_review'])
        .optional()
        .describe('Filter by invoice status'),
    search: z
        .string()
        .optional()
        .describe('Search by patient name or invoice ID'),
    page: z
        .string()
        .optional()
        .default('1')
        .transform((val) => parseInt(val, 10))
        .refine((val) => val > 0, { message: 'Page must be greater than 0' })
        .describe('Page number for pagination'),
    limit: z.string().optional().describe('Number of items per page'),
    sortBy: z
        .enum(['createdAt', 'updatedAt'])
        .optional()
        .default('createdAt')
        .describe('Sort by field'),
    order: z
        .enum(['asc', 'desc'])
        .optional()
        .default('desc')
        .describe('Sort order'),
    createdAt: z
        .string()
        .optional()
        .refine(
            (val) => {
                if (!val) return true;
                const date = new Date(val);
                return !isNaN(date.getTime());
            },
            { message: 'Invalid date format for createdAt' }
        )
        .describe('Filter by creation date'),
});

export type GetInvoicesQueryDataDto = z.infer<typeof GetInvoicesQueryDto>;

export const GetInvoiceParamsDto = z.object({
    id: z.string().uuid({ message: 'Invalid invoice ID format' }),
});

export type GetInvoiceParamsDataDto = z.infer<typeof GetInvoiceParamsDto>;

export const CreateInvoiceBodyDto = z.object({
    patientId: z
        .string()
        .uuid({ message: 'Invalid patient ID format' })
        .describe('Patient ID for the invoice'),
    serviceUsageIds: z
        .array(z.string().uuid({ message: 'Invalid service usage ID format' }))
        .optional()
        .describe('Optional array of service usage IDs to link to invoice'),
    prescriptionIds: z
        .array(z.string().uuid({ message: 'Invalid prescription ID format' }))
        .optional()
        .describe('Optional array of prescription IDs to link to invoice'),
    discountAmount: z
        .number()
        .min(0, { message: 'Discount amount must be non-negative' })
        .optional()
        .default(0)
        .describe('Discount amount to apply'),
    discountReason: z
        .string()
        .max(500, { message: 'Discount reason must not exceed 500 characters' })
        .optional()
        .describe('Reason for discount'),
    issuedBy: z
        .string()
        .max(255)
        .optional()
        .describe('Name or ID of the staff issuing the invoice'),
    healthInsuranceId: z
        .string()
        .uuid({ message: 'Invalid health insurance ID format' })
        .optional()
        .describe('Health insurance ID to apply for coverage'),
    notes: z
        .string()
        .max(1000, { message: 'Notes must not exceed 1000 characters' })
        .optional()
        .describe('Additional notes for the invoice'),
});

export type CreateInvoiceBodyDataDto = z.infer<typeof CreateInvoiceBodyDto>;

/**
 * DTO for updating invoice
 */
export const UpdateInvoiceParamsDto = z.object({
    id: z.string().uuid({ message: 'Invalid invoice ID format' }),
});

export type UpdateInvoiceParamsDataDto = z.infer<typeof UpdateInvoiceParamsDto>;

export const UpdateInvoiceBodyDto = z.object({
    serviceUsageIds: z
        .array(z.string().uuid({ message: 'Invalid service usage ID format' }))
        .optional()
        .describe('Optional array of service usage IDs to link to invoice'),
    prescriptionIds: z
        .array(z.string().uuid({ message: 'Invalid prescription ID format' }))
        .optional()
        .describe('Optional array of prescription IDs to link to invoice'),
    discountAmount: z
        .number()
        .min(0, { message: 'Discount amount must be non-negative' })
        .optional()
        .default(0)
        .describe('Discount amount to apply'),
    discountReason: z
        .string()
        .max(500, { message: 'Discount reason must not exceed 500 characters' })
        .optional()
        .describe('Reason for discount'),
    issuedBy: z
        .string()
        .max(255)
        .optional()
        .describe('Name or ID of the staff issuing the invoice'),
    healthInsuranceId: z
        .string()
        .uuid({ message: 'Invalid health insurance ID format' })
        .optional()
        .describe('Health insurance ID to apply for coverage'),
    notes: z
        .string()
        .max(1000, { message: 'Notes must not exceed 1000 characters' })
        .optional()
        .describe('Additional notes for the invoice'),
});

export type UpdateInvoiceBodyDataDto = z.infer<typeof UpdateInvoiceBodyDto>;

export const UpdateMedicinePurchaseParamsDto = z.object({
    id: z.string().uuid({ message: 'Invalid invoice ID format' }),
});

export const UpdateMedicinePurchaseBodyDto = z.object({
    medicineUsageIds: z
        .array(z.string().uuid({ message: 'Invalid medicine usage ID format' }))
        .min(1, { message: 'At least one medicine usage ID is required' })
        .describe('Array of medicine usage IDs to toggle isPurchased status'),
    isPurchased: z
        .boolean()
        .describe('New purchase status for the medicine items'),
});

export type UpdateMedicinePurchaseParamsDataDto = z.infer<
    typeof UpdateMedicinePurchaseParamsDto
>;
export type UpdateMedicinePurchaseBodyDataDto = z.infer<
    typeof UpdateMedicinePurchaseBodyDto
>;

export const CancelServiceParamsDto = z.object({
    id: z.string().uuid({ message: 'Invalid invoice ID format' }),
});

export const CancelServiceBodyDto = z.object({
    serviceUsageIds: z
        .array(z.string().uuid({ message: 'Invalid service usage ID format' }))
        .min(1, { message: 'At least one service usage ID is required' })
        .describe('Array of service usage IDs to cancel'),
    reason: z
        .string()
        .min(10, { message: 'Reason must be at least 10 characters' })
        .max(500, { message: 'Reason must not exceed 500 characters' })
        .optional()
        .describe('Reason for cancelling the service'),
});

export type CancelServiceParamsDataDto = z.infer<typeof CancelServiceParamsDto>;
export type CancelServiceBodyDataDto = z.infer<typeof CancelServiceBodyDto>;

export const FlagInvoiceErrorParamsDto = z.object({
    id: z.string().uuid({ message: 'Invalid invoice ID format' }),
});

export interface InvoiceItemBreakdown {
    serviceUsages: Array<{
        id: string;
        serviceName: string;
        quantity: number;
        price: number;
        status: string;
        subtotal: number;
        insuranceDiscount: number;
        total: number;
    }>;
    medicines: Array<{
        id: string;
        medicineName: string;
        quantity: number;
        price: number;
        isPurchased: boolean;
        subtotal: number;
    }>;
}

export interface ComputedInvoiceTotal {
    subtotal: number; // Tổng trước giảm giá và bảo hiểm
    discountAmount: number; // Số tiền giảm giá
    discountReason?: string; // Lý do giảm giá
    insuranceCoveragePercent: number; // % bảo hiểm chi trả
    insuranceAmount: number; // Số tiền bảo hiểm chi trả
    totalAmount: number; // Tổng cuối cùng phải trả
    breakdown: InvoiceItemBreakdown;
}

export interface CreateInvoiceResponse {
    id: string;
    patientId: string;
    healthInsuranceId?: string;
    status: InvoiceStatus;
    // Financial breakdown
    subtotal: number;
    discountAmount: number;
    discountReason?: string;
    insuranceCoveragePercent: number;
    insuranceAmount: number;
    totalAmount: number;
    // Metadata
    notes?: string;
    issuedBy?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface InvoiceDetailResponse {
    id: string;
    patientId: string;
    healthInsuranceId?: string;
    status: InvoiceStatus;
    // Financial breakdown
    subtotal: number;
    discountAmount: number;
    discountReason?: string;
    insuranceCoveragePercent: number;
    insuranceAmount: number;
    totalAmount: number;
    // Metadata
    notes?: string;
    issuedBy?: string;
    createdAt: Date;
    updatedAt: Date;
    patient: {
        userId: string;
        fullName: string;
        email?: string;
        phone?: string;
    };
    healthInsurance?: {
        id: string;
        type: string;
        insuranceId: string;
        level_of_benefit?: number;
    };
    serviceUsages: Array<{
        id: string;
        medicalServiceId: string;
        quantity: number;
        price: number;
        status: string;
        note?: string;
        medicalService: {
            id: string;
            name: string;
            percentApplyHealthInsurance: number;
        };
    }>;
    prescriptions: Array<{
        id: string;
        paid: boolean;
        medicineUsage: Array<{
            id: string;
            medicineId: string;
            quantity: number;
            price: number;
            isPurchased: boolean;
            note?: string;
            medicine: {
                id: string;
                name: string;
                unit: string;
            };
        }>;
    }>;
    payment?: {
        id: string;
        userName?: string;
        paymentMethod: PaymentMethod;
        amount: number;
        status: PaymentStatus;
        createdAt: Date;
    };
    computedTotal: ComputedInvoiceTotal;
}

export interface InvoiceListItem {
    id: string;
    userId: string;
    status: InvoiceStatus;
    createdAt: Date;
    updatedAt: Date;
    patient: {
        patientId: string;
        userId: string;
        fullName: string;
    };
    computedTotal: {
        total: number;
    };
}

export interface InvoiceListResponse {
    data: InvoiceListItem[];
    pagination: {
        page: number;
        limit?: number | undefined;
        totalItems: number;
        totalPages: number;
        hasNext: boolean;
        hasPrev: boolean;
    };
}

export const SendInvoiceEmailParamsDto = z.object({
    id: z.string().uuid({ message: 'Invalid invoice ID format' }),
});

export type SendInvoiceEmailParamsDataDto = z.infer<
    typeof SendInvoiceEmailParamsDto
>;

export const SendInvoiceEmailBodyDto = z.object({
    email: z
        .string()
        .email({ message: 'Invalid email format' })
        .optional()
        .describe(
            'Override email address (optional, defaults to patient email)'
        ),
});

export type SendInvoiceEmailBodyDataDto = z.infer<
    typeof SendInvoiceEmailBodyDto
>;

// Add service to invoice DTOs
export const AddServiceToInvoiceParamsDto = z.object({
    id: z.string().uuid({ message: 'Invalid invoice ID format' }),
});

export type AddServiceToInvoiceParamsDataDto = z.infer<
    typeof AddServiceToInvoiceParamsDto
>;

export const AddServiceToInvoiceBodyDto = z.object({
    patientId: z
        .string()
        .uuid({ message: 'Invalid patient ID format' })
        .describe('Patient ID for the service usage'),
    medicalServiceId: z
        .string()
        .uuid({ message: 'Invalid medical service ID format' })
        .describe('Medical service ID to add'),
    quantity: z
        .number()
        .int({ message: 'Quantity must be an integer' })
        .min(1, { message: 'Quantity must be at least 1' })
        .default(1)
        .describe('Quantity of the service'),
    price: z
        .number()
        .min(0, { message: 'Price must be non-negative' })
        .describe('Price per unit of the service'),
    note: z
        .string()
        .max(500, { message: 'Note must not exceed 500 characters' })
        .optional()
        .describe('Optional note for the service'),
});

export type AddServiceToInvoiceBodyDataDto = z.infer<
    typeof AddServiceToInvoiceBodyDto
>;

// Delete service from invoice DTOs
export const DeleteServiceFromInvoiceParamsDto = z.object({
    id: z.string().uuid({ message: 'Invalid invoice ID format' }),
    serviceUsageId: z
        .string()
        .uuid({ message: 'Invalid service usage ID format' }),
});

export type DeleteServiceFromInvoiceParamsDataDto = z.infer<
    typeof DeleteServiceFromInvoiceParamsDto
>;

/**
 * DTO for adding item to invoice
 */
export const AddItemToInvoiceParamsDto = z.object({
    id: z.string().uuid({ message: 'Invalid invoice ID format' }),
});

export type AddItemToInvoiceParamsDataDto = z.infer<
    typeof AddItemToInvoiceParamsDto
>;

export const AddItemToInvoiceBodyDto = z.object({
    item_type: z
        .enum(['service', 'medicine'])
        .describe('Type of item: service or medicine'),
    refId: z
        .string()
        .uuid({ message: 'Invalid reference ID format' })
        .describe('Reference ID of the service or medicine'),
    name: z
        .string()
        .min(1, { message: 'Name is required' })
        .max(255, { message: 'Name must not exceed 255 characters' })
        .describe('Name of the item'),
    quantity: z
        .number()
        .int({ message: 'Quantity must be an integer' })
        .min(1, { message: 'Quantity must be at least 1' })
        .default(1)
        .describe('Quantity of the item'),
    unitPrice: z
        .number()
        .min(0, { message: 'Unit price must be non-negative' })
        .describe('Unit price of the item'),
    description: z
        .string()
        .max(1000, { message: 'Description must not exceed 1000 characters' })
        .optional()
        .default('')
        .describe('Optional description for the item'),
});

export type AddItemToInvoiceBodyDataDto = z.infer<
    typeof AddItemToInvoiceBodyDto
>;

/**
 * DTO for removing item from invoice
 */
export const RemoveItemFromInvoiceParamsDto = z.object({
    id: z.string().uuid({ message: 'Invalid invoice ID format' }),
    itemId: z
        .string()
        .uuid({ message: 'Invalid item ID format' })
        .describe('ID of the invoice item to remove'),
});

export type RemoveItemFromInvoiceParamsDataDto = z.infer<
    typeof RemoveItemFromInvoiceParamsDto
>;
