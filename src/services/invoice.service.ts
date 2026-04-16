import { invoiceDao } from '@src/daos/invoice.dao';
import { CustomError, ErrorType } from '@src/core/Error';
import { calculateInvoiceTotal } from '@src/helpers/calculateInvoiceTotal';
import prisma from '@src/config/prisma';
import {
    GetInvoicesQueryDataDto,
    InvoiceListResponse,
    CreateInvoiceBodyDataDto,
    CreateInvoiceResponse,
    InvoiceListItem,
    UpdateInvoiceBodyDataDto,
} from '@src/dtos/invoice.dto';
import mailService from '@src/services/mail.service';
import {
    generateInvoiceEmailHTML,
    InvoiceEmailData,
} from '@src/helpers/generateInvoiceEmailHTML';
import { EMAIL_FROM } from '@src/config/constants';
import patientDao from '@src/daos/patient.dao';
import { mapBenefitLevelToCoverage } from '@src/helpers/healthInsurance';
import { InvoiceItemType, MedicalService } from '@prisma/client';

export class InvoiceService {
    /**
     * Get list of invoices with filters and pagination
     */
    async getInvoices(
        query: GetInvoicesQueryDataDto
    ): Promise<InvoiceListResponse> {
        const result = await invoiceDao.findMany(query);

        const invoicesWithTotal: InvoiceListItem[] = await Promise.all(
            result.data.map(async (invoice: any) => {
                let total = 0;
                if (
                    invoice.status === 'paid' ||
                    invoice.status === 'cancelled'
                ) {
                    total = invoice.totalAmount;
                } else {
                    const computedTotal = await calculateInvoiceTotal(
                        invoice.id
                    );
                    total = computedTotal.totalAmount;
                }

                const firstName = invoice.patient.user?.name?.firstName || '';
                const lastName = invoice.patient.user?.name?.lastName || '';
                const fullName = `${firstName} ${lastName}`.trim() || 'N/A';

                return {
                    id: invoice.id,
                    userId: invoice.patientId,
                    status: invoice.status,
                    createdAt: invoice.createdAt,
                    updatedAt: invoice.updatedAt,
                    patient: {
                        patientId: invoice.patient.patientId,
                        userId: invoice.patient.userId,
                        fullName,
                        birthday: invoice.patient.user?.birthday || null,
                    },
                    computedTotal: {
                        total,
                    },
                    payment: invoice.payment,
                };
            })
        );

        return {
            data: invoicesWithTotal,
            pagination: result.metadata,
        };
    }

    /**
     * Get invoice detail with computed total
     */
    async getInvoiceById(id: string): Promise<any> {
        const invoice = await invoiceDao.findById(id);
        if (!invoice) {
            throw new CustomError(ErrorType.NOT_FOUND, 'Invoice not found');
        }

        const computedTotal = await calculateInvoiceTotal(id);

        // Extract patient name
        const firstName = invoice.patient.user?.name?.firstName || '';
        const lastName = invoice.patient.user?.name?.lastName || '';
        const fullName = `${firstName} ${lastName}`.trim() || 'N/A';

        // Fetch visit data if visitId exists
        let visitServices: any[] = [];
        let prescriptions: any[] = [];

        const invoiceItems = await prisma.invoiceItem.findMany({
            where: { invoiceId: invoice.id },
        });

        const visitServiceIds = invoiceItems
            .filter((item) => item.item_type === 'service' && item.refId)
            .map((item) => item.refId as string);

        const prescriptionIds = invoiceItems
            .filter((item) => item.item_type === 'medicine' && item.refId)
            .map((item) => item.refId as string);

        if (visitServiceIds.length > 0) {
            visitServices = await prisma.visitService.findMany({
                where: {
                    id: { in: visitServiceIds },
                },
                include: {
                    medicalService: true,
                },
            });
        }

        if (prescriptionIds.length > 0) {
            prescriptions = await prisma.prescription.findMany({
                where: {
                    id: { in: prescriptionIds },
                },
                include: {
                    medicineUsages: {
                        include: {
                            medicine: true,
                        },
                    },
                },
            });
        }

        console.log('visitServices', visitServices);
        console.log('prescriptions', prescriptions[0].medicineUsages[0]);

        // Transform visit services
        const transformedVisitServices = visitServices.map((service: any) => ({
            id: service.id,
            medicalServiceId: service.medicalServiceId,
            quantity: service.quantity,
            price: service.price,
            status: service.status || 'ordered',
            note: service.note || undefined,
            medicalService: {
                id: service.medicalService.id,
                name: service.medicalService.name,
                percentApplyHealthInsurance:
                    service.medicalService.percentApplyHealthInsurance,
            },
        }));

        // Transform prescriptions
        const transformedPrescriptions = prescriptions.map(
            (prescription: any) => ({
                id: prescription.id,
                paid: prescription.paid,
                medicineUsages: (prescription.medicineUsages || []).map(
                    (medicine: any) => ({
                        id: medicine.id,
                        medicineId: medicine.medicineId,
                        quantity: medicine.quantity,
                        price: medicine.price,
                        isPurchased: medicine.isPurchased !== false,
                        note: medicine.note || undefined,
                        medicine: {
                            id: medicine.medicine.id,
                            name: medicine.medicine.name,
                            unit: medicine.medicine.unit,
                        },
                    })
                ),
            })
        );

        return {
            id: invoice.id,
            userId: invoice.patientId,
            patientId: invoice.patient.patientId,
            healthInsuranceId: (invoice as any).healthInsuranceId,
            status: invoice.status,
            // Financial breakdown - use stored values if available, otherwise use computed
            subtotal: computedTotal.subtotal,
            discountAmount: computedTotal.discountAmount,
            discountReason: (invoice as any).discountReason,
            insuranceCoveragePercent: computedTotal.insuranceCoveragePercent,
            insuranceAmount: computedTotal.insuranceAmount,
            totalAmount: computedTotal.totalAmount,
            // Metadata
            notes: (invoice as any).notes,
            issuedBy: (invoice as any).issuedBy,
            createdAt: invoice.createdAt,
            updatedAt: invoice.updatedAt,
            patient: {
                userId: invoice.patient.userId,
                fullName,
                email: invoice.patient.user?.email,
                phone: invoice.patient.user?.phone,
                birthday: invoice.patient.user?.birthday || null,
            },
            healthInsurance: (invoice as any).healthInsurance
                ? {
                      id: (invoice as any).healthInsurance.id,
                      type: (invoice as any).healthInsurance.type,
                      insuranceId: (invoice as any).healthInsurance.insuranceId,
                      level_of_benefit: (invoice as any).healthInsurance
                          .level_of_benefit,
                      coverage: mapBenefitLevelToCoverage(
                          (invoice as any).healthInsurance.level_of_benefit
                      ),
                  }
                : undefined,
            visitServices: transformedVisitServices,
            prescriptions: transformedPrescriptions,
            payment: invoice.payment
                ? {
                      id: invoice.payment.id,
                      userName: invoice.payment.userName,
                      paymentMethod: invoice.payment.paymentMethod,
                      amount: invoice.payment.amount,
                      status: invoice.payment.status,
                      createdAt: invoice.payment.createdAt,
                  }
                : null,
            computedTotal,
        };
    }

    /**
     * Send invoice email to patient
     * Only allows sending email for paid invoices
     */
    async sendInvoiceEmail(
        invoiceId: string,
        emailOverride?: string
    ): Promise<{ success: boolean; message: string }> {
        // Get invoice with full details
        const invoice = await invoiceDao.findById(invoiceId);
        if (!invoice) {
            throw new CustomError(ErrorType.NOT_FOUND, 'Invoice not found');
        }

        // Check if invoice is paid
        if (invoice.status !== 'paid') {
            throw new CustomError(
                ErrorType.BAD_REQUEST,
                'Can only send email for paid invoices'
            );
        }

        // Get patient email
        const patientEmail =
            emailOverride || (invoice.patient.user as any)?.email;
        if (!patientEmail) {
            throw new CustomError(
                ErrorType.BAD_REQUEST,
                'Patient email not found'
            );
        }

        // Calculate invoice totals
        const computedTotal = await calculateInvoiceTotal(invoiceId);

        // Extract patient name
        const firstName = (invoice.patient.user as any)?.name?.firstName || '';
        const lastName = (invoice.patient.user as any)?.name?.lastName || '';
        const patientName = `${firstName} ${lastName}`.trim() || 'Bệnh nhân';

        // Fetch visit data if visitId exists
        let visitServices: any[] = [];
        let prescriptions: any[] = [];

        const invoiceItems = await prisma.invoiceItem.findMany({
            where: { invoiceId: invoice.id },
        });

        const visitServiceIds = invoiceItems
            .filter((item) => item.item_type === 'service' && item.refId)
            .map((item) => item.refId as string);

        const prescriptionIds = invoiceItems
            .filter((item) => item.item_type === 'medicine' && item.refId)
            .map((item) => item.refId as string);

        if (visitServiceIds.length > 0) {
            visitServices = await prisma.visitService.findMany({
                where: {
                    id: { in: visitServiceIds },
                },
                include: {
                    medicalService: true,
                },
            });
        }

        if (prescriptionIds.length > 0) {
            prescriptions = await prisma.prescription.findMany({
                where: {
                    id: { in: prescriptionIds },
                },
                include: {
                    medicineUsages: true,
                },
            });
        }

        // Prepare services data
        const services = visitServices.map((usage: any) => {
            const service = usage.medicalService as MedicalService | null;
            const isCancelled = usage.status === 'cancelled';
            return {
                name: service?.name || 'N/A',
                quantity: usage.quantity || 1,
                unitPrice: usage.price || 0,
                totalPrice: usage.price * usage.quantity,
                status: usage.status,
                isCancelled,
            };
        });

        // Prepare medicines data
        const medicines = prescriptions.flatMap((prescription: any) =>
            (prescription.medicineUsages || []).map((medicineUsage: any) => {
                const medicine = medicineUsage.medicine;
                return {
                    name: medicine?.name || 'N/A',
                    quantity: medicineUsage.quantity || 1,
                    unitPrice: medicineUsage.price || 0,
                    totalPrice: medicineUsage.price * medicineUsage.quantity,
                    isPurchased: medicineUsage.isPurchased ?? true,
                };
            })
        );

        // Get insurance info (take first active insurance)
        const healthInsurance = invoice.patient.healthInsurances?.[0];
        const hasInsurance = !!healthInsurance;
        const insuranceCode = healthInsurance?.insuranceId;
        const insuranceLevel = healthInsurance?.level_of_benefit ?? undefined;

        // Prepare payment info
        const payment = invoice.payment
            ? {
                  method: invoice.payment.paymentMethod,
                  paidDate: invoice.payment.createdAt.toISOString(),
                  transactionId: (invoice.payment as any).transactionId,
              }
            : undefined;

        // Prepare email data
        const emailData: InvoiceEmailData = {
            invoiceCode: invoice.id.substring(0, 8).toUpperCase(),
            patientName,
            patientCode: invoice.patient.userId.substring(0, 8).toUpperCase(),
            createdDate: invoice.createdAt.toISOString(),
            status: invoice.status,
            services,
            medicines,
            servicesTotal: computedTotal.breakdown.servicesTotal,
            medicinesTotal: computedTotal.breakdown.medicinesTotal,
            subtotal: computedTotal.subtotal,
            insuranceDiscount: computedTotal.insuranceAmount,
            total: computedTotal.totalAmount,
            hasInsurance,
            ...(insuranceCode && { insuranceCode }),
            ...(insuranceLevel !== undefined && { insuranceLevel }),
            ...(payment && { payment }),
        };

        // Generate HTML email
        const htmlContent = generateInvoiceEmailHTML(emailData);

        // Send email
        const transporter = mailService.getTransporter();
        await transporter.sendMail({
            from: EMAIL_FROM || 'noreply@hospital.vn',
            to: patientEmail,
            subject: `Hóa đơn thanh toán #${emailData.invoiceCode} - Bệnh viện Đa khoa Trung ương`,
            html: htmlContent,
        });

        return {
            success: true,
            message: `Invoice email sent successfully to ${patientEmail}`,
        };
    }

    /**
     * Create a new invoice manually
     * This allows creating invoices for a visit with its services and prescriptions
     */
    async createInvoice(
        data: CreateInvoiceBodyDataDto
    ): Promise<CreateInvoiceResponse> {
        // Validate patient exists
        const patient = await patientDao.getPatientById(data.patientId);
        if (!patient) {
            throw new CustomError(ErrorType.NOT_FOUND, 'Patient not found');
        }

        // Step 1: Create invoice
        const invoiceId = await prisma.$transaction(async (tx) => {
            const invoice = await tx.invoice.create({
                data: {
                    patientId: data.patientId,
                    status: 'pending',
                    notes: data.notes ?? null,
                    issuedByUserId: data.issuedBy ?? null,
                    healthInsuranceId: data.healthInsuranceId ?? null,
                },
            });
            return invoice.id;
        });

        const serviceUsages = await prisma.visitService.findMany({
            where: {
                id: { in: data.serviceUsageIds || [] },
            },
            include: {
                medicalService: true,
            },
        });

        const prescriptions = await prisma.prescription.findMany({
            where: {
                id: { in: data.prescriptionIds || [] },
            },
            include: {
                medicineUsages: true,
            },
        });

        await Promise.all([
            // Add service usages to invoice items
            (async () => {
                if (serviceUsages && serviceUsages.length > 0) {
                    const invoiceItemsData = serviceUsages.map((usage) => ({
                        invoiceId,
                        item_type: InvoiceItemType.service,
                        refId: usage.id,
                        name: usage.medicalService.name,
                        quantity: usage.quantity,
                        unitPrice: usage.price,
                        description: usage.medicalService.description || '',
                    }));
                    await prisma.invoiceItem.createMany({
                        data: invoiceItemsData,
                    });
                }
            })(),

            // Add prescriptions to invoice items
            (async () => {
                if (prescriptions && prescriptions.length > 0) {
                    const invoiceItemsData = prescriptions.map(
                        (prescription) => {
                            const totalPrice =
                                prescription.medicineUsages.reduce(
                                    (sum, usage) =>
                                        sum + usage.price * usage.quantity,
                                    0
                                );
                            return {
                                invoiceId,
                                item_type: InvoiceItemType.medicine,
                                refId: prescription.id,
                                name: `Prescription #${prescription.id
                                    .substring(0, 8)
                                    .toUpperCase()}`,
                                quantity: 1,
                                unitPrice: totalPrice,
                                description: `Medicines for prescription #${prescription.id
                                    .substring(0, 8)
                                    .toUpperCase()}`,
                            };
                        }
                    );
                    await prisma.invoiceItem.createMany({
                        data: invoiceItemsData,
                    });
                }
            })(),
        ]);

        // Step 2: Calculate financial data (after transaction committed)
        const financialData = await calculateInvoiceTotal(
            invoiceId,
            data.discountAmount,
            data.healthInsuranceId,
            data.discountReason
        );

        // Step 3: Update invoice with calculated financial data
        const updateData: any = {
            discountAmount: financialData.discountAmount,
        };

        // Add optional fields only if they have values
        if (financialData.discountReason) {
            updateData.discountReason = financialData.discountReason;
        }
        updateData.taxAmount = 0;
        updateData.totalAmount = financialData.totalAmount;

        const result = await prisma.invoice.update({
            where: { id: invoiceId },
            data: updateData,
        });

        // Return response
        const response: CreateInvoiceResponse = {
            id: result.id,
            patientId: result.patientId,
            status: result.status,
            subtotal: financialData.subtotal,
            discountAmount: result.discountAmount,
            insuranceCoveragePercent:
                financialData.insuranceCoveragePercent ?? 0,
            insuranceAmount: financialData.insuranceAmount,
            totalAmount: financialData.totalAmount,
            createdAt: result.createdAt,
            updatedAt: result.updatedAt,
        };

        // Add optional fields to response
        if (result.healthInsuranceId) {
            response.healthInsuranceId = result.healthInsuranceId;
        }
        if (result.discountReason) {
            response.discountReason = result.discountReason;
        }
        if (result.issuedByUserId) {
            response.issuedBy = result.issuedByUserId;
        }
        if (result.notes) {
            response.notes = result.notes;
        }

        return response;
    }

    /**
     * Update an existing invoice
     * Logic: Delete all old invoice items, then add new items from input
     */
    async updateInvoice(
        invoiceId: string,
        data: UpdateInvoiceBodyDataDto
    ): Promise<CreateInvoiceResponse> {
        // Validate invoice exists
        const existingInvoice = await invoiceDao.findById(invoiceId);
        if (!existingInvoice) {
            throw new CustomError(ErrorType.NOT_FOUND, 'Invoice not found');
        }

        // Check if invoice is already paid or cancelled
        if (
            existingInvoice.status === 'paid' ||
            existingInvoice.status === 'cancelled'
        ) {
            throw new CustomError(
                ErrorType.BAD_REQUEST,
                'Cannot update paid or cancelled invoice'
            );
        }

        // Step 1: Delete all old invoice items
        await invoiceDao.deleteAllInvoiceItems(invoiceId);

        // Step 2: Fetch new service usages and prescriptions
        const serviceUsages = await prisma.visitService.findMany({
            where: {
                id: { in: data.serviceUsageIds || [] },
            },
            include: {
                medicalService: true,
            },
        });

        const prescriptions = await prisma.prescription.findMany({
            where: {
                id: { in: data.prescriptionIds || [] },
            },
            include: {
                medicineUsages: true,
            },
        });

        // Step 3: Add new invoice items
        await Promise.all([
            // Add service usages to invoice items
            (async () => {
                if (serviceUsages && serviceUsages.length > 0) {
                    const invoiceItemsData = serviceUsages.map((usage) => ({
                        invoiceId,
                        item_type: InvoiceItemType.service,
                        refId: usage.id,
                        name: usage.medicalService.name,
                        quantity: usage.quantity,
                        unitPrice: usage.price,
                        description: usage.medicalService.description || '',
                    }));
                    await prisma.invoiceItem.createMany({
                        data: invoiceItemsData,
                    });
                }
            })(),

            // Add prescriptions to invoice items
            (async () => {
                if (prescriptions && prescriptions.length > 0) {
                    const invoiceItemsData = prescriptions.map(
                        (prescription) => {
                            const totalPrice =
                                prescription.medicineUsages.reduce(
                                    (sum, usage) =>
                                        sum + usage.price * usage.quantity,
                                    0
                                );
                            return {
                                invoiceId,
                                item_type: InvoiceItemType.medicine,
                                refId: prescription.id,
                                name: `Prescription #${prescription.id
                                    .substring(0, 8)
                                    .toUpperCase()}`,
                                quantity: 1,
                                unitPrice: totalPrice,
                                description: `Medicines for prescription #${prescription.id
                                    .substring(0, 8)
                                    .toUpperCase()}`,
                            };
                        }
                    );
                    await prisma.invoiceItem.createMany({
                        data: invoiceItemsData,
                    });
                }
            })(),
        ]);

        // Step 4: Calculate financial data
        const financialData = await calculateInvoiceTotal(
            invoiceId,
            data.discountAmount,
            data.healthInsuranceId,
            data.discountReason
        );

        // Step 5: Update invoice with new data
        const updateData: any = {
            notes: data.notes ?? null,
            issuedByUserId: data.issuedBy ?? null,
            healthInsuranceId: data.healthInsuranceId ?? null,
            discountAmount: financialData.discountAmount,
            taxAmount: 0,
            totalAmount: financialData.totalAmount,
        };

        // Add optional fields only if they have values
        if (financialData.discountReason) {
            updateData.discountReason = financialData.discountReason;
        }

        const result = await invoiceDao.updateInvoice(invoiceId, updateData);

        // Return response
        const response: CreateInvoiceResponse = {
            id: result.id,
            patientId: result.patientId,
            status: result.status,
            subtotal: financialData.subtotal,
            discountAmount: result.discountAmount,
            insuranceCoveragePercent:
                financialData.insuranceCoveragePercent ?? 0,
            insuranceAmount: financialData.insuranceAmount,
            totalAmount: financialData.totalAmount,
            createdAt: result.createdAt,
            updatedAt: result.updatedAt,
        };

        // Add optional fields to response
        if (result.healthInsuranceId) {
            response.healthInsuranceId = result.healthInsuranceId;
        }
        if (result.discountReason) {
            response.discountReason = result.discountReason;
        }
        if (result.issuedByUserId) {
            response.issuedBy = result.issuedByUserId;
        }
        if (result.notes) {
            response.notes = result.notes;
        }

        return response;
    }

    async getUnpaidServices(patientId: string) {
        const patient = await prisma.patient.findFirst({
            where: {
                OR: [{ userId: patientId }, { patientId: patientId }],
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: {
                            select: {
                                firstName: true,
                                lastName: true,
                            },
                        },
                        email: true,
                        phone: true,
                        birthday: true,
                    },
                },
            },
        });

        if (!patient) {
            return {
                patient: null,
                unpaidPrescriptions: [],
                unpaidVisitServices: [],
            };
        }

        const formattedPatient = patient
            ? {
                  id: patient.user.id,
                  patientId: patient.patientId,
                  fullName: `${patient.user.name?.firstName || ''} ${
                      patient.user.name?.lastName || ''
                  }`.trim(),
                  email: patient.user.email || null,
                  phone: patient.user.phone || null,
                  birthday: patient.user.birthday || null,
              }
            : null;
        const unpaidPrescriptions = await prisma.prescription.findMany({
            where: {
                visit: {
                    patientUserId: patient?.userId,
                },
                NOT: {
                    paid: true,
                },
            },
            include: {
                medicineUsages: {
                    include: {
                        medicine: true,
                    },
                },
            },
        });

        const unpaidVisitServices = await prisma.visitService.findMany({
            where: {
                visit: {
                    patientUserId: patient?.userId,
                },
                NOT: {
                    paid: true,
                },
            },
            include: {
                medicalService: true,
            },
        });
        return {
            patient: formattedPatient,
            unpaidPrescriptions,
            unpaidVisitServices,
        };
    }

    /**
     * Add item to invoice
     */
    async addItemToInvoice(
        invoiceId: string,
        data: {
            item_type: 'service' | 'medicine';
            refId: string;
            name: string;
            quantity: number;
            unitPrice: number;
            description?: string;
        }
    ) {
        // Verify invoice exists and is in editable state
        const invoice = await invoiceDao.findByIdBasic(invoiceId);
        if (!invoice) {
            throw new CustomError(ErrorType.NOT_FOUND, 'Invoice not found');
        }

        if (invoice.status === 'paid' || invoice.status === 'cancelled') {
            throw new CustomError(
                ErrorType.BAD_REQUEST,
                'Cannot add items to a paid or cancelled invoice'
            );
        }

        // Add item to invoice
        const invoiceItem = await invoiceDao.addItemToInvoice({
            invoiceId,
            ...data,
        });

        // Recalculate and update invoice total
        const computedTotal = await calculateInvoiceTotal(invoiceId);
        await prisma.invoice.update({
            where: { id: invoiceId },
            data: {
                totalAmount: computedTotal.totalAmount,
                discountAmount: computedTotal.discountAmount,
            },
        });

        return invoiceItem;
    }

    /**
     * Remove item from invoice
     */
    async removeItemFromInvoice(invoiceId: string, itemId: string) {
        // Verify invoice exists and is in editable state
        const invoice = await invoiceDao.findByIdBasic(invoiceId);
        if (!invoice) {
            throw new CustomError(ErrorType.NOT_FOUND, 'Invoice not found');
        }

        if (invoice.status === 'paid' || invoice.status === 'cancelled') {
            throw new CustomError(
                ErrorType.BAD_REQUEST,
                'Cannot remove items from a paid or cancelled invoice'
            );
        }

        // Verify item belongs to invoice
        const itemBelongsToInvoice =
            await invoiceDao.verifyItemBelongsToInvoice(itemId, invoiceId);
        if (!itemBelongsToInvoice) {
            throw new CustomError(
                ErrorType.NOT_FOUND,
                'Invoice item not found or does not belong to this invoice'
            );
        }

        // Remove item
        await invoiceDao.removeItemFromInvoice(itemId);

        // Recalculate and update invoice total
        const computedTotal = await calculateInvoiceTotal(invoiceId);
        await prisma.invoice.update({
            where: { id: invoiceId },
            data: {
                totalAmount: computedTotal.totalAmount,
                discountAmount: computedTotal.discountAmount,
            },
        });

        return { success: true, message: 'Item removed successfully' };
    }
}

export const invoiceService = new InvoiceService();
