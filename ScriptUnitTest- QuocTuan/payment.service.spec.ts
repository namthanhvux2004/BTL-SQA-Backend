jest.mock('@src/daos/payment.dao', () => ({
    paymentDao: {
        findByInvoiceId: jest.fn(),
        findById: jest.fn(),
    },
}));

jest.mock('@src/daos/invoice.dao', () => ({
    invoiceDao: {
        findByIdBasic: jest.fn(),
    },
}));

jest.mock('@src/helpers/calculateInvoiceTotal', () => ({
    calculateInvoiceTotal: jest.fn(),
}));

jest.mock('@src/services/vnpay.service', () => ({
    vnpayService: {
        createPaymentUrl: jest.fn(),
    },
}));

jest.mock('@src/config/prisma', () => ({
    __esModule: true,
    default: {
        $transaction: jest.fn(),
    },
}));

describe('payment.service - Luồng xử lý thanh toán', () => {
    let paymentService: typeof import('@src/services/payment.service').paymentService;

    let prisma: any;
    let paymentDao: any;
    let invoiceDao: any;
    let calculateInvoiceTotal: jest.Mock;
    let vnpayService: any;

    beforeEach(() => {
        jest.resetModules();
        jest.clearAllMocks();

        ({ paymentService } = require('@src/services/payment.service'));
        prisma = require('@src/config/prisma').default;
        ({ paymentDao } = require('@src/daos/payment.dao'));
        ({ invoiceDao } = require('@src/daos/invoice.dao'));
        ({ calculateInvoiceTotal } = require(
            '@src/helpers/calculateInvoiceTotal'
        ));
        ({ vnpayService } = require('@src/services/vnpay.service'));
    });

    describe('Tạo thanh toán', () => {
        const paymentData = {
            invoiceId: 'invoice-1',
            paymentMethod: 'cash',
            userName: 'Tuấn',
            message: 'Thanh toán',
            metadata: {
                test: true,
            },
        };

        const invoiceMock = {
            id: 'invoice-1',
            status: 'pending',
            discountAmount: 100,
        };

        const invoiceTotalMock = {
            subtotal: 1000,
            insuranceAmount: 200,
            totalAmount: 700,
        };

        const transactionMock = {
            invoice: {
                findUnique: jest.fn(),
                update: jest.fn(),
            },
            payment: {
                create: jest.fn(),
                update: jest.fn(),
            },
            visitService: {
                updateMany: jest.fn(),
            },
            prescription: {
                updateMany: jest.fn(),
            },
        };

        it('tạo thanh toán mới thành công khi hóa đơn hợp lệ', async () => {
            invoiceDao.findByIdBasic
                .mockResolvedValueOnce(invoiceMock)
                .mockResolvedValueOnce(invoiceMock);

            paymentDao.findByInvoiceId.mockResolvedValue(null);
            calculateInvoiceTotal.mockResolvedValue(invoiceTotalMock);

            transactionMock.invoice.findUnique.mockResolvedValue({
                invoiceItems: [
                    {
                        item_type: 'service',
                        refId: 'service-1',
                    },
                    {
                        item_type: 'medicine',
                        refId: 'medicine-1',
                    },
                ],
            });

            transactionMock.payment.create.mockResolvedValue({
                id: 'payment-1',
                invoiceId: 'invoice-1',
                amount: 700,
                paymentMethod: 'cash',
                status: 'completed',
                createdAt: new Date(),
                message: 'Thanh toán',
                metadata: {
                    test: true,
                },
            });

            prisma.$transaction.mockImplementation(async (callback: any) => {
                return callback(transactionMock);
            });

            const result = await paymentService.createPayment(paymentData);

            expect(result.success).toBe(true);
            expect(result.message).toBe('Payment processed successfully');
            expect(transactionMock.payment.create).toHaveBeenCalledTimes(1);
            expect(transactionMock.invoice.update).toHaveBeenCalledWith({
                where: {
                    id: 'invoice-1',
                },
                data: {
                    status: 'paid',
                },
            });
            expect(transactionMock.visitService.updateMany).toHaveBeenCalledTimes(
                1
            );
            expect(transactionMock.prescription.updateMany).toHaveBeenCalledTimes(
                1
            );
        });

        it('cập nhật lại payment cũ nếu lần thanh toán trước đã thất bại', async () => {
            invoiceDao.findByIdBasic
                .mockResolvedValueOnce(invoiceMock)
                .mockResolvedValueOnce(invoiceMock);

            paymentDao.findByInvoiceId.mockResolvedValue({
                id: 'payment-old',
                status: 'failed',
            });

            calculateInvoiceTotal.mockResolvedValue(invoiceTotalMock);
            transactionMock.invoice.findUnique.mockResolvedValue({
                invoiceItems: [],
            });

            transactionMock.payment.update.mockResolvedValue({
                id: 'payment-old',
                invoiceId: 'invoice-1',
                amount: 700,
                paymentMethod: 'cash',
                status: 'completed',
                createdAt: new Date(),
                message: null,
                metadata: null,
            });

            prisma.$transaction.mockImplementation(async (callback: any) => {
                return callback(transactionMock);
            });

            const result = await paymentService.createPayment(paymentData);

            expect(result.success).toBe(true);
            expect(transactionMock.payment.update).toHaveBeenCalledTimes(1);
            expect(transactionMock.payment.create).not.toHaveBeenCalled();
        });

        it('ném lỗi nếu không tìm thấy hóa đơn', async () => {
            invoiceDao.findByIdBasic.mockResolvedValue(null);

            await expect(
                paymentService.createPayment(paymentData)
            ).rejects.toThrow('Invoice not found');
        });

        it('ném lỗi nếu hóa đơn đã được thanh toán', async () => {
            invoiceDao.findByIdBasic.mockResolvedValue({
                status: 'paid',
            });

            await expect(
                paymentService.createPayment(paymentData)
            ).rejects.toThrow('Invoice has already been paid');
        });

        it('ném lỗi nếu hóa đơn đã bị hủy', async () => {
            invoiceDao.findByIdBasic.mockResolvedValue({
                status: 'cancelled',
            });

            await expect(
                paymentService.createPayment(paymentData)
            ).rejects.toThrow('Cannot pay for a cancelled invoice');
        });

        it('ném lỗi nếu hóa đơn đã có payment hoàn tất', async () => {
            invoiceDao.findByIdBasic.mockResolvedValue(invoiceMock);
            paymentDao.findByInvoiceId.mockResolvedValue({
                status: 'completed',
            });

            await expect(
                paymentService.createPayment(paymentData)
            ).rejects.toThrow('Invoice already has a completed payment');
        });

        it('ném lỗi nếu tổng tiền của hóa đơn không hợp lệ', async () => {
            invoiceDao.findByIdBasic.mockResolvedValue(invoiceMock);
            paymentDao.findByInvoiceId.mockResolvedValue(null);
            calculateInvoiceTotal.mockResolvedValue({
                totalAmount: 0,
            });

            await expect(
                paymentService.createPayment(paymentData)
            ).rejects.toThrow('Invoice total amount must be greater than 0');
        });

        it('không thêm invoiceBreakdown nếu không lấy được hóa đơn sau khi cập nhật', async () => {
            invoiceDao.findByIdBasic
                .mockResolvedValueOnce(invoiceMock)
                .mockResolvedValueOnce(null);

            paymentDao.findByInvoiceId.mockResolvedValue(null);
            calculateInvoiceTotal.mockResolvedValue(invoiceTotalMock);
            transactionMock.invoice.findUnique.mockResolvedValue(null);

            transactionMock.payment.create.mockResolvedValue({
                id: 'payment-1',
                invoiceId: 'invoice-1',
                amount: 700,
                paymentMethod: 'cash',
                status: 'completed',
                createdAt: new Date(),
                message: null,
                metadata: null,
            });

            prisma.$transaction.mockImplementation(async (callback: any) => {
                return callback(transactionMock);
            });

            const result = await paymentService.createPayment(paymentData);

            expect(result.success).toBe(true);
            expect(result.data.invoiceBreakdown).toBeUndefined();
        });

        it('vẫn xử lý được nếu hóa đơn không có invoiceItems', async () => {
            invoiceDao.findByIdBasic
                .mockResolvedValueOnce(invoiceMock)
                .mockResolvedValueOnce(invoiceMock);

            paymentDao.findByInvoiceId.mockResolvedValue(null);
            calculateInvoiceTotal.mockResolvedValue(invoiceTotalMock);
            transactionMock.invoice.findUnique.mockResolvedValue(null);

            transactionMock.payment.create.mockResolvedValue({
                id: 'payment-1',
                invoiceId: 'invoice-1',
                amount: 700,
                paymentMethod: 'cash',
                status: 'completed',
                createdAt: new Date(),
                message: null,
                metadata: null,
            });

            prisma.$transaction.mockImplementation(async (callback: any) => {
                return callback(transactionMock);
            });

            const result = await paymentService.createPayment(paymentData);

            expect(result.success).toBe(true);
            expect(
                transactionMock.visitService.updateMany
            ).not.toHaveBeenCalled();
        });
    });

    describe('Tạo link VNPay', () => {
        it('tạo link thanh toán VNPay thành công', async () => {
            const req = {} as any;

            vnpayService.createPaymentUrl.mockResolvedValue(
                'https://vnpay.vn/payment'
            );

            const result = await paymentService.getLinkPaymentUrlVnpay(
                {
                    invoiceId: 'invoice-1',
                    returnUrl: 'http://localhost',
                },
                req
            );

            expect(result).toBe('https://vnpay.vn/payment');
            expect(vnpayService.createPaymentUrl).toHaveBeenCalledWith(
                {
                    invoiceId: 'invoice-1',
                    language: 'vn',
                    returnUrl: 'http://localhost',
                },
                req
            );
        });
    });

    describe('Lấy payment theo id', () => {
        it('trả về đầy đủ thông tin payment khi tìm thấy', async () => {
            paymentDao.findById.mockResolvedValue({
                id: 'payment-1',
                invoiceId: 'invoice-1',
                userName: 'Tuấn',
                paymentMethod: 'cash',
                amount: 1000,
                status: 'completed',
                message: 'ok',
                metadata: {},
                createdAt: new Date(),
                updatedAt: new Date(),
                invoice: {
                    id: 'invoice-1',
                    patientId: 'patient-1',
                    status: 'paid',
                    createdAt: new Date(),
                    patient: {
                        userId: 'user-1',
                        user: {
                            email: 'test@gmail.com',
                            name: {
                                firstName: 'Nguyễn',
                                lastName: 'Tuấn',
                            },
                        },
                    },
                },
            });

            const result = await paymentService.getPaymentById('payment-1');

            expect(result.invoice.patient.fullName).toBe('Nguyễn Tuấn');
        });

        it('trả về N/A nếu không có đủ tên bệnh nhân', async () => {
            paymentDao.findById.mockResolvedValue({
                id: 'payment-1',
                invoiceId: 'invoice-1',
                createdAt: new Date(),
                updatedAt: new Date(),
                invoice: {
                    id: 'invoice-1',
                    patientId: 'patient-1',
                    status: 'paid',
                    createdAt: new Date(),
                    patient: {
                        userId: 'user-1',
                        user: {},
                    },
                },
            });

            const result = await paymentService.getPaymentById('payment-1');

            expect(result.invoice.patient.fullName).toBe('N/A');
        });

        it('ném lỗi nếu payment không tồn tại', async () => {
            paymentDao.findById.mockResolvedValue(null);

            await expect(
                paymentService.getPaymentById('payment-1')
            ).rejects.toThrow('Payment not found');
        });

        it('ném lỗi nếu payment không gắn với invoice nào', async () => {
            paymentDao.findById.mockResolvedValue({
                invoice: null,
            });

            await expect(
                paymentService.getPaymentById('payment-1')
            ).rejects.toThrow('Payment not found');
        });
    });

    describe('Lấy payment theo invoice id', () => {
        it('trả về payment khi tìm bằng invoice id thành công', async () => {
            paymentDao.findByInvoiceId.mockResolvedValue({
                id: 'payment-1',
                invoiceId: 'invoice-1',
                userName: 'Tuấn',
                paymentMethod: 'cash',
                amount: 1000,
                status: 'completed',
                message: 'ok',
                metadata: {},
                createdAt: new Date(),
                updatedAt: new Date(),
            });

            const result = await paymentService.getPaymentByInvoiceId(
                'invoice-1'
            );

            expect(result.id).toBe('payment-1');
        });

        it('ném lỗi nếu không tìm thấy payment của hóa đơn', async () => {
            paymentDao.findByInvoiceId.mockResolvedValue(null);

            await expect(
                paymentService.getPaymentByInvoiceId('invoice-1')
            ).rejects.toThrow('Payment not found for this invoice');
        });
    });
});
