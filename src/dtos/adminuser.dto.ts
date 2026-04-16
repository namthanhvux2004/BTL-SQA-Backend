import { z } from 'zod';
export const RegisterDoctorDto = z.object({
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
    staffData: z.object({
        departmentId: z.number().min(1, 'ID Khoa bắt buộc'),
        position: z.string().min(1, 'Chức vụ bắt buộc'),
        joinTime: z.coerce.date('Ngày vào làm không hợp lệ'),
    }),
    doctorData: z.object({
        specialization: z.string().min(1, 'Chuyên khoa bắt buộc'),
        licenseNumber: z.string().min(1, 'Số giấy phép hành nghề bắt buộc'),
        experienceYears: z.number().min(0, 'Năm kinh nghiệm không hợp lệ'),
        level: z.string().min(1, 'Cấp bậc bắt buộc'),
    }),
});

export type RegisterDoctorDataDto = z.infer<typeof RegisterDoctorDto>;

export const UpdateDoctorDto = z.object({
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
    staffData: z.object({
        departmentId: z.number().min(1, 'ID Khoa bắt buộc'),
        position: z.string().min(1, 'Chức vụ bắt buộc'),
        joinTime: z.coerce.date('Ngày vào làm không hợp lệ'),
    }),
    doctorData: z.object({
        specialization: z.string().min(1, 'Chuyên khoa bắt buộc'),
        licenseNumber: z.string().min(1, 'Số giấy phép hành nghề bắt buộc'),
        experienceYears: z.number().min(0, 'Năm kinh nghiệm không hợp lệ'),
        level: z.string().min(1, 'Cấp bậc bắt buộc'),
    }),
});
export type UpdateDoctorDataDto = z.infer<typeof UpdateDoctorDto>;

export const RegisterAdminDto = z.object({
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
    staffData: z.object({
        departmentId: z.number().min(1, 'ID Khoa bắt buộc'),
        position: z.string().min(1, 'Chức vụ bắt buộc'),
        joinTime: z.coerce.date('Ngày vào làm không hợp lệ'),
    }),
});

export type RegisterAdminDataDto = z.infer<typeof RegisterAdminDto>;

export const UpdateAdminDto = z.object({
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
    staffData: z.object({
        departmentId: z.number().min(1, 'ID Khoa bắt buộc'),
        position: z.string().min(1, 'Chức vụ bắt buộc'),
        joinTime: z.coerce.date('Ngày vào làm không hợp lệ'),
    }),
});
export type UpdateAdminDataDto = z.infer<typeof UpdateAdminDto>;

export const getAllPatientDto = z.object({
    page: z.string().optional().default('1'),
    limit: z.string().optional().default('10'),
    search: z.string().optional(),
    sortBy: z
        .enum(['name', 'createdAt', 'updatedAt'])
        .optional()
        .default('name'),
    sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
});
export type GetAllPatientDataDto = z.infer<typeof getAllPatientDto>;

export const getAllStaffDto = z.object({
    page: z.string().optional().default('1'),
    limit: z.string().optional().default('10'),
    search: z.string().optional(),
    role: z.string().optional(),
    sortBy: z
        .enum(['name', 'createdAt', 'updatedAt'])
        .optional()
        .default('name'),
    sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
});
export type GetAllStaffDataDto = z.infer<typeof getAllStaffDto>;

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

export const UpdatePatientProfileDto = z.object({
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

export type UpdatePatientProfileDataDto = z.infer<
    typeof UpdatePatientProfileDto
>;
