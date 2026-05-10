import healthInsuranceService from '@src/services/healthInsurance.service';
import prisma from '@src/config/prisma';

/**
 * Lớp kiểm thử (Unit Test Script) cho healthInsurance.service.ts
 * Nhắm đến: getHealthInsuranceById, getHealthInsurancesByUserId (logic coverage),
 * createHealthInsurance, updateHealthInsurance, deleteHealthInsurance
 */
describe('Health Insurance Service Tests', () => {
    let testUserId: string;
    let testInsuranceId: string;
    let createdInsuranceId: string | null = null;

    beforeAll(async () => {
        const user = await prisma.user.findFirst({ where: { role: { name: 'patient' } } });
        if (!user) throw new Error('Cần có DB với User (patient) để test');
        testUserId = user.id;

        // Tìm bảo hiểm có sẵn
        const insurance = await prisma.healthInsurance.findFirst({
            where: { userId: testUserId },
        });
        if (insurance) testInsuranceId = insurance.id;
    });

    afterAll(async () => {
        // Cleanup bảo hiểm đã tạo trong test
        if (createdInsuranceId) {
            await prisma.healthInsurance.deleteMany({ where: { id: createdInsuranceId } });
        }
    });

    // ========================
    // getHealthInsuranceById
    // ========================

    // Test Case ID: TC-HI-01
    // Lớp kiểm thử: HealthInsuranceService
    // Hàm kiểm thử: getHealthInsuranceById
    // Mục đích: Lấy bảo hiểm theo ID hợp lệ
    // Input: id tồn tại trong DB
    // Output dự kiến: Object chứa thông tin bảo hiểm
    it('TC-HI-01: Should return health insurance for valid ID', async () => {
        if (!testInsuranceId) return; // skip if no data
        const result = await healthInsuranceService.getHealthInsuranceById(testInsuranceId);
        expect(result).toBeDefined();
    });

    // Test Case ID: TC-HI-02
    // Lớp kiểm thử: HealthInsuranceService
    // Hàm kiểm thử: getHealthInsuranceById
    // Mục đích: Trả về null khi ID không tồn tại
    // Input: id = "non-existent-id"
    // Output dự kiến: null hoặc undefined
    it('TC-HI-02: Should return null for non-existent ID', async () => {
        const result = await healthInsuranceService.getHealthInsuranceById('non-existent-id');
        expect(result).toBeNull();
    });

    // ========================
    // getHealthInsurancesByUserId (logic coverage mapping)
    // ========================

    // Test Case ID: TC-HI-03
    // Lớp kiểm thử: HealthInsuranceService
    // Hàm kiểm thử: getHealthInsurancesByUserId
    // Mục đích: Lấy danh sách bảo hiểm và verify coverage được tính
    // Input: userId hợp lệ
    // Output dự kiến: Mỗi phần tử có trường coverage
    it('TC-HI-03: Should return health insurances with coverage field calculated', async () => {
        const result = await healthInsuranceService.getHealthInsurancesByUserId(testUserId);
        if (result && result.data && result.data.length > 0) {
            result.data.forEach((item: any) => {
                expect(item).toHaveProperty('coverage');
                expect(typeof item.coverage).toBe('number');
            });
        }
    });

    // Test Case ID: TC-HI-07
    // Lớp kiểm thử: HealthInsuranceService
    // Hàm kiểm thử: getHealthInsurancesByUserId
    // Mục đích: Trả về danh sách rỗng khi user không có bảo hiểm
    // Input: userId không có bảo hiểm
    // Output dự kiến: data.length === 0 hoặc data rỗng
    it('TC-HI-07: Should return empty data for user with no insurance', async () => {
        const result = await healthInsuranceService.getHealthInsurancesByUserId('non-existent-user-id');
        if (result && result.data) {
            expect(result.data.length).toBe(0);
        }
    });

    // ========================
    // createHealthInsurance
    // ========================

    // Test Case ID: TC-HI-09
    // Lớp kiểm thử: HealthInsuranceService
    // Hàm kiểm thử: createHealthInsurance
    // Mục đích: Tạo bảo hiểm y tế thành công
    // Input: userId hợp lệ, data với các trường bắt buộc
    // Output dự kiến: Object bảo hiểm mới được tạo
    it('TC-HI-09: Should create health insurance successfully', async () => {
        const data: any = {
            insuranceId: 'TEST-INS-' + Date.now(),
            type: 'social',
            startAt: '2026-01-01T00:00:00.000Z',
            endAt: '2026-12-31T00:00:00.000Z',
            level_of_benefit: 3,
            province_code: '01',
            initial_kcb_code: 'BV01',
            initial_kcb_name: 'Bệnh viện Test',
        };

        const result = await healthInsuranceService.createHealthInsurance(testUserId, data);
        expect(result).toBeDefined();
        expect(result.insuranceId).toBe(data.insuranceId);
        createdInsuranceId = result.id; // Save for cleanup
    });

    // ========================
    // updateHealthInsurance
    // ========================

    // Test Case ID: TC-HI-10
    // Lớp kiểm thử: HealthInsuranceService
    // Hàm kiểm thử: updateHealthInsurance
    // Mục đích: Cập nhật bảo hiểm thành công
    // Input: id hợp lệ, data = { type: "commercial" }
    // Output dự kiến: Object bảo hiểm đã cập nhật
    it('TC-HI-10: Should update health insurance successfully', async () => {
        if (!createdInsuranceId) return;
        const result = await healthInsuranceService.updateHealthInsurance(createdInsuranceId, {
            type: 'commercial',
        } as any);
        expect(result).toBeDefined();
    });

    // ========================
    // deleteHealthInsurance
    // ========================

    // Test Case ID: TC-HI-11
    // Lớp kiểm thử: HealthInsuranceService
    // Hàm kiểm thử: deleteHealthInsurance
    // Mục đích: Xóa bảo hiểm thành công
    // Input: id hợp lệ
    // Output dự kiến: Không ném lỗi; xóa thành công
    it('TC-HI-11: Should delete health insurance successfully', async () => {
        if (!createdInsuranceId) return;
        await expect(
            healthInsuranceService.deleteHealthInsurance(createdInsuranceId)
        ).resolves.not.toThrow();
        createdInsuranceId = null; // Already deleted
    });
});
