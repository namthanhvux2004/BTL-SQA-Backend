import z from 'zod';

// Lấy thông tin hồ sơ y tế của bệnh nhân theo patientId
export const GetEHRDto = z.object({
    patientId: z.string(),
});

// Tạo mới thông tin sức khoẻ của bệnh nhân (HealthInformation)
export const CreateHealthInfoDto = z.object({
    weight: z
        .number()
        .min(1, 'Weight must be greater than 0')
        .max(500, 'Weight must be less than 500kg'),
    height: z
        .number()
        .min(50, 'Height must be greater than 50cm')
        .max(300, 'Height must be less than 300cm'),
    bloodType: z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'], {
        message: 'Invalid blood type',
    }),
    has_high_blood_pressure: z.boolean(),
    has_diabetes: z.boolean(),
    has_allergies: z.boolean(),
    has_cancer: z.boolean(),
});

// Cập nhật thông tin sức khoẻ của bệnh nhân (HealthInformation)
export const UpdateHealthInfoDto = z.object({
    weight: z
        .number()
        .min(1, 'Weight must be greater than 0')
        .max(500, 'Weight must be less than 500kg')
        .optional(),
    height: z
        .number()
        .min(50, 'Height must be greater than 50cm')
        .max(300, 'Height must be less than 300cm')
        .optional(),
    bloodType: z
        .enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'])
        .optional(),
    has_high_blood_pressure: z.boolean().optional(),
    has_diabetes: z.boolean().optional(),
    has_allergies: z.boolean().optional(),
    has_cancer: z.boolean().optional(),
});

export const CreateEHRDto = z.object({
    patientId: z.string(),
});

export const DeleteEHRDto = z.object({
    ehrId: z.string().uuid('Invalid UUID format for ehrId'),
});

export const GetEHRsQueryDto = z.object({
    page: z.string().optional().default('1'),
    limit: z.string().optional().default('10'),
    sortBy: z
        .enum(['createdAt', 'patientId', 'patientName'])
        .optional()
        .default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
    search: z.string().optional(),
    patientId: z.string().uuid().optional(),
});

export const GetEHRByIdDto = z.object({
    ehrId: z.string().uuid('Invalid EHR ID format'),
});

export type GetEHRDataDto = z.infer<typeof GetEHRDto>;
export type CreateHealthInfoDataDto = z.infer<typeof CreateHealthInfoDto>;
export type UpdateHealthInfoDataDto = z.infer<typeof UpdateHealthInfoDto>;
export type CreateEHRDataDto = z.infer<typeof CreateEHRDto>;
export type DeleteEHRDataDto = z.infer<typeof DeleteEHRDto>;
export type GetEHRsQueryDataDto = z.infer<typeof GetEHRsQueryDto>;
export type GetEHRByIdDataDto = z.infer<typeof GetEHRByIdDto>;
