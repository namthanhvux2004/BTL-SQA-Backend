import { z } from 'zod';

export const HealthInsuranceDto = z.object({
    type: z.string().min(1, 'Loại bảo hiểm không được để trống'),
    insuranceId: z.string().min(1, 'Mã bảo hiểm không được để trống'),
    startAt: z.string().refine((date) => !isNaN(Date.parse(date)), {
        message: 'Ngày bắt đầu không hợp lệ',
    }),
    endAt: z.string().refine((date) => !isNaN(Date.parse(date)), {
        message: 'Ngày kết thúc không hợp lệ',
    }),
    level_of_benefit: z
        .number()
        .min(0, 'Mức độ quyền lợi không hợp lệ')
        .max(5, 'Mức độ quyền lợi không hợp lệ')
        .optional()
        .nullable(),
    province_code: z
        .string()
        .min(1, 'Mã tỉnh không được để trống')
        .optional()
        .nullable(),
    initial_kcb_code: z
        .string()
        .min(1, 'Mã KCB ban đầu không được để trống')
        .optional()
        .nullable(),
    initial_kcb_name: z
        .string()
        .min(1, 'Tên KCB ban đầu không được để trống')
        .optional()
        .nullable(),
});

export type HealthInsuranceDataDto = z.infer<typeof HealthInsuranceDto>;
