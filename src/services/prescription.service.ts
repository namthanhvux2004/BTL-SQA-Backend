import { CustomError, ErrorType } from '@src/core/Error';
import {
    createPrescription as createPrescriptionDao,
    updatePrescription as updatePrescriptionDao,
    deletePrescription as deletePrescriptionDao,
    findPrescriptionById,
    findPrescriptionsByVisitId,
    getPrescriptions,
    checkPrescriptionOwnership,
    createMedicineUsage as createMedicineUsageDao,
    updateMedicineUsage as updateMedicineUsageDao,
    deleteMedicineUsage as deleteMedicineUsageDao,
    findMedicineUsageById,
    findMedicineUsagesByPrescriptionId,
    batchCreateMedicineUsages,
    replaceMedicineUsages,
} from '@src/daos/prescription.dao';
import { findVisitById } from '@src/daos/visit.dao';
import {
    CreatePrescriptionDataDto,
    UpdatePrescriptionDataDto,
    GetPrescriptionsQueryDataDto,
    CreateMedicineUsageDataDto,
    UpdateMedicineUsageDataDto,
} from '@src/dtos/prescription.dto';
import prisma from '@src/config/prisma';

/**
 * Validate visit status before creating/updating prescription
 * @param visitId - Visit ID
 * @param userId - User ID (for checking if user is the assigned doctor)
 * @throws CustomError if visit is invalid
 */
const validateVisitForPrescription = async (
    visitId: string,
    userId?: string
) => {
    const visit = await findVisitById(visitId);

    if (!visit) {
        throw new CustomError(ErrorType.NOT_FOUND, 'Visit not found');
    }

    // Check visit status
    if (visit.status === 'completed') {
        throw new CustomError(
            ErrorType.BAD_REQUEST,
            'Cannot create or modify prescription for completed visit'
        );
    }

    if (visit.status === 'cancelled') {
        throw new CustomError(
            ErrorType.BAD_REQUEST,
            'Cannot create or modify prescription for cancelled visit'
        );
    }

    // Check if user is assigned doctor (for doctors)
    if (userId && visit.doctorId && visit.doctorId !== userId) {
        throw new CustomError(
            ErrorType.FORBIDDEN,
            'You are not the assigned doctor for this visit'
        );
    }

    return visit;
};

// ==================== Prescription Services ====================

/**
 * Create a new prescription
 * @param userId - User ID creating the prescription
 * @param data - Prescription data
 * @returns Created prescription
 */
const createPrescription = async (
    userId: string,
    data: CreatePrescriptionDataDto
) => {
    // Validate visit
    await validateVisitForPrescription(data.visitId, userId);

    // Create prescription with medicines
    const prescription = await createPrescriptionDao(userId, {
        ...data,
        medicines: data.medicines || [],
    });
    return prescription;
};

/**
 * Get prescription by ID
 * @param id - Prescription ID
 * @param userId - User ID (optional, for authorization check)
 * @returns Prescription
 */
const getPrescriptionById = async (id: string, userId?: string) => {
    const prescription = await findPrescriptionById(id);

    if (!prescription) {
        throw new CustomError(ErrorType.NOT_FOUND, 'Prescription not found');
    }

    // If userId provided, check if user has access (creator, assigned doctor, or patient)
    if (userId) {
        const hasAccess =
            prescription.createdByUserId === userId ||
            prescription.visit?.doctorId === userId ||
            prescription.visit?.patientUserId === userId;

        if (!hasAccess) {
            throw new CustomError(
                ErrorType.FORBIDDEN,
                'You do not have access to this prescription'
            );
        }
    }

    return prescription;
};

/**
 * Get prescriptions by visit ID
 * @param visitId - Visit ID
 * @returns Array of prescriptions
 */
const getPrescriptionsByVisitId = async (visitId: string) => {
    // Verify visit exists
    const visit = await findVisitById(visitId);
    if (!visit) {
        throw new CustomError(ErrorType.NOT_FOUND, 'Visit not found');
    }

    return await findPrescriptionsByVisitId(visitId);
};

/**
 * Update prescription
 * @param id - Prescription ID
 * @param userId - User ID updating the prescription
 * @param data - Updated prescription data
 * @returns Updated prescription
 */
const updatePrescription = async (
    id: string,
    userId: string,
    data: UpdatePrescriptionDataDto
) => {
    // Check if prescription exists
    const prescription = await findPrescriptionById(id);
    if (!prescription) {
        throw new CustomError(ErrorType.NOT_FOUND, 'Prescription not found');
    }

    // Validate visit status
    await validateVisitForPrescription(prescription.visitId, userId);

    // Check ownership (only creator can update)
    const isOwner = await checkPrescriptionOwnership(id, userId);
    if (!isOwner) {
        throw new CustomError(
            ErrorType.FORBIDDEN,
            'You do not have permission to update this prescription'
        );
    }

    return await updatePrescriptionDao(id, data);
};

/**
 * Update prescription with new medicines (replace all)
 * @param prescriptionId - Prescription ID
 * @param userId - User ID
 * @param medicines - New medicines array
 * @returns Updated prescription
 */
const updatePrescriptionWithMedicines = async (
    prescriptionId: string,
    userId: string,
    medicines: UpdateMedicineUsageDataDto[]
) => {
    // Check if prescription exists
    const prescription = await findPrescriptionById(prescriptionId);
    if (!prescription) {
        throw new CustomError(ErrorType.NOT_FOUND, 'Prescription not found');
    }

    // Validate visit status
    await validateVisitForPrescription(prescription.visitId, userId);

    // Check ownership
    const isOwner = await checkPrescriptionOwnership(prescriptionId, userId);
    if (!isOwner) {
        throw new CustomError(
            ErrorType.FORBIDDEN,
            'You do not have permission to update this prescription'
        );
    }

    // Replace medicines (transaction)
    const updatedPrescription = await replaceMedicineUsages(
        prescriptionId,
        medicines
    );

    return updatedPrescription;
};

/**
 * Delete prescription
 * @param id - Prescription ID
 * @param userId - User ID
 * @returns Deleted prescription
 */
const deletePrescription = async (id: string, userId: string) => {
    // Check if prescription exists
    const prescription = await findPrescriptionById(id);
    if (!prescription) {
        throw new CustomError(ErrorType.NOT_FOUND, 'Prescription not found');
    }

    // Validate visit status
    await validateVisitForPrescription(prescription.visitId, userId);

    // Check ownership
    const isOwner = await checkPrescriptionOwnership(id, userId);
    if (!isOwner) {
        throw new CustomError(
            ErrorType.FORBIDDEN,
            'You do not have permission to delete this prescription'
        );
    }

    return await deletePrescriptionDao(id);
};

/**
 * Get list of prescriptions with pagination
 * @param query - Query parameters
 * @returns Paginated prescriptions
 */
const getPrescriptionsList = async (query: GetPrescriptionsQueryDataDto) => {
    const page = parseInt(query.page);
    const limit = parseInt(query.limit);
    const sortBy = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder || 'desc';

    const filters: any = {
        page,
        limit,
        sortBy,
        sortOrder,
    };

    if (query.visitId) filters.visitId = query.visitId;
    if (query.paid !== undefined) filters.paid = query.paid;
    if (query.fromDate) filters.fromDate = new Date(query.fromDate);
    if (query.toDate) filters.toDate = new Date(query.toDate);

    const result = await getPrescriptions(filters);

    return {
        data: result.data,
        metadata: {
            page: result.pagination.page,
            limit: result.pagination.limit,
            totalItems: result.pagination.total,
            totalPages: result.pagination.totalPages,
            hasPrev: result.pagination.page > 1,
            hasNext: result.pagination.page < result.pagination.totalPages,
        },
    };
};

// ==================== Medicine Usage Services ====================

/**
 * Get medicine usages by prescription ID
 * @param prescriptionId - Prescription ID
 * @returns Array of medicine usages
 */
const getMedicineUsagesByPrescriptionId = async (prescriptionId: string) => {
    // Verify prescription exists
    const prescription = await findPrescriptionById(prescriptionId);
    if (!prescription) {
        throw new CustomError(ErrorType.NOT_FOUND, 'Prescription not found');
    }

    return await findMedicineUsagesByPrescriptionId(prescriptionId);
};

/**
 * Create medicine usage (add to prescription)
 * @param prescriptionId - Prescription ID
 * @param userId - User ID
 * @param data - Medicine usage data
 * @returns Created medicine usage
 */
const createMedicineUsage = async (
    prescriptionId: string,
    userId: string,
    data: CreateMedicineUsageDataDto
) => {
    // Check if prescription exists
    const prescription = await findPrescriptionById(prescriptionId);
    if (!prescription) {
        throw new CustomError(ErrorType.NOT_FOUND, 'Prescription not found');
    }

    // Validate visit status
    await validateVisitForPrescription(prescription.visitId, userId);

    // Check ownership
    const isOwner = await checkPrescriptionOwnership(prescriptionId, userId);
    if (!isOwner) {
        throw new CustomError(
            ErrorType.FORBIDDEN,
            'You do not have permission to add medicines to this prescription'
        );
    }

    return await createMedicineUsageDao(prescriptionId, data);
};

/**
 * Update medicine usage
 * @param id - Medicine usage ID
 * @param userId - User ID
 * @param data - Updated medicine usage data
 * @returns Updated medicine usage
 */
const updateMedicineUsage = async (
    id: string,
    userId: string,
    data: UpdateMedicineUsageDataDto
) => {
    // Check if medicine usage exists
    const medicineUsage = await findMedicineUsageById(id);
    if (!medicineUsage) {
        throw new CustomError(ErrorType.NOT_FOUND, 'Medicine usage not found');
    }

    // Get prescription to check ownership
    const prescription = await findPrescriptionById(
        medicineUsage.prescriptionId
    );
    if (!prescription) {
        throw new CustomError(ErrorType.NOT_FOUND, 'Prescription not found');
    }

    // Validate visit status
    await validateVisitForPrescription(prescription.visitId, userId);

    // Check ownership
    const isOwner = await checkPrescriptionOwnership(
        medicineUsage.prescriptionId,
        userId
    );
    if (!isOwner) {
        throw new CustomError(
            ErrorType.FORBIDDEN,
            'You do not have permission to update this medicine usage'
        );
    }

    return await updateMedicineUsageDao(id, data);
};

/**
 * Delete medicine usage
 * @param id - Medicine usage ID
 * @param userId - User ID
 * @returns Deleted medicine usage
 */
const deleteMedicineUsage = async (id: string, userId: string) => {
    // Check if medicine usage exists
    const medicineUsage = await findMedicineUsageById(id);
    if (!medicineUsage) {
        throw new CustomError(ErrorType.NOT_FOUND, 'Medicine usage not found');
    }

    // Get prescription to check ownership
    const prescription = await findPrescriptionById(
        medicineUsage.prescriptionId
    );
    if (!prescription) {
        throw new CustomError(ErrorType.NOT_FOUND, 'Prescription not found');
    }

    // Validate visit status
    await validateVisitForPrescription(prescription.visitId, userId);

    // Check ownership
    const isOwner = await checkPrescriptionOwnership(
        medicineUsage.prescriptionId,
        userId
    );
    if (!isOwner) {
        throw new CustomError(
            ErrorType.FORBIDDEN,
            'You do not have permission to delete this medicine usage'
        );
    }

    return await deleteMedicineUsageDao(id);
};

/**
 * Batch add medicines to prescription
 * @param prescriptionId - Prescription ID
 * @param userId - User ID
 * @param medicines - Array of medicine usage data
 * @returns Array of created medicine usages
 */
const addMedicinesToPrescription = async (
    prescriptionId: string,
    userId: string,
    medicines: CreateMedicineUsageDataDto[]
) => {
    // Check if prescription exists
    const prescription = await findPrescriptionById(prescriptionId);
    if (!prescription) {
        throw new CustomError(ErrorType.NOT_FOUND, 'Prescription not found');
    }

    // Validate visit status
    await validateVisitForPrescription(prescription.visitId, userId);

    // Check ownership
    const isOwner = await checkPrescriptionOwnership(prescriptionId, userId);
    if (!isOwner) {
        throw new CustomError(
            ErrorType.FORBIDDEN,
            'You do not have permission to add medicines to this prescription'
        );
    }

    const mergedMap = new Map<string, any>();

    for (const item of medicines) {
        const key = `${item.medicineId}`;

        if (mergedMap.has(key)) {
            const existing = mergedMap.get(key);
            existing.quantity += item.quantity;
        } else {
            mergedMap.set(key, { ...item });
        }
    }

    return await batchCreateMedicineUsages(
        prescriptionId,
        Array.from(mergedMap.values())
    );
};

const togglePurchaseMedicines = async (medicineUsageIds: string[]) => {
    return await prisma.medicineUsage.updateMany({
        where: {
            id: {
                in: medicineUsageIds,
            },
        },
        data: {
            isPurchased: true,
        },
    });
};

export default {
    // Prescription services
    createPrescription,
    getPrescriptionById,
    getPrescriptionsByVisitId,
    updatePrescription,
    updatePrescriptionWithMedicines,
    deletePrescription,
    getPrescriptionsList,

    // Medicine usage services
    getMedicineUsagesByPrescriptionId,
    createMedicineUsage,
    updateMedicineUsage,
    deleteMedicineUsage,
    addMedicinesToPrescription,
    replaceMedicineUsages,
    togglePurchaseMedicines,
};
