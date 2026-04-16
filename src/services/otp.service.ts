import { compareCode, hashCode } from '@src/helpers/generateCode';
import prisma from '@src/config/prisma';
import mailService from './mail.service';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface IOTPGenerator {
    generate(length: number): string;
}

interface IOTPHasher {
    hash(otp: string): Promise<string>;
    verify(otp: string, hashedOTP: string): Promise<boolean>;
}

interface IOTPSender {
    send(
        to: string,
        otp: string,
        expiresInSeconds: number,
        title?: string
    ): Promise<boolean>;
}

interface IOTPStorage {
    save(
        userId: string | null,
        email: string,
        hashedOTP: string,
        type: string,
        expiresInSeconds: number
    ): Promise<void>;
    get(email: string, type: string): Promise<string | null>;
    verify(email: string, type: string, otp: string): Promise<boolean>;
    delete(email: string, type: string): Promise<void>;
    canResend(
        email: string,
        type: string,
        cooldownSeconds: number
    ): Promise<boolean>;
}

class AlphanumericOTPGenerator implements IOTPGenerator {
    private readonly characters =
        'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    generate(length: number): string {
        const charArray: string[] = [];
        for (let i = 0; i < length; i++) {
            const randomIndex = Math.floor(
                Math.random() * this.characters.length
            );
            charArray.push(this.characters.charAt(randomIndex));
        }
        return charArray.join('');
    }
}

class NumericOTPGenerator implements IOTPGenerator {
    generate(length: number): string {
        const digits = '0123456789';
        const charArray: string[] = [];
        for (let i = 0; i < length; i++) {
            const randomIndex = Math.floor(Math.random() * digits.length);
            charArray.push(digits.charAt(randomIndex));
        }
        return charArray.join('');
    }
}

class BCryptOTPHasher implements IOTPHasher {
    async hash(otp: string): Promise<string> {
        return await hashCode(otp);
    }

    async verify(otp: string, hashedOTP: string): Promise<boolean> {
        return await compareCode(otp, hashedOTP);
    }
}

class PrismaOTPStorage implements IOTPStorage {
    async save(
        userId: string | null,
        email: string,
        hashedOTP: string,
        type: string,
        expiresInSeconds: number
    ): Promise<void> {
        await prisma.verificationCode.deleteMany({
            where: {
                email,
                type,
                used: false,
            },
        });

        await prisma.verificationCode.create({
            data: {
                userId,
                email,
                code: hashedOTP,
                type,
                expiresAt: new Date(Date.now() + expiresInSeconds * 1000),
                used: false,
                lastResendAt: new Date(),
            },
        });
    }

    async get(email: string, type: string): Promise<string | null> {
        const record = await prisma.verificationCode.findFirst({
            where: {
                email,
                type,
                used: false,
                expiresAt: {
                    gt: new Date(),
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        return record ? record.code : null;
    }

    async verify(email: string, type: string, otp: string): Promise<boolean> {
        const hashedOTP = await this.get(email, type);
        if (!hashedOTP) return false;

        const hasher = new BCryptOTPHasher();
        const isValid = await hasher.verify(otp, hashedOTP);

        if (isValid) {
            // Đánh dấu OTP đã sử dụng
            await prisma.verificationCode.updateMany({
                where: {
                    email,
                    type,
                    used: false,
                },
                data: {
                    used: true,
                },
            });
        }

        return isValid;
    }

    async delete(email: string, type: string): Promise<void> {
        await prisma.verificationCode.deleteMany({
            where: {
                email,
                type,
            },
        });
    }

    async canResend(
        email: string,
        type: string,
        cooldownSeconds: number
    ): Promise<boolean> {
        const record = await prisma.verificationCode.findFirst({
            where: {
                email,
                type,
                used: false,
            },
            orderBy: {
                lastResendAt: 'desc',
            },
        });

        if (!record || !record.lastResendAt) return true;

        const timeSinceLastResend = Date.now() - record.lastResendAt.getTime();
        return timeSinceLastResend >= cooldownSeconds * 1000;
    }
}

class EmailOTPSender implements IOTPSender {
    private templateCache: Map<string, string> = new Map();

    private getTemplate(templateName: string): string {
        if (this.templateCache.has(templateName)) {
            return this.templateCache.get(templateName)!;
        }

        const templatePath = path.join(
            __dirname,
            `../templates/${templateName}.html`
        );
        const template = fs.readFileSync(templatePath, 'utf-8');
        this.templateCache.set(templateName, template);
        return template;
    }

    async send(
        to: string,
        otp: string,
        expiresInSeconds: number,
        title?: string
    ): Promise<boolean> {
        try {
            let htmlTemplate = this.getTemplate('verification-otp-email');
            htmlTemplate = htmlTemplate.replace('{{OTP}}', otp);
            htmlTemplate = htmlTemplate.replace(
                '{{EXPIRE_IN}}',
                expiresInSeconds.toString()
            );

            await mailService.getTransporter().sendMail({
                from: process.env.EMAIL_FROM,
                to,
                subject: title || 'Your OTP Code',
                html: htmlTemplate,
            });

            console.log(`OTP email sent to ${to}`);
            return true;
        } catch (error) {
            console.error('Error sending OTP email:', error);
            throw new Error('Failed to send OTP email');
        }
    }
}

class SMSOTPSender implements IOTPSender {
    async send(
        to: string,
        otp: string,
        expiresInSeconds: number
    ): Promise<boolean> {
        // TODO: Implement SMS sending logic
        console.log(
            `SMS OTP would be sent to ${to}: ${otp} (expires in ${expiresInSeconds}s)`
        );
        return true;
    }
}

export interface IOTPServiceConfig {
    otpLength?: number;
    expiresInSeconds?: number;
    resendCooldownSeconds?: number;
}

class OTPService {
    private readonly otpLength: number;
    private readonly expiresInSeconds: number;
    private readonly resendCooldownSeconds: number;

    constructor(
        private generator: IOTPGenerator,
        private hasher: IOTPHasher,
        private sender: IOTPSender,
        private storage: IOTPStorage,
        config: IOTPServiceConfig = {}
    ) {
        this.otpLength = config.otpLength || 6;
        this.expiresInSeconds = config.expiresInSeconds || 300;
        this.resendCooldownSeconds = config.resendCooldownSeconds || 60;
    }

    async createAndSend(
        email: string,
        type: string = 'REGISTER',
        userId: string | null = null,
        title: string
    ): Promise<{ success: boolean; message: string; time: number }> {
        try {
            const canResend = await this.storage.canResend(
                email,
                type,
                this.resendCooldownSeconds
            );
            if (!canResend) {
                return {
                    time: this.expiresInSeconds,
                    success: false,
                    message: `Hãy đợi ${this.resendCooldownSeconds} giây trước khi yêu cầu OTP mới`,
                };
            }

            const otp = this.generator.generate(this.otpLength);

            const hashedOTP = await this.hasher.hash(otp);

            await this.storage.save(
                userId,
                email,
                hashedOTP,
                type,
                this.expiresInSeconds
            );

            await this.sender.send(email, otp, this.expiresInSeconds, title);

            return {
                success: true,
                message: 'Đã gửi OTP thành công',
                time: this.expiresInSeconds,
            };
        } catch {
            return {
                success: false,
                message: 'Gửi OTP thất bại. Vui lòng thử lại sau',
                time: this.expiresInSeconds,
            };
        }
    }

    async resend(email: string, type: string = 'REGISTER', title: string) {
        return await this.createAndSend(email, type, null, title);
    }

    async verify(
        email: string,
        otp: string,
        type: string = 'REGISTER'
    ): Promise<{ success: boolean; message: string }> {
        try {
            const isValid = await this.storage.verify(email, type, otp);

            if (isValid) {
                return {
                    success: true,
                    message: 'OTP xác thực thành công',
                };
            }

            return {
                success: false,
                message: 'Mã OTP không chính xác hoặc đã hết hạn',
            };
        } catch {
            return {
                success: false,
                message: 'Xác thực OTP thất bại. Vui lòng thử lại sau',
            };
        }
    }

    async delete(email: string, type: string = 'REGISTER'): Promise<void> {
        await this.storage.delete(email, type);
    }
}

export class OTPServiceFactory {
    static createEmailNumericOTPService(
        config?: IOTPServiceConfig
    ): OTPService {
        return new OTPService(
            new NumericOTPGenerator(),
            new BCryptOTPHasher(),
            new EmailOTPSender(),
            new PrismaOTPStorage(),
            config
        );
    }

    static createEmailAlphanumericOTPService(
        config?: IOTPServiceConfig
    ): OTPService {
        return new OTPService(
            new AlphanumericOTPGenerator(),
            new BCryptOTPHasher(),
            new EmailOTPSender(),
            new PrismaOTPStorage(),
            config
        );
    }

    static createSMSNumericOTPService(config?: IOTPServiceConfig): OTPService {
        return new OTPService(
            new NumericOTPGenerator(),
            new BCryptOTPHasher(),
            new SMSOTPSender(),
            new PrismaOTPStorage(),
            config
        );
    }
}

const otpService = OTPServiceFactory.createEmailNumericOTPService({
    otpLength: 6,
    expiresInSeconds: 300, // 5 phút
    resendCooldownSeconds: 60, // 1 phút
});

export default otpService;
