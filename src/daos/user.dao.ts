import prisma from '@src/config/prisma';
import { CustomError, ErrorType } from '@src/core/Error';
import { UpdateUserProfileDataDto } from '@src/dtos/user.dto';

// Lấy thông tin cá nhân của user
export const getUserProfile = async (userId: string) => {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            username: true,
            email: true,
            avatar: true,
            birthday: true,
            gender: true,
            phone: true,
            citizen_id: true,
            createdAt: true,
            updatedAt: true,
            roleId: true,
            role: {
                select: {
                    id: true,
                    name: true,
                    prefix: true,
                },
            },
            name: {
                select: {
                    firstName: true,
                    lastName: true,
                },
            },
            address: {
                select: {
                    id: true,
                    detail: true,
                    ward: true,
                    district: true,
                    city: true,
                    country: true,
                },
            },
            authentication: {
                select: {
                    isVerified: true,
                    lastLogin: true,
                },
            },
        },
    });
    if (!user) {
        throw new CustomError(ErrorType.NOT_FOUND, 'Người dùng không tồn tại');
    }
    if (user.roleId === 1) {
        const patientInfor = await prisma.patient.findFirst({
            where: {
                userId: user.id,
            },
            include: {
                healthInsurances: true,
                healthInfo: true,
                emergencyContacts: true,
                ehr: true,
            },
        });
        if (!patientInfor) {
            throw new CustomError(
                ErrorType.NOT_FOUND,
                'Không tìm thấy thông tin bệnh nhân'
            );
        }
        return { ...user, patient: patientInfor };
    } else if (user.roleId === 2) {
        const doctorInfor = await prisma.staff.findFirst({
            where: {
                userId: user.id,
            },
            include: {
                doctor: true,
                department: true,
            },
        });
        if (!doctorInfor) {
            throw new CustomError(
                ErrorType.NOT_FOUND,
                'Không tìm thấy thông tin bác sĩ'
            );
        }
        return { ...user, staff: doctorInfor };
    } else {
        const staffInfor = await prisma.staff.findFirst({
            where: {
                userId: user.id,
            },
            include: {
                department: true,
            },
        });
        if (!staffInfor) {
            throw new CustomError(
                ErrorType.NOT_FOUND,
                'Không tìm thấy thông tin nhân viên'
            );
        }
        return { ...user, staff: staffInfor };
    }
};

// Cập nhật thông tin cá nhân
export const updateUserProfile = async (
    userId: string,
    data: UpdateUserProfileDataDto
) => {
    const { address, name, ...userData } = data;

    return prisma.$transaction(async (prisma) => {
        // Cập nhật thông tin User
        const updateUser = await prisma.user.update({
            where: { id: userId },
            data: {
                ...(userData.avatar !== undefined && {
                    avatar: { set: userData.avatar },
                }),
                ...(userData.citizen_id !== undefined && {
                    citizen_id: { set: userData.citizen_id },
                }),
                ...(userData.email !== undefined && {
                    email: { set: userData.email },
                }),
                ...(userData.birthday !== undefined && {
                    birthday: { set: userData.birthday },
                }),
                ...(userData.gender !== undefined && {
                    gender: { set: userData.gender },
                }),
                ...(userData.phone !== undefined && {
                    phone: { set: userData.phone },
                }),
            },
        });

        if (address) {
            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: { addressId: true },
            });

            const { district, ...addressData } = address;

            if (user?.addressId) {
                await prisma.address.update({
                    where: { id: user.addressId },
                    data: district ? address : addressData,
                });
            } else {
                const newAddress = await prisma.address.create({
                    data: district ? address : addressData,
                });
                await prisma.user.update({
                    where: { id: userId },
                    data: { addressId: newAddress.id },
                });
            }
        }

        if (name) {
            await prisma.name.upsert({
                where: { userId },
                update: {
                    firstName: name.firstname,
                    lastName: name.lastname,
                },
                create: {
                    firstName: name.firstname,
                    lastName: name.lastname,
                    userId,
                },
            });
        }

        return updateUser;
    });
};

// Lấy thông tin tài khoản (chỉ username, email, trạng thái xác thực)
export const getAccountInfo = async (userId: string) => {
    return prisma.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            username: true,
            email: true,
            createdAt: true,
            updatedAt: true,
            authentication: {
                select: {
                    isVerified: true,
                    lastLogin: true,
                },
            },
            role: {
                select: {
                    name: true,
                    prefix: true,
                },
            },
        },
    });
};

// Lấy user với password
export const getUserWithPassword = async (userId: string) => {
    return prisma.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            password: true,
            email: true,
            username: true,
        },
    });
};
