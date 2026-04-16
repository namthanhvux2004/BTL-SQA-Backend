import { Request, Response } from 'express';
import {
    CreateMedicalRecordDataDto,
    UpdateMedicalRecordDataDto,
    GetMedicalRecordsQueryDataDto,
} from '@src/dtos/medical-record.dto';
import medicalRecordService from '@services/medical-record.service';
import { SuccessResponse } from '@src/core/ApiResponse';

/**
 * Create a new medical record
 * Doctor only - requires authentication
 */
const createMedicalRecord = async (req: Request, res: Response) => {
    const user = req.user!;
    const data = req.body as CreateMedicalRecordDataDto;
    const files = req.files as Express.Multer.File[] | undefined;

    // Create medical record with doctor ID
    const medicalRecord = await medicalRecordService.createMedicalRecord(
        user.id,
        data,
        files
    );

    return new SuccessResponse(
        medicalRecord,
        'Tạo bản ghi khám chữa bệnh thành công'
    ).send(res);
};

/**
 * Get medical record by ID
 */
const getMedicalRecord = async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!id) {
        throw new Error('Medical record ID is required');
    }
    const user = req.user!;

    // Doctor can view their own records, patient can view their own
    const medicalRecord = await medicalRecordService.getMedicalRecordById(
        id,
        user.role === 'doctor' ? user.id : undefined
    );

    return new SuccessResponse(
        medicalRecord,
        'Lấy bản ghi khám chữa bệnh thành công'
    ).send(res);
};

/**
 * Update medical record
 * Doctor only - requires authentication and ownership
 */
const updateMedicalRecord = async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!id) {
        throw new Error('Medical record ID is required');
    }
    const user = req.user!;
    const data = req.body as UpdateMedicalRecordDataDto;
    const files = req.files as Express.Multer.File[] | undefined;

    const updatedRecord = await medicalRecordService.updateMedicalRecord(
        id,
        user.id,
        data,
        files
    );

    return new SuccessResponse(
        updatedRecord,
        'Cập nhật bản ghi khám chữa bệnh thành công'
    ).send(res);
};

/**
 * Delete medical record
 * Doctor only - requires authentication and ownership
 */
const deleteMedicalRecord = async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!id) {
        throw new Error('Medical record ID is required');
    }
    const user = req.user!;

    const result = await medicalRecordService.deleteMedicalRecord(id, user.id);

    return new SuccessResponse(
        result,
        'Xóa bản ghi khám chữa bệnh thành công'
    ).send(res);
};

/**
 * Get list of medical records with pagination
 */
const getMedicalRecords = async (req: Request, res: Response) => {
    const query = req.query as GetMedicalRecordsQueryDataDto;

    const result = await medicalRecordService.getMedicalRecordsList(query);

    return new SuccessResponse(
        result,
        'Lấy danh sách bản ghi khám chữa bệnh thành công'
    ).send(res);
};

const deleteFileAsset = async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!id) {
        throw new Error('File asset ID is required');
    }

    const result = await medicalRecordService.deleteFileAsset(id);

    return new SuccessResponse(result, 'Xóa tệp tin thành công').send(res);
};

export default {
    createMedicalRecord,
    getMedicalRecord,
    updateMedicalRecord,
    deleteMedicalRecord,
    getMedicalRecords,
    deleteFileAsset,
};
