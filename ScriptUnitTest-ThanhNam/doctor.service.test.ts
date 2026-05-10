import doctorService from '@src/services/doctor.service';
import doctorDao from '@src/daos/doctor.dao';
import { CustomError, ValidationError, ErrorType } from '@src/core/Error';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
jest.mock('@src/daos/doctor.dao', () => ({
    __esModule: true,
    default: {
        getDoctors: jest.fn(),
        getDoctorById: jest.fn(),
        getDoctorsBySpecialization: jest.fn(),
        getDoctorsByDepartment: jest.fn(),
        getTopDoctors: jest.fn(),
        getDoctorStatsBySpecialization: jest.fn(),
        getDoctorStatsByLevel: jest.fn(),
        getDoctorStatsByDepartment: jest.fn(),
        getDoctorExperienceStats: jest.fn(),
    },
}));

// ---------------------------------------------------------------------------
// Typed helpers
// ---------------------------------------------------------------------------
const dao = doctorDao as jest.Mocked<typeof doctorDao>;

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------
const mockMeta = {
    page: 1, limit: 10, totalItems: 1,
    totalPages: 1, hasNext: false, hasPrev: false,
};

// Raw doctor object từ DAO (trước khi format)
const rawDoctor = {
    userId: 'user-001',
    specialization: 'Tim mạch',
    licenseNumber: 'LIC-001',
    experienceYears: 5,
    level: 'tiến sĩ',
    isAvailable: true,
    appointments: [{}, {}],  // 2 lịch hẹn
    staff: {
        id: 'staff-001',
        position: 'Bác sĩ',
        joinTime: new Date('2020-01-01'),
        schedules: [{}],
        department: { id: 1, name: 'Khoa Tim', code: 'TIM', type: 'clinical' },
        user: {
            id: 'user-001',
            username: 'dr.nguyen',
            email: 'dr@hospital.com',
            avatar: null,
            phone: '0901234567',
            name: { firstName: 'Nguyen', lastName: 'Van A' },
        },
    },
};

// ---------------------------------------------------------------------------
beforeEach(() => jest.clearAllMocks());

// ===========================================================================
describe('doctorService', () => {

    // =========================================================================
    // 1. getDoctors
    // =========================================================================
    describe('getDoctors', () => {
        it('nên trả về danh sách bác sĩ đã format khi query hợp lệ', async () => {
            dao.getDoctors.mockResolvedValue({ data: [rawDoctor], metadata: mockMeta } as any);

            const result = await doctorService.getDoctors({ page: 1, limit: 10 });

            expect(dao.getDoctors).toHaveBeenCalled();
            expect(result.data).toHaveLength(1);
            expect(result.data[0]).toHaveProperty('rating');
            expect(result.data[0]).toHaveProperty('isAvailable');
            expect(result.metadata).toEqual(mockMeta);
        });

        it('nên ném ValidationError khi page = 0', async () => {
            await expect(doctorService.getDoctors({ page: 0 }))
                .rejects.toBeInstanceOf(ValidationError);
        });

        it('nên ném ValidationError khi sortBy không hợp lệ', async () => {
            await expect(doctorService.getDoctors({ sortBy: 'invalidField' }))
                .rejects.toBeInstanceOf(ValidationError);
        });

        it('nên ném ValidationError khi minExperience > maxExperience', async () => {
            await expect(
                doctorService.getDoctors({ minExperience: 10, maxExperience: 5 })
            ).rejects.toBeInstanceOf(ValidationError);
        });

        it('nên không ném lỗi khi minExperience = maxExperience', async () => {
            dao.getDoctors.mockResolvedValue({ data: [], metadata: mockMeta } as any);

            await expect(
                doctorService.getDoctors({ minExperience: 5, maxExperience: 5 })
            ).resolves.toBeDefined();
        });

        it('nên ném INTERNAL_ERROR khi DAO thất bại', async () => {
            dao.getDoctors.mockRejectedValue(new Error('DB fail'));

            await expect(doctorService.getDoctors({}))
                .rejects.toMatchObject({ type: ErrorType.INTERNAL_ERROR });
        });
    });

    // =========================================================================
    // 2. getDoctorById
    // =========================================================================
    describe('getDoctorById', () => {
        it('nên trả về bác sĩ đã format khi tìm thấy', async () => {
            dao.getDoctorById.mockResolvedValue(rawDoctor as any);

            const result = await doctorService.getDoctorById('user-001');
            expect(dao.getDoctorById).toHaveBeenCalledWith('user-001');
            expect(result).toHaveProperty('id', 'user-001');
            expect(result).toHaveProperty('rating');
        });

        it('nên ném NOT_FOUND khi bác sĩ không tồn tại', async () => {
            dao.getDoctorById.mockResolvedValue(null);

            await expect(doctorService.getDoctorById('user-999'))
                .rejects.toMatchObject({ type: ErrorType.NOT_FOUND });
        });

        it('nên ném ValidationError khi ID rỗng', async () => {
            await expect(doctorService.getDoctorById(''))
                .rejects.toBeInstanceOf(ValidationError);
        });
    });

    // =========================================================================
    // 3. getDoctorsBySpecialization
    // =========================================================================
    describe('getDoctorsBySpecialization', () => {
        it('nên trả về danh sách phân trang khi có bác sĩ', async () => {
            dao.getDoctorsBySpecialization.mockResolvedValue({
                data: [rawDoctor, rawDoctor, rawDoctor],
                metadata: mockMeta,
            } as any);

            const result = await doctorService.getDoctorsBySpecialization('Tim mạch', 1, 2);
            expect(result.doctors).toHaveLength(2); // page 1, limit 2
            expect(result.pagination.totalItems).toBe(3);
            expect(result.pagination.hasNext).toBe(true);
            expect(result.pagination.hasPrev).toBe(false);
        });

        it('nên trả về trang 2 đúng', async () => {
            const manyDoctors = Array(5).fill(rawDoctor);
            dao.getDoctorsBySpecialization.mockResolvedValue({
                data: manyDoctors, metadata: mockMeta,
            } as any);

            const result = await doctorService.getDoctorsBySpecialization('Tim mạch', 2, 2);
            expect(result.doctors).toHaveLength(2); // offset=2, slice(2,4)
            expect(result.pagination.hasPrev).toBe(true);
        });

        it('nên ném NOT_FOUND khi không có bác sĩ nào', async () => {
            dao.getDoctorsBySpecialization.mockResolvedValue({ data: [], metadata: mockMeta } as any);

            await expect(doctorService.getDoctorsBySpecialization('Không tồn tại'))
                .rejects.toMatchObject({ type: ErrorType.NOT_FOUND });
        });

        it('nên ném ValidationError khi specialization rỗng', async () => {
            await expect(doctorService.getDoctorsBySpecialization(''))
                .rejects.toBeInstanceOf(ValidationError);
        });

        it('nên ném ValidationError khi specialization quá 100 ký tự', async () => {
            await expect(
                doctorService.getDoctorsBySpecialization('A'.repeat(101))
            ).rejects.toBeInstanceOf(ValidationError);
        });
    });

    // =========================================================================
    // 4. getDoctorsByDepartment
    // =========================================================================
    describe('getDoctorsByDepartment', () => {
        const pagination = {
            page: '1', limit: '10',
            sortBy: 'createdAt', sortOrder: 'asc' as const,
        };

        it('nên trả về danh sách bác sĩ theo khoa đã format', async () => {
            dao.getDoctorsByDepartment.mockResolvedValue({
                data: [rawDoctor], metadata: mockMeta,
            } as any);

            const result = await doctorService.getDoctorsByDepartment(1, pagination);
            expect(dao.getDoctorsByDepartment).toHaveBeenCalledWith(1, pagination);
            expect(result.data).toHaveLength(1);
            expect(result.data[0]).toHaveProperty('id');
        });

        it('nên trả về mảng rỗng khi khoa không có bác sĩ nào', async () => {
            dao.getDoctorsByDepartment.mockResolvedValue({
                data: [], metadata: { ...mockMeta, totalItems: 0 },
            } as any);

            const result = await doctorService.getDoctorsByDepartment(999, pagination);
            expect(result.data).toHaveLength(0);
        });
    });

    // =========================================================================
    // 5. getTopDoctors
    // =========================================================================
    describe('getTopDoctors', () => {
        it('nên trả về danh sách bác sĩ hàng đầu', async () => {
            const mockResult = { data: [rawDoctor], total: 1 };
            dao.getTopDoctors.mockResolvedValue(mockResult as any);

            const result = await doctorService.getTopDoctors({ limit: '5' });
            expect(dao.getTopDoctors).toHaveBeenCalled();
            expect(result).toHaveProperty('result');
        });
    });

    // =========================================================================
    // 6. getDoctorStats
    // =========================================================================
    describe('getDoctorStats', () => {
        const mockSpecStats = [
            { specialization: 'Tim mạch', count: 3, percentage: 60 },
            { specialization: 'Nội khoa', count: 2, percentage: 40 },
        ];
        const mockLevelStats = [{ level: 'tiến sĩ', count: 5, percentage: 100 }];
        const mockDeptStats = [{ department: 'Khoa Tim', count: 5, percentage: 100 }];
        const mockExpStats = { average: 7, min: 1, max: 20, distribution: [] };

        it('nên tính tổng số bác sĩ và trả về thống kê đầy đủ', async () => {
            dao.getDoctorStatsBySpecialization.mockResolvedValue(mockSpecStats as any);
            dao.getDoctorStatsByLevel.mockResolvedValue(mockLevelStats as any);
            dao.getDoctorStatsByDepartment.mockResolvedValue(mockDeptStats as any);
            dao.getDoctorExperienceStats.mockResolvedValue(mockExpStats as any);

            const result = await doctorService.getDoctorStats({});

            expect(result.totalDoctors).toBe(5); // 3 + 2
            expect(result.bySpecialization).toEqual(mockSpecStats);
            expect(result.byLevel).toEqual(mockLevelStats);
            expect(result.byDepartment).toEqual(mockDeptStats);
            expect(result.experienceStats).toEqual(mockExpStats);
        });

        it('nên tính totalDoctors = 0 khi không có bác sĩ nào', async () => {
            dao.getDoctorStatsBySpecialization.mockResolvedValue([] as any);
            dao.getDoctorStatsByLevel.mockResolvedValue([] as any);
            dao.getDoctorStatsByDepartment.mockResolvedValue([] as any);
            dao.getDoctorExperienceStats.mockResolvedValue(mockExpStats as any);

            const result = await doctorService.getDoctorStats({});
            expect(result.totalDoctors).toBe(0);
        });
    });
});
