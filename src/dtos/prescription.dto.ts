import z from 'zod';

// ==================== Medicine Usage DTOs ====================

// Create Medicine Usage (for adding to prescription)
export const CreateMedicineUsageDto = z.object({
    medicineId: z.string().uuid().optional(),
    drugName: z
        .string()
        .min(1, { message: 'Drug name is required' })
        .max(255, { message: 'Drug name must be less than 255 characters' }),
    quantity: z
        .number()
        .int()
        .positive({ message: 'Quantity must be a positive integer' }),
    note: z.string().optional(),
    price: z
        .number()
        .nonnegative({ message: 'Price must be non-negative' })
        .optional(),
});

// Update Medicine Usage
export const UpdateMedicineUsageDto = z.object({
    id: z.string().uuid().optional(),
    medicineId: z.string().uuid(),
    quantity: z
        .number()
        .int()
        .positive({ message: 'Quantity must be a positive integer' })
        .optional(),
    note: z.string().optional(),
    isPurchased: z.boolean().optional(),
});

// ==================== Prescription DTOs ====================

// Create Prescription
export const CreatePrescriptionDto = z.object({
    visitId: z.string().uuid({ message: 'Invalid visit ID format' }),
    medicines: z.array(CreateMedicineUsageDto).optional().default([]),
});

// Update Prescription
export const UpdatePrescriptionDto = z.object({
    paid: z.boolean().optional(),
});

// Update Prescription with Medicines (replace all medicines)
export const UpdatePrescriptionWithMedicinesDto = z.object({
    medicines: z
        .array(CreateMedicineUsageDto)
        .min(1, { message: 'At least one medicine is required' }),
});

// Batch add medicines to prescription
export const BatchAddMedicinesToPrescriptionDto = z.object({
    prescriptionId: z.string().uuid(),
    medicines: z
        .array(CreateMedicineUsageDto)
        .min(1, { message: 'At least one medicine is required' })
        .max(50, { message: 'Maximum 50 medicines per batch' }),
});

// ==================== Params DTOs ====================

export const PrescriptionIdParamsDto = z.object({
    id: z.string().uuid({ message: 'Invalid prescription ID format' }),
});

export const MedicineUsageIdParamsDto = z.object({
    id: z.string(),
});

export const VisitIdParamsDto = z.object({
    visitId: z.string().uuid({ message: 'Invalid visit ID format' }),
});

export const PrescriptionIdForMedicinesParamsDto = z.object({
    prescriptionId: z
        .string()
        .uuid({ message: 'Invalid prescription ID format' }),
});

// ==================== Query DTOs ====================

// Query for listing prescriptions with pagination
export const GetPrescriptionsQueryDto = z.object({
    visitId: z.string().uuid().optional(),
    paid: z
        .string()
        .transform((val) => {
            if (val === 'true') return true;
            if (val === 'false') return false;
            return undefined;
        })
        .optional(),
    fromDate: z.string().datetime().optional(),
    toDate: z.string().datetime().optional(),
    page: z.string().optional().default('1'),
    limit: z.string().optional().default('10'),
    sortBy: z.enum(['createdAt', 'updatedAt']).optional().default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

// ==================== Type Exports ====================

export type CreateMedicineUsageDataDto = z.infer<typeof CreateMedicineUsageDto>;
export type UpdateMedicineUsageDataDto = z.infer<typeof UpdateMedicineUsageDto>;
export type CreatePrescriptionDataDto = z.infer<typeof CreatePrescriptionDto>;
export type UpdatePrescriptionDataDto = z.infer<typeof UpdatePrescriptionDto>;
export type UpdatePrescriptionWithMedicinesDataDto = z.infer<
    typeof UpdatePrescriptionWithMedicinesDto
>;
export type BatchAddMedicinesToPrescriptionDataDto = z.infer<
    typeof BatchAddMedicinesToPrescriptionDto
>;
export type PrescriptionIdParamsDataDto = z.infer<
    typeof PrescriptionIdParamsDto
>;
export type MedicineUsageIdParamsDataDto = z.infer<
    typeof MedicineUsageIdParamsDto
>;
export type VisitIdParamsDataDto = z.infer<typeof VisitIdParamsDto>;
export type PrescriptionIdForMedicinesParamsDataDto = z.infer<
    typeof PrescriptionIdForMedicinesParamsDto
>;
export type GetPrescriptionsQueryDataDto = z.infer<
    typeof GetPrescriptionsQueryDto
>;
