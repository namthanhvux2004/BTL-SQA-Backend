import { Router } from 'express';
import { paymentController } from '@src/controllers/payment.controller';
import asyncHandler from '@src/helpers/asyncHandler';
import { validateDto } from '@src/middleware/validatation.middleware';
import { authenticateToken, checkRole } from '@src/middleware/auth.middleware';
import {
    CreatePaymentBodyDto,
    GetPaymentParamsDto,
    GetPaymentByInvoiceParamsDto,
} from '@src/dtos/payment.dto';

const router = Router();

/**
 * @swagger
 * /api/v1/payments:
 *   post:
 *     summary: Create a new payment
 *     description: Process payment for an invoice. Creates payment record and updates invoice status to 'paid' in a transaction. Payment amount is automatically calculated from the invoice total.
 *     tags:
 *       - Payments
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - invoiceId
 *             properties:
 *               invoiceId:
 *                 type: string
 *                 format: uuid
 *                 description: ID of the invoice to pay
 *               userName:
 *                 type: string
 *                 maxLength: 255
 *                 description: Name of the person making the payment (optional)
 *               paymentMethod:
 *                 type: string
 *                 enum: [cash_on_delivery, credit_card, bank_transfer]
 *                 default: cash_on_delivery
 *                 description: Payment method
 *               message:
 *                 type: string
 *                 description: Optional message for this payment (internal use)
 *               metadata:
 *                 type: object
 *                 additionalProperties: true
 *                 description: Optional metadata object (internal or gateway)
 *           example:
 *             invoiceId: "123e4567-e89b-12d3-a456-426614174000"
 *             userName: "Nguyễn Văn A"
 *             paymentMethod: "cash_on_delivery"
 *             message: "Payment via hospital counter"
 *     responses:
 *       200:
 *         description: Payment processed successfully
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
 *                   example: "Payment processed successfully"
 *                 code:
 *                   type: string
 *                   example: "10000"
 *                 data:
 *                   type: object
 *                   properties:
 *                     paymentId:
 *                       type: string
 *                       example: "payment-001"
 *                     invoiceId:
 *                       type: string
 *                       format: uuid
 *                       example: "123e4567-e89b-12d3-a456-426614174000"
 *                     amount:
 *                       type: number
 *                       example: 100000
 *                     paymentMethod:
 *                       type: string
 *                       enum: [cash_on_delivery, credit_card, bank_transfer]
 *                       example: "cash_on_delivery"
 *                     status:
 *                       type: string
 *                       enum: [pending, completed, failed, refunded]
 *                       example: "completed"
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                       example: "2025-11-25T10:00:00.000Z"
 *                     message:
 *                       type: string
 *                       nullable: true
 *                       example: null
 *                     metadata:
 *                       type: object
 *                       nullable: true
 *                       example: null
 *                     invoiceBreakdown:
 *                       type: object
 *                       properties:
 *                         subtotal:
 *                           type: number
 *                           example: 150000
 *                         discountAmount:
 *                           type: number
 *                           example: 10000
 *                         insuranceAmount:
 *                           type: number
 *                           example: 40000
 *                         totalAmount:
 *                           type: number
 *                           example: 100000
 *       400:
 *         description: Bad request - Invalid input data, invoice already paid, or invoice cancelled
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Insufficient permissions
 *       404:
 *         description: Invoice not found
 */
router.post(
    '/',
    validateDto(CreatePaymentBodyDto, 'body'),
    authenticateToken(),
    checkRole(['accountant', 'admin']),
    asyncHandler(paymentController.createPayment.bind(paymentController))
);

/**
 * @swagger
 * /api/v1/payments/url/{invoiceId}:
 *   get:
 *     summary: Get payment URL for an invoice
 *     description: Generate a payment URL (VNPay) for a specific invoice. The URL can be used to redirect users to the payment gateway.
 *     tags:
 *       - Payments
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: invoiceId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Invoice ID to generate payment URL for
 *       - in: query
 *         name: method
 *         required: true
 *         schema:
 *           type: string
 *           enum: [vnpay]
 *           default: vnpay
 *         description: Payment method/gateway to use
 *     responses:
 *       200:
 *         description: Payment URL generated successfully
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
 *                   example: "Get payment URL successfully"
 *                 code:
 *                   type: string
 *                   example: "10000"
 *                 data:
 *                   type: object
 *                   properties:
 *                     paymentUrl:
 *                       type: string
 *                       format: uri
 *                       example: "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?vnp_Amount=10000000&vnp_Command=pay&..."
 *                       description: VNPay payment URL to redirect user
 *                     invoiceId:
 *                       type: string
 *                       format: uuid
 *                       example: "123e4567-e89b-12d3-a456-426614174000"
 *                     amount:
 *                       type: number
 *                       example: 100000
 *                       description: Payment amount in VND
 *                     orderInfo:
 *                       type: string
 *                       example: "Thanh toan hoa don 123e4567"
 *                       description: Order description
 *       400:
 *         description: Bad request - Invalid invoice ID, invoice already paid, or invoice cancelled
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Invoice already paid or cancelled"
 *       404:
 *         description: Invoice not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Invoice not found"
 *       500:
 *         description: Method not supported or internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Method not supported"
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Insufficient permissions
 */
router.get(
    '/url/:invoiceId',
    authenticateToken(),
    checkRole(['admin', 'patient']),
    asyncHandler(
        paymentController.getLinkPaymentUrl.bind(paymentController) as any
    )
);

/**
 * @swagger
 * /api/v1/payments/{id}:
 *   get:
 *     summary: Get payment detail by ID
 *     description: Retrieve detailed payment information including invoice, patient data, and metadata.
 *     tags:
 *       - Payments
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Payment ID
 *     responses:
 *       200:
 *         description: Payment retrieved successfully
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
 *                   example: "Payment retrieved successfully"
 *                 code:
 *                   type: string
 *                   example: "10000"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                       example: "payment-001"
 *                     invoiceId:
 *                       type: string
 *                       format: uuid
 *                       example: "123e4567-e89b-12d3-a456-426614174000"
 *                     userName:
 *                       type: string
 *                       nullable: true
 *                       example: "Nguyễn Văn A"
 *                     paymentMethod:
 *                       type: string
 *                       enum: [cash_on_delivery, credit_card, bank_transfer]
 *                       example: "cash_on_delivery"
 *                     amount:
 *                       type: number
 *                       example: 100000
 *                     status:
 *                       type: string
 *                       enum: [pending, completed, failed, refunded]
 *                       example: "completed"
 *                     message:
 *                       type: string
 *                       nullable: true
 *                       example: "Payment via hospital counter"
 *                     metadata:
 *                       type: object
 *                       nullable: true
 *                       example: null
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                       example: "2025-11-25T10:00:00.000Z"
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *                       example: "2025-11-25T10:00:00.000Z"
 *                     invoice:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           format: uuid
 *                           example: "123e4567-e89b-12d3-a456-426614174000"
 *                         patientId:
 *                           type: string
 *                           format: uuid
 *                           example: "patient-001"
 *                         status:
 *                           type: string
 *                           enum: [pending, paid, cancelled]
 *                           example: "paid"
 *                         createdAt:
 *                           type: string
 *                           format: date-time
 *                           example: "2025-11-25T09:00:00.000Z"
 *                         patient:
 *                           type: object
 *                           properties:
 *                             userId:
 *                               type: string
 *                               format: uuid
 *                               example: "user-001"
 *                             fullName:
 *                               type: string
 *                               example: "Nguyễn Văn B"
 *                             email:
 *                               type: string
 *                               nullable: true
 *                               example: "patient@example.com"
 *       404:
 *         description: Payment not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Insufficient permissions
 */
router.get(
    '/:id',
    validateDto(GetPaymentParamsDto, 'params'),
    authenticateToken(),
    checkRole(['accountant', 'admin']),
    asyncHandler(
        paymentController.getPaymentById.bind(paymentController) as any
    )
);

/**
 * @swagger
 * /api/v1/payments/invoice/{invoiceId}:
 *   get:
 *     summary: Get payment by invoice ID
 *     description: Retrieve payment information for a specific invoice. Returns basic payment details without nested invoice data.
 *     tags:
 *       - Payments
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: invoiceId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Invoice ID
 *     responses:
 *       200:
 *         description: Payment retrieved successfully
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
 *                   example: "Payment retrieved successfully"
 *                 code:
 *                   type: string
 *                   example: "10000"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                       example: "payment-001"
 *                     invoiceId:
 *                       type: string
 *                       format: uuid
 *                       example: "123e4567-e89b-12d3-a456-426614174000"
 *                     userName:
 *                       type: string
 *                       nullable: true
 *                       example: "Nguyễn Văn A"
 *                     paymentMethod:
 *                       type: string
 *                       enum: [cash_on_delivery, credit_card, bank_transfer]
 *                       example: "cash_on_delivery"
 *                     amount:
 *                       type: number
 *                       example: 100000
 *                     status:
 *                       type: string
 *                       enum: [pending, completed, failed, refunded]
 *                       example: "completed"
 *                     message:
 *                       type: string
 *                       nullable: true
 *                       example: "Payment via hospital counter"
 *                     metadata:
 *                       type: object
 *                       nullable: true
 *                       example: null
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                       example: "2025-11-25T10:00:00.000Z"
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *                       example: "2025-11-25T10:00:00.000Z"
 *       404:
 *         description: Payment not found for this invoice
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Insufficient permissions
 */
router.get(
    '/invoice/:invoiceId',
    validateDto(GetPaymentByInvoiceParamsDto, 'params'),
    authenticateToken(),
    checkRole(['accountant', 'admin', 'patient']),
    asyncHandler(
        paymentController.getPaymentByInvoiceId.bind(paymentController) as any
    )
);

export default router;
