import {
    ForbiddenResponse,
    NotFoundResponse,
    SuccessResponse,
} from '@src/core/ApiResponse';
import { EmergencyContactDataDto } from '@src/dtos/emergency-contact.dto';
import emergencyContactService from '@src/services/emergencyContact.service';
import { Request, Response } from 'express';

const getEmergencyContactById = async (
    req: Request<{ id: string }>,
    res: Response
) => {
    const { id } = req.params;
    const user = req.user;
    const emergencyContact =
        await emergencyContactService.getEmergencyContactById(id);
    if (!emergencyContact) {
        return new NotFoundResponse('Emergency contact not found').send(res);
    }
    if (
        !user ||
        ['patient', 'doctor', 'admin'].indexOf(user.role) === -1 ||
        (user.role === 'patient' && user.id !== emergencyContact.patientId)
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

const createEmergencyContact = async (
    req: Request<{ patientId: string }>,
    res: Response
) => {
    const { patientId } = req.params;
    const user = req.user;
    const data = req.body as EmergencyContactDataDto;
    if (
        !user ||
        ['patient', 'admin'].indexOf(user.role) === -1 ||
        (user.role === 'patient' && user.id !== patientId)
    ) {
        return new ForbiddenResponse(
            'You do not have permission to access this resource'
        ).send(res);
    }
    const emergencyContact =
        await emergencyContactService.createEmergencyContact(patientId, data);
    if (!emergencyContact) {
        return new SuccessResponse(
            null,
            'Emergency contact already exists'
        ).send(res);
    }
    return new SuccessResponse(
        emergencyContact,
        'Emergency contact created successfully'
    ).send(res);
};

const updateEmergencyContact = async (
    req: Request<{ id: string }>,
    res: Response
) => {
    const { id } = req.params;
    const user = req.user;
    const data = req.body as Partial<EmergencyContactDataDto>;
    if (!user || ['patient', 'admin'].indexOf(user.role) === -1) {
        return new ForbiddenResponse(
            'You do not have permission to access this resource'
        ).send(res);
    }
    const emergencyContact =
        await emergencyContactService.updateEmergencyContact(id, data);
    return new SuccessResponse(
        emergencyContact,
        'Emergency contact updated successfully'
    ).send(res);
};

const deleteEmergencyContact = async (
    req: Request<{ id: string }>,
    res: Response
) => {
    const { id } = req.params;
    const user = req.user;
    if (!user || ['patient', 'admin'].indexOf(user.role) === -1) {
        return new ForbiddenResponse(
            'You do not have permission to access this resource'
        ).send(res);
    }
    await emergencyContactService.deleteEmergencyContact(id);
    return new SuccessResponse(
        null,
        'Emergency contact deleted successfully'
    ).send(res);
};

export default {
    getEmergencyContactById,
    createEmergencyContact,
    updateEmergencyContact,
    deleteEmergencyContact,
};
