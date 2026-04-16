import { Request, Response } from 'express';
import { SuccessResponse } from '@src/core/ApiResponse';
import medicalServiceService from '@src/services/medical-service.service';
import { ValidationError } from '@src/core/Error';
import {
    CreateMedicalServiceDataDto,
    UpdateMedicalServiceDataDto,
    CreateDoctorServiceDataDto,
} from '@src/dtos/medical-service.dto';

// Lấy danh sách dịch vụ y tế với nhiều tùy chọn lọc
const getMedicalServices = async (
    req: Request,
    res: Response<SuccessResponse<any>>
) => {
    // Lấy các tham số query (page, limit, search, departmentId, specialization, isActive, price range, sort)
    const query = req.query as any;

    // Gọi Service để xử lý business logic và lấy dịch vụ y tế với các điều kiện lọc
    const result = await medicalServiceService.getMedicalServices(query);

    // Trả về danh sách dịch vụ y tế kèm phân trang
    return new SuccessResponse(
        result,
        'Lấy danh sách dịch vụ y tế thành công'
    ).send(res);
};

// Lấy thông tin dịch vụ y tế theo ID
const getMedicalServiceById = async (
    req: Request,
    res: Response<SuccessResponse<any>>
) => {
    const { id } = req.params;

    // Gọi Service để validate và tìm dịch vụ theo ID (Service sẽ validate ID)
    const service = await medicalServiceService.getMedicalServiceById(id || '');

    // Trả về thông tin dịch vụ y tế
    return new SuccessResponse(
        service,
        'Lấy thông tin dịch vụ y tế thành công'
    ).send(res);
};

// Lấy danh sách dịch vụ theo khoa/phòng ban
const getServicesByDepartment = async (
    req: Request,
    res: Response<SuccessResponse<any>>
) => {
    const { departmentId } = req.params;

    // Chuyển departmentId sang số và gọi Service để validate và lấy dịch vụ theo khoa
    const parsedDepartmentId = parseInt(departmentId || '0');
    const services =
        await medicalServiceService.getServicesByDepartment(parsedDepartmentId);

    // Trả về danh sách dịch vụ của khoa
    return new SuccessResponse(
        services,
        'Lấy danh sách dịch vụ theo khoa thành công'
    ).send(res);
};

// Lấy danh sách dịch vụ theo khoảng giá
const getServicesByPriceRange = async (
    req: Request,
    res: Response<SuccessResponse<any>>
) => {
    const { minPrice, maxPrice } = req.query as any;

    // Chuyển đổi giá sang số
    const parsedMinPrice = parseFloat(minPrice || '0');
    const parsedMaxPrice = parseFloat(maxPrice || '0');

    // Gọi Service để validate và lấy dịch vụ theo khoảng giá
    const services = await medicalServiceService.getServicesByPriceRange(
        parsedMinPrice,
        parsedMaxPrice
    );

    // Trả về danh sách dịch vụ theo khoảng giá
    return new SuccessResponse(
        services,
        'Lấy danh sách dịch vụ theo khoảng giá thành công'
    ).send(res);
};

const getListDoctorMedicalServices = async (
    req: Request,
    res: Response<SuccessResponse<any>>
) => {
    const { medicalServiceId } = req.params;
    if (!medicalServiceId) {
        return new ValidationError([
            { field: 'id', message: 'Medical service ID is required' },
        ]);
    }

    const query = req.query as any;
    const result = await medicalServiceService.getListDoctorMedicalService({
        medicalServiceId,
        page: query.page,
        limit: query.limit,
    });
    return new SuccessResponse(
        result,
        'Lấy danh sách dịch vụ y tế của bác sĩ thành công'
    ).send(res);
};

const createMedicalService = async (
    req: Request<{}, {}, CreateMedicalServiceDataDto>,
    res: Response<SuccessResponse<any>>
) => {
    const data = req.body;
    const medicalService =
        await medicalServiceService.createMedicalService(data);
    return new SuccessResponse(
        medicalService,
        'Tạo dịch vụ y tế thành công'
    ).send(res);
};
const updateMedicalService = async (
    req: Request<{}, {}, UpdateMedicalServiceDataDto>,
    res: Response<SuccessResponse<any>>
) => {
    const { id } = req.params as { id: string };
    if (!id) {
        throw new ValidationError([
            { field: 'id', message: 'Medical service ID is required' },
        ]);
    }
    const data = req.body;
    const medicalService = await medicalServiceService.updateMedicalService(
        data,
        id
    );
    return new SuccessResponse(
        medicalService,
        'Cập nhật dịch vụ y tế thành công'
    ).send(res);
};
const deleteMedicalService = async (
    req: Request,
    res: Response<SuccessResponse<any>>
) => {
    const { id } = req.params;
    if (!id) {
        throw new ValidationError([
            { field: 'id', message: 'Medical service ID is required' },
        ]);
    }
    await medicalServiceService.deleteMedicalService(id);
    return new SuccessResponse(null, 'Xóa dịch vụ y tế thành công').send(res);
};
const createDoctorService = async (
    req: Request<{}, {}, CreateDoctorServiceDataDto>,
    res: Response<SuccessResponse<any>>
) => {
    const data = req.body;
    const medicalService =
        await medicalServiceService.createDoctorService(data);
    return new SuccessResponse(
        medicalService,
        'Tạo dịch vụ y tế cho bác sĩ thành công'
    ).send(res);
};

const deleteDoctorService = async (
    req: Request,
    res: Response<SuccessResponse<any>>
) => {
    const { doctorId, medicalServiceId } = req.params as {
        doctorId?: string;
        medicalServiceId?: string;
    };

    if (!doctorId) {
        throw new ValidationError([
            { field: 'doctorId', message: 'Doctor ID is required' },
        ]);
    }
    if (!medicalServiceId) {
        throw new ValidationError([
            {
                field: 'medicalServiceId',
                message: 'Medical service ID is required',
            },
        ]);
    }
    const medicalService = await medicalServiceService.deleteDoctorService(
        doctorId,
        medicalServiceId
    );

    return new SuccessResponse(
        medicalService,
        'Xóa dịch vụ y tế của bác sĩ thành công'
    ).send(res);
};

export default {
    getMedicalServices,
    getMedicalServiceById,
    getServicesByDepartment,
    getServicesByPriceRange,
    getListDoctorMedicalServices,
    createMedicalService,
    updateMedicalService,
    deleteMedicalService,
    createDoctorService,
    deleteDoctorService,
};
