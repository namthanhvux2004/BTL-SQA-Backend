import { Request, Response } from 'express';
import { vnpayService } from '@src/services/vnpay.service';
import { SuccessResponse } from '@src/core/ApiResponse';
import {
    CreateVNPayPaymentUrlBodyDataDto,
    CreateVNPayQRPaymentBodyDataDto,
    VNPayReturnQueryDataDto,
    VNPayIPNQueryDataDto,
} from '@src/dtos/vnpay.dto';

export class VNPayController {
    /**
     * POST /api/v1/vnpay/create-payment-url
     * Create VNPay payment URL for invoice
     */
    async createPaymentUrl(
        req: Request<{}, {}, CreateVNPayPaymentUrlBodyDataDto>,
        res: Response
    ): Promise<Response> {
        const result = await vnpayService.createPaymentUrl(req.body, req);
        return new SuccessResponse(
            result,
            'Payment URL created successfully'
        ).send(res);
    }

    /**
     * GET /api/v1/vnpay/return
     * Handle VNPay return callback (user redirected back from VNPay)
     */
    async handleReturn(
        req: Request<{}, {}, {}, VNPayReturnQueryDataDto>,
        res: Response
    ): Promise<Response> {
        const result = await vnpayService.handleReturn(req.query);

        // Return result (frontend can handle redirect based on success status)
        return new SuccessResponse(result, result.message).send(res);
    }

    /**
     * GET /api/v1/vnpay/ipn
     * Handle VNPay IPN (Instant Payment Notification) webhook
     * This endpoint is called by VNPay server to confirm payment
     */
    async handleIPN(
        req: Request<{}, {}, {}, VNPayIPNQueryDataDto>,
        res: Response
    ): Promise<Response> {
        const result = await vnpayService.handleIPN(req.query);

        // Return VNPay-compliant JSON response (no wrapper)
        return res.status(200).json(result);
    }

    /**
     * POST /api/v1/vnpay/create-qr-payment
     * Create VNPay QR code payment for invoice
     * Returns QR code as base64 data URL for easy display
     */
    async createQRPayment(
        req: Request<{}, {}, CreateVNPayQRPaymentBodyDataDto>,
        res: Response
    ): Promise<Response> {
        const result = await vnpayService.generateQRPayment(req.body, req);
        return new SuccessResponse(
            result,
            'QR code payment created successfully'
        ).send(res);
    }
}

export const vnpayController = new VNPayController();
