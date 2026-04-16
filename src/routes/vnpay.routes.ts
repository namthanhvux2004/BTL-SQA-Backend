import { Router } from 'express';
import { vnpayController } from '@src/controllers/vnpay.controller';
import asyncHandler from '@src/helpers/asyncHandler';
import { validateDto } from '@src/middleware/validatation.middleware';
import { authenticateToken, checkRole } from '@src/middleware/auth.middleware';
import {
    CreateVNPayPaymentUrlBodyDto,
    CreateVNPayQRPaymentBodyDto,
    VNPayReturnQueryDto,
    VNPayIPNQueryDto,
} from '@src/dtos/vnpay.dto';

const router = Router();

/**
 * @swagger
 * /api/v1/vnpay/create-payment-url:
 *   post:
 *     summary: Create VNPay payment URL
 *     description: Create a payment URL for VNPay payment gateway. Requires authentication with accountant or admin role.
 *     tags:
 *       - VNPay
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
 *                 description: Invoice ID to create payment for
 *               bankCode:
 *                 type: string
 *                 description: Bank code for direct payment (optional)
 *                 enum: [VNPAYQR, NCB, VIETCOMBANK, VIETINBANK, BIDV, AGRIBANK, TECHCOMBANK, ACB, MB, VIB]
 *               language:
 *                 type: string
 *                 enum: [vn, en]
 *                 default: vn
 *                 description: Payment page language
 *           example:
 *             invoiceId: "123e4567-e89b-12d3-a456-426614174000"
 *             bankCode: "VNPAYQR"
 *             language: "vn"
 *     responses:
 *       200:
 *         description: Payment URL created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 code:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     paymentUrl:
 *                       type: string
 *                       description: VNPay payment URL to redirect user
 *                     txnRef:
 *                       type: string
 *                       description: Transaction reference number
 *                     amount:
 *                       type: number
 *                       description: Payment amount in VND
 *                     invoiceId:
 *                       type: string
 *                       description: Invoice ID
 *             example:
 *               success: true
 *               message: "Payment URL created successfully"
 *               code: "10000"
 *               data:
 *                 paymentUrl: "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?vnp_Amount=50000000&..."
 *                 txnRef: "1732512000123456"
 *                 amount: 500000
 *                 invoiceId: "123e4567-e89b-12d3-a456-426614174000"
 *       400:
 *         description: Bad request - Invalid invoice, already paid, or amount is 0
 *       404:
 *         description: Invoice not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Insufficient permissions
 */
router.post(
    '/create-payment-url',
    validateDto(CreateVNPayPaymentUrlBodyDto, 'body'),
    authenticateToken(),
    checkRole(['accountant', 'admin']),
    asyncHandler(vnpayController.createPaymentUrl.bind(vnpayController))
);

/**
 * @swagger
 * /api/v1/vnpay/return:
 *   get:
 *     summary: VNPay return callback
 *     description: Handle VNPay return callback when user is redirected back from VNPay payment page. This endpoint verifies the payment and returns the result.
 *     tags:
 *       - VNPay
 *     parameters:
 *       - in: query
 *         name: vnp_TmnCode
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: vnp_Amount
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: vnp_BankCode
 *         schema:
 *           type: string
 *       - in: query
 *         name: vnp_BankTranNo
 *         schema:
 *           type: string
 *       - in: query
 *         name: vnp_CardType
 *         schema:
 *           type: string
 *       - in: query
 *         name: vnp_PayDate
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: vnp_OrderInfo
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: vnp_TransactionNo
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: vnp_ResponseCode
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: vnp_TransactionStatus
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: vnp_TxnRef
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: vnp_SecureHashType
 *         schema:
 *           type: string
 *       - in: query
 *         name: vnp_SecureHash
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Payment result
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: "Giao dịch thành công"
 *               code: "10000"
 *               data:
 *                 success: true
 *                 message: "Giao dịch thành công"
 *                 responseCode: "00"
 *                 transactionNo: "14123456"
 *                 amount: 500000
 *                 bankCode: "NCB"
 *                 payDate: "20251125103000"
 */
router.get(
    '/return',
    validateDto(VNPayReturnQueryDto, 'query'),
    asyncHandler(vnpayController.handleReturn.bind(vnpayController) as any)
);

/**
 * @swagger
 * /api/v1/vnpay/ipn:
 *   get:
 *     summary: VNPay IPN webhook
 *     description: Handle VNPay IPN (Instant Payment Notification) webhook. This endpoint is called by VNPay server to confirm payment. It verifies the secure hash, maps VNPay response codes to local PaymentStatus, creates or updates a Payment record with message and metadata, and updates the invoice status when appropriate.
 *     tags:
 *       - VNPay
 *     parameters:
 *       - in: query
 *         name: vnp_TmnCode
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: vnp_Amount
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: vnp_BankCode
 *         schema:
 *           type: string
 *       - in: query
 *         name: vnp_BankTranNo
 *         schema:
 *           type: string
 *       - in: query
 *         name: vnp_CardType
 *         schema:
 *           type: string
 *       - in: query
 *         name: vnp_PayDate
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: vnp_OrderInfo
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: vnp_TransactionNo
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: vnp_ResponseCode
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: vnp_TransactionStatus
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: vnp_TxnRef
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: vnp_SecureHashType
 *         schema:
 *           type: string
 *       - in: query
 *         name: vnp_SecureHash
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: IPN response
 *         content:
 *           application/json:
 *             example:
 *               RspCode: "00"
 *               Message: "Confirm Success"
 */
router.get(
    '/ipn',
    validateDto(VNPayIPNQueryDto, 'query'),
    asyncHandler(vnpayController.handleIPN.bind(vnpayController) as any)
);

/**
 * @swagger
 * /api/v1/vnpay/create-qr-payment:
 *   post:
 *     summary: Create VNPay QR code payment
 *     description: Create a QR code for VNPay payment. Returns QR code as base64 data URL that can be displayed directly in frontend. User can scan the QR code with VNPay or banking app to complete payment. Requires authentication with accountant or admin role.
 *     tags:
 *       - VNPay
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
 *                 description: Invoice ID to create QR payment for
 *               language:
 *                 type: string
 *                 enum: [vn, en]
 *                 default: vn
 *                 description: Payment page language (used when user clicks fallback URL)
 *           example:
 *             invoiceId: "123e4567-e89b-12d3-a456-426614174000"
 *             language: "vn"
 *     responses:
 *       200:
 *         description: QR code payment created successfully
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: "QR code payment created successfully"
 *               code: "10000"
 *               data:
 *                 qrCodeDataURL: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."
 *                 paymentUrl: "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?vnp_Amount=50000000&..."
 *                 txnRef: "1732512000123456"
 *                 amount: 500000
 *                 invoiceId: "123e4567-e89b-12d3-a456-426614174000"
 *                 expiresAt: "2025-11-25T10:30:00.000Z"
 *       400:
 *         description: Bad request - Invalid invoice, already paid, or amount is 0
 *       404:
 *         description: Invoice not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Insufficient permissions
 *       500:
 *         description: Failed to generate QR code
 */
router.post(
    '/create-qr-payment',
    validateDto(CreateVNPayQRPaymentBodyDto, 'body'),
    authenticateToken(),
    checkRole(['accountant', 'admin']),
    asyncHandler(vnpayController.createQRPayment.bind(vnpayController))
);

export default router;
