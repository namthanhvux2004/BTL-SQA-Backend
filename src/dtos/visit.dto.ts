import z from 'zod';

export const getVisitsOfPatientDto = z
    .object({
        page: z.string().optional(),
        limit: z.string().optional(),
        sortBy: z.string().optional().default('createdAt'),
        sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
        fromDate: z
            .string()
            .refine(
                (date) => {
                    return !date || !isNaN(Date.parse(date));
                },
                {
                    message: 'Invalid fromDate format',
                }
            )
            .optional(),
        toDate: z
            .string()
            .refine(
                (date) => {
                    return !date || !isNaN(Date.parse(date));
                },
                {
                    message: 'Invalid toDate format',
                }
            )
            .optional(),
    })
    .refine(
        (data) => {
            if (data.fromDate && data.toDate) {
                return new Date(data.fromDate) <= new Date(data.toDate);
            }
            return true;
        },
        {
            message: 'fromDate must be earlier than or equal to toDate',
        }
    );

export type GetVisitsOfPatientDto = z.infer<typeof getVisitsOfPatientDto>;

export const getVisitsOfDoctorDto = z
    .object({
        page: z.string().optional(),
        limit: z.string().optional(),
        sortBy: z.string().optional().default('createdAt'),
        sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
        fromDate: z
            .string()
            .refine(
                (date) => {
                    return !date || !isNaN(Date.parse(date));
                },
                {
                    message: 'Invalid fromDate format',
                }
            )
            .optional(),
        toDate: z
            .string()
            .refine(
                (date) => {
                    return !date || !isNaN(Date.parse(date));
                },
                {
                    message: 'Invalid toDate format',
                }
            )
            .optional(),
    })
    .refine(
        (data) => {
            if (data.fromDate && data.toDate) {
                return new Date(data.fromDate) <= new Date(data.toDate);
            }
            return true;
        },
        {
            message: 'fromDate must be earlier than or equal to toDate',
        }
    );

export type GetVisitsOfDoctorDto = z.infer<typeof getVisitsOfDoctorDto>;

export const getVisitsByDateDto = z.object({
    fromDate: z
        .string()
        .refine(
            (date) => {
                return !isNaN(Date.parse(date));
            },
            {
                message: 'Invalid date format',
            }
        )
        .optional(),
    toDate: z
        .string()
        .refine(
            (date) => {
                return !isNaN(Date.parse(date));
            },
            {
                message: 'Invalid date format',
            }
        )
        .optional(),
    page: z.string().optional(),
    limit: z.string().optional(),
    sortBy: z.string().optional().default('startTime'),
    sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
    status: z
        .enum(['waiting', 'in_progress', 'completed', 'cancelled'])
        .optional(),
    doctorId: z.string().uuid().optional(),
});

export const getVisitStatusDto = z.object({
    patientId: z.uuid(),
    fromDate: z.string().optional(),
    toDate: z.string().optional(),
});
export type GetVisitStatusDto = z.infer<typeof getVisitStatusDto>;

export const getVisitsByYearDto = z.object({
    patientId: z.uuid(),
    year: z.string().regex(/^\d{4}$/),
});
export type GetVisitsByYearDto = z.infer<typeof getVisitsByYearDto>;

// Response schemas (optional)
export const visitCountsByStatusResponse = z.object({
    total: z.number(),
    byStatus: z.record(z.string(), z.number()),
});
export type VisitCountsByStatusResponse = z.infer<
    typeof visitCountsByStatusResponse
>;

export const monthlyVisitCount = z.object({
    month: z.string(), // 'YYYY-MM'
    count: z.number(),
});
export const monthlyVisitsResponse = z.object({
    year: z.string(),
    months: z.array(monthlyVisitCount),
});
export type MonthlyVisitsResponse = z.infer<typeof monthlyVisitsResponse>;

export type GetVisitsByDateDto = z.infer<typeof getVisitsByDateDto>;

export const createVisitDto = z.object({
    doctorId: z.uuid({ message: 'doctorId phải là UUID hợp lệ' }).optional(),
    appointmentId: z
        .uuid({ message: 'appointmentId phải là UUID hợp lệ' })
        .optional(),
    medicalServiceId: z
        .uuid({ message: 'medicalServiceId phải là UUID hợp lệ' })
        .optional(),
    startTime: z
        .string()
        .refine(
            (date) => {
                return !isNaN(Date.parse(date));
            },
            {
                message: 'startTime phải là ngày giờ hợp lệ',
            }
        )
        .optional(),
    status: z
        .enum(['waiting', 'in_progress', 'completed', 'cancelled'])
        .optional(),
    nextVisitDate: z
        .string()
        .refine(
            (date) => {
                return !isNaN(Date.parse(date));
            },
            {
                message: 'nextVisitDate phải là ngày giờ hợp lệ',
            }
        )
        .optional(),
    patientUserId: z.uuid({ message: 'patientUserId phải là UUID hợp lệ' }),
    type: z
        .enum(['new', 'followUp', 'checkUp', 'consultation', 'telehealth'])
        .optional(),
});

export type CreateVisitDto = z.infer<typeof createVisitDto>;

// ==================== Visit Management DTOs ====================

/**
 * DTO for completing a visit
 */
export const CompleteVisitDto = z.object({
    notes: z.string().optional(),
});

export type CompleteVisitDataDto = z.infer<typeof CompleteVisitDto>;

/**
 * DTO for cancelling a visit
 */
export const CancelVisitDto = z.object({
    reason: z
        .string()
        .min(1, { message: 'Cancellation reason is required' })
        .max(500, {
            message: 'Cancellation reason must be less than 500 characters',
        }),
});

export type CancelVisitDataDto = z.infer<typeof CancelVisitDto>;

/**
 * Params DTO for visit ID
 */
export const VisitIdParamsDto = z.object({
    id: z.string().uuid({ message: 'Invalid visit ID format' }),
});

export type VisitIdParamsDataDto = z.infer<typeof VisitIdParamsDto>;

export const UpdateVisitStatusDto = z.object({
    status: z.enum(['waiting', 'in_progress', 'completed', 'cancelled']),
});

export type UpdateVisitStatusDataDto = z.infer<typeof UpdateVisitStatusDto>;

/**
 * DTO for searching visits
 */
export const searchVisitsDto = z
    .object({
        patientId: z.string().min(1, { message: 'patientId is required' }),
        fromDate: z
            .string()
            .refine(
                (date) => {
                    return !date || !isNaN(Date.parse(date));
                },
                {
                    message: 'fromDate không hợp lệ',
                }
            )
            .optional(),
        toDate: z
            .string()
            .refine(
                (date) => {
                    return !date || !isNaN(Date.parse(date));
                },
                {
                    message: 'toDate không hợp lệ',
                }
            )
            .optional(),
        page: z.string().optional(),
        limit: z.string().optional(),
        sortBy: z.string().optional().default('startTime'),
        sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
        status: z
            .enum(['waiting', 'in_progress', 'completed', 'cancelled'])
            .optional(),
    })
    .refine(
        (data) => {
            if (data.fromDate && data.toDate) {
                return new Date(data.fromDate) <= new Date(data.toDate);
            }
            return true;
        },
        {
            message: 'fromDate phải nhỏ hơn hoặc bằng toDate',
        }
    );

export type SearchVisitsDto = z.infer<typeof searchVisitsDto>;

/**
 * DTO for getting tasks of doctor
 */
export const getTasksOfDoctorDto = z
    .object({
        status: z
            .enum(['waiting', 'in_progress', 'completed', 'cancelled'])
            .optional(),
        fromDate: z
            .string()
            .refine(
                (date) => {
                    return !date || !isNaN(Date.parse(date));
                },
                {
                    message: 'fromDate không hợp lệ',
                }
            )
            .optional(),
        toDate: z
            .string()
            .refine(
                (date) => {
                    return !date || !isNaN(Date.parse(date));
                },
                {
                    message: 'toDate không hợp lệ',
                }
            )
            .optional(),
        page: z.string().optional(),
        limit: z.string().optional(),
        sortBy: z.string().optional().default('startTime'),
        sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
    })
    .refine(
        (data) => {
            if (data.fromDate && data.toDate) {
                return new Date(data.fromDate) <= new Date(data.toDate);
            }
            return true;
        },
        {
            message: 'fromDate phải nhỏ hơn hoặc bằng toDate',
        }
    );

export type GetTasksOfDoctorDto = z.infer<typeof getTasksOfDoctorDto>;
