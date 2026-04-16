import {
    CreateMedicalServiceDataDto,
    GetListDoctorMedicalServiceDataDto,
    MedicalServiceQueryDataDto,
    UpdateMedicalServiceDataDto,
    CreateDoctorServiceDataDto,
} from '@src/dtos/medical-service.dto';
import { PaginatedResponse } from '@src/dtos/common.dto';
import medicalServiceDao from '@src/daos/medical-service.dao';
import { ValidationError, CustomError, ErrorType } from '@src/core/Error';
import { createQueryBuilder } from '@src/helpers/queryBuilder';
import doctorDao from '@src/daos/doctor.dao';

class MedicalServiceService {
    // Xử lý logic lấy danh sách dịch vụ y tế với validation
    async getMedicalServices(
        query: MedicalServiceQueryDataDto
    ): Promise<PaginatedResponse<any>> {
        // Validation input parameters
        const { page = 1, limit = 10, minPrice, maxPrice } = query;

        // Kiểm tra trang và giới hạn
        if (page < 1) {
            throw new ValidationError([
                { field: 'page', message: 'Số trang phải lớn hơn 0' },
            ]);
        }

        if (limit < 1 || limit > 100) {
            throw new ValidationError([
                {
                    field: 'limit',
                    message: 'Số lượng bản ghi phải từ 1 đến 100',
                },
            ]);
        }

        // Validation khoảng giá
        if (minPrice !== undefined && minPrice < 0) {
            throw new ValidationError([
                {
                    field: 'minPrice',
                    message: 'Giá tối thiểu phải lớn hơn hoặc bằng 0',
                },
            ]);
        }

        if (maxPrice !== undefined && maxPrice < 0) {
            throw new ValidationError([
                {
                    field: 'maxPrice',
                    message: 'Giá tối đa phải lớn hơn hoặc bằng 0',
                },
            ]);
        }

        if (
            minPrice !== undefined &&
            maxPrice !== undefined &&
            minPrice > maxPrice
        ) {
            throw new ValidationError([
                {
                    field: 'price',
                    message: 'Giá tối thiểu không được lớn hơn giá tối đa',
                },
            ]);
        }

        // Validation search term
        if (query.search && query.search.trim().length < 1) {
            throw new ValidationError([
                {
                    field: 'search',
                    message: 'Từ khóa tìm kiếm phải có ít nhất 1 ký tự',
                },
            ]);
        }

        // Làm sạch dữ liệu input
        const cleanQuery = {
            ...query,
            search: query.search?.trim(),
            specialization: query.specialization?.trim(),
        };

        try {
            // Gọi DAO để lấy dữ liệu
            const result =
                await medicalServiceDao.getMedicalServices(cleanQuery);

            // Xử lý thêm logic business nếu cần
            result.data = result.data.map((service: any) => ({
                ...service,
                // Thêm các trường computed
                isPopular: service._count.serviceUsage > 10, // Dịch vụ phổ biến
                priceFormatted: this.formatCurrency(service.price), // Format giá tiền
                hasInsuranceSupport: service.percentApplyHealthInsurance > 0, // Có hỗ trợ bảo hiểm
            }));

            return result;
        } catch (error) {
            if (
                error instanceof ValidationError ||
                error instanceof CustomError
            ) {
                throw error;
            }
            throw new CustomError(
                ErrorType.INTERNAL_ERROR,
                'Có lỗi xảy ra khi lấy danh sách dịch vụ y tế. Vui lòng thử lại sau.'
            );
        }
    }

    // Xử lý logic lấy dịch vụ theo ID với validation
    async getMedicalServiceById(id: string) {
        // Validation ID
        if (!id || id.trim() === '') {
            throw new ValidationError([
                { field: 'id', message: 'ID dịch vụ y tế là bắt buộc' },
            ]);
        }

        try {
            // Gọi DAO để lấy dữ liệu
            const service = await medicalServiceDao.getMedicalServiceById(id);

            // Kiểm tra tồn tại
            if (!service) {
                throw new CustomError(
                    ErrorType.NOT_FOUND,
                    'Không tìm thấy dịch vụ y tế'
                );
            }

            // Xử lý thêm logic business
            return {
                ...service,
                priceFormatted: this.formatCurrency(service.price),
                hasInsuranceSupport: service.percentApplyHealthInsurance > 0,
                discountAmount: this.calculateDiscount(
                    service.price,
                    service.percentApplyHealthInsurance
                ),
            };
        } catch (error) {
            if (
                error instanceof ValidationError ||
                error instanceof CustomError
            ) {
                throw error;
            }
            throw new CustomError(
                ErrorType.INTERNAL_ERROR,
                'Có lỗi xảy ra khi lấy thông tin dịch vụ y tế. Vui lòng thử lại sau.'
            );
        }
    }

    async getListDoctorMedicalService(
        data: GetListDoctorMedicalServiceDataDto
    ) {
        const uuidRegex =
            /^MSV-[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(data.medicalServiceId)) {
            throw new ValidationError([
                { field: 'id', message: 'Định dạng ID không hợp lệ' },
            ]);
        }
        const medicalService = await createQueryBuilder(
            'medicalService'
        ).findUnique({ id: data.medicalServiceId });
        if (!medicalService)
            throw new CustomError(
                ErrorType.NOT_FOUND,
                'Medical service không tồn tại'
            );
        const doctorServices =
            await medicalServiceDao.getListDoctorMedicalServices(data);
        return doctorServices;
    }

    async createMedicalService(
        data: CreateMedicalServiceDataDto
    ): Promise<any> {
        const room = await createQueryBuilder('room').findUnique({
            id: data.roomId,
        });
        if (!room) {
            throw new CustomError(
                ErrorType.NOT_FOUND,
                'Phòng khám không tồn tại'
            );
        }
        const department = await createQueryBuilder('department').findUnique({
            id: data.departmentId,
        });
        if (!department) {
            throw new CustomError(ErrorType.NOT_FOUND, 'Khoa không tồn tại');
        }
        return await medicalServiceDao.createMedicalService(data);
    }

    async updateMedicalService(
        data: UpdateMedicalServiceDataDto,
        id: string
    ): Promise<any> {
        const existingService =
            await medicalServiceDao.getMedicalServiceById(id);
        if (!existingService) {
            throw new CustomError(
                ErrorType.NOT_FOUND,
                'Dịch vụ y tế không tồn tại'
            );
        }
        const room = await createQueryBuilder('room').findUnique({
            id: data.roomId,
        });
        if (!room) {
            throw new CustomError(
                ErrorType.NOT_FOUND,
                'Phòng khám không tồn tại'
            );
        }
        const department = await createQueryBuilder('department').findUnique({
            id: data.departmentId,
        });
        if (!department) {
            throw new CustomError(ErrorType.NOT_FOUND, 'Khoa không tồn tại');
        }
        return await medicalServiceDao.updateMedicalService(data, id);
    }
    async deleteMedicalService(id: string): Promise<void> {
        const existingService =
            await medicalServiceDao.getMedicalServiceById(id);
        if (!existingService) {
            throw new CustomError(
                ErrorType.NOT_FOUND,
                'Dịch vụ y tế không tồn tại'
            );
        }
        await medicalServiceDao.deleteMedicalService(id);
    }

    async createDoctorService(data: CreateDoctorServiceDataDto): Promise<any> {
        const doctor = await doctorDao.getDoctorById(data.doctorId);
        if (!doctor) {
            throw new CustomError(ErrorType.NOT_FOUND, 'Bác sĩ không tồn tại');
        }
        const medicalService = await createQueryBuilder(
            'medicalService'
        ).findUnique({
            id: data.medicalServiceId,
        });
        if (!medicalService) {
            throw new CustomError(
                ErrorType.NOT_FOUND,
                'Dịch vụ y tế không tồn tại'
            );
        }
        if (doctor.staff.department.id !== medicalService.departmentId) {
            throw new CustomError(
                ErrorType.VALIDATION_ERROR,
                'Bác sĩ không thuộc khoa của dịch vụ y tế'
            );
        }
        return await medicalServiceDao.createDoctorService(data);
    }

    async deleteDoctorService(
        doctorId: string,
        medicalServiceId: string
    ): Promise<any> {
        const doctor = await doctorDao.getDoctorById(doctorId);
        if (!doctor) {
            throw new CustomError(ErrorType.NOT_FOUND, 'Bác sĩ không tồn tại');
        }
        const medicalService = await createQueryBuilder(
            'medicalService'
        ).findUnique({
            id: medicalServiceId,
        });
        if (!medicalService) {
            throw new CustomError(
                ErrorType.NOT_FOUND,
                'Dịch vụ y tế không tồn tại'
            );
        }
        const result = await medicalServiceDao.deleteDoctorService(
            doctorId,
            medicalServiceId
        );
        return result;
    }
    // Xử lý logic lấy dịch vụ theo khoa với validation
    async getServicesByDepartment(
        departmentId: number,
        page: number = 1,
        limit: number = 10
    ) {
        // Validation departmentId
        if (!departmentId || isNaN(departmentId) || departmentId <= 0) {
            throw new ValidationError([
                { field: 'departmentId', message: 'ID khoa không hợp lệ' },
            ]);
        }

        try {
            // Gọi DAO để lấy dữ liệu
            const services = await medicalServiceDao.getServicesByDepartment(
                departmentId,
                page,
                limit
            );

            // Xử lý logic business
            return services.data.map((service: any) => ({
                ...service,
                priceFormatted: this.formatCurrency(service.price),
                hasInsuranceSupport: service.percentApplyHealthInsurance > 0,
            }));
        } catch (error) {
            if (
                error instanceof ValidationError ||
                error instanceof CustomError
            ) {
                throw error;
            }
            throw new CustomError(
                ErrorType.INTERNAL_ERROR,
                'Có lỗi xảy ra khi lấy dịch vụ theo khoa. Vui lòng thử lại sau.'
            );
        }
    }

    // Lấy dịch vụ phổ biến với logic business
    async getPopularServices(limit: number = 10, page: number = 1) {
        // Validation limit
        if (limit < 1 || limit > 50) {
            throw new ValidationError([
                {
                    field: 'limit',
                    message: 'Số lượng dịch vụ phải từ 1 đến 50',
                },
            ]);
        }

        try {
            // Gọi DAO để lấy dữ liệu
            const services = await medicalServiceDao.getPopularServices(
                limit,
                page
            );

            // Xử lý logic business: thêm ranking
            return services.data.map((service: any, index: number) => ({
                ...service,
                ranking: index + 1,
                priceFormatted: this.formatCurrency(service.price),
                popularityScore: this.calculatePopularityScore(
                    service._count.serviceUsage
                ),
            }));
        } catch (error) {
            if (
                error instanceof ValidationError ||
                error instanceof CustomError
            ) {
                throw error;
            }
            throw new CustomError(
                ErrorType.INTERNAL_ERROR,
                'Có lỗi xảy ra khi lấy dịch vụ phổ biến. Vui lòng thử lại sau.'
            );
        }
    }

    // Lấy dịch vụ theo khoảng giá với validation
    async getServicesByPriceRange(
        minPrice: number,
        maxPrice: number,
        page: number = 1,
        limit: number = 10
    ) {
        // Validation
        if (minPrice < 0 || maxPrice < 0) {
            throw new ValidationError([
                { field: 'price', message: 'Giá không được âm' },
            ]);
        }

        if (minPrice > maxPrice) {
            throw new ValidationError([
                {
                    field: 'price',
                    message: 'Giá tối thiểu không được lớn hơn giá tối đa',
                },
            ]);
        }

        try {
            // Gọi DAO để lấy dữ liệu
            const services = await medicalServiceDao.getServicesByPriceRange(
                minPrice,
                maxPrice,
                page,
                limit
            );

            // Xử lý logic business
            return services.data.map((service: any) => ({
                ...service,
                priceFormatted: this.formatCurrency(service.price),
                savingAmount: maxPrice - service.price, // Số tiền tiết kiệm so với budget
                hasInsuranceSupport: service.percentApplyHealthInsurance > 0,
            }));
        } catch (error) {
            if (
                error instanceof ValidationError ||
                error instanceof CustomError
            ) {
                throw error;
            }
            throw new CustomError(
                ErrorType.INTERNAL_ERROR,
                'Có lỗi xảy ra khi lấy dịch vụ theo khoảng giá. Vui lòng thử lại sau.'
            );
        }
    }

    // Tìm kiếm dịch vụ nâng cao
    async searchServices(
        searchTerm: string,
        filters?: {
            departmentId?: number;
            specialization?: string;
            maxPrice?: number;
        }
    ) {
        if (!searchTerm || searchTerm.trim().length < 2) {
            throw new ValidationError([
                {
                    field: 'searchTerm',
                    message: 'Từ khóa tìm kiếm phải có ít nhất 2 ký tự',
                },
            ]);
        }

        try {
            const query: MedicalServiceQueryDataDto = {
                search: searchTerm.trim(),
                departmentId: filters?.departmentId,
                specialization: filters?.specialization,
                maxPrice: filters?.maxPrice,
                page: 1,
                limit: 20,
                sortBy: 'name',
                sortOrder: 'asc',
            };

            return await this.getMedicalServices(query);
        } catch (error) {
            if (
                error instanceof ValidationError ||
                error instanceof CustomError
            ) {
                throw error;
            }
            throw new CustomError(
                ErrorType.INTERNAL_ERROR,
                'Có lỗi xảy ra khi tìm kiếm dịch vụ. Vui lòng thử lại sau.'
            );
        }
    }

    // Helper methods cho business logic
    private formatCurrency(amount: number): string {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND',
        }).format(amount);
    }

    private calculateDiscount(price: number, insurancePercent: number): number {
        return Math.round((price * insurancePercent) / 100);
    }

    private calculatePopularityScore(usageCount: number): string {
        if (usageCount >= 50) return 'Rất phổ biến';
        if (usageCount >= 20) return 'Phổ biến';
        if (usageCount >= 10) return 'Khá phổ biến';
        return 'Mới';
    }
}

const medicalServiceService = new MedicalServiceService();
export default medicalServiceService;
