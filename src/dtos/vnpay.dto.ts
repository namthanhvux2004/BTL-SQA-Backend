import { z } from 'zod';
import { PaymentStatus } from '@prisma/client';

/**
 * DTO for creating VNPay payment URL
 * POST /api/v1/vnpay/create-payment-url
 */
export const CreateVNPayPaymentUrlBodyDto = z.object({
    invoiceId: z
        .string()
        .uuid({ message: 'Invalid invoice ID format' })
        .describe('Invoice ID to create payment for'),
    bankCode: z
        .string()
        .optional()
        .describe(
            'Bank code for direct payment (optional, e.g., NCB, VIETCOMBANK, VNPAYQR)'
        ),
    language: z
        .enum(['vn', 'en'])
        .optional()
        .default('vn')
        .describe('Payment page language'),
    returnUrl: z.url().optional().describe('Return URL after payment'),
});

export type CreateVNPayPaymentUrlBodyDataDto = z.infer<
    typeof CreateVNPayPaymentUrlBodyDto
>;

/**
 * Response for create payment URL
 */
export interface CreateVNPayPaymentUrlResponse {
    paymentUrl: string;
    txnRef: string;
}

/**
 * DTO for VNPay return callback (user redirected back from VNPay)
 * GET /api/v1/vnpay/return
 */
export const VNPayReturnQueryDto = z.object({
    vnp_TmnCode: z.string().describe('Terminal code'),
    vnp_Amount: z.string().describe('Payment amount (x100)'),
    vnp_BankCode: z.string().optional().describe('Bank code used'),
    vnp_BankTranNo: z.string().optional().describe('Bank transaction number'),
    vnp_CardType: z.string().optional().describe('Card type'),
    vnp_PayDate: z.string().describe('Payment date (yyyyMMddHHmmss)'),
    vnp_OrderInfo: z.string().describe('Order description'),
    vnp_TransactionNo: z.string().describe('VNPay transaction number'),
    vnp_ResponseCode: z.string().describe('Response code (00 = success)'),
    vnp_TransactionStatus: z.string().describe('Transaction status'),
    vnp_TxnRef: z.string().describe('Transaction reference from merchant'),
    vnp_SecureHashType: z
        .string()
        .optional()
        .describe('Hash type (SHA256/SHA512)'),
    vnp_SecureHash: z.string().describe('Secure hash for verification'),
});

export type VNPayReturnQueryDataDto = z.infer<typeof VNPayReturnQueryDto>;

/**
 * Response for VNPay return
 */
export interface VNPayReturnResponse {
    success: boolean;
    message: string;
    responseCode: string;
    status?: PaymentStatus;
    transactionNo?: string;
    amount?: number;
    bankCode?: string;
    payDate?: string;
    metadata?: Record<string, any>;
}

/**
 * DTO for VNPay IPN (Instant Payment Notification) webhook
 * GET /api/v1/vnpay/ipn
 *
 * This is similar to return but used for backend-to-backend communication
 */
export const VNPayIPNQueryDto = z.object({
    vnp_TmnCode: z.string().describe('Terminal code'),
    vnp_Amount: z.string().describe('Payment amount (x100)'),
    vnp_BankCode: z.string().optional().describe('Bank code used'),
    vnp_BankTranNo: z.string().optional().describe('Bank transaction number'),
    vnp_CardType: z.string().optional().describe('Card type'),
    vnp_PayDate: z.string().describe('Payment date (yyyyMMddHHmmss)'),
    vnp_OrderInfo: z.string().describe('Order description'),
    vnp_TransactionNo: z.string().describe('VNPay transaction number'),
    vnp_ResponseCode: z.string().describe('Response code (00 = success)'),
    vnp_TransactionStatus: z.string().describe('Transaction status'),
    vnp_TxnRef: z.string().describe('Transaction reference from merchant'),
    vnp_SecureHashType: z.string().optional().describe('Hash type'),
    vnp_SecureHash: z.string().describe('Secure hash for verification'),
});

export type VNPayIPNQueryDataDto = z.infer<typeof VNPayIPNQueryDto>;

/**
 * Response for VNPay IPN
 * */
export interface VNPayIPNResponse {
    RspCode: string; // '00' = success, '97' = invalid signature, '99' = error
    Message: string;
}

/**
 * VNPay request parameters (for creating payment URL)
 */
export interface VNPayRequestParams {
    vnp_Version: string; // Default: '2.1.0'
    vnp_Command: string; // Default: 'pay'
    vnp_TmnCode: string; // Terminal code from config
    vnp_Amount: number; // Amount * 100 (no decimal)
    vnp_CreateDate: string; // yyyyMMddHHmmss
    vnp_CurrCode: string; // Default: 'VND'
    vnp_IpAddr: string; // Customer IP address
    vnp_Locale: string; // 'vn' or 'en'
    vnp_OrderInfo: string; // Order description
    vnp_OrderType: string; // Default: 'other' (or 'billpayment')
    vnp_ReturnUrl: string; // Return URL after payment
    vnp_TxnRef: string; // Unique transaction reference
    vnp_BankCode?: string; // Optional bank code
    vnp_SecureHash?: string; // Calculated hash
}

/**
 * Bank codes supported by VNPay
 */
export const VNPayBankCodes = {
    VNPAYQR: 'VNPAYQR',
    VNBANK: 'VNBANK',
    INTCARD: 'INTCARD',
    NCB: 'NCB',
    VIETCOMBANK: 'VIETCOMBANK',
    VIETINBANK: 'VIETINBANK',
    BIDV: 'BIDV',
    AGRIBANK: 'AGRIBANK',
    SACOMBANK: 'SACOMBANK',
    TECHCOMBANK: 'TECHCOMBANK',
    ACB: 'ACB',
    MB: 'MB',
    VIB: 'VIB',
    EXIMBANK: 'EXIMBANK',
    MSBANK: 'MSBANK',
    NAMABANK: 'NAMABANK',
    VNMART: 'VNMART',
    VIETCAPITALBANK: 'VIETCAPITALBANK',
    SCB: 'SCB',
    HDBANK: 'HDBANK',
    TPBANK: 'TPBANK',
    SHB: 'SHB',
} as const;

export type VNPayBankCode =
    (typeof VNPayBankCodes)[keyof typeof VNPayBankCodes];

/**
 * DTO for creating VNPay QR code payment
 * POST /api/v1/vnpay/create-qr-payment
 */
export const CreateVNPayQRPaymentBodyDto = z.object({
    invoiceId: z
        .string()
        .uuid({ message: 'Invalid invoice ID format' })
        .describe('Invoice ID to create QR payment for'),
    language: z
        .enum(['vn', 'en'])
        .optional()
        .default('vn')
        .describe('Payment page language'),
});

export type CreateVNPayQRPaymentBodyDataDto = z.infer<
    typeof CreateVNPayQRPaymentBodyDto
>;

/**
 * Response for create QR payment
 * Contains QR code as base64 data URL for easy display in frontend
 */
export interface CreateVNPayQRPaymentResponse {
    qrCodeDataURL: string; // Base64 data URL (data:image/png;base64,...)
    paymentUrl: string; // Original payment URL (for fallback)
    txnRef: string; // Transaction reference
    amount: number; // Payment amount in VND
    invoiceId: string; // Invoice ID
    expiresAt: string; // QR code expiration time (ISO 8601)
}
