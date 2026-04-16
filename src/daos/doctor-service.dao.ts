import prisma from '@src/config/prisma';

/**
 * Lấy thông tin DoctorService (thông tin dịch vụ mà bác sĩ cung cấp)
 * @param doctorId - ID của bác sĩ
 * @param medicalServiceId - ID của medical service
 * @returns DoctorService object hoặc null
 */
export async function getDoctorService(
    doctorId: string,
    medicalServiceId: string
) {
    return await prisma.doctorService.findUnique({
        where: {
            doctorId_medicalServiceId: {
                doctorId,
                medicalServiceId,
            },
        },
        include: {
            medicalService: {
                select: {
                    id: true,
                    name: true,
                    description: true,
                    price: true,
                    durationMinutes: true,
                    isActive: true,
                    departmentId: true,
                    department: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                },
            },
            doctor: {
                select: {
                    userId: true,
                    specialization: true,
                    level: true,
                    staff: {
                        select: {
                            user: {
                                select: {
                                    name: {
                                        select: {
                                            firstName: true,
                                            lastName: true,
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
    });
}

/**
 * Lấy danh sách tất cả dịch vụ active mà bác sĩ cung cấp
 * @param doctorId - ID của bác sĩ
 * @returns Array of DoctorService
 */
export async function getActiveDoctorServices(doctorId: string) {
    return await prisma.doctorService.findMany({
        where: {
            doctorId,
            isActive: true,
            medicalService: {
                isActive: true,
            },
        },
        include: {
            medicalService: {
                select: {
                    id: true,
                    name: true,
                    description: true,
                    price: true,
                    durationMinutes: true,
                    departmentId: true,
                    department: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                },
            },
        },
        orderBy: {
            medicalService: {
                name: 'asc',
            },
        },
    });
}

/**
 * Kiểm tra xem bác sĩ có cung cấp dịch vụ này không
 * @param doctorId - ID của bác sĩ
 * @param medicalServiceId - ID của medical service
 * @returns true nếu bác sĩ cung cấp dịch vụ và đang active
 */
export async function isDoctorServiceActive(
    doctorId: string,
    medicalServiceId: string
): Promise<boolean> {
    const doctorService = await prisma.doctorService.findUnique({
        where: {
            doctorId_medicalServiceId: {
                doctorId,
                medicalServiceId,
            },
        },
        select: {
            isActive: true,
            medicalService: {
                select: {
                    isActive: true,
                },
            },
        },
    });

    return (
        doctorService !== null &&
        doctorService.isActive &&
        doctorService.medicalService.isActive
    );
}

export default {
    getDoctorService,
    getActiveDoctorServices,
    isDoctorServiceActive,
};
