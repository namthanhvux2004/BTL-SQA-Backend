import {
    RegisterDoctorDataDto,
    UpdateDoctorDataDto,
    GetAllPatientDataDto,
    GetAllStaffDataDto,
    RegisterPatientDataDto,
    UpdatePatientProfileDataDto,
    RegisterAdminDataDto,
    UpdateAdminDataDto,
} from '@src/dtos/adminuser.dto';
import adminUserDao from '@src/daos/adminuser.dao';
import roleService from '@src/daos/role.dao';
import prisma from '@src/config/prisma';
import { hashCode } from '@src/helpers/generateCode';
import otpService from './otp.service';
import { CustomError, ErrorType, ValidationError } from '@src/core/Error';
import { generateIdForModel } from '@src/helpers/generateId';
import { createQueryBuilder } from '@src/helpers/queryBuilder';
import { UserRole } from '@prisma/client';
const registerDoctor = async (data: RegisterDoctorDataDto) => {
    const { name, address, staffData, doctorData, ...userData } = data;
    const userQuery = createQueryBuilder('user');
    const existingUser = await userQuery.findUnique({ email: userData.email });
    const hasPassword = await hashCode(userData.password);
    if (existingUser) {
        throw new ValidationError(
            [
                {
                    field: 'email',
                    message: 'Email đã tồn tại.',
                },
            ],
            'Email đã tồn tại.'
        );
    }
    const role = await roleService.getRoleByName(UserRole.doctor);

    if (!role) {
        throw new CustomError(
            ErrorType.INTERNAL_ERROR,
            'Chức năng chưa triển khai cho Doctor'
        );
    }

    // ensure birthday is an ISO DateTime that Prisma accepts
    if (userData.birthday) {
        const birthday = new Date(userData.birthday);
        if (Number.isNaN(birthday.getTime())) {
            throw new ValidationError([
                { field: 'birthday', message: 'Ngày sinh không hợp lệ' },
            ]);
        }
        userData.birthday = birthday;
    }

    if (staffData.departmentId) {
        const dept = await prisma.department.findUnique({
            where: { id: staffData.departmentId },
        });
        if (!dept) {
            throw new ValidationError([
                { field: 'departmentId', message: 'Khoa không tồn tại' },
            ]);
        }
    }

    if (doctorData.licenseNumber) {
        const existingDoctorWithLicense = await prisma.doctor.findUnique({
            where: { licenseNumber: doctorData.licenseNumber },
        });
        if (existingDoctorWithLicense) {
            throw new ValidationError(
                [
                    {
                        field: 'licenseNumber',
                        message: 'Số giấy phép hành nghề đã tồn tại.',
                    },
                ],
                'Số giấy phép hành nghề đã tồn tại.'
            );
        }
    }

    try {
        const result = await prisma.$transaction(async (prisma) => {
            const newAddress = await prisma.address.create({
                data: {
                    ...address,
                    district: address.district || null,
                },
            });
            const user = await prisma.user.create({
                data: {
                    ...userData,
                    password: hasPassword,
                    roleId: role.id,
                    addressId: newAddress.id,
                },
            });
            await prisma.authentication.create({
                data: {
                    userId: user.id,
                    isVerified: true,
                },
            });
            await prisma.name.create({
                data: {
                    ...name,
                    userId: user.id,
                },
            });

            const doctorId = await generateIdForModel(
                prisma.counter,
                role.name,
                role.prefix
            );
            const staff = await prisma.staff.create({
                data: {
                    ...staffData,
                    staffId: doctorId,
                    userId: user.id,
                },
            });
            const doctor = await prisma.doctor.create({
                data: {
                    ...doctorData,
                    userId: user.id,
                },
            });
            return { user, staff, doctor };
        });

        const otpResult = await otpService.createAndSend(
            result.user.email,
            'REGISTER',
            result.user.id,
            'Xác thực đăng ký tài khoản bác sĩ'
        );
        return {
            data: result,
            otpResult,
        };
    } catch {
        throw new CustomError(
            ErrorType.INTERNAL_ERROR,
            'Đăng ký tài khoản thất bại. Vui lòng thử lại'
        );
    }
};
const updateDoctor = async (data: UpdateDoctorDataDto, doctorId: string) => {
    const { name, address, staffData, doctorData, ...userData } = data;
    const existingUser = await prisma.user.findUnique({
        where: { id: doctorId },
        include: {
            address: true,
            name: true,
            staff: {
                include: { doctor: true },
            },
        },
    });
    if (!existingUser) {
        throw new ValidationError(
            [{ field: 'userId', message: 'User không tồn tại' }],
            'User không tồn tại'
        );
    }
    try {
        const result = await prisma.$transaction(async (tx) => {
            if (address) {
                if (existingUser.addressId) {
                    await tx.address.delete({
                        where: { id: existingUser.addressId },
                    });
                }
                const newAddr = await tx.address.create({
                    data: { ...address, district: address.district || null },
                });
                await tx.user.update({
                    where: { id: doctorId },
                    data: { addressId: newAddr.id },
                });
            }
            await tx.name.update({
                where: { userId: doctorId },
                data: { ...name },
            });
            const staff = await tx.staff.update({
                where: { userId: doctorId },
                data: { ...staffData },
            });
            const doctor = await tx.doctor.update({
                where: { userId: doctorId },
                data: { ...doctorData },
            });
            const user = await tx.user.update({
                where: { id: doctorId },
                data: { ...userData },
            });
            return { user, staff, doctor };
        });
        const otpResult = await otpService.createAndSend(
            result.user.email,
            'UPDATE',
            result.user.id,
            'Xác thực cập nhật tài khoản bác sĩ'
        );
        return {
            data: result,
            otpResult,
        };
    } catch {
        throw new CustomError(
            ErrorType.INTERNAL_ERROR,
            'Update tài khoản thất bại. Vui lòng thử lại'
        );
    }
};

const registerAdmin = async (data: RegisterAdminDataDto) => {
    const { name, address, staffData, ...userData } = data;
    const userQuery = createQueryBuilder('user');
    const existingUser = await userQuery.findUnique({ email: userData.email });
    const hasPassword = await hashCode(userData.password);
    if (existingUser) {
        throw new ValidationError(
            [
                {
                    field: 'email',
                    message: 'Email đã tồn tại.',
                },
            ],
            'Email đã tồn tại.'
        );
    }
    const role = await roleService.getRoleByName(UserRole.admin);

    if (!role) {
        throw new CustomError(
            ErrorType.INTERNAL_ERROR,
            'Chức năng chưa triển khai cho Admin'
        );
    }

    // ensure birthday is an ISO DateTime that Prisma accepts
    if (userData.birthday) {
        const birthday = new Date(userData.birthday);
        if (Number.isNaN(birthday.getTime())) {
            throw new ValidationError([
                { field: 'birthday', message: 'Ngày sinh không hợp lệ' },
            ]);
        }
        userData.birthday = birthday;
    }

    if (staffData.departmentId) {
        const dept = await prisma.department.findUnique({
            where: { id: staffData.departmentId },
        });
        if (!dept) {
            throw new ValidationError([
                { field: 'departmentId', message: 'Khoa không tồn tại' },
            ]);
        }
    }

    try {
        const result = await prisma.$transaction(async (prisma) => {
            const newAddress = await prisma.address.create({
                data: {
                    ...address,
                    district: address.district || null,
                },
            });
            const user = await prisma.user.create({
                data: {
                    ...userData,
                    password: hasPassword,
                    roleId: role.id,
                    addressId: newAddress.id,
                },
            });
            await prisma.authentication.create({
                data: {
                    userId: user.id,
                    isVerified: true,
                },
            });
            await prisma.name.create({
                data: {
                    ...name,
                    userId: user.id,
                },
            });

            const adminId = await generateIdForModel(
                prisma.counter,
                role.name,
                role.prefix
            );
            const staff = await prisma.staff.create({
                data: {
                    ...staffData,
                    staffId: adminId,
                    userId: user.id,
                },
            });
            return { user, staff };
        });

        const otpResult = await otpService.createAndSend(
            result.user.email,
            'REGISTER',
            result.user.id,
            'Xác thực đăng ký tài khoản admin'
        );
        return {
            data: result,
            otpResult,
        };
    } catch {
        throw new CustomError(
            ErrorType.INTERNAL_ERROR,
            'Đăng ký tài khoản thất bại. Vui lòng thử lại'
        );
    }
};

const updateAdmin = async (data: UpdateAdminDataDto, adminId: string) => {
    const { name, address, staffData, ...userData } = data;
    const existingUser = await prisma.user.findUnique({
        where: { id: adminId },
        include: {
            address: true,
            name: true,
            staff: {
                include: { doctor: true },
            },
        },
    });
    if (!existingUser) {
        throw new ValidationError(
            [{ field: 'userId', message: 'User không tồn tại' }],
            'User không tồn tại'
        );
    }
    // try {
    const result = await prisma.$transaction(async (tx) => {
        if (address) {
            if (existingUser.addressId) {
                await tx.address.delete({
                    where: { id: existingUser.addressId },
                });
            }
            const newAddr = await tx.address.create({
                data: { ...address, district: address.district || null },
            });
            await tx.user.update({
                where: { id: adminId },
                data: { addressId: newAddr.id },
            });
        }
        await tx.name.update({
            where: { userId: adminId },
            data: { ...name },
        });
        const staff = await tx.staff.update({
            where: { userId: adminId },
            data: { ...staffData },
        });
        const user = await tx.user.update({
            where: { id: adminId },
            data: { ...userData },
        });
        return { user, staff };
    });
    const otpResult = await otpService.createAndSend(
        result.user.email,
        'UPDATE',
        result.user.id,
        'Xác thực cập nhật tài khoản admin'
    );
    return {
        data: result,
        otpResult,
    };
    // } catch (error) {
    //     throw new CustomError(
    //         ErrorType.INTERNAL_ERROR,
    //         'update tài khoản thất bại. Vui lòng thử lại'
    //     );
    // }
};

const registerPatient = async (data: RegisterPatientDataDto) => {
    const { name, address, ...userData } = data;
    const userQuery = createQueryBuilder('user');
    const existingUser = await userQuery.findUnique({ email: userData.email });
    const hasPassword = await hashCode(userData.password);
    if (existingUser) {
        throw new ValidationError(
            [
                {
                    field: 'email',
                    message: 'Email đã tồn tại.',
                },
            ],
            'Email đã tồn tại.'
        );
    }
    const role = await roleService.getRoleByName(UserRole.patient);

    if (!role) {
        throw new CustomError(
            ErrorType.INTERNAL_ERROR,
            'Chức năng chưa triển khai cho bệnh nhân'
        );
    }

    // ensure birthday is an ISO DateTime that Prisma accepts
    if (userData.birthday) {
        const birthday = new Date(userData.birthday);
        if (Number.isNaN(birthday.getTime())) {
            throw new ValidationError([
                { field: 'birthday', message: 'Ngày sinh không hợp lệ' },
            ]);
        }
        userData.birthday = birthday;
    }

    try {
        const result = await prisma.$transaction(async (prisma) => {
            const newAddress = await prisma.address.create({
                data: {
                    ...address,
                    district: address.district || null,
                },
            });
            const user = await prisma.user.create({
                data: {
                    ...userData,
                    password: hasPassword,
                    roleId: role.id,
                    addressId: newAddress.id,
                },
            });
            await prisma.authentication.create({
                data: {
                    userId: user.id,
                    isVerified: true,
                },
            });
            await prisma.name.create({
                data: {
                    ...name,
                    userId: user.id,
                },
            });

            const patientId = await generateIdForModel(
                prisma.counter,
                'patient',
                role.prefix
            );
            const patient = await prisma.patient.create({
                data: {
                    patientId: patientId,
                    userId: user.id,
                },
            });
            const ehr = await prisma.eHR.create({
                data: {
                    patientId: patient.userId,
                },
            });
            return { user, patient, ehr };
        });

        const otpResult = await otpService.createAndSend(
            result.user.email,
            'REGISTER',
            result.user.id,
            'Xác thực đăng ký tài khoản bệnh nhân'
        );
        return {
            data: result,
            otpResult,
        };
    } catch {
        throw new CustomError(
            ErrorType.INTERNAL_ERROR,
            'Đăng ký tài khoản thất bại. Vui lòng thử lại'
        );
    }
};

const updateUserProfile = async (
    data: UpdatePatientProfileDataDto,
    userId: string
) => {
    const { name, address, ...userData } = data;
    const existingUser = await prisma.user.findUnique({
        where: { id: userId },
        include: { address: true, name: true },
    });
    if (!existingUser) {
        throw new ValidationError(
            [{ field: 'userId', message: 'User không tồn tại' }],
            'User không tồn tại'
        );
    }
    try {
        const result = await prisma.$transaction(async (tx) => {
            if (address) {
                if (existingUser.addressId) {
                    await tx.address.delete({
                        where: { id: existingUser.addressId },
                    });
                }
                const newAddr = await tx.address.create({
                    data: { ...address, district: address.district || null },
                });
                await tx.user.update({
                    where: { id: userId },
                    data: { addressId: newAddr.id },
                });
            }
            await tx.name.update({
                where: { userId: userId },
                data: { ...name },
            });
            const user = await tx.user.update({
                where: { id: userId },
                data: { ...userData },
            });
            return { user };
        });
        return {
            data: result,
        };
    } catch {
        throw new CustomError(
            ErrorType.INTERNAL_ERROR,
            'Cập nhật thông tin thất bại. Vui lòng thử lại'
        );
    }
};

const getAllPatient = async (params: GetAllPatientDataDto) => {
    const result = await adminUserDao.getAllUserDao(params);
    return result;
};

const getAllStaff = async (params: GetAllStaffDataDto) => {
    const result = await adminUserDao.getAllStaffDao(params);
    return result;
};

const getStaffStats = async () => {
    const result = await adminUserDao.getStaffStatsDao();
    return result;
};

const getPatientStats = async () => {
    const result = await adminUserDao.getPatientStatsDao();
    return result;
};

export default {
    registerDoctor,
    updateDoctor,
    registerAdmin,
    updateAdmin,
    registerPatient,
    updateUserProfile,
    getAllPatient,
    getAllStaff,
    getStaffStats,
    getPatientStats,
};
