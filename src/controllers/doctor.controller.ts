import { Request, Response } from 'express';
import { SuccessResponse } from '@src/core/ApiResponse';
import doctorService from '@src/services/doctor.service';
import { PaginationQuery } from '@src/types';

// Lấy danh sách bác sĩ với phân trang và lọc
const getDoctors = async (
    req: Request,
    res: Response<SuccessResponse<any>>
) => {
    // Lấy các tham số query từ request
    const query = req.query as any;

    // Gọi Service lấy danh sách bác sĩ
    const result = await doctorService.getDoctors(query);

    return new SuccessResponse(
        result.data,
        'Lấy danh sách bác sĩ thành công',
        result.metadata
    ).send(res);
};

// Lấy thông tin chi tiết bác sĩ theo ID
const getDoctorById = async (
    req: Request,
    res: Response<SuccessResponse<any>>
) => {
    const { id } = req.params;

    // Gọi Service để validate và lấy thông tin bác sĩ (theo ID)
    const doctor = await doctorService.getDoctorById(id || '');

    return new SuccessResponse(doctor, 'Lấy thông tin bác sĩ thành công').send(
        res
    );
};

// Lấy danh sách bác sĩ theo chuyên khoa
const getDoctorsBySpecialization = async (
    req: Request,
    res: Response<SuccessResponse<any>>
) => {
    const { specialization } = req.params;

    // Gọi Service để validate và lấy bác sĩ theo chuyên khoa
    const doctors = await doctorService.getDoctorsBySpecialization(
        specialization || ''
    );

    return new SuccessResponse(
        doctors,
        `Lấy danh sách bác sĩ chuyên khoa "${specialization}" thành công`
    ).send(res);
};

// Lấy danh sách bác sĩ theo khoa/phòng ban
const getDoctorsByDepartment = async (
    req: Request<{ departmentId: string }, {}, {}, PaginationQuery>,
    res: Response<SuccessResponse<any>>
) => {
    const { departmentId } = req.params;
    const parsedDepartmentId = parseInt(departmentId || '0');

    // Gọi Service để validate và lấy bác sĩ theo khoa
    const data = await doctorService.getDoctorsByDepartment(
        parsedDepartmentId,
        req.query
    );

    return new SuccessResponse(
        data.data,
        `Lấy danh sách bác sĩ theo khoa thành công`,
        data.metadata
    ).send(res);
};

// Lấy danh sách bác sĩ hàng đầu (phổ biến nhất)
const getTopDoctors = async (
    req: Request,
    res: Response<SuccessResponse<any>>
) => {
    const query = req.query as any;

    const doctors = await doctorService.getTopDoctors(query);

    return new SuccessResponse(
        doctors,
        'Lấy danh sách bác sĩ hàng đầu thành công'
    ).send(res);
};

// Lấy thống kê về bác sĩ (theo chuyên khoa, cấp độ, khoa, kinh nghiệm)
const getDoctorStats = async (
    req: Request,
    res: Response<SuccessResponse<any>>
) => {
    const query = req.query as any;

    // Gọi Service để lấy thống kê bác sĩ
    const stats = await doctorService.getDoctorStats(query);

    return new SuccessResponse(stats, 'Lấy thống kê bác sĩ thành công').send(
        res
    );
};

// Tìm kiếm bác sĩ theo từ khóa (tên, chuyên khoa)
const searchDoctors = async (
    req: Request,
    res: Response<SuccessResponse<any>>
) => {
    // Lấy từ khóa tìm kiếm từ query parameters
    const searchTerm = (req.query.q as string) || (req.query.search as string);

    if (!searchTerm) {
        const result = await doctorService.getDoctors({
            page: 1,
            limit: 20,
            sortBy: 'experienceYears',
            sortOrder: 'desc',
        });

        return new SuccessResponse(
            result,
            'Lấy danh sách tất cả bác sĩ thành công'
        ).send(res);
    }

    const result = await doctorService.getDoctors({
        search: searchTerm,
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
        sortBy: 'experienceYears',
        sortOrder: 'desc',
    });

    return new SuccessResponse(
        result,
        `Tìm kiếm bác sĩ với từ khóa "${searchTerm}" thành công`
    ).send(res);
};

export default {
    getDoctors,
    getDoctorById,
    getDoctorsBySpecialization,
    getDoctorsByDepartment,
    getTopDoctors,
    getDoctorStats,
    searchDoctors,
};
