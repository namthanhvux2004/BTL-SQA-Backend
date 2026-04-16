import { Request, Response } from 'express';
import {
    CreatePrescriptionDataDto,
    UpdatePrescriptionDataDto,
    GetPrescriptionsQueryDataDto,
    CreateMedicineUsageDataDto,
    UpdateMedicineUsageDataDto,
} from '@src/dtos/prescription.dto';
import prescriptionService from '@services/prescription.service';
import { SuccessResponse } from '@src/core/ApiResponse';

const createPrescription = async (req: Request, res: Response) => {
    const user = req.user!;
    const data = req.body as CreatePrescriptionDataDto;

    const prescription = await prescriptionService.createPrescription(
        user.id,
        data
    );

    return new SuccessResponse(prescription, 'Tạo đơn thuốc thành công').send(
        res
    );
};

const getPrescription = async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!id) {
        throw new Error('Prescription ID is required');
    }
    const user = req.user!;

    const prescription = await prescriptionService.getPrescriptionById(
        id,
        user.id
    );

    return new SuccessResponse(
        prescription,
        'Lấy thông tin đơn thuốc thành công'
    ).send(res);
};

const getPrescriptionsByVisitId = async (req: Request, res: Response) => {
    const { visitId } = req.params;
    if (!visitId) {
        throw new Error('Visit ID is required');
    }

    const prescriptions =
        await prescriptionService.getPrescriptionsByVisitId(visitId);

    return new SuccessResponse(
        prescriptions,
        'Lấy danh sách đơn thuốc thành công'
    ).send(res);
};

const getPrescriptions = async (req: Request, res: Response) => {
    const query = req.query as GetPrescriptionsQueryDataDto;

    const result = await prescriptionService.getPrescriptionsList(query);

    return new SuccessResponse(
        result.data,
        'Lấy danh sách đơn thuốc thành công',
        result.metadata
    ).send(res);
};

const updatePrescription = async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!id) {
        throw new Error('Prescription ID is required');
    }
    const user = req.user!;
    const data = req.body as UpdatePrescriptionDataDto;

    const updatedPrescription = await prescriptionService.updatePrescription(
        id,
        user.id,
        data
    );

    return new SuccessResponse(
        updatedPrescription,
        'Cập nhật đơn thuốc thành công'
    ).send(res);
};

const updatePrescriptionWithMedicines = async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!id) {
        throw new Error('Prescription ID is required');
    }
    const user = req.user!;
    const { medicines } = req.body;

    const updatedPrescription =
        await prescriptionService.updatePrescriptionWithMedicines(
            id,
            user.id,
            medicines
        );

    return new SuccessResponse(
        updatedPrescription,
        'Cập nhật đơn thuốc thành công'
    ).send(res);
};

/**
 * Delete prescription
 * Doctor/Admin only - requires authentication and ownership
 */
const deletePrescription = async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!id) {
        throw new Error('Prescription ID is required');
    }
    const user = req.user!;

    await prescriptionService.deletePrescription(id, user.id);

    return new SuccessResponse(null, 'Xóa đơn thuốc thành công').send(res);
};

const getMedicineUsagesByPrescriptionId = async (
    req: Request,
    res: Response
) => {
    const { prescriptionId } = req.params;
    if (!prescriptionId) {
        throw new Error('Prescription ID is required');
    }

    const medicineUsages =
        await prescriptionService.getMedicineUsagesByPrescriptionId(
            prescriptionId
        );

    return new SuccessResponse(
        medicineUsages,
        'Lấy danh sách thuốc thành công'
    ).send(res);
};

/**
 * Create medicine usage (add medicine to prescription)
 * Doctor/Admin only - requires authentication and ownership
 */
const createMedicineUsage = async (req: Request, res: Response) => {
    const { prescriptionId } = req.body;
    const user = req.user!;
    const data = req.body as CreateMedicineUsageDataDto;

    const medicineUsage = await prescriptionService.createMedicineUsage(
        prescriptionId,
        user.id,
        data
    );

    return new SuccessResponse(
        medicineUsage,
        'Thêm thuốc vào đơn thành công'
    ).send(res);
};

/**
 * Update medicine usage
 * Doctor/Admin only - requires authentication and ownership
 */
const updateMedicineUsage = async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!id) {
        throw new Error('Medicine usage ID is required');
    }
    const user = req.user!;
    const data = req.body as UpdateMedicineUsageDataDto;

    const updatedMedicineUsage = await prescriptionService.updateMedicineUsage(
        id,
        user.id,
        data
    );

    return new SuccessResponse(
        updatedMedicineUsage,
        'Cập nhật thông tin thuốc thành công'
    ).send(res);
};

/**
 * Delete medicine usage
 * Doctor/Admin only - requires authentication and ownership
 */
const deleteMedicineUsage = async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!id) {
        throw new Error('Medicine usage ID is required');
    }
    const user = req.user!;

    await prescriptionService.deleteMedicineUsage(id, user.id);

    return new SuccessResponse(null, 'Xóa thuốc khỏi đơn thành công').send(res);
};

/**
 * Batch add medicines to prescription
 * Doctor/Admin only - requires authentication and ownership
 */
const addMedicinesToPrescription = async (req: Request, res: Response) => {
    const { prescriptionId, medicines } = req.body;
    const user = req.user!;

    const createdMedicines =
        await prescriptionService.addMedicinesToPrescription(
            prescriptionId,
            user.id,
            medicines
        );

    return new SuccessResponse(
        createdMedicines,
        'Thêm danh sách thuốc vào đơn thành công'
    ).send(res);
};

const togglePurchaseMedicines = async (
    req: Request<{}, {}, { medicineUsageIds: string[] }>,
    res: Response
) => {
    const { medicineUsageIds } = req.body;

    console.log('Received medicineUsageIds:', medicineUsageIds);

    const updatedMedicineUsage =
        await prescriptionService.togglePurchaseMedicines(medicineUsageIds);

    return new SuccessResponse(
        updatedMedicineUsage,
        'Cập nhật trạng thái mua thuốc thành công'
    ).send(res);
};

export default {
    createPrescription,
    getPrescription,
    getPrescriptionsByVisitId,
    getPrescriptions,
    updatePrescription,
    updatePrescriptionWithMedicines,
    deletePrescription,
    getMedicineUsagesByPrescriptionId,
    createMedicineUsage,
    updateMedicineUsage,
    deleteMedicineUsage,
    addMedicinesToPrescription,
    togglePurchaseMedicines,
};
