import { Request, Response } from 'express';
import { invoiceService } from '@src/services/invoice.service';
import { SuccessResponse } from '@src/core/ApiResponse';
import {
    GetInvoicesQueryDataDto,
    GetInvoiceParamsDataDto,
    CreateInvoiceBodyDataDto,
    UpdateInvoiceParamsDataDto,
    UpdateInvoiceBodyDataDto,
    SendInvoiceEmailParamsDataDto,
    SendInvoiceEmailBodyDataDto,
    AddItemToInvoiceParamsDataDto,
    AddItemToInvoiceBodyDataDto,
    RemoveItemFromInvoiceParamsDataDto,
} from '@src/dtos/invoice.dto';

/**
 * GET /api/invoices
 * Get list of invoices with filters and pagination
 */
const getInvoices = async (
    req: Request<{}, {}, {}, GetInvoicesQueryDataDto>,
    res: Response
): Promise<Response> => {
    const result = await invoiceService.getInvoices(req.query);
    return new SuccessResponse(
        result.data,
        'Invoices retrieved successfully',
        result.pagination
    ).send(res);
};

/**
 * POST /api/invoices
 * Create a new invoice manually
 */
const createInvoice = async (
    req: Request<{}, {}, CreateInvoiceBodyDataDto>,
    res: Response
): Promise<Response> => {
    const user = req.user!;
    const result = await invoiceService.createInvoice({
        ...req.body,
        issuedBy: user.id,
    });
    return new SuccessResponse(result, 'Invoice created successfully').send(
        res
    );
};

/**
 * GET /api/invoices/:id
 * Get invoice detail by ID with computed total
 */
const getInvoiceById = async (
    req: Request<GetInvoiceParamsDataDto>,
    res: Response
): Promise<Response> => {
    const result = await invoiceService.getInvoiceById(req.params.id);
    return new SuccessResponse(result, 'Invoice retrieved successfully').send(
        res
    );
};

/**
 * POST /api/invoices/:id/send-email
 * Send invoice email to patient
 */
const sendInvoiceEmail = async (
    req: Request<
        SendInvoiceEmailParamsDataDto,
        {},
        SendInvoiceEmailBodyDataDto
    >,
    res: Response
): Promise<Response> => {
    const result = await invoiceService.sendInvoiceEmail(
        req.params.id,
        req.body.email
    );
    return new SuccessResponse(
        { success: result.success },
        result.message
    ).send(res);
};

const getUnpaidServices = async (
    req: Request<{ patientId: string }>,
    res: Response
): Promise<Response> => {
    if (!req.params.patientId) {
        throw new Error('Patient ID is required');
    }
    const result = await invoiceService.getUnpaidServices(req.params.patientId);
    return new SuccessResponse(
        result,
        'Unpaid services retrieved successfully'
    ).send(res);
};

/**
 * POST /api/invoices/:id/items
 * Add item to invoice
 */
const addItemToInvoice = async (
    req: Request<
        AddItemToInvoiceParamsDataDto,
        {},
        AddItemToInvoiceBodyDataDto
    >,
    res: Response
): Promise<Response> => {
    const { id } = req.params;
    const itemData = req.body;

    const result = await invoiceService.addItemToInvoice(id, itemData);

    return new SuccessResponse(result, 'Thêm mục vào hóa đơn thành công').send(
        res
    );
};

/**
 * DELETE /api/invoices/:id/items/:itemId
 * Remove item from invoice
 */
const removeItemFromInvoice = async (
    req: Request<RemoveItemFromInvoiceParamsDataDto>,
    res: Response
): Promise<Response> => {
    const { id, itemId } = req.params;

    const result = await invoiceService.removeItemFromInvoice(id, itemId);

    return new SuccessResponse(result, 'Xóa mục khỏi hóa đơn thành công').send(
        res
    );
};

/**
 * PUT /api/invoices/:id
 * Update an existing invoice (delete old items, add new items)
 */
const updateInvoice = async (
    req: Request<UpdateInvoiceParamsDataDto, {}, UpdateInvoiceBodyDataDto>,
    res: Response
): Promise<Response> => {
    const { id } = req.params;
    const result = await invoiceService.updateInvoice(id, req.body);

    return new SuccessResponse(result, 'Cập nhật hóa đơn thành công').send(res);
};

export default {
    getInvoices,
    createInvoice,
    getInvoiceById,
    updateInvoice,
    sendInvoiceEmail,
    getUnpaidServices,
    addItemToInvoice,
    removeItemFromInvoice,
};
