import {
    ForbiddenResponse,
    NotFoundResponse,
    SuccessResponse,
} from '@src/core/ApiResponse';
import { GetPatientByIdDataDto } from '@src/dtos/patient.dto';
import emergencyContactService from '@src/services/emergencyContact.service';
import healthInsuranceService from '@src/services/healthInsurance.service';
import patientService from '@src/services/patient.service';
import { PaginationQuery } from '@src/types';
import { Request, Response } from 'express';

const getPatient = async (
    req: Request<GetPatientByIdDataDto>,
    res: Response
) => {
    const { id } = req.params;
    const userToken = req.user;
    if (!userToken) {
        return new ForbiddenResponse('Access denied').send(res);
    }
    const data = await patientService.getPatientById(id, userToken);
    return new SuccessResponse(data, 'Lấy thông tin bệnh nhân thành công').send(
        res
    );
};

const getEmergencyContacts = async (
    req: Request<{ patientId: string }, {}, {}, PaginationQuery>,
    res: Response
) => {
    const { patientId } = req.params;
    const user = req.user;
    const emergencyContact =
        await emergencyContactService.getEmergencyContactsByPatientId(
            patientId,
            req.query
        );
    if (!emergencyContact) {
        return new NotFoundResponse('Emergency contact not found').send(res);
    }
    if (
        !user ||
        ['patient', 'doctor', 'admin'].indexOf(user.role) === -1 ||
        (user.role === 'patient' && user.id !== emergencyContact[0].patientId)
    ) {
        return new ForbiddenResponse(
            'You do not have permission to access this resource'
        ).send(res);
    }
    return new SuccessResponse(
        emergencyContact,
        'Emergency contact retrieved successfully'
    ).send(res);
};

const getHealthInsurances = async (
    req: Request<{ patientId: string }, {}, {}, PaginationQuery>,
    res: Response
) => {
    const { patientId } = req.params;
    const user = req.user;
    const healthInsurances =
        await healthInsuranceService.getHealthInsurancesByUserId(
            patientId,
            req.query
        );
    if (!healthInsurances) {
        return new NotFoundResponse('Health insurances not found').send(res);
    }
    if (
        !user ||
        ['patient', 'doctor', 'admin'].indexOf(user.role) === -1 ||
        (user.role === 'patient' && user.id !== healthInsurances[0].patientId)
    ) {
        return new ForbiddenResponse(
            'You do not have permission to access this resource'
        ).send(res);
    }
    return new SuccessResponse(
        healthInsurances,
        'Health insurances retrieved successfully'
    ).send(res);
};

const getPatients = async (
    req: Request<{}, {}, {}, PaginationQuery>,
    res: Response
) => {
    const patients = await patientService.getAllPatients(req.query);
    return new SuccessResponse(
        patients.data,
        'Lấy danh sách bệnh nhân thành công',
        patients.metadata
    ).send(res);
};

export default {
    getPatient,
    getEmergencyContacts,
    getHealthInsurances,
    getPatients,
};
