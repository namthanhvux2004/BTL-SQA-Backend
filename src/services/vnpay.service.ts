import { Request } from 'express';
import QRCode from 'qrcode';
import { invoiceDao } from '@src/daos/invoice.dao';
import { paymentDao } from '@src/daos/payment.dao';
import { CustomError, ErrorType } from '@src/core/Error';
import { calculateInvoiceTotal } from '@src/helpers/calculateInvoiceTotal';
import {
    verifySecureHash,
    formatVNPayDate,
    generateTxnRef,
    formatVNPayAmount,
    parseVNPayAmount,
    getVNPayResponseMessage,
    sortObject,
} from '@src/helpers/vnpay.helper';
import {
    VNPAY_TMN_CODE,
    VNPAY_HASH_SECRET,
    VNPAY_URL,
    VNPAY_RETURN_URL,
} from '@src/config/constants';
import {
    CreateVNPayPaymentUrlBodyDataDto,
    CreateVNPayPaymentUrlResponse,
    CreateVNPayQRPaymentBodyDataDto,
    CreateVNPayQRPaymentResponse,
    VNPayReturnQueryDataDto,
    VNPayReturnResponse,
    VNPayIPNQueryDataDto,
    VNPayIPNResponse,
} from '@src/dtos/vnpay.dto';
import prisma from '@src/config/prisma';
import { mapVNPayResult } from '@src/helpers/vnpay.helper';
import crypto from 'crypto';
import QueryString from 'qs';

/**
 * Service class for VNPay payment integration
 */
export class VNPayService {
    /**
     * Validate VNPay configuration
     * @throws CustomError if any VNPay config is missing
     */
    private validateVNPayConfig(): void {
        if (!VNPAY_TMN_CODE) {
            throw new CustomError(
                ErrorType.INTERNAL_ERROR,
                'VNPay configuration error: VNPAY_TMN_CODE is not set'
            );
        }
        if (!VNPAY_HASH_SECRET) {
            throw new CustomError(
                ErrorType.INTERNAL_ERROR,
                'VNPay configuration error: VNPAY_HASH_SECRET is not set. Please check your .env file.'
            );
        }
        if (!VNPAY_URL) {
            throw new CustomError(
                ErrorType.INTERNAL_ERROR,
                'VNPay configuration error: VNPAY_URL is not set'
            );
        }
        if (!VNPAY_RETURN_URL) {
            throw new CustomError(
                ErrorType.INTERNAL_ERROR,
                'VNPay configuration error: VNPAY_RETURN_URL is not set'
            );
        }
    }

    /**
     * Validate invoice for VNPay payment
     * Checks invoice status and existing payment
     * Allow retry if existing payment has failed/pending status
     * @param invoiceId - Invoice ID to validate
     * @returns Invoice object and calculated total amount
     * @throws CustomError if invoice is invalid or payment completed
     */
    private async validateInvoiceForVNPay(invoiceId: string): Promise<{
        invoice: any;
        amount: number;
    }> {
        const invoice = await invoiceDao.findByIdBasic(invoiceId);
        if (!invoice) {
            throw new CustomError(ErrorType.NOT_FOUND, 'Invoice not found');
        }

        if (invoice.status === 'paid') {
            throw new CustomError(
                ErrorType.BAD_REQUEST,
                'Invoice already paid'
            );
        }

        if (invoice.status === 'cancelled') {
            throw new CustomError(
                ErrorType.BAD_REQUEST,
                'Invoice is cancelled'
            );
        }

        // Check existing payment - allow retry if failed or pending
        const existingPayment = await paymentDao.findByInvoiceId(invoiceId);
        if (existingPayment && existingPayment.status === 'completed') {
            throw new CustomError(
                ErrorType.BAD_REQUEST,
                'Payment already completed for this invoice. Cannot create new payment URL.'
            );
        }

        const computedTotal = await calculateInvoiceTotal(invoiceId);
        const amount = computedTotal.totalAmount;

        if (amount <= 0) {
            throw new CustomError(
                ErrorType.BAD_REQUEST,
                'Invoice amount must be greater than 0'
            );
        }

        return { invoice, amount };
    }

    /**
     * Extract client IP address from request
     * @param req - Express request object
     * @returns Cleaned IP address
     */
    private getClientIpAddress(req: Request): string {
        let ipAddr =
            (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
            req.socket.remoteAddress ||
            '127.0.0.1';

        // Remove IPv6 prefix
        ipAddr = ipAddr.replace(/^::ffff:/i, '');
        return ipAddr;
    }

    /**
     * Build VNPay request parameters
     * @param params - Parameters for building VNPay request
     * @returns VNPay parameters object
     */
    private buildVNPayParams(params: {
        amount: number;
        invoiceId: string;
        txnRef: string;
        ipAddr: string;
        returnUrl?: string | undefined;
        language?: string | undefined;
        bankCode?: string | undefined;
    }): Record<string, any> {
        const createDate = formatVNPayDate(new Date());

        const vnpParams: Record<string, any> = {
            vnp_Version: '2.1.0',
            vnp_Command: 'pay',
            vnp_TmnCode: VNPAY_TMN_CODE!,
            vnp_Locale: params.language || 'vn',
            vnp_CurrCode: 'VND',
            vnp_TxnRef: params.txnRef,
            vnp_OrderInfo: `Thanh toan hoa don ${params.invoiceId}`,
            vnp_OrderType: 'other',
            vnp_Amount: formatVNPayAmount(params.amount),
            vnp_ReturnUrl: params.returnUrl || VNPAY_RETURN_URL!,
            vnp_IpAddr: params.ipAddr,
            vnp_CreateDate: createDate,
        };

        // Add bank code if provided
        if (params.bankCode) {
            const validTestCodes = ['VNBANK', 'NCB', 'VNPAYQR'];
            if (validTestCodes.includes(params.bankCode)) {
                vnpParams.vnp_BankCode = params.bankCode;
            }
        }

        return vnpParams;
    }

    /**
     * Sign VNPay parameters and generate payment URL
     * @param vnpParams - VNPay parameters to sign
     * @returns Complete payment URL with signature
     */
    private generateSignedPaymentUrl(vnpParams: Record<string, any>): string {
        const sortedParams = sortObject(vnpParams);
        const signData = QueryString.stringify(sortedParams, { encode: false });
        const hmac = crypto.createHmac('sha512', VNPAY_HASH_SECRET!);
        const signed = hmac
            .update(Buffer.from(signData, 'utf-8'))
            .digest('hex');
        sortedParams['vnp_SecureHash'] = signed;

        return (
            VNPAY_URL +
            '?' +
            QueryString.stringify(sortedParams, { encode: false })
        );
    }

    /**
     * Extract invoice ID from VNPay order info
     * @param orderInfo - VNPay order info string (format: "Thanh toan hoa don {invoiceId}")
     * @returns Invoice ID
     * @throws CustomError if invoice ID cannot be extracted
     */
    private extractInvoiceIdFromOrderInfo(orderInfo: string): string {
        // Try to extract UUID after "hoa don "
        const invoiceIdMatch = orderInfo.match(
            /hoa don ([0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12})/i
        );

        if (invoiceIdMatch && invoiceIdMatch[1]) {
            return invoiceIdMatch[1];
        }

        // Fallback: extract any UUID from orderInfo
        const fallbackMatch = orderInfo.match(
            /([0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12})/i
        );

        if (!fallbackMatch || !fallbackMatch[1]) {
            throw new CustomError(
                ErrorType.BAD_REQUEST,
                `Cannot extract invoice ID from orderInfo: ${orderInfo}`
            );
        }

        return fallbackMatch[1];
    }

    /**
     * Create VNPay payment URL for invoice
     * @param data - Payment URL creation data
     * @param req - Express request object
     * @returns Payment URL and transaction reference
     */
    async createPaymentUrl(
        data: CreateVNPayPaymentUrlBodyDataDto,
        req: Request
    ): Promise<CreateVNPayPaymentUrlResponse> {
        this.validateVNPayConfig();

        // Validate invoice and get amount
        const { amount } = await this.validateInvoiceForVNPay(data.invoiceId);

        // Generate transaction reference
        const txnRef = generateTxnRef();

        // Get client IP address
        const ipAddr = this.getClientIpAddress(req);

        // Build VNPay parameters
        const vnpParams = this.buildVNPayParams({
            amount,
            invoiceId: data.invoiceId,
            txnRef,
            ipAddr,
            returnUrl: data.returnUrl,
            language: data.language,
            bankCode: data.bankCode,
        });

        // Generate signed payment URL
        const paymentUrl = this.generateSignedPaymentUrl(vnpParams);

        return {
            paymentUrl,
            txnRef,
        };
    }

    /**
     * Handle VNPay return callback (user redirected back from VNPay)
     * Validates the secure hash and parses the payment response
     * @param query - VNPay return query parameters
     * @returns Payment result with status and metadata
     * @throws CustomError if secure hash is invalid
     */
    async handleReturn(
        query: VNPayReturnQueryDataDto
    ): Promise<VNPayReturnResponse> {
        // Extract and verify secure hash
        const secureHash = query.vnp_SecureHash;
        const isValid = verifySecureHash(query, secureHash, VNPAY_HASH_SECRET!);

        if (!isValid) {
            throw new CustomError(
                ErrorType.UNAUTHORIZED,
                'Invalid secure hash'
            );
        }

        // Parse response
        const responseCode = query.vnp_ResponseCode;
        const transactionNo = query.vnp_TransactionNo;
        const amount = parseVNPayAmount(parseInt(query.vnp_Amount));
        const bankCode = query.vnp_BankCode;
        const payDate = query.vnp_PayDate;

        // Map VNPay codes to our PaymentStatus and message
        const mapped = mapVNPayResult(
            responseCode,
            query.vnp_TransactionStatus
        );
        const success = mapped.status === 'completed';
        const message = mapped.message || getVNPayResponseMessage(responseCode);

        return {
            success,
            message,
            status: mapped.status,
            responseCode,
            transactionNo,
            amount,
            metadata: {
                vnp_TxnRef: query.vnp_TxnRef,
                vnp_TransactionNo: transactionNo,
                vnp_BankCode: bankCode,
                vnp_PayDate: payDate,
                vnp_ResponseCode: responseCode,
                vnp_TransactionStatus: query.vnp_TransactionStatus,
            },
            ...(bankCode && { bankCode }),
            payDate,
        };
    }

    /**
     * Handle VNPay IPN (Instant Payment Notification) webhook
     * This is called by VNPay server to confirm payment
     * @param query - VNPay IPN query parameters
     * @returns IPN response code and message
     */
    async handleIPN(query: VNPayIPNQueryDataDto): Promise<VNPayIPNResponse> {
        try {
            // 1. Verify secure hash (CRITICAL!)
            const secureHash = query.vnp_SecureHash;
            const isValid = verifySecureHash(
                query,
                secureHash,
                VNPAY_HASH_SECRET!
            );

            if (!isValid) {
                return {
                    RspCode: '97',
                    Message: 'Invalid Signature',
                };
            }

            // 2. Parse transaction data
            const responseCode = query.vnp_ResponseCode;
            const txnRef = query.vnp_TxnRef;
            const amount = parseVNPayAmount(parseInt(query.vnp_Amount));
            const transactionNo = query.vnp_TransactionNo;
            const bankCode = query.vnp_BankCode;
            const payDate = query.vnp_PayDate;

            // 3. Map the response status
            const mappedIPN = mapVNPayResult(
                responseCode,
                query.vnp_TransactionStatus
            );
            const isPaymentSuccess = mappedIPN.status === 'completed';

            // 4. Extract invoice ID from order info
            let invoiceId: string;
            try {
                invoiceId = this.extractInvoiceIdFromOrderInfo(
                    query.vnp_OrderInfo
                );
            } catch (error) {
                return {
                    RspCode: '01',
                    Message: 'Order not found',
                };
            }

            // 5. Get invoice
            const invoice = await invoiceDao.findByIdBasic(invoiceId);
            if (!invoice) {
                return {
                    RspCode: '01',
                    Message: 'Order not found',
                };
            }

            // 6. Check if invoice already paid (Idempotency check)
            // Also verify payment record exists
            if (invoice.status === 'paid') {
                const existingPayment =
                    await paymentDao.findByInvoiceId(invoiceId);
                if (existingPayment && existingPayment.status === 'completed') {
                    return {
                        RspCode: '00',
                        Message: 'Confirm Success (Already Processed)',
                    };
                }
            }

            // 7. Verify amount matches
            const computedTotal = await calculateInvoiceTotal(invoiceId);
            if (Math.abs(amount - computedTotal.totalAmount) > 0.01) {
                return {
                    RspCode: '04',
                    Message: 'Invalid Amount',
                };
            }

            // 8. Create or update payment record and update invoice status
            await this.processPaymentTransaction({
                invoiceId,
                amount,
                txnRef,
                transactionNo,
                ...(bankCode && { bankCode }),
                payDate,
                responseCode,
                transactionStatus: query.vnp_TransactionStatus,
                mappedStatus: mappedIPN.status,
                mappedMessage: mappedIPN.message,
                isPaymentSuccess,
            });

            // Log successful processing for audit trail
            console.log(
                `VNPay IPN: Processed IPN for invoice ${invoiceId}, TxnRef: ${txnRef}, TransactionNo: ${transactionNo}, Amount: ${amount}, Status: ${mappedIPN.status}`
            );

            return {
                RspCode: '00',
                Message: 'Confirm Success',
            };
        } catch (error) {
            return {
                RspCode: '99',
                Message: 'Unknown error',
            };
        }
    }

    /**
     * Process payment transaction in database
     * Creates or updates payment record and updates related entities
     * @param params - Payment transaction parameters
     */
    private async processPaymentTransaction(params: {
        invoiceId: string;
        amount: number;
        txnRef: string;
        transactionNo: string;
        bankCode?: string;
        payDate: string;
        responseCode: string;
        transactionStatus: string;
        mappedStatus: any;
        mappedMessage: string;
        isPaymentSuccess: boolean;
    }): Promise<void> {
        await prisma.$transaction(async (tx) => {
            const metadata = {
                vnp_TxnRef: params.txnRef,
                vnp_TransactionNo: params.transactionNo,
                vnp_BankCode: params.bankCode || '',
                vnp_PayDate: params.payDate,
                vnp_ResponseCode: params.responseCode,
                vnp_TransactionStatus: params.transactionStatus,
            };

            // Use upsert pattern for safe handling with unique constraint
            const existingPayment = await tx.payment.findUnique({
                where: { invoiceId: params.invoiceId },
            });

            if (existingPayment) {
                // Skip update if already completed
                if (existingPayment.status === 'completed') {
                    return;
                }

                // Update existing payment (retry scenario)
                await tx.payment.update({
                    where: { id: existingPayment.id },
                    data: {
                        status: params.mappedStatus,
                        message: params.mappedMessage,
                        metadata: metadata as any,
                        amount: params.amount, // Update amount in case of changes
                        userName: `VNPay - ${params.bankCode || 'Online'}`,
                    },
                });
            } else {
                // Create new payment record
                await tx.payment.create({
                    data: {
                        invoiceId: params.invoiceId,
                        userName: `VNPay - ${params.bankCode || 'Online'}`,
                        paymentMethod: 'bank_transfer',
                        amount: params.amount,
                        status: params.mappedStatus,
                        message: params.mappedMessage,
                        metadata: metadata as any,
                    },
                });
            }

            // Update invoice and related entities if payment is successful
            if (params.isPaymentSuccess) {
                // Get invoice
                const invoice = await tx.invoice.findUnique({
                    where: { id: params.invoiceId },
                    include: {
                        invoiceItems: true,
                    },
                });

                await tx.invoice.update({
                    where: { id: params.invoiceId },
                    data: { status: 'paid' },
                });

                // Update visit services and prescriptions
                if (invoice?.invoiceItems) {
                    await tx.visitService.updateMany({
                        where: {
                            id: {
                                in: invoice.invoiceItems
                                    .filter(
                                        (item) =>
                                            item.item_type === 'service' &&
                                            item.refId
                                    )
                                    .map((item) => item.refId as string),
                            },
                            status: {
                                not: 'cancelled',
                            },
                        },
                        data: {
                            paid: true,
                        },
                    });

                    // Mark all prescriptions as paid
                    await tx.prescription.updateMany({
                        where: {
                            id: {
                                in: invoice.invoiceItems
                                    .filter(
                                        (item) =>
                                            item.item_type === 'medicine' &&
                                            item.refId
                                    )
                                    .map((item) => item.refId as string),
                            },
                        },
                        data: {
                            paid: true,
                        },
                    });
                }
            }
        });
    }

    /**
     * Generate QR code for VNPay payment
     * Creates a payment URL with VNPAYQR bank code and converts it to QR code
     * @param data - QR payment creation data
     * @param req - Express request object
     * @returns QR code data URL, payment URL, and transaction details
     */
    async generateQRPayment(
        data: CreateVNPayQRPaymentBodyDataDto,
        req: Request
    ): Promise<CreateVNPayQRPaymentResponse> {
        this.validateVNPayConfig();

        // Validate invoice and get amount
        const { amount } = await this.validateInvoiceForVNPay(data.invoiceId);

        // Generate transaction reference
        const txnRef = generateTxnRef();

        // Get client IP address
        const ipAddr = this.getClientIpAddress(req);

        // Build VNPay parameters with VNPAYQR bank code
        const vnpParams = this.buildVNPayParams({
            amount,
            invoiceId: data.invoiceId,
            txnRef,
            ipAddr,
            language: data.language,
            bankCode: 'VNPAYQR', // Force QR code payment
        });

        // Generate payment URL with special encoding for QR
        const paymentUrl = this.generateQRPaymentUrl(vnpParams);

        // Generate QR code from payment URL
        try {
            const qrCodeDataURL = await QRCode.toDataURL(paymentUrl, {
                errorCorrectionLevel: 'M',
                type: 'image/png',
                width: 300,
                margin: 2,
            });

            // Calculate expiration time (15 minutes from now)
            const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

            return {
                qrCodeDataURL,
                paymentUrl,
                txnRef,
                amount,
                invoiceId: data.invoiceId,
                expiresAt: expiresAt.toISOString(),
            };
        } catch (error) {
            throw new CustomError(
                ErrorType.INTERNAL_ERROR,
                'Failed to generate QR code'
            );
        }
    }

    /**
     * Generate payment URL for QR code with special encoding
     * @param vnpParams - VNPay parameters
     * @returns Complete payment URL with signature
     */
    private generateQRPaymentUrl(vnpParams: Record<string, any>): string {
        // Sort params by key alphabetically (VNPay requirement)
        const sortedParams = sortObject(vnpParams);

        // Build signData string with encode (follow VNPay sample code)
        const signDataParts: string[] = [];
        Object.keys(sortedParams).forEach((key) => {
            const value = sortedParams[key];
            if (value !== null && value !== undefined && value !== '') {
                const encodedKey = encodeURIComponent(key);
                const encodedValue = encodeURIComponent(String(value)).replace(
                    /%20/g,
                    '+'
                );
                signDataParts.push(`${encodedKey}=${encodedValue}`);
            }
        });
        const signData = signDataParts.join('&');

        // Create HMAC SHA512 hash
        const hmac = crypto.createHmac('sha512', VNPAY_HASH_SECRET!);
        const secureHash = hmac
            .update(Buffer.from(signData, 'utf-8'))
            .digest('hex');

        // Add secure hash to params
        sortedParams['vnp_SecureHash'] = secureHash;

        // Build final URL query string
        const queryParts: string[] = [];
        Object.keys(sortedParams).forEach((key) => {
            const value = sortedParams[key];
            if (value !== null && value !== undefined && value !== '') {
                const encodedKey = encodeURIComponent(key);
                const encodedValue = encodeURIComponent(String(value)).replace(
                    /%20/g,
                    '+'
                );
                queryParts.push(`${encodedKey}=${encodedValue}`);
            }
        });
        const queryString = queryParts.join('&');

        return `${VNPAY_URL}?${queryString}`;
    }
}

export const vnpayService = new VNPayService();
