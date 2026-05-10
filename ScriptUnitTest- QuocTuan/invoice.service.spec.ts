jest.mock('@src/daos/invoice.dao', () => ({
    __esModule: true,
    invoiceDao: {
        findMany: jest.fn(),
        findById: jest.fn(),
        findByIdBasic: jest.fn(),
        deleteAllInvoiceItems: jest.fn(),
        updateInvoice: jest.fn(),
        addItemToInvoice: jest.fn(),
        verifyItemBelongsToInvoice: jest.fn(),
        removeItemFromInvoice: jest.fn(),
    },
    default: {
        findMany: jest.fn(),
        findById: jest.fn(),
        findByIdBasic: jest.fn(),
        deleteAllInvoiceItems: jest.fn(),
        updateInvoice: jest.fn(),
        addItemToInvoice: jest.fn(),
        verifyItemBelongsToInvoice: jest.fn(),
        removeItemFromInvoice: jest.fn(),
    },
}));

jest.mock('@src/daos/patient.dao', () => ({
    __esModule: true,
    default: {
        getPatientById: jest.fn(),
    },
}));

jest.mock('@src/helpers/calculateInvoiceTotal', () => ({
    calculateInvoiceTotal: jest.fn(),
}));

jest.mock('@src/services/mail.service', () => ({
    __esModule: true,
    default: {
        getTransporter: jest.fn(),
    },
}));

jest.mock('@src/helpers/generateInvoiceEmailHTML', () => ({
    generateInvoiceEmailHTML: jest.fn(),
}));

jest.mock('@src/helpers/healthInsurance', () => ({
    mapBenefitLevelToCoverage: jest.fn(),
}));

jest.mock('@src/config/prisma', () => ({
    __esModule: true,
    default: {
        $transaction: jest.fn(),
        invoice: {
            create: jest.fn(),
            update: jest.fn(),
        },
        invoiceItem: {
            findMany: jest.fn(),
            createMany: jest.fn(),
        },
        visitService: {
            findMany: jest.fn(),
        },
        prescription: {
            findMany: jest.fn(),
        },
        patient: {
            findFirst: jest.fn(),
        },
    },
}));

describe('invoice.service - Luong xu ly hoa don', () => {
    let invoiceService: any;
    let invoiceDao: any;
    let patientDao: any;
    let prisma: any;
    let calculateInvoiceTotal: jest.Mock;
    let mailService: any;
    let generateInvoiceEmailHTML: jest.Mock;
    let mapBenefitLevelToCoverage: jest.Mock;
    let sendMail: jest.Mock;

    beforeEach(() => {
        jest.resetModules();
        jest.clearAllMocks();

        ({ invoiceService } = require('@src/services/invoice.service'));
        invoiceDao = require('@src/daos/invoice.dao').invoiceDao;
        patientDao = require('@src/daos/patient.dao').default;
        prisma = require('@src/config/prisma').default;
        ({ calculateInvoiceTotal } = require(
            '@src/helpers/calculateInvoiceTotal'
        ));
        mailService = require('@src/services/mail.service').default;
        ({ generateInvoiceEmailHTML } = require(
            '@src/helpers/generateInvoiceEmailHTML'
        ));
        ({ mapBenefitLevelToCoverage } = require(
            '@src/helpers/healthInsurance'
        ));

        sendMail = jest.fn().mockResolvedValue(true);
        mailService.getTransporter.mockReturnValue({ sendMail });
        generateInvoiceEmailHTML.mockReturnValue('<html>invoice</html>');
        mapBenefitLevelToCoverage.mockReturnValue(80);
    });

    describe('Lay danh sach hoa don', () => {
        it('tra ve danh sach hoa don va tinh total cho invoice pending', async () => {
            invoiceDao.findMany.mockResolvedValue({
                data: [
                    {
                        id: 'invoice-1',
                        patientId: 'patient-1',
                        status: 'pending',
                        createdAt: new Date(),
                        updatedAt: new Date(),
                        patient: {
                            patientId: 'P001',
                            userId: 'U001',
                            user: {
                                name: {
                                    firstName: 'Nguyen',
                                    lastName: 'Van A',
                                },
                                birthday: new Date(),
                            },
                        },
                        payment: null,
                    },
                ],
                metadata: {
                    total: 1,
                    page: 1,
                    limit: 10,
                },
            });

            calculateInvoiceTotal.mockResolvedValue({
                totalAmount: 1000,
            });

            const result = await invoiceService.getInvoices({});

            expect(result.data).toHaveLength(1);
            expect(result.data[0].computedTotal.total).toBe(1000);
            expect(result.pagination.total).toBe(1);
        });

        it('dung totalAmount co san cho invoice da paid hoac cancelled', async () => {
            invoiceDao.findMany.mockResolvedValue({
                data: [
                    {
                        id: 'invoice-1',
                        patientId: 'patient-1',
                        status: 'paid',
                        totalAmount: 5000,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                        patient: {
                            patientId: 'P001',
                            userId: 'U001',
                            user: {
                                name: {},
                            },
                        },
                    },
                    {
                        id: 'invoice-2',
                        patientId: 'patient-2',
                        status: 'cancelled',
                        totalAmount: 6000,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                        patient: {
                            patientId: 'P002',
                            userId: 'U002',
                            user: {},
                        },
                    },
                ],
                metadata: {},
            });

            const result = await invoiceService.getInvoices({});

            expect(result.data[0].computedTotal.total).toBe(5000);
            expect(result.data[1].computedTotal.total).toBe(6000);
            expect(result.data[1].patient.fullName).toBe('N/A');
            expect(result.data[1].patient.birthday).toBeNull();
            expect(calculateInvoiceTotal).not.toHaveBeenCalled();
        });
    });

    describe('Lay chi tiet hoa don', () => {
        it('nem loi neu khong tim thay hoa don', async () => {
            invoiceDao.findById.mockResolvedValue(null);

            await expect(
                invoiceService.getInvoiceById('invoice-id')
            ).rejects.toThrow('Invoice not found');
        });

        it('tra ve day du chi tiet invoice, payment va bao hiem', async () => {
            invoiceDao.findById.mockResolvedValue({
                id: 'invoice-id',
                patientId: 'patient-id',
                patient: {
                    patientId: 'P001',
                    userId: 'U001',
                    user: {
                        email: 'test@gmail.com',
                        phone: '0123',
                        birthday: new Date(),
                        name: {
                            firstName: 'Nguyen',
                            lastName: 'A',
                        },
                    },
                },
                healthInsuranceId: 'hi-1',
                healthInsurance: {
                    id: 'hi-1',
                    type: 'BHYT',
                    insuranceId: 'BH123',
                    level_of_benefit: 2,
                },
                status: 'pending',
                discountReason: 'Khuyen mai',
                notes: 'ghi chu',
                issuedBy: 'admin',
                createdAt: new Date(),
                updatedAt: new Date(),
                payment: {
                    id: 'payment-id',
                    userName: 'admin',
                    paymentMethod: 'cash',
                    amount: 1000,
                    status: 'completed',
                    createdAt: new Date(),
                },
            });

            calculateInvoiceTotal.mockResolvedValue({
                subtotal: 1000,
                discountAmount: 0,
                insuranceCoveragePercent: 80,
                insuranceAmount: 100,
                totalAmount: 900,
            });

            prisma.invoiceItem.findMany.mockResolvedValue([
                { item_type: 'service', refId: 'service-1' },
                { item_type: 'medicine', refId: 'pres-1' },
                { item_type: 'service', refId: null },
            ]);

            prisma.visitService.findMany.mockResolvedValue([
                {
                    id: 'service-1',
                    medicalServiceId: 'ms-1',
                    quantity: 1,
                    price: 100,
                    status: '',
                    note: '',
                    medicalService: {
                        id: 'ms-1',
                        name: 'Kham benh',
                        percentApplyHealthInsurance: 80,
                    },
                },
            ]);

            prisma.prescription.findMany.mockResolvedValue([
                {
                    id: 'pres-1',
                    paid: false,
                    medicineUsages: [
                        {
                            id: 'mu-1',
                            medicineId: 'm-1',
                            quantity: 1,
                            price: 50,
                            isPurchased: false,
                            note: '',
                            medicine: {
                                id: 'm-1',
                                name: 'Thuoc A',
                                unit: 'vien',
                            },
                        },
                    ],
                },
            ]);

            const result = await invoiceService.getInvoiceById('invoice-id');

            expect(result.id).toBe('invoice-id');
            expect(result.patient.fullName).toContain('Nguyen');
            expect(result.visitServices[0].status).toBe('ordered');
            expect(result.visitServices[0].note).toBeUndefined();
            expect(result.prescriptions[0].medicineUsages[0].isPurchased).toBe(
                false
            );
            expect(result.prescriptions[0].medicineUsages[0].note).toBeUndefined();
            expect(result.healthInsurance.coverage).toBe(80);
            expect(result.payment.id).toBe('payment-id');
        });

        it('tra ve gia tri mac dinh khi khong co bao hiem, payment hoac ten benh nhan', async () => {
            invoiceDao.findById.mockResolvedValue({
                id: 'invoice-id',
                patientId: 'patient-id',
                patient: {
                    patientId: 'P001',
                    userId: 'U001',
                    user: {},
                },
                status: 'pending',
                createdAt: new Date(),
                updatedAt: new Date(),
                payment: null,
            });

            calculateInvoiceTotal.mockResolvedValue({
                subtotal: 1000,
                discountAmount: 0,
                insuranceCoveragePercent: 0,
                insuranceAmount: 0,
                totalAmount: 1000,
            });

            prisma.invoiceItem.findMany.mockResolvedValue([]);

            const result = await invoiceService.getInvoiceById('invoice-id');

            expect(result.patient.fullName).toBe('N/A');
            expect(result.healthInsurance).toBeUndefined();
            expect(result.payment).toBeNull();
        });

        it('van xu ly duoc khi prescription khong co medicineUsages', async () => {
            invoiceDao.findById.mockResolvedValue({
                id: 'invoice-id',
                patientId: 'patient-id',
                patient: {
                    patientId: 'P001',
                    userId: 'U001',
                    user: {
                        name: {
                            firstName: 'Nguyen',
                            lastName: 'A',
                        },
                    },
                },
                status: 'pending',
                createdAt: new Date(),
                updatedAt: new Date(),
                payment: null,
            });

            calculateInvoiceTotal.mockResolvedValue({
                subtotal: 1000,
                discountAmount: 0,
                insuranceCoveragePercent: 0,
                insuranceAmount: 0,
                totalAmount: 1000,
            });

            prisma.invoiceItem.findMany.mockResolvedValue([
                { item_type: 'medicine', refId: 'pres-1' },
            ]);
            prisma.prescription.findMany.mockResolvedValue([
                {
                    id: 'pres-1',
                    paid: false,
                },
            ]);

            const result = await invoiceService.getInvoiceById('invoice-id');

            expect(result.prescriptions[0].medicineUsages).toEqual([]);
        });
    });

    describe('Gui email hoa don', () => {
        it('nem loi neu khong tim thay invoice', async () => {
            invoiceDao.findById.mockResolvedValue(null);

            await expect(
                invoiceService.sendInvoiceEmail('invoice-id')
            ).rejects.toThrow('Invoice not found');
        });

        it('nem loi neu invoice chua thanh toan', async () => {
            invoiceDao.findById.mockResolvedValue({
                status: 'pending',
            });

            await expect(
                invoiceService.sendInvoiceEmail('invoice-id')
            ).rejects.toThrow('Can only send email for paid invoices');
        });

        it('nem loi neu khong co email benh nhan', async () => {
            invoiceDao.findById.mockResolvedValue({
                id: 'invoice-id',
                status: 'paid',
                patient: {
                    user: {},
                },
            });

            await expect(
                invoiceService.sendInvoiceEmail('invoice-id')
            ).rejects.toThrow('Patient email not found');
        });

        it('gui email thanh cong voi du lieu co ban', async () => {
            invoiceDao.findById.mockResolvedValue({
                id: 'invoice-id',
                status: 'paid',
                createdAt: new Date(),
                patient: {
                    userId: 'user-id',
                    user: {
                        email: 'patient@gmail.com',
                        name: {
                            firstName: 'Nguyen',
                            lastName: 'A',
                        },
                    },
                    healthInsurances: [],
                },
                payment: {
                    paymentMethod: 'cash',
                    createdAt: new Date(),
                },
            });

            calculateInvoiceTotal.mockResolvedValue({
                breakdown: {
                    servicesTotal: 100,
                    medicinesTotal: 50,
                },
                subtotal: 150,
                insuranceAmount: 0,
                totalAmount: 150,
            });

            prisma.invoiceItem.findMany.mockResolvedValue([]);
            prisma.visitService.findMany.mockResolvedValue([]);
            prisma.prescription.findMany.mockResolvedValue([]);

            const result = await invoiceService.sendInvoiceEmail('invoice-id');

            expect(result.success).toBe(true);
            expect(generateInvoiceEmailHTML).toHaveBeenCalled();
            expect(sendMail).toHaveBeenCalled();
        });

        it('build day du du lieu email khi co dich vu, thuoc, bao hiem va payment', async () => {
            const createdAt = new Date('2025-01-01T10:00:00.000Z');

            invoiceDao.findById.mockResolvedValue({
                id: 'invoice-id',
                status: 'paid',
                createdAt,
                patient: {
                    userId: 'user-id',
                    user: {
                        email: 'patient@gmail.com',
                        name: {},
                    },
                    healthInsurances: [
                        {
                            insuranceId: 'BH123',
                            level_of_benefit: 2,
                        },
                    ],
                },
                payment: {
                    paymentMethod: 'vnpay',
                    createdAt,
                    transactionId: 'txn-1',
                },
            });

            calculateInvoiceTotal.mockResolvedValue({
                breakdown: {
                    servicesTotal: 100,
                    medicinesTotal: 50,
                },
                subtotal: 150,
                insuranceAmount: 20,
                totalAmount: 130,
            });

            prisma.invoiceItem.findMany.mockResolvedValue([
                { item_type: 'service', refId: 'service-1' },
                { item_type: 'medicine', refId: 'pres-1' },
            ]);

            prisma.visitService.findMany.mockResolvedValue([
                {
                    quantity: 0,
                    price: 0,
                    status: 'cancelled',
                    medicalService: null,
                },
            ]);

            prisma.prescription.findMany.mockResolvedValue([
                {
                    medicineUsages: [
                        {
                            quantity: 0,
                            price: 0,
                            isPurchased: false,
                            medicine: null,
                        },
                    ],
                },
            ]);

            await invoiceService.sendInvoiceEmail(
                'invoice-id',
                'override@gmail.com'
            );

            expect(prisma.visitService.findMany).toHaveBeenCalledTimes(1);
            expect(prisma.prescription.findMany).toHaveBeenCalledTimes(1);
            expect(generateInvoiceEmailHTML).toHaveBeenCalledWith(
                expect.objectContaining({
                    patientName: 'Bệnh nhân',
                    hasInsurance: true,
                    insuranceCode: 'BH123',
                    insuranceLevel: 2,
                    payment: {
                        method: 'vnpay',
                        paidDate: createdAt.toISOString(),
                        transactionId: 'txn-1',
                    },
                    services: [
                        {
                            name: 'N/A',
                            quantity: 1,
                            unitPrice: 0,
                            totalPrice: 0,
                            status: 'cancelled',
                            isCancelled: true,
                        },
                    ],
                    medicines: [
                        {
                            name: 'N/A',
                            quantity: 1,
                            unitPrice: 0,
                            totalPrice: 0,
                            isPurchased: false,
                        },
                    ],
                })
            );
            expect(sendMail).toHaveBeenCalledWith(
                expect.objectContaining({
                    to: 'override@gmail.com',
                })
            );
        });

        it('dung fallback cho medicineUsages va isPurchased khi khong co payment', async () => {
            const createdAt = new Date('2025-01-01T10:00:00.000Z');

            invoiceDao.findById.mockResolvedValue({
                id: 'invoice-id',
                status: 'paid',
                createdAt,
                patient: {
                    userId: 'user-id',
                    user: {
                        email: 'patient@gmail.com',
                        name: {
                            firstName: 'Nguyen',
                            lastName: 'A',
                        },
                    },
                    healthInsurances: [],
                },
                payment: null,
            });

            calculateInvoiceTotal.mockResolvedValue({
                breakdown: {
                    servicesTotal: 100,
                    medicinesTotal: 50,
                },
                subtotal: 150,
                insuranceAmount: 0,
                totalAmount: 150,
            });

            prisma.invoiceItem.findMany.mockResolvedValue([
                { item_type: 'medicine', refId: 'pres-1' },
            ]);
            prisma.prescription.findMany.mockResolvedValue([
                {
                    medicineUsages: [
                        {
                            quantity: 0,
                            price: 0,
                            medicine: null,
                        },
                    ],
                },
                {},
            ]);

            await invoiceService.sendInvoiceEmail('invoice-id');

            expect(generateInvoiceEmailHTML).toHaveBeenCalledWith(
                expect.objectContaining({
                    medicines: [
                        {
                            name: 'N/A',
                            quantity: 1,
                            unitPrice: 0,
                            totalPrice: 0,
                            isPurchased: true,
                        },
                    ],
                })
            );
        });
    });

    describe('Tao hoa don', () => {
        it('nem loi neu patient khong ton tai', async () => {
            patientDao.getPatientById.mockResolvedValue(null);

            await expect(
                invoiceService.createInvoice({
                    patientId: 'patient-id',
                })
            ).rejects.toThrow('Patient not found');
        });

        it('tao invoice thanh cong voi du lieu co ban', async () => {
            patientDao.getPatientById.mockResolvedValue({
                id: 'patient-id',
            });

            prisma.$transaction.mockImplementation(async (callback: any) => {
                return callback({
                    invoice: {
                        create: jest.fn().mockResolvedValue({
                            id: 'invoice-id',
                        }),
                    },
                });
            });

            prisma.visitService.findMany.mockResolvedValue([]);
            prisma.prescription.findMany.mockResolvedValue([]);

            calculateInvoiceTotal.mockResolvedValue({
                subtotal: 100,
                discountAmount: 0,
                insuranceCoveragePercent: 80,
                insuranceAmount: 20,
                totalAmount: 80,
            });

            prisma.invoice.update.mockResolvedValue({
                id: 'invoice-id',
                patientId: 'patient-id',
                status: 'pending',
                discountAmount: 0,
                createdAt: new Date(),
                updatedAt: new Date(),
            });

            const result = await invoiceService.createInvoice({
                patientId: 'patient-id',
            });

            expect(result.id).toBe('invoice-id');
            expect(result.totalAmount).toBe(80);
        });

        it('tao invoice voi service, prescription va cac truong tuy chon', async () => {
            patientDao.getPatientById.mockResolvedValue({
                id: 'patient-id',
            });

            prisma.$transaction.mockImplementation(async (callback: any) => {
                return callback({
                    invoice: {
                        create: jest.fn().mockResolvedValue({
                            id: 'invoice-id',
                        }),
                    },
                });
            });

            prisma.visitService.findMany.mockResolvedValue([
                {
                    id: 'service-1',
                    quantity: 2,
                    price: 100,
                    medicalService: {
                        name: 'Kham tong quat',
                        description: 'Dich vu kham',
                    },
                },
            ]);

            prisma.prescription.findMany.mockResolvedValue([
                {
                    id: 'pres-1',
                    medicineUsages: [
                        { price: 10, quantity: 2 },
                        { price: 5, quantity: 1 },
                    ],
                },
            ]);

            prisma.invoiceItem.createMany.mockResolvedValue({});

            calculateInvoiceTotal.mockResolvedValue({
                subtotal: 100,
                discountAmount: 15,
                discountReason: 'Khuyen mai',
                insuranceCoveragePercent: 80,
                insuranceAmount: 20,
                totalAmount: 65,
            });

            prisma.invoice.update.mockResolvedValue({
                id: 'invoice-id',
                patientId: 'patient-id',
                status: 'pending',
                discountAmount: 15,
                healthInsuranceId: 'hi-1',
                discountReason: 'Khuyen mai',
                issuedByUserId: 'admin-1',
                notes: 'ghi chu',
                createdAt: new Date(),
                updatedAt: new Date(),
            });

            const result = await invoiceService.createInvoice({
                patientId: 'patient-id',
                notes: 'ghi chu',
                issuedBy: 'admin-1',
                healthInsuranceId: 'hi-1',
                discountAmount: 15,
                discountReason: 'Khuyen mai',
                serviceUsageIds: ['service-1'],
                prescriptionIds: ['pres-1'],
            });

            expect(prisma.invoiceItem.createMany).toHaveBeenCalledTimes(2);
            expect(prisma.invoice.update).toHaveBeenCalledWith({
                where: { id: 'invoice-id' },
                data: {
                    discountAmount: 15,
                    discountReason: 'Khuyen mai',
                    taxAmount: 0,
                    totalAmount: 65,
                },
            });
            expect(result.healthInsuranceId).toBe('hi-1');
            expect(result.discountReason).toBe('Khuyen mai');
            expect(result.issuedBy).toBe('admin-1');
            expect(result.notes).toBe('ghi chu');
        });

        it('dung gia tri mac dinh khi service khong co description va insuranceCoveragePercent bi thieu', async () => {
            patientDao.getPatientById.mockResolvedValue({
                id: 'patient-id',
            });

            prisma.$transaction.mockImplementation(async (callback: any) => {
                return callback({
                    invoice: {
                        create: jest.fn().mockResolvedValue({
                            id: 'invoice-id',
                        }),
                    },
                });
            });

            prisma.visitService.findMany.mockResolvedValue([
                {
                    id: 'service-1',
                    quantity: 1,
                    price: 100,
                    medicalService: {
                        name: 'Xet nghiem',
                    },
                },
            ]);
            prisma.prescription.findMany.mockResolvedValue([]);
            prisma.invoiceItem.createMany.mockResolvedValue({});

            calculateInvoiceTotal.mockResolvedValue({
                subtotal: 100,
                discountAmount: 0,
                insuranceAmount: 0,
                totalAmount: 100,
            });

            prisma.invoice.update.mockResolvedValue({
                id: 'invoice-id',
                patientId: 'patient-id',
                status: 'pending',
                discountAmount: 0,
                createdAt: new Date(),
                updatedAt: new Date(),
            });

            const result = await invoiceService.createInvoice({
                patientId: 'patient-id',
                serviceUsageIds: ['service-1'],
            });

            expect(prisma.invoiceItem.createMany).toHaveBeenCalledWith({
                data: [
                    expect.objectContaining({
                        description: '',
                    }),
                ],
            });
            expect(result.insuranceCoveragePercent).toBe(0);
        });
    });

    describe('Cap nhat hoa don', () => {
        it('nem loi neu invoice khong ton tai', async () => {
            invoiceDao.findById.mockResolvedValue(null);

            await expect(
                invoiceService.updateInvoice('invoice-id', {})
            ).rejects.toThrow('Invoice not found');
        });

        it('nem loi neu invoice da paid hoac cancelled', async () => {
            invoiceDao.findById.mockResolvedValue({
                status: 'paid',
            });

            await expect(
                invoiceService.updateInvoice('invoice-id', {})
            ).rejects.toThrow('Cannot update paid or cancelled invoice');

            invoiceDao.findById.mockResolvedValue({
                status: 'cancelled',
            });

            await expect(
                invoiceService.updateInvoice('invoice-id', {})
            ).rejects.toThrow('Cannot update paid or cancelled invoice');
        });

        it('cap nhat invoice thanh cong voi du lieu co ban', async () => {
            invoiceDao.findById.mockResolvedValue({
                status: 'pending',
            });

            invoiceDao.deleteAllInvoiceItems.mockResolvedValue({});
            prisma.visitService.findMany.mockResolvedValue([]);
            prisma.prescription.findMany.mockResolvedValue([]);

            calculateInvoiceTotal.mockResolvedValue({
                subtotal: 100,
                discountAmount: 0,
                insuranceCoveragePercent: 0,
                insuranceAmount: 0,
                totalAmount: 100,
            });

            invoiceDao.updateInvoice.mockResolvedValue({
                id: 'invoice-id',
                patientId: 'patient-id',
                status: 'pending',
                discountAmount: 0,
                createdAt: new Date(),
                updatedAt: new Date(),
            });

            const result = await invoiceService.updateInvoice('invoice-id', {});

            expect(result.id).toBe('invoice-id');
        });

        it('cap nhat invoice voi service, prescription va cac truong tuy chon', async () => {
            invoiceDao.findById.mockResolvedValue({
                status: 'pending',
            });

            invoiceDao.deleteAllInvoiceItems.mockResolvedValue({});

            prisma.visitService.findMany.mockResolvedValue([
                {
                    id: 'service-1',
                    quantity: 2,
                    price: 100,
                    medicalService: {
                        name: 'Kham tong quat',
                        description: 'Dich vu kham',
                    },
                },
            ]);

            prisma.prescription.findMany.mockResolvedValue([
                {
                    id: 'pres-1',
                    medicineUsages: [
                        { price: 10, quantity: 2 },
                        { price: 5, quantity: 1 },
                    ],
                },
            ]);

            prisma.invoiceItem.createMany.mockResolvedValue({});

            calculateInvoiceTotal.mockResolvedValue({
                subtotal: 100,
                discountAmount: 15,
                discountReason: 'Khuyen mai',
                insuranceCoveragePercent: 80,
                insuranceAmount: 20,
                totalAmount: 65,
            });

            invoiceDao.updateInvoice.mockResolvedValue({
                id: 'invoice-id',
                patientId: 'patient-id',
                status: 'pending',
                discountAmount: 15,
                healthInsuranceId: 'hi-1',
                discountReason: 'Khuyen mai',
                issuedByUserId: 'admin-1',
                notes: 'ghi chu',
                createdAt: new Date(),
                updatedAt: new Date(),
            });

            const result = await invoiceService.updateInvoice('invoice-id', {
                notes: 'ghi chu',
                issuedBy: 'admin-1',
                healthInsuranceId: 'hi-1',
                discountAmount: 15,
                discountReason: 'Khuyen mai',
                serviceUsageIds: ['service-1'],
                prescriptionIds: ['pres-1'],
            });

            expect(prisma.invoiceItem.createMany).toHaveBeenCalledTimes(2);
            expect(invoiceDao.updateInvoice).toHaveBeenCalledWith(
                'invoice-id',
                {
                    notes: 'ghi chu',
                    issuedByUserId: 'admin-1',
                    healthInsuranceId: 'hi-1',
                    discountAmount: 15,
                    taxAmount: 0,
                    totalAmount: 65,
                    discountReason: 'Khuyen mai',
                }
            );
            expect(result.healthInsuranceId).toBe('hi-1');
            expect(result.discountReason).toBe('Khuyen mai');
            expect(result.issuedBy).toBe('admin-1');
            expect(result.notes).toBe('ghi chu');
        });

        it('dung gia tri mac dinh khi service khong co description va insuranceCoveragePercent bi thieu', async () => {
            invoiceDao.findById.mockResolvedValue({
                status: 'pending',
            });

            invoiceDao.deleteAllInvoiceItems.mockResolvedValue({});

            prisma.visitService.findMany.mockResolvedValue([
                {
                    id: 'service-1',
                    quantity: 1,
                    price: 100,
                    medicalService: {
                        name: 'Xet nghiem',
                    },
                },
            ]);
            prisma.prescription.findMany.mockResolvedValue([]);
            prisma.invoiceItem.createMany.mockResolvedValue({});

            calculateInvoiceTotal.mockResolvedValue({
                subtotal: 100,
                discountAmount: 0,
                insuranceAmount: 0,
                totalAmount: 100,
            });

            invoiceDao.updateInvoice.mockResolvedValue({
                id: 'invoice-id',
                patientId: 'patient-id',
                status: 'pending',
                discountAmount: 0,
                createdAt: new Date(),
                updatedAt: new Date(),
            });

            const result = await invoiceService.updateInvoice('invoice-id', {
                serviceUsageIds: ['service-1'],
            });

            expect(prisma.invoiceItem.createMany).toHaveBeenCalledWith({
                data: [
                    expect.objectContaining({
                        description: '',
                    }),
                ],
            });
            expect(result.insuranceCoveragePercent).toBe(0);
        });
    });

    describe('Lay dich vu chua thanh toan', () => {
        it('tra ve rong neu khong tim thay benh nhan', async () => {
            prisma.patient.findFirst.mockResolvedValue(null);

            const result = await invoiceService.getUnpaidServices('patient-id');

            expect(result.patient).toBeNull();
            expect(result.unpaidPrescriptions).toEqual([]);
            expect(result.unpaidVisitServices).toEqual([]);
        });

        it('lay danh sach unpaid thanh cong', async () => {
            prisma.patient.findFirst.mockResolvedValue({
                userId: 'user-id',
                patientId: 'P001',
                user: {
                    id: 'user-id',
                    email: 'test@gmail.com',
                    phone: '0123',
                    birthday: new Date(),
                    name: {
                        firstName: 'Nguyen',
                        lastName: 'A',
                    },
                },
            });

            prisma.prescription.findMany.mockResolvedValue([{ id: 'pres-1' }]);
            prisma.visitService.findMany.mockResolvedValue([{ id: 'service-1' }]);

            const result = await invoiceService.getUnpaidServices('patient-id');

            expect(result.patient.fullName).toContain('Nguyen');
            expect(result.unpaidPrescriptions).toHaveLength(1);
            expect(result.unpaidVisitServices).toHaveLength(1);
        });

        it('dung gia tri fallback khi thong tin patient khong day du', async () => {
            prisma.patient.findFirst.mockResolvedValue({
                userId: 'user-id',
                patientId: 'P001',
                user: {
                    id: 'user-id',
                    email: null,
                    phone: null,
                    birthday: null,
                    name: {},
                },
            });

            prisma.prescription.findMany.mockResolvedValue([]);
            prisma.visitService.findMany.mockResolvedValue([]);

            const result = await invoiceService.getUnpaidServices('patient-id');

            expect(result.patient).toEqual({
                id: 'user-id',
                patientId: 'P001',
                fullName: '',
                email: null,
                phone: null,
                birthday: null,
            });
        });
    });

    describe('Them item vao hoa don', () => {
        it('nem loi neu invoice khong ton tai', async () => {
            invoiceDao.findByIdBasic.mockResolvedValue(null);

            await expect(
                invoiceService.addItemToInvoice('invoice-id', {} as any)
            ).rejects.toThrow('Invoice not found');
        });

        it('nem loi neu invoice da paid hoac cancelled', async () => {
            invoiceDao.findByIdBasic.mockResolvedValue({
                status: 'paid',
            });

            await expect(
                invoiceService.addItemToInvoice('invoice-id', {} as any)
            ).rejects.toThrow('Cannot add items to a paid or cancelled invoice');

            invoiceDao.findByIdBasic.mockResolvedValue({
                status: 'cancelled',
            });

            await expect(
                invoiceService.addItemToInvoice('invoice-id', {} as any)
            ).rejects.toThrow('Cannot add items to a paid or cancelled invoice');
        });

        it('them item thanh cong', async () => {
            invoiceDao.findByIdBasic.mockResolvedValue({
                status: 'pending',
            });

            invoiceDao.addItemToInvoice.mockResolvedValue({
                id: 'item-id',
            });

            calculateInvoiceTotal.mockResolvedValue({
                totalAmount: 100,
                discountAmount: 0,
            });

            prisma.invoice.update.mockResolvedValue({});

            const result = await invoiceService.addItemToInvoice('invoice-id', {
                item_type: 'service',
                refId: 'ref-id',
                name: 'Kham benh',
                quantity: 1,
                unitPrice: 100,
            });

            expect(result.id).toBe('item-id');
        });
    });

    describe('Xoa item khoi hoa don', () => {
        it('nem loi neu invoice khong ton tai', async () => {
            invoiceDao.findByIdBasic.mockResolvedValue(null);

            await expect(
                invoiceService.removeItemFromInvoice('invoice-id', 'item-id')
            ).rejects.toThrow('Invoice not found');
        });

        it('nem loi neu invoice da paid hoac cancelled', async () => {
            invoiceDao.findByIdBasic.mockResolvedValue({
                status: 'cancelled',
            });

            await expect(
                invoiceService.removeItemFromInvoice('invoice-id', 'item-id')
            ).rejects.toThrow(
                'Cannot remove items from a paid or cancelled invoice'
            );

            invoiceDao.findByIdBasic.mockResolvedValue({
                status: 'paid',
            });

            await expect(
                invoiceService.removeItemFromInvoice('invoice-id', 'item-id')
            ).rejects.toThrow(
                'Cannot remove items from a paid or cancelled invoice'
            );
        });

        it('nem loi neu item khong thuoc invoice', async () => {
            invoiceDao.findByIdBasic.mockResolvedValue({
                status: 'pending',
            });

            invoiceDao.verifyItemBelongsToInvoice.mockResolvedValue(false);

            await expect(
                invoiceService.removeItemFromInvoice('invoice-id', 'item-id')
            ).rejects.toThrow(
                'Invoice item not found or does not belong to this invoice'
            );
        });

        it('xoa item thanh cong', async () => {
            invoiceDao.findByIdBasic.mockResolvedValue({
                status: 'pending',
            });

            invoiceDao.verifyItemBelongsToInvoice.mockResolvedValue(true);
            invoiceDao.removeItemFromInvoice.mockResolvedValue({});

            calculateInvoiceTotal.mockResolvedValue({
                totalAmount: 100,
                discountAmount: 0,
            });

            prisma.invoice.update.mockResolvedValue({});

            const result = await invoiceService.removeItemFromInvoice(
                'invoice-id',
                'item-id'
            );

            expect(result.success).toBe(true);
        });
    });
});
