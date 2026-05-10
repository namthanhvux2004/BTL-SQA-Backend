import patientService from '@src/services/patient.service';
import prisma from '@src/config/prisma';
import { CustomError } from '@src/core/Error';
import { TokenPayload } from '@src/middleware/auth.middleware';

/**
 * Lớp kiểm thử (Unit Test Script) cho patient.service.ts
 * Nhắm đến: getPatientById (với checkPatientAccess nội bộ), getAllPatients
 */
describe('Patient Service Tests', () => {
    let testPatientUserId: string;
    let testPatientId: string;
    let testDoctorUserId: string;

    beforeAll(async () => {
        const patient = await prisma.patient.findFirst();
        if (!patient) throw new Error('Cần có DB với Patient để test');
        testPatientUserId = patient.userId;
        testPatientId = patient.patientId;

        const doctor = await prisma.doctor.findFirst();
        if (doctor) testDoctorUserId = doctor.userId;
    });

    // ========================
    // getPatientById - checkPatientAccess
    // ========================

    // Test Case ID: TC-PAT-01
    // Lớp kiểm thử: PatientService
    // Hàm kiểm thử: getPatientById
    // Mục đích: Admin lấy hồ sơ bệnh nhân thành công (bypass role)
    // Input: id = patientUserId, userToken = { role: "admin", id: "admin-id" }
    // Output dự kiến: Object chứa thông tin bệnh nhân
    it('TC-PAT-01: Should allow admin to access patient record (bypass role)', async () => {
        const adminToken: TokenPayload = { role: 'admin', id: 'any-admin-id' } as any;
        const result = await patientService.getPatientById(testPatientUserId, adminToken);
        expect(result).toBeDefined();
    });

    // Test Case ID: TC-PAT-02
    // Lớp kiểm thử: PatientService
    // Hàm kiểm thử: getPatientById
    // Mục đích: Doctor lấy hồ sơ bệnh nhân thành công (bypass role)
    // Input: id = patientUserId, userToken = { role: "doctor", id: "doctor-id" }
    // Output dự kiến: Object chứa thông tin bệnh nhân
    it('TC-PAT-02: Should allow doctor to access patient record (bypass role)', async () => {
        const doctorToken: TokenPayload = { role: 'doctor', id: testDoctorUserId || 'any-doctor-id' } as any;
        const result = await patientService.getPatientById(testPatientUserId, doctorToken);
        expect(result).toBeDefined();
    });

    // Test Case ID: TC-PAT-03
    // Lớp kiểm thử: PatientService
    // Hàm kiểm thử: getPatientById
    // Mục đích: Patient tự xem hồ sơ của mình
    // Input: id = userId của patient, userToken = { role: "patient", id: userId }
    // Output dự kiến: Object chứa thông tin bệnh nhân
    it('TC-PAT-03: Should allow patient to access their own record', async () => {
        const patientToken: TokenPayload = { role: 'patient', id: testPatientUserId } as any;
        const result = await patientService.getPatientById(testPatientUserId, patientToken);
        expect(result).toBeDefined();
    });

    // Test Case ID: TC-PAT-04
    // Lớp kiểm thử: PatientService
    // Hàm kiểm thử: getPatientById
    // Mục đích: Patient xem hồ sơ người khác → FORBIDDEN
    // Input: id = patientId của người khác, userToken = { role: "patient", id: "other-patient-id" }
    // Output dự kiến: Ném CustomError(FORBIDDEN) "Bạn không có quyền truy cập hồ sơ bệnh án này"
    it('TC-PAT-04: Should throw FORBIDDEN when patient tries to access another patient record', async () => {
        const otherPatientToken: TokenPayload = { role: 'patient', id: 'other-patient-id-xyz' } as any;
        await expect(
            patientService.getPatientById(testPatientUserId, otherPatientToken)
        ).rejects.toThrow(CustomError);
        await expect(
            patientService.getPatientById(testPatientUserId, otherPatientToken)
        ).rejects.toThrow('Bạn không có quyền truy cập hồ sơ bệnh án này');
    });

    // Test Case ID: TC-PAT-05
    // Lớp kiểm thử: PatientService
    // Hàm kiểm thử: getPatientById
    // Mục đích: ID bệnh nhân không tồn tại → NOT_FOUND
    // Input: id = "non-existent-id", userToken bất kỳ
    // Output dự kiến: Ném CustomError(NOT_FOUND) "Không tìm thấy bệnh nhân"
    it('TC-PAT-05: Should throw NOT_FOUND for non-existent patient', async () => {
        const adminToken: TokenPayload = { role: 'admin', id: 'admin-id' } as any;
        await expect(
            patientService.getPatientById('non-existent-id', adminToken)
        ).rejects.toThrow(CustomError);
        await expect(
            patientService.getPatientById('non-existent-id', adminToken)
        ).rejects.toThrow('Không tìm thấy bệnh nhân');
    });

    // Test Case ID: TC-PAT-06
    // Lớp kiểm thử: PatientService
    // Hàm kiểm thử: getPatientById
    // Mục đích: Role không hợp lệ (vd: "nurse") → FORBIDDEN
    // Input: id = patientId hợp lệ, userToken = { role: "nurse", id: "..." }
    // Output dự kiến: Ném CustomError(FORBIDDEN)
    it('TC-PAT-06: Should throw FORBIDDEN for unrecognized role', async () => {
        const nurseToken: TokenPayload = { role: 'nurse' as any, id: 'nurse-id' } as any;
        await expect(
            patientService.getPatientById(testPatientUserId, nurseToken)
        ).rejects.toThrow(CustomError);
        await expect(
            patientService.getPatientById(testPatientUserId, nurseToken)
        ).rejects.toThrow('Bạn không có quyền truy cập hồ sơ bệnh án này');
    });

    // ========================
    // getAllPatients
    // ========================

    // Test Case ID: TC-PAT-07
    // Lớp kiểm thử: PatientService
    // Hàm kiểm thử: getAllPatients
    // Mục đích: Lấy danh sách tất cả bệnh nhân
    // Input: query = { page: "1", limit: "10" }
    // Output dự kiến: Object { data: [...] } với mảng data
    it('TC-PAT-07: Should return list of all patients', async () => {
        const query = { page: '1', limit: '10' };
        const result = await patientService.getAllPatients(query);
        expect(result).toHaveProperty('data');
        expect(Array.isArray(result.data)).toBe(true);
    });

    // Test Case ID: TC-PAT-08
    // Lớp kiểm thử: PatientService
    // Hàm kiểm thử: getAllPatients
    // Mục đích: Phân trang hoạt động đúng
    // Input: query = { page: "1", limit: "2" }
    // Output dự kiến: data.length <= 2
    it('TC-PAT-08: Should respect pagination limit', async () => {
        const query = { page: '1', limit: '2' };
        const result = await patientService.getAllPatients(query);
        expect(result.data.length).toBeLessThanOrEqual(2);
    });
});
