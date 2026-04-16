import adminuserController from '@src/controllers/adminuser.controller';
import asyncHandler from '@src/helpers/asyncHandler';
import { validateDto } from '@src/middleware/validatation.middleware';
import { authenticateToken, checkRole } from '@src/middleware/auth.middleware';
import { Router } from 'express';
import {
    RegisterDoctorDto,
    UpdateDoctorDto,
    RegisterPatientDto,
    UpdatePatientProfileDto,
    RegisterAdminDto,
    UpdateAdminDto,
} from '@src/dtos/adminuser.dto';

const router = Router();

/**
 * @swagger
 * /api/v1/adminusers/doctors/create:
 *   post:
 *     summary: Create a new doctor
 *     description: Creates a new doctor account with user, staff, and doctor information
 *     tags:
 *       - User Management
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *                 minLength: 1
 *                 example: doctor_smith
 *               email:
 *                 type: string
 *                 format: email
 *                 example: doctor@hospital.com
 *               password:
 *                 type: string
 *                 minLength: 6
 *                 example: SecurePass123
 *               birthday:
 *                 type: string
 *                 format: date
 *                 example: 1985-06-15
 *               gender:
 *                 type: string
 *                 enum: [male, female, other]
 *                 example: male
 *               phone:
 *                 type: string
 *                 minLength: 10
 *                 pattern: '^\d+$'
 *                 example: "0987654321"
 *               address:
 *                 type: object
 *                 required:
 *                   - detail
 *                   - ward
 *                   - city
 *                   - country
 *                 properties:
 *                   detail:
 *                     type: string
 *                     example: 456 Hospital Ave
 *                   ward:
 *                     type: string
 *                     example: Ward 5
 *                   district:
 *                     type: string
 *                     example: District 2
 *                   city:
 *                     type: string
 *                     example: Ho Chi Minh City
 *                   country:
 *                     type: string
 *                     example: Vietnam
 *               name:
 *                 type: object
 *                 required:
 *                   - firstName
 *                   - lastName
 *                 properties:
 *                   firstName:
 *                     type: string
 *                     example: John
 *                   lastName:
 *                     type: string
 *                     example: Smith
 *               staffData:
 *                 type: object
 *                 required:
 *                   - departmentId
 *                   - position
 *                   - joinTime
 *                 properties:
 *                   departmentId:
 *                     type: integer
 *                     minimum: 1
 *                     example: 1
 *                   position:
 *                     type: string
 *                     example: Senior Doctor
 *                   joinTime:
 *                     type: string
 *                     format: date-time
 *                     example: 2020-01-15
 *               doctorData:
 *                 type: object
 *                 required:
 *                   - specialization
 *                   - licenseNumber
 *                   - experienceYears
 *                   - level
 *                 properties:
 *                   specialization:
 *                     type: string
 *                     example: Cardiology
 *                   licenseNumber:
 *                     type: string
 *                     example: LIC-2020-12345
 *                   experienceYears:
 *                     type: integer
 *                     minimum: 0
 *                     example: 15
 *                   level:
 *                     type: string
 *                     example: Consultant
 *             required:
 *               - username
 *               - email
 *               - password
 *               - birthday
 *               - gender
 *               - phone
 *               - address
 *               - name
 *               - staffData
 *               - doctorData
 *     responses:
 *       201:
 *         description: Doctor created successfully
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
 *                   example: Đăng ký tài khoản bác sĩ thành công
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           example: uuid-user-123
 *                         username:
 *                           type: string
 *                         email:
 *                           type: string
 *                         password:
 *                           type: string
 *                           description: Hashed password
 *                         birthday:
 *                           type: string
 *                           format: date
 *                         gender:
 *                           type: string
 *                         phone:
 *                           type: string
 *                         roleId:
 *                           type: integer
 *                     staff:
 *                       type: object
 *                       properties:
 *                         userId:
 *                           type: string
 *                         staffId:
 *                           type: string
 *                         departmentId:
 *                           type: integer
 *                         position:
 *                           type: string
 *                         joinTime:
 *                           type: string
 *                           format: date-time
 *                     doctor:
 *                       type: object
 *                       properties:
 *                         userId:
 *                           type: string
 *                         specialization:
 *                           type: string
 *                         licenseNumber:
 *                           type: string
 *                         experienceYears:
 *                           type: integer
 *                         level:
 *                           type: string
 *       400:
 *         description: Validation error or email already exists
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
 *                   example: Email đã tồn tại
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
 *                   example: Đăng ký tài khoản thất bại. Vui lòng thử lại
 */
router.post(
    '/doctors/create',
    authenticateToken(),
    checkRole(['admin']),
    validateDto(RegisterDoctorDto, 'body'),
    asyncHandler(adminuserController.registerDoctor)
);

/**
 * @swagger
 * /api/v1/adminusers/doctors/update/{id}:
 *   put:
 *     summary: Update doctor information
 *     description: Updates an existing doctor's information (requires admin role)
 *     tags:
 *       - User Management
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Doctor/User ID
 *         example: uuid-doctor-456
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               birthday:
 *                 type: string
 *                 format: date
 *                 example: 1985-06-15
 *               gender:
 *                 type: string
 *                 enum: [male, female, other]
 *                 example: male
 *               phone:
 *                 type: string
 *                 minLength: 10
 *                 pattern: '^\d+$'
 *                 example: "0987654321"
 *               address:
 *                 type: object
 *                 properties:
 *                   detail:
 *                     type: string
 *                     example: 456 Hospital Ave
 *                   ward:
 *                     type: string
 *                     example: Ward 5
 *                   district:
 *                     type: string
 *                     example: District 2
 *                   city:
 *                     type: string
 *                     example: Ho Chi Minh City
 *                   country:
 *                     type: string
 *                     example: Vietnam
 *               name:
 *                 type: object
 *                 properties:
 *                   firstName:
 *                     type: string
 *                     example: John
 *                   lastName:
 *                     type: string
 *                     example: Smith
 *               staffData:
 *                 type: object
 *                 properties:
 *                   departmentId:
 *                     type: integer
 *                     minimum: 1
 *                     example: 1
 *                   position:
 *                     type: string
 *                     example: Senior Doctor
 *                   joinTime:
 *                     type: string
 *                     format: date-time
 *                     example: 2020-01-15
 *               doctorData:
 *                 type: object
 *                 properties:
 *                   specialization:
 *                     type: string
 *                     example: Cardiology
 *                   licenseNumber:
 *                     type: string
 *                     example: LIC-2020-12345
 *                   experienceYears:
 *                     type: integer
 *                     minimum: 0
 *                     example: 15
 *                   level:
 *                     type: string
 *                     example: Consultant
 *     responses:
 *       200:
 *         description: Doctor updated successfully
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
 *                   example: Cập nhật thông tin bác sĩ thành công
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         username:
 *                           type: string
 *                         email:
 *                           type: string
 *                         birthday:
 *                           type: string
 *                           format: date
 *                         gender:
 *                           type: string
 *                         phone:
 *                           type: string
 *                     address:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         detail:
 *                           type: string
 *                         ward:
 *                           type: string
 *                         city:
 *                           type: string
 *                     name:
 *                       type: object
 *                       properties:
 *                         firstName:
 *                           type: string
 *                         lastName:
 *                           type: string
 *                     staff:
 *                       type: object
 *                       properties:
 *                         staffId:
 *                           type: string
 *                         departmentId:
 *                           type: integer
 *                         position:
 *                           type: string
 *                     doctor:
 *                       type: object
 *                       properties:
 *                         specialization:
 *                           type: string
 *                         licenseNumber:
 *                           type: string
 *                         experienceYears:
 *                           type: integer
 *                         level:
 *                           type: string
 *       400:
 *         description: Validation error or user not found
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
 *                   example: User không tồn tại
 *       401:
 *         description: Unauthorized - missing or invalid token
 *       403:
 *         description: Forbidden - insufficient permissions (admin required)
 *       500:
 *         description: Internal server error
 */
router.put(
    '/doctors/update/:id',
    authenticateToken(),
    checkRole(['admin']),
    validateDto(UpdateDoctorDto, 'body'),
    asyncHandler(adminuserController.updateDoctor as any)
);

/**
 * @swagger
 * /api/v1/adminusers/admins/create:
 *   post:
 *     summary: Create a new admin
 *     description: Creates a new admin account with user information (requires admin role)
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
 *               username:
 *                 type: string
 *                 minLength: 1
 *                 example: admin_user
 *               email:
 *                 type: string
 *                 format: email
 *                 example: admin@hospital.com
 *               password:
 *                 type: string
 *                 minLength: 6
 *                 example: SecurePass123
 *               birthday:
 *                 type: string
 *                 format: date
 *                 example: 1985-06-15
 *               gender:
 *                 type: string
 *                 enum: [male, female, other]
 *                 example: male
 *               phone:
 *                 type: string
 *                 minLength: 10
 *                 pattern: '^\d+$'
 *                 example: "0987654321"
 *               address:
 *                 type: object
 *                 required:
 *                   - detail
 *                   - ward
 *                   - city
 *                   - country
 *                 properties:
 *                   detail:
 *                     type: string
 *                     example: 789 Admin Building
 *                   ward:
 *                     type: string
 *                     example: Ward 3
 *                   district:
 *                     type: string
 *                     example: District 1
 *                   city:
 *                     type: string
 *                     example: Ho Chi Minh City
 *                   country:
 *                     type: string
 *                     example: Vietnam
 *               name:
 *                 type: object
 *                 required:
 *                   - firstName
 *                   - lastName
 *                 properties:
 *                   firstName:
 *                     type: string
 *                     example: Administrator
 *                   lastName:
 *                     type: string
 *                     example: System
 *             required:
 *               - username
 *               - email
 *               - password
 *               - birthday
 *               - gender
 *               - phone
 *               - address
 *               - name
 *     responses:
 *       201:
 *         description: Admin created successfully
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
 *                   example: Đăng ký tài khoản quản trị viên thành công
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           example: uuid-admin-123
 *                         username:
 *                           type: string
 *                         email:
 *                           type: string
 *                         password:
 *                           type: string
 *                           description: Hashed password
 *                         birthday:
 *                           type: string
 *                           format: date
 *                         gender:
 *                           type: string
 *                         phone:
 *                           type: string
 *                         roleId:
 *                           type: integer
 *                           example: 3
 *                     name:
 *                       type: object
 *                       properties:
 *                         firstName:
 *                           type: string
 *                         lastName:
 *                           type: string
 *                     address:
 *                       type: object
 *                       properties:
 *                         detail:
 *                           type: string
 *                         ward:
 *                           type: string
 *                         city:
 *                           type: string
 *       400:
 *         description: Validation error or email already exists
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
 *                   example: Email đã tồn tại
 *       401:
 *         description: Unauthorized - missing or invalid token
 *       403:
 *         description: Forbidden - insufficient permissions (admin required)
 *       500:
 *         description: Internal server error
 */
router.post(
    '/admins/create',
    authenticateToken(),
    checkRole(['admin']),
    validateDto(RegisterAdminDto, 'body'),
    asyncHandler(adminuserController.registerAdmin)
);

/**
 * @swagger
 * /api/v1/adminusers/admins/update/{id}:
 *   put:
 *     summary: Update admin information
 *     description: Updates an existing admin's information (requires admin role)
 *     tags:
 *       - User Management
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Admin/User ID
 *         example: uuid-admin-456
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               birthday:
 *                 type: string
 *                 format: date
 *                 example: 1985-06-15
 *               gender:
 *                 type: string
 *                 enum: [male, female, other]
 *                 example: male
 *               phone:
 *                 type: string
 *                 minLength: 10
 *                 pattern: '^\d+$'
 *                 example: "0987654321"
 *               address:
 *                 type: object
 *                 properties:
 *                   detail:
 *                     type: string
 *                     example: 789 Admin Building
 *                   ward:
 *                     type: string
 *                     example: Ward 3
 *                   district:
 *                     type: string
 *                     example: District 1
 *                   city:
 *                     type: string
 *                     example: Ho Chi Minh City
 *                   country:
 *                     type: string
 *                     example: Vietnam
 *               name:
 *                 type: object
 *                 properties:
 *                   firstName:
 *                     type: string
 *                     example: Administrator
 *                   lastName:
 *                     type: string
 *                     example: System
 *     responses:
 *       200:
 *         description: Admin updated successfully
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
 *                   example: Cập nhật thông tin quản trị viên thành công
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         username:
 *                           type: string
 *                         email:
 *                           type: string
 *                         birthday:
 *                           type: string
 *                           format: date
 *                         gender:
 *                           type: string
 *                         phone:
 *                           type: string
 *                         roleId:
 *                           type: integer
 *                           example: 3
 *                     address:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         detail:
 *                           type: string
 *                         ward:
 *                           type: string
 *                         city:
 *                           type: string
 *                     name:
 *                       type: object
 *                       properties:
 *                         firstName:
 *                           type: string
 *                         lastName:
 *                           type: string
 *       400:
 *         description: Validation error or user not found
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
 *                   example: User không tồn tại
 *       401:
 *         description: Unauthorized - missing or invalid token
 *       403:
 *         description: Forbidden - insufficient permissions (admin required)
 *       500:
 *         description: Internal server error
 */
router.put(
    '/admins/update/:id',
    authenticateToken(),
    checkRole(['admin']),
    validateDto(UpdateAdminDto, 'body'),
    asyncHandler(adminuserController.updateAdmin as any)
);

/**
 * @swagger
 * /api/v1/adminusers/patients/create:
 *   post:
 *     summary: Create a new patient
 *     description: Creates a new patient account with user and patient information
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
 *               username:
 *                 type: string
 *                 minLength: 1
 *                 example: patient_01
 *               email:
 *                 type: string
 *                 format: email
 *                 example: patient@hospital.com
 *               password:
 *                 type: string
 *                 minLength: 6
 *                 example: SecurePass123
 *               birthday:
 *                 type: string
 *                 format: date
 *                 example: 1990-05-20
 *               gender:
 *                 type: string
 *                 enum: [male, female, other]
 *                 example: male
 *               phone:
 *                 type: string
 *                 minLength: 10
 *                 pattern: '^\d+$'
 *                 example: "0912345678"
 *               address:
 *                 type: object
 *                 required:
 *                   - detail
 *                   - ward
 *                   - city
 *                   - country
 *                 properties:
 *                   detail:
 *                     type: string
 *                     example: 123 Main Street
 *                   ward:
 *                     type: string
 *                     example: Ward 1
 *                   district:
 *                     type: string
 *                     example: District 1
 *                   city:
 *                     type: string
 *                     example: Ho Chi Minh City
 *                   country:
 *                     type: string
 *                     example: Vietnam
 *               name:
 *                 type: object
 *                 required:
 *                   - firstName
 *                   - lastName
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
 *               - address
 *               - name
 *     responses:
 *       201:
 *         description: Patient created successfully
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
 *                   example: Đăng ký tài khoản bệnh nhân thành công
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         username:
 *                           type: string
 *                         email:
 *                           type: string
 *                         birthday:
 *                           type: string
 *                           format: date
 *                         gender:
 *                           type: string
 *                         phone:
 *                           type: string
 *                     patient:
 *                       type: object
 *                       properties:
 *                         userId:
 *                           type: string
 *                         patientId:
 *                           type: string
 *       400:
 *         description: Validation error or email already exists
 *       401:
 *         description: Unauthorized - missing or invalid token
 *       403:
 *         description: Forbidden - insufficient permissions (admin required)
 *       500:
 *         description: Internal server error
 */
router.post(
    '/patients/create',
    authenticateToken(),
    checkRole(['admin']),
    validateDto(RegisterPatientDto, 'body'),
    asyncHandler(adminuserController.registerPatient)
);

/**
 * @swagger
 * /api/v1/adminusers/patients/update/{id}:
 *   put:
 *     summary: Update patient profile
 *     description: Updates an existing patient's profile information (requires admin role)
 *     tags:
 *       - User Management
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Patient/User ID
 *         example: uuid-patient-123
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               birthday:
 *                 type: string
 *                 format: date
 *                 example: 1990-05-20
 *               gender:
 *                 type: string
 *                 enum: [male, female, other]
 *                 example: male
 *               phone:
 *                 type: string
 *                 minLength: 10
 *                 pattern: '^\d+$'
 *                 example: "0912345678"
 *               address:
 *                 type: object
 *                 properties:
 *                   detail:
 *                     type: string
 *                     example: 123 Main Street
 *                   ward:
 *                     type: string
 *                     example: Ward 1
 *                   district:
 *                     type: string
 *                     example: District 1
 *                   city:
 *                     type: string
 *                     example: Ho Chi Minh City
 *                   country:
 *                     type: string
 *                     example: Vietnam
 *               name:
 *                 type: object
 *                 properties:
 *                   firstName:
 *                     type: string
 *                     example: John
 *                   lastName:
 *                     type: string
 *                     example: Doe
 *     responses:
 *       200:
 *         description: Patient updated successfully
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
 *                   example: Cập nhật thông tin bệnh nhân thành công
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         username:
 *                           type: string
 *                         email:
 *                           type: string
 *                         birthday:
 *                           type: string
 *                           format: date
 *                         gender:
 *                           type: string
 *                         phone:
 *                           type: string
 *                     address:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         detail:
 *                           type: string
 *                         ward:
 *                           type: string
 *                         city:
 *                           type: string
 *                     name:
 *                       type: object
 *                       properties:
 *                         firstName:
 *                           type: string
 *                         lastName:
 *                           type: string
 *       400:
 *         description: Validation error or user not found
 *       401:
 *         description: Unauthorized - missing or invalid token
 *       403:
 *         description: Forbidden - insufficient permissions (admin required)
 *       500:
 *         description: Internal server error
 */
router.put(
    '/patients/update/:id',
    authenticateToken(),
    checkRole(['admin']),
    validateDto(UpdatePatientProfileDto, 'body'),
    asyncHandler(adminuserController.updatePatientProfile as any)
);

/**
 * @swagger
 * /api/v1/adminusers/patients/all:
 *   get:
 *     summary: Get all patients
 *     description: Retrieves a paginated list of all patients with filtering and sorting options
 *     tags:
 *       - User Management
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *         example: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of records per page (max 100)
 *         example: 10
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by username, email, phone, or patient ID
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [username, createdAt, updatedAt, email]
 *         description: Field to sort by
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *         description: Sort direction
 *     responses:
 *       200:
 *         description: List of patients retrieved successfully
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
 *                   example: Lấy danh sách bệnh nhân thành công
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         example: uuid-patient-123
 *                       username:
 *                         type: string
 *                         example: patient_01
 *                       email:
 *                         type: string
 *                         example: patient@hospital.com
 *                       phone:
 *                         type: string
 *                         example: "0987654321"
 *                       gender:
 *                         type: string
 *                         enum: [male, female, other]
 *                       birthday:
 *                         type: string
 *                         format: date
 *                       avatar:
 *                         type: string
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                       updatedAt:
 *                         type: string
 *                         format: date-time
 *                       role:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           name:
 *                             type: string
 *                             example: patient
 *                           prefix:
 *                             type: string
 *                       name:
 *                         type: object
 *                         properties:
 *                           userId:
 *                             type: string
 *                           firstName:
 *                             type: string
 *                           lastName:
 *                             type: string
 *                       address:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           detail:
 *                             type: string
 *                           ward:
 *                             type: string
 *                           city:
 *                             type: string
 *                           country:
 *                             type: string
 *                       patient:
 *                         type: object
 *                         properties:
 *                           userId:
 *                             type: string
 *                           patientId:
 *                             type: string
 *                           healthInsurance:
 *                             type: array
 *                           appointment:
 *                             type: array
 *                 metadata:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     totalItems:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *                     hasPrev:
 *                       type: boolean
 *                     hasNext:
 *                       type: boolean
 *       401:
 *         description: Unauthorized - missing or invalid token
 *       403:
 *         description: Forbidden - insufficient permissions (admin required)
 *       500:
 *         description: Internal server error
 */
router.get(
    '/patients/all',
    authenticateToken(),
    checkRole(['admin']),
    asyncHandler(adminuserController.getAllPatient as any)
);

/**
 * @swagger
 * /api/v1/adminusers/patients/stats:
 *   get:
 *     summary: Get patient statistics
 *     description: Returns aggregated statistics for patients (total, counts by gender, with health insurance, with EHR, with appointments, age groups)
 *     tags:
 *       - User Management
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Patient statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total:
 *                   type: integer
 *                 byGender:
 *                   type: object
 *                   additionalProperties:
 *                     type: integer
 *                 withHealthInsurance:
 *                   type: integer
 *                 withEhr:
 *                   type: integer
 *                 withAppointments:
 *                   type: integer
 *                 ageGroups:
 *                   type: object
 *                   properties:
 *                     under18:
 *                       type: integer
 *                     18-35:
 *                       type: integer
 *                     36-60:
 *                       type: integer
 *                     60+:
 *                       type: integer
 *       401:
 *         description: Unauthorized - missing or invalid token
 *       403:
 *         description: Forbidden - insufficient permissions (admin required)
 */
router.get(
    '/patients/stats',
    authenticateToken(),
    checkRole(['admin']),
    asyncHandler(adminuserController.getPatientStats as any)
);

/**
 * @swagger
 * /api/v1/adminusers/staffs/all:
 *   get:
 *     summary: Get all staff members
 *     description: Retrieves a paginated list of all staff members (doctors, admins, nurses) with filtering and sorting options
 *     tags:
 *       - User Management
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *         example: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of records per page (max 100)
 *         example: 10
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by username, email, or phone
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [username, createdAt, updatedAt, email]
 *         description: Field to sort by
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *         description: Sort direction
 *     responses:
 *       200:
 *         description: List of staff members retrieved successfully
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
 *                   example: Lấy danh sách nhân viên thành công
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         example: uuid-staff-123
 *                       username:
 *                         type: string
 *                         example: doctor_smith
 *                       email:
 *                         type: string
 *                         example: doctor@hospital.com
 *                       phone:
 *                         type: string
 *                         example: "0987654321"
 *                       gender:
 *                         type: string
 *                         enum: [male, female, other]
 *                       birthday:
 *                         type: string
 *                         format: date
 *                       avatar:
 *                         type: string
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                       updatedAt:
 *                         type: string
 *                         format: date-time
 *                       role:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           name:
 *                             type: string
 *                             enum: [doctor, admin, staff]
 *                           prefix:
 *                             type: string
 *                       name:
 *                         type: object
 *                         properties:
 *                           userId:
 *                             type: string
 *                           firstName:
 *                             type: string
 *                           lastName:
 *                             type: string
 *                       address:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           detail:
 *                             type: string
 *                           ward:
 *                             type: string
 *                           city:
 *                             type: string
 *                           country:
 *                             type: string
 *                       staff:
 *                         type: object
 *                         properties:
 *                           userId:
 *                             type: string
 *                           staffId:
 *                             type: string
 *                           departmentId:
 *                             type: integer
 *                           position:
 *                             type: string
 *                           joinTime:
 *                             type: string
 *                             format: date-time
 *                           department:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: integer
 *                               name:
 *                                 type: string
 *                               code:
 *                                 type: string
 *                       doctor:
 *                         type: object
 *                         nullable: true
 *                         properties:
 *                           userId:
 *                             type: string
 *                           specialization:
 *                             type: string
 *                           licenseNumber:
 *                             type: string
 *                           experienceYears:
 *                             type: integer
 *                           level:
 *                             type: string
 *                 metadata:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     totalItems:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *                     hasPrev:
 *                       type: boolean
 *                     hasNext:
 *                       type: boolean
 *       401:
 *         description: Unauthorized - missing or invalid token
 *       403:
 *         description: Forbidden - insufficient permissions (admin required)
 *       500:
 *         description: Internal server error
 */
/**
 * @swagger
 * /api/v1/adminusers/staffs/stats:
 *   get:
 *     summary: Get staff statistics (total, count by role)
 *     tags:
 *       - User Management
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Staff statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total:
 *                   type: integer
 *                 byRole:
 *                   type: object
 *                   additionalProperties:
 *                     type: integer
 *       401:
 *         description: Unauthorized - missing or invalid token
 *       403:
 *         description: Forbidden - insufficient permissions (admin required)
 */
router.get(
    '/staffs/stats',
    authenticateToken(),
    checkRole(['admin']),
    asyncHandler(adminuserController.getStaffStats as any)
);

/**
 * @swagger
 * /api/v1/adminusers/staffs/all:
 *   get:
 *     summary: Get all staff users
 *     tags:
 *       - User Management
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Page size
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term (username, email, phone or name)
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *         description: Filter by role name
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of staff users
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
 *                 metadata:
 *                   type: object
 *       401:
 *         description: Unauthorized - missing or invalid token
 *       403:
 *         description: Forbidden - insufficient permissions (admin required)
 *       500:
 *         description: Internal server error
 */
router.get(
    '/staffs/all',
    authenticateToken(),
    checkRole(['admin']),
    asyncHandler(adminuserController.getAllStaff as any)
);

export default router;
