import { z } from 'zod';

const UUIDSchema = z.string().uuid();
const PositiveIntSchema = z.coerce.number().int().positive();

function notInPast() {
    return (date: Date) => date >= new Date(new Date().setHours(0, 0, 0, 0));
}

function isValidDate(val: string): boolean {
    const date = new Date(val);
    return !isNaN(date.getTime());
}

export const GetAvailableSlotsQuerySchema = z.object({
    doctorId: UUIDSchema.describe('ID của bác sĩ'),
    date: z
        .string()
        .min(1, 'Ngày không được để trống')
        .refine(isValidDate, { message: 'Ngày không hợp lệ' })
        .transform((val) => new Date(val))
        .refine(notInPast(), { message: 'Ngày không được trong quá khứ' }),
    departmentId: PositiveIntSchema.optional().describe('ID khoa (optional)'),
    medicalServiceId: UUIDSchema.optional().describe(
        'ID của dịch vụ khám (optional). Nếu có, slot duration sẽ dựa trên durationMinutes của service'
    ),
    slotDuration: z.coerce
        .number()
        .int()
        .min(15, 'Thời lượng slot tối thiểu là 15 phút')
        .max(120, 'Thời lượng slot tối đa là 120 phút')
        .optional()
        .describe(
            'Thời lượng mỗi slot (phút). Chỉ dùng khi không có medicalServiceId'
        ),
});

export const GetAppointmentsQuerySchema = z.object({
    page: PositiveIntSchema.optional().default(1).describe('Số trang'),
    limit: z.coerce
        .number()
        .int()
        .min(1)
        .max(100, 'Số lượng mỗi trang không được quá 100')
        .optional()
        .default(10)
        .describe('Số lượng mỗi trang'),
    status: z
        .enum(['pending', 'confirmed', 'cancelled', 'completed'])
        .optional()
        .describe('Lọc theo trạng thái'),
    doctorId: UUIDSchema.optional().describe('Lọc theo ID bác sĩ'),
    patientId: UUIDSchema.optional().describe('Lọc theo ID bệnh nhân'),
    fromDate: z.coerce.date().optional().describe('Lọc từ ngày'),
    toDate: z.coerce.date().optional().describe('Lọc đến ngày'),
    sortBy: z
        .enum(['startTime', 'createdAt', 'status'])
        .optional()
        .default('startTime')
        .describe('Trường sắp xếp'),
    sortOrder: z
        .enum(['asc', 'desc'])
        .optional()
        .default('asc')
        .describe('Thứ tự sắp xếp'),
    search: z
        .string()
        .min(1, 'Chuỗi tìm kiếm không được để trống')
        .optional()
        .describe('Chuỗi tìm kiếm trong lý do khám'),
});

export const CreateAppointmentSchema = z.object({
    doctorId: z
        .uuid('ID bác sĩ không hợp lệ')
        .optional()
        .nullable()
        .default(null),
    patientId: z.uuid('ID bệnh nhân không hợp lệ').optional(),
    departmentId: z.number().optional().describe('ID khoa (optional)'),
    scheduleId: z
        .uuid('ID lịch làm việc không hợp lệ')
        .optional()
        .nullable()
        .default(null),
    medicalServiceId: z
        .string()
        .optional()
        .describe(
            'ID của dịch vụ khám (optional). Nếu có, appointment sẽ gắn với dịch vụ cụ thể'
        )
        .nullable()
        .default(null),
    type: z
        .enum(['new', 'followUp', 'checkUp', 'consultation', 'telehealth'], {
            message: 'Loại cuộc hẹn không hợp lệ',
        })
        .optional()
        .default('new'),
    startTime: z
        .string()
        .min(1, 'Thời gian bắt đầu không được để trống')
        .refine(
            (val) => {
                const date = new Date(val);
                return !isNaN(date.getTime());
            },
            { message: 'Thời gian bắt đầu không hợp lệ' }
        )
        .transform((val) => new Date(val)),
    endTime: z
        .string()
        .optional()
        .refine(
            (val) => {
                if (!val) return true;
                const date = new Date(val);
                return !isNaN(date.getTime());
            },
            { message: 'Thời gian kết thúc không hợp lệ' }
        )
        .transform((val) => (val ? new Date(val) : undefined)),
    reason: z
        .string()
        .min(1, 'Lý do khám là bắt buộc')
        .max(500, 'Lý do khám không được quá 500 ký tự'),
    notes: z.string().max(1000, 'Ghi chú không được quá 1000 ký tự').optional(),
});

export const UpdateAppointmentSchema = z.object({
    startTime: z.coerce.date().optional(),
    endTime: z.coerce.date().optional(),
    reason: z
        .string()
        .min(1, 'Lý do khám phải có ít nhất 10 ký tự')
        .max(500, 'Lý do khám không được quá 500 ký tự')
        .optional(),
    notes: z.string().max(1000, 'Ghi chú không được quá 1000 ký tự').optional(),
    status: z
        .enum(['pending', 'confirmed', 'cancelled', 'completed', 'rejected'], {
            message: 'Trạng thái không hợp lệ',
        })
        .optional(),
    reasonCancel: z
        .string()
        .max(500, 'Lý do hủy không được quá 500 ký tự')
        .optional(),
});

export const CancelAppointmentSchema = z.object({
    reason: z
        .string()
        .min(10, 'Lý do hủy phải có ít nhất 10 ký tự')
        .max(500, 'Lý do hủy không được quá 500 ký tự')
        .optional(),
});

export const RejectAppointmentSchema = z.object({
    reasonCancel: z
        .string()
        .min(10, 'Lý do từ chối phải có ít nhất 10 ký tự')
        .max(500, 'Lý do từ chối không được quá 500 ký tự'),
});

export const ApproveAppointmentSchema = z.object({
    notes: z.string().max(1000, 'Ghi chú không được quá 1000 ký tự').optional(),
});

export interface AvailableSlotDto {
    start: Date;
    end: Date;
    scheduleId: string;
    roomId: string;
    roomName: string;
    departmentId: number;
    departmentName: string;
    availableCount: number; // Số chỗ còn trống
    maxSlot: number; // Tổng số chỗ
}

export interface AvailableSlotsResponseDto {
    date: Date;
    doctorId: string;
    doctorName: string;
    medicalService?: {
        id: string;
        name: string;
        durationMinutes: number;
        price: number;
    } | null;
    slots: AvailableSlotDto[];
    totalSlots: number;
}

export interface AppointmentResponseDto {
    id: string;
    patient: {
        id: string;
        name: string;
        email: string;
        phone: string | null;
        avatar: string | null;
        patientId: string;
    };
    medicalService?: {
        id: string;
        name: string;
        durationMinutes: number;
        price: number;
    } | null;
    department?: {
        id: number;
        name: string;
    } | null;
    doctor: {
        id: string;
        name: string;
        specialization: string;
        level: string;
        avatar: string | null;
    };
    schedule?: {
        id: string;
        room: string;
        department: string;
    } | null;
    type: string;
    startTime: Date;
    endTime: Date | null;
    reason: string;
    reasonCancel: string | null;
    notes: string | null;
    status: string;
    createdAt: Date;
    updatedAt: Date;
    bookedBy?: {
        id: string;
        name: string;
    } | null;
}

export interface AppointmentsListResponseDto {
    appointments: AppointmentResponseDto[];
    pagination: {
        page: number;
        limit: number;
        totalItems: number;
        totalPages: number;
        hasNext: boolean;
        hasPrev: boolean;
    };
}

export type GetAvailableSlotsQuery = z.infer<
    typeof GetAvailableSlotsQuerySchema
>;
export type GetAppointmentsQuery = z.infer<typeof GetAppointmentsQuerySchema>;
export type CreateAppointmentDto = z.infer<typeof CreateAppointmentSchema>;
export type UpdateAppointmentDto = z.infer<typeof UpdateAppointmentSchema>;
export type CancelAppointmentDto = z.infer<typeof CancelAppointmentSchema>;
export type RejectAppointmentDto = z.infer<typeof RejectAppointmentSchema>;
export type ApproveAppointmentDto = z.infer<typeof ApproveAppointmentSchema>;
