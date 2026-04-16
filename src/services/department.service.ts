import departmentDao from '@src/daos/department.dao';
import {
    DepartmentQuerySchema,
    DepartmentResponseDto,
    DepartmentListResponseDto,
    DepartmentStatsResponseDto,
    DepartmentStatsQuerySchema,
    DepartmentTypeLabels,
    CreateDepartmentDto,
    UpdateDepartmentDto,
} from '@src/dtos/department.dto';
import { ValidationError, CustomError, ErrorType } from '@src/core/Error';
import { createQueryBuilder } from '@src/helpers/queryBuilder';

// Lấy danh sách khoa với validation và business logic
const getDepartments = async (
    query: any
): Promise<DepartmentListResponseDto> => {
    // Validate input parameters
    const validationResult = DepartmentQuerySchema.safeParse(query);
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

    try {
        // Gọi DAO để lấy dữ liệu (DAO trả về { data, metadata })
        const result = await departmentDao.getDepartments(validatedQuery);
        const rows = result.data || [];
        const meta = result.metadata;

        // Format dữ liệu trả về
        const formattedDepartments: DepartmentResponseDto[] = rows.map(
            (department: any) =>
                formatDepartmentResponse(
                    department,
                    validatedQuery.includeStats
                )
        );

        return {
            departments: formattedDepartments,
            pagination: {
                page: meta.page,
                limit: meta.limit,
                totalItems: meta.totalItems,
                totalPages: meta.totalPages,
                hasNext: meta.hasNext,
                hasPrev: meta.hasPrev,
            },
        };
    } catch (error) {
        throw new CustomError(
            ErrorType.INTERNAL_ERROR,
            'Có lỗi xảy ra khi lấy danh sách khoa. Vui lòng thử lại sau.'
        );
    }
};

// Lấy thông tin khoa theo ID với validation
const getDepartmentById = async (
    id: string
): Promise<DepartmentResponseDto> => {
    const department = await departmentDao.getDepartmentById(id);

    if (!department) {
        throw new CustomError(
            ErrorType.NOT_FOUND,
            `Không tìm thấy khoa với ID "${id}"`
        );
    }
    // Format và trả về dữ liệu
    return formatDepartmentResponse(department, true);
};

const createDepartment = async (data: CreateDepartmentDto): Promise<any> => {
    try {
        const staff = await createQueryBuilder('staff').findUnique({
            userId: data.headId,
        });
        if (!staff) {
            throw new CustomError(
                ErrorType.NOT_FOUND,
                `Trưởng khoa với id "${data.headId}" không tồn tại`
            );
        }
        const existing = await departmentDao.getDepartmentByCode(data.code);
        if (existing) {
            throw new CustomError(
                ErrorType.BAD_REQUEST,
                `Mã khoa "${data.code}" đã tồn tại`
            );
        }
        if (data.roomId && data.roomId !== null) {
            // kiểm tra phòng đã có khoa chưa
            const room = await createQueryBuilder('room').findUnique({
                id: data.roomId,
            });
            if (!room) {
                throw new CustomError(
                    ErrorType.NOT_FOUND,
                    'Phòng không tồn tại'
                );
            }
            const existingDepartment = await createQueryBuilder(
                'department'
            ).findUnique({
                roomId: data.roomId,
            });
            if (existingDepartment) {
                throw new CustomError(
                    ErrorType.BAD_REQUEST,
                    'Phòng đã được gán cho khoa khác'
                );
            }
        }
        // trưởng khoa phó khoa không trùng nhau
        if (data.headId && data.deputies && data.deputies.length > 0) {
            for (const deputy of data.deputies) {
                if (deputy.userId === data.headId) {
                    throw new CustomError(
                        ErrorType.BAD_REQUEST,
                        'Trưởng khoa và phó khoa không được trùng nhau'
                    );
                }
            }
        }
        if (data.deputies && data.deputies.length > 0) {
            for (const deputy of data.deputies) {
                const deputyStaff = await createQueryBuilder(
                    'staff'
                ).findUnique({
                    userId: deputy.userId,
                });
                if (!deputyStaff) {
                    throw new CustomError(
                        ErrorType.NOT_FOUND,
                        `Phó khoa với ID "${deputy.userId}" không tồn tại`
                    );
                }
            }
        }
        const newDepartment = await departmentDao.createDepartment(data);
        return newDepartment;
    } catch (err: any) {
        if (err instanceof CustomError) throw err;
        throw new CustomError(ErrorType.INTERNAL_ERROR, 'Tạo khoa thất bại');
    }
};

const updateDepartment = async (
    id: number,
    data: UpdateDepartmentDto
): Promise<any> => {
    try {
        const existingDepartment = await departmentDao.getDepartmentById(id);
        if (!existingDepartment) {
            throw new CustomError(ErrorType.NOT_FOUND, 'Khoa không tồn tại');
        }
        if (data.headId === null) {
            const staff = await createQueryBuilder('staff').findUnique({
                userId: data.headId,
            });
            if (!staff) {
                throw new CustomError(
                    ErrorType.NOT_FOUND,
                    `Trưởng khoa với id "${data.headId}" không tồn tại`
                );
            }
        }
        if (data.roomId === null) {
            const room = await createQueryBuilder('room').findUnique({
                id: data.roomId,
            });
            if (!room) {
                throw new CustomError(
                    ErrorType.NOT_FOUND,
                    'Phòng không tồn tại'
                );
            }
        }
        // trưởng khoa phó khoa không trùng nhau
        if (data.headId && data.deputies && data.deputies.length > 0) {
            for (const deputy of data.deputies) {
                if (deputy.userId === data.headId) {
                    throw new CustomError(
                        ErrorType.BAD_REQUEST,
                        'Trưởng khoa và phó khoa không được trùng nhau'
                    );
                }
            }
        }
        if (data.deputies && data.deputies.length > 0) {
            for (const deputy of data.deputies) {
                const deputyStaff = await createQueryBuilder(
                    'staff'
                ).findUnique({
                    userId: deputy.userId,
                });
                if (!deputyStaff) {
                    throw new CustomError(
                        ErrorType.NOT_FOUND,
                        `Phó khoa với ID "${deputy.userId}" không tồn tại`
                    );
                }
            }
        }
        const updatedDepartment = await departmentDao.updateDepartment(
            id,
            data
        );
        return updatedDepartment;
    } catch (err: any) {
        if (err instanceof CustomError) throw err;
        throw new CustomError(
            ErrorType.INTERNAL_ERROR,
            'Cập nhật khoa thất bại'
        );
    }
};

const deleteDepartment = async (id: number): Promise<any> => {
    const existingDepartment = await departmentDao.getDepartmentById(id);
    if (!existingDepartment) {
        throw new CustomError(ErrorType.NOT_FOUND, 'Khoa không tồn tại');
    }
    const res = await departmentDao.deleteDepartment(id);
    return res;
};

// Lấy danh sách khoa theo loại (trả về dạng { data, metadata })
const getDepartmentsByType = async (
    type: string
): Promise<DepartmentListResponseDto> => {
    // Validate type
    if (!['clinical', 'paraclinical', 'administrative'].includes(type)) {
        throw new ValidationError(
            [
                {
                    field: 'type',
                    message:
                        'Loại khoa phải là clinical, paraclinical hoặc administrative',
                },
            ],
            'Loại khoa không hợp lệ'
        );
    }

    try {
        const result = await departmentDao.getDepartmentsByType(type as any);
        const rows = result.data || [];
        const meta = result.metadata;

        if (rows.length === 0) {
            throw new CustomError(
                ErrorType.NOT_FOUND,
                `Không có khoa nào thuộc loại "${DepartmentTypeLabels[type as keyof typeof DepartmentTypeLabels]}"`
            );
        }

        const formatted = rows.map((department: any) =>
            formatDepartmentResponse(department, true)
        );

        return {
            departments: formatted,
            pagination: {
                page: meta.page,
                limit: meta.limit,
                totalItems: meta.totalItems,
                totalPages: meta.totalPages,
                hasNext: meta.hasNext,
                hasPrev: meta.hasPrev,
            },
        };
    } catch (error) {
        if (error instanceof ValidationError || error instanceof CustomError) {
            throw error;
        }
        throw new CustomError(
            ErrorType.INTERNAL_ERROR,
            'Có lỗi xảy ra khi lấy danh sách khoa theo loại. Vui lòng thử lại sau.'
        );
    }
};

// Tìm kiếm khoa theo từ khóa (trả về dạng { data, metadata })
const searchDepartments = async (
    searchTerm: string
): Promise<DepartmentListResponseDto> => {
    // Validate search term
    if (!searchTerm || searchTerm.trim().length === 0) {
        throw new ValidationError(
            [
                {
                    field: 'search',
                    message: 'Từ khóa tìm kiếm không được để trống',
                },
            ],
            'Từ khóa tìm kiếm không hợp lệ'
        );
    }

    if (searchTerm.length > 100) {
        throw new ValidationError(
            [
                {
                    field: 'search',
                    message: 'Từ khóa tìm kiếm không được quá 100 ký tự',
                },
            ],
            'Từ khóa tìm kiếm quá dài'
        );
    }

    try {
        const result = await departmentDao.searchDepartments(searchTerm.trim());
        const rows = result.data || [];
        const meta = result.metadata;

        const formatted = rows.map((department: any) =>
            formatDepartmentResponse(department, false)
        );

        return {
            departments: formatted,
            pagination: {
                page: meta.page,
                limit: meta.limit,
                totalItems: meta.totalItems,
                totalPages: meta.totalPages,
                hasNext: meta.hasNext,
                hasPrev: meta.hasPrev,
            },
        };
    } catch (error) {
        throw new CustomError(
            ErrorType.INTERNAL_ERROR,
            'Có lỗi xảy ra khi tìm kiếm khoa. Vui lòng thử lại sau.'
        );
    }
};

// Lấy thống kê khoa
const getDepartmentStats = async (
    query: any
): Promise<DepartmentStatsResponseDto> => {
    const validationResult = DepartmentStatsQuerySchema.safeParse(query);
    if (!validationResult.success) {
        throw new ValidationError(
            validationResult.error.issues.map((issue) => ({
                field: issue.path.join('.') || 'query',
                message: issue.message,
            })),
            'Tham số thống kê không hợp lệ'
        );
    }

    const validatedQuery = validationResult.data;

    try {
        const [typeStats, staffStats, serviceStats] = await Promise.all([
            departmentDao.getDepartmentStatsByType(),
            validatedQuery.includeStaffStats
                ? departmentDao.getStaffStatsByDepartment()
                : [],
            validatedQuery.includeServiceStats
                ? departmentDao.getServiceStatsByDepartment()
                : [],
        ]);

        // Tính tổng số khoa
        const totalDepartments = typeStats.reduce(
            (sum, stat) => sum + stat.count,
            0
        );

        // Tính thống kê nhân viên
        const totalStaff = staffStats.reduce(
            (sum, stat) => sum + stat.staffCount,
            0
        );
        const averageStaffPerDepartment =
            totalDepartments > 0
                ? Math.round(totalStaff / totalDepartments)
                : 0;

        // Tính thống kê dịch vụ
        const totalServices = serviceStats.reduce(
            (sum, stat) => sum + stat.serviceCount,
            0
        );
        const averageServicePerDepartment =
            totalDepartments > 0
                ? Math.round(totalServices / totalDepartments)
                : 0;

        return {
            totalDepartments,
            byType: typeStats,
            staffStats: {
                totalStaff,
                averagePerDepartment: averageStaffPerDepartment,
                distribution: staffStats.map((stat) => ({
                    departmentName: stat.departmentName,
                    staffCount: stat.staffCount,
                    doctorCount: stat.doctorCount,
                })),
            },
            serviceStats: {
                totalServices,
                averagePerDepartment: averageServicePerDepartment,
                distribution: serviceStats.map((stat) => ({
                    departmentName: stat.departmentName,
                    serviceCount: stat.serviceCount,
                    totalRevenue: stat.totalServiceValue,
                })),
            },
        };
    } catch (error) {
        throw new CustomError(
            ErrorType.INTERNAL_ERROR,
            'Có lỗi xảy ra khi lấy thống kê khoa. Vui lòng thử lại sau.'
        );
    }
};

// Lấy danh sách khoa có dịch vụ y tế (trả về dạng { data, metadata })
const getDepartmentsWithServices =
    async (): Promise<DepartmentListResponseDto> => {
        try {
            // Gọi DAO để lấy dữ liệu
            const result = await departmentDao.getDepartmentsWithServices();
            const rows = result.data || [];
            const meta = result.metadata;

            const formatted = rows.map((department: any) =>
                formatDepartmentResponse(department, true)
            );

            return {
                departments: formatted,
                pagination: {
                    page: meta.page,
                    limit: meta.limit,
                    totalItems: meta.totalItems,
                    totalPages: meta.totalPages,
                    hasNext: meta.hasNext,
                    hasPrev: meta.hasPrev,
                },
            };
        } catch (error) {
            throw new CustomError(
                ErrorType.INTERNAL_ERROR,
                'Có lỗi xảy ra khi lấy danh sách khoa có dịch vụ. Vui lòng thử lại sau.'
            );
        }
    };

// Helper: Format dữ liệu khoa trả về
const formatDepartmentResponse = (
    department: any,
    includeStats: boolean = false
): DepartmentResponseDto => {
    const result: DepartmentResponseDto = {
        id: department.id,
        name: department.name,
        description: department.description,
        code: department.code,
        phone: department.phone || undefined,
        thumbnail: department.thumbnail || undefined,
        images: department.images || [],
        type: department.type,
        createdAt: department.createdAt,
        updatedAt: department.updatedAt,
    };

    // Thêm thông tin trưởng khoa
    if (department.head) {
        result.head = department.head;
    }
    if (department.staff && department.staff.length > 0) {
        result.staff = department.staff;
    }

    // Thêm thông tin phó khoa
    if (department.deputies && department.deputies.length > 0) {
        result.deputies = department.deputies;
    }

    // Thêm thông tin phòng
    if (department.room) {
        result.room = {
            id: department.room.id,
            name: department.room.name,
            floor: department.room.floor,
            building: {
                name: department.room.building?.name || '',
            },
        };
    }

    // Thêm danh sách dịch vụ nếu có
    if (department.medicalServices && department.medicalServices.length > 0) {
        result.medicalServices = department.medicalServices;
    }

    // Thêm danh sách bác sĩ nếu có (khi getDepartmentById trả doctors riêng)
    if (department.doctors && department.doctors.length > 0) {
        result.doctors = department.doctors;
    }

    // Thêm thống kê nếu cần
    if (includeStats) {
        const staffCount =
            department._count?.staff || department.staff?.length || 0;
        const doctorCount =
            department._count?.doctor || department.doctors?.length || 0;
        const serviceCount =
            department._count?.medicalServices ||
            department.medicalServices?.length ||
            0;

        result.stats = {
            totalStaff: staffCount,
            totalDoctors: doctorCount,
            totalServices: serviceCount,
        };
    }

    return result;
};

export default {
    getDepartments,
    getDepartmentById,
    createDepartment,
    updateDepartment,
    deleteDepartment,
    getDepartmentsByType,
    searchDepartments,
    getDepartmentStats,
    getDepartmentsWithServices,
};
