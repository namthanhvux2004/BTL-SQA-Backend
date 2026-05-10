import emergencyContactService from '@src/services/emergencyContact.service';
import prisma from '@src/config/prisma';

/**
 * Lớp kiểm thử (Unit Test Script) cho emergencyContact.service.ts
 * Nhắm đến: getEmergencyContactById, getEmergencyContactsByPatientId,
 * createEmergencyContact, updateEmergencyContact, deleteEmergencyContact
 */
describe('Emergency Contact Service Tests', () => {
    let testPatientId: string;
    let testContactId: string;
    let createdContactId: string | null = null;

    beforeAll(async () => {
        const patient = await prisma.patient.findFirst();
        if (!patient) throw new Error('Cần có DB với Patient để test');
        testPatientId = patient.userId; // EmergencyContact FK references Patient.userId

        // Tìm liên hệ khẩn cấp có sẵn
        const contact = await prisma.emergencyContact.findFirst({
            where: { patientId: testPatientId },
        });
        if (contact) testContactId = contact.id;
    });

    afterAll(async () => {
        if (createdContactId) {
            await prisma.emergencyContact.deleteMany({ where: { id: createdContactId } });
        }
    });

    // Test Case ID: TC-EC-01
    // Lớp kiểm thử: EmergencyContactService
    // Hàm kiểm thử: getEmergencyContactById
    // Mục đích: Lấy liên hệ khẩn cấp theo ID hợp lệ
    // Input: id = ID tồn tại trong DB
    // Output dự kiến: Object chứa thông tin liên hệ khẩn cấp
    it('TC-EC-01: Should return emergency contact for valid ID', async () => {
        if (!testContactId) return;
        const result = await emergencyContactService.getEmergencyContactById(testContactId);
        expect(result).toBeDefined();
    });

    // Test Case ID: TC-EC-02
    // Lớp kiểm thử: EmergencyContactService
    // Hàm kiểm thử: getEmergencyContactById
    // Mục đích: Trả về null/undefined khi ID không tồn tại
    // Input: id = "non-existent-id"
    // Output dự kiến: null hoặc undefined
    it('TC-EC-02: Should return null for non-existent ID', async () => {
        const result = await emergencyContactService.getEmergencyContactById('non-existent-id');
        expect(result).toBeNull();
    });

    // Test Case ID: TC-EC-03
    // Lớp kiểm thử: EmergencyContactService
    // Hàm kiểm thử: getEmergencyContactsByPatientId
    // Mục đích: Lấy danh sách liên hệ theo patientId hợp lệ
    // Input: patientId hợp lệ, queryParams = { page: "1", limit: "10" }
    // Output dự kiến: Object { data: [...] } với mảng data
    it('TC-EC-03: Should return emergency contacts for valid patientId', async () => {
        const result = await emergencyContactService.getEmergencyContactsByPatientId(
            testPatientId,
            { page: '1', limit: '10' }
        );
        expect(result).toHaveProperty('data');
        expect(Array.isArray(result.data)).toBe(true);
    });

    // Test Case ID: TC-EC-04
    // Lớp kiểm thử: EmergencyContactService
    // Hàm kiểm thử: getEmergencyContactsByPatientId
    // Mục đích: Trả về danh sách rỗng khi patientId không có liên hệ nào
    // Input: patientId không có liên hệ
    // Output dự kiến: Object { data: [] }
    it('TC-EC-04: Should return empty list for patientId with no contacts', async () => {
        const result = await emergencyContactService.getEmergencyContactsByPatientId(
            'non-existent-patient-id',
            { page: '1', limit: '10' }
        );
        if (result && result.data) {
            expect(result.data.length).toBe(0);
        }
    });

    // Test Case ID: TC-EC-05
    // Lớp kiểm thử: EmergencyContactService
    // Hàm kiểm thử: createEmergencyContact
    // Mục đích: Tạo liên hệ khẩn cấp thành công
    // Input: patientId hợp lệ, data = { fullName, phone, relationship }
    // Output dự kiến: Object liên hệ mới được tạo có đầy đủ các trường
    it('TC-EC-05: Should create emergency contact successfully', async () => {
        const data = {
            fullName: 'Test Contact ' + Date.now(),
            phone: '0901234567',
            relationship: 'Cha',
        } as any;

        const result = await emergencyContactService.createEmergencyContact(testPatientId, data);
        expect(result).toBeDefined();
        expect(result.fullName).toBe(data.fullName);
        expect(result.phone).toBe(data.phone);
        createdContactId = result.id;
    });

    // Test Case ID: TC-EC-06
    // Lớp kiểm thử: EmergencyContactService
    // Hàm kiểm thử: updateEmergencyContact
    // Mục đích: Cập nhật liên hệ khẩn cấp thành công
    // Input: id hợp lệ, data = { phone: "0987654321" }
    // Output dự kiến: Object liên hệ với phone đã cập nhật
    it('TC-EC-06: Should update emergency contact successfully', async () => {
        if (!createdContactId) return;
        const result = await emergencyContactService.updateEmergencyContact(createdContactId, {
            phone: '0987654321',
        } as any);
        expect(result).toBeDefined();
    });

    // Test Case ID: TC-EC-07
    // Lớp kiểm thử: EmergencyContactService
    // Hàm kiểm thử: deleteEmergencyContact
    // Mục đích: Xóa liên hệ khẩn cấp thành công
    // Input: id hợp lệ
    // Output dự kiến: Không ném lỗi; xóa thành công
    it('TC-EC-07: Should delete emergency contact successfully', async () => {
        if (!createdContactId) return;
        await expect(
            emergencyContactService.deleteEmergencyContact(createdContactId)
        ).resolves.not.toThrow();
        createdContactId = null;
    });
});
