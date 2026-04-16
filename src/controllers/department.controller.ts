import { Request, Response } from 'express';
import { SuccessResponse } from '@src/core/ApiResponse';
import departmentService from '@src/services/department.service';
import {
    CreateDepartmentDto,
    UpdateDepartmentDto,
} from '@src/dtos/department.dto';

// Lấy danh sách khoa với phân trang và lọc
const getDepartments = async (
    req: Request,
    res: Response<SuccessResponse<any>>
) => {
    // Lấy các tham số query từ request
    const query = req.query as any;

    // Gọi Service để xử lý business logic và lấy danh sách khoa
    const result = await departmentService.getDepartments(query);

    // Trả về response thành công với danh sách khoa và phân trang
    return new SuccessResponse(result, 'Lấy danh sách khoa thành công').send(
        res
    );
};

// Lấy thông tin chi tiết khoa theo ID
const getDepartmentById = async (
    req: Request,
    res: Response<SuccessResponse<any>>
) => {
    const { id } = req.params;
    const department = await departmentService.getDepartmentById(id || '');

    return new SuccessResponse(
        department,
        'Lấy thông tin khoa thành công'
    ).send(res);
};

const createDepartment = async (
    req: Request<{}, {}, CreateDepartmentDto>,
    res: Response<SuccessResponse<any>>
) => {
    const departmentData = req.body;
    const newDepartment =
        await departmentService.createDepartment(departmentData);
    return new SuccessResponse(newDepartment, 'Tạo khoa mới thành công').send(
        res
    );
};

const updateDepartment = async (
    req: Request<{ id: number }, {}, UpdateDepartmentDto>,
    res: Response<SuccessResponse<any>>
) => {
    const { id } = req.params;
    const departmentData = req.body;
    const updatedDepartment = await departmentService.updateDepartment(
        id,
        departmentData
    );
    return new SuccessResponse(
        updatedDepartment,
        'Cập nhật khoa thành công'
    ).send(res);
};

const deleteDepartment = async (
    req: Request<{ id: number }>,
    res: Response<SuccessResponse<any>>
) => {
    const { id } = req.params;
    const dep = await departmentService.deleteDepartment(id);
    return new SuccessResponse(dep, 'Xóa khoa thành công').send(res);
};

// Lấy danh sách khoa theo loại
const getDepartmentsByType = async (
    req: Request,
    res: Response<SuccessResponse<any>>
) => {
    const { type } = req.params;

    // Gọi Service để validate và lấy khoa theo loại
    const departments = await departmentService.getDepartmentsByType(
        type || ''
    );

    // Trả về danh sách khoa theo loại
    return new SuccessResponse(
        departments,
        `Lấy danh sách khoa loại "${type}" thành công`
    ).send(res);
};

// Tìm kiếm khoa theo từ khóa
const searchDepartments = async (
    req: Request,
    res: Response<SuccessResponse<any>>
) => {
    // Lấy từ khóa tìm kiếm từ query parameters
    const searchTerm = (req.query.q as string) || (req.query.search as string);

    if (!searchTerm) {
        // Trả về danh sách tất cả khoa nếu không có từ khóa tìm kiếm
        const result = await departmentService.getDepartments({
            page: 1,
            limit: 20,
            sortBy: 'name',
            sortOrder: 'asc',
            includeStats: false,
        });

        return new SuccessResponse(
            result,
            'Lấy danh sách tất cả khoa thành công'
        ).send(res);
    }

    // Thực hiện tìm kiếm với từ khóa
    const departments = await departmentService.searchDepartments(searchTerm);

    // Trả về kết quả tìm kiếm
    return new SuccessResponse(
        departments,
        `Tìm kiếm khoa với từ khóa "${searchTerm}" thành công`
    ).send(res);
};

// Lấy thống kê về khoa (theo loại, nhân viên, dịch vụ)
const getDepartmentStats = async (
    req: Request,
    res: Response<SuccessResponse<any>>
) => {
    // Lấy các tham số thống kê từ query
    const query = req.query as any;

    // Gọi Service để lấy thống kê khoa
    const stats = await departmentService.getDepartmentStats(query);

    // Trả về thống kê khoa
    return new SuccessResponse(stats, 'Lấy thống kê khoa thành công').send(res);
};

// Lấy danh sách khoa có dịch vụ y tế
const getDepartmentsWithServices = async (
    req: Request,
    res: Response<SuccessResponse<any>>
) => {
    // Gọi Service để lấy danh sách khoa có dịch vụ
    const departments = await departmentService.getDepartmentsWithServices();

    // Trả về danh sách khoa có dịch vụ y tế
    return new SuccessResponse(
        departments,
        'Lấy danh sách khoa có dịch vụ y tế thành công'
    ).send(res);
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
