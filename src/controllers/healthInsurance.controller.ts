import {
    ForbiddenResponse,
    NotFoundResponse,
    SuccessResponse,
} from '@src/core/ApiResponse';
import { HealthInsuranceDataDto } from '@src/dtos/healthInsurance.dto';
import healthInsuranceService from '@src/services/healthInsurance.service';
import { Request, Response } from 'express';

const getHealthInsurances = async (
    req: Request<{ userId: string }>,
    res: Response
) => {
    const { userId } = req.params;
    const user = req.user;
    const healthInsurances =
        await healthInsuranceService.getHealthInsurancesByUserId(userId);
    if (!healthInsurances) {
        return new NotFoundResponse('Health insurances not found').send(res);
    }
    if (
        !user ||
        ['patient', 'doctor', 'admin'].indexOf(user.role) === -1 ||
        (user.role === 'patient' && user.id !== userId)
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

const getHealthInsuranceById = async (
    req: Request<{ id: string }>,
    res: Response
) => {
    const { id } = req.params;
    const user = req.user;
    const healthInsurance =
        await healthInsuranceService.getHealthInsuranceById(id);
    if (!healthInsurance) {
        return new NotFoundResponse('Health insurance not found').send(res);
    }
    if (
        !user ||
        ['patient', 'doctor', 'admin'].indexOf(user.role) === -1 ||
        (user.role === 'patient' && user.id !== healthInsurance.userId)
    ) {
        return new ForbiddenResponse(
            'You do not have permission to access this resource'
        ).send(res);
    }
    return new SuccessResponse(
        healthInsurance,
        'Health insurance retrieved successfully'
    ).send(res);
};

const createHealthInsurance = async (
    req: Request<{ userId: string }>,
    res: Response
) => {
    const { userId } = req.params;
    const user = req.user;
    const data = req.body as HealthInsuranceDataDto;
    if (
        !user ||
        ['patient', 'admin'].indexOf(user.role) === -1 ||
        (user.role === 'patient' && user.id !== userId)
    ) {
        return new ForbiddenResponse(
            'You do not have permission to access this resource'
        ).send(res);
    }
    const healthInsurance = await healthInsuranceService.createHealthInsurance(
        userId,
        data
    );
    if (!healthInsurance) {
        return new SuccessResponse(
            null,
            'Health insurance already exists'
        ).send(res);
    }
    return new SuccessResponse(
        healthInsurance,
        'Health insurance created successfully'
    ).send(res);
};

const updateHealthInsurance = async (
    req: Request<{ id: string }>,
    res: Response
) => {
    const { id } = req.params;
    const user = req.user;
    const data = req.body as Partial<HealthInsuranceDataDto>;
    if (!user || ['patient', 'admin'].indexOf(user.role) === -1) {
        return new ForbiddenResponse(
            'You do not have permission to access this resource'
        ).send(res);
    }
    const healthInsurance = await healthInsuranceService.updateHealthInsurance(
        id,
        data
    );
    return new SuccessResponse(
        healthInsurance,
        'Health insurance updated successfully'
    ).send(res);
};

const deleteHealthInsurance = async (
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
    await healthInsuranceService.deleteHealthInsurance(id);
    return new SuccessResponse(
        null,
        'Health insurance deleted successfully'
    ).send(res);
};

export default {
    getHealthInsuranceById,
    createHealthInsurance,
    updateHealthInsurance,
    deleteHealthInsurance,
    getHealthInsurances,
};
