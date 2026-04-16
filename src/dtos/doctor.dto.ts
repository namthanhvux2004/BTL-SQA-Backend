// src/dtos/doctor.dto.ts
// Định nghĩa các DTO và validation schema cho API bác sĩ
import { z } from 'zod';

// Schema validation cho query tìm kiếm danh sách bác sĩ
export const DoctorQuerySchema = z.object({
    // Phân trang
    page: z.coerce
        .number()
        .int('Số trang phải là số nguyên')
        .min(1, 'Số trang phải lớn hơn 0')
        .optional()
        .default(1),

    limit: z.coerce
        .number()
        .int('Số lượng mỗi trang phải là số nguyên')
        .min(1, 'Số lượng mỗi trang phải lớn hơn 0')
        .max(100, 'Số lượng mỗi trang không được quá 100')
        .optional()
        .default(10),

    // Tìm kiếm theo tên bác sĩ
    search: z
        .string()
        .min(1, 'Từ khóa tìm kiếm không được để trống')
        .max(100, 'Từ khóa tìm kiếm không được quá 100 ký tự')
        .optional(),

    // Lọc theo chuyên khoa
    specialization: z
        .string()
        .min(1, 'Chuyên khoa không được để trống')
        .max(100, 'Tên chuyên khoa không được quá 100 ký tự')
        .optional(),

    // Lọc theo cấp độ bác sĩ (thạc sĩ, tiến sĩ, phó giáo sư, giáo sư)
    level: z
        .enum(
            [
                'thạc sĩ',
                'tiến sĩ',
                'phó giáo sư',
                'giáo sư',
                'chuyên khoa I',
                'chuyên khoa II',
            ],
            {
                message: 'Cấp độ bác sĩ không hợp lệ',
            }
        )
        .optional(),

    // Lọc theo khoa (departmentId)
    departmentId: z.coerce
        .number()
        .int('ID khoa phải là số nguyên')
        .min(1, 'ID khoa phải lớn hơn 0')
        .optional(),

    // Lọc theo medicalServiceId
    medicalServiceId: z.string().optional(),
    // Lọc theo số năm kinh nghiệm tối thiểu
    minExperience: z.coerce
        .number()
        .int('Số năm kinh nghiệm phải là số nguyên')
        .min(0, 'Số năm kinh nghiệm phải lớn hơn hoặc bằng 0')
        .optional(),

    // Lọc theo số năm kinh nghiệm tối đa
    maxExperience: z.coerce
        .number()
        .int('Số năm kinh nghiệm phải là số nguyên')
        .min(0, 'Số năm kinh nghiệm phải lớn hơn hoặc bằng 0')
        .optional(),

    // Sắp xếp theo trường nào
    sortBy: z
        .enum(
            ['name', 'experienceYears', 'level', 'specialization', 'createdAt'],
            {
                message: 'Trường sắp xếp không hợp lệ',
            }
        )
        .optional()
        .default('name'),

    // Thứ tự sắp xếp
    sortOrder: z
        .enum(['asc', 'desc'], {
            message: 'Thứ tự sắp xếp phải là asc hoặc desc',
        })
        .optional()
        .default('asc'),

    // Chỉ lấy bác sĩ có lịch khám (có trong bảng schedules)
    hasSchedule: z.coerce.boolean().optional(),

    // Lấy bác sĩ nổi bật (có nhiều lịch hẹn)
    isPopular: z.coerce.boolean().optional(),
});

// Type cho DoctorQuery
export type DoctorQueryDto = z.infer<typeof DoctorQuerySchema>;

// Schema validation cho lấy bác sĩ theo ID
export const GetDoctorByIdSchema = z.object({
    id: z
        .string()
        .min(1, 'ID bác sĩ là bắt buộc')
        .max(100, 'ID bác sĩ không được quá 100 ký tự')
        .regex(
            /^[a-zA-Z0-9\-_]+$/,
            'ID bác sĩ chỉ được chứa chữ cái, số, dấu gạch ngang và gạch dưới'
        ),
});

// Type cho GetDoctorById
export type GetDoctorByIdDto = z.infer<typeof GetDoctorByIdSchema>;

// Schema validation cho lấy bác sĩ theo chuyên khoa
export const GetDoctorsBySpecializationSchema = z.object({
    specialization: z
        .string()
        .min(1, 'Tên chuyên khoa là bắt buộc')
        .max(100, 'Tên chuyên khoa không được quá 100 ký tự'),
});

// Type cho GetDoctorsBySpecialization
export type GetDoctorsBySpecializationDto = z.infer<
    typeof GetDoctorsBySpecializationSchema
>;

// Schema validation cho lấy bác sĩ theo khoa
export const GetDoctorsByDepartmentSchema = z.object({
    departmentId: z
        .string()
        .refine((val) => !isNaN(Number(val)), {
            message: 'ID khoa phải là số',
        })
        .transform((val) => parseInt(val, 10)),
});

// Type cho GetDoctorsByDepartment
export type GetDoctorsByDepartmentDto = z.infer<
    typeof GetDoctorsByDepartmentSchema
>;

// Schema validation cho thống kê bác sĩ
export const DoctorStatsQuerySchema = z.object({
    // Nhóm thống kê theo chuyên khoa
    groupBySpecialization: z.coerce.boolean().optional().default(false),

    // Nhóm thống kê theo cấp độ
    groupByLevel: z.coerce.boolean().optional().default(false),

    // Nhóm thống kê theo khoa
    groupByDepartment: z.coerce.boolean().optional().default(false),
});

// Type cho DoctorStats
export type DoctorStatsQueryDto = z.infer<typeof DoctorStatsQuerySchema>;

// Interface cho response data của bác sĩ (để format dữ liệu trả về)
export interface DoctorResponseDto {
    id: string;
    user: {
        id: string;
        username: string;
        email: string;
        avatar?: string | undefined;
        phone?: string | undefined;
        name?:
            | {
                  firstName: string;
                  lastName: string;
              }
            | undefined;
    };
    staff: {
        staffId: string;
        position: string;
        joinTime: Date;
        department: {
            id: number;
            name: string;
            code: string;
            type: string;
        };
    };
    specialization: string;
    licenseNumber?: string;
    experienceYears: number;
    level: string;
    // Thông tin bổ sung được tính toán
    appointmentCount?: number;
    rating?: number;
    isAvailable?: boolean;
    nextAvailableTime?: Date;
}

// Interface cho response danh sách bác sĩ với phân trang
export interface DoctorListResponseDto {
    doctors: DoctorResponseDto[];
    pagination: {
        page: number;
        limit: number;
        totalItems: number;
        totalPages: number;
        hasNext: boolean;
        hasPrev: boolean;
    };
    // Thông tin thống kê bổ sung
    stats?: {
        totalDoctors: number;
        bySpecialization?: { [key: string]: number };
        byLevel?: { [key: string]: number };
        byDepartment?: { [key: string]: number };
        averageExperience?: number;
    };
}

// Interface cho thống kê bác sĩ
export interface DoctorStatsResponseDto {
    totalDoctors: number;
    bySpecialization: {
        specialization: string;
        count: number;
        percentage: number;
    }[];
    byLevel: { level: string; count: number; percentage: number }[];
    byDepartment: { department: string; count: number; percentage: number }[];
    experienceStats: {
        average: number;
        min: number;
        max: number;
        distribution: { range: string; count: number }[];
    };
}
