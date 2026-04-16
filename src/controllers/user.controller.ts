import { SuccessResponse } from '@src/core/ApiResponse';
import {
    ChangePasswordDataDto,
    UpdateUserProfileDataDto,
} from '@src/dtos/user.dto';
import { TokenPayload } from '@src/middleware/auth.middleware';
import userService from '@src/services/user.service';
import { uploadToCloudinary } from '@src/services/cloudinary.service';
import { Request, Response } from 'express';
import { CustomError, ErrorType } from '@src/core/Error';

// Lấy thông tin cá nhân
const getUserProfile = async (req: Request, res: Response) => {
    const user = req.user as TokenPayload;
    const result = await userService.getUserProfileService(user.id);
    return new SuccessResponse(result, 'Lấy thông tin cá nhân thành công').send(
        res
    );
};

// Cập nhật thông tin cá nhân
const updateUserProfile = async (
    req: Request<{}, {}, UpdateUserProfileDataDto>,
    res: Response
) => {
    const user = req.user as TokenPayload;
    const body = req.body;
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    const avatarFile = files?.newAvatar?.[0];

    // Nếu có file avatar được upload
    if (avatarFile) {
        const uploadResult = await uploadToCloudinary(avatarFile.path, {
            folder: 'healthsystem/avatars',
            autoDeleteLocalFile: true,
        }).catch(() => {
            throw new CustomError(
                ErrorType.INTERNAL_ERROR,
                'Failed to upload avatar'
            );
        });
        body.avatar = uploadResult.url;
    }

    const updateUser = await userService.updateUserProfileService(
        user.id,
        body
    );
    const result = await userService.getUserProfileService(updateUser.id);
    return new SuccessResponse(
        result,
        'Cập nhật thông tin cá nhân thành công'
    ).send(res);
};

// Đổi mật khẩu
const changePassword = async (
    req: Request<{}, {}, ChangePasswordDataDto>,
    res: Response
) => {
    const user = req.user as TokenPayload;
    const body = req.body;
    const result = await userService.changePasswordService(user.id, body);
    return new SuccessResponse(result, 'Đổi mật khẩu thành công').send(res);
};

export default {
    getUserProfile,
    updateUserProfile,
    changePassword,
};
