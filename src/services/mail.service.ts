import nodemailer from 'nodemailer';
import {
    EMAIL_HOST,
    EMAIL_PORT,
    EMAIL_USER,
    EMAIL_PASS,
} from '@src/config/constants';

class MailService {
    private transporter: nodemailer.Transporter;

    constructor() {
        this.transporter = nodemailer.createTransport({
            host: EMAIL_HOST,
            port: parseInt(EMAIL_PORT || '587'),
            secure: false, // true for 465, false for other ports
            auth: {
                user: EMAIL_USER,
                pass: EMAIL_PASS,
            },
        });
    }

    /**
     * Get transporter để có thể sử dụng trong OTP Service
     */
    getTransporter(): nodemailer.Transporter {
        return this.transporter;
    }
}

const mailService = new MailService();
export default mailService;
