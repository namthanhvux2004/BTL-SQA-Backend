import prisma from '@src/config/prisma';
import { CustomError, ErrorType } from '@src/core/Error';
import patientDao from '@src/daos/patient.dao';
import { TokenPayload } from '@src/middleware/auth.middleware';
import { PaginationQuery } from '@src/types';

const getPatientById = async (id: string, userToken: TokenPayload) => {
    await checkPatientAccess(userToken, id, ['admin', 'doctor']);
    return await patientDao.getPatientById(id);
};

const checkPatientAccess = async (
    userToken: TokenPayload,
    id: string,
    byPassRoles: string[]
) => {
    const patient = await prisma.patient.findFirst({
        where: {
            OR: [{ userId: id }, { patientId: id }],
        },
    });

    if (!patient) {
        throw new CustomError(ErrorType.NOT_FOUND, 'Không tìm thấy bệnh nhân');
    }

    if (byPassRoles.includes(userToken.role)) {
        return true;
    }

    if (userToken.role === 'patient') {
        if (patient.userId !== userToken.id) {
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

const getAllPatients = async (query: PaginationQuery) => {
    return await patientDao.getAllPatients(query);
};

export default {
    getPatientById,
    getAllPatients,
};
