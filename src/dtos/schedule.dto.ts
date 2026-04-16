import { z } from 'zod';

export const ScheduleTypeEnum = z.enum([
    'appointment',
    'work',
    'surgery',
    'duty',
    'admin',
    'off',
]);

export const ScheduleStatusEnum = z.enum([
    'pending',
    'confirmed',
    'cancelled',
    'completed',
]);

const isValidQueryDate = (v: unknown) => {
    if (v === undefined || v === null || String(v).trim() === '') return true;
    const s = String(v).trim();
    const d = new Date(s);
    return !Number.isNaN(d.getTime());
};

export const GetListSchedulesQueryDto = z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    doctorId: z.string().optional(),
    date: z.string().optional().refine(isValidQueryDate, {
        message:
            'Ngày phải là định dạng ngày hợp lệ (ví dụ: 2025-11-01 hoặc 01-11-2025 hoặc ISO datetime)',
    }),
});
export type GetListSchedulesQueryDataDto = z.infer<
    typeof GetListSchedulesQueryDto
>;

export const CreateScheduleSchema = z
    .object({
        staffId: z.string().min(1, 'Staff ID không được để trống'),
        departmentId: z.number().min(1, 'Department ID không được để trống'),
        type: ScheduleTypeEnum.default('work'),
        roomId: z.string().min(1, 'Room ID không được để trống'),

        date: z.string().refine((v) => !Number.isNaN(Date.parse(v)), {
            message: 'Ngày không hợp lệ',
        }),

        status: ScheduleStatusEnum.default('pending'),

        maxSlot: z
            .number()
            .min(0, 'Số lượng slot phải lớn hơn hoặc bằng 0')
            .optional(),

        startTime: z.string().refine((v) => !Number.isNaN(Date.parse(v)), {
            message:
                'Thời gian bắt đầu phải là ISO-8601 datetime (ví dụ: 2025-11-10T09:00:00.000Z)',
        }),

        endTime: z.string().refine((v) => !Number.isNaN(Date.parse(v)), {
            message:
                'Thời gian kết thúc phải là ISO-8601 datetime (ví dụ: 2025-11-10T12:00:00.000Z)',
        }),
    })
    .refine(
        (data) => {
            const start = Date.parse(data.startTime);
            const end = Date.parse(data.endTime);
            return !Number.isNaN(start) && !Number.isNaN(end) && end > start;
        },
        {
            message: 'Thời gian kết thúc phải lớn hơn thời gian bắt đầu',
            path: ['endTime'],
        }
    );
export type CreateScheduleDto = z.infer<typeof CreateScheduleSchema>;

export const UpdateScheduleSchema = z.object({
    id: z.string().min(1, 'Schedule ID không được để trống'),
    departmentId: z
        .number()
        .min(1, 'Department ID không được để trống')
        .optional(),
    type: ScheduleTypeEnum.optional(),
    roomId: z.string().min(1, 'Room ID không được để trống').optional(),
    date: z
        .string()
        .optional()
        .refine((v) => !v || !Number.isNaN(Date.parse(v)), {
            message: 'Ngày không hợp lệ',
        }),
    status: ScheduleStatusEnum.optional(),
    maxSlot: z
        .number()
        .min(0, 'Số lượng slot phải lớn hơn hoặc bằng 0')
        .optional(),
    startTime: z
        .string()
        .optional()
        .refine((v) => !v || !Number.isNaN(Date.parse(v)), {
            message:
                'Thời gian bắt đầu phải là ISO-8601 datetime (ví dụ: 2025-11-10T09:00:00.000Z)',
        }),
    endTime: z
        .string()
        .optional()
        .refine((v) => !v || !Number.isNaN(Date.parse(v)), {
            message:
                'Thời gian kết thúc phải là ISO-8601 datetime (ví dụ: 2025-11-10T12:00:00.000Z)',
        }),
});
export type UpdateScheduleDto = z.infer<typeof UpdateScheduleSchema>;
