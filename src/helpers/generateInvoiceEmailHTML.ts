import fs from 'fs';
import path from 'path';

// Use CommonJS __dirname for compatibility
declare const __dirname: string;

/**
 * Interface representing the invoice data structure needed for email generation
 */
interface InvoiceEmailData {
    invoiceCode: string;
    patientName: string;
    patientCode: string;
    createdDate: string;
    status: string;
    services: Array<{
        name: string;
        quantity: number;
        unitPrice: number;
        totalPrice: number;
        status?: string;
        isCancelled?: boolean;
    }>;
    medicines: Array<{
        name: string;
        quantity: number;
        unitPrice: number;
        totalPrice: number;
        isPurchased?: boolean;
    }>;
    servicesTotal: number;
    medicinesTotal: number;
    subtotal: number;
    insuranceDiscount: number;
    total: number;
    hasInsurance: boolean;
    insuranceCode?: string;
    insuranceLevel?: number;
    payment?: {
        method: string;
        paidDate: string;
        transactionId?: string;
    };
}

/**
 * Format number to currency string with thousands separator
 */
function formatCurrency(amount: number): string {
    return amount.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * Format date to Vietnamese locale
 */
function formatDate(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    });
}

/**
 * Get status display text
 */
function getStatusText(status: string): string {
    const statusMap: Record<string, string> = {
        paid: 'Đã thanh toán',
        pending: 'Chờ thanh toán',
        cancelled: 'Đã hủy',
        needs_review: 'Cần kiểm tra',
    };
    return statusMap[status] || status;
}

/**
 * Get payment method display text
 */
function getPaymentMethodText(method: string): string {
    const methodMap: Record<string, string> = {
        debit_card: 'Thẻ ghi nợ',
        bank_transfer: 'Chuyển khoản',
        vnpay: 'VNPay',
        momo: 'MoMo',
        cash_on_delivery: 'Tiền mặt',
        credit_card: 'Thẻ tín dụng',
    };
    return methodMap[method] || method;
}

/**
 * Generate services table HTML
 */
function generateServicesTable(services: InvoiceEmailData['services']): string {
    if (!services || services.length === 0) {
        return '';
    }

    const rows = services
        .map((service, index) => {
            const rowClass = service.isCancelled ? 'cancelled' : '';
            const statusText = service.isCancelled ? ' (Đã hủy)' : '';

            return `
            <tr class="${rowClass}">
                <td class="text-center">${index + 1}</td>
                <td>${service.name}${statusText}</td>
                <td class="text-center">${service.quantity}</td>
                <td class="text-right">${formatCurrency(service.unitPrice)}</td>
                <td class="text-right">${formatCurrency(service.totalPrice)}</td>
            </tr>`;
        })
        .join('');

    return `
        <div class="section-title">Dịch vụ khám chữa bệnh</div>
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th class="text-center" style="width: 50px;">STT</th>
                        <th>Tên dịch vụ</th>
                        <th class="text-center" style="width: 80px;">Số lượng</th>
                        <th class="text-right" style="width: 120px;">Đơn giá</th>
                        <th class="text-right" style="width: 120px;">Thành tiền</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows}
                </tbody>
            </table>
        </div>`;
}

/**
 * Generate medicines table HTML
 */
function generateMedicinesTable(
    medicines: InvoiceEmailData['medicines']
): string {
    if (!medicines || medicines.length === 0) {
        return '';
    }

    const rows = medicines
        .map((medicine, index) => {
            const rowClass =
                medicine.isPurchased === false ? 'not-purchased' : '';
            const statusText =
                medicine.isPurchased === false ? ' (Không mua)' : '';

            return `
            <tr class="${rowClass}">
                <td class="text-center">${index + 1}</td>
                <td>${medicine.name}${statusText}</td>
                <td class="text-center">${medicine.quantity}</td>
                <td class="text-right">${formatCurrency(medicine.unitPrice)}</td>
                <td class="text-right">${formatCurrency(medicine.totalPrice)}</td>
            </tr>`;
        })
        .join('');

    return `
        <div class="section-title">Thuốc và vật tư y tế</div>
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th class="text-center" style="width: 50px;">STT</th>
                        <th>Tên thuốc</th>
                        <th class="text-center" style="width: 80px;">Số lượng</th>
                        <th class="text-right" style="width: 120px;">Đơn giá</th>
                        <th class="text-right" style="width: 120px;">Thành tiền</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows}
                </tbody>
            </table>
        </div>`;
}

/**
 * Generate insurance information HTML
 */
function generateInsuranceInfo(data: InvoiceEmailData): string {
    if (!data.hasInsurance || data.insuranceDiscount === 0) {
        return '';
    }

    const levelText = data.insuranceLevel ? `Mức ${data.insuranceLevel}` : '';
    const codeText = data.insuranceCode ? `Mã thẻ: ${data.insuranceCode}` : '';

    return `
        <div class="insurance-info">
            <p><strong>📋 Thông tin bảo hiểm y tế</strong></p>
            <p>${codeText} ${levelText ? `- ${levelText}` : ''}</p>
            <p>Số tiền được giảm: <strong>${formatCurrency(data.insuranceDiscount)} VNĐ</strong></p>
        </div>`;
}

/**
 * Generate payment information HTML
 */
function generatePaymentInfo(payment: InvoiceEmailData['payment']): string {
    if (!payment) {
        return '';
    }

    return `
        <div class="divider"></div>
        <div class="section-title">Thông tin thanh toán</div>
        <div class="invoice-info">
            <div class="invoice-info-row">
                <span class="invoice-info-label">Phương thức thanh toán:</span>
                <span class="invoice-info-value">${getPaymentMethodText(payment.method)}</span>
            </div>
            <div class="invoice-info-row">
                <span class="invoice-info-label">Ngày thanh toán:</span>
                <span class="invoice-info-value">${formatDate(payment.paidDate)}</span>
            </div>
            ${payment.transactionId ? `<div class="invoice-info-row"><span class="invoice-info-label">Mã giao dịch:</span><span class="invoice-info-value">${payment.transactionId}</span></div>` : ''}
        </div>`;
}

/**
 * Generate invoice email HTML from template and data
 * @param invoiceData - The invoice data to populate in the template
 * @returns HTML string ready to be sent via email
 */
export function generateInvoiceEmailHTML(
    invoiceData: InvoiceEmailData
): string {
    // Read the template file
    const templatePath = path.join(
        __dirname,
        '../templates/invoice-email.html'
    );
    let html = fs.readFileSync(templatePath, 'utf-8');

    // Replace placeholders with actual data
    html = html.replace(/{{HOSPITAL_NAME}}/g, 'Bệnh viện Đa khoa ABC');
    html = html.replace(
        /{{HOSPITAL_ADDRESS}}/g,
        '110 Trần Phú, phường Mộ Lao, quận Hà Đông, Hà Nội'
    );
    html = html.replace(/{{HOSPITAL_PHONE}}/g, '1900 6789');
    html = html.replace(/{{HOSPITAL_EMAIL}}/g, 'info@hospital.vn');

    html = html.replace(/{{INVOICE_CODE}}/g, invoiceData.invoiceCode);
    html = html.replace(/{{PATIENT_NAME}}/g, invoiceData.patientName);
    html = html.replace(/{{PATIENT_CODE}}/g, invoiceData.patientCode);
    html = html.replace(
        /{{CREATED_DATE}}/g,
        formatDate(invoiceData.createdDate)
    );
    html = html.replace(/{{STATUS}}/g, getStatusText(invoiceData.status));

    // Generate dynamic sections
    html = html.replace(
        /{{SERVICES_SECTION}}/g,
        generateServicesTable(invoiceData.services)
    );
    html = html.replace(
        /{{MEDICINES_SECTION}}/g,
        generateMedicinesTable(invoiceData.medicines)
    );
    html = html.replace(
        /{{INSURANCE_INFO}}/g,
        generateInsuranceInfo(invoiceData)
    );
    html = html.replace(
        /{{PAYMENT_INFO}}/g,
        generatePaymentInfo(invoiceData.payment)
    );

    // Replace totals
    html = html.replace(
        /{{SERVICES_TOTAL}}/g,
        formatCurrency(invoiceData.servicesTotal)
    );
    html = html.replace(
        /{{MEDICINES_TOTAL}}/g,
        formatCurrency(invoiceData.medicinesTotal)
    );
    html = html.replace(/{{SUBTOTAL}}/g, formatCurrency(invoiceData.subtotal));
    html = html.replace(
        /{{INSURANCE_DISCOUNT}}/g,
        formatCurrency(invoiceData.insuranceDiscount)
    );
    html = html.replace(/{{TOTAL}}/g, formatCurrency(invoiceData.total));

    return html;
}

export type { InvoiceEmailData };
