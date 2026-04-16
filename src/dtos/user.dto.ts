import z from 'zod';
import { multerFileDto } from './image.dto';

export const GetUserProfileDto = z.object({
    id: z.string().uuid(),
});

export type GetUserProfileDataDto = z.infer<typeof GetUserProfileDto>;

// Cập nhật thông tin cá nhân
export const UpdateUserProfileDto = z.object({
    avatar: z.string().url('Ảnh đại diện phải là URL hợp lệ').optional(),
    citizen_id: z.string().optional(),
    email: z.string().email('Email không hợp lệ').optional(),
    birthday: z.coerce.date().optional(),
    gender: z.enum(['male', 'female', 'other']).optional(),
    phone: z
        .string()
        .min(10, 'Số điện thoại phải có ít nhất 10 ký tự')
        .regex(/^\d+$/, 'Số điện thoại không hợp lệ')
        .optional(),
    address: z.preprocess(
        (val) => {
            if (typeof val === 'string') {
                try {
                    return JSON.parse(val);
                } catch {
                    return val;
                }
            }
            return val;
        },
        z
            .object({
                detail: z.string().min(1, 'Địa chỉ chi tiết là bắt buộc'),
                ward: z.string().min(1, 'Phường/Xã là bắt buộc'),
                district: z.string().optional(),
                city: z.string().min(1, 'Tỉnh/Thành phố là bắt buộc'),
                country: z.string().min(1, 'Quốc gia là bắt buộc'),
            })
            .optional()
    ),
    name: z.preprocess(
        (val) => {
            if (typeof val === 'string') {
                try {
                    return JSON.parse(val);
                } catch {
                    return val;
                }
            }
            return val;
        },
        z
            .object({
                firstname: z.string().min(1, 'Tên là bắt buộc'),
                lastname: z.string().min(1, 'Họ là bắt buộc'),
            })
            .optional()
    ),
});

export type UpdateUserProfileDataDto = z.infer<typeof UpdateUserProfileDto>;

export const AvatarUserDto = z.object({
    newAvatar: z
        .array(multerFileDto)
        .length(1, 'Avatar is required')
        .optional()
        .refine(
            (files) => {
                if (!files || files.length === 0) return true;
                return ['image/jpeg', 'image/png', 'image/jpg'].includes(
                    files?.[0]?.mimetype ?? ''
                );
            },
            { message: 'Chỉ chấp nhận ảnh JPEG, PNG hoặc WEBP' }
        )
        .refine(
            (files) => {
                if (!files || files.length === 0) return true;
                return files?.[0] && files[0].size <= 2 * 1024 * 1024;
            },
            { message: 'Dung lượng ảnh tối đa là 2MB' }
        ),
});

export type AvatarUserDataDto = z.infer<typeof AvatarUserDto>;

// Đổi mật khẩu
export const ChangePasswordDto = z
    .object({
        currentPassword: z.string().min(1, 'Mật khẩu hiện tại là bắt buộc'),
        newPassword: z
            .string()
            .min(8, 'Mật khẩu mới phải có ít nhất 8 ký tự')
            .max(32, 'Mật khẩu mới không được quá 32 ký tự')
            .regex(
                /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]/,
                'Mật khẩu mới phải bao gồm chữ thường, chữ hoa, số và ký tự đặc biệt'
            ),
        confirmPassword: z.string().min(1, 'Xác nhận mật khẩu là bắt buộc'),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
        message: 'Mật khẩu xác nhận không khớp',
        path: ['confirmPassword'],
    });

export type ChangePasswordDataDto = z.infer<typeof ChangePasswordDto>;

export const GetAccountInfoDto = z.object({
    id: z.string().uuid(),
});

export type GetAccountInfoDataDto = z.infer<typeof GetAccountInfoDto>;
