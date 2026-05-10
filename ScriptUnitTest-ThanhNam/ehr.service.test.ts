import ehrService from '@src/services/ehr.service';
import {
    createEHRForPatient,
    createHealthInfoByPatientId,
    deleteEHRById,
    findEHRById,
    findEHRByPatientId,
    findHealthInfoByPatientId,
    getListEHRs,
    updateHealthInfoByPatientId,
} from '@src/daos/ehr.dao';
import { CustomError, ErrorType } from '@src/core/Error';
import prisma from '@src/config/prisma';
import fileAssetDao from '@src/daos/fileAsset.dao';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
jest.mock('@src/daos/ehr.dao');
jest.mock('@src/daos/fileAsset.dao', () => ({
    __esModule: true,
    default: { getFileAssetsOfMedicalRecord: jest.fn() },
}));
jest.mock('@src/config/prisma', () => ({
    __esModule: true,
    default: {
        medicalRecord: { findMany: jest.fn() },
        user:          { findFirst: jest.fn() },
        patient:       { findUnique: jest.fn() },
    },
}));

// ---------------------------------------------------------------------------
// Typed helpers
// ---------------------------------------------------------------------------
const mockedFindEHRByPatientId       = findEHRByPatientId       as jest.Mock;
const mockedFindHealthInfoByPatientId= findHealthInfoByPatientId as jest.Mock;
const mockedCreateHealthInfo         = createHealthInfoByPatientId as jest.Mock;
const mockedUpdateHealthInfo         = updateHealthInfoByPatientId as jest.Mock;
const mockedCreateEHRForPatient      = createEHRForPatient      as jest.Mock;
const mockedDeleteEHRById            = deleteEHRById            as jest.Mock;
const mockedGetListEHRs              = getListEHRs              as jest.Mock;
const mockedFindEHRById              = findEHRById              as jest.Mock;
const mockedMedicalRecordFindMany    = prisma.medicalRecord.findMany as jest.Mock;
const mockedUserFindFirst            = prisma.user.findFirst    as jest.Mock;
const mockedPatientFindUnique        = prisma.patient.findUnique as jest.Mock;
const mockedGetFileAssets            = fileAssetDao.getFileAssetsOfMedicalRecord as jest.Mock;

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------
const PATIENT_ID = 'patient-001';
const USER_ID    = 'user-uuid-001';
const EHR_ID     = '550e8400-e29b-41d4-a716-446655440000';

const mockEHR = {
    id: EHR_ID,
    patientId: PATIENT_ID,
    visits: [{ id: 'visit-1' }, { id: 'visit-2' }],
    createdAt: new Date('2024-01-01'),
};

const mockHealthInfo = {
    id: 'hi-001',
    patientId: PATIENT_ID,
    weight: 70,
    height: 170,
    bloodType: 'A+',
    has_high_blood_pressure: false,
    has_diabetes: false,
    has_allergies: false,
    has_cancer: false,
};

const mockMedicalRecord = {
    id: 'rec-001',
    visitId: 'visit-1',
    createdAt: new Date('2024-01-01'),
};

const validHealthData = {
    weight: 70,
    height: 170,
    bloodType: 'A+' as const,
    has_high_blood_pressure: false,
    has_diabetes: false,
    has_allergies: false,
    has_cancer: false,
};

// ---------------------------------------------------------------------------
beforeEach(() => jest.clearAllMocks());

// ===========================================================================
describe('ehrService', () => {

    // =========================================================================
    // 1. getEHRByPatientId
    // =========================================================================
    describe('getEHRByPatientId', () => {
        it('nên trả về EHR kèm medicalResult khi tìm thấy', async () => {
            mockedFindEHRByPatientId.mockResolvedValue(mockEHR);
            mockedMedicalRecordFindMany.mockResolvedValue([mockMedicalRecord]);
            mockedGetFileAssets.mockResolvedValue([]);

            const result = await ehrService.getEHRByPatientId(PATIENT_ID);

            expect(mockedFindEHRByPatientId).toHaveBeenCalledWith(PATIENT_ID);
            expect(mockedMedicalRecordFindMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { visitId: { in: ['visit-1', 'visit-2'] } },
                })
            );
            expect(result).toHaveProperty('medicalResult');
            expect(result.medicalResult).toHaveLength(1);
        });

        it('nên xử lý khi EHR không có visits (visits rỗng)', async () => {
            mockedFindEHRByPatientId.mockResolvedValue({ ...mockEHR, visits: [] });
            mockedMedicalRecordFindMany.mockResolvedValue([]);
            mockedGetFileAssets.mockResolvedValue([]);

            const result = await ehrService.getEHRByPatientId(PATIENT_ID);
            expect(result.medicalResult).toHaveLength(0);
        });

        it('nên ném NOT_FOUND khi không tìm thấy EHR', async () => {
            mockedFindEHRByPatientId.mockResolvedValue(null);

            await expect(ehrService.getEHRByPatientId(PATIENT_ID))
                .rejects.toMatchObject({ type: ErrorType.NOT_FOUND });
        });
    });

    // =========================================================================
    // 2. getHealthInfoByPatientId
    // =========================================================================
    describe('getHealthInfoByPatientId', () => {
        it('nên trả về health info khi tìm thấy', async () => {
            mockedFindHealthInfoByPatientId.mockResolvedValue(mockHealthInfo);

            const result = await ehrService.getHealthInfoByPatientId(PATIENT_ID);
            expect(result).toEqual(mockHealthInfo);
        });

        it('nên ném NOT_FOUND khi health info chưa được tạo', async () => {
            mockedFindHealthInfoByPatientId.mockResolvedValue(null);

            await expect(ehrService.getHealthInfoByPatientId(PATIENT_ID))
                .rejects.toMatchObject({
                    type: ErrorType.NOT_FOUND,
                    message: 'Thông tin sức khỏe chưa được tạo.',
                });
        });
    });

    // =========================================================================
    // 3. createHealthInfo  (mutating – rollback)
    // =========================================================================
    describe('createHealthInfo', () => {
        let createdHealthInfoId: string | null = null;
        afterEach(() => { createdHealthInfoId = null; });

        it('nên tạo health info thành công và trả về kèm BMI', async () => {
            const newRecord = { ...mockHealthInfo };
            mockedCreateHealthInfo.mockImplementation(async () => {
                createdHealthInfoId = 'hi-001'; // ghi nhận để rollback
                return newRecord;
            });

            const result = await ehrService.createHealthInfo(PATIENT_ID, validHealthData);

            expect(mockedCreateHealthInfo).toHaveBeenCalledWith(PATIENT_ID, validHealthData);
            expect(result).toHaveProperty('bmi');
            // BMI = 70 / (1.7^2) ≈ 24.22
            expect(result.bmi).toBeCloseTo(24.22, 1);
            // Rollback marker
            expect(createdHealthInfoId).toBe('hi-001');
        });

        it('nên trả về bmi = null khi weight hoặc height là null', async () => {
            mockedCreateHealthInfo.mockResolvedValue({
                ...mockHealthInfo, weight: null, height: null,
            });

            const result = await ehrService.createHealthInfo(PATIENT_ID, validHealthData);
            expect(result.bmi).toBeNull();
        });

        it('nên ném VALIDATION_ERROR khi BMI < 10 (quá nhẹ)', async () => {
            // weight=5, height=170 → BMI ≈ 1.7 < 10
            await expect(
                ehrService.createHealthInfo(PATIENT_ID, { ...validHealthData, weight: 5 })
            ).rejects.toMatchObject({ type: ErrorType.VALIDATION_ERROR });
            expect(mockedCreateHealthInfo).not.toHaveBeenCalled();
        });

        it('nên ném VALIDATION_ERROR khi BMI > 100 (quá béo)', async () => {
            // weight=500, height=50 → BMI = 500/(0.5^2) = 2000 > 100
            await expect(
                ehrService.createHealthInfo(PATIENT_ID, { ...validHealthData, weight: 500, height: 50 })
            ).rejects.toMatchObject({ type: ErrorType.VALIDATION_ERROR });
        });
    });

    // =========================================================================
    // 4. updateHealthInfo  (mutating – rollback)
    // =========================================================================
    describe('updateHealthInfo', () => {
        let snapshotBefore: typeof mockHealthInfo;
        beforeEach(() => { snapshotBefore = { ...mockHealthInfo }; });
        afterEach(() => { Object.assign(mockHealthInfo, snapshotBefore); });

        it('nên cập nhật health info và trả về kèm BMI', async () => {
            const updatedRecord = { ...mockHealthInfo, weight: 75 };
            mockedUpdateHealthInfo.mockImplementation(async () => {
                mockHealthInfo.weight = 75; // simulate update
                return updatedRecord;
            });

            const result = await ehrService.updateHealthInfo(
                PATIENT_ID,
                { weight: 75, height: 170 }
            );

            expect(mockedUpdateHealthInfo).toHaveBeenCalledWith(
                PATIENT_ID, { weight: 75, height: 170 }
            );
            expect(result.bmi).not.toBeNull();
            // Rollback
            Object.assign(mockHealthInfo, snapshotBefore);
        });

        it('nên cập nhật thành công khi không truyền weight/height (bmi = null)', async () => {
            const updatedRecord = { ...mockHealthInfo, weight: undefined, height: undefined };
            mockedUpdateHealthInfo.mockResolvedValue(updatedRecord as any);

            const result = await ehrService.updateHealthInfo(
                PATIENT_ID,
                { bloodType: 'B+' }
            );

            expect(mockedUpdateHealthInfo).toHaveBeenCalled();
            expect(result.bmi).toBeNull();
        });

        it('nên ném VALIDATION_ERROR khi cả weight và height đều có nhưng BMI < 10', async () => {
            await expect(
                ehrService.updateHealthInfo(PATIENT_ID, { weight: 5, height: 170 })
            ).rejects.toMatchObject({ type: ErrorType.VALIDATION_ERROR });
            expect(mockedUpdateHealthInfo).not.toHaveBeenCalled();
        });

        it('nên ném VALIDATION_ERROR khi BMI > 100', async () => {
            await expect(
                ehrService.updateHealthInfo(PATIENT_ID, { weight: 500, height: 50 })
            ).rejects.toMatchObject({ type: ErrorType.VALIDATION_ERROR });
        });

        it('nên BỎ QUA validate BMI khi chỉ truyền weight mà không có height', async () => {
            mockedUpdateHealthInfo.mockResolvedValue({
                ...mockHealthInfo, weight: 50, height: undefined,
            } as any);

            // Không nên throw – BMI validation chỉ chạy khi CẢ HAI được truyền
            await expect(
                ehrService.updateHealthInfo(PATIENT_ID, { weight: 5 })
            ).resolves.toBeDefined();
        });
    });

    // =========================================================================
    // 5. checkPatientAccess
    // =========================================================================
    describe('checkPatientAccess', () => {
        const mockAdmin   = { id: USER_ID, role: { name: 'admin' } };
        const mockDoctor  = { id: USER_ID, role: { name: 'doctor' } };
        const mockPatient = { id: USER_ID, role: { name: 'patient' } };
        const mockOther   = { id: USER_ID, role: { name: 'nurse' } };
        const patientRecord = { userId: PATIENT_ID };

        it('nên cho phép admin truy cập', async () => {
            mockedUserFindFirst.mockResolvedValue(mockAdmin);
            mockedPatientFindUnique.mockResolvedValue(patientRecord);

            await expect(
                ehrService.checkPatientAccess(PATIENT_ID, USER_ID)
            ).resolves.toBe(true);
        });

        it('nên cho phép doctor truy cập', async () => {
            mockedUserFindFirst.mockResolvedValue(mockDoctor);
            mockedPatientFindUnique.mockResolvedValue(patientRecord);

            await expect(
                ehrService.checkPatientAccess(PATIENT_ID, USER_ID)
            ).resolves.toBe(true);
        });

        it('nên cho phép patient truy cập hồ sơ của chính mình', async () => {
            mockedUserFindFirst.mockResolvedValue(mockPatient);
            // patient.userId === userId (cùng là USER_ID)
            mockedPatientFindUnique.mockResolvedValue({ userId: USER_ID });

            await expect(
                ehrService.checkPatientAccess(USER_ID, USER_ID)
            ).resolves.toBe(true);
        });

        it('nên ném FORBIDDEN khi patient truy cập hồ sơ người khác', async () => {
            mockedUserFindFirst.mockResolvedValue(mockPatient);
            mockedPatientFindUnique.mockResolvedValue({ userId: 'another-patient' });

            await expect(
                ehrService.checkPatientAccess(PATIENT_ID, USER_ID)
            ).rejects.toMatchObject({ type: ErrorType.FORBIDDEN });
        });
    });

    // =========================================================================
    // 6. createEHR  (mutating – rollback)
    // =========================================================================
    describe('createEHR', () => {
        let createdEHRId: string | null = null;
        afterEach(() => { createdEHRId = null; });

        it('nên tạo EHR thành công', async () => {
            mockedCreateEHRForPatient.mockImplementation(async () => {
                createdEHRId = EHR_ID;
                return mockEHR;
            });

            const result = await ehrService.createEHR({ patientId: PATIENT_ID });

            expect(mockedCreateEHRForPatient).toHaveBeenCalledWith(PATIENT_ID);
            expect(result).toEqual(mockEHR);
            // Rollback marker
            expect(createdEHRId).toBe(EHR_ID);
        });

        it('nên ném BAD_REQUEST khi bệnh nhân đã có EHR', async () => {
            mockedCreateEHRForPatient.mockRejectedValue(
                new Error('Bệnh nhân đã có hồ sơ bệnh án')
            );

            await expect(ehrService.createEHR({ patientId: PATIENT_ID }))
                .rejects.toMatchObject({ type: ErrorType.BAD_REQUEST });
        });

        it('nên ném NOT_FOUND khi bệnh nhân không tồn tại', async () => {
            mockedCreateEHRForPatient.mockRejectedValue(
                new Error('Bệnh nhân không tồn tại')
            );

            await expect(ehrService.createEHR({ patientId: PATIENT_ID }))
                .rejects.toMatchObject({ type: ErrorType.NOT_FOUND });
        });
    });

    // =========================================================================
    // 7. deleteEHR  (mutating – rollback)
    // =========================================================================
    describe('deleteEHR', () => {
        let deletedEHRId: string | null = null;
        afterEach(() => { deletedEHRId = null; });

        it('nên xóa EHR thành công và trả về message', async () => {
            mockedDeleteEHRById.mockImplementation(async (id) => {
                deletedEHRId = id; // ghi nhận để rollback
                return mockEHR;
            });

            const result = await ehrService.deleteEHR({ ehrId: EHR_ID });

            expect(mockedDeleteEHRById).toHaveBeenCalledWith(EHR_ID);
            expect(result.message).toBe('Xóa hồ sơ bệnh án thành công');
            expect(result.deletedEHR).toEqual(mockEHR);
            // Rollback marker
            expect(deletedEHRId).toBe(EHR_ID);
        });

        it('nên ném NOT_FOUND khi EHR không tồn tại', async () => {
            mockedDeleteEHRById.mockRejectedValue(
                new Error('Hồ sơ bệnh án không tồn tại')
            );

            await expect(ehrService.deleteEHR({ ehrId: EHR_ID }))
                .rejects.toMatchObject({ type: ErrorType.NOT_FOUND });
            // Không xóa thực sự
            expect(deletedEHRId).toBeNull();
        });
    });

    // =========================================================================
    // 8. getAllEHRs
    // =========================================================================
    describe('getAllEHRs', () => {
        const defaultQuery = {
            page: '1', limit: '10',
            sortBy: 'createdAt' as const,
            sortOrder: 'desc' as const,
        };

        it('nên trả về danh sách EHR khi có dữ liệu', async () => {
            const mockResult = { data: [mockEHR], total: 1 };
            mockedGetListEHRs.mockResolvedValue(mockResult);

            const result = await ehrService.getAllEHRs(defaultQuery);
            expect(result).toEqual(mockResult);
            expect(mockedGetListEHRs).toHaveBeenCalledWith(defaultQuery);
        });

        it('nên ném NOT_FOUND khi data rỗng', async () => {
            mockedGetListEHRs.mockResolvedValue({ data: [], total: 0 });

            await expect(ehrService.getAllEHRs(defaultQuery))
                .rejects.toMatchObject({ type: ErrorType.NOT_FOUND });
        });
    });

    // =========================================================================
    // 9. getEHRById
    // =========================================================================
    describe('getEHRById', () => {
        it('nên trả về EHR khi tìm thấy theo ehrId', async () => {
            mockedFindEHRById.mockResolvedValue(mockEHR);

            const result = await ehrService.getEHRById({ ehrId: EHR_ID });
            expect(mockedFindEHRById).toHaveBeenCalledWith(EHR_ID);
            expect(result).toEqual(mockEHR);
        });
    });
});
