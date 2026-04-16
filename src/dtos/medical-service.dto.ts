import { z } from 'zod';

export const MedicalServiceQueryDto = z.object({
    page: z.coerce.number().min(1).optional().default(1),
    limit: z.coerce.number().min(1).max(100).optional().default(10),
    search: z.string().optional(),
    departmentId: z.coerce.number().optional(),
    specialization: z.string().optional(), // Filter by doctor specialization
    isActive: z.coerce.number().optional(),
    minPrice: z.coerce.number().optional(),
    maxPrice: z.coerce.number().optional(),
    sortBy: z
        .enum(['name', 'price', 'createdAt', 'updatedAt'])
        .optional()
        .default('name'),
    sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
});

export type MedicalServiceQueryDataDto = z.infer<typeof MedicalServiceQueryDto>;

export interface MedicalServiceResponseDto {
    id: string;
    name: string;
    description?: string;
    price: number;
    isActive: boolean;
    percentApplyHealthInsurance: number;
    createdAt: Date;
    updatedAt: Date;
    department: {
        id: number;
        name: string;
        code: string;
        type: string;
    };
    _count?: {
        serviceUsage: number;
    };
}

export const SpecializationQueryDto = z.object({
    search: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
});

export type SpecializationQueryDataDto = z.infer<typeof SpecializationQueryDto>;

export interface SpecializationResponseDto {
    specialization: string;
    doctorCount: number;
    departments: {
        id: number;
        name: string;
        code: string;
    }[];
}

export const getListDoctorMedicalServiceDto = z.object({
    medicalServiceId: z.string().uuid('Invalid medical service ID format'),
    page: z.string().optional(),
    limit: z.string().optional(),
});
export type GetListDoctorMedicalServiceDataDto = z.infer<
    typeof getListDoctorMedicalServiceDto
>;

export const createMedicalServiceDto = z.object({
    images: z.array(z.string().url()).optional(),
    roomId: z.string(),
    name: z.string().min(2).max(100),
    description: z.string().max(500).optional(),
    price: z.coerce.number().min(0),
    unit: z.string(),
    durationMinutes: z.coerce.number(),
    isActive: z.coerce.boolean().default(true),
    percentApplyHealthInsurance: z.coerce.number().min(0).max(100).default(0),
    departmentId: z.coerce.number().min(1),
});

export type CreateMedicalServiceDataDto = z.infer<
    typeof createMedicalServiceDto
>;

export const updateMedicalServiceDto = z.object({
    images: z.array(z.string().url()).optional(),
    roomId: z.string(),
    name: z.string().min(2).max(100),
    description: z.string().max(500).optional(),
    price: z.coerce.number().min(0),
    unit: z.string(),
    durationMinutes: z.coerce.number(),
    isActive: z.coerce.boolean().default(true),
    percentApplyHealthInsurance: z.coerce.number().min(0).max(100).default(0),
    departmentId: z.coerce.number().min(1),
});

export type UpdateMedicalServiceDataDto = z.infer<
    typeof updateMedicalServiceDto
>;
export const createDoctorServiceDto = z.object({
    doctorId: z.string().uuid('Invalid doctor ID format'),
    medicalServiceId: z.string().uuid('Invalid medical service ID format'),
    price: z.coerce.number().min(0),
    durationMinutes: z.coerce.number(),
});

export type CreateDoctorServiceDataDto = z.infer<typeof createDoctorServiceDto>;
