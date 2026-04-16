import doctorDao from '@src/daos/doctor.dao';
import {
    DoctorQuerySchema,
    GetDoctorByIdSchema,
    GetDoctorsBySpecializationSchema,
    DoctorResponseDto,
    DoctorListResponseDto,
    DoctorStatsResponseDto,
    DoctorStatsQuerySchema,
} from '@src/dtos/doctor.dto';
import { ValidationError, CustomError, ErrorType } from '@src/core/Error';
import { PaginationQuery } from '@src/types';

// Lấy danh sách bác sĩ với validation và business logic
const getDoctors = async (query: any) => {
    // Validate input parameters
    const validationResult = DoctorQuerySchema.safeParse(query);
    if (!validationResult.success) {
        throw new ValidationError(
            validationResult.error.issues.map((issue) => ({
                field: issue.path.join('.') || 'query',
                message: issue.message,
            })),
            'Tham số truy vấn không hợp lệ'
        );
    }

    const validatedQuery = validationResult.data;

    // Validate logic nghiệp vụ
    if (validatedQuery.minExperience && validatedQuery.maxExperience) {
        if (validatedQuery.minExperience > validatedQuery.maxExperience) {
            throw new ValidationError(
                [
                    {
                        field: 'minExperience',
                        message:
                            'Số năm kinh nghiệm tối thiểu không được lớn hơn số năm tối đa',
                    },
                ],
                'minExperience phải nhỏ hơn hoặc bằng maxExperience'
            );
        }
    }

    try {
        // Gọi DAO để lấy dữ liệu
        const result = await doctorDao.getDoctors(validatedQuery);

        // Format dữ liệu trả về
        const formattedDoctors: DoctorResponseDto[] = result.data.map(
            (doctor) => formatDoctorResponse(doctor)
        );

        return {
            data: formattedDoctors,
            metadata: result.metadata,
        };
    } catch (error) {
        throw new CustomError(
            ErrorType.INTERNAL_ERROR,
            'Có lỗi xảy ra khi lấy danh sách bác sĩ. Vui lòng thử lại sau.'
        );
    }
};

// Lấy thông tin bác sĩ theo ID với validation
const getDoctorById = async (id: string): Promise<DoctorResponseDto> => {
    const validationResult = GetDoctorByIdSchema.safeParse({ id });
    if (!validationResult.success) {
        throw new ValidationError(
            validationResult.error.issues.map((issue) => ({
                field: issue.path.join('.') || 'id',
                message: issue.message,
            })),
            'ID bác sĩ không hợp lệ'
        );
    }

    try {
        const doctor = await doctorDao.getDoctorById(id);

        if (!doctor) {
            throw new CustomError(
                ErrorType.NOT_FOUND,
                `Không tìm thấy bác sĩ với ID "${id}"`
            );
        }

        return formatDoctorResponse(doctor);
    } catch (error) {
        if (error instanceof ValidationError || error instanceof CustomError) {
            throw error;
        }
        throw new CustomError(
            ErrorType.INTERNAL_ERROR,
            'Có lỗi xảy ra khi lấy thông tin bác sĩ. Vui lòng thử lại sau.'
        );
    }
};

// Lấy danh sách bác sĩ theo chuyên khoa với validation
const getDoctorsBySpecialization = async (
    specialization: string,
    page: number = 1,
    limit: number = 10
): Promise<DoctorListResponseDto> => {
    const validationResult = GetDoctorsBySpecializationSchema.safeParse({
        specialization,
    });
    if (!validationResult.success) {
        throw new ValidationError(
            validationResult.error.issues.map((issue) => ({
                field: issue.path.join('.') || 'specialization',
                message: issue.message,
            })),
            'Tên chuyên khoa không hợp lệ'
        );
    }

    page = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
    limit = Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : 10;

    try {
        const result =
            await doctorDao.getDoctorsBySpecialization(specialization);
        const allDoctors = result.data || [];

        if (!allDoctors || allDoctors.length === 0) {
            throw new CustomError(
                ErrorType.NOT_FOUND,
                `Không có bác sĩ nào thuộc chuyên khoa "${specialization}"`
            );
        }

        const totalItems = allDoctors.length;
        const totalPages = Math.max(1, Math.ceil(totalItems / limit));
        const offset = (page - 1) * limit;
        const pageDoctorsRaw = allDoctors.slice(offset, offset + limit);

        const formattedDoctors: DoctorResponseDto[] = pageDoctorsRaw.map((d) =>
            formatDoctorResponse(d)
        );

        return {
            doctors: formattedDoctors,
            pagination: {
                page,
                limit,
                totalItems: totalItems,
                totalPages,
                hasPrev: page > 1,
                hasNext: page < totalPages,
            },
        };
    } catch (error) {
        if (error instanceof ValidationError || error instanceof CustomError) {
            throw error;
        }
        throw new CustomError(
            ErrorType.INTERNAL_ERROR,
            'Có lỗi xảy ra khi lấy danh sách bác sĩ theo chuyên khoa. Vui lòng thử lại sau.'
        );
    }
};

// Lấy danh sách bác sĩ theo khoa với validation
const getDoctorsByDepartment = async (
    departmentId: number,
    query: PaginationQuery
) => {
    const result = await doctorDao.getDoctorsByDepartment(departmentId, query);

    // Format dữ liệu trả về
    const formattedDoctors: DoctorResponseDto[] = result.data.map((doctor) =>
        formatDoctorResponse(doctor)
    );

    return {
        data: formattedDoctors,
        metadata: result.metadata,
    };
};

// Lấy danh sách bác sĩ hàng đầu (phân trang)
const getTopDoctors = async (query: {
    page?: string;
    limit?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}) => {
    try {
        // Nếu DAO chỉ hỗ trợ lấy top N, lấy đủ số phần tử cần thiết rồi slice theo page
        const result = await doctorDao.getTopDoctors(query);

        return { result };
    } catch (error) {
        throw new CustomError(
            ErrorType.INTERNAL_ERROR,
            'Có lỗi xảy ra khi lấy danh sách bác sĩ hàng đầu. Vui lòng thử lại sau.'
        );
    }
};

// Lấy thống kê bác sĩ
const getDoctorStats = async (query: any): Promise<DoctorStatsResponseDto> => {
    const validationResult = DoctorStatsQuerySchema.safeParse(query);
    if (!validationResult.success) {
        throw new ValidationError(
            validationResult.error.issues.map((issue) => ({
                field: issue.path.join('.') || 'query',
                message: issue.message,
            })),
            'Tham số thống kê không hợp lệ'
        );
    }

    try {
        const [
            specializationStats,
            levelStats,
            departmentStats,
            experienceStats,
        ] = await Promise.all([
            doctorDao.getDoctorStatsBySpecialization(),
            doctorDao.getDoctorStatsByLevel(),
            doctorDao.getDoctorStatsByDepartment(),
            doctorDao.getDoctorExperienceStats(),
        ]);

        // Tính tổng số bác sĩ
        const totalDoctors = specializationStats.reduce(
            (sum, stat) => sum + stat.count,
            0
        );

        return {
            totalDoctors,
            bySpecialization: specializationStats,
            byLevel: levelStats,
            byDepartment: departmentStats,
            experienceStats,
        };
    } catch (error) {
        throw new CustomError(
            ErrorType.INTERNAL_ERROR,
            'Có lỗi xảy ra khi lấy thống kê bác sĩ. Vui lòng thử lại sau.'
        );
    }
};

// Helper: Format dữ liệu bác sĩ trả về
const formatDoctorResponse = (doctor: any): DoctorResponseDto => {
    const appointmentCount = Array.isArray(doctor.appointments)
        ? doctor.appointments.length
        : 0;

    const staff = doctor.staff || {};
    const user = staff.user || {};

    const userId = doctor.userId ?? user.id ?? null;
    const staffId = staff.id ?? staff.staffId ?? null;

    // Xử lý thông tin lịch làm việc
    const schedules = Array.isArray(staff.schedules) ? staff.schedules : [];
    const isAvailable =
        schedules.length > 0 ? true : Boolean(doctor.isAvailable ?? false);

    const experienceYears =
        typeof doctor.experienceYears === 'number' ? doctor.experienceYears : 0;

    // Tính điểm đánh giá dựa trên kinh nghiệm và số lượng lịch hẹn
    const rating = calculateDoctorRating(experienceYears, appointmentCount);

    return {
        id: userId,
        user: {
            id: user.id ?? userId,
            username: user.username ?? undefined,
            email: user.email ?? undefined,
            avatar: user.avatar || undefined,
            phone: user.phone || undefined,
            name: user.name
                ? {
                      firstName: user.name.firstName,
                      lastName: user.name.lastName,
                  }
                : undefined,
        },
        staff: {
            staffId,
            position: staff.position ?? undefined,
            joinTime: staff.joinTime ?? undefined,
            department: {
                id: staff.department?.id ?? undefined,
                name: staff.department?.name ?? undefined,
                code: staff.department?.code ?? undefined,
                type: staff.department?.type ?? undefined,
            },
        },
        specialization: doctor.specialization ?? undefined,
        licenseNumber: doctor.licenseNumber ?? undefined,
        experienceYears,
        level: doctor.level ?? undefined,
        rating,
        isAvailable,
    };
};

// Helper: Tính điểm đánh giá bác sĩ
const calculateDoctorRating = (
    experienceYears: number,
    appointmentCount: number
): number => {
    const experienceScore = Math.min(experienceYears * 0.1, 4);
    const appointmentScore = Math.min(appointmentCount * 0.01, 1);
    const totalRating = experienceScore + appointmentScore;
    return Math.round(Math.min(totalRating, 5) * 10) / 10;
};

// Helper: Validate và format tên chuyên khoa
const normalizeSpecialization = (specialization: string): string => {
    return specialization
        .trim()
        .toLowerCase()
        .replace(/\s+/g, ' ') // Chuẩn hóa khoảng trắng
        .split(' ')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1)) // Viết hoa chữ cái đầu
        .join(' ');
};

export default {
    getDoctors,
    getDoctorById,
    getDoctorsBySpecialization,
    getDoctorsByDepartment,
    getTopDoctors,
    getDoctorStats,
};
