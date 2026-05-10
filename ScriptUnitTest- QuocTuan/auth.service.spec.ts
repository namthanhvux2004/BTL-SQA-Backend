// auth.service.spec.ts
import authService from '@src/services/auth.service';
import prisma from '@src/config/prisma';
import roleService from '@src/daos/role.dao';
import otpService from '@src/services/otp.service';
import { findUserByEmail } from '@src/daos/auth.dao';
import { compareCode, hashCode } from '@src/helpers/generateCode';
import { generateIdForModel } from '@src/helpers/generateId';
import { createQueryBuilder } from '@src/helpers/queryBuilder';
import {
    generateAccessToken,
    generateRefreshToken,
} from '@src/helpers/generateToken';
import jwt from 'jsonwebtoken';

import {
} from '@src/core/Error';

jest.mock('@src/config/prisma', () => ({
    __esModule: true,
    default: {
        $transaction: jest.fn(),
        authentication: {
            update: jest.fn(),
            findUnique: jest.fn(),
        },
        verificationCode: {
            findFirst: jest.fn(),
        },
        user: {
            update: jest.fn(),
        },
        counter: {},
    },
}));

jest.mock('@src/daos/role.dao');
jest.mock('@src/services/otp.service');
jest.mock('@src/daos/auth.dao');
jest.mock('@src/helpers/generateCode');
jest.mock('@src/helpers/generateId');
jest.mock('@src/helpers/queryBuilder');
jest.mock('@src/helpers/generateToken');
jest.mock('jsonwebtoken');

describe('auth.service', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('registerPatient - Đăng ký bệnh nhân', () => {
        const mockData: any = {
            email: 'test@gmail.com',
            password: '123456',
            username: 'testuser',
            birthday: '2000-01-01',
            address: {
                city: 'HN',
                district: 'CG',
            },
            name: {
                firstName: 'Nguyen',
                lastName: 'Van A',
            },
        };

        it('đăng ký thành công với đầy đủ thông tin hợp lệ', async () => {
            const mockFindUnique = jest.fn().mockResolvedValue(null);

            (createQueryBuilder as jest.Mock).mockReturnValue({
                findUnique: mockFindUnique,
            });

            (hashCode as jest.Mock).mockResolvedValue('hashed-password');

            (roleService.getRoleByName as jest.Mock).mockResolvedValue({
                id: 'role-id',
                prefix: 'BN',
            });

            (generateIdForModel as jest.Mock).mockResolvedValue('BN001');

            (prisma.$transaction as jest.Mock).mockImplementation(
                async (callback) => {
                    return callback({
                        address: {
                            create: jest.fn().mockResolvedValue({
                                id: 'address-id',
                            }),
                        },
                        user: {
                            create: jest.fn().mockResolvedValue({
                                id: 'user-id',
                                email: 'test@gmail.com',
                            }),
                        },
                        authentication: {
                            create: jest.fn().mockResolvedValue({}),
                        },
                        name: {
                            create: jest.fn().mockResolvedValue({}),
                        },
                        patient: {
                            create: jest.fn().mockResolvedValue({
                                id: 'patient-id',
                            }),
                        },
                        counter: {},
                    });
                }
            );

            (otpService.createAndSend as jest.Mock).mockResolvedValue({
                success: true,
            });

            const result = await authService.registerPatient(mockData);

            expect(result).toBeDefined();
            expect(hashCode).toHaveBeenCalled();
            expect(otpService.createAndSend).toHaveBeenCalled();
        });

        it('ném ValidationError khi email đã được đăng ký trước đó', async () => {
            (createQueryBuilder as jest.Mock).mockReturnValue({
                findUnique: jest.fn().mockResolvedValue({
                    id: 'existing-user',
                }),
            });

            await expect(
                authService.registerPatient(mockData)
            ).rejects.toThrow('Email đã tồn tại.');
        });

        it('ném lỗi khi không tồn tại vai trò bệnh nhân trong hệ thống', async () => {
            (createQueryBuilder as jest.Mock).mockReturnValue({
                findUnique: jest.fn().mockResolvedValue(null),
            });

            (hashCode as jest.Mock).mockResolvedValue('hashed');

            (roleService.getRoleByName as jest.Mock).mockResolvedValue(null);

            await expect(
                authService.registerPatient(mockData)
            ).rejects.toThrow('Chức năng chưa triển khai cho bệnh nhân');
        });

        it('ném ValidationError khi ngày sinh không phải định dạng ngày hợp lệ', async () => {
            (createQueryBuilder as jest.Mock).mockReturnValue({
                findUnique: jest.fn().mockResolvedValue(null),
            });

            (hashCode as jest.Mock).mockResolvedValue('hashed');

            (roleService.getRoleByName as jest.Mock).mockResolvedValue({
                id: 'role-id',
                prefix: 'BN',
            });

            await expect(
                authService.registerPatient({
                    ...mockData,
                    birthday: 'invalid-date',
                })
            ).rejects.toThrow('Ngày sinh không hợp lệ');
        });

        it('ném lỗi khi giao dịch CSDL (transaction) xảy ra lỗi', async () => {
            (createQueryBuilder as jest.Mock).mockReturnValue({
                findUnique: jest.fn().mockResolvedValue(null),
            });

            (hashCode as jest.Mock).mockResolvedValue('hashed');

            (roleService.getRoleByName as jest.Mock).mockResolvedValue({
                id: 'role-id',
                prefix: 'BN',
            });

            (prisma.$transaction as jest.Mock).mockRejectedValue(
                new Error('DB Error')
            );

            await expect(
                authService.registerPatient(mockData)
            ).rejects.toThrow(
                'Đăng ký tài khoản thất bại. Vui lòng thử lại'
            );
        });
    });

    describe('loginByEmailPassword - Đăng nhập bằng email/mật khẩu', () => {
        const mockUser: any = {
            id: 'user-id',
            email: 'test@gmail.com',
            password: 'hashed-password',
            username: 'test',
            role: {
                name: 'patient',
            },
        };

        it('trả về accessToken và refreshToken khi email và mật khẩu đúng', async () => {
            (findUserByEmail as jest.Mock).mockResolvedValue(mockUser);

            (compareCode as jest.Mock).mockResolvedValue(true);

            (generateAccessToken as jest.Mock).mockReturnValue('access-token');

            (generateRefreshToken as jest.Mock).mockReturnValue('refresh-token');

            (prisma.authentication.update as jest.Mock).mockResolvedValue({});

            const result = await authService.loginByEmailPassword({
                email: 'test@gmail.com',
                password: '123456',
            });

            expect(result.accessToken).toBe('access-token');
            expect(result.refreshToken).toBe('refresh-token');
        });

        it('ném lỗi khi email không tồn tại trong hệ thống', async () => {
            (findUserByEmail as jest.Mock).mockResolvedValue(null);

            await expect(
                authService.loginByEmailPassword({
                    email: 'wrong@gmail.com',
                    password: '123',
                })
            ).rejects.toMatchObject({
                message: 'Email hoặc mật khẩu không chính xác',
            });
        });

        it('ném lỗi khi mật khẩu không khớp với tài khoản', async () => {
            (findUserByEmail as jest.Mock).mockResolvedValue(mockUser);

            (compareCode as jest.Mock).mockResolvedValue(false);

            await expect(
                authService.loginByEmailPassword({
                    email: 'test@gmail.com',
                    password: 'wrong',
                })
            ).rejects.toMatchObject({
                message: 'Email hoặc mật khẩu không chính xác',
            });
        });
    });

    describe('verifyRegistrationOTP - Xác thực OTP đăng ký', () => {
        it('cập nhật trạng thái xác thực và xóa OTP sau khi OTP hợp lệ', async () => {
            (otpService.verify as jest.Mock).mockResolvedValue({
                success: true,
            });

            (findUserByEmail as jest.Mock).mockResolvedValue({
                id: 'user-id',
                email: 'test@gmail.com',
            });

            (prisma.authentication.update as jest.Mock).mockResolvedValue({});

            (otpService.delete as jest.Mock).mockResolvedValue({});

            const result = await authService.verifyRegistrationOTP(
                'test@gmail.com',
                '123456'
            );

            expect(result.message).toContain('thành công');
        });

        it('ném ValidationError khi OTP sai hoặc đã hết hạn', async () => {
            (otpService.verify as jest.Mock).mockResolvedValue({
                success: false,
                message: 'Invalid OTP',
            });

            await expect(
                authService.verifyRegistrationOTP(
                    'test@gmail.com',
                    '123'
                )
            ).rejects.toThrow('Invalid OTP');
        });

        it('ném ValidationError khi không tìm thấy người dùng với email đã nhập', async () => {
            (otpService.verify as jest.Mock).mockResolvedValue({
                success: true,
            });

            (findUserByEmail as jest.Mock).mockResolvedValue(null);

            await expect(
                authService.verifyRegistrationOTP(
                    'test@gmail.com',
                    '123'
                )
            ).rejects.toThrow('Người dùng không tồn tại');
        });
    });

    describe('resendRegistrationOTP - Gửi lại OTP đăng ký', () => {
        it('gửi lại OTP thành công khi email tồn tại và chưa xác thực', async () => {
            (findUserByEmail as jest.Mock).mockResolvedValue({
                id: 'user-id',
                email: 'test@gmail.com',
            });

            (prisma.authentication.findUnique as jest.Mock).mockResolvedValue({
                isVerified: false,
            });

            (otpService.resend as jest.Mock).mockResolvedValue({
                success: true,
                time: 60,
            });

            const result = await authService.resendRegistrationOTP(
                'test@gmail.com'
            );

            expect(result.success).toBe(true);
        });

        it('ném ValidationError khi email không tồn tại trong hệ thống', async () => {
            (findUserByEmail as jest.Mock).mockResolvedValue(null);

            await expect(
                authService.resendRegistrationOTP('abc@gmail.com')
            ).rejects.toThrow('Không tồn tại tài khoản');
        });

        it('ném ValidationError khi email đã được xác thực trước đó', async () => {
            (findUserByEmail as jest.Mock).mockResolvedValue({
                id: 'user-id',
            });

            (prisma.authentication.findUnique as jest.Mock).mockResolvedValue({
                isVerified: true,
            });

            await expect(
                authService.resendRegistrationOTP('abc@gmail.com')
            ).rejects.toThrow('Email đã được xác thực');
        });

        it('ném ValidationError khi gửi lại OTP vượt quá số lần cho phép', async () => {
            (findUserByEmail as jest.Mock).mockResolvedValue({
                id: 'user-id',
            });

            (prisma.authentication.findUnique as jest.Mock).mockResolvedValue({
                isVerified: false,
            });

            (otpService.resend as jest.Mock).mockResolvedValue({
                success: false,
                message: 'Too many requests',
            });

            await expect(
                authService.resendRegistrationOTP('abc@gmail.com')
            ).rejects.toThrow('Too many requests');
        });
    });

    describe('refreshToken - Làm mới access token', () => {
        it('trả về accessToken mới khi refresh token hợp lệ', async () => {
            (jwt.verify as jest.Mock).mockReturnValue({
                email: 'test@gmail.com',
            });

            (findUserByEmail as jest.Mock).mockResolvedValue({
                id: 'user-id',
                email: 'test@gmail.com',
                username: 'test',
                role: {
                    name: 'patient',
                },
            });

            (generateAccessToken as jest.Mock).mockReturnValue(
                'new-access-token'
            );

            const result = await authService.refreshToken('refresh-token');

            expect(result.accessToken).toBe('new-access-token');
        });

        it('ném lỗi khi người dùng trong token không còn tồn tại', async () => {
            (jwt.verify as jest.Mock).mockReturnValue({
                email: 'abc@gmail.com',
            });

            (findUserByEmail as jest.Mock).mockResolvedValue(null);

            await expect(
                authService.refreshToken('token')
            ).rejects.toThrow('Refresh token invalid');
        });

        it('ném lỗi khi refresh token bị sai hoặc đã hết hạn', async () => {
            (jwt.verify as jest.Mock).mockImplementation(() => {
                throw new Error();
            });

            await expect(
                authService.refreshToken('invalid-token')
            ).rejects.toThrow('Refresh token invalid');
        });
    });

    describe('requestForgotPassword - Yêu cầu quên mật khẩu', () => {
        it('gửi OTP về email và trả về trạng thái thành công', async () => {
            (findUserByEmail as jest.Mock).mockResolvedValue({
                id: 'user-id',
                email: 'test@gmail.com',
            });

            (otpService.createAndSend as jest.Mock).mockResolvedValue({
                success: true,
                time: 60,
            });

            const result = await authService.requestForgotPassword(
                'test@gmail.com'
            );

            expect(result.success).toBe(true);
        });

        it('ném ValidationError khi email không tồn tại trong hệ thống', async () => {
            (findUserByEmail as jest.Mock).mockResolvedValue(null);

            await expect(
                authService.requestForgotPassword('abc@gmail.com')
            ).rejects.toThrow('Không tồn tại tài khoản');
        });

        it('ném ValidationError khi dịch vụ gửi mail thất bại', async () => {
            (findUserByEmail as jest.Mock).mockResolvedValue({
                id: 'user-id',
                email: 'test@gmail.com',
            });

            (otpService.createAndSend as jest.Mock).mockResolvedValue({
                success: false,
                message: 'Failed',
            });

            await expect(
                authService.requestForgotPassword('test@gmail.com')
            ).rejects.toThrow('Failed');
        });
    });

    describe('verifyForgotPasswordOTP - Xác thực OTP quên mật khẩu', () => {
        it('trả về thông báo thành công khi OTP quên mật khẩu đúng', async () => {
            (findUserByEmail as jest.Mock).mockResolvedValue({
                email: 'test@gmail.com',
            });

            (otpService.verify as jest.Mock).mockResolvedValue({
                success: true,
            });

            const result = await authService.verifyForgotPasswordOTP(
                'test@gmail.com',
                '123456'
            );

            expect(result.message).toContain('thành công');
        });

        it('ném ValidationError khi email không tồn tại trong hệ thống', async () => {
            (findUserByEmail as jest.Mock).mockResolvedValue(null);

            await expect(
                authService.verifyForgotPasswordOTP(
                    'abc@gmail.com',
                    '123'
                )
            ).rejects.toThrow('Email không tồn tại');
        });

        it('ném ValidationError khi OTP quên mật khẩu sai hoặc hết hạn', async () => {
            (findUserByEmail as jest.Mock).mockResolvedValue({
                email: 'test@gmail.com',
            });

            (otpService.verify as jest.Mock).mockResolvedValue({
                success: false,
                message: 'Invalid OTP',
            });

            await expect(
                authService.verifyForgotPasswordOTP(
                    'test@gmail.com',
                    '123'
                )
            ).rejects.toThrow('Invalid OTP');
        });
    });

    describe('resetPassword - Đặt lại mật khẩu', () => {
        it('cập nhật mật khẩu mới và xóa OTP sau khi đặt lại thành công', async () => {
            (findUserByEmail as jest.Mock).mockResolvedValue({
                id: 'user-id',
                email: 'test@gmail.com',
            });

            (prisma.verificationCode.findFirst as jest.Mock).mockResolvedValue({
                id: 'otp-id',
            });

            (hashCode as jest.Mock).mockResolvedValue('hashed-password');

            (prisma.user.update as jest.Mock).mockResolvedValue({});

            (otpService.delete as jest.Mock).mockResolvedValue({});

            const result = await authService.resetPassword(
                'test@gmail.com',
                'newpassword'
            );

            expect(result.message).toContain('thành công');
        });

        it('ném ValidationError khi email không tồn tại trong hệ thống', async () => {
            (findUserByEmail as jest.Mock).mockResolvedValue(null);

            await expect(
                authService.resetPassword(
                    'abc@gmail.com',
                    '123456'
                )
            ).rejects.toThrow('Email không tồn tại');
        });

        it('ném ValidationError khi chưa xác thực OTP trước khi đặt lại mật khẩu', async () => {
            (findUserByEmail as jest.Mock).mockResolvedValue({
                id: 'user-id',
            });

            (prisma.verificationCode.findFirst as jest.Mock).mockResolvedValue(
                null
            );

            await expect(
                authService.resetPassword(
                    'test@gmail.com',
                    '123456'
                )
            ).rejects.toThrow(
                'OTP chưa được xác thực hoặc đã hết hạn. Vui lòng yêu cầu lại OTP'
            );
        });
    });
});
