import { PaymentStatus } from '@prisma/client';
import crypto from 'crypto';

/**
 * Sort object by keys alphabetically (required by VNPay)
 * @param obj - Object to sort
 * @returns Sorted object
 */
export function sortObject(obj: Record<string, any>): Record<string, string> {
    const sorted: Record<string, string> = {};
    const keys: string[] = [];

    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            keys.push(encodeURIComponent(key));
        }
    }

    keys.sort();

    for (let i = 0; i < keys.length; i++) {
        const encodedKey = keys[i];
        sorted[encodedKey as string] = encodeURIComponent(
            obj[keys[i] as string]
        ).replace(/%20/g, '+');
    }

    return sorted;
}

/**
 * Create secure hash for VNPay request (HMACSHA512)
 * @param data - Data object to hash
 * @param secretKey - VNPay secret key
 * @returns Secure hash string
 */
export function createSecureHash(
    data: Record<string, any>,
    secretKey: string
): string {
    // Sort object by keys
    const sortedData = sortObject(data);

    // Create query string manually (VNPay requires no encoding)
    const signData = Object.keys(sortedData)
        .map((key) => `${key}=${sortedData[key]}`)
        .join('&');

    // Create HMAC SHA512 hash
    const hmac = crypto.createHmac('sha512', secretKey);
    const secureHash = hmac
        .update(Buffer.from(signData, 'utf-8'))
        .digest('hex');

    return secureHash;
}

/**
 * Verify secure hash from VNPay response
 * @param data - Response data from VNPay
 * @param secureHash - Secure hash to verify
 * @param secretKey - VNPay secret key
 * @returns true if hash is valid, false otherwise
 */
export function verifySecureHash(
    data: Record<string, any>,
    secureHash: string,
    secretKey: string
): boolean {
    delete data.vnp_SecureHash;
    delete data.vnp_SecureHashType;

    // Create hash from data
    const calculatedHash = createSecureHash(data, secretKey);

    // Compare hashes
    return calculatedHash === secureHash;
}

/**
 * Format date to VNPay format (yyyyMMddHHmmss)
 * @param date - Date to format
 * @returns Formatted date string
 */
export function formatVNPayDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return `${year}${month}${day}${hours}${minutes}${seconds}`;
}

/**
 * Generate unique transaction reference (TxnRef)
 * @returns Transaction reference string
 */
export function generateTxnRef(): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000000);
    return `${timestamp}${random}`;
}

/**
 * Parse VNPay amount (VNPay uses amount * 100, no decimal)
 * @param amount - Amount in VND
 * @returns VNPay formatted amount
 */
export function formatVNPayAmount(amount: number): number {
    return Math.round(amount * 100);
}

/**
 * Parse VNPay amount to normal amount
 * @param vnpAmount - VNPay formatted amount
 * @returns Normal amount in VND
 */
export function parseVNPayAmount(vnpAmount: number): number {
    return vnpAmount / 100;
}

/**
 * Get VNPay response code message
 * @param responseCode - VNPay response code
 * @returns Message description
 */
export function getVNPayResponseMessage(responseCode: string): string {
    const messages: Record<string, string> = {
        '00': 'Giao dịch thành công',
        '07': 'Trừ tiền thành công. Giao dịch bị nghi ngờ (liên quan tới lừa đảo, giao dịch bất thường).',
        '09': 'Giao dịch không thành công do: Thẻ/Tài khoản của khách hàng chưa đăng ký dịch vụ InternetBanking tại ngân hàng.',
        '10': 'Giao dịch không thành công do: Khách hàng xác thực thông tin thẻ/tài khoản không đúng quá 3 lần',
        '11': 'Giao dịch không thành công do: Đã hết hạn chờ thanh toán. Xin quý khách vui lòng thực hiện lại giao dịch.',
        '12': 'Giao dịch không thành công do: Thẻ/Tài khoản của khách hàng bị khóa.',
        '13': 'Giao dịch không thành công do Quý khách nhập sai mật khẩu xác thực giao dịch (OTP). Xin quý khách vui lòng thực hiện lại giao dịch.',
        '24': 'Giao dịch không thành công do: Khách hàng hủy giao dịch',
        '51': 'Giao dịch không thành công do: Tài khoản của quý khách không đủ số dư để thực hiện giao dịch.',
        '65': 'Giao dịch không thành công do: Tài khoản của Quý khách đã vượt quá hạn mức giao dịch trong ngày.',
        '75': 'Ngân hàng thanh toán đang bảo trì.',
        '79': 'Giao dịch không thành công do: KH nhập sai mật khẩu thanh toán quá số lần quy định. Xin quý khách vui lòng thực hiện lại giao dịch',
        '99': 'Các lỗi khác (lỗi còn lại, không có trong danh sách mã lỗi đã liệt kê)',
    };

    return messages[responseCode] || 'Lỗi không xác định';
}

export function mapVNPayResult(
    responseCode?: string,
    transactionStatus?: string
): { status: PaymentStatus; message: string } {
    // Default
    let status: PaymentStatus = 'failed';
    let message = 'Unknown error';

    // Map transactionStatus (more specific in some cases)
    if (transactionStatus) {
        switch (transactionStatus) {
            case '00':
                status = 'completed';
                message = 'Giao dịch thành công';
                break;
            case '01':
                status = 'pending';
                message = 'Giao dịch chưa hoàn tất';
                break;
            case '02':
                status = 'failed';
                message = 'Giao dịch bị lỗi';
                break;
            case '04':
                status = 'failed';
                message = 'Giao dịch đảo (đã hoàn tiền/đang xử lý hoàn tiền)';
                break;
            case '05':
                status = 'processing';
                message = 'VNPAY đang xử lý giao dịch (GD hoàn tiền)';
                break;
            case '06':
                status = 'processing';
                message = 'VNPAY đã gửi yêu cầu hoàn tiền sang Ngân hàng';
                break;
            case '07':
                status = 'failed';
                message = 'Giao dịch nghi ngờ gian lận';
                break;
            case '09':
                status = 'failed';
                message = 'Giao dịch hoàn trả bị từ chối';
                break;
            default:
                // leave default, may be overwritten by responseCode below
                break;
        }
    }

    // Map responseCode (VNPay IPN/Return response code)
    if (responseCode) {
        switch (responseCode) {
            case '00':
                status = 'completed';
                message = 'Giao dịch thành công';
                break;
            case '07':
                // Trừ tiền thành công nhưng có nghi ngờ
                status = 'processing';
                message = 'Trừ tiền thành công - giao dịch bị nghi ngờ';
                break;
            case '09':
                status = 'failed';
                message = 'Tài khoản chưa đăng ký dịch vụ InternetBanking';
                break;
            case '10':
                status = 'failed';
                message =
                    'Xác thực thông tin thẻ/tài khoản không đúng quá 3 lần';
                break;
            case '11':
                status = 'failed';
                message = 'Giao dịch hết hạn chờ thanh toán';
                break;
            case '12':
                status = 'failed';
                message =
                    'Thẻ/Tài khoản bị khóa hoặc nhập sai mật khẩu xác thực';
                break;
            case '24':
                status = 'failed';
                message = 'Khách hàng hủy giao dịch';
                break;
            case '51':
                status = 'failed';
                message = 'Tài khoản không đủ số dư';
                break;
            case '65':
                status = 'failed';
                message = 'Tài khoản vượt hạn mức giao dịch trong ngày';
                break;
            case '75':
                status = 'failed';
                message = 'Ngân hàng thanh toán đang bảo trì';
                break;
            case '79':
                status = 'failed';
                message = 'Nhập sai mật khẩu nhiều lần - giao dịch thất bại';
                break;
            case '99':
                status = 'failed';
                message = 'Lỗi khác từ cổng thanh toán';
                break;
            default:
                // Do nothing - keep whatever transactionStatus provided
                break;
        }
    }

    // If nothing matched and transactionStatus or responseCode not provided
    if (!responseCode && !transactionStatus) {
        status = 'failed';
        message = 'Không có mã phản hồi từ VNPay';
    }

    return { status, message };
}
