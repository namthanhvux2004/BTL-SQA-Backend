import { Router } from 'express';
import authController from '@src/controllers/auth.controller';
import { validateDto } from '@src/middleware/validatation.middleware';
import {
    LoginDto,
    RegisterPatientDto,
    RequestForgotPasswordDto,
    ResetPasswordDto,
    VerifyForgotPasswordDto,
} from '@src/dtos/auth.dto';
import asyncHandler from '@src/helpers/asyncHandler';
import { authenticateToken } from '@src/middleware/auth.middleware';

const router = Router();

/**
 * @swagger
 * /api/v1/auth/patient/register/byEmail:
 *   post:
 *     summary: Register a new patient by email
 *     description: Registers a new patient using their email and sends a verification email.
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *                 example: johndoe
 *               email:
 *                 type: string
 *                 format: email
 *                 example: patient@example.com
 *               password:
 *                 type: string
 *                 minLength: 6
 *                 example: password123
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
 *               roleId:
 *                 type: integer
 *                 example: 1
 *               name:
 *                 type: object
 *                 properties:
 *                   firstName:
 *                     type: string
 *                     example: John
 *                   lastName:
 *                     type: string
 *                     example: Doe
 *             required:
 *               - username
 *               - email
 *               - password
 *               - birthday
 *               - gender
 *               - phone
 *               - roleId
 *               - name
 *     responses:
 *       201:
 *         description: Patient registered successfully
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
 *                   example: Patient registered successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                    user:
 *                     $ref: '#/components/schemas/User'
 *                    patient:
 *                     $ref: '#/components/schemas/Patient'
 *       500:
 *         description: Internal server error
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
 *                   example: Internal server error
 *                 error:
 *                   type: string
 *                   example: INTERNAL_SERVER_ERROR
 *
 */
router.post(
    '/patient/register/byEmail',
    validateDto(RegisterPatientDto, 'body'),
    asyncHandler(authController.registerPatient)
);

/**
 * @swagger
 * /api/v1/auth/login/byEmail:
 *   post:
 *     summary: Login using email and password
 *     description: Authenticates a user using their email and password.
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 example: password123
 *             required:
 *               - email
 *               - password
 *     responses:
 *       200:
 *         description: User logged in successfully
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
 *                   example: User logged in successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     accessToken:
 *                       type: string
 *                       example: eyJhbGciOiJIUzI1.NiIsInR5cCI6IkpXVCJ9
 *                     refreshToken:
 *                       type: string
 *                       example: eyJhbGciOiJIUzI1N.iIsInR5cCI6IkpXVCJ9
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized
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
 *                   example: Invalid email or password
 *       500:
 *         description: Internal server error
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
 *                   example: Internal server error
 *                 error:
 *                   type: string
 *                   example: INTERNAL_SERVER_ERROR
 */
router.post(
    '/login/byEmail',
    validateDto(LoginDto, 'body'),
    asyncHandler(authController.loginByEmailPassword)
);

/**
 * @swagger
 * /api/v1/auth/verify-registration-otp:
 *   post:
 *     summary: Verify OTP after registration
 *     description: Verifies the OTP sent to user's email after registration
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *               otp:
 *                 type: string
 *                 example: "123456"
 *             required:
 *               - email
 *               - otp
 *     responses:
 *       200:
 *         description: Email verified successfully
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
 *                   example: Email verified successfully
 *       400:
 *         description: Invalid or expired OTP
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
 *                   example: Invalid or expired OTP
 */
router.post(
    '/verify-registration-otp',
    asyncHandler(authController.verifyRegistrationOTP)
);

/**
 * @swagger
 * /api/v1/auth/resend-registration-otp:
 *   post:
 *     summary: Resend registration OTP
 *     description: Resends the OTP to user's email if they didn't receive it
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *             required:
 *               - email
 *     responses:
 *       200:
 *         description: OTP resent successfully
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
 *                   example: OTP resent successfully
 *       400:
 *         description: Cannot resend OTP (cooldown or already verified)
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
 *                   example: Please wait 60 seconds before requesting a new OTP
 */
router.post(
    '/resend-registration-otp',
    asyncHandler(authController.resendRegistrationOTP)
);

/**
 * @swagger
 * /api/v1/auth/refresh-token:
 *   post:
 *     summary: Refresh access token
 *     description: Refreshes the access token using the refresh token
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 example: eyJhbGciOiJIUzI1N.iIsInR5cCI6IkpXVCJ9
 *             required:
 *               - refreshToken
 *     responses:
 *       200:
 *         description: Access token refreshed successfully
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
 *                   example: Access token refreshed successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     accessToken:
 *                       type: string
 *                       example: eyJhbGciOiJIUzI1.NiIsInR5cCI6IkpXVCJ9
 *       401:
 *         description: Unauthorized
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
 *                   example: Refresh token invalid
 *                 statusCode:
 *                   type: number
 *                   example: 401
 *                 code:
 *                   type: string
 *                   example: '10004'
 *
 */
router.post('/refresh-token', asyncHandler(authController.refreshToken));

/**
 * @swagger
 * /api/v1/auth/logout:
 *   post:
 *     summary: Logout
 *     description: Logs out the user
 *     tags:
 *       - Authentication
 *     responses:
 *       200:
 *         description: Logout successfully
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
 *                   example: Logout successfully
 *                 data:
 *                   type: object
 *                   example: {}
 */
router.post('/logout', asyncHandler(authController.logout));

/**
 * @swagger
 * /api/v1/auth/me:
 *   get:
 *     summary: Get user information
 *     description: Get user information
 *     tags:
 *       - Authentication
 *     responses:
 *       200:
 *         description: Get user information successfully
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
 *                   example: Get user information successfully
 *                 data:
 *                   type: object
 *                   $ref: '#/components/schemas/User'
 */
router.get('/me', authenticateToken(), asyncHandler(authController.getMe));

/**
 * @swagger
 * /api/v1/auth/google/url:
 *   get:
 *     summary: Get Google authentication URL
 *     description: Get Google authentication URL
 *     tags:
 *       - Authentication
 *     responses:
 *       200:
 *         description: Get Google authentication URL successfully
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
 *                   example: Get Google authentication URL successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     url:
 *                       type: string
 *                       example: https://accounts.google.com/o/oauth2/auth?client_id=357731802803-75jljavmfuik20o6lrqs46duj1q1b7bk.apps.googleusercontent.com&redirect_uri=http://localhost:5000/api/auth/google/callback&response_type=code&scope=openid email profile&access_type=offline&prompt=consent
 * */
router.get('/google/url', asyncHandler(authController.getUrlGoogleAuth));

/**
 * @swagger
 * /api/v1/auth/google/callback:
 *   get:
 *     summary: Callback after user authenticate with Google
 *     description: Callback after user authenticate with Google
 *     tags:
 *       - Authentication
 *     responses:
 *       200:
 *         description: Login successfully
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
 *                   example: Login successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *                     accessToken:
 *                       type: string
 *                       example: eyJhbGciOiJIUzI1.NiIsInR5cCI6IkpXVCJ9
 *                     refreshToken:
 *                       type: string
 *                       example: eyJhbGciOiJIUzI1N.iIsInR5cCI6IkpXVCJ9
 *         400:
 *           description: Invalid code
 *           content:
 *             application/json:
 *               schema:
 *                 type: object
 *                 properties:
 *                   success:
 *                     type: boolean
 *                     example: false
 *                   message:
 *                     type: string
 *                     example: Invalid code
 *                   code:
 *                     type: string
 *                     example: 10010
 *
 */
router.post('/google/callback', asyncHandler(authController.loginByGoogle));

/**
 * @swagger
 * /api/v1/auth/forgot-password/request:
 *   post:
 *     summary: Request forgot password
 *     description: Sends OTP to user's email for password reset
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *             required:
 *               - email
 *     responses:
 *       200:
 *         description: OTP sent successfully
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
 *                   example: Đã gửi OTP về email của bạn
 *                 data:
 *                   type: object
 *                   properties:
 *                     message:
 *                       type: string
 *                       example: Đã gửi OTP về email của bạn
 *       400:
 *         description: Validation error
 */
router.post(
    '/forgot-password/request',
    validateDto(RequestForgotPasswordDto, 'body'),
    asyncHandler(authController.requestForgotPassword)
);

/**
 * @swagger
 * /api/v1/auth/forgot-password/verify:
 *   post:
 *     summary: Verify forgot password OTP
 *     description: Verifies the OTP sent to user's email for password reset
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *               otp:
 *                 type: string
 *                 example: "123456"
 *             required:
 *               - email
 *               - otp
 *     responses:
 *       200:
 *         description: OTP verified successfully
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
 *                   example: Xác thực OTP thành công. Bạn có thể đặt lại mật khẩu
 *                 data:
 *                   type: object
 *                   properties:
 *                     message:
 *                       type: string
 *                       example: Xác thực OTP thành công. Bạn có thể đặt lại mật khẩu
 *       400:
 *         description: Invalid or expired OTP
 */
router.post(
    '/forgot-password/verify',
    validateDto(VerifyForgotPasswordDto, 'body'),
    asyncHandler(authController.verifyForgotPassword)
);

/**
 * @swagger
 * /api/v1/auth/forgot-password/reset:
 *   post:
 *     summary: Reset password
 *     description: Resets user's password after OTP verification
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 minLength: 6
 *                 example: newpassword123
 *             required:
 *               - email
 *               - password
 *     responses:
 *       200:
 *         description: Password reset successfully
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
 *                   example: Đặt lại mật khẩu thành công
 *                 data:
 *                   type: object
 *                   properties:
 *                     message:
 *                       type: string
 *                       example: Đặt lại mật khẩu thành công
 *       400:
 *         description: Validation error or OTP not verified
 */
router.post(
    '/forgot-password/reset',
    validateDto(ResetPasswordDto, 'body'),
    asyncHandler(authController.resetPassword)
);

export default router;
