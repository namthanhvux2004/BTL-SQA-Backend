import { Request, Response } from 'express';
import { visitServiceService } from '@src/services/visit-service.service';
import { SuccessResponse } from '@src/core/ApiResponse';
import {
    CreateServiceUsageDataDto,
    UpdateServiceUsageDataDto,
    ServiceUsageQueryDataDto,
    ServiceUsageParamsDataDto,
    VisitServiceHistoryParamsDataDto,
    BulkCreateServiceUsageDataDto,
} from '@src/dtos/visit-service.dto';

/**
 * POST /api/v1/service-usages
 * Create a new visit service
 */
export const createServiceUsage = async (
    req: Request<{}, {}, CreateServiceUsageDataDto>,
    res: Response
): Promise<Response> => {
    const user = req.user!;
    const data = {
        ...req.body,
        orderedByUserId: user.id, // Auto-set from authenticated user
    };

    const result = await visitServiceService.createServiceUsage(data);

    res.status(201);
    return new SuccessResponse(
        result,
        'Visit service created successfully'
    ).send(res);
};

/**
 * GET /api/v1/service-usages/:id
 * Get visit service by ID
 */
export const getServiceUsageById = async (
    req: Request<ServiceUsageParamsDataDto>,
    res: Response
): Promise<Response> => {
    const user = req.user!;
    const userRole = user.role || 'patient';
    const userId = user.id;

    const result = await visitServiceService.getServiceUsageById(
        req.params.id,
        userRole,
        userId
    );

    return new SuccessResponse(
        result,
        'Visit service retrieved successfully'
    ).send(res);
};

/**
 * GET /api/v1/service-usages
 * List all visit services with filters
 */
export const listServiceUsages = async (
    req: Request<{}, {}, {}, ServiceUsageQueryDataDto>,
    res: Response
): Promise<Response> => {
    const user = req.user;
    const userRole = user?.role || 'patient';
    const userId = user?.id;

    const result = await visitServiceService.listServiceUsages(
        req.query,
        userRole,
        userId
    );

    return new SuccessResponse(
        result.data,
        'Visit services retrieved successfully',
        result.metadata
    ).send(res);
};

/**
 * PATCH /api/v1/service-usages/:id
 * Update a visit service
 */
export const updateServiceUsage = async (
    req: Request<ServiceUsageParamsDataDto, {}, UpdateServiceUsageDataDto>,
    res: Response
): Promise<Response> => {
    const result = await visitServiceService.updateServiceUsage(
        req.params.id,
        req.body
    );

    return new SuccessResponse(
        result,
        'Visit service updated successfully'
    ).send(res);
};

/**
 * DELETE /api/v1/service-usages/:id
 * Delete a visit service
 */
export const deleteServiceUsage = async (
    req: Request<ServiceUsageParamsDataDto>,
    res: Response
): Promise<Response> => {
    const result = await visitServiceService.deleteServiceUsage(req.params.id);

    return new SuccessResponse(
        result,
        'Visit service deleted successfully'
    ).send(res);
};

/**
 * GET /api/v1/visits/:id/service-usages
 * Get visit service history
 */
export const getVisitHistory = async (
    req: Request<
        VisitServiceHistoryParamsDataDto,
        {},
        {},
        ServiceUsageQueryDataDto
    >,
    res: Response
): Promise<Response> => {
    const user = req.user!;
    const userRole = user.role;
    const userId = user.id;

    const result = await visitServiceService.getVisitHistory(
        req.params.id,
        req.query,
        userRole,
        userId
    );

    return new SuccessResponse(
        {
            items: result.items,
            pagination: result.pagination,
            summary: result.summary,
        },
        'Visit service history retrieved successfully'
    ).send(res);
};

/**
 * POST /api/v1/service-usages/bulk
 * Bulk create visit services
 */
export const bulkCreateServiceUsages = async (
    req: Request<{}, {}, BulkCreateServiceUsageDataDto>,
    res: Response
): Promise<Response> => {
    const user = req.user!;

    // Auto-set orderedByUserId for all service usages
    const data = {
        ...req.body,
        items: req.body.items.map((su) => ({
            ...su,
            orderedByUserId: user.id,
        })),
    };

    const result = await visitServiceService.bulkCreateServiceUsages(data);

    res.status(201);
    return new SuccessResponse(result, result.message).send(res);
};
