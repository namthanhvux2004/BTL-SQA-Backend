// adminuser.service.spec.ts

jest.mock('@src/daos/adminuser.dao', () => ({
    __esModule: true,
    default: {
        getAllUserDao: jest.fn(),
        getAllStaffDao: jest.fn(),
        getStaffStatsDao: jest.fn(),
        getPatientStatsDao: jest.fn(),
    },
}));

jest.mock('@src/daos/role.dao', () => ({
    __esModule: true,
    default: {
        getRoleByName: jest.fn(),
    },
}));

jest.mock('@src/config/prisma', () => ({
    __esModule: true,
    default: {
        department: {
            findUnique: jest.fn(),
        },
        doctor: {
            findUnique: jest.fn(),
        },
        user: {
            findUnique: jest.fn(),
        },
        address: {
            create: jest.fn(),
            delete: jest.fn(),
        },
        authentication: {
            create: jest.fn(),
        },
        name: {
            create: jest.fn(),
            update: jest.fn(),
        },
        staff: {
            create: jest.fn(),
            update: jest.fn(),
        },
        patient: {
            create: jest.fn(),
        },
        doctorModel: {
            create: jest.fn(),
        },
        eHR: {
            create: jest.fn(),
        },
        $transaction: jest.fn(),
    },
}));

jest.mock('@src/helpers/generateCode', () => ({
    hashCode: jest.fn(),
}));

jest.mock('@src/helpers/generateId', () => ({
    generateIdForModel: jest.fn(),
}));

jest.mock('@src/helpers/queryBuilder', () => ({
    createQueryBuilder: jest.fn(),
}));

jest.mock('@src/services/otp.service', () => ({
    __esModule: true,
    default: {
        createAndSend: jest.fn(),
    },
}));

describe('adminuser.service', () => {
    let adminUserService: any;
    let adminUserDao: any;
    let roleService: any;
    let prisma: any;
    let hashCode: jest.Mock;
    let generateIdForModel: jest.Mock;
    let createQueryBuilder: jest.Mock;
    let otpService: any;

    beforeEach(() => {
        jest.resetModules();
        jest.clearAllMocks();

        adminUserService = require('@src/services/adminuser.service').default;

        adminUserDao = require('@src/daos/adminuser.dao').default;
        roleService = require('@src/daos/role.dao').default;
        prisma = require('@src/config/prisma').default;
        ({ hashCode } = require('@src/helpers/generateCode'));
        ({ generateIdForModel } = require('@src/helpers/generateId'));
        ({ createQueryBuilder } = require('@src/helpers/queryBuilder'));
        otpService = require('@src/services/otp.service').default;

        createQueryBuilder.mockReturnValue({
            findUnique: jest.fn().mockResolvedValue(null),
        });

        hashCode.mockResolvedValue('hashed-password');

        roleService.getRoleByName.mockResolvedValue({
            id: 'role-id',
            name: 'doctor',
            prefix: 'DOC',
        });

        generateIdForModel.mockResolvedValue('DOC001');

        otpService.createAndSend.mockResolvedValue({
            success: true,
        });

        prisma.$transaction.mockImplementation(async (callback: any) => {
            return await callback({
                address: {
                    create: jest.fn().mockResolvedValue({
                        id: 'address-id',
                    }),
                    delete: jest.fn(),
                },
                user: {
                    create: jest.fn().mockResolvedValue({
                        id: 'user-id',
                        email: 'doctor@gmail.com',
                    }),
                    update: jest.fn().mockResolvedValue({
                        id: 'user-id',
                        email: 'doctor@gmail.com',
                    }),
                },
                authentication: {
                    create: jest.fn(),
                },
                name: {
                    create: jest.fn(),
                    update: jest.fn(),
                },
                staff: {
                    create: jest.fn().mockResolvedValue({
                        id: 'staff-id',
                    }),
                    update: jest.fn().mockResolvedValue({
                        id: 'staff-id',
                    }),
                },
                doctor: {
                    create: jest.fn().mockResolvedValue({
                        id: 'doctor-id',
                    }),
                    update: jest.fn().mockResolvedValue({
                        id: 'doctor-id',
                    }),
                },
                patient: {
                    create: jest.fn().mockResolvedValue({
                        id: 'patient-id',
                        userId: 'user-id',
                    }),
                },
                eHR: {
                    create: jest.fn().mockResolvedValue({
                        id: 'ehr-id',
                    }),
                },
                counter: {},
            });
        });
    });

    describe('registerDoctor', () => {
        const payload = {
            email: 'doctor@gmail.com',
            password: '123456',
            birthday: '2000-01-01',
            name: {
                firstName: 'Nguyen',
                lastName: 'Van A',
            },
            address: {
                province: 'HN',
                ward: 'ABC',
                street: '123',
            },
            staffData: {},
            doctorData: {},
        };

        it('đăng ký doctor thành công', async () => {
            const result =
                await adminUserService.registerDoctor(payload);

            expect(result.data.user.id).toBe('user-id');
            expect(hashCode).toHaveBeenCalled();
            expect(otpService.createAndSend).toHaveBeenCalled();
        });

        it('ném lỗi nếu email đã tồn tại', async () => {
            createQueryBuilder.mockReturnValue({
                findUnique: jest.fn().mockResolvedValue({
                    id: 'existing-user',
                }),
            });

            await expect(
                adminUserService.registerDoctor(payload)
            ).rejects.toThrow('Email đã tồn tại.');
        });

        it('ném lỗi nếu role không tồn tại', async () => {
            roleService.getRoleByName.mockResolvedValue(null);

            await expect(
                adminUserService.registerDoctor(payload)
            ).rejects.toThrow('Chức năng chưa triển khai cho Doctor');
        });

        it('ném lỗi nếu birthday không hợp lệ', async () => {
            await expect(
                adminUserService.registerDoctor({
                    ...payload,
                    birthday: 'invalid-date',
                })
            ).rejects.toThrow('Ngày sinh không hợp lệ');
        });

        it('ném lỗi nếu department không tồn tại', async () => {
            prisma.department.findUnique.mockResolvedValue(null);

            await expect(
                adminUserService.registerDoctor({
                    ...payload,
                    staffData: {
                        departmentId: 'dept-id',
                    },
                })
            ).rejects.toThrow('Khoa không tồn tại');
        });

        it('ném lỗi nếu licenseNumber đã tồn tại', async () => {
            prisma.department.findUnique.mockResolvedValue({
                id: 'dept-id',
            });

            prisma.doctor.findUnique.mockResolvedValue({
                id: 'doctor-id',
            });

            await expect(
                adminUserService.registerDoctor({
                    ...payload,
                    staffData: {
                        departmentId: 'dept-id',
                    },
                    doctorData: {
                        licenseNumber: 'LIC001',
                    },
                })
            ).rejects.toThrow(
                'Số giấy phép hành nghề đã tồn tại.'
            );
        });

        it('ném lỗi internal khi transaction fail', async () => {
            prisma.$transaction.mockRejectedValue(new Error());

            await expect(
                adminUserService.registerDoctor(payload)
            ).rejects.toThrow(
                'Đăng ký tài khoản thất bại. Vui lòng thử lại'
            );
        });
    });

    describe('updateDoctor', () => {
        beforeEach(() => {
            prisma.user.findUnique.mockResolvedValue({
                id: 'user-id',
                email: 'doctor@gmail.com',
                addressId: 'address-id',
            });
        });

        it('update doctor thành công', async () => {
            const result = await adminUserService.updateDoctor(
                {
                    name: {},
                    address: {
                        province: 'HN',
                    },
                    staffData: {},
                    doctorData: {},
                },
                'user-id'
            );

            expect(result.data.user.id).toBe('user-id');
            expect(otpService.createAndSend).toHaveBeenCalled();
        });

        it('ném lỗi nếu user không tồn tại', async () => {
            prisma.user.findUnique.mockResolvedValue(null);

            await expect(
                adminUserService.updateDoctor(
                    {
                        name: {},
                        staffData: {},
                        doctorData: {},
                    },
                    'user-id'
                )
            ).rejects.toThrow('User không tồn tại');
        });

        it('ném lỗi internal khi update thất bại', async () => {
            prisma.$transaction.mockRejectedValue(new Error());

            await expect(
                adminUserService.updateDoctor(
                    {
                        name: {},
                        staffData: {},
                        doctorData: {},
                    },
                    'user-id'
                )
            ).rejects.toThrow(
                'Update tài khoản thất bại. Vui lòng thử lại'
            );
        });
    });

    describe('registerAdmin', () => {
        const payload = {
            email: 'admin@gmail.com',
            password: '123456',
            birthday: '2000-01-01',
            name: {},
            address: {
                province: 'HN',
            },
            staffData: {},
        };

        it('đăng ký admin thành công', async () => {
            roleService.getRoleByName.mockResolvedValue({
                id: 'role-id',
                name: 'admin',
                prefix: 'ADM',
            });

            const result =
                await adminUserService.registerAdmin(payload);

            expect(result.data.user.id).toBe('user-id');
        });

        it('ném lỗi nếu role admin không tồn tại', async () => {
            roleService.getRoleByName.mockResolvedValue(null);

            await expect(
                adminUserService.registerAdmin(payload)
            ).rejects.toThrow('Chức năng chưa triển khai cho Admin');
        });

        it('ném lỗi nếu transaction fail', async () => {
            prisma.$transaction.mockRejectedValue(new Error());

            await expect(
                adminUserService.registerAdmin(payload)
            ).rejects.toThrow(
                'Đăng ký tài khoản thất bại. Vui lòng thử lại'
            );
        });
    });

    describe('updateAdmin', () => {
        beforeEach(() => {
            prisma.user.findUnique.mockResolvedValue({
                id: 'admin-id',
                email: 'admin@gmail.com',
                addressId: 'address-id',
            });
        });

        it('update admin thành công', async () => {
            const result = await adminUserService.updateAdmin(
                {
                    name: {},
                    address: {
                        province: 'HN',
                    },
                    staffData: {},
                },
                'admin-id'
            );

            expect(result.data.user.id).toBe('user-id');
        });

        it('ném lỗi nếu admin không tồn tại', async () => {
            prisma.user.findUnique.mockResolvedValue(null);

            await expect(
                adminUserService.updateAdmin(
                    {
                        name: {},
                        staffData: {},
                    },
                    'admin-id'
                )
            ).rejects.toThrow('User không tồn tại');
        });
    });

    describe('registerPatient', () => {
        const payload = {
            email: 'patient@gmail.com',
            password: '123456',
            birthday: '2000-01-01',
            name: {},
            address: {
                province: 'HN',
            },
        };

        it('đăng ký patient thành công', async () => {
            roleService.getRoleByName.mockResolvedValue({
                id: 'role-id',
                name: 'patient',
                prefix: 'PAT',
            });

            generateIdForModel.mockResolvedValue('PAT001');

            const result =
                await adminUserService.registerPatient(payload);

            expect(result.data.user.id).toBe('user-id');
        });

        it('ném lỗi nếu role patient không tồn tại', async () => {
            roleService.getRoleByName.mockResolvedValue(null);

            await expect(
                adminUserService.registerPatient(payload)
            ).rejects.toThrow(
                'Chức năng chưa triển khai cho bệnh nhân'
            );
        });

        it('ném lỗi internal nếu transaction fail', async () => {
            prisma.$transaction.mockRejectedValue(new Error());

            await expect(
                adminUserService.registerPatient(payload)
            ).rejects.toThrow(
                'Đăng ký tài khoản thất bại. Vui lòng thử lại'
            );
        });
    });

    describe('updateUserProfile', () => {
        beforeEach(() => {
            prisma.user.findUnique.mockResolvedValue({
                id: 'user-id',
                addressId: 'address-id',
            });
        });

        it('update profile thành công', async () => {
            const result =
                await adminUserService.updateUserProfile(
                    {
                        name: {},
                        address: {
                            province: 'HN',
                        },
                    },
                    'user-id'
                );

            expect(result.data.user.id).toBe('user-id');
        });

        it('ném lỗi nếu user không tồn tại', async () => {
            prisma.user.findUnique.mockResolvedValue(null);

            await expect(
                adminUserService.updateUserProfile(
                    {
                        name: {},
                    },
                    'user-id'
                )
            ).rejects.toThrow('User không tồn tại');
        });

        it('ném lỗi internal nếu update fail', async () => {
            prisma.$transaction.mockRejectedValue(new Error());

            await expect(
                adminUserService.updateUserProfile(
                    {
                        name: {},
                    },
                    'user-id'
                )
            ).rejects.toThrow(
                'Cập nhật thông tin thất bại. Vui lòng thử lại'
            );
        });
    });

    describe('các hàm thống kê và danh sách', () => {
        it('getAllPatient', async () => {
            adminUserDao.getAllUserDao.mockResolvedValue([]);

            const result =
                await adminUserService.getAllPatient({});

            expect(result).toEqual([]);
        });

        it('getAllStaff', async () => {
            adminUserDao.getAllStaffDao.mockResolvedValue([]);

            const result =
                await adminUserService.getAllStaff({});

            expect(result).toEqual([]);
        });

        it('getStaffStats', async () => {
            adminUserDao.getStaffStatsDao.mockResolvedValue({
                total: 10,
            });

            const result =
                await adminUserService.getStaffStats();

            expect(result.total).toBe(10);
        });

        it('getPatientStats', async () => {
            adminUserDao.getPatientStatsDao.mockResolvedValue({
                total: 20,
            });

            const result =
                await adminUserService.getPatientStats();

            expect(result.total).toBe(20);
        });
    });
});