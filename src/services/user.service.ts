import prisma from '@src/config/prisma';
import { CustomError, ErrorType, ValidationError } from '@src/core/Error';
import { findUserById } from '@src/daos/auth.dao';
import {
    getUserProfile,
    getUserWithPassword,
    updateUserProfile,
} from '@src/daos/user.dao';
import {
    ChangePasswordDataDto,
    UpdateUserProfileDataDto,
} from '@src/dtos/user.dto';
import { compareCode, hashCode } from '@src/helpers/generateCode';

// Lấy thông tin cá nhân, tài khoản
const getUserProfileService = async (userId: string) => {
    const user = await getUserProfile(userId);
    if (!user) {
        throw new CustomError(ErrorType.NOT_FOUND, 'Người dùng không tồn tại');
    }

    return user;
};

// Cập nhật thông tin cá nhân
const updateUserProfileService = async (
    userId: string,
    data: UpdateUserProfileDataDto
) => {
    // Kiểm tra user tồn tại
    const existingUser = await findUserById(userId);
    if (!existingUser) {
        throw new CustomError(ErrorType.NOT_FOUND, 'Người dùng không tồn tại');
    }

    if (data.birthday) {
        const today = new Date();
        if (data.birthday > today) {
            throw new ValidationError([
                {
                    field: 'birthday',
                    message: 'Ngày sinh không thể là tương lai',
                },
            ]);
        }
    }

    try {
        return await updateUserProfile(userId, data);
    } catch {
        throw new CustomError(
            ErrorType.INTERNAL_ERROR,
            'Cập nhật thông tin thất bại'
        );
    }
};

// Đổi mật khẩu
const changePasswordService = async (
    userId: string,
    data: ChangePasswordDataDto
) => {
    const { currentPassword, newPassword } = data;

    // Lấy thông tin user với password
    const user = await getUserWithPassword(userId);
    if (!user) {
        throw new CustomError(ErrorType.NOT_FOUND, 'Người dùng không tồn tại');
    }

    // Kiểm tra mật khẩu hiện tại
    const isCurrentPasswordValid = await compareCode(
        currentPassword,
        user.password
    );
    if (!isCurrentPasswordValid) {
        throw new ValidationError([
            {
                field: 'currentPassword',
                message: 'Mật khẩu hiện tại không chính xác',
            },
        ]);
    }

    // Hash mật khẩu mới
    const hashedNewPassword = await hashCode(newPassword);

    try {
        // Cập nhật mật khẩu
        await prisma.user.update({
            where: { id: userId },
            data: { password: hashedNewPassword },
        });

        return { message: 'Đổi mật khẩu thành công' };
    } catch {
        throw new CustomError(
            ErrorType.INTERNAL_ERROR,
            'Đổi mật khẩu thất bại'
        );
    }
};

export default {
    getUserProfileService,
    updateUserProfileService,
    changePasswordService,
};
