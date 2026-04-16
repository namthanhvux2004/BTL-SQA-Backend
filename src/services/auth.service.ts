import { LoginDataDto, RegisterPatientDataDto } from '@src/dtos/auth.dto';
import roleService from '@src/daos/role.dao';
import prisma from '@src/config/prisma';
import { compareCode, hashCode } from '@src/helpers/generateCode';
import otpService from './otp.service';
import { CustomError, ErrorType, ValidationError } from '@src/core/Error';
import { generateIdForModel } from '@src/helpers/generateId';
import { createQueryBuilder } from '@src/helpers/queryBuilder';
import { findUserByEmail } from '@src/daos/auth.dao';
import { AuthFailureResponse } from '@src/core/ApiResponse';
import {
    generateAccessToken,
    generateRefreshToken,
} from '@src/helpers/generateToken';
import { UserRole } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { REFRESH_TOKEN_SECRET_KEY } from '@src/config/constants';
import { TokenPayload } from '@src/middleware/auth.middleware';

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
                    isVerified: false,
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
            return { user, patient };
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
    } catch (error) {
        throw new CustomError(
            ErrorType.INTERNAL_ERROR,
            'Đăng ký tài khoản thất bại. Vui lòng thử lại'
        );
    }
};

const loginByEmailPassword = async (data: LoginDataDto) => {
    const { email, password } = data;

    // Find user by email
    const user = await findUserByEmail(email);
    if (!user) {
        throw new AuthFailureResponse('Email hoặc mật khẩu không chính xác');
    }

    const { password: userPassword, ...userWithoutPassword } = user;

    // Compare passwords
    const isPasswordValid = await compareCode(password, userPassword);
    if (!isPasswordValid) {
        throw new AuthFailureResponse('Email hoặc mật khẩu không chính xác');
    }
    await prisma.authentication.update({
        where: {
            userId: user.id,
        },
        data: {
            lastLogin: new Date(),
        },
    });

    // Generate token and return
    const accessToken = generateAccessToken({
        id: user.id,
        email: user.email,
        role: user.role.name,
        username: user.username,
    });
    const refreshToken = generateRefreshToken({
        id: user.id,
        email: user.email,
        role: user.role.name,
        username: user.username,
    });
    return { user: userWithoutPassword, accessToken, refreshToken };
};

/**
 * Verify OTP khi user nhập OTP sau khi đăng ký
 */
const verifyRegistrationOTP = async (email: string, otp: string) => {
    // Verify OTP
    const verifyResult = await otpService.verify(email, otp, 'REGISTER');

    if (!verifyResult.success) {
        throw new ValidationError(
            [
                {
                    field: 'otp',
                    message: 'Invalid or expired OTP',
                },
            ],
            verifyResult.message
        );
    }

    // Tìm user theo email
    const user = await findUserByEmail(email);
    if (!user) {
        throw new ValidationError(
            [
                {
                    field: 'email',
                    message: 'User not found',
                },
            ],
            'Người dùng không tồn tại'
        );
    }

    // Cập nhật trạng thái verified
    await prisma.authentication.update({
        where: {
            userId: user.id,
        },
        data: {
            isVerified: true,
        },
    });

    // Xóa OTP sau khi verify thành công
    await otpService.delete(email, 'REGISTER');

    return {
        message: 'Email đã xác nhận thành công',
        user,
    };
};

/**
 * Resend OTP khi user không nhận được email
 */
const resendRegistrationOTP = async (email: string) => {
    // Kiểm tra user tồn tại
    const user = await findUserByEmail(email);
    if (!user) {
        throw new ValidationError(
            [
                {
                    field: 'email',
                    message: 'Không tồn tại tài khoản',
                },
            ],
            'Không tồn tại tài khoản'
        );
    }

    // Kiểm tra đã verified chưa
    const auth = await prisma.authentication.findUnique({
        where: { userId: user.id },
    });

    if (auth?.isVerified) {
        throw new ValidationError(
            [
                {
                    field: 'email',
                    message: 'Email đã được xác thực',
                },
            ],
            'Email đã được xác thực'
        );
    }

    // Resend OTP
    const result = await otpService.resend(
        email,
        'REGISTER',
        'Xác thực tài khoản'
    );

    if (!result.success) {
        throw new ValidationError(
            [
                {
                    field: 'otp',
                    message: result.message,
                },
            ],
            result.message
        );
    }

    return {
        success: true,
        message: 'Đã gửi lại OTP thành công',
        time: result.time,
    };
};

const refreshToken = async (refreshToken: string) => {
    try {
        const decoded = jwt.verify(
            refreshToken,
            REFRESH_TOKEN_SECRET_KEY || 'fallback-secret'
        ) as TokenPayload;
        const user = await findUserByEmail(decoded.email);
        if (!user) {
            throw new CustomError(
                ErrorType.INVALID_REFRESH_TOKEN,
                'Refresh token invalid'
            );
        }
        const accessToken = generateAccessToken({
            id: user.id,
            email: user.email,
            role: user.role.name,
            username: user.username,
        });
        return { accessToken };
    } catch {
        throw new CustomError(
            ErrorType.INVALID_REFRESH_TOKEN,
            'Refresh token invalid'
        );
    }
};

const requestForgotPassword = async (email: string) => {
    const user = await findUserByEmail(email);
    if (!user) {
        throw new ValidationError(
            [
                {
                    field: 'email',
                    message: 'Không tồn tại tài khoản',
                },
            ],
            'Không tồn tại tài khoản'
        );
    }

    const result = await otpService.createAndSend(
        user.email,
        'FORGOT_PASSWORD',
        user.id,
        'Yêu cầu đặt lại mật khẩu'
    );

    if (!result.success) {
        throw new ValidationError(
            [
                {
                    field: 'otp',
                    message: result.message,
                },
            ],
            result.message
        );
    }

    return {
        success: true,
        message: 'Đã gửi OTP về email của bạn',
        time: result.time,
    };
};

const verifyForgotPasswordOTP = async (email: string, otp: string) => {
    const user = await findUserByEmail(email);
    if (!user) {
        throw new ValidationError(
            [
                {
                    field: 'email',
                    message: 'Email không tồn tại',
                },
            ],
            'Email không tồn tại'
        );
    }

    const verifyResult = await otpService.verify(
        user.email,
        otp,
        'FORGOT_PASSWORD'
    );
    if (!verifyResult.success) {
        throw new ValidationError(
            [
                {
                    field: 'otp',
                    message: 'Mã OTP không chính xác hoặc đã hết hạn',
                },
            ],
            verifyResult.message
        );
    }

    return {
        message: 'Xác thực OTP thành công. Bạn có thể đặt lại mật khẩu',
    };
};

const resetPassword = async (email: string, newPassword: string) => {
    const user = await findUserByEmail(email);
    if (!user) {
        throw new ValidationError(
            [
                {
                    field: 'email',
                    message: 'Email không tồn tại',
                },
            ],
            'Email không tồn tại'
        );
    }

    const recentVerifiedOTP = await prisma.verificationCode.findFirst({
        where: {
            email,
            type: 'FORGOT_PASSWORD',
            used: true,
            createdAt: {
                gte: new Date(Date.now() - 15 * 60 * 1000),
            },
        },
        orderBy: {
            createdAt: 'desc',
        },
    });

    if (!recentVerifiedOTP) {
        throw new ValidationError(
            [
                {
                    field: 'email',
                    message:
                        'OTP chưa được xác thực hoặc đã hết hạn. Vui lòng yêu cầu lại OTP',
                },
            ],
            'OTP chưa được xác thực hoặc đã hết hạn. Vui lòng yêu cầu lại OTP'
        );
    }

    const hashedPassword = await hashCode(newPassword);

    await prisma.user.update({
        where: {
            id: user.id,
        },
        data: {
            password: hashedPassword,
        },
    });

    await otpService.delete(email, 'FORGOT_PASSWORD');

    return {
        message: 'Đặt lại mật khẩu thành công',
    };
};

export default {
    registerPatient,
    loginByEmailPassword,
    verifyRegistrationOTP,
    resendRegistrationOTP,
    refreshToken,
    requestForgotPassword,
    verifyForgotPasswordOTP,
    resetPassword,
};
