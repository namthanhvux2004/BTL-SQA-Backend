import { Router } from 'express';
import invoiceController from '@src/controllers/invoice.controller';
import asyncHandler from '@src/helpers/asyncHandler';
import { validateDto } from '@src/middleware/validatation.middleware';
import { authenticateToken, checkRole } from '@src/middleware/auth.middleware';
import {
    GetInvoicesQueryDto,
    GetInvoiceParamsDto,
    CreateInvoiceBodyDto,
    UpdateInvoiceParamsDto,
    UpdateInvoiceBodyDto,
} from '@src/dtos/invoice.dto';

const router = Router();

/**
 * @swagger
 * /api/v1/invoices:
 *   get:
 *     summary: Get list of invoices
 *     description: Retrieve invoices with filters, search, and pagination. Requires authentication with accountant or admin role.
 *     tags:
 *       - Invoices
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, paid, cancelled, needs_review]
 *         description: Filter by invoice status
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by patient name or invoice ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: string
 *           default: "1"
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: string
 *           default: "10"
 *         description: Number of items per page (max 100)
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [createdAt, updatedAt]
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
 *         description: Invoices retrieved successfully
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: "Invoices retrieved successfully"
 *               code: "10000"
 *               data:
 *                 data:
 *                   - id: "123e4567-e89b-12d3-a456-426614174000"
 *                     patientId: "123e4567-e89b-12d3-a456-426614174001"
 *                     status: "pending"
 *                     createdAt: "2025-11-25T10:00:00.000Z"
 *                     updatedAt: "2025-11-25T10:00:00.000Z"
 *                     patient:
 *                       userId: "123e4567-e89b-12d3-a456-426614174001"
 *                       fullName: "Nguyễn Văn A"
 *                     computedTotal:
 *                       total: 500000
 *                 pagination:
 *                   page: 1
 *                   limit: 10
 *                   total: 25
 *                   totalPages: 3
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Insufficient permissions
 */
router.get(
    '/',
    validateDto(GetInvoicesQueryDto, 'query'),
    authenticateToken(),
    checkRole(['accountant', 'admin']),
    asyncHandler(invoiceController.getInvoices as any)
);

/**
 * @swagger
 * /api/v1/invoices:
 *   post:
 *     summary: Create a new invoice manually
 *     description: Create an invoice for a patient with optional service usages, prescriptions, and discount. Requires authentication with accountant or admin role. Financial data is automatically calculated.
 *     tags:
 *       - Invoices
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
 *             properties:
 *               patientId:
 *                 type: string
 *                 format: uuid
 *                 description: Patient ID for the invoice
 *                 example: "123e4567-e89b-12d3-a456-426614174001"
 *               serviceUsageIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *                 description: Optional array of service usage IDs to link
 *                 example: ["service-001", "service-002"]
 *               prescriptionIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *                 description: Optional array of prescription IDs to link
 *                 example: ["prescription-001"]
 *               discountAmount:
 *                 type: number
 *                 minimum: 0
 *                 default: 0
 *                 description: Discount amount to apply
 *                 example: 50000
 *               discountReason:
 *                 type: string
 *                 maxLength: 500
 *                 description: Reason for discount
 *                 example: "Elderly patient discount"
 *               issuedBy:
 *                 type: string
 *                 maxLength: 255
 *                 description: Name or ID of the staff issuing the invoice
 *                 example: "Dr. Nguyen Van B"
 *     responses:
 *       200:
 *         description: Invoice created successfully
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: "Invoice created successfully"
 *               code: "10000"
 *               data:
 *                 id: "123e4567-e89b-12d3-a456-426614174000"
 *                 patientId: "123e4567-e89b-12d3-a456-426614174001"
 *                 status: "pending"
 *                 subtotal: 500000
 *                 discountAmount: 50000
 *                 discountReason: "Elderly patient discount"
 *                 insuranceCoveragePercent: 80
 *                 insuranceAmount: 360000
 *                 totalAmount: 90000
 *                 issuedBy: "123e4567-e89b-12d3-a456-426614174001"
 *                 createdAt: "2025-11-26T10:00:00.000Z"
 *                 updatedAt: "2025-11-26T10:00:00.000Z"
 *       400:
 *         description: Bad request - Invalid input data
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Insufficient permissions
 *       404:
 *         description: Patient not found
 */
router.post(
    '/',
    validateDto(CreateInvoiceBodyDto, 'body'),
    authenticateToken(),
    checkRole(['accountant', 'admin']),
    asyncHandler(invoiceController.createInvoice.bind(invoiceController) as any)
);

/**
 * @swagger
 * /api/v1/invoices/{id}:
 *   get:
 *     summary: Get invoice detail by ID
 *     description: Retrieve detailed invoice information including services, medicines, and computed total with insurance discount.
 *     tags:
 *       - Invoices
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Invoice ID
 *     responses:
 *       200:
 *         description: Invoice retrieved successfully
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: "Invoice retrieved successfully"
 *               code: "10000"
 *               data:
 *                 id: "123e4567-e89b-12d3-a456-426614174000"
 *                 patientId: "123e4567-e89b-12d3-a456-426614174001"
 *                 status: "pending"
 *                 createdAt: "2025-11-25T10:00:00.000Z"
 *                 updatedAt: "2025-11-25T10:00:00.000Z"
 *                 patient:
 *                   userId: "123e4567-e89b-12d3-a456-426614174001"
 *                   fullName: "Nguyễn Văn A"
 *                   email: "nguyenvana@example.com"
 *                   phone: "0123456789"
 *                 serviceUsages:
 *                   - id: "service-001"
 *                     medicalServiceId: "service-type-001"
 *                     quantity: 1
 *                     price: 200000
 *                     status: "pending"
 *                     medicalService:
 *                       id: "service-type-001"
 *                       name: "Khám tổng quát"
 *                       percentApplyHealthInsurance: 80
 *                 prescriptions:
 *                   - id: "prescription-001"
 *                     paid: false
 *                     medicineUsage:
 *                       - id: "medicine-001"
 *                         medicineId: "med-001"
 *                         quantity: 10
 *                         price: 5000
 *                         isPurchased: true
 *                         medicine:
 *                           id: "med-001"
 *                           name: "Paracetamol"
 *                           unit: "viên"
 *                 payment: null
 *                 computedTotal:
 *                   subtotal: 250000
 *                   insuranceDiscount: 128000
 *                   total: 122000
 *                   breakdown:
 *                     servicesTotal: 200000
 *                     medicinesTotal: 50000
 *                     serviceCount: 1
 *                     medicineCount: 10
 *       404:
 *         description: Invoice not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Insufficient permissions
 */
router.get(
    '/:id',
    validateDto(GetInvoiceParamsDto, 'params'),
    authenticateToken(),
    checkRole(['accountant', 'admin', 'patient']),
    asyncHandler(
        invoiceController.getInvoiceById.bind(invoiceController) as any
    )
);

/**
 * @swagger
 * /api/v1/invoices/{id}:
 *   put:
 *     summary: Update an existing invoice
 *     description: |
 *       Update invoice by deleting all old items and adding new items from input data.
 *       Cannot update paid or cancelled invoices.
 *       Requires authentication with accountant or admin role.
 *     tags:
 *       - Invoices
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Invoice ID to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               patientId:
 *                 type: string
 *                 format: uuid
 *                 description: Patient ID (optional, usually not changed)
 *               serviceUsageIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *                 description: Array of service usage IDs to link to invoice
 *               prescriptionIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *                 description: Array of prescription IDs to link to invoice
 *               discountAmount:
 *                 type: number
 *                 minimum: 0
 *                 default: 0
 *                 description: Discount amount to apply
 *               discountReason:
 *                 type: string
 *                 maxLength: 500
 *                 description: Reason for discount
 *               issuedBy:
 *                 type: string
 *                 maxLength: 255
 *                 description: Name or ID of the staff issuing the invoice
 *               healthInsuranceId:
 *                 type: string
 *                 format: uuid
 *                 description: Health insurance ID to apply for coverage
 *               notes:
 *                 type: string
 *                 maxLength: 1000
 *                 description: Additional notes for the invoice
 *     responses:
 *       200:
 *         description: Invoice updated successfully
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: "Cập nhật hóa đơn thành công"
 *               code: "10000"
 *               data:
 *                 id: "123e4567-e89b-12d3-a456-426614174000"
 *                 patientId: "123e4567-e89b-12d3-a456-426614174001"
 *                 status: "pending"
 *                 subtotal: 500000
 *                 discountAmount: 50000
 *                 insuranceCoveragePercent: 80
 *                 insuranceAmount: 360000
 *                 totalAmount: 90000
 *                 createdAt: "2025-11-25T10:00:00.000Z"
 *                 updatedAt: "2025-11-25T11:30:00.000Z"
 *       400:
 *         description: Bad request - Cannot update paid or cancelled invoice
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Insufficient permissions
 *       404:
 *         description: Invoice not found
 */
router.put(
    '/:id',
    validateDto(UpdateInvoiceParamsDto, 'params'),
    validateDto(UpdateInvoiceBodyDto, 'body'),
    authenticateToken(),
    checkRole(['accountant', 'admin']),
    asyncHandler(invoiceController.updateInvoice.bind(invoiceController) as any)
);

router.get(
    '/unpaid-services/:patientId',
    authenticateToken(),
    checkRole(['admin']),
    asyncHandler(
        invoiceController.getUnpaidServices.bind(invoiceController) as any
    )
);

export default router;
