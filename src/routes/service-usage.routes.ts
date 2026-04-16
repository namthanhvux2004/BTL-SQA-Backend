import { Router } from 'express';
import * as serviceUsageController from '@src/controllers/service-usage.controller';
import asyncHandler from '@src/helpers/asyncHandler';
import { validateDto } from '@src/middleware/validatation.middleware';
import { authenticateToken, checkRole } from '@src/middleware/auth.middleware';
import {
    CreateServiceUsageDto,
    UpdateServiceUsageDto,
    ServiceUsageQueryDto,
    ServiceUsageParamsDto,
    BulkCreateServiceUsageDto,
} from '@src/dtos/visit-service.dto';

const router = Router();

/**
 * @swagger
 * /api/v1/service-usages/bulk:
 *   post:
 *     summary: Bulk create service usages
 *     description: Create multiple service usages in a single transaction. Validates all items before creation. Only doctors and admins can use this endpoint. Maximum 20 items per request. Returns details about successfully created items and any validation failures.
 *     tags:
 *       - Service Usages
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - items
 *             properties:
 *               items:
 *                 type: array
 *                 minItems: 1
 *                 maxItems: 20
 *                 description: Array of service usages to create (1-20 items)
 *                 items:
 *                   type: object
 *                   required:
 *                     - patientId
 *                     - medicalServiceId
 *                     - quantity
 *                     - price
 *                   properties:
 *                     patientId:
 *                       type: string
 *                       format: uuid
 *                       description: ID of the patient
 *                     medicalServiceId:
 *                       type: string
 *                       format: uuid
 *                       description: ID of the medical service
 *                     quantity:
 *                       type: number
 *                       minimum: 1
 *                       default: 1
 *                       description: Quantity of the service
 *                     price:
 *                       type: number
 *                       minimum: 0
 *                       description: Price of the service
 *                     note:
 *                       type: string
 *                       maxLength: 500
 *                       description: Optional note
 *                     invoiceId:
 *                       type: string
 *                       format: uuid
 *                       description: Optional invoice ID to link
 *           examples:
 *             bulkCreate:
 *               summary: Create multiple service usages
 *               value:
 *                 items:
 *                   - patientId: "123e4567-e89b-12d3-a456-426614174000"
 *                     medicalServiceId: "223e4567-e89b-12d3-a456-426614174000"
 *                     quantity: 1
 *                     price: 150000
 *                     note: "Khám tổng quát"
 *                   - patientId: "123e4567-e89b-12d3-a456-426614174000"
 *                     medicalServiceId: "323e4567-e89b-12d3-a456-426614174000"
 *                     quantity: 2
 *                     price: 200000
 *                     note: "Xét nghiệm máu"
 *                   - patientId: "123e4567-e89b-12d3-a456-426614174000"
 *                     medicalServiceId: "423e4567-e89b-12d3-a456-426614174000"
 *                     quantity: 1
 *                     price: 500000
 *                     note: "Chụp X-quang"
 *     responses:
 *       201:
 *         description: Service usages created successfully (partial or full success)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Successfully created 3 service usage(s)."
 *                 code:
 *                   type: string
 *                   example: "10000"
 *                 data:
 *                   type: object
 *                   properties:
 *                     created:
 *                       type: array
 *                       description: Successfully created service usages
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             format: uuid
 *                           patientId:
 *                             type: string
 *                             format: uuid
 *                           medicalServiceId:
 *                             type: string
 *                             format: uuid
 *                           quantity:
 *                             type: number
 *                           price:
 *                             type: number
 *                           status:
 *                             type: string
 *                             example: "pending"
 *                           note:
 *                             type: string
 *                           invoiceId:
 *                             type: string
 *                             format: uuid
 *                             nullable: true
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                           updatedAt:
 *                             type: string
 *                             format: date-time
 *                     createdCount:
 *                       type: integer
 *                       example: 3
 *                       description: Number of successfully created items
 *                     failedCount:
 *                       type: integer
 *                       example: 0
 *                       description: Number of items that failed validation
 *                     failed:
 *                       type: array
 *                       description: Items that failed validation
 *                       items:
 *                         type: object
 *                         properties:
 *                           index:
 *                             type: integer
 *                             description: Index of the failed item in the original array
 *                           item:
 *                             type: object
 *                             description: The item that failed
 *                           error:
 *                             type: string
 *                             description: Validation error message
 *                     message:
 *                       type: string
 *                       example: "Successfully created all 3 service usage(s)."
 *       400:
 *         description: Bad request - All items failed validation or invalid request format
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Only doctors and admins can bulk create
 */
router.post(
    '/bulk',
    validateDto(BulkCreateServiceUsageDto, 'body'),
    authenticateToken(),
    checkRole(['doctor', 'admin']),
    asyncHandler(serviceUsageController.bulkCreateServiceUsages as any)
);

/**
 * @swagger
 * /api/v1/service-usages:
 *   post:
 *     summary: Create a new service usage
 *     description: Create a service usage record for a patient. Doctors and admins can create for any patient, patients can create for themselves. Validates patient, medical service, and optional invoice.
 *     tags:
 *       - Service Usages
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - patientId
 *               - medicalServiceId
 *               - quantity
 *               - price
 *             properties:
 *               patientId:
 *                 type: string
 *                 format: uuid
 *                 description: ID of the patient
 *                 example: "123e4567-e89b-12d3-a456-426614174000"
 *               medicalServiceId:
 *                 type: string
 *                 format: uuid
 *                 description: ID of the medical service
 *                 example: "223e4567-e89b-12d3-a456-426614174000"
 *               quantity:
 *                 type: number
 *                 minimum: 1
 *                 default: 1
 *                 description: Quantity of the service
 *                 example: 2
 *               price:
 *                 type: number
 *                 minimum: 0
 *                 description: Price of the service
 *                 example: 150000
 *               note:
 *                 type: string
 *                 maxLength: 500
 *                 description: Optional note about the service usage
 *                 example: "Khám tổng quát định kỳ"
 *               invoiceId:
 *                 type: string
 *                 format: uuid
 *                 description: Optional invoice ID to link this service usage
 *                 example: "323e4567-e89b-12d3-a456-426614174000"
 *     responses:
 *       201:
 *         description: Service usage created successfully
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: "Service usage created successfully"
 *               code: "10000"
 *               data:
 *                 id: "423e4567-e89b-12d3-a456-426614174000"
 *                 patientId: "123e4567-e89b-12d3-a456-426614174000"
 *                 medicalServiceId: "223e4567-e89b-12d3-a456-426614174000"
 *                 quantity: 2
 *                 price: 150000
 *                 note: "Khám tổng quát định kỳ"
 *                 invoiceId: "323e4567-e89b-12d3-a456-426614174000"
 *                 status: "pending"
 *                 createdAt: "2025-12-01T10:30:00Z"
 *                 updatedAt: "2025-12-01T10:30:00Z"
 *       400:
 *         description: Bad request - Validation failed
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Insufficient permissions
 *       404:
 *         description: Patient or medical service not found
 */
router.post(
    '/',
    validateDto(CreateServiceUsageDto, 'body'),
    authenticateToken(),
    checkRole(['doctor', 'admin', 'patient']),
    asyncHandler(serviceUsageController.createServiceUsage as any)
);

/**
 * @swagger
 * /api/v1/service-usages:
 *   get:
 *     summary: List all service usages with filters
 *     description: Get list of service usages with filters and pagination. Patients can only see their own, doctors/admins/accountants can see all.
 *     tags:
 *       - Service Usages
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: patientId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by patient ID
 *       - in: query
 *         name: medicalServiceId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by medical service ID
 *       - in: query
 *         name: invoiceId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by invoice ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, completed, cancelled_by_patient, cancelled_by_system]
 *         description: Filter by service usage status
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter by start date (ISO 8601 format)
 *         example: "2025-11-01T00:00:00Z"
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter by end date (ISO 8601 format)
 *         example: "2025-12-01T23:59:59Z"
 *       - in: query
 *         name: page
 *         schema:
 *           type: string
 *           default: "1"
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: string
 *           default: "20"
 *         description: Number of items per page (max 100)
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [createdAt, updatedAt, price]
 *           default: createdAt
 *         description: Sort by field
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
 *     responses:
 *       200:
 *         description: Service usages retrieved successfully
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: "Service usages retrieved successfully"
 *               code: "10000"
 *               data:
 *                 items:
 *                   - id: "423e4567-e89b-12d3-a456-426614174000"
 *                     patient:
 *                       id: "123e4567-e89b-12d3-a456-426614174000"
 *                       user:
 *                         name:
 *                           firstName: "Nguyễn"
 *                           lastName: "Văn A"
 *                         phone: "0123456789"
 *                     medicalService:
 *                       id: "223e4567-e89b-12d3-a456-426614174000"
 *                       name: "Khám tổng quát"
 *                       price: 150000
 *                     quantity: 2
 *                     price: 150000
 *                     note: "Khám tổng quát định kỳ"
 *                     invoice:
 *                       id: "323e4567-e89b-12d3-a456-426614174000"
 *                       status: "pending"
 *                     status: "pending"
 *                     createdAt: "2025-12-01T10:30:00Z"
 *                 pagination:
 *                   page: 1
 *                   limit: 20
 *                   total: 45
 *                   totalPages: 3
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Insufficient permissions
 */
router.get(
    '/',
    validateDto(ServiceUsageQueryDto, 'query'),
    authenticateToken(),
    checkRole(['doctor', 'admin', 'accountant']),
    asyncHandler(serviceUsageController.listServiceUsages as any)
);

/**
 * @swagger
 * /api/v1/service-usages/{id}:
 *   get:
 *     summary: Get service usage by ID
 *     description: Get detailed information about a specific service usage. Patients can only see their own service usages.
 *     tags:
 *       - Service Usages
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Service usage ID
 *         example: "423e4567-e89b-12d3-a456-426614174000"
 *     responses:
 *       200:
 *         description: Service usage retrieved successfully
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: "Service usage retrieved successfully"
 *               code: "10000"
 *               data:
 *                 id: "423e4567-e89b-12d3-a456-426614174000"
 *                 patientId: "123e4567-e89b-12d3-a456-426614174000"
 *                 patient:
 *                   userId: "user-001"
 *                   user:
 *                     name:
 *                       firstName: "Nguyễn"
 *                       lastName: "Văn A"
 *                     phone: "0123456789"
 *                     email: "nguyenvana@example.com"
 *                 medicalServiceId: "223e4567-e89b-12d3-a456-426614174000"
 *                 medicalService:
 *                   id: "223e4567-e89b-12d3-a456-426614174000"
 *                   name: "Khám tổng quát"
 *                   price: 150000
 *                   description: "Khám sức khỏe tổng quát"
 *                 quantity: 2
 *                 price: 150000
 *                 note: "Khám tổng quát định kỳ"
 *                 invoiceId: "323e4567-e89b-12d3-a456-426614174000"
 *                 invoice:
 *                   id: "323e4567-e89b-12d3-a456-426614174000"
 *                   totalAmount: 300000
 *                   status: "pending"
 *                   createdAt: "2025-12-01T10:00:00Z"
 *                 status: "pending"
 *                 createdAt: "2025-12-01T10:30:00Z"
 *                 updatedAt: "2025-12-01T10:30:00Z"
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Insufficient permissions
 *       404:
 *         description: Service usage not found
 */
router.get(
    '/:id',
    validateDto(ServiceUsageParamsDto, 'params'),
    authenticateToken(),
    asyncHandler(serviceUsageController.getServiceUsageById as any)
);

/**
 * @swagger
 * /api/v1/service-usages/{id}:
 *   put:
 *     summary: Update a service usage
 *     description: Update service usage details (quantity, price, note). Can only update if no invoice is linked OR the linked invoice is pending. Requires doctor or admin role.
 *     tags:
 *       - Service Usages
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Service usage ID
 *         example: "423e4567-e89b-12d3-a456-426614174000"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               quantity:
 *                 type: number
 *                 minimum: 1
 *                 description: Updated quantity
 *                 example: 3
 *               price:
 *                 type: number
 *                 minimum: 0
 *                 description: Updated price
 *                 example: 200000
 *               note:
 *                 type: string
 *                 maxLength: 500
 *                 nullable: true
 *                 description: Updated note
 *                 example: "Khám tổng quát định kỳ - Bổ sung xét nghiệm máu"
 *     responses:
 *       200:
 *         description: Service usage updated successfully
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: "Service usage updated successfully"
 *               code: "10000"
 *               data:
 *                 id: "423e4567-e89b-12d3-a456-426614174000"
 *                 patientId: "123e4567-e89b-12d3-a456-426614174000"
 *                 medicalServiceId: "223e4567-e89b-12d3-a456-426614174000"
 *                 quantity: 3
 *                 price: 200000
 *                 note: "Khám tổng quát định kỳ - Bổ sung xét nghiệm máu"
 *                 status: "pending"
 *                 updatedAt: "2025-12-01T11:00:00Z"
 *       400:
 *         description: Bad request - Validation failed or linked to non-pending invoice
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Insufficient permissions
 *       404:
 *         description: Service usage not found
 */
router.put(
    '/:id',
    validateDto(ServiceUsageParamsDto, 'params'),
    validateDto(UpdateServiceUsageDto, 'body'),
    authenticateToken(),
    checkRole(['doctor', 'admin']),
    asyncHandler(serviceUsageController.updateServiceUsage as any)
);

/**
 * @swagger
 * /api/v1/service-usages/{id}:
 *   delete:
 *     summary: Delete a service usage
 *     description: Delete a service usage record (hard delete). Can only delete pending or cancelled services, and cannot delete if linked to a paid invoice. Requires doctor or admin role.
 *     tags:
 *       - Service Usages
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Service usage ID
 *         example: "423e4567-e89b-12d3-a456-426614174000"
 *     responses:
 *       204:
 *         description: Service usage deleted successfully (no content)
 *       400:
 *         description: Bad request - Cannot delete completed service or linked to paid invoice
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Insufficient permissions
 *       404:
 *         description: Service usage not found
 */
router.delete(
    '/:id',
    validateDto(ServiceUsageParamsDto, 'params'),
    authenticateToken(),
    checkRole(['doctor', 'admin']),
    asyncHandler(serviceUsageController.deleteServiceUsage as any)
);

export default router;
