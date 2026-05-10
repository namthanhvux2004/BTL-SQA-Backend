import userService from '@src/services/user.service';
import prisma from '@src/config/prisma';
import { CustomError, ValidationError } from '@src/core/Error';

/**
 * Lớp kiểm thử (Unit Test Script) cho user.service.ts
 * Nhắm đến: getUserProfileService, updateUserProfileService, changePasswordService
 */
describe('User Service Tests', () => {
    let testUserId: string;
    let testUserPassword: string;

    beforeAll(async () => {
        // Tìm một user có sẵn trong DB để test
        const user = await prisma.user.findFirst({
            where: { role: { name: 'patient' } },
        });
        if (!user) throw new Error('Cần có DB với User để test');

        testUserId = user.id;
        testUserPassword = 'Test@12345'; // Sẽ set lại password cho user test
    });

    // ========================
    // getUserProfileService
    // ========================

    // Test Case ID: TC-USR-01
    // Lớp kiểm thử: UserService
    // Hàm kiểm thử: getUserProfileService
    // Mục đích: Lấy profile thành công khi userId hợp lệ
    // Input: userId tồn tại trong DB
    // Output dự kiến: Object user profile
    it('TC-USR-01: Should return user profile for valid userId', async () => {
        const result = await userService.getUserProfileService(testUserId);
        expect(result).toBeDefined();
        expect(result.id).toBe(testUserId);
    });

    // Test Case ID: TC-USR-02
    // Lớp kiểm thử: UserService
    // Hàm kiểm thử: getUserProfileService
    // Mục đích: Ném lỗi NOT_FOUND khi userId không tồn tại
    // Input: userId = "non-existent-id"
    // Output dự kiến: Ném CustomError(NOT_FOUND) "Người dùng không tồn tại"
    it('TC-USR-02: Should throw NOT_FOUND for non-existent userId', async () => {
        await expect(
            userService.getUserProfileService('non-existent-id')
        ).rejects.toThrow(CustomError);
        await expect(
            userService.getUserProfileService('non-existent-id')
        ).rejects.toThrow('Người dùng không tồn tại');
    });

    // ========================
    // updateUserProfileService
    // ========================

    // Test Case ID: TC-USR-03
    // Lớp kiểm thử: UserService
    // Hàm kiểm thử: updateUserProfileService
    // Mục đích: Cập nhật profile thành công
    // Input: userId hợp lệ, data = { fullName: "Test Update Name" }
    // Output dự kiến: Object user profile đã cập nhật
    it('TC-USR-03: Should update user profile successfully', async () => {
        const originalUser = await prisma.user.findUnique({ where: { id: testUserId } });
        const result = await userService.updateUserProfileService(testUserId, {
            fullName: 'Test Update Name',
        } as any);
        expect(result).toBeDefined();

        // Rollback
        await prisma.user.update({
            where: { id: testUserId },
            data: { fullName: originalUser!.fullName },
        });
    });

    // Test Case ID: TC-USR-04
    // Lớp kiểm thử: UserService
    // Hàm kiểm thử: updateUserProfileService
    // Mục đích: Ném lỗi NOT_FOUND khi userId không tồn tại
    // Input: userId = "non-existent-id", data bất kỳ
    // Output dự kiến: Ném CustomError(NOT_FOUND) "Người dùng không tồn tại"
    it('TC-USR-04: Should throw NOT_FOUND when updating non-existent user', async () => {
        await expect(
            userService.updateUserProfileService('non-existent-id', {
                fullName: 'Test',
            } as any)
        ).rejects.toThrow(CustomError);
        await expect(
            userService.updateUserProfileService('non-existent-id', {
                fullName: 'Test',
            } as any)
        ).rejects.toThrow('Người dùng không tồn tại');
    });

    // Test Case ID: TC-USR-05
    // Lớp kiểm thử: UserService
    // Hàm kiểm thử: updateUserProfileService
    // Mục đích: Ném ValidationError khi birthday trong tương lai
    // Input: userId hợp lệ, data = { birthday: new Date("2099-01-01") }
    // Output dự kiến: Ném ValidationError với field "birthday"
    it('TC-USR-05: Should throw ValidationError when birthday is in the future', async () => {
        await expect(
            userService.updateUserProfileService(testUserId, {
                birthday: new Date('2099-01-01'),
            } as any)
        ).rejects.toThrow(ValidationError);
        await expect(
            userService.updateUserProfileService(testUserId, {
                birthday: new Date('2099-01-01'),
            } as any)
        ).rejects.toThrow('Validation Error');
    });

    // Test Case ID: TC-USR-06
    // Lớp kiểm thử: UserService
    // Hàm kiểm thử: updateUserProfileService
    // Mục đích: Cập nhật với birthday hợp lệ (trong quá khứ)
    // Input: userId hợp lệ, data = { birthday: new Date("2000-01-01") }
    // Output dự kiến: Object user profile cập nhật thành công
    it('TC-USR-06: Should update profile with valid past birthday', async () => {
        const originalUser = await prisma.user.findUnique({ where: { id: testUserId } });
        const result = await userService.updateUserProfileService(testUserId, {
            birthday: new Date('2000-01-01'),
        } as any);
        expect(result).toBeDefined();

        // Rollback
        await prisma.user.update({
            where: { id: testUserId },
            data: { birthday: originalUser!.birthday },
        });
    });

    // Test Case ID: TC-USR-07
    // Lớp kiểm thử: UserService
    // Hàm kiểm thử: updateUserProfileService
    // Mục đích: Cập nhật thành công khi không truyền birthday (bỏ qua validate)
    // Input: userId hợp lệ, data = { fullName: "No Birthday" } (không có birthday)
    // Output dự kiến: Cập nhật thành công, không ném validation error
    it('TC-USR-07: Should update profile without birthday (skip validation)', async () => {
        const originalUser = await prisma.user.findUnique({ where: { id: testUserId } });
        const result = await userService.updateUserProfileService(testUserId, {
            fullName: 'No Birthday Update',
        } as any);
        expect(result).toBeDefined();

        // Rollback
        await prisma.user.update({
            where: { id: testUserId },
            data: { fullName: originalUser!.fullName },
        });
    });

    // ========================
    // changePasswordService
    // ========================

    // Test Case ID: TC-USR-09
    // Lớp kiểm thử: UserService
    // Hàm kiểm thử: changePasswordService
    // Mục đích: Ném lỗi NOT_FOUND khi userId không tồn tại
    // Input: userId = "non-existent-id"
    // Output dự kiến: Ném CustomError(NOT_FOUND) "Người dùng không tồn tại"
    it('TC-USR-09: Should throw NOT_FOUND when changing password for non-existent user', async () => {
        await expect(
            userService.changePasswordService('non-existent-id', {
                currentPassword: 'abc',
                newPassword: 'def',
            })
        ).rejects.toThrow(CustomError);
        await expect(
            userService.changePasswordService('non-existent-id', {
                currentPassword: 'abc',
                newPassword: 'def',
            })
        ).rejects.toThrow('Người dùng không tồn tại');
    });

    // Test Case ID: TC-USR-10
    // Lớp kiểm thử: UserService
    // Hàm kiểm thử: changePasswordService
    // Mục đích: Ném ValidationError khi mật khẩu hiện tại sai
    // Input: userId hợp lệ, data = { currentPassword: "wrong-password", newPassword: "new" }
    // Output dự kiến: Ném ValidationError "Mật khẩu hiện tại không chính xác"
    it('TC-USR-10: Should throw ValidationError when current password is incorrect', async () => {
        await expect(
            userService.changePasswordService(testUserId, {
                currentPassword: 'completely-wrong-password',
                newPassword: 'NewPassword@123',
            })
        ).rejects.toThrow(ValidationError);
        await expect(
            userService.changePasswordService(testUserId, {
                currentPassword: 'completely-wrong-password',
                newPassword: 'NewPassword@123',
            })
        ).rejects.toThrow('Validation Error');
    });

    // ========================
    // Mock-based tests (cover catch blocks & success path)
    // ========================

    // Test Case ID: TC-USR-08
    // Lớp kiểm thử: UserService
    // Hàm kiểm thử: updateUserProfileService
    // Mục đích: DAO ném lỗi → catch block ném INTERNAL_ERROR
    // Input: userId hợp lệ, mock updateUserProfile throw Error
    // Output dự kiến: Ném CustomError(INTERNAL_ERROR) "Cập nhật thông tin thất bại"
    it('TC-USR-08: Should throw INTERNAL_ERROR when DAO update fails', async () => {
        const userDaoModule = await import('@src/daos/user.dao');
        const originalFn = userDaoModule.updateUserProfile;
        // Mock DAO to throw
        (userDaoModule as any).updateUserProfile = jest.fn().mockRejectedValue(new Error('DB Error'));

        await expect(
            userService.updateUserProfileService(testUserId, { fullName: 'Fail' } as any)
        ).rejects.toThrow(CustomError);
        await expect(
            userService.updateUserProfileService(testUserId, { fullName: 'Fail' } as any)
        ).rejects.toThrow('Cập nhật thông tin thất bại');

        // Restore
        (userDaoModule as any).updateUserProfile = originalFn;
    });

    // Test Case ID: TC-USR-11
    // Lớp kiểm thử: UserService
    // Hàm kiểm thử: changePasswordService
    // Mục đích: Đổi mật khẩu thành công
    // Input: userId hợp lệ, currentPassword đúng, newPassword mới
    // Output dự kiến: { message: "Đổi mật khẩu thành công" }
    it('TC-USR-11: Should change password successfully', async () => {
        // Set a known password for the test user
        const { hashCode } = await import('@src/helpers/generateCode');
        const knownPassword = 'KnownPass@123';
        const hashed = await hashCode(knownPassword);
        const originalUser = await prisma.user.findUnique({ where: { id: testUserId } });

        await prisma.user.update({ where: { id: testUserId }, data: { password: hashed } });

        const result = await userService.changePasswordService(testUserId, {
            currentPassword: knownPassword,
            newPassword: 'NewSecure@456',
        });
        expect(result).toEqual({ message: 'Đổi mật khẩu thành công' });

        // Rollback password
        await prisma.user.update({ where: { id: testUserId }, data: { password: originalUser!.password } });
    });

    // Test Case ID: TC-USR-12
    // Lớp kiểm thử: UserService
    // Hàm kiểm thử: changePasswordService
    // Mục đích: DB update thất bại → catch block ném INTERNAL_ERROR
    // Input: userId hợp lệ, password đúng, mock prisma.user.update throw
    // Output dự kiến: Ném CustomError(INTERNAL_ERROR) "Đổi mật khẩu thất bại"
    it('TC-USR-12: Should throw INTERNAL_ERROR when DB update fails during password change', async () => {
        const { hashCode } = await import('@src/helpers/generateCode');
        const knownPassword = 'KnownPass@789';
        const hashed = await hashCode(knownPassword);
        const originalUser = await prisma.user.findUnique({ where: { id: testUserId } });

        await prisma.user.update({ where: { id: testUserId }, data: { password: hashed } });

        // Mock prisma.user.update to fail
        const originalUpdate = prisma.user.update;
        prisma.user.update = jest.fn().mockRejectedValue(new Error('DB crash')) as any;

        await expect(
            userService.changePasswordService(testUserId, {
                currentPassword: knownPassword,
                newPassword: 'SomeNew@999',
            })
        ).rejects.toThrow(CustomError);
        await expect(
            userService.changePasswordService(testUserId, {
                currentPassword: knownPassword,
                newPassword: 'SomeNew@999',
            })
        ).rejects.toThrow('Đổi mật khẩu thất bại');

        // Restore
        prisma.user.update = originalUpdate;
        await prisma.user.update({ where: { id: testUserId }, data: { password: originalUser!.password } });
    });
});
