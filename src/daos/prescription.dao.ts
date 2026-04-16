import prisma from '@config/prisma';
import { Prisma } from '@prisma/client';
import {
    CreatePrescriptionDataDto,
    UpdatePrescriptionDataDto,
    CreateMedicineUsageDataDto,
    UpdateMedicineUsageDataDto,
} from '@src/dtos/prescription.dto';

// ==================== Includes ====================

const prescriptionInclude: Prisma.PrescriptionInclude = {
    visit: {
        include: {
            patient: {
                include: {
                    user: {
                        select: {
                            id: true,
                            username: true,
                            email: true,
                            name: true,
                        },
                    },
                },
            },
            doctor: {
                include: {
                    staff: {
                        include: {
                            user: {
                                select: {
                                    id: true,
                                    username: true,
                                    email: true,
                                    name: true,
                                },
                            },
                        },
                    },
                },
            },
        },
    },
    createdBy: {
        select: {
            id: true,
            username: true,
            email: true,
            name: true,
        },
    },
    medicineUsages: {
        include: {
            medicine: true,
        },
    },
};

const medicineUsageInclude: Prisma.MedicineUsageInclude = {
    medicine: true,
    prescription: {
        select: {
            id: true,
            visitId: true,
            paid: true,
        },
    },
};

// ==================== Prescription DAOs ====================

/**
 * Create a new prescription
 * @param userId - ID of the user creating the prescription
 * @param data - Prescription data
 * @returns Created prescription
 */
export const createPrescription = async (
    userId: string,
    data: CreatePrescriptionDataDto
) => {
    return await prisma.prescription.create({
        data: {
            visitId: data.visitId,
            createdByUserId: userId,
            paid: false,
            medicineUsages: {
                create: data.medicines?.map((medicine) => ({
                    medicineId: medicine.medicineId || undefined,
                    drugName: medicine.drugName,
                    quantity: medicine.quantity,
                    note: medicine.note || null,
                    price: medicine.price || 0,
                    isPurchased: false,
                })),
            },
        },
        include: prescriptionInclude,
    });
};

/**
 * Find prescription by ID
 * @param id - Prescription ID
 * @returns Prescription or null
 */
export const findPrescriptionById = async (id: string) => {
    return await prisma.prescription.findUnique({
        where: { id },
        include: prescriptionInclude,
    });
};

/**
 * Find prescriptions by visit ID
 * @param visitId - Visit ID
 * @returns Array of prescriptions
 */
export const findPrescriptionsByVisitId = async (visitId: string) => {
    return await prisma.prescription.findMany({
        where: { visitId },
        include: prescriptionInclude,
        orderBy: {
            createdAt: 'desc',
        },
    });
};

/**
 * Update prescription
 * @param id - Prescription ID
 * @param data - Updated prescription data
 * @returns Updated prescription
 */
export const updatePrescription = async (
    id: string,
    data: UpdatePrescriptionDataDto
) => {
    return await prisma.prescription.update({
        where: { id },
        data: {
            ...(data.paid !== undefined && { paid: data.paid }),
        },
        include: prescriptionInclude,
    });
};

/**
 * Delete prescription
 * @param id - Prescription ID
 * @returns Deleted prescription
 */
export const deletePrescription = async (id: string) => {
    // This will cascade delete medicine usages
    return await prisma.prescription.delete({
        where: { id },
    });
};

/**
 * Get prescriptions with pagination and filtering
 * @param filters - Query filters
 * @returns Paginated prescriptions
 */
export const getPrescriptions = async (filters: {
    visitId?: string;
    paid?: boolean;
    fromDate?: Date;
    toDate?: Date;
    page: number;
    limit: number;
    sortBy: string;
    sortOrder: 'asc' | 'desc';
}) => {
    const { visitId, paid, fromDate, toDate, page, limit, sortBy, sortOrder } =
        filters;
    const skip = (page - 1) * limit;

    const where: Prisma.PrescriptionWhereInput = {};
    if (visitId) where.visitId = visitId;
    if (paid !== undefined) where.paid = paid;
    if (fromDate || toDate) {
        where.createdAt = {};
        if (fromDate) where.createdAt.gte = fromDate;
        if (toDate) where.createdAt.lte = toDate;
    }

    const [prescriptions, total] = await Promise.all([
        prisma.prescription.findMany({
            where,
            skip,
            take: limit,
            orderBy: {
                [sortBy]: sortOrder,
            },
            include: prescriptionInclude,
        }),
        prisma.prescription.count({ where }),
    ]);

    return {
        data: prescriptions,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        },
    };
};

/**
 * Check if user created the prescription
 * @param prescriptionId - Prescription ID
 * @param userId - User ID
 * @returns True if user is creator, false otherwise
 */
export const checkPrescriptionOwnership = async (
    prescriptionId: string,
    userId: string
): Promise<boolean> => {
    const prescription = await prisma.prescription.findUnique({
        where: { id: prescriptionId },
        select: { createdByUserId: true },
    });

    return prescription?.createdByUserId === userId;
};

// ==================== Medicine Usage DAOs ====================

/**
 * Find medicine usages by prescription ID
 * @param prescriptionId - Prescription ID
 * @returns Array of medicine usages
 */
export const findMedicineUsagesByPrescriptionId = async (
    prescriptionId: string
) => {
    return await prisma.medicineUsage.findMany({
        where: { prescriptionId },
        include: medicineUsageInclude,
        orderBy: {
            createdAt: 'asc',
        },
    });
};

/**
 * Find medicine usage by ID
 * @param id - Medicine usage ID
 * @returns Medicine usage or null
 */
export const findMedicineUsageById = async (id: string) => {
    return await prisma.medicineUsage.findUnique({
        where: { id },
        include: medicineUsageInclude,
    });
};

/**
 * Create medicine usage
 * @param prescriptionId - Prescription ID
 * @param data - Medicine usage data
 * @returns Created medicine usage
 */
export const createMedicineUsage = async (
    prescriptionId: string,
    data: CreateMedicineUsageDataDto
) => {
    return await prisma.medicineUsage.create({
        data: {
            prescriptionId,
            medicineId: data.medicineId || null,
            drugName: data.drugName,
            quantity: data.quantity,
            note: data.note || null,
            price: data.price || 0,
            isPurchased: false,
        },
        include: medicineUsageInclude,
    });
};

/**
 * Update medicine usage
 * @param id - Medicine usage ID
 * @param data - Updated medicine usage data
 * @returns Updated medicine usage
 */
export const updateMedicineUsage = async (
    id: string,
    data: UpdateMedicineUsageDataDto
) => {
    const updateData: any = {};

    if (data.medicineId !== undefined) {
        if (data.medicineId) {
            updateData.medicine = { connect: { id: data.medicineId } };
        } else {
            updateData.medicine = { disconnect: true };
        }
    }
    if (data.quantity) updateData.quantity = data.quantity;
    if (data.note !== undefined) updateData.note = data.note;
    if (data.isPurchased !== undefined)
        updateData.isPurchased = data.isPurchased;

    return await prisma.medicineUsage.update({
        where: { id },
        data: updateData,
        include: medicineUsageInclude,
    });
};

/**
 * Delete medicine usage
 * @param id - Medicine usage ID
 * @returns Deleted medicine usage
 */
export const deleteMedicineUsage = async (id: string) => {
    return await prisma.medicineUsage.delete({
        where: { id },
    });
};

/**
 * Batch create medicine usages
 * @param prescriptionId - Prescription ID
 * @param medicines - Array of medicine usage data
 * @returns Array of created medicine usages
 */
export const batchCreateMedicineUsages = async (
    prescriptionId: string,
    medicines: CreateMedicineUsageDataDto[]
) => {
    const created = await prisma.$transaction(
        medicines.map((medicine) =>
            prisma.medicineUsage.create({
                data: {
                    prescriptionId,
                    medicineId: medicine.medicineId || null,
                    drugName: medicine.drugName,
                    quantity: medicine.quantity,
                    note: medicine.note || null,
                    price: medicine.price || 0,
                    isPurchased: false,
                },
                include: medicineUsageInclude,
            })
        )
    );

    return created;
};

/**
 * Replace all medicine usages for a prescription (transaction)
 * @param prescriptionId - Prescription ID
 * @param medicines - Array of new medicine usage data
 * @returns Updated prescription with new medicines
 */
export const replaceMedicineUsages = async (
    prescriptionId: string,
    medicines: UpdateMedicineUsageDataDto[]
) => {
    return await prisma.$transaction(async (tx) => {
        // Delete all existing medicine usages
        await tx.medicineUsage.deleteMany({
            where: { prescriptionId },
        });

        // Create new medicine usages one by one (createMany doesn't support nested relations)
        const medicineCreations: any = {};

        // group by medicineId
        for (const medicine of medicines) {
            if (medicine.medicineId) {
                medicineCreations[medicine.medicineId] = {
                    ...medicine,
                    quantity:
                        (medicineCreations[medicine.medicineId]?.quantity ||
                            0) + medicine.quantity,
                };
            } else {
                medicineCreations[medicine.medicineId] = {
                    ...medicine,
                };
            }
        }

        for (const key in medicineCreations) {
            const medicine = medicineCreations[key];
            await tx.medicineUsage.create({
                data: {
                    prescriptionId,
                    medicineId: medicine.medicineId || null,
                    drugName: medicine.drugName,
                    quantity: medicine.quantity,
                    note: medicine.note || null,
                    price: medicine.price || 0,
                    isPurchased: false,
                },
            });
        }

        // Return updated prescription
        return await tx.prescription.findUnique({
            where: { id: prescriptionId },
            include: prescriptionInclude,
        });
    });
};
