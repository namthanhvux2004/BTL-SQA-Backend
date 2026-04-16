import { Request, Response } from 'express';
import { paymentService } from '@src/services/payment.service';
import { InternalErrorResponse, SuccessResponse } from '@src/core/ApiResponse';
import {
    CreatePaymentBodyDataDto,
    GetPaymentParamsDataDto,
} from '@src/dtos/payment.dto';

export class PaymentController {
    /**
     * POST /api/payments
     * Create a new payment and update invoice status
     * @param req - Request with payment data in body
     * @param res - Response object
     * @returns Payment creation result with invoice breakdown
     */
    async createPayment(
        req: Request<{}, {}, CreatePaymentBodyDataDto>,
        res: Response
    ): Promise<Response> {
        const result = await paymentService.createPayment(req.body);
        return new SuccessResponse(result, result.message).send(res);
    }

    /**
     * GET /api/payments/invoice/:invoiceId/payment-url
     * Generate payment URL for online payment gateways
     * @param req - Request with invoiceId in params and method, returnUrl in query
     * @param res - Response object
     * @returns Payment URL for the specified payment method
     */
    async getLinkPaymentUrl(
        req: Request<
            { invoiceId: string },
            {},
            {},
            { method: string; returnUrl: string }
        >,
        res: Response
    ): Promise<Response> {
        const { method, returnUrl } = req.query;
        const { invoiceId } = req.params;

        // Validate payment method
        if (method !== 'vnpay') {
            return new InternalErrorResponse(
                `Payment method "${method}" is not supported. Currently only "vnpay" is available.`
            ).send(res);
        }

        // Generate payment URL using VNPay
        const result = await paymentService.getLinkPaymentUrlVnpay(
            { invoiceId, returnUrl },
            req
        );

        return new SuccessResponse(
            { paymentUrl: result.paymentUrl },
            'Get payment URL successfully'
        ).send(res);
    }

    /**
     * GET /api/payments/:id
     * Get payment detail by ID
     * @param req - Request with payment ID in params
     * @param res - Response object
     * @returns Detailed payment information including invoice and patient data
     */
    async getPaymentById(
        req: Request<GetPaymentParamsDataDto>,
        res: Response
    ): Promise<Response> {
        const result = await paymentService.getPaymentById(req.params.id);
        return new SuccessResponse(
            result,
            'Payment retrieved successfully'
        ).send(res);
    }

    /**
     * GET /api/payments/invoice/:invoiceId
     * Get payment by invoice ID
     * @param req - Request with invoice ID in params
     * @param res - Response object
     * @returns Payment information for the specified invoice
     */
    async getPaymentByInvoiceId(
        req: Request<{ invoiceId: string }>,
        res: Response
    ): Promise<Response> {
        const result = await paymentService.getPaymentByInvoiceId(
            req.params.invoiceId
        );
        return new SuccessResponse(
            result,
            'Payment retrieved successfully'
        ).send(res);
    }
}

export const paymentController = new PaymentController();
