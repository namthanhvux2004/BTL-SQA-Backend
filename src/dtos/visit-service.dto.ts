import { z } from 'zod';

/**
 * DTO for creating a new visit service
 */
export const CreateServiceUsageDto = z.object({
    visitId: z
        .string()
        .uuid({ message: 'Visit ID must be a valid UUID' })
        .describe('ID of the visit'),
    medicalServiceId: z
        .string()
        .uuid({ message: 'Medical Service ID must be a valid UUID' })
        .describe('ID of the medical service'),
    quantity: z
        .number()
        .int({ message: 'Quantity must be an integer' })
        .min(1, { message: 'Quantity must be at least 1' })
        .default(1)
        .describe('Quantity of the service (default: 1)'),
    orderedByUserId: z
        .string()
        .uuid({ message: 'Ordered by User ID must be a valid UUID' })
        .optional()
        .describe('Optional ID of the user who ordered this service'),
});

export type CreateServiceUsageDataDto = z.infer<typeof CreateServiceUsageDto>;

/**
 * DTO for updating an existing visit service
 */
export const UpdateServiceUsageDto = z.object({
    quantity: z
        .number()
        .int({ message: 'Quantity must be an integer' })
        .min(1, { message: 'Quantity must be at least 1' })
        .optional()
        .describe('Updated quantity'),
    price: z
        .number()
        .min(0, { message: 'Price must be non-negative' })
        .optional()
        .describe('Updated price'),
    status: z
        .enum(['ordered', 'in_progress', 'done', 'cancelled'])
        .optional()
        .describe('Updated status'),
});

export type UpdateServiceUsageDataDto = z.infer<typeof UpdateServiceUsageDto>;

export const ServiceUsageQueryDto = z.object({
    visitId: z
        .string()
        .uuid({ message: 'Visit ID must be a valid UUID' })
        .optional()
        .describe('Filter by visit ID'),
    medicalServiceId: z
        .string()
        .uuid({ message: 'Medical Service ID must be a valid UUID' })
        .optional()
        .describe('Filter by medical service ID'),
    status: z
        .enum(['ordered', 'in_progress', 'done', 'cancelled'])
        .optional()
        .describe('Filter by visit service status'),
    startDate: z
        .string()
        .optional()
        .refine(
            (val) => {
                if (!val) return true;
                const date = new Date(val);
                return !isNaN(date.getTime());
            },
            { message: 'Invalid date format for startDate' }
        )
        .describe('Filter by start date (ISO 8601 format)'),
    endDate: z
        .string()
        .optional()
        .refine(
            (val) => {
                if (!val) return true;
                const date = new Date(val);
                return !isNaN(date.getTime());
            },
            { message: 'Invalid date format for endDate' }
        )
        .describe('Filter by end date (ISO 8601 format)'),
    page: z
        .string()
        .optional()
        .default('1')
        .transform((val) => parseInt(val, 10))
        .refine((val) => val > 0, { message: 'Page must be greater than 0' })
        .describe('Page number for pagination'),
    limit: z
        .string()
        .optional()
        .default('20')
        .transform((val) => parseInt(val, 10))
        .refine((val) => val > 0 && val <= 100, {
            message: 'Limit must be between 1 and 100',
        })
        .describe('Number of items per page (max 100)'),
    sortBy: z
        .enum(['createdAt', 'updatedAt', 'price'])
        .optional()
        .default('createdAt')
        .describe('Sort by field'),
    order: z
        .enum(['asc', 'desc'])
        .optional()
        .default('desc')
        .describe('Sort order'),
});

export type ServiceUsageQueryDataDto = z.infer<typeof ServiceUsageQueryDto>;

/**
 * DTO for service usage params (ID validation)
 */
export const ServiceUsageParamsDto = z.object({
    id: z
        .uuid({ message: 'Visit service ID must be a valid UUID' })
        .describe('Visit service ID'),
});

export type ServiceUsageParamsDataDto = z.infer<typeof ServiceUsageParamsDto>;

/**
 * DTO for bulk creating service usages
 */
export const BulkCreateServiceUsageDto = z.object({
    items: z
        .array(CreateServiceUsageDto)
        .min(1, { message: 'At least one service usage is required' })
        .max(20, {
            message: 'Cannot create more than 20 service usages at once',
        })
        .describe('Array of service usages to create'),
});

export type BulkCreateServiceUsageDataDto = z.infer<
    typeof BulkCreateServiceUsageDto
>;

/**
 * DTO for patient service history params
 */
export const PatientServiceHistoryParamsDto = z.object({
    id: z
        .string()
        .uuid({ message: 'Patient ID must be a valid UUID' })
        .describe('Patient ID'),
});

export type PatientServiceHistoryParamsDataDto = z.infer<
    typeof PatientServiceHistoryParamsDto
>;

export const VisitServiceHistoryParamsDto = z.object({
    id: z
        .uuid({ message: 'Visit ID must be a valid UUID' })
        .describe('Visit ID'),
});

export type VisitServiceHistoryParamsDataDto = z.infer<
    typeof VisitServiceHistoryParamsDto
>;
