import { Patient, User } from '@prisma/client';
import prisma from '@src/config/prisma';
import { BadRequestResponse, SuccessResponse } from '@src/core/ApiResponse';
import { findUserByEmail, findUserById } from '@src/daos/auth.dao';
import { RegisterPatientDataDto, LoginDataDto } from '@src/dtos/auth.dto';
import {
    generateAccessToken,
    generateRefreshToken,
} from '@src/helpers/generateToken';
import { TokenPayload } from '@src/middleware/auth.middleware';
import authService from '@src/services/auth.service';
import googleOAuthService from '@src/services/googleOAuth.service';
import { Request, Response } from 'express';

const registerPatient = async (
    req: Request<{}, {}, RegisterPatientDataDto>,
    res: Response<
        SuccessResponse<{
            user: User;
            patient: Patient;
        }>
    >
) => {
    const body = req.body;
    const result = await authService.registerPatient(body);
    return new SuccessResponse(result, 'Đăng ký tài khoản thành công').send(
        res
    );
};

const loginByEmailPassword = async (
    req: Request<{}, {}, LoginDataDto>,
    res: Response<SuccessResponse<any>>
) => {
    const body = req.body;
    const result = await authService.loginByEmailPassword(body);
    return new SuccessResponse(result, 'Đăng nhập thành công').send(res);
};

const verifyRegistrationOTP = async (
    req: Request<{}, {}, { email: string; otp: string }>,
    res: Response<SuccessResponse<any>>
) => {
    const { email, otp } = req.body;
    const result = await authService.verifyRegistrationOTP(email, otp);
    return new SuccessResponse(result.user, 'Đã xác thực OTP thành công').send(
        res
    );
};

const resendRegistrationOTP = async (
    req: Request<{}, {}, { email: string }>,
    res: Response<SuccessResponse<{ message: string }>>
) => {
    const { email } = req.body;
    const result = await authService.resendRegistrationOTP(email);
    return new SuccessResponse(result, 'Đã gửi lại OTP thành công').send(res);
};

const refreshToken = async (
    req: Request<{}, {}, { refreshToken: string }>,
    res: Response<
        SuccessResponse<{
            accessToken: string;
        }>
    >
) => {
    const { refreshToken } = req.body;
    const result = await authService.refreshToken(refreshToken);
    return new SuccessResponse(result, 'Đã làm mới token thành công').send(res);
};

const logout = async (req: Request, res: Response<SuccessResponse<{}>>) => {
    return new SuccessResponse({}, 'Đăng xuất thành công').send(res);
};

const getMe = async (req: Request, res: Response<SuccessResponse<any>>) => {
    const user = req.user as TokenPayload;
    const result = await findUserById(user.id);
    if (!result) {
        return new BadRequestResponse('User not found').send(res);
    }
    return new SuccessResponse(result, 'Lấy thông tin thành công').send(res);
};

const getUrlGoogleAuth = async (
    req: Request,
    res: Response<SuccessResponse<any>>
) => {
    const url = googleOAuthService.getAuthorizationUrl();
    return new SuccessResponse({ url }, 'Lấy URL thành công').send(res);
};

const loginByGoogle = async (
    req: Request<{}, {}, { code: string }>,
    res: Response<
        SuccessResponse<{
            user: User;
            accessToken: string;
            refreshToken: string;
        }>
    >
) => {
    const { code } = req.body;
    if (!code || typeof code !== 'string') {
        return new BadRequestResponse('Invalid code');
    }
    try {
        const { accessToken: googleAccessToken } =
            await googleOAuthService.getAccessToken(code);
        const userInfo =
            await googleOAuthService.getUserInfo(googleAccessToken);
        const user = await findUserByEmail(userInfo.email);
        if (!user) {
            return new BadRequestResponse(
                'Người dùng không liên kết với tài khoản này.'
            ).send(res);
        }

        const { password, ...userWithoutPassword } = user;

        await prisma.authentication.update({
            where: {
                userId: user.id,
            },
            data: {
                googleId: userInfo.googleId,
                lastLogin: new Date(),
            },
        });

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
        return new SuccessResponse(
            { user: userWithoutPassword, accessToken, refreshToken },
            'Đăng nhập thành công'
        ).send(res);
    } catch (error) {
        console.error(error);
        return new BadRequestResponse('Lỗi khi lấy thông tin từ Google').send(
            res
        );
    }
};

const requestForgotPassword = async (
    req: Request<{}, {}, { email: string }>,
    res: Response<SuccessResponse<{ message: string }>>
) => {
    const { email } = req.body;
    const result = await authService.requestForgotPassword(email);
    return new SuccessResponse(result, result.message).send(res);
};

const verifyForgotPassword = async (
    req: Request<{}, {}, { email: string; otp: string }>,
    res: Response<SuccessResponse<{ message: string }>>
) => {
    const { email, otp } = req.body;
    const result = await authService.verifyForgotPasswordOTP(email, otp);
    return new SuccessResponse(result, result.message).send(res);
};

const resetPassword = async (
    req: Request<{}, {}, { email: string; password: string }>,
    res: Response<SuccessResponse<{ message: string }>>
) => {
    const { email, password } = req.body;
    const result = await authService.resetPassword(email, password);
    return new SuccessResponse(result, result.message).send(res);
};

export default {
    registerPatient,
    loginByEmailPassword,
    verifyRegistrationOTP,
    resendRegistrationOTP,
    refreshToken,
    logout,
    getMe,
    getUrlGoogleAuth,
    loginByGoogle,
    requestForgotPassword,
    verifyForgotPassword,
    resetPassword,
};
