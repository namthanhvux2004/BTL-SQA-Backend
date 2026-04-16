import {
    CreateEHRDataDto,
    CreateHealthInfoDataDto,
    DeleteEHRDataDto,
    GetEHRByIdDataDto,
    GetEHRsQueryDataDto,
    UpdateHealthInfoDataDto,
} from '@src/dtos/ehr.dto';
import {
    createEHRForPatient,
    createHealthInfoByPatientId,
    deleteEHRById,
    findEHRById,
    findEHRByPatientId,
    findHealthInfoByPatientId,
    getListEHRs,
    updateHealthInfoByPatientId,
} from '@src/daos/ehr.dao';
import { CustomError, ErrorType } from '@src/core/Error';
import prisma from '@src/config/prisma';
import fileAssetDao from '@src/daos/fileAsset.dao';

// Lấy EHR của bệnh nhân theo patientId
const getEHRByPatientId = async (patientId: string) => {
    const ehr = await findEHRByPatientId(patientId);
    if (!ehr) {
        throw new CustomError(
            ErrorType.NOT_FOUND,
            'Hồ sơ bệnh án chưa được tạo. Vui lòng liên hệ admin để tạo hồ sơ.'
        );
    }

    // Fetch medical records related to this EHR (via visits)
    const visits = ehr.visits || [];
    const visitIds = visits.map((v: any) => v.id);

    const medicalRecords = await prisma.medicalRecord.findMany({
        where: { visitId: { in: visitIds } },
        include: {
            doctor: {
                include: {
                    staff: {
                        include: {
                            user: {
                                select: {
                                    id: true,
                                    username: true,
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
            visit: true,
        },
        orderBy: { createdAt: 'desc' },
    });

    // Attach file assets for each medical record
    await Promise.all(
        medicalRecords.map(async (rec: any) => {
            rec.fileAssets = await fileAssetDao.getFileAssetsOfMedicalRecord(
                rec.id
            );
        })
    );

    return {
        ...ehr,
        medicalResult: medicalRecords,
    };
};

// Lấy thông tin sức khỏe của bệnh nhân
const getHealthInfoByPatientId = async (patientId: string) => {
    const healthInfo = await findHealthInfoByPatientId(patientId);
    if (!healthInfo) {
        throw new CustomError(
            ErrorType.NOT_FOUND,
            'Thông tin sức khỏe chưa được tạo.'
        );
    }

    return healthInfo;
};

// Tạo mới thông tin sức khỏe
const createHealthInfo = async (
    patientId: string,
    data: CreateHealthInfoDataDto
) => {
    // Validate dữ liệu đầu vào
    const bmi = data.weight / Math.pow(data.height / 100, 2);
    if (bmi < 10 || bmi > 100) {
        throw new CustomError(
            ErrorType.VALIDATION_ERROR,
            'Chỉ số BMI không hợp lệ. Vui lòng kiểm tra lại cân nặng và chiều cao.'
        );
    }

    const newHealthInfo = await createHealthInfoByPatientId(patientId, data);
    return {
        ...newHealthInfo,
        bmi:
            newHealthInfo.weight != null && newHealthInfo.height != null
                ? Number(
                      (
                          newHealthInfo.weight /
                          Math.pow(newHealthInfo.height / 100, 2)
                      ).toFixed(2)
                  )
                : null,
    };
};

// Cập nhật thông tin sức khỏe
const updateHealthInfo = async (
    patientId: string,
    data: UpdateHealthInfoDataDto
) => {
    // Validate dữ liệu đầu vào
    if (data.weight && data.height) {
        const bmi = data.weight / Math.pow(data.height / 100, 2);
        if (bmi < 10 || bmi > 100) {
            throw new CustomError(
                ErrorType.VALIDATION_ERROR,
                'Chỉ số BMI không hợp lệ. Vui lòng kiểm tra lại cân nặng và chiều cao.'
            );
        }
    }

    const updatedHealthInfo = await updateHealthInfoByPatientId(
        patientId,
        data
    );
    return {
        ...updatedHealthInfo,
        bmi:
            updatedHealthInfo.weight && updatedHealthInfo.height
                ? Number(
                      (
                          updatedHealthInfo.weight /
                          Math.pow(updatedHealthInfo.height / 100, 2)
                      ).toFixed(2)
                  )
                : null,
    };
};

// patientId: là id của patient dạng custom
// userId: là id của user dạng uuid
const checkPatientAccess = async (patientId: string, userId: string) => {
    const user = await prisma.user.findFirst({
        where: { id: userId },
        include: { role: true },
    });

    if (!user) {
        throw new CustomError(
            ErrorType.UNAUTHORIZED,
            'Người dùng không tồn tại'
        );
    }

    const patient = await prisma.patient.findUnique({
        where: { userId: patientId },
    });

    if (!patient) {
        throw new CustomError(ErrorType.NOT_FOUND, 'Không tìm thấy bệnh nhân');
    }

    if (user.role.name === 'admin' || user.role.name === 'doctor') {
        return true;
    }

    if (user.role.name === 'patient') {
        if (patient.userId !== userId) {
            throw new CustomError(
                ErrorType.FORBIDDEN,
                'Bạn không có quyền truy cập hồ sơ bệnh án này'
            );
        }
        return true;
    }

    throw new CustomError(
        ErrorType.FORBIDDEN,
        'Bạn không có quyền truy cập hồ sơ bệnh án này'
    );
};

// Tạo mới EHR cho bệnh nhân
const createEHR = async (data: CreateEHRDataDto) => {
    try {
        return await createEHRForPatient(data.patientId);
    } catch (error: any) {
        if (error.message === 'Bệnh nhân đã có hồ sơ bệnh án') {
            throw new CustomError(
                ErrorType.BAD_REQUEST,
                'Bệnh nhân đã có hồ sơ bệnh án'
            );
        }
        if (error.message === 'Bệnh nhân không tồn tại') {
            throw new CustomError(
                ErrorType.NOT_FOUND,
                'Bệnh nhân không tồn tại'
            );
        }
        throw new CustomError(
            ErrorType.INTERNAL_ERROR,
            'Không thể tạo hồ sơ bệnh án'
        );
    }
};

// Xóa EHR
const deleteEHR = async (data: DeleteEHRDataDto) => {
    try {
        const deletedEHR = await deleteEHRById(data.ehrId);
        return { message: 'Xóa hồ sơ bệnh án thành công', deletedEHR };
    } catch (error: any) {
        if (error.message === 'Hồ sơ bệnh án không tồn tại') {
            throw new CustomError(
                ErrorType.NOT_FOUND,
                'Hồ sơ bệnh án không tồn tại'
            );
        }
        throw new CustomError(
            ErrorType.INTERNAL_ERROR,
            'Không thể xóa hồ sơ bệnh án'
        );
    }
};

// Lấy tất cả EHR với phân trang và tìm kiếm
const getAllEHRs = async (query: GetEHRsQueryDataDto) => {
    const result = await getListEHRs(query);

    if (!result.data || result.data.length === 0) {
        throw new CustomError(
            ErrorType.NOT_FOUND,
            'Không tìm thấy hồ sơ bệnh án nào'
        );
    }

    return result;
};

const getEHRById = async (data: GetEHRByIdDataDto) => {
    const ehr = await findEHRById(data.ehrId);

    if (!ehr) {
        throw new CustomError(
            ErrorType.NOT_FOUND,
            'Hồ sơ bệnh án không tồn tại'
        );
    }

    return ehr;
};

export default {
    getEHRByPatientId,
    getHealthInfoByPatientId,
    createHealthInfo,
    updateHealthInfo,
    checkPatientAccess,
    createEHR,
    deleteEHR,
    getAllEHRs,
    getEHRById,
};
