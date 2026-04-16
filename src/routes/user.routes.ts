import { Router } from 'express';
import userController from '@src/controllers/user.controller';
import { validateDto } from '@src/middleware/validatation.middleware';
import {
    UpdateUserProfileDto,
    ChangePasswordDto,
    AvatarUserDto,
} from '@src/dtos/user.dto';
import asyncHandler from '@src/helpers/asyncHandler';
import { authenticateToken } from '@src/middleware/auth.middleware';
import upload from '@src/config/multer';

const router = Router();

/**
 * @swagger
 * /api/v1/users/profile:
 *   get:
 *     summary: Lấy thông tin cá nhân
 *     description: Lấy thông tin cá nhân của người dùng hiện tại
 *     tags:
 *       - User Management
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lấy thông tin cá nhân thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Lấy thông tin cá nhân thành công
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: uuid
 *                     username:
 *                       type: string
 *                       example: johndoe
 *                     email:
 *                       type: string
 *                       example: john@example.com
 *                     avatar:
 *                       type: string
 *                       example: https://example.com/avatar.jpg
 *                     birthday:
 *                       type: string
 *                       format: date
 *                       example: 1990-01-01T00:00:00.000Z
 *                     gender:
 *                       type: string
 *                       enum: [male, female, other]
 *                       example: male
 *                     phone:
 *                       type: string
 *                       example: 1234567890
 *                     role:
 *                       type: object
 *                       properties:
 *                         name:
 *                           type: string
 *                           example: patient
 *                         prefix:
 *                           type: string
 *                           example: P
 *                     name:
 *                       type: object
 *                       properties:
 *                         firstName:
 *                           type: string
 *                           example: John
 *                         lastName:
 *                           type: string
 *                           example: Doe
 *                     address:
 *                       type: object
 *                       properties:
 *                         detail:
 *                           type: string
 *                           example: 123 Main St
 *                         ward:
 *                           type: string
 *                           example: Ward 1
 *                         district:
 *                           type: string
 *                           example: District 1
 *                         city:
 *                           type: string
 *                           example: Ho Chi Minh City
 *                         country:
 *                           type: string
 *                           example: Vietnam
 *                     authentication:
 *                       type: object
 *                       properties:
 *                         isVerified:
 *                           type: boolean
 *                           example: true
 *                         lastLogin:
 *                           type: string
 *                           format: date-time
 *                           example: 2024-01-01T10:00:00.000Z
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 */
router.get(
    '/profile',
    authenticateToken(),
    asyncHandler(userController.getUserProfile)
);

/**
 * @swagger
 * /api/v1/users/profile:
 *   put:
 *     summary: Cập nhật thông tin cá nhân
 *     description: Cập nhật thông tin cá nhân của người dùng
 *     tags:
 *       - User Management
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               avatar:
 *                 type: string
 *                 format: uri
 *                 example: https://example.com/avatar.jpg
 *               birthday:
 *                 type: string
 *                 format: date
 *                 example: 1990-01-01
 *               gender:
 *                 type: string
 *                 enum: [male, female, other]
 *                 example: male
 *               phone:
 *                 type: string
 *                 example: 1234567890
 *               citizen_id:
 *                 type: string
 *                 example: 0242003005247
 *               address:
 *                 type: object
 *                 properties:
 *                   detail:
 *                     type: string
 *                     example: 123 Main St
 *                   ward:
 *                     type: string
 *                     example: Ward 1
 *                   district:
 *                     type: string
 *                     example: District 1
 *                   city:
 *                     type: string
 *                     example: City
 *                   country:
 *                     type: string
 *                     example: Country
 *               name:
 *                 type: object
 *                 properties:
 *                   firstname:
 *                     type: string
 *                     example: John
 *                   lastname:
 *                     type: string
 *                     example: Doe
 *     responses:
 *       200:
 *         description: Cập nhật thông tin cá nhân thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Cập nhật thông tin cá nhân thành công
 *                 data:
 *                   type: object
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 */
router.put(
    '/profile',
    authenticateToken(),
    upload.fields([{ name: 'newAvatar', maxCount: 1 }]),
    validateDto(AvatarUserDto, 'files'),
    validateDto(UpdateUserProfileDto, 'body'),
    asyncHandler(userController.updateUserProfile)
);

/**
 * @swagger
 * /api/v1/users/change-password:
 *   post:
 *     summary: Đổi mật khẩu
 *     description: Đổi mật khẩu của người dùng với validation mạnh
 *     tags:
 *       - User Management
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               currentPassword:
 *                 type: string
 *                 example: OldPassword123!
 *               newPassword:
 *                 type: string
 *                 example: NewPassword123!
 *                 description: "Mật khẩu mới phải có 8-32 ký tự, bao gồm chữ thường, chữ hoa, số và ký tự đặc biệt"
 *               confirmPassword:
 *                 type: string
 *                 example: NewPassword123!
 *             required:
 *               - currentPassword
 *               - newPassword
 *               - confirmPassword
 *     responses:
 *       200:
 *         description: Đổi mật khẩu thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Đổi mật khẩu thành công
 *                 data:
 *                   type: object
 *                   properties:
 *                     message:
 *                       type: string
 *                       example: Đổi mật khẩu thành công
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Mật khẩu hiện tại không chính xác
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 */
router.post(
    '/change-password',
    authenticateToken(),
    validateDto(ChangePasswordDto, 'body'),
    asyncHandler(userController.changePassword)
);

export default router;
