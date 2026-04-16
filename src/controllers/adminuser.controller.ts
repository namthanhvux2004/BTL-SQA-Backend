import { User, Staff, Doctor, Patient } from '@prisma/client';
import { SuccessResponse } from '@src/core/ApiResponse';
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
import AdminuserService from '@src/services/adminuser.service';
import { Request, Response } from 'express';

const registerDoctor = async (
    req: Request<{}, {}, RegisterDoctorDataDto>,
    res: Response<
        SuccessResponse<{
            user: User;
            staff: Staff;
            doctor: Doctor;
        }>
    >
) => {
    const body = req.body;
    const result = await AdminuserService.registerDoctor(body);
    return new SuccessResponse(
        result.data,
        'Đăng ký tài khoản thành công'
    ).send(res);
};

const updateDoctor = async (
    req: Request<{ id: string }, {}, UpdateDoctorDataDto>,
    res: Response<
        SuccessResponse<{
            user: User;
            staff: Staff;
            doctor: Doctor;
        }>
    >
) => {
    const id = req.params.id;
    const body = req.body;
    const result = await AdminuserService.updateDoctor(body, id);
    return new SuccessResponse(
        result.data,
        'Cập nhật tài khoản thành công'
    ).send(res);
};

const registerAdmin = async (
    req: Request<{}, {}, RegisterAdminDataDto>,
    res: Response<
        SuccessResponse<{
            user: User;
            staff: Staff;
        }>
    >
) => {
    const body = req.body;
    const result = await AdminuserService.registerAdmin(body);
    return new SuccessResponse(
        result.data,
        'Đăng ký tài khoản admin thành công'
    ).send(res);
};

const updateAdmin = async (
    req: Request<{ id: string }, {}, UpdateAdminDataDto>,
    res: Response<
        SuccessResponse<{
            user: User;
            staff: Staff;
        }>
    >
) => {
    const id = req.params.id;
    const body = req.body;
    const result = await AdminuserService.updateAdmin(body, id);
    return new SuccessResponse(
        result.data,
        'Cập nhật tài khoản admin thành công'
    ).send(res);
};

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
    const result = await AdminuserService.registerPatient(body);
    return new SuccessResponse(
        result.data,
        'Đăng ký bệnh nhân thành công'
    ).send(res);
};

const updatePatientProfile = async (
    req: Request<{ id: string }, {}, UpdatePatientProfileDataDto>,
    res: Response<
        SuccessResponse<{
            user: User;
        }>
    >
) => {
    const id = req.params.id;
    const body = req.body;
    const result = await AdminuserService.updateUserProfile(body, id);
    return new SuccessResponse(
        result.data,
        'Cập nhật hồ sơ người dùng thành công'
    ).send(res);
};

const getAllPatient = async (
    req: Request<{}, {}, {}, GetAllPatientDataDto>,
    res: Response<SuccessResponse<any>>
) => {
    const query = req.query;
    const result = await AdminuserService.getAllPatient(query);
    return new SuccessResponse(
        result.data,
        'Lấy danh sách bệnh nhân thành công',
        result.metadata
    ).send(res);
};

const getAllStaff = async (
    req: Request<{}, {}, {}, GetAllStaffDataDto>,
    res: Response<SuccessResponse<any>>
) => {
    const query = req.query;
    const result = await AdminuserService.getAllStaff(query);

    const users = result.data.map((item) => {
        const user = { ...(item as any) };
        delete user.password;
        return user;
    });

    return new SuccessResponse(
        users,
        'Lấy danh sách nhân viên thành công',
        result.metadata
    ).send(res);
};

const getStaffStats = async (
    req: Request,
    res: Response<SuccessResponse<any>>
) => {
    const result = await AdminuserService.getStaffStats();
    return new SuccessResponse(
        result,
        'Lấy thống kê nhân viên thành công'
    ).send(res);
};

const getPatientStats = async (
    req: Request,
    res: Response<SuccessResponse<any>>
) => {
    const result = await AdminuserService.getPatientStats();
    return new SuccessResponse(
        result,
        'Lấy thống kê bệnh nhân thành công'
    ).send(res);
};

export default {
    registerDoctor,
    updateDoctor,
    registerAdmin,
    updateAdmin,
    registerPatient,
    updatePatientProfile,
    getAllPatient,
    getAllStaff,
    getStaffStats,
    getPatientStats,
};
