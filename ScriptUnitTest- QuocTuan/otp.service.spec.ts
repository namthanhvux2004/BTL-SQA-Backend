jest.mock('@src/config/prisma', () => ({
    __esModule: true,
    default: {
        verificationCode: {
            deleteMany: jest.fn(),
            create: jest.fn(),
            findFirst: jest.fn(),
            updateMany: jest.fn(),
        },
    },
}));

jest.mock('@src/services/mail.service', () => ({
    __esModule: true,
    default: {
        getTransporter: jest.fn(),
    },
}));

jest.mock('@src/helpers/generateCode', () => ({
    compareCode: jest.fn(),
    hashCode: jest.fn(),
}));

jest.mock('fs', () => ({
    readFileSync: jest.fn(),
}));

describe('otp.service - Luồng xử lý OTP', () => {
    let otpService: any;
    let OTPServiceFactory: any;
    let prisma: any;
    let mailService: any;
    let compareCode: jest.Mock;
    let hashCode: jest.Mock;
    let fs: { readFileSync: jest.Mock };

    beforeEach(() => {
        jest.resetModules();
        jest.clearAllMocks();
        jest.spyOn(console, 'log').mockImplementation(() => undefined);
        jest.spyOn(console, 'error').mockImplementation(() => undefined);

        otpService = require('@src/services/otp.service').default;
        ({ OTPServiceFactory } = require('@src/services/otp.service'));
        prisma = require('@src/config/prisma').default;
        mailService = require('@src/services/mail.service').default;
        ({ compareCode, hashCode } = require('@src/helpers/generateCode'));
        fs = require('fs');

        fs.readFileSync.mockReturnValue(`
            OTP: {{OTP}}
            Expire: {{EXPIRE_IN}}
        `);

        mailService.getTransporter.mockReturnValue({
            sendMail: jest.fn().mockResolvedValue(true),
        });
    });

    describe('Tạo và gửi OTP', () => {
        it('gửi OTP thành công khi dữ liệu hợp lệ', async () => {
            prisma.verificationCode.findFirst.mockResolvedValue(null);
            hashCode.mockResolvedValue('hashed-otp');
            prisma.verificationCode.deleteMany.mockResolvedValue({});
            prisma.verificationCode.create.mockResolvedValue({});

            const result = await otpService.createAndSend(
                'test@gmail.com',
                'REGISTER',
                'user-id',
                'OTP Test'
            );

            expect(result).toEqual({
                success: true,
                message: 'Đã gửi OTP thành công',
                time: 300,
            });
            expect(hashCode).toHaveBeenCalledTimes(1);
            expect(prisma.verificationCode.deleteMany).toHaveBeenCalledTimes(1);
            expect(prisma.verificationCode.create).toHaveBeenCalledTimes(1);
            expect(mailService.getTransporter).toHaveBeenCalledTimes(1);
        });

        it('báo lỗi nếu người dùng yêu cầu lại OTP quá sớm', async () => {
            prisma.verificationCode.findFirst.mockResolvedValue({
                lastResendAt: new Date(),
            });

            const result = await otpService.createAndSend(
                'test@gmail.com',
                'REGISTER',
                'user-id',
                'OTP Test'
            );

            expect(result.success).toBe(false);
            expect(result.time).toBe(300);
            expect(result.message).toContain('60');
            expect(hashCode).not.toHaveBeenCalled();
            expect(prisma.verificationCode.create).not.toHaveBeenCalled();
        });

        it('báo gửi OTP thất bại nếu quá trình gửi mail lỗi', async () => {
            prisma.verificationCode.findFirst.mockResolvedValue(null);
            hashCode.mockResolvedValue('hashed-otp');
            prisma.verificationCode.deleteMany.mockResolvedValue({});
            prisma.verificationCode.create.mockResolvedValue({});
            mailService.getTransporter.mockReturnValue({
                sendMail: jest.fn().mockRejectedValue(new Error('Mail Error')),
            });

            const result = await otpService.createAndSend(
                'test@gmail.com',
                'REGISTER',
                'user-id',
                'OTP Test'
            );

            expect(result.success).toBe(false);
            expect(result.time).toBe(300);
        });

        it('vẫn cho gửi OTP nếu trước đó chưa có bản ghi nào', async () => {
            prisma.verificationCode.findFirst.mockResolvedValue(null);
            hashCode.mockResolvedValue('hashed-otp');
            prisma.verificationCode.deleteMany.mockResolvedValue({});
            prisma.verificationCode.create.mockResolvedValue({});

            const result = await otpService.createAndSend(
                'test@gmail.com',
                'REGISTER',
                null,
                'OTP Test'
            );

            expect(result.success).toBe(true);
        });

        it('vẫn cho gửi OTP nếu chưa có thời điểm gửi lại gần nhất', async () => {
            prisma.verificationCode.findFirst.mockResolvedValue({
                lastResendAt: null,
            });
            hashCode.mockResolvedValue('hashed-otp');
            prisma.verificationCode.deleteMany.mockResolvedValue({});
            prisma.verificationCode.create.mockResolvedValue({});

            const result = await otpService.createAndSend(
                'test@gmail.com',
                'REGISTER',
                null,
                'OTP Test'
            );

            expect(result.success).toBe(true);
        });

        it('tự dùng type và userId mặc định nếu không truyền vào', async () => {
            prisma.verificationCode.findFirst.mockResolvedValue(null);
            hashCode.mockResolvedValue('hashed-otp');
            prisma.verificationCode.deleteMany.mockResolvedValue({});
            prisma.verificationCode.create.mockResolvedValue({});

            const result = await otpService.createAndSend(
                'default@gmail.com',
                undefined,
                undefined,
                'OTP Test'
            );

            expect(result.success).toBe(true);
            expect(prisma.verificationCode.deleteMany).toHaveBeenCalledWith({
                where: {
                    email: 'default@gmail.com',
                    type: 'REGISTER',
                    used: false,
                },
            });
            expect(prisma.verificationCode.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        userId: null,
                        email: 'default@gmail.com',
                        type: 'REGISTER',
                    }),
                })
            );
        });
    });

    describe('Gửi lại OTP', () => {
        it('gửi lại OTP thành công qua luồng createAndSend', async () => {
            prisma.verificationCode.findFirst.mockResolvedValue(null);
            hashCode.mockResolvedValue('hashed-otp');
            prisma.verificationCode.deleteMany.mockResolvedValue({});
            prisma.verificationCode.create.mockResolvedValue({});

            const result = await otpService.resend(
                'test@gmail.com',
                'REGISTER',
                'Resend OTP'
            );

            expect(result.success).toBe(true);
        });

        it('tự dùng type REGISTER nếu không truyền vào', async () => {
            prisma.verificationCode.findFirst.mockResolvedValue(null);
            hashCode.mockResolvedValue('hashed-otp');
            prisma.verificationCode.deleteMany.mockResolvedValue({});
            prisma.verificationCode.create.mockResolvedValue({});

            const result = await otpService.resend(
                'test@gmail.com',
                undefined,
                'Resend OTP'
            );

            expect(result.success).toBe(true);
            expect(prisma.verificationCode.deleteMany).toHaveBeenCalledWith({
                where: {
                    email: 'test@gmail.com',
                    type: 'REGISTER',
                    used: false,
                },
            });
        });
    });

    describe('Xác thực OTP', () => {
        it('xác thực thành công khi mã OTP đúng', async () => {
            prisma.verificationCode.findFirst.mockResolvedValue({
                code: 'hashed-otp',
            });
            compareCode.mockResolvedValue(true);
            prisma.verificationCode.updateMany.mockResolvedValue({});

            const result = await otpService.verify(
                'test@gmail.com',
                '123456',
                'REGISTER'
            );

            expect(result.success).toBe(true);
            expect(prisma.verificationCode.updateMany).toHaveBeenCalledTimes(1);
        });

        it('trả về false khi mã OTP không đúng', async () => {
            prisma.verificationCode.findFirst.mockResolvedValue({
                code: 'hashed-otp',
            });
            compareCode.mockResolvedValue(false);

            const result = await otpService.verify(
                'test@gmail.com',
                '000000',
                'REGISTER'
            );

            expect(result.success).toBe(false);
            expect(prisma.verificationCode.updateMany).not.toHaveBeenCalled();
        });

        it('trả về false khi không tìm thấy OTP', async () => {
            prisma.verificationCode.findFirst.mockResolvedValue(null);

            const result = await otpService.verify(
                'test@gmail.com',
                '123456',
                'REGISTER'
            );

            expect(result.success).toBe(false);
        });

        it('trả về false nếu có lỗi xảy ra trong lúc xác thực', async () => {
            prisma.verificationCode.findFirst.mockImplementation(() => {
                throw new Error('DB Error');
            });

            const result = await otpService.verify(
                'test@gmail.com',
                '123456',
                'REGISTER'
            );

            expect(result.success).toBe(false);
        });

        it('tự dùng type REGISTER nếu không truyền vào', async () => {
            prisma.verificationCode.findFirst.mockResolvedValue({
                code: 'hashed-otp',
            });
            compareCode.mockResolvedValue(true);
            prisma.verificationCode.updateMany.mockResolvedValue({});

            const result = await otpService.verify('test@gmail.com', '123456');

            expect(result.success).toBe(true);
            expect(prisma.verificationCode.updateMany).toHaveBeenCalledWith({
                where: {
                    email: 'test@gmail.com',
                    type: 'REGISTER',
                    used: false,
                },
                data: {
                    used: true,
                },
            });
        });
    });

    describe('Xóa OTP', () => {
        it('xóa các bản ghi OTP theo email và loại', async () => {
            prisma.verificationCode.deleteMany.mockResolvedValue({});

            await otpService.delete('test@gmail.com', 'REGISTER');

            expect(prisma.verificationCode.deleteMany).toHaveBeenCalledWith({
                where: {
                    email: 'test@gmail.com',
                    type: 'REGISTER',
                },
            });
        });

        it('tự dùng type REGISTER nếu không truyền vào', async () => {
            prisma.verificationCode.deleteMany.mockResolvedValue({});

            await otpService.delete('test@gmail.com');

            expect(prisma.verificationCode.deleteMany).toHaveBeenCalledWith({
                where: {
                    email: 'test@gmail.com',
                    type: 'REGISTER',
                },
            });
        });
    });

    describe('Bộ nhớ đệm template email', () => {
        it('chỉ đọc template một lần rồi dùng lại cho các lần sau', async () => {
            prisma.verificationCode.findFirst.mockResolvedValue(null);
            hashCode.mockResolvedValue('hashed-otp');
            prisma.verificationCode.deleteMany.mockResolvedValue({});
            prisma.verificationCode.create.mockResolvedValue({});

            await otpService.createAndSend(
                'a@gmail.com',
                'REGISTER',
                null,
                'OTP Test'
            );

            await otpService.createAndSend(
                'b@gmail.com',
                'REGISTER',
                null,
                'OTP Test'
            );

            expect(fs.readFileSync).toHaveBeenCalledTimes(1);
        });

        it('báo thất bại nếu không đọc được template ở mọi thư mục đã cấu hình', async () => {
            prisma.verificationCode.findFirst.mockResolvedValue(null);
            hashCode.mockResolvedValue('hashed-otp');
            prisma.verificationCode.deleteMany.mockResolvedValue({});
            prisma.verificationCode.create.mockResolvedValue({});
            fs.readFileSync.mockImplementation(() => {
                throw new Error('Template not found');
            });

            const result = await otpService.createAndSend(
                'test@gmail.com',
                'REGISTER',
                null,
                'OTP Test'
            );

            expect(result.success).toBe(false);
            expect(fs.readFileSync).toHaveBeenCalledTimes(2);
        });

        it('dùng lỗi fallback khi việc đọc template không ném ra error object', async () => {
            prisma.verificationCode.findFirst.mockResolvedValue(null);
            hashCode.mockResolvedValue('hashed-otp');
            prisma.verificationCode.deleteMany.mockResolvedValue({});
            prisma.verificationCode.create.mockResolvedValue({});
            fs.readFileSync.mockImplementation(() => {
                throw undefined;
            });

            const result = await otpService.createAndSend(
                'test@gmail.com',
                'REGISTER',
                null,
                'OTP Test'
            );

            expect(result.success).toBe(false);
            expect(fs.readFileSync).toHaveBeenCalledTimes(2);
        });
    });

    describe('Nhà máy tạo OTPService', () => {
        it('tạo được dịch vụ OTP email dạng chữ và số', async () => {
            const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0);
            const alphanumericService =
                OTPServiceFactory.createEmailAlphanumericOTPService();

            prisma.verificationCode.findFirst.mockResolvedValue(null);
            hashCode.mockResolvedValue('hashed-alpha-otp');
            prisma.verificationCode.deleteMany.mockResolvedValue({});
            prisma.verificationCode.create.mockResolvedValue({});

            const result = await alphanumericService.createAndSend(
                'alpha@gmail.com',
                'REGISTER',
                null,
                undefined
            );

            expect(result.success).toBe(true);
            expect(hashCode).toHaveBeenCalledWith('AAAAAA');
            expect(mailService.getTransporter().sendMail).toHaveBeenCalledWith(
                expect.objectContaining({
                    subject: 'Your OTP Code',
                })
            );

            randomSpy.mockRestore();
        });

        it('tạo được dịch vụ OTP số qua SMS', async () => {
            const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0);
            const smsService = OTPServiceFactory.createSMSNumericOTPService();

            prisma.verificationCode.findFirst.mockResolvedValue(null);
            hashCode.mockResolvedValue('hashed-sms-otp');
            prisma.verificationCode.deleteMany.mockResolvedValue({});
            prisma.verificationCode.create.mockResolvedValue({});

            const result = await smsService.createAndSend(
                '0123456789',
                'REGISTER',
                null,
                'SMS OTP'
            );

            expect(result.success).toBe(true);
            expect(hashCode).toHaveBeenCalledWith('000000');
            expect(mailService.getTransporter).not.toHaveBeenCalled();

            randomSpy.mockRestore();
        });
    });
});
