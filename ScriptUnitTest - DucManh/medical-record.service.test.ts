import medicalRecordService from '@src/services/medical-record.service';
import { DbHelper } from './helpers/db-helper';
import prisma from '@src/config/prisma';

describe('MedicalRecordService Integration Tests (Full Excel Alignment)', () => {
  let doctorId: string;
  let visitId: string;
  let patientId: string;

  beforeAll(async () => {
    doctorId = await DbHelper.getAnyDoctorId();
    patientId = await DbHelper.getAnyPatientId();
    // Create a fresh in_progress visit for testing
    const patient = await prisma.patient.findUnique({ where: { userId: patientId }, include: { ehr: true } });
    if (patient && patient.ehr) {
      const freshVisit = await prisma.visit.create({
        data: {
          patientUserId: patientId,
          ehrId: patient.ehr.id,
          doctorId,
          status: 'in_progress',
          type: 'new',
          startTime: new Date()
        }
      });
      visitId = freshVisit.id;
    } else {
      visitId = await DbHelper.getAnyVisitId(doctorId);
    }
  });

  describe('Create Medical Record (REC_001 - REC_005)', () => {
    test('REC_001: Tạo hồ sơ bệnh án - Thành công', async () => {
      const data = {
        visitId,
        symptoms: 'Fever and cough',
        diagnosis: 'Common Cold',
        treatments: 'Drink water and rest',
        title: 'Initial Consultation'
      };
      const record = await medicalRecordService.createMedicalRecord(doctorId, data as any);
      expect(record).toBeDefined();
      expect(record.visitId).toBe(visitId);
    });

    test('REC_002: Tạo hồ sơ bệnh án - Thất bại do Visit đã hoàn thành', async () => {
      // Create a completed visit
      const patientId = await DbHelper.getAnyPatientId();
      const patient = await prisma.patient.findUnique({ where: { userId: patientId }, include: { ehr: true } });
      const completedVisit = await prisma.visit.create({
        data: {
          patientUserId: patientId,
          ehrId: patient!.ehr!.id,
          doctorId,
          status: 'completed',
          startTime: new Date()
        }
      });
      await expect(medicalRecordService.createMedicalRecord(doctorId, { visitId: completedVisit.id, title: 'Test', symptoms: 'S', diagnosis: 'D', treatments: 'T' } as any))
        .rejects.toThrow(/completed visit/);
    });

    test('REC_003: Tạo hồ sơ bệnh án - Thất bại do Visit đã bị hủy', async () => {
      const patientId = await DbHelper.getAnyPatientId();
      const patient = await prisma.patient.findUnique({ where: { userId: patientId }, include: { ehr: true } });
      const cancelledVisit = await prisma.visit.create({
        data: {
          patientUserId: patientId,
          ehrId: patient!.ehr!.id,
          doctorId,
          status: 'cancelled',
          startTime: new Date()
        }
      });
      await expect(medicalRecordService.createMedicalRecord(doctorId, { visitId: cancelledVisit.id, title: 'Test', symptoms: 'S', diagnosis: 'D', treatments: 'T' } as any))
        .rejects.toThrow(/cancelled visit/);
    });

    test('REC_004: Tạo hồ sơ bệnh án - Thất bại do Bác sĩ không được phân công', async () => {
      const otherDoctor = await DbHelper.createFreshDoctor();
      await expect(medicalRecordService.createMedicalRecord(otherDoctor, { visitId, title: 'Theft', symptoms: 'S', diagnosis: 'D', treatments: 'T' } as any))
        .rejects.toThrow(/not the assigned doctor/);
    });

    test('REC_005: Tạo hồ sơ bệnh án - Có kèm file đính kèm (Empty files array handled)', async () => {
      const record = await medicalRecordService.createMedicalRecord(doctorId, { visitId, title: 'Files Test', symptoms: 'S', diagnosis: 'D', treatments: 'T' } as any, []);
      expect(record.fileAssets).toHaveLength(0);
    });
  });

  describe('Update Medical Record (REC_006 - REC_008)', () => {
    test('REC_006: Cập nhật hồ sơ bệnh án - Thành công', async () => {
      const newRecord = await prisma.medicalRecord.create({
        data: { doctorId, visitId, title: 'Update Test', diagnosis: 'Initial', symptoms: 'None', treatments: 'None' }
      });
      const record = newRecord;
      if (record) {
        const updated = await medicalRecordService.updateMedicalRecord(record.id, doctorId, { diagnosis: 'Updated Diagnosis' });
        expect(updated.diagnosis).toBe('Updated Diagnosis');
      }
    });

    test('REC_007: Cập nhật hồ sơ bệnh án - Thêm file mới (Handled)', async () => {
      const newRecord = await prisma.medicalRecord.create({
        data: { doctorId, visitId, title: 'File Test', diagnosis: 'Test', symptoms: 'Test', treatments: 'Test' }
      });
      const record = newRecord;
      if (record) {
        const updated = await medicalRecordService.updateMedicalRecord(record.id, doctorId, {}, []);
        expect(updated.fileAssets).toBeDefined();
      }
    });

    test('REC_008: Cập nhật hồ sơ - Thất bại do hồ sơ không tồn tại', async () => {
      await expect(medicalRecordService.updateMedicalRecord('00000000-0000-0000-0000-000000000000', doctorId, { title: 'Ghost' }))
        .rejects.toThrow(/Medical record not found/);
    });
  });

  describe('Delete Medical Record (REC_009 - REC_010)', () => {
    test('REC_010: Xóa hồ sơ - Thất bại do không phải chủ sở hữu', async () => {
      const otherDoc = await DbHelper.createFreshDoctor();
      const newRecord = await prisma.medicalRecord.create({
        data: { doctorId, visitId, title: 'Permission Test', diagnosis: 'Test', symptoms: 'Test', treatments: 'Test' }
      });
      const record = newRecord;
      if (record) {
        await expect(medicalRecordService.deleteMedicalRecord(record.id, otherDoc))
          .rejects.toThrow(/permission/);
      }
    });

    test('REC_010: Xóa hồ sơ - Thất bại do không phải chủ sở hữu', async () => {
      const otherDoc = await DbHelper.createFreshDoctor();
      const record = await prisma.medicalRecord.create({
        data: { doctorId, visitId, title: 'Permission Test', diagnosis: 'Test', symptoms: 'Test', treatments: 'Test' }
      });
      if (record) {
        await expect(medicalRecordService.deleteMedicalRecord(record.id, otherDoc))
          .rejects.toThrow(/permission/);
      }
    });

    test('REC_009: Xóa hồ sơ bệnh án - Thành công', async () => {
      const record = await prisma.medicalRecord.create({
        data: {
          doctorId,
          visitId,
          title: 'To be deleted',
          diagnosis: 'Temp',
          symptoms: 'None',
          treatments: 'None'
        }
      });
      const result = await medicalRecordService.deleteMedicalRecord(record.id, doctorId);
      expect(result.success).toBe(true);
      const exists = await prisma.medicalRecord.findUnique({ where: { id: record.id } });
      expect(exists).toBeNull();
    });
  });

  describe('Query & Search (REC_011 - REC_013)', () => {
    test('REC_011: Lấy chi tiết - Thành công', async () => {
      const newRecord = await prisma.medicalRecord.create({
        data: { doctorId, visitId, title: 'Detail Test', diagnosis: 'Test', symptoms: 'Test', treatments: 'Test' }
      });
      const record = newRecord;
      if (record) {
        const detail = await medicalRecordService.getMedicalRecordById(record.id);
        expect(detail.id).toBe(record.id);
        expect(detail.fileAssets).toBeDefined();
      }
    });

    test('REC_012: Lấy danh sách - Phân trang', async () => {
      const result = await medicalRecordService.getMedicalRecordsList({ page: '1', limit: '5' });
      expect(result.pagination).toBeDefined();
      expect(result.data.length).toBeLessThanOrEqual(5);
    });

    test('REC_013: Lấy danh sách - Lọc theo visitId', async () => {
      const newRecord = await prisma.medicalRecord.create({
        data: { doctorId, visitId, title: 'Filter Test', diagnosis: 'Test', symptoms: 'Test', treatments: 'Test' }
      });
      const record = newRecord;
      if (record) {
        const result = await medicalRecordService.getMedicalRecordsList({ visitId: record.visitId, limit: '100' });
        expect(result.data.some((r: any) => r.id === record.id)).toBe(true);
      }
    });
  });

  describe('File Asset Deletion (REC_014 - REC_015)', () => {
    test('REC_015: Xóa File Asset - Thất bại do sai quyền', async () => {
      const record = await prisma.medicalRecord.create({
        data: { doctorId, visitId, title: 'Asset Perm Test', diagnosis: 'Test', symptoms: 'Test', treatments: 'Test' }
      });
      const asset = await prisma.fileAsset.create({
        data: { entityId: record.id, entityType: 'medical_record', url: 'http://test.com/file.jpg', name: 'test.jpg', size: 100, mimeType: 'image/jpeg', fileType: 'image/jpeg' }
      });
      if (asset) {
        await expect(medicalRecordService.deleteFileAsset(asset.id, '00000000-0000-0000-0000-000000000000'))
          .rejects.toThrow(/permission/);
      }
    });

    test('REC_014: Xóa File Asset - Thành công', async () => {
      const record = await prisma.medicalRecord.create({
        data: { doctorId, visitId, title: 'Asset test', diagnosis: 'D', symptoms: 'S', treatments: 'T' }
      });
      const asset = await prisma.fileAsset.create({
        data: {
          entityId: record.id,
          entityType: 'medical_record',
          url: 'http://test.com/file.jpg',
          name: 'test.jpg',
          size: 100,
          mimeType: 'image/jpeg',
          fileType: 'image/jpeg'
        }
      });
      const result = await medicalRecordService.deleteFileAsset(asset.id, doctorId);
      expect(result.success).toBe(true);
      const exists = await prisma.fileAsset.findUnique({ where: { id: asset.id } });
      expect(exists).toBeNull();
    });
  });
});

//////
// import medicalRecordService from '@src/services/medical-record.service';
// import { DbHelper } from './helpers/db-helper';
// import prisma from '@src/config/prisma';

// // Mock cloudinary and file asset DAO for file upload tests
// jest.mock('@src/services/cloudinary.service', () => ({
//   uploadToCloudinary: jest.fn().mockResolvedValue({ url: 'http://cloudinary.com/test.jpg', public_id: 'test_id' }),
//   deleteFromCloudinary: jest.fn().mockResolvedValue({}),
// }));

// jest.mock('@src/dtos/medical-record.dto', () => {
//   const actual = jest.requireActual('@src/dtos/medical-record.dto');
//   return {
//     ...actual,
//     validateFileUpload: jest.fn().mockReturnValue({ valid: true }),
//   };
// });

// import { validateFileUpload } from '@src/dtos/medical-record.dto';
// import { uploadToCloudinary } from '@src/services/cloudinary.service';

// describe('MedicalRecordService Integration Tests (Full Excel Alignment)', () => {
//   let doctorId: string;
//   let visitId: string;
//   let patientId: string;

//   beforeAll(async () => {
//     doctorId = await DbHelper.getAnyDoctorId();
//     patientId = await DbHelper.getAnyPatientId();
//     // Create a fresh in_progress visit for testing
//     const patient = await prisma.patient.findUnique({ where: { userId: patientId }, include: { ehr: true } });
//     if (patient && patient.ehr) {
//       const freshVisit = await prisma.visit.create({
//         data: {
//           patientUserId: patientId,
//           ehrId: patient.ehr.id,
//           doctorId,
//           status: 'in_progress',
//           type: 'new',
//           startTime: new Date()
//         }
//       });
//       visitId = freshVisit.id;
//     } else {
//       visitId = await DbHelper.getAnyVisitId(doctorId);
//     }
//   });

//   // ============================================================
//   // Create Medical Record (REC_001 - REC_007)
//   // ============================================================
//   describe('Create Medical Record (REC_001 - REC_007)', () => {
//     test('REC_001: Tạo hồ sơ bệnh án - Thành công', async () => {
//       const data = {
//         visitId,
//         symptoms: 'Fever and cough',
//         diagnosis: 'Common Cold',
//         treatments: 'Drink water and rest',
//         title: 'Initial Consultation'
//       };
//       const record = await medicalRecordService.createMedicalRecord(doctorId, data as any);
//       expect(record).toBeDefined();
//       expect(record.visitId).toBe(visitId);
//     });

//     test('REC_002: Tạo hồ sơ bệnh án - Thất bại do Visit đã hoàn thành', async () => {
//       const patientId = await DbHelper.getAnyPatientId();
//       const patient = await prisma.patient.findUnique({ where: { userId: patientId }, include: { ehr: true } });
//       const completedVisit = await prisma.visit.create({
//         data: {
//           patientUserId: patientId,
//           ehrId: patient!.ehr!.id,
//           doctorId,
//           status: 'completed',
//           startTime: new Date()
//         }
//       });
//       await expect(medicalRecordService.createMedicalRecord(doctorId, { visitId: completedVisit.id, title: 'Test', symptoms: 'S', diagnosis: 'D', treatments: 'T' } as any))
//         .rejects.toThrow(/completed visit/);
//     });

//     test('REC_003: Tạo hồ sơ bệnh án - Thất bại do Visit đã bị hủy', async () => {
//       const patientId = await DbHelper.getAnyPatientId();
//       const patient = await prisma.patient.findUnique({ where: { userId: patientId }, include: { ehr: true } });
//       const cancelledVisit = await prisma.visit.create({
//         data: {
//           patientUserId: patientId,
//           ehrId: patient!.ehr!.id,
//           doctorId,
//           status: 'cancelled',
//           startTime: new Date()
//         }
//       });
//       await expect(medicalRecordService.createMedicalRecord(doctorId, { visitId: cancelledVisit.id, title: 'Test', symptoms: 'S', diagnosis: 'D', treatments: 'T' } as any))
//         .rejects.toThrow(/cancelled visit/);
//     });

//     test('REC_004: Tạo hồ sơ bệnh án - Thất bại do Bác sĩ không được phân công', async () => {
//       const otherDoctor = await DbHelper.createFreshDoctor();
//       await expect(medicalRecordService.createMedicalRecord(otherDoctor, { visitId, title: 'Theft', symptoms: 'S', diagnosis: 'D', treatments: 'T' } as any))
//         .rejects.toThrow(/not the assigned doctor/);
//     });

//     test('REC_005: Tạo hồ sơ bệnh án - Thất bại do Visit không tồn tại', async () => {
//       const nonExistentVisitId = '00000000-0000-0000-0000-000000000000';
//       await expect(medicalRecordService.createMedicalRecord(doctorId, { visitId: nonExistentVisitId, title: 'Test', symptoms: 'S', diagnosis: 'D', treatments: 'T' } as any))
//         .rejects.toThrow(/Visit not found/);
//     });

//     test('REC_006: Tạo hồ sơ bệnh án - Thất bại do file không hợp lệ', async () => {
//       (validateFileUpload as jest.Mock).mockReturnValueOnce({ valid: false, error: 'Invalid file type' });
//       const invalidFile = { path: '/tmp/test.exe', mimetype: 'application/octet-stream', originalname: 'malware.exe', size: 1000 } as Express.Multer.File;
//       await expect(
//         medicalRecordService.createMedicalRecord(doctorId, { visitId, title: 'File Test', symptoms: 'S', diagnosis: 'D', treatments: 'T' } as any, [invalidFile])
//       ).rejects.toThrow(/Invalid file type/);
//     });

//     test('REC_007: Tạo hồ sơ bệnh án - Có kèm file đính kèm (Empty files array handled)', async () => {
//       const record = await medicalRecordService.createMedicalRecord(doctorId, { visitId, title: 'Files Test', symptoms: 'S', diagnosis: 'D', treatments: 'T' } as any, []);
//       expect(record.fileAssets).toHaveLength(0);
//     });
//   });

//   // ============================================================
//   // Update Medical Record (REC_008 - REC_013)
//   // ============================================================
//   describe('Update Medical Record (REC_008 - REC_013)', () => {
//     test('REC_008: Cập nhật hồ sơ bệnh án - Thành công', async () => {
//       const newRecord = await prisma.medicalRecord.create({
//         data: { doctorId, visitId, title: 'Update Test', diagnosis: 'Initial', symptoms: 'None', treatments: 'None' }
//       });
//       const record = newRecord;
//       if (record) {
//         const updated = await medicalRecordService.updateMedicalRecord(record.id, doctorId, { diagnosis: 'Updated Diagnosis' });
//         expect(updated.diagnosis).toBe('Updated Diagnosis');
//       }
//     });

//     test('REC_009: Cập nhật hồ sơ bệnh án - Thêm file mới (Handled)', async () => {
//       const newRecord = await prisma.medicalRecord.create({
//         data: { doctorId, visitId, title: 'File Test', diagnosis: 'Test', symptoms: 'Test', treatments: 'Test' }
//       });
//       const record = newRecord;
//       if (record) {
//         const updated = await medicalRecordService.updateMedicalRecord(record.id, doctorId, {}, []);
//         expect(updated.fileAssets).toBeDefined();
//       }
//     });

//     test('REC_010: Cập nhật hồ sơ - Thất bại do hồ sơ không tồn tại', async () => {
//       await expect(medicalRecordService.updateMedicalRecord('00000000-0000-0000-0000-000000000000', doctorId, { title: 'Ghost' }))
//         .rejects.toThrow(/Medical record not found/);
//     });

//     test('REC_011: Cập nhật hồ sơ - Thất bại do không phải chủ sở hữu', async () => {
//       const otherDoc = await DbHelper.createFreshDoctor();
//       const newRecord = await prisma.medicalRecord.create({
//         data: { doctorId, visitId, title: 'Owner Check', diagnosis: 'Test', symptoms: 'Test', treatments: 'Test' }
//       });
//       await expect(medicalRecordService.updateMedicalRecord(newRecord.id, otherDoc, { title: 'Hacked' }))
//         .rejects.toThrow(/permission/);
//     });

//     test('REC_012: Cập nhật hồ sơ - Thất bại do file mới không hợp lệ', async () => {
//       (validateFileUpload as jest.Mock).mockReturnValueOnce({ valid: false, error: 'File too large' });
//       const newRecord = await prisma.medicalRecord.create({
//         data: { doctorId, visitId, title: 'File Validation Update', diagnosis: 'Test', symptoms: 'Test', treatments: 'Test' }
//       });
//       const invalidFile = { path: '/tmp/big.pdf', mimetype: 'application/pdf', originalname: 'big.pdf', size: 999999999 } as Express.Multer.File;
//       await expect(
//         medicalRecordService.updateMedicalRecord(newRecord.id, doctorId, {}, [invalidFile])
//       ).rejects.toThrow(/File too large/);
//     });

//     test('REC_013: Cập nhật hồ sơ - Rollback khi upload file thất bại', async () => {
//       const { deleteFromCloudinary } = require('@src/services/cloudinary.service');
//       (uploadToCloudinary as jest.Mock).mockRejectedValueOnce(new Error('Cloudinary upload failed'));
//       const newRecord = await prisma.medicalRecord.create({
//         data: { doctorId, visitId, title: 'Rollback Test', diagnosis: 'Test', symptoms: 'Test', treatments: 'Test' }
//       });
//       const fakeFile = { path: '/tmp/test.jpg', mimetype: 'image/jpeg', originalname: 'test.jpg', size: 1000 } as Express.Multer.File;
//       await expect(
//         medicalRecordService.updateMedicalRecord(newRecord.id, doctorId, {}, [fakeFile])
//       ).rejects.toThrow(/Cloudinary upload failed/);
//     });
//   });

//   // ============================================================
//   // Delete Medical Record (REC_014 - REC_016)
//   // ============================================================
//   describe('Delete Medical Record (REC_014 - REC_016)', () => {
//     test('REC_014: Xóa hồ sơ bệnh án - Thành công', async () => {
//       const record = await prisma.medicalRecord.create({
//         data: {
//           doctorId,
//           visitId,
//           title: 'To be deleted',
//           diagnosis: 'Temp',
//           symptoms: 'None',
//           treatments: 'None'
//         }
//       });
//       const result = await medicalRecordService.deleteMedicalRecord(record.id, doctorId);
//       expect(result.success).toBe(true);
//       const exists = await prisma.medicalRecord.findUnique({ where: { id: record.id } });
//       expect(exists).toBeNull();
//     });

//     test('REC_015: Xóa hồ sơ bệnh án - Thành công và dọn sạch file đính kèm', async () => {
//       const { deleteFromCloudinary } = require('@src/services/cloudinary.service');
//       const record = await prisma.medicalRecord.create({
//         data: { doctorId, visitId, title: 'Delete With Files', diagnosis: 'Temp', symptoms: 'None', treatments: 'None' }
//       });
//       // Attach a file asset to this record
//       await prisma.fileAsset.create({
//         data: {
//           entityId: record.id,
//           entityType: 'medical_record',
//           url: 'http://cloudinary.com/to-delete.jpg',
//           name: 'to-delete.jpg',
//           size: 200,
//           mimeType: 'image/jpeg',
//           fileType: 'image/jpeg'
//         }
//       });
//       const result = await medicalRecordService.deleteMedicalRecord(record.id, doctorId);
//       expect(result.success).toBe(true);
//       expect(deleteFromCloudinary).toHaveBeenCalledWith('http://cloudinary.com/to-delete.jpg');
//       const exists = await prisma.medicalRecord.findUnique({ where: { id: record.id } });
//       expect(exists).toBeNull();
//     });

//     test('REC_016: Xóa hồ sơ - Thất bại do không phải chủ sở hữu', async () => {
//       const otherDoc = await DbHelper.createFreshDoctor();
//       const record = await prisma.medicalRecord.create({
//         data: { doctorId, visitId, title: 'Permission Test', diagnosis: 'Test', symptoms: 'Test', treatments: 'Test' }
//       });
//       if (record) {
//         await expect(medicalRecordService.deleteMedicalRecord(record.id, otherDoc))
//           .rejects.toThrow(/permission/);
//       }
//     });
//   });

//   // ============================================================
//   // Query & Search (REC_017 - REC_022)
//   // ============================================================
//   describe('Query & Search (REC_017 - REC_022)', () => {
//     test('REC_017: Lấy chi tiết - Thành công', async () => {
//       const newRecord = await prisma.medicalRecord.create({
//         data: { doctorId, visitId, title: 'Detail Test', diagnosis: 'Test', symptoms: 'Test', treatments: 'Test' }
//       });
//       const record = newRecord;
//       if (record) {
//         const detail = await medicalRecordService.getMedicalRecordById(record.id);
//         expect(detail.id).toBe(record.id);
//         expect(detail.fileAssets).toBeDefined();
//       }
//     });

//     test('REC_018: Lấy chi tiết - Thất bại do hồ sơ không tồn tại', async () => {
//       await expect(medicalRecordService.getMedicalRecordById('00000000-0000-0000-0000-000000000000'))
//         .rejects.toThrow(/Medical record not found/);
//     });

//     test('REC_019: Lấy chi tiết - Thất bại do bác sĩ không có quyền xem', async () => {
//       const otherDoc = await DbHelper.createFreshDoctor();
//       const newRecord = await prisma.medicalRecord.create({
//         data: { doctorId, visitId, title: 'View Permission Test', diagnosis: 'Test', symptoms: 'Test', treatments: 'Test' }
//       });
//       await expect(medicalRecordService.getMedicalRecordById(newRecord.id, otherDoc))
//         .rejects.toThrow(/permission/);
//     });

//     test('REC_020: Lấy danh sách - Phân trang', async () => {
//       const result = await medicalRecordService.getMedicalRecordsList({ page: '1', limit: '5' });
//       expect(result.pagination).toBeDefined();
//       expect(result.data.length).toBeLessThanOrEqual(5);
//     });

//     test('REC_021: Lấy danh sách - Lọc theo visitId', async () => {
//       const newRecord = await prisma.medicalRecord.create({
//         data: { doctorId, visitId, title: 'Filter Test', diagnosis: 'Test', symptoms: 'Test', treatments: 'Test' }
//       });
//       const record = newRecord;
//       if (record) {
//         const result = await medicalRecordService.getMedicalRecordsList({ visitId: record.visitId, limit: '100' });
//         expect(result.data.some((r: any) => r.id === record.id)).toBe(true);
//       }
//     });

//     test('REC_022: Lấy danh sách - Lọc theo doctorId và sắp xếp tùy chỉnh', async () => {
//       await prisma.medicalRecord.create({
//         data: { doctorId, visitId, title: 'Sort Test', diagnosis: 'Test', symptoms: 'Test', treatments: 'Test' }
//       });
//       const result = await medicalRecordService.getMedicalRecordsList({
//         doctorId,
//         page: '1',
//         limit: '10',
//         sortBy: 'title',
//         sortOrder: 'asc'
//       });
//       expect(result.pagination).toBeDefined();
//       expect(result.data.length).toBeGreaterThan(0);
//       expect(result.data.every((r: any) => r.doctorId === doctorId)).toBe(true);
//     });
//   });

//   // ============================================================
//   // File Asset Deletion (REC_023 - REC_026)
//   // ============================================================
//   describe('File Asset Deletion (REC_023 - REC_026)', () => {
//     test('REC_023: Xóa File Asset - Thành công', async () => {
//       const record = await prisma.medicalRecord.create({
//         data: { doctorId, visitId, title: 'Asset test', diagnosis: 'D', symptoms: 'S', treatments: 'T' }
//       });
//       const asset = await prisma.fileAsset.create({
//         data: {
//           entityId: record.id,
//           entityType: 'medical_record',
//           url: 'http://test.com/file.jpg',
//           name: 'test.jpg',
//           size: 100,
//           mimeType: 'image/jpeg',
//           fileType: 'image/jpeg'
//         }
//       });
//       const result = await medicalRecordService.deleteFileAsset(asset.id, doctorId);
//       expect(result.success).toBe(true);
//       const exists = await prisma.fileAsset.findUnique({ where: { id: asset.id } });
//       expect(exists).toBeNull();
//     });

//     test('REC_024: Xóa File Asset - Thất bại do không tìm thấy asset', async () => {
//       await expect(medicalRecordService.deleteFileAsset('00000000-0000-0000-0000-000000000000', doctorId))
//         .rejects.toThrow(/File asset not found/);
//     });

//     test('REC_025: Xóa File Asset - Thất bại do sai quyền', async () => {
//       const record = await prisma.medicalRecord.create({
//         data: { doctorId, visitId, title: 'Asset Perm Test', diagnosis: 'Test', symptoms: 'Test', treatments: 'Test' }
//       });
//       const asset = await prisma.fileAsset.create({
//         data: { entityId: record.id, entityType: 'medical_record', url: 'http://test.com/file.jpg', name: 'test.jpg', size: 100, mimeType: 'image/jpeg', fileType: 'image/jpeg' }
//       });
//       if (asset) {
//         await expect(medicalRecordService.deleteFileAsset(asset.id, '00000000-0000-0000-0000-000000000000'))
//           .rejects.toThrow(/permission/);
//       }
//     });

//     test('REC_026: Xóa File Asset - Entity không phải medical_record thì bỏ qua kiểm tra quyền', async () => {
//       // Mock fileAssetDao to return an asset with a non-medical_record entityType
//       // to avoid inserting an invalid entityType into the DB (Prisma EntityType enum constraint)
//       const fileAssetDao = require('@src/daos/fileAsset.dao').default;
//       const fakeAssetId = '11111111-1111-1111-1111-111111111111';
//       const fakeAsset = {
//         id: fakeAssetId,
//         entityId: visitId,
//         entityType: 'prescription', // valid enum value but not 'medical_record'
//         url: 'http://test.com/prescription-file.jpg',
//         name: 'prescription-file.jpg',
//         size: 100,
//         mimeType: 'image/jpeg',
//         fileType: 'image/jpeg'
//       };
//       const originalGetFileAsset = fileAssetDao.getFileAsset;
//       const originalDeleteFileAsset = fileAssetDao.deleteFileAsset;
//       fileAssetDao.getFileAsset = jest.fn().mockResolvedValue(fakeAsset);
//       fileAssetDao.deleteFileAsset = jest.fn().mockResolvedValue({});

//       try {
//         // Should NOT check doctor ownership since entityType !== 'medical_record'
//         const result = await medicalRecordService.deleteFileAsset(fakeAssetId, '00000000-0000-0000-0000-000000000000');
//         expect(result.success).toBe(true);
//       } finally {
//         // Restore original implementations
//         fileAssetDao.getFileAsset = originalGetFileAsset;
//         fileAssetDao.deleteFileAsset = originalDeleteFileAsset;
//       }
//     });
//   });
// });