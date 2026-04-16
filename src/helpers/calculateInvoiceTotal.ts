import prisma from '@src/config/prisma';
import { CustomError, ErrorType } from '@src/core/Error';
import { mapBenefitLevelToCoverage } from './healthInsurance';
import { HealthInsurance } from '@prisma/client';

export async function calculateInvoiceTotal(
    invoiceId: string,
    discountAmount: number = 0,
    healthInsuranceId?: string,
    discountReason?: string
): Promise<{
    subtotal: number;
    taxAmount: number;
    discountAmount: number;
    discountReason?: string;
    insuranceCoveragePercent: number;
    insuranceAmount: number;
    totalAmount: number;
    healthInsuranceId?: string;
    breakdown: {
        servicesTotal: number;
        medicinesTotal: number;
        serviceCount: number;
        medicineCount: number;
    };
}> {
    // Fetch invoice with all related data through Visit
    const invoice = await prisma.invoice.findUnique({
        where: { id: invoiceId },
    });

    if (!invoice) {
        throw new CustomError(ErrorType.NOT_FOUND, 'Hóa đơn không tồn tại');
    }

    // Fetch Visit data if visitId exists
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

    console.log('visitServiceIds', visitServiceIds);
    console.log('prescriptionIds', prescriptionIds);

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

    const serviceUsages = visitServices;
    const activeServiceUsages = serviceUsages.filter(
        (usage: any) => usage.status !== 'cancelled'
    );

    // Get health insurance info first (needed for service calculation)
    let insuranceCoveragePercent = 0;
    let healthInsurance: HealthInsurance | null = null;
    const selectedHealthInsuranceId =
        healthInsuranceId ?? invoice.healthInsuranceId;
    if (selectedHealthInsuranceId) {
        healthInsurance = await prisma.healthInsurance.findUnique({
            where: { id: selectedHealthInsuranceId },
        });
    }
    if (healthInsurance && healthInsurance.level_of_benefit) {
        healthInsuranceId = healthInsurance.id;
        const benefitLevel = healthInsurance.level_of_benefit;
        insuranceCoveragePercent = mapBenefitLevelToCoverage(benefitLevel);
    }

    // Calculate services total and insurance amount for services
    let servicesTotal = 0;
    let insuranceAmountForServices = 0;

    for (const usage of activeServiceUsages) {
        const itemTotal = usage.price * usage.quantity;
        servicesTotal += itemTotal;

        if (
            usage.medicalService.percentApplyHealthInsurance > 0 &&
            insuranceCoveragePercent > 0
        ) {
            const effectiveCoveragePercent = Math.min(
                usage.medicalService.percentApplyHealthInsurance,
                insuranceCoveragePercent
            );

            insuranceAmountForServices +=
                itemTotal * (effectiveCoveragePercent / 100);
        }
    }

    // Calculate medicines total and insurance amount for medicines (only purchased medicines)
    let medicinesTotal = 0;
    let medicineCount = 0;
    let insuranceAmountForMedicines = 0;

    for (const prescription of prescriptions) {
        const medicineUsages =
            prescription.medicineUsages ??
            (Array.isArray(prescription.medicineUsage)
                ? prescription.medicineUsage
                : prescription.medicineUsage
                  ? [prescription.medicineUsage]
                  : []);

        for (const medicineUsage of medicineUsages) {
            // Only count if explicitly purchased (default is true if field doesn't exist)
            const isPurchased = (medicineUsage as any).isPurchased ?? true;
            if (isPurchased) {
                const itemTotal = medicineUsage.price * medicineUsage.quantity;
                medicinesTotal += itemTotal;
                medicineCount++;

                // Apply insurance coverage for medicines
                if (insuranceCoveragePercent > 0) {
                    insuranceAmountForMedicines +=
                        itemTotal * (insuranceCoveragePercent / 100);
                }
            }
        }
    }

    const taxAmount = 0;

    const subtotal = servicesTotal + medicinesTotal;

    // Total insurance amount (services + medicines)
    const insuranceAmount =
        insuranceAmountForServices + insuranceAmountForMedicines;

    // Calculate total: subtotal - discount - insurance
    const totalAmount = Math.max(
        0,
        subtotal - discountAmount - insuranceAmount + taxAmount
    );

    const result: {
        subtotal: number;
        discountAmount: number;
        discountReason?: string;
        insuranceCoveragePercent: number;
        insuranceAmount: number;
        taxAmount: number;
        totalAmount: number;
        healthInsuranceId?: string;
        breakdown: {
            servicesTotal: number;
            medicinesTotal: number;
            serviceCount: number;
            medicineCount: number;
        };
    } = {
        taxAmount,
        subtotal: Math.round(subtotal * 100) / 100,
        discountAmount: Math.round(discountAmount * 100) / 100,
        insuranceCoveragePercent,
        insuranceAmount: Math.round(insuranceAmount * 100) / 100,
        totalAmount: Math.round(totalAmount * 100) / 100,
        breakdown: {
            servicesTotal: Math.round(servicesTotal * 100) / 100,
            medicinesTotal: Math.round(medicinesTotal * 100) / 100,
            serviceCount: activeServiceUsages.length,
            medicineCount,
        },
    };

    if (discountReason) {
        result.discountReason = discountReason;
    }

    if (selectedHealthInsuranceId) {
        result.healthInsuranceId = selectedHealthInsuranceId;
    }

    return result;
}
