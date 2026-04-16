import z from 'zod';

// File upload validation constants
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png'];
const ALLOWED_PDF_TYPE = 'application/pdf';
const ALLOWED_FILE_TYPES = [...ALLOWED_IMAGE_TYPES, ALLOWED_PDF_TYPE];

// Tạo mới Medical Record
export const CreateMedicalRecordDto = z.object({
    visitId: z.string().uuid({ message: 'Invalid visit ID format' }),
    title: z
        .string()
        .min(1, { message: 'Title is required' })
        .max(255, { message: 'Title must be less than 255 characters' }),
    symptoms: z.string().min(1, { message: 'Symptoms is required' }),
    diagnosis: z.string().min(1, { message: 'Diagnosis is required' }),
    treatments: z.string().min(1, { message: 'Treatments is required' }),
    notes: z.string().optional(),
});

// Cập nhật Medical Record
export const UpdateMedicalRecordDto = z.object({
    title: z
        .string()
        .min(1, { message: 'Title must not be empty' })
        .max(255, { message: 'Title must be less than 255 characters' })
        .optional(),
    symptoms: z
        .string()
        .min(1, { message: 'Symptoms must not be empty' })
        .optional(),
    diagnosis: z
        .string()
        .min(1, { message: 'Diagnosis must not be empty' })
        .optional(),
    treatments: z
        .string()
        .min(1, { message: 'Treatments must not be empty' })
        .optional(),
    notes: z.string().optional(),
});

// Params DTO
export const MedicalRecordIdParamsDto = z.object({
    id: z.string().uuid({ message: 'Invalid medical record ID format' }),
});

// Query DTO cho danh sách medical records
export const GetMedicalRecordsQueryDto = z.object({
    visitId: z.string().uuid().optional(),
    doctorId: z.string().uuid().optional(),
    page: z.string().optional().default('1'),
    limit: z.string().optional().default('10'),
    sortBy: z.enum(['createdAt', 'title']).optional().default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

// Medical Record types
export type CreateMedicalRecordDataDto = z.infer<typeof CreateMedicalRecordDto>;
export type UpdateMedicalRecordDataDto = z.infer<typeof UpdateMedicalRecordDto>;
export type MedicalRecordIdParamsDataDto = z.infer<
    typeof MedicalRecordIdParamsDto
>;
export type GetMedicalRecordsQueryDataDto = z.infer<
    typeof GetMedicalRecordsQueryDto
>;

// File validation helper (for use in service/controller)
export const validateFileUpload = (
    file: Express.Multer.File
): { valid: boolean; error?: string } => {
    // Check file size
    if (file.size > MAX_FILE_SIZE) {
        return {
            valid: false,
            error: `File ${file.originalname} exceeds maximum size of 5MB`,
        };
    }

    // Check file type
    if (!ALLOWED_FILE_TYPES.includes(file.mimetype)) {
        return {
            valid: false,
            error: `File ${file.originalname} has invalid type. Only JPG, PNG, JPEG, and PDF files are allowed`,
        };
    }

    return { valid: true };
};
