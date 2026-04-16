import { ForbiddenResponse, SuccessResponse } from '@src/core/ApiResponse';

import {
    CreateEHRDataDto,
    CreateHealthInfoDataDto,
    DeleteEHRDataDto,
    GetEHRByIdDataDto,
    GetEHRDataDto,
    GetEHRsQueryDataDto,
    UpdateHealthInfoDataDto,
} from '@src/dtos/ehr.dto';
import ehrService from '@src/services/ehr.service';
import { Request, Response } from 'express';

// Lấy EHR của bệnh nhân
const getEHR = async (req: Request, res: Response) => {
    const { patientId } = req.params as GetEHRDataDto;
    const user = req.user!;

    // Kiểm tra quyền truy cập
    await ehrService.checkPatientAccess(patientId, user.id);

    const ehr = await ehrService.getEHRByPatientId(patientId);

    return new SuccessResponse(ehr, 'Lấy hồ sơ bệnh án thành công').send(res);
};

// Lấy thông tin sức khỏe của bệnh nhân
const getHealthInformation = async (req: Request, res: Response) => {
    const { patientId } = req.params as GetEHRDataDto;
    const user = req.user!;

    // Kiểm tra quyền truy cập
    await ehrService.checkPatientAccess(patientId, user.id);

    const healthInfo = await ehrService.getHealthInfoByPatientId(patientId);

    return new SuccessResponse(
        healthInfo,
        'Lấy thông tin sức khỏe thành công'
    ).send(res);
};

// Tạo mới thông tin sức khỏe
const createHealthInformation = async (req: Request, res: Response) => {
    const { patientId } = req.params as GetEHRDataDto;
    const data = req.body as CreateHealthInfoDataDto;
    const user = req.user!;

    // Kiểm tra quyền truy cập
    await ehrService.checkPatientAccess(patientId, user.id);

    const newHealthInfo = await ehrService.createHealthInfo(user.id, data);

    return new SuccessResponse(
        newHealthInfo,
        'Tạo thông tin sức khỏe thành công'
    ).send(res);
};

// Cập nhật thông tin sức khỏe
const updateHealthInformation = async (req: Request, res: Response) => {
    const { patientId } = req.params as GetEHRDataDto;
    const data = req.body as UpdateHealthInfoDataDto;
    const user = req.user!;

    // Kiểm tra quyền truy cập
    await ehrService.checkPatientAccess(patientId, user.id);

    const updatedHealthInfo = await ehrService.updateHealthInfo(user.id, data);

    return new SuccessResponse(
        updatedHealthInfo,
        'Cập nhật thông tin sức khỏe thành công'
    ).send(res);
};

// Tạo mới EHR cho bệnh nhân
const createEHR = async (req: Request, res: Response) => {
    const user = req.user!;
    if (!['admin', 'doctor', 'patient'].includes(user.role)) {
        return new ForbiddenResponse('Không có quyền tạo hồ sơ bệnh án');
    }
    if (user.role === 'patient' && user.id !== req.body.patientId) {
        return new ForbiddenResponse(
            'Bệnh nhân không được phép tạo hồ sơ bệnh án cho người khác'
        );
    }
    const data = req.body as CreateEHRDataDto;

    const ehr = await ehrService.createEHR(data);

    return new SuccessResponse(ehr, 'Tạo hồ sơ bệnh án thành công').send(res);
};

// Xóa EHR
const deleteEHR = async (req: Request, res: Response) => {
    const { ehrId } = req.params as DeleteEHRDataDto;

    const result = await ehrService.deleteEHR({ ehrId });

    return new SuccessResponse(result, 'Xóa hồ sơ bệnh án thành công').send(
        res
    );
};

// Lấy tất cả EHR với phân trang và tìm kiếm
const getAllEHRs = async (req: Request, res: Response) => {
    const query = req.query as GetEHRsQueryDataDto;

    const result = await ehrService.getAllEHRs(query);

    return new SuccessResponse(
        result,
        'Lấy danh sách hồ sơ bệnh án thành công'
    ).send(res);
};

// Lấy EHR theo ID
const getEHRById = async (req: Request, res: Response) => {
    const { ehrId } = req.params as GetEHRByIdDataDto;

    const ehr = await ehrService.getEHRById({ ehrId });

    return new SuccessResponse(ehr, 'Lấy hồ sơ bệnh án thành công').send(res);
};

export default {
    getEHR,
    getHealthInformation,
    createHealthInformation,
    updateHealthInformation,
    createEHR,
    deleteEHR,
    getAllEHRs,
    getEHRById,
};
