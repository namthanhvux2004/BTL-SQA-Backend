import { visitServiceService } from '@src/services/visit-service.service';
import { DbHelper } from './helpers/db-helper';
import prisma from '@src/config/prisma';

describe('VisitServiceService Integration Tests (Full Excel Alignment)', () => {
  let visitId: string;
  let medicalServiceId: string;
  let userId: string;

  beforeAll(async () => {
    visitId = await DbHelper.getAnyVisitId();
    medicalServiceId = await DbHelper.getAnyMedicalServiceId();
    userId = await DbHelper.getAnyDoctorId();
  });

  describe('Create & Delete Service Usages (VSS_001 - VSS_002, VSS_005 - VSS_006, VSS_014)', () => {
    test('VSS_001: Thêm dịch vụ sử dụng - Thành công', async () => {
      const result = await visitServiceService.createServiceUsage({
        visitId, medicalServiceId, quantity: 1, orderedByUserId: userId
      });
      expect(result.status).toBe('ordered');
    });

    test('VSS_002: Thêm dịch vụ sử dụng - Thất bại do Visit không tồn tại', async () => {
      await expect(visitServiceService.createServiceUsage({
        visitId: '00000000-0000-0000-0000-000000000000', medicalServiceId, quantity: 1, orderedByUserId: userId
      })).rejects.toThrow(/not found/);
    });

    test('VSS_014: Thêm dịch vụ - Tự động lấy giá từ hệ thống', async () => {
      const result = await visitServiceService.createServiceUsage({
        visitId, medicalServiceId, quantity: 1, orderedByUserId: userId
      });
      const svc = await prisma.medicalService.findUnique({ where: { id: medicalServiceId } });
      expect(result.price).toBe(svc?.price);
    });

    test('VSS_005: Xóa dịch vụ - Thành công (Status ordered)', async () => {
      const usage = await visitServiceService.createServiceUsage({
        visitId, medicalServiceId, quantity: 1, orderedByUserId: userId
      });
      const result = await visitServiceService.deleteServiceUsage(usage.id);
      expect(result.message).toBeDefined();
    });

    test('VSS_006: Xóa dịch vụ - Thất bại (Status in_progress)', async () => {
      const usage = await prisma.visitService.create({
        data: { visitId, medicalServiceId, quantity: 1, price: 100, status: 'in_progress' }
      });
      await expect(visitServiceService.deleteServiceUsage(usage.id))
        .rejects.toThrow(/Only ordered services/);
    });
  });

  describe('Update Service Usages (VSS_003 - VSS_004, VSS_012)', () => {
    test('VSS_003: Cập nhật dịch vụ - Đổi số lượng', async () => {
      const usage = await prisma.visitService.findFirst({ where: { status: 'ordered', visitId } });
      if (usage) {
        const result = await visitServiceService.updateServiceUsage(usage.id, { quantity: 5 });
        expect(result.quantity).toBe(5);
      }
    });

    test('VSS_004: Cập nhật dịch vụ - Thất bại do trạng thái done', async () => {
      const usage = await prisma.visitService.create({
        data: { visitId, medicalServiceId, quantity: 1, price: 100, status: 'done' }
      });
      await expect(visitServiceService.updateServiceUsage(usage.id, { quantity: 10 }))
        .rejects.toThrow(/status: done/);
    });

    test('VSS_012: Cập nhật trạng thái dịch vụ - Sang done', async () => {
      const usage = await prisma.visitService.findFirst({ where: { status: 'ordered', visitId } });
      if (usage) {
        const result = await visitServiceService.updateServiceUsage(usage.id, { status: 'done' });
        expect(result.status).toBe('done');
      }
    });
  });

  describe('Bulk & Query (VSS_007 - VSS_009, VSS_013, VSS_015)', () => {
    test('VSS_007: Thêm hàng loạt (Bulk) - Gộp dịch vụ trùng', async () => {
      const result = await visitServiceService.bulkCreateServiceUsages({
        items: [
          { visitId, medicalServiceId, quantity: 1, orderedByUserId: userId },
          { visitId, medicalServiceId, quantity: 2, orderedByUserId: userId }
        ]
      });
      expect(result.createdCount).toBeGreaterThanOrEqual(1);
    });

    test('VSS_008: Thêm hàng loạt - Thất bại do dữ liệu rỗng (Checked via manual call)', async () => {
       await expect(visitServiceService.bulkCreateServiceUsages({ items: [] }))
         .rejects.toThrow();
    });

    test('VSS_009: Lấy lịch sử dịch vụ của Visit', async () => {
      const result = await visitServiceService.getVisitHistory(visitId, { page: 1, limit: 10 } as any, 'admin', userId);
      expect(result).toBeDefined();
      if (result && typeof result === 'object') {
        expect(Object.keys(result).length).toBeGreaterThanOrEqual(0);
      }
    });

    test('VSS_013: Lấy danh sách dịch vụ chờ thực hiện', async () => {
      const result = await visitServiceService.listServiceUsages({ status: 'ordered', page: 1, limit: 5 }, 'admin');
      expect(result.data.every((s: any) => s.status === 'ordered')).toBe(true);
    });

    test('VSS_015: Lấy tổng chi phí dịch vụ của visit', async () => {
      const result = await visitServiceService.getTotalServicesCost(visitId);
      expect(typeof result).toBe('number');
    });
  });

  describe('Authorization (VSS_010 - VSS_011)', () => {
    test('VSS_010/011: Lấy chi tiết dịch vụ - Phân quyền bệnh nhân', async () => {
      const usage = await prisma.visitService.findFirst({ include: { visit: { include: { patient: true } } } });
      if (usage?.visit.patient) {
        const ownerId = usage.visit.patient.userId;
        const result = await visitServiceService.getServiceUsageById(usage.id, 'patient', ownerId);
        expect(result.id).toBe(usage.id);

        const otherPatient = await DbHelper.createFreshPatient();
        await expect(visitServiceService.getServiceUsageById(usage.id, 'patient', otherPatient))
          .rejects.toThrow(/access your own visit services/);
      }
    });
  });
});
////////
// import { visitServiceService } from '@src/services/visit-service.service';
// import { DbHelper } from './helpers/db-helper';
// import prisma from '@src/config/prisma';

// describe('VisitServiceService Integration Tests (Full Excel Alignment)', () => {
//   let visitId: string;
//   let medicalServiceId: string;
//   let userId: string;

//   beforeAll(async () => {
//     visitId = await DbHelper.getAnyVisitId();
//     medicalServiceId = await DbHelper.getAnyMedicalServiceId();
//     userId = await DbHelper.getAnyDoctorId();
//   });

//   // ============================================================
//   // Create Service Usages (VSS_001 - VSS_003, VSS_014)
//   // ============================================================
//   describe('Create Service Usages (VSS_001 - VSS_003, VSS_014)', () => {
//     test('VSS_001: Thêm dịch vụ sử dụng - Thành công', async () => {
//       const result = await visitServiceService.createServiceUsage({
//         visitId, medicalServiceId, quantity: 1, orderedByUserId: userId
//       });
//       expect(result.status).toBe('ordered');
//     });

//     test('VSS_002: Thêm dịch vụ sử dụng - Thất bại do Visit không tồn tại', async () => {
//       await expect(visitServiceService.createServiceUsage({
//         visitId: '00000000-0000-0000-0000-000000000000', medicalServiceId, quantity: 1, orderedByUserId: userId
//       })).rejects.toThrow(/not found/);
//     });

//     test('VSS_003: Thêm dịch vụ sử dụng - Thất bại do MedicalService không tồn tại', async () => {
//       // Covers line 46: medical service not found
//       await expect(visitServiceService.createServiceUsage({
//         visitId,
//         medicalServiceId: '00000000-0000-0000-0000-000000000000',
//         quantity: 1,
//         orderedByUserId: userId
//       })).rejects.toThrow(/not found/);
//     });

//     test('VSS_014: Thêm dịch vụ - Tự động lấy giá từ hệ thống', async () => {
//       const result = await visitServiceService.createServiceUsage({
//         visitId, medicalServiceId, quantity: 1, orderedByUserId: userId
//       });
//       const svc = await prisma.medicalService.findUnique({ where: { id: medicalServiceId } });
//       expect(result.price).toBe(svc?.price);
//     });
//   });

//   // ============================================================
//   // Delete Service Usages (VSS_004 - VSS_007)
//   // ============================================================
//   describe('Delete Service Usages (VSS_004 - VSS_007)', () => {
//     test('VSS_004: Xóa dịch vụ - Thành công (Status ordered)', async () => {
//       const usage = await visitServiceService.createServiceUsage({
//         visitId, medicalServiceId, quantity: 1, orderedByUserId: userId
//       });
//       const result = await visitServiceService.deleteServiceUsage(usage.id);
//       expect(result.message).toBeDefined();
//     });

//     test('VSS_005: Xóa dịch vụ - Thất bại (Status in_progress)', async () => {
//       const usage = await prisma.visitService.create({
//         data: { visitId, medicalServiceId, quantity: 1, price: 100, status: 'in_progress' }
//       });
//       await expect(visitServiceService.deleteServiceUsage(usage.id))
//         .rejects.toThrow(/Only ordered services/);
//     });

//     test('VSS_006: Xóa dịch vụ - Thất bại do không tìm thấy visitService', async () => {
//       // Covers line 195: visit service not found in deleteServiceUsage
//       await expect(visitServiceService.deleteServiceUsage('00000000-0000-0000-0000-000000000000'))
//         .rejects.toThrow(/not found/);
//     });

//     test('VSS_007: Xóa dịch vụ - Thất bại (Status cancelled)', async () => {
//       // Covers line 203: status cancelled cannot be deleted
//       const usage = await prisma.visitService.create({
//         data: { visitId, medicalServiceId, quantity: 1, price: 100, status: 'cancelled' }
//       });
//       await expect(visitServiceService.deleteServiceUsage(usage.id))
//         .rejects.toThrow(/Only ordered services/);
//     });
//   });

//   // ============================================================
//   // Update Service Usages (VSS_008 - VSS_012)
//   // ============================================================
//   describe('Update Service Usages (VSS_008 - VSS_012)', () => {
//     test('VSS_008: Cập nhật dịch vụ - Đổi số lượng', async () => {
//       const usage = await prisma.visitService.findFirst({ where: { status: 'ordered', visitId } });
//       if (usage) {
//         const result = await visitServiceService.updateServiceUsage(usage.id, { quantity: 5 });
//         expect(result.quantity).toBe(5);
//       }
//     });

//     test('VSS_009: Cập nhật dịch vụ - Thất bại do trạng thái done', async () => {
//       const usage = await prisma.visitService.create({
//         data: { visitId, medicalServiceId, quantity: 1, price: 100, status: 'done' }
//       });
//       await expect(visitServiceService.updateServiceUsage(usage.id, { quantity: 10 }))
//         .rejects.toThrow(/status: done/);
//     });

//     test('VSS_010: Cập nhật dịch vụ - Thất bại do trạng thái cancelled', async () => {
//       // Covers line 153: status cancelled cannot be updated
//       const usage = await prisma.visitService.create({
//         data: { visitId, medicalServiceId, quantity: 1, price: 100, status: 'cancelled' }
//       });
//       await expect(visitServiceService.updateServiceUsage(usage.id, { quantity: 10 }))
//         .rejects.toThrow(/status: cancelled/);
//     });

//     test('VSS_011: Cập nhật dịch vụ - Thất bại do không tìm thấy visitService', async () => {
//       // Covers line 127: visit service not found in updateServiceUsage
//       await expect(visitServiceService.updateServiceUsage('00000000-0000-0000-0000-000000000000', { quantity: 3 }))
//         .rejects.toThrow(/not found/);
//     });

//     test('VSS_012: Cập nhật trạng thái dịch vụ - Sang done', async () => {
//       const usage = await prisma.visitService.findFirst({ where: { status: 'ordered', visitId } });
//       if (usage) {
//         const result = await visitServiceService.updateServiceUsage(usage.id, { status: 'done' });
//         expect(result.status).toBe('done');
//       }
//     });
//   });

//   // ============================================================
//   // Bulk Create (VSS_013, VSS_016 - VSS_017)
//   // ============================================================
//   describe('Bulk Create (VSS_013, VSS_016 - VSS_017)', () => {
//     test('VSS_013: Thêm hàng loạt (Bulk) - Gộp dịch vụ trùng', async () => {
//       const result = await visitServiceService.bulkCreateServiceUsages({
//         items: [
//           { visitId, medicalServiceId, quantity: 1, orderedByUserId: userId },
//           { visitId, medicalServiceId, quantity: 2, orderedByUserId: userId }
//         ]
//       });
//       expect(result.createdCount).toBeGreaterThanOrEqual(1);
//     });

//     test('VSS_016: Thêm hàng loạt - Thất bại do dữ liệu rỗng', async () => {
//       await expect(visitServiceService.bulkCreateServiceUsages({ items: [] }))
//         .rejects.toThrow();
//     });

//     test('VSS_017: Thêm hàng loạt - Item có MedicalService không tồn tại bị ghi vào failed', async () => {
//       // Covers line 323: medical service not found in bulkCreate item validation
//       const result = await visitServiceService.bulkCreateServiceUsages({
//         items: [
//           { visitId, medicalServiceId, quantity: 1, orderedByUserId: userId },
//           { visitId, medicalServiceId: '00000000-0000-0000-0000-000000000000', quantity: 1, orderedByUserId: userId }
//         ]
//       });
//       expect(result.createdCount).toBeGreaterThanOrEqual(1);
//       expect(result.failedCount).toBeGreaterThanOrEqual(1);
//       expect(result.failed.some((f: any) => f.error.includes('not found'))).toBe(true);
//     });
//   });

//   // ============================================================
//   // Query & History (VSS_015, VSS_018 - VSS_021)
//   // ============================================================
//   describe('Query & History (VSS_015, VSS_018 - VSS_021)', () => {
//     test('VSS_015: Lấy danh sách dịch vụ chờ thực hiện', async () => {
//       const result = await visitServiceService.listServiceUsages({ status: 'ordered', page: 1, limit: 5 }, 'admin');
//       expect(result.data.every((s: any) => s.status === 'ordered')).toBe(true);
//     });

//     test('VSS_018: Lấy danh sách dịch vụ - Role patient chỉ thấy visit của mình', async () => {
//       // Covers lines 105-115: patient role filter by their own visits
//       const patientId = await DbHelper.createFreshPatient();
//       const result = await visitServiceService.listServiceUsages(
//         { page: 1, limit: 10 },
//         'patient',
//         patientId
//       );
//       expect(result).toBeDefined();
//       // All returned items must belong to visits of this patient
//       if (result.data.length > 0) {
//         const visitIds = (await prisma.visit.findMany({
//           where: { patient: { userId: patientId } },
//           select: { id: true }
//         })).map((v: any) => v.id);
//         expect(result.data.every((s: any) => visitIds.includes(s.visitId))).toBe(true);
//       }
//     });

//     test('VSS_019: Lấy lịch sử dịch vụ của Visit - Thành công', async () => {
//       const result = await visitServiceService.getVisitHistory(visitId, { page: 1, limit: 10 } as any, 'admin', userId);
//       expect(result).toBeDefined();
//       if (result && typeof result === 'object') {
//         expect(Object.keys(result).length).toBeGreaterThanOrEqual(0);
//       }
//     });

//     test('VSS_020: Lấy lịch sử dịch vụ - Thất bại do Visit không tồn tại', async () => {
//       // Covers lines 241-246: visit not found in getVisitHistory
//       await expect(visitServiceService.getVisitHistory(
//         '00000000-0000-0000-0000-000000000000',
//         { page: 1, limit: 10 } as any,
//         'admin',
//         userId
//       )).rejects.toThrow(/not found/);
//     });

//     test('VSS_021: Lấy lịch sử dịch vụ - Patient không có quyền xem visit của người khác', async () => {
//       // Covers lines 256-261: patient role forbidden from viewing other's visit history
//       const otherPatient = await DbHelper.createFreshPatient();
//       await expect(visitServiceService.getVisitHistory(
//         visitId,
//         { page: 1, limit: 10 } as any,
//         'patient',
//         otherPatient
//       )).rejects.toThrow(/own visit history/);
//     });

//     test('VSS_022: Lấy lịch sử dịch vụ - Có filter status, startDate, endDate', async () => {
//       // Covers line 272: filters applied in getVisitHistory (status, startDate, endDate)
//       const result = await visitServiceService.getVisitHistory(
//         visitId,
//         {
//           page: 1,
//           limit: 10,
//           status: 'ordered',
//           startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
//           endDate: new Date().toISOString()
//         } as any,
//         'admin',
//         userId
//       );
//       expect(result).toBeDefined();
//     });
//   });

//   // ============================================================
//   // Authorization (VSS_023 - VSS_025)
//   // ============================================================
//   describe('Authorization (VSS_023 - VSS_025)', () => {
//     test('VSS_023: Lấy chi tiết dịch vụ - Phân quyền bệnh nhân', async () => {
//       const usage = await prisma.visitService.findFirst({ include: { visit: { include: { patient: true } } } });
//       if (usage?.visit.patient) {
//         const ownerId = usage.visit.patient.userId;
//         const result = await visitServiceService.getServiceUsageById(usage.id, 'patient', ownerId);
//         expect(result.id).toBe(usage.id);

//         const otherPatient = await DbHelper.createFreshPatient();
//         await expect(visitServiceService.getServiceUsageById(usage.id, 'patient', otherPatient))
//           .rejects.toThrow(/access your own visit services/);
//       }
//     });

//     test('VSS_024: Lấy chi tiết dịch vụ - Thất bại do không tìm thấy visitService', async () => {
//       // Covers line 72: visit service not found in getServiceUsageById
//       await expect(visitServiceService.getServiceUsageById(
//         '00000000-0000-0000-0000-000000000000',
//         'admin',
//         userId
//       )).rejects.toThrow(/not found/);
//     });

//     test('VSS_025: Lấy tổng chi phí dịch vụ của visit', async () => {
//       const result = await visitServiceService.getTotalServicesCost(visitId);
//       expect(typeof result).toBe('number');
//     });
//   });
// });