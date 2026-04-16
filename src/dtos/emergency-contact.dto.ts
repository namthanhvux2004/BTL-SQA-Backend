import { z } from 'zod';

export const EmergencyContactDto = z.object({
    fullName: z.string().min(1, 'Tên là bắt buộc'),
    relationship: z.string().min(1, 'Mối quan hệ là bắt buộc'),
    phone: z.string().min(1, 'Số điện thoại là bắt buộc'),
    email: z.email('Email không hợp lệ').optional(),
});

export type EmergencyContactDataDto = z.infer<typeof EmergencyContactDto>;
