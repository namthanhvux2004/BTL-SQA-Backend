import { Staff } from '@prisma/client';
import { z } from 'zod';

// Schema validation cho query tìm kiếm danh sách khoa
export const DepartmentQuerySchema = z.object({
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

    // Tìm kiếm theo tên khoa
    search: z
        .string()
        .min(1, 'Từ khóa tìm kiếm không được để trống')
        .max(100, 'Từ khóa tìm kiếm không được quá 100 ký tự')
        .optional(),

    // Lọc theo loại khoa
    type: z.string().optional(),

    // Lọc theo mã khoa
    code: z
        .string()
        .min(1, 'Mã khoa không được để trống')
        .max(10, 'Mã khoa không được quá 10 ký tự')
        .optional(),

    // Chỉ lấy khoa có trưởng khoa
    hasHead: z.coerce.boolean().optional(),

    // Chỉ lấy khoa có nhân viên
    hasStaff: z.coerce.boolean().optional(),

    // Chỉ lấy khoa có dịch vụ y tế
    hasServices: z.coerce.boolean().optional(),

    // Sắp xếp theo trường nào
    sortBy: z
        .enum(['name', 'code', 'type', 'createdAt', 'staffCount'], {
            message: 'Trường sắp xếp không hợp lệ',
        })
        .optional()
        .default('name'),

    // Thứ tự sắp xếp
    sortOrder: z
        .enum(['asc', 'desc'], {
            message: 'Thứ tự sắp xếp phải là asc hoặc desc',
        })
        .optional()
        .default('asc'),

    // Bao gồm thông tin thống kê
    includeStats: z.coerce.boolean().optional().default(false),
});

// Type cho DepartmentQuery
export type DepartmentQueryDto = z.infer<typeof DepartmentQuerySchema>;

// Schema validation cho lấy khoa theo ID
export const GetDepartmentByIdSchema = z.object({
    id: z.coerce
        .number()
        .int('ID khoa phải là số nguyên')
        .min(1, 'ID khoa phải lớn hơn 0'),
});

// Type cho GetDepartmentById
export type GetDepartmentByIdDto = z.infer<typeof GetDepartmentByIdSchema>;

// Schema validation cho lấy khoa theo mã
export const GetDepartmentByCodeSchema = z.object({
    code: z
        .string()
        .min(1, 'Mã khoa là bắt buộc')
        .max(10, 'Mã khoa không được quá 10 ký tự'),
});

// Type cho GetDepartmentByCode
export type GetDepartmentByCodeDto = z.infer<typeof GetDepartmentByCodeSchema>;

// Schema validation cho thống kê khoa
export const DepartmentStatsQuerySchema = z.object({
    // Nhóm thống kê theo loại khoa
    groupByType: z.coerce.boolean().optional().default(false),

    // Bao gồm thống kê nhân viên
    includeStaffStats: z.coerce.boolean().optional().default(false),

    // Bao gồm thống kê dịch vụ
    includeServiceStats: z.coerce.boolean().optional().default(false),
});

// Type cho DepartmentStats
export type DepartmentStatsQueryDto = z.infer<
    typeof DepartmentStatsQuerySchema
>;

// Interface cho response data của khoa
export interface DepartmentResponseDto {
    id: number;
    name: string;
    description: string;
    code: string;
    phone?: string;
    thumbnail?: string;
    images?: string[];
    type: 'clinical' | 'paraclinical' | 'administrative';
    totalService?: number;
    createdAt: Date;
    updatedAt: Date;
    // Thông tin nhân viên
    staff?: Staff[];
    // Thông tin trưởng khoa
    head?: {
        userId: string;
        name: {
            firstName: string;
            lastName: string;
        };
        position: string;
        experienceYears?: number;
    };
    // Thông tin phó khoa
    deputies?: Array<{
        id: string;
        name: {
            firstName: string;
            lastName: string;
        };
        position: string;
        appointedAt: Date;
    }>;
    // Thông tin phòng
    room?: {
        id: string;
        name: string;
        floor: number;
        building: {
            name: string;
        };
    };
    // Danh sách dịch vụ y tế của khoa
    medicalServices?: Array<{
        id: number;
        name: string;
        price: number;
        isActive: boolean;
    }>;
    // Danh sách bác sĩ trong khoa
    doctors?: Array<{
        userId: number;
        staffId?: number;
        name: {
            firstName: string;
            lastName: string;
        };
        experienceYears?: number;
    }>;
    // Thống kê bổ sung
    stats?: {
        totalStaff: number;
        totalDoctors: number;
        totalServices: number;
        averageExperience?: number;
    };
}

// Interface cho response danh sách khoa với phân trang
export interface DepartmentListResponseDto {
    departments: DepartmentResponseDto[];
    pagination: {
        page: number;
        limit: number;
        totalItems: number;
        totalPages: number;
        hasNext: boolean;
        hasPrev: boolean;
    };
    // Thông tin thống kê tổng quan
    summary?: {
        totalDepartments: number;
        byType: { [key: string]: number };
        totalStaff: number;
        totalServices: number;
    };
}

// Interface cho thống kê khoa
export interface DepartmentStatsResponseDto {
    totalDepartments: number;
    byType: Array<{
        type: string;
        count: number;
        percentage: number;
    }>;
    staffStats: {
        totalStaff: number;
        averagePerDepartment: number;
        distribution: Array<{
            departmentName: string;
            staffCount: number;
            doctorCount: number;
        }>;
    };
    serviceStats: {
        totalServices: number;
        averagePerDepartment: number;
        distribution: Array<{
            departmentName: string;
            serviceCount: number;
            totalRevenue?: number;
        }>;
    };
}

// Enum cho loại khoa với mô tả tiếng Việt
export const DepartmentTypeLabels = {
    clinical: 'Khoa lâm sàng',
    paraclinical: 'Khoa cận lâm sàng',
    administrative: 'Khoa hành chính',
} as const;

export const DepartmentType = z.enum([
    'clinical',
    'paraclinical',
    'administrative',
]);

export const createDepartmentDto = z.object({
    name: z.string().min(1).max(100),
    description: z.string().max(500),
    code: z.string().min(1).max(10),
    phone: z.string().min(10).max(15),
    thumbnail: z.string().url(),
    image: z.array(z.string().url()).optional(),
    type: DepartmentType,
    headId: z.string(),
    roomId: z.string().optional().nullable(),
    deputies: z
        .array(
            z.object({
                userId: z.string().min(1, 'Deputy userId không được để trống'),
            })
        )
        .optional(),
});
export type CreateDepartmentDto = z.infer<typeof createDepartmentDto>;

export const updateDepartmentDto = z.object({
    name: z.string().min(1).max(100).optional(),
    description: z.string().max(500).optional(),
    code: z.string().min(1).max(10).optional(),
    phone: z.string().min(10).max(15).optional(),
    thumbnail: z.string().url().optional(),
    image: z.array(z.string().url()).optional(),
    type: DepartmentType.optional(),
    headId: z.string().optional(),
    roomId: z.string().optional(),
    deputies: z
        .array(
            z.object({
                userId: z.string().min(1, 'Deputy userId không được để trống'),
            })
        )
        .optional(),
});
export type UpdateDepartmentDto = z.infer<typeof updateDepartmentDto>;
