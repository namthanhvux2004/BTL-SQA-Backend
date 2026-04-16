import prisma from '@src/config/prisma';
import { CustomError, ErrorType } from '@src/core/Error';
import visitDao from '@src/daos/visit.dao';
import {
    CreateVisitDto,
    GetVisitsByDateDto,
    GetVisitsOfPatientDto,
    GetVisitsOfDoctorDto,
    CancelVisitDataDto,
    GetTasksOfDoctorDto,
} from '@src/dtos/visit.dto';
import { TokenPayload } from '@src/middleware/auth.middleware';
import fileAssetDao from '@src/daos/fileAsset.dao';
import { VisitServiceStatus, VisitStatus } from '@prisma/client';
import { visitServiceDao } from '@src/daos/visit-service.dao';

async function attachFileAssetsToVisit(visit: any) {
    if (!visit) return visit;
    if (
        Array.isArray(visit.medicalRecords) &&
        visit.medicalRecords.length > 0
    ) {
        await Promise.all(
            visit.medicalRecords.map(async (record: any) => {
                const assets = await fileAssetDao.getFileAssetsOfMedicalRecord(
                    record.id
                );
                record.fileAssets = assets;
            })
        );
    }
    return visit;
}

const getVisitsOfPatient = async (
    patientId: string,
    query: GetVisitsOfPatientDto
) => {
    const patient = await prisma.patient.findUnique({
        where: { userId: patientId },
    });
    if (!patient) {
        throw new CustomError(ErrorType.NOT_FOUND, 'Không tìm thấy bệnh nhân');
    }
    const visits = await visitDao.getVisitsOfPatient(patient.userId, query);

    // Attach file assets for medical records in each visit (if any)
    if (Array.isArray(visits.data)) {
        await Promise.all(
            visits.data.map(async (v: any) => await attachFileAssetsToVisit(v))
        );
    }

    return visits;
};

const getVisitsOfDoctor = async (
    doctorId: string,
    query: GetVisitsOfDoctorDto
) => {
    const doctor = await prisma.doctor.findUnique({
        where: { userId: doctorId },
    });
    if (!doctor) {
        throw new CustomError(ErrorType.NOT_FOUND, 'Không tìm thấy bác sĩ');
    }
    const visits = await visitDao.getVisitsOfDoctor(doctor.userId, query);

    // Attach file assets for medical records in each visit (if any)
    if (Array.isArray(visits.data)) {
        await Promise.all(
            visits.data.map(async (v: any) => await attachFileAssetsToVisit(v))
        );
    }
    return visits;
};

const getDetailsOfVisit = async (visitId: string, user: TokenPayload) => {
    const visit = await visitDao.getDetailsOfVisit(visitId);
    if (!visit) {
        throw new CustomError(ErrorType.NOT_FOUND, 'Không tìm thấy lượt khám');
    }

    // check authorization
    if (user.role === 'patient' && visit.ehr.patientId !== user.id) {
        throw new CustomError(
            ErrorType.FORBIDDEN,
            'Bạn không có quyền truy cập thông tin này'
        );
    }

    // Attach file assets for medical records
    await attachFileAssetsToVisit(visit);

    return visit;
};

const getVisitStatsByDate = async (fromDate: string, toDate: string) => {
    const stats = await visitDao.getVisitStatsByDate(fromDate, toDate);
    return stats;
};

const getVisitsByDate = async (query: GetVisitsByDateDto) => {
    const visits = await visitDao.getVisitsByDate(query);

    if (Array.isArray(visits.data)) {
        await Promise.all(
            visits.data.map(async (v: any) => await attachFileAssetsToVisit(v))
        );
    }

    return visits;
};

const createVisit = async (data: CreateVisitDto) => {
    const patient = await prisma.patient.findUnique({
        where: { userId: data.patientUserId },
        include: { ehr: true },
    });
    if (!patient || !patient.ehr) {
        throw new CustomError(
            ErrorType.NOT_FOUND,
            'Không tìm thấy hồ sơ sức khỏe điện tử'
        );
    }

    // Validate doctor exists if provided
    if (data.doctorId) {
        const doctor = await prisma.doctor.findUnique({
            where: { userId: data.doctorId },
        });
        if (!doctor) {
            throw new CustomError(ErrorType.NOT_FOUND, 'Không tìm thấy bác sĩ');
        }
    }

    // Validate appointment exists if provided
    if (data.appointmentId) {
        const appointment = await prisma.appointment.findUnique({
            where: { id: data.appointmentId },
        });
        if (!appointment) {
            throw new CustomError(
                ErrorType.NOT_FOUND,
                'Không tìm thấy lịch hẹn'
            );
        }
    }

    // Validate medical service exists if provided
    if (data.medicalServiceId) {
        const medicalService = await prisma.medicalService.findUnique({
            where: { id: data.medicalServiceId },
        });
        if (!medicalService) {
            throw new CustomError(
                ErrorType.NOT_FOUND,
                'Không tìm thấy dịch vụ y tế'
            );
        }
    }

    // Create visit
    const visitData: any = {
        ehrId: patient.ehr.id,
        patientUserId: patient.userId,
    };

    if (data.doctorId !== undefined) visitData.doctorId = data.doctorId;
    if (data.appointmentId !== undefined)
        visitData.appointmentId = data.appointmentId;
    if (data.medicalServiceId !== undefined)
        visitData.medicalServiceId = data.medicalServiceId;
    if (data.startTime !== undefined) visitData.startTime = data.startTime;
    if (data.status !== undefined) visitData.status = data.status;
    if (data.nextVisitDate !== undefined)
        visitData.nextVisitDate = data.nextVisitDate;
    if (data.type !== undefined) visitData.type = data.type;

    const visit = await visitDao.createVisit(visitData);
    return visit;
};

// ==================== Visit Management Services ====================

/**
 * Get visit summary with all related data
 * @param visitId - Visit ID
 * @param userId - User ID for authorization
 * @param userRole - User role
 * @returns Visit summary with services, prescriptions, and medical records
 */
const getVisitSummary = async (
    visitId: string,
    userId: string,
    userRole: string
) => {
    const visit = await prisma.visit.findUnique({
        where: { id: visitId },
        include: {
            patient: {
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            phone: true,
                        },
                    },
                },
            },
            doctor: true,
            visitServices: {
                include: {
                    medicalService: {
                        select: {
                            id: true,
                            name: true,
                            description: true,
                            price: true,
                        },
                    },
                },
            },
            prescriptions: {
                include: {
                    medicineUsages: {
                        include: {
                            medicine: {
                                select: {
                                    id: true,
                                    name: true,
                                    dosage: true,
                                    unit: true,
                                    price: true,
                                },
                            },
                        },
                    },
                },
            },
            medicalRecords: {
                select: {
                    id: true,
                    title: true,
                    symptoms: true,
                    diagnosis: true,
                    treatments: true,
                    notes: true,
                    createdAt: true,
                    updatedAt: true,
                },
            },
        },
    });

    if (!visit) {
        throw new CustomError(ErrorType.NOT_FOUND, 'Visit not found');
    }

    // Authorization check
    if (userRole === 'patient' && visit.patientUserId !== userId) {
        throw new CustomError(
            ErrorType.FORBIDDEN,
            'You can only access your own visits'
        );
    }

    if (userRole === 'doctor' && visit.doctorId !== userId) {
        throw new CustomError(
            ErrorType.FORBIDDEN,
            'You can only access visits assigned to you'
        );
    }

    // Calculate total costs
    const servicesCost = visit.visitServices.reduce(
        (sum, service) => sum + service.price * service.quantity,
        0
    );

    const medicinesCost = visit.prescriptions.reduce((sum, prescription) => {
        return (
            sum +
            prescription.medicineUsages.reduce(
                (medSum, medicine) => medSum + medicine.price,
                0
            )
        );
    }, 0);

    const totalCost = servicesCost + medicinesCost;

    return {
        ...visit,
        summary: {
            servicesCost,
            medicinesCost,
            totalCost,
            servicesCount: visit.visitServices.length,
            medicinesCount: visit.prescriptions.reduce(
                (count, p) => count + p.medicineUsages.length,
                0
            ),
            medicalRecordsCount: visit.medicalRecords.length,
        },
    };
};

/**
 * Complete a visit
 * @param visitId - Visit ID
 * @param userId - User ID performing the action
 * @param userRole - User role
 * @param data - Completion data
 * @returns Updated visit
 */
const completeVisit = async (
    visitId: string,
    userId: string,
    userRole: string
) => {
    const visit = await prisma.visit.findUnique({
        where: { id: visitId },
    });

    if (!visit) {
        throw new CustomError(ErrorType.NOT_FOUND, 'Visit not found');
    }

    // Authorization: only assigned doctor or admin can complete
    if (userRole === 'doctor' && visit.doctorId !== userId) {
        throw new CustomError(
            ErrorType.FORBIDDEN,
            'Only the assigned doctor can complete this visit'
        );
    }

    // Validate current status
    if (visit.status === 'completed') {
        throw new CustomError(
            ErrorType.BAD_REQUEST,
            'Visit is already completed'
        );
    }

    if (visit.status === 'cancelled') {
        throw new CustomError(
            ErrorType.BAD_REQUEST,
            'Cannot complete a cancelled visit'
        );
    }

    // Update visit status to completed
    const updatedVisit = await prisma.visit.update({
        where: { id: visitId },
        data: {
            status: 'completed',
            endTime: new Date(),
        },
        include: {
            patient: {
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                        },
                    },
                },
            },
            doctor: true,
        },
    });

    return updatedVisit;
};

/**
 * Cancel a visit
 * @param visitId - Visit ID
 * @param userId - User ID performing the action
 * @param userRole - User role
 * @param data - Cancellation data with reason
 * @returns Updated visit
 */
const cancelVisit = async (
    visitId: string,
    userId: string,
    userRole: string,
    data: CancelVisitDataDto
) => {
    const visit = await prisma.visit.findUnique({
        where: { id: visitId },
    });

    if (!visit) {
        throw new CustomError(ErrorType.NOT_FOUND, 'Visit not found');
    }

    // Authorization: only assigned doctor or admin can cancel
    if (userRole === 'doctor' && visit.doctorId !== userId) {
        throw new CustomError(
            ErrorType.FORBIDDEN,
            'Only the assigned doctor can cancel this visit'
        );
    }

    // Validate current status
    if (visit.status === 'completed') {
        throw new CustomError(
            ErrorType.BAD_REQUEST,
            'Cannot cancel a completed visit'
        );
    }

    if (visit.status === 'cancelled') {
        throw new CustomError(
            ErrorType.BAD_REQUEST,
            'Visit is already cancelled'
        );
    }

    // Update visit status to cancelled
    const updatedVisit = await prisma.visit.update({
        where: { id: visitId },
        data: {
            status: 'cancelled',
        },
        include: {
            patient: {
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                        },
                    },
                },
            },
            doctor: true,
        },
    });

    return updatedVisit;
};

/**
 * Calculate total cost of a visit (services + medicines)
 * @param visitId - Visit ID
 * @returns Cost breakdown
 */
const calculateVisitCost = async (visitId: string) => {
    const visit = await prisma.visit.findUnique({
        where: { id: visitId },
        include: {
            visitServices: {
                select: {
                    price: true,
                    quantity: true,
                },
            },
            prescriptions: {
                include: {
                    medicineUsages: {
                        select: {
                            price: true,
                        },
                    },
                },
            },
        },
    });

    if (!visit) {
        throw new CustomError(ErrorType.NOT_FOUND, 'Visit not found');
    }

    const servicesCost = visit.visitServices.reduce(
        (sum, service) => sum + service.price * service.quantity,
        0
    );

    const medicinesCost = visit.prescriptions.reduce((sum, prescription) => {
        return (
            sum +
            prescription.medicineUsages.reduce(
                (medSum, medicine) => medSum + medicine.price,
                0
            )
        );
    }, 0);

    return {
        visitId,
        servicesCost,
        medicinesCost,
        totalCost: servicesCost + medicinesCost,
        breakdown: {
            services: visit.visitServices.map((s) => ({
                price: s.price,
                quantity: s.quantity,
                subtotal: s.price * s.quantity,
            })),
            medicines: visit.prescriptions.flatMap((p) =>
                p.medicineUsages.map((m) => ({
                    price: m.price,
                }))
            ),
        },
    };
};

const updateVisitStatus = async (visitId: string, status: VisitStatus) => {
    const updatedVisit = await prisma.visit.update({
        where: { id: visitId },
        data: { status },
    });
    return updatedVisit;
};

const updateNextVisitDate = async (visitId: string, nextVisitDate: string) => {
    const updatedVisit = await prisma.visit.update({
        where: { id: visitId },
        data: { nextVisitDate: nextVisitDate ? new Date(nextVisitDate) : null },
    });
    return updatedVisit;
};

const searchVisits = async (patientId: string, query: any) => {
    // Verify patient exists
    const patient = await prisma.patient.findFirst({
        where: {
            OR: [{ userId: patientId }, { patientId: patientId }],
        },
    });
    if (!patient) {
        throw new CustomError(ErrorType.NOT_FOUND, 'Không tìm thấy bệnh nhân');
    }

    const visits = await visitDao.searchVisits(patientId, query);

    // Attach file assets for medical records in each visit
    if (Array.isArray(visits.data)) {
        await Promise.all(
            visits.data.map(async (v: any) => await attachFileAssetsToVisit(v))
        );
    }

    return visits;
};

/**
 * Get tasks of doctor - includes visits assigned to doctor and visits with services doctor can perform
 * @param doctorId - Doctor user ID
 * @param query - Query parameters
 * @returns Paginated tasks with taskSource field
 */
const getTasksOfDoctor = async (
    doctorId: string,
    query: GetTasksOfDoctorDto
) => {
    // Verify doctor exists
    const doctor = await prisma.doctor.findUnique({
        where: { userId: doctorId },
    });
    if (!doctor) {
        throw new CustomError(ErrorType.NOT_FOUND, 'Không tìm thấy bác sĩ');
    }

    const tasks = await visitDao.getTasksOfDoctor(doctor.userId, query);

    // Attach file assets for medical records in each task (if any)
    if (Array.isArray(tasks.data)) {
        await Promise.all(
            tasks.data.map(
                async (task: any) => await attachFileAssetsToVisit(task)
            )
        );
    }

    return tasks;
};

const updateVisitServiceStatus = async (
    visitServiceId: string,
    status: VisitServiceStatus
) => {
    const updatedVisitService = await visitServiceDao.updateStatus(
        visitServiceId,
        status
    );
    return updatedVisitService;
};

export default {
    getVisitsOfPatient,
    getVisitsOfDoctor,
    getDetailsOfVisit,
    getVisitStatsByDate,
    getVisitsByDate,
    createVisit,
    getVisitSummary,
    completeVisit,
    cancelVisit,
    calculateVisitCost,
    updateVisitStatus,
    updateNextVisitDate,
    searchVisits,
    getTasksOfDoctor,
    updateVisitServiceStatus,
};
