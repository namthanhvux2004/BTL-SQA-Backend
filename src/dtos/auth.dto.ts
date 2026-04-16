// src/dtos/auth.dto.ts
import { z } from 'zod';

export const LoginDto = z.object({
    email: z.string().email(),
    password: z.string().min(6),
});

export type LoginDataDto = z.infer<typeof LoginDto>;

export const RegisterPatientDto = z.object({
    username: z.string().min(1),
    email: z.email('Email không hợp lệ'),
    password: z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự'),
    birthday: z.coerce.date('Ngày sinh không hợp lệ'),
    gender: z.enum(['male', 'female', 'other'], 'Giới tính không hợp lệ'),
    phone: z
        .string()
        .min(10, 'Số điện thoại phải có ít nhất 10 ký tự')
        .regex(/^\d+$/, 'Số điện thoại không hợp lệ'),
    address: z.object({
        detail: z.string().min(1, 'Địa chỉ bắt buộc'),
        ward: z.string().min(1, 'Xã,phường bắt buộc'),
        district: z.string().optional(),
        city: z.string().min(1, 'Tỉnh,thành phố bắt buộc'),
        country: z.string().min(1, 'Quốc gia bắt buộc'),
    }),
    name: z.object({
        firstName: z.string().min(1, 'Họ bắt buộc'),
        lastName: z.string().min(1, 'Tên bắt buộc'),
    }),
});

export type RegisterPatientDataDto = z.infer<typeof RegisterPatientDto>;

export const RequestForgotPasswordDto = z.object({
    email: z.email('Email không hợp lệ'),
});

export type RequestForgotPasswordDataDto = z.infer<
    typeof RequestForgotPasswordDto
>;

export const VerifyForgotPasswordDto = z.object({
    email: z.email('Email không hợp lệ'),
    otp: z.string().min(6, 'OTP phải có ít nhất 6 ký tự'),
});

export type VerifyForgotPasswordDataDto = z.infer<
    typeof VerifyForgotPasswordDto
>;

export const ResetPasswordDto = z.object({
    email: z.email('Email không hợp lệ'),
    password: z
        .string()
        .min(8, 'Mật khẩu mới phải có ít nhất 8 ký tự')
        .max(32, 'Mật khẩu mới không được quá 32 ký tự')
        .regex(
            /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]/,
            'Mật khẩu mới phải bao gồm chữ thường, chữ hoa, số và ký tự đặc biệt'
        ),
});

export type ResetPasswordDataDto = z.infer<typeof ResetPasswordDto>;
