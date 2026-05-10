import departmentService from '@src/services/department.service';
import departmentDao from '@src/daos/department.dao';
import { createQueryBuilder } from '@src/helpers/queryBuilder';
import { CustomError, ValidationError, ErrorType } from '@src/core/Error';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
jest.mock('@src/daos/department.dao', () => ({
    __esModule: true,
    default: {
        getDepartments: jest.fn(),
        getDepartmentById: jest.fn(),
        getDepartmentByCode: jest.fn(),
        createDepartment: jest.fn(),
        updateDepartment: jest.fn(),
        deleteDepartment: jest.fn(),
        getDepartmentsByType: jest.fn(),
        searchDepartments: jest.fn(),
        getDepartmentStatsByType: jest.fn(),
        getStaffStatsByDepartment: jest.fn(),
        getServiceStatsByDepartment: jest.fn(),
        getDepartmentsWithServices: jest.fn(),
    },
}));

// createQueryBuilder trả về object { findUnique } tương ứng với từng model
jest.mock('@src/helpers/queryBuilder', () => ({
    createQueryBuilder: jest.fn(),
}));

// ---------------------------------------------------------------------------
// Typed helpers
// ---------------------------------------------------------------------------
const dao = departmentDao as jest.Mocked<typeof departmentDao>;
const mockCreateQueryBuilder = createQueryBuilder as jest.Mock;

// Sub-mocks cho từng model trong queryBuilder
const mockStaffFindUnique = jest.fn();
const mockRoomFindUnique = jest.fn();
const mockDeptFindUnique = jest.fn();

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------
const mockMeta = {
    page: 1, limit: 10, totalItems: 1,
    totalPages: 1, hasNext: false, hasPrev: false,
};

const mockDept = {
    id: 1, name: 'Khoa Nội', description: 'Mô tả', code: 'NOI',
    phone: '0282222222', thumbnail: null, images: [], type: 'clinical' as const,
    createdAt: new Date('2024-01-01'), updatedAt: new Date('2024-01-01'),
    head: null, staff: [], deputies: [], room: null,
    medicalServices: [], doctors: [], _count: {},
};

const mockDaoResult = { data: [mockDept], metadata: mockMeta };

// ---------------------------------------------------------------------------
// beforeEach: setup queryBuilder mock per model
// ---------------------------------------------------------------------------
beforeEach(() => {
    jest.clearAllMocks();
    mockCreateQueryBuilder.mockImplementation((model: string) => {
        if (model === 'staff')      return { findUnique: mockStaffFindUnique };
        if (model === 'room')       return { findUnique: mockRoomFindUnique };
        if (model === 'department') return { findUnique: mockDeptFindUnique };
        return { findUnique: jest.fn() };
    });
});

// ===========================================================================
describe('departmentService', () => {

    // =========================================================================
    // 1. getDepartments
    // =========================================================================
    describe('getDepartments', () => {
        it('nên trả về danh sách khoa khi query hợp lệ', async () => {
            dao.getDepartments.mockResolvedValue(mockDaoResult as any);

            const result = await departmentService.getDepartments({ page: 1, limit: 10 });

            expect(dao.getDepartments).toHaveBeenCalled();
            expect(result).toHaveProperty('departments');
            expect(result).toHaveProperty('pagination');
            expect(result.departments).toHaveLength(1);
            expect(result.departments[0]).toHaveProperty('id', 1);
        });

        it('nên ném ValidationError khi query không hợp lệ (page = 0)', async () => {
            await expect(departmentService.getDepartments({ page: 0 }))
                .rejects.toBeInstanceOf(ValidationError);
        });
    });

    // =========================================================================
    // 2. getDepartmentById
    // =========================================================================
    describe('getDepartmentById', () => {
        it('nên trả về thông tin khoa khi tìm thấy', async () => {
            dao.getDepartmentById.mockResolvedValue(mockDept as any);

            const result = await departmentService.getDepartmentById('1');
            expect(dao.getDepartmentById).toHaveBeenCalledWith('1');
            expect(result).toHaveProperty('id', 1);
        });

        it('nên ném CustomError NOT_FOUND khi không tìm thấy', async () => {
            dao.getDepartmentById.mockResolvedValue(null);

            await expect(departmentService.getDepartmentById('999'))
                .rejects.toMatchObject({ type: ErrorType.NOT_FOUND });
        });
    });

    // =========================================================================
    // 3. createDepartment  (mutating – rollback)
    // =========================================================================
    describe('createDepartment', () => {
        const validData = {
            name: 'Khoa Nội', description: 'Mô tả', code: 'NOI',
            phone: '0282222222', thumbnail: 'https://img.com/a.jpg',
            type: 'clinical' as const, headId: 'staff-1',
        };

        // Snapshot để rollback
        let createdId: number | null = null;
        afterEach(() => { createdId = null; });

        it('nên tạo khoa thành công khi dữ liệu hợp lệ', async () => {
            mockStaffFindUnique.mockResolvedValue({ id: 'staff-1' });
            dao.getDepartmentByCode.mockResolvedValue(null);
            dao.createDepartment.mockImplementation(async (d) => {
                createdId = 1; // ghi nhận để rollback nếu cần
                return { ...mockDept, ...d } as any;
            });

            const result = await departmentService.createDepartment(validData);
            expect(dao.createDepartment).toHaveBeenCalled();
            expect(result).toHaveProperty('code', 'NOI');

            // Rollback: ghi nhận id tạo mới
            expect(createdId).toBe(1);
        });

        it('nên ném NOT_FOUND khi headId không tồn tại trong staff', async () => {
            mockStaffFindUnique.mockResolvedValue(null);

            await expect(departmentService.createDepartment(validData))
                .rejects.toMatchObject({ type: ErrorType.NOT_FOUND });
            expect(dao.createDepartment).not.toHaveBeenCalled();
        });

        it('nên ném BAD_REQUEST khi mã khoa đã tồn tại', async () => {
            mockStaffFindUnique.mockResolvedValue({ id: 'staff-1' });
            dao.getDepartmentByCode.mockResolvedValue(mockDept as any);

            await expect(departmentService.createDepartment(validData))
                .rejects.toMatchObject({ type: ErrorType.BAD_REQUEST });
            expect(dao.createDepartment).not.toHaveBeenCalled();
        });
        it('nên ném BAD_REQUEST khi phòng đã gán cho khoa khác', async () => {
            mockStaffFindUnique.mockResolvedValue({ id: 'staff-1' });
            dao.getDepartmentByCode.mockResolvedValue(null);
            mockRoomFindUnique.mockResolvedValue({ id: 'room-1' });
            mockDeptFindUnique.mockResolvedValue({ id: 2 }); // phòng đã có khoa

            await expect(
                departmentService.createDepartment({ ...validData, roomId: 'room-1' })
            ).rejects.toMatchObject({
                type: ErrorType.BAD_REQUEST,
                message: 'Phòng đã được gán cho khoa khác',
            });
        });

        it('nên ném BAD_REQUEST khi trưởng khoa trùng với phó khoa', async () => {
            mockStaffFindUnique.mockResolvedValue({ id: 'staff-1' });
            dao.getDepartmentByCode.mockResolvedValue(null);

            await expect(
                departmentService.createDepartment({
                    ...validData,
                    headId: 'staff-1',
                    deputies: [{ userId: 'staff-1' }],
                })
            ).rejects.toMatchObject({
                type: ErrorType.BAD_REQUEST,
                message: 'Trưởng khoa và phó khoa không được trùng nhau',
            });
        });
    });

    // =========================================================================
    // 4. updateDepartment  (mutating – rollback)
    // =========================================================================
    describe('updateDepartment', () => {
        const DEPT_ID = 1;
        const updateData = { name: 'Khoa Nội Updated', type: 'clinical' as const };

        // Snapshot để rollback
        let snapshotBefore: typeof mockDept;
        beforeEach(() => { snapshotBefore = { ...mockDept }; });
        afterEach(() => { Object.assign(mockDept, snapshotBefore); });

        it('nên cập nhật khoa thành công', async () => {
            dao.getDepartmentById.mockResolvedValue(mockDept as any);
            dao.updateDepartment.mockImplementation(async (id, d) => {
                return { ...mockDept, ...d } as any;
            });

            const result = await departmentService.updateDepartment(DEPT_ID, updateData);
            expect(dao.updateDepartment).toHaveBeenCalledWith(DEPT_ID, updateData);
            expect(result).toHaveProperty('name', 'Khoa Nội Updated');

            // Rollback
            Object.assign(mockDept, snapshotBefore);
        });
        it('nên ném BAD_REQUEST khi trưởng khoa trùng phó khoa trong update', async () => {
            dao.getDepartmentById.mockResolvedValue(mockDept as any);

            await expect(
                departmentService.updateDepartment(DEPT_ID, {
                    headId: 'staff-1',
                    deputies: [{ userId: 'staff-1' }],
                })
            ).rejects.toMatchObject({ type: ErrorType.BAD_REQUEST });
            expect(dao.updateDepartment).not.toHaveBeenCalled();
        });

        it('nên ném NOT_FOUND khi phó khoa không tồn tại trong update', async () => {
            dao.getDepartmentById.mockResolvedValue(mockDept as any);
            mockStaffFindUnique.mockResolvedValue(null);

            await expect(
                departmentService.updateDepartment(DEPT_ID, {
                    deputies: [{ userId: 'deputy-999' }],
                })
            ).rejects.toMatchObject({ type: ErrorType.NOT_FOUND });
        });
    });

    // =========================================================================
    // 5. deleteDepartment  (mutating – rollback)
    // =========================================================================
    describe('deleteDepartment', () => {
        let deletedId: number | null = null;
        afterEach(() => { deletedId = null; });

        it('nên xóa khoa thành công', async () => {
            dao.getDepartmentById.mockResolvedValue(mockDept as any);
            dao.deleteDepartment.mockImplementation(async (id) => {
                deletedId = id; // ghi nhận để rollback
                return mockDept as any;
            });

            const result = await departmentService.deleteDepartment(1);
            expect(dao.deleteDepartment).toHaveBeenCalledWith(1);
            expect(result).toEqual(mockDept);
            expect(deletedId).toBe(1); // rollback marker
        });
    });

    // =========================================================================
    // 6. getDepartmentsByType
    // =========================================================================
    describe('getDepartmentsByType', () => {
        it('nên trả về danh sách khi type hợp lệ và có dữ liệu', async () => {
            dao.getDepartmentsByType.mockResolvedValue(mockDaoResult as any);

            const result = await departmentService.getDepartmentsByType('clinical');
            expect(result.departments).toHaveLength(1);
        });

        it('nên ném ValidationError khi type không hợp lệ', async () => {
            await expect(departmentService.getDepartmentsByType('invalid'))
                .rejects.toBeInstanceOf(ValidationError);
            expect(dao.getDepartmentsByType).not.toHaveBeenCalled();
        });

        it('nên ném NOT_FOUND khi không có khoa nào thuộc loại đó', async () => {
            dao.getDepartmentsByType.mockResolvedValue({ data: [], metadata: mockMeta } as any);

            await expect(departmentService.getDepartmentsByType('paraclinical'))
                .rejects.toMatchObject({ type: ErrorType.NOT_FOUND });
        });
    });

    // =========================================================================
    // 7. searchDepartments
    // =========================================================================
    describe('searchDepartments', () => {
        it('nên trả về kết quả khi từ khóa hợp lệ', async () => {
            dao.searchDepartments.mockResolvedValue(mockDaoResult as any);

            const result = await departmentService.searchDepartments('Nội');
            expect(dao.searchDepartments).toHaveBeenCalledWith('Nội');
            expect(result.departments).toHaveLength(1);
        });

        it('nên ném ValidationError khi từ khóa rỗng', async () => {
            await expect(departmentService.searchDepartments(''))
                .rejects.toBeInstanceOf(ValidationError);
        });

        it('nên ném ValidationError khi từ khóa quá 100 ký tự', async () => {
            await expect(departmentService.searchDepartments('A'.repeat(101)))
                .rejects.toBeInstanceOf(ValidationError);
        });
    });

    // =========================================================================
    // 8. getDepartmentStats
    // =========================================================================
    describe('getDepartmentStats', () => {
        const mockTypeStats = [
            { type: 'clinical', count: 3, percentage: 60 },
            { type: 'paraclinical', count: 2, percentage: 40 },
        ];
        const mockStaffStats = [
            { departmentName: 'Khoa Nội', staffCount: 10, doctorCount: 5 },
        ];
        const mockServiceStats = [
            { departmentName: 'Khoa Nội', serviceCount: 8, totalServiceValue: 50000 },
        ];

        it('nên tính thống kê cơ bản (không includeStaffStats, không includeServiceStats)', async () => {
            dao.getDepartmentStatsByType.mockResolvedValue(mockTypeStats as any);

            const result = await departmentService.getDepartmentStats({});

            expect(result.totalDepartments).toBe(5); // 3 + 2
            expect(result.byType).toEqual(mockTypeStats);
            expect(result.staffStats.totalStaff).toBe(0);
            expect(result.serviceStats.totalServices).toBe(0);
        });

        it('nên tính đúng averageStaffPerDepartment khi includeStaffStats = true', async () => {
            dao.getDepartmentStatsByType.mockResolvedValue(mockTypeStats as any);
            dao.getStaffStatsByDepartment.mockResolvedValue(mockStaffStats as any);

            const result = await departmentService.getDepartmentStats({ includeStaffStats: true });

            expect(result.staffStats.totalStaff).toBe(10);
            expect(result.staffStats.averagePerDepartment).toBe(2); // 10/5
            expect(result.staffStats.distribution).toHaveLength(1);
        });

        it('nên tính đúng averageServicePerDepartment khi includeServiceStats = true', async () => {
            dao.getDepartmentStatsByType.mockResolvedValue(mockTypeStats as any);
            dao.getServiceStatsByDepartment.mockResolvedValue(mockServiceStats as any);

            const result = await departmentService.getDepartmentStats({ includeServiceStats: true });

            expect(result.serviceStats.totalServices).toBe(8);
            expect(result.serviceStats.averagePerDepartment).toBe(2); // 8/5
        });

        it('nên trả về average = 0 khi totalDepartments = 0', async () => {
            dao.getDepartmentStatsByType.mockResolvedValue([] as any);
            dao.getStaffStatsByDepartment.mockResolvedValue([] as any);

            const result = await departmentService.getDepartmentStats({ includeStaffStats: true });

            expect(result.totalDepartments).toBe(0);
            expect(result.staffStats.averagePerDepartment).toBe(0);
        });

        it('nên gọi cả staffStats và serviceStats khi bật cả 2 flag', async () => {
            dao.getDepartmentStatsByType.mockResolvedValue(mockTypeStats as any);
            dao.getStaffStatsByDepartment.mockResolvedValue(mockStaffStats as any);
            dao.getServiceStatsByDepartment.mockResolvedValue(mockServiceStats as any);

            const result = await departmentService.getDepartmentStats({
                includeStaffStats: true,
                includeServiceStats: true,
            });

            expect(dao.getStaffStatsByDepartment).toHaveBeenCalled();
            expect(dao.getServiceStatsByDepartment).toHaveBeenCalled();
            expect(result.staffStats.totalStaff).toBe(10);
            expect(result.serviceStats.totalServices).toBe(8);
        });
    });

    // =========================================================================
    // 9. getDepartmentsWithServices
    // =========================================================================
    describe('getDepartmentsWithServices', () => {
        it('nên trả về danh sách khoa có dịch vụ', async () => {
            dao.getDepartmentsWithServices.mockResolvedValue(mockDaoResult as any);

            const result = await departmentService.getDepartmentsWithServices();
            expect(result.departments).toHaveLength(1);
            expect(result.pagination).toBeDefined();
        });
    });
});
