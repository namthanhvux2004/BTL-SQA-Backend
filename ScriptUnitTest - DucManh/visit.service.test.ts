import visitService from '@src/services/visit.service';
import { DbHelper } from './helpers/db-helper';
import prisma from '@src/config/prisma';

describe('VisitService Integration Tests (Full Excel Alignment)', () => {
  let patientUserId: string;
  let doctorId: string;

  beforeAll(async () => {
    patientUserId = await DbHelper.getAnyPatientId();
    doctorId = await DbHelper.getAnyDoctorId();
  });

  describe('Lifecycle (VIS_001 - VIS_007)', () => {
    test('VIS_001: Tạo lượt khám - Thành công', async () => {
      const result = await visitService.createVisit({ patientUserId });
      expect(result.status).toBe('in_progress');
    });

    test('VIS_002: Tạo lượt khám - Thất bại do thiếu EHR', async () => {
      // Create user without EHR
      const user = await prisma.user.create({
        data: {
          username: `no_ehr_${Date.now()}`,
          email: `no_ehr_${Date.now()}@test.com`,
          password: 'password',
          roleId: 2,
          patient: { create: { patientId: `P-NOEHR-${Date.now()}` } }
        }
      });
      // We don't create EHR for this patient
      await expect(visitService.createVisit({ patientUserId: user.id }))
        .rejects.toThrow(); // The service expects patient.ehr.id which will be undefined
    });

    test('VIS_003: Tạo lượt khám - Có bác sĩ và lịch hẹn', async () => {
      const aptId = await DbHelper.getAnyAppointmentId();
      const result = await visitService.createVisit({ patientUserId, doctorId, appointmentId: aptId });
      expect(result.doctorId).toBe(doctorId);
      expect(result.appointmentId).toBe(aptId);
    });

    test('VIS_004: Hoàn thành lượt khám - Thành công', async () => {
      const visit = await visitService.createVisit({ patientUserId, doctorId });
      const result = await visitService.completeVisit(visit.id, doctorId, 'doctor');
      expect(result.status).toBe('completed');
      expect(result.endTime).toBeDefined();
    });

    test('VIS_005: Hoàn thành lượt khám - Thất bại do Visit đã bị hủy', async () => {
      const patient = await prisma.patient.findUnique({ where: { userId: patientUserId }, include: { ehr: true } });
      const visit = await prisma.visit.create({ data: { patientUserId: patientUserId, ehrId: patient!.ehr!.id, doctorId, status: 'cancelled' } });
      await expect(visitService.completeVisit(visit.id, doctorId, 'doctor'))
        .rejects.toThrow(/cancelled visit/);
    });

    test('VIS_006: Hủy lượt khám - Thành công', async () => {
      const visit = await visitService.createVisit({ patientUserId, doctorId });
      const result = await visitService.cancelVisit(visit.id, doctorId, 'doctor', { reason: 'No show' });
      expect(result.status).toBe('cancelled');
    });

    test('VIS_007: Hủy lượt khám - Thất bại do sai bác sĩ phân công', async () => {
      const visit = await visitService.createVisit({ patientUserId, doctorId });
      const otherDoc = await DbHelper.createFreshDoctor();
      await expect(visitService.cancelVisit(visit.id, otherDoc, 'doctor', { reason: 'Unauthorized' }))
        .rejects.toThrow(/Only the assigned doctor/);
    });
  });

  describe('Costs & Summary (VIS_008 - VIS_010)', () => {
    test('VIS_008: Lấy tóm tắt (Summary) - Tính đúng chi phí', async () => {
      const visit = await prisma.visit.findFirst({
        where: { visitServices: { some: {} }, doctorId: { not: null } },
        include: { visitServices: true, prescriptions: { include: { medicineUsages: true } } }
      });
      if (visit) {
        const summary = await visitService.getVisitSummary(visit.id, visit.doctorId!, 'doctor');
        expect(summary).toBeDefined();
      }
    });

    test('VIS_009: Lấy tóm tắt - Thất bại do sai quyền bệnh nhân', async () => {
      const visit = await prisma.visit.findFirst({ where: { patientUserId: { not: null } } });
      if (visit) {
        const otherPatient = await DbHelper.createFreshPatient();
        await expect(visitService.getVisitSummary(visit.id, otherPatient, 'patient'))
          .rejects.toThrow(/access your own visits/);
      }
    });

    test('VIS_010: Tính giá lượt khám - Chi tiết breakdown', async () => {
      const visit = await prisma.visit.findFirst({ where: { visitServices: { some: {} } } });
      if (visit) {
        const cost = await visitService.calculateVisitCost(visit.id);
        expect(cost).toHaveProperty('breakdown');
        expect(cost.breakdown.services.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Search & Update (VIS_011 - VIS_015)', () => {
    test('VIS_011: Cập nhật ngày hẹn tái khám - Thành công', async () => {
      const visit = await prisma.visit.findFirst();
      if (visit) {
        const date = '2026-08-01';
        const result = await visitService.updateNextVisitDate(visit.id, date);
        expect(result.nextVisitDate?.toISOString().split('T')[0]).toBe(date);
      }
    });

    test('VIS_012: Tìm kiếm lượt khám - Thành công', async () => {
      const result = await visitService.searchVisits(patientUserId, {});
      expect(result.data).toBeDefined();
    });

    test('VIS_013: Lấy danh sách theo ngày - Thành công', async () => {
      const date = new Date().toISOString().split('T')[0];
      const result = await visitService.getVisitsByDate({ date });
      expect(result).toBeDefined();
    });

    test('VIS_014: Lấy danh sách nhiệm vụ của bác sĩ - Thành công', async () => {
      const result = await visitService.getTasksOfDoctor(doctorId, { page: '1', limit: '10' });
      expect(result.data).toBeDefined();
    });

    test('VIS_015: Cập nhật trạng thái dịch vụ trong visit', async () => {
      const vs = await prisma.visitService.findFirst();
      if (vs) {
        const result = await visitService.updateVisitServiceStatus(vs.id, 'done');
        expect(result.status).toBe('done');
      }
    });
  });
});


// import visitService from '@src/services/visit.service';
// import { DbHelper } from './helpers/db-helper';
// import prisma from '@src/config/prisma';

// describe('VisitService Integration Tests (Full Excel Alignment)', () => {
//   let patientUserId: string;
//   let doctorId: string;

//   beforeAll(async () => {
//     patientUserId = await DbHelper.getAnyPatientId();
//     doctorId = await DbHelper.getAnyDoctorId();
//   });

//   // ============================================================
//   // getVisitsOfPatient (VIS_001 - VIS_003)
//   // ============================================================
//   describe('getVisitsOfPatient (VIS_001 - VIS_003)', () => {
//     test('VIS_001: Lấy danh sách lượt khám của bệnh nhân - Thành công', async () => {
//       const result = await visitService.getVisitsOfPatient(patientUserId, {});
//       expect(result.data).toBeDefined();
//     });

//     test('VIS_002: Lấy danh sách lượt khám - Thành công với visit có medicalRecords (attach file assets)', async () => {
//       // Covers lines 39-54: attach file assets path when medicalRecords exist
//       // Create a visit with a medical record to trigger attachFileAssetsToVisit
//       const patient = await prisma.patient.findUnique({ where: { userId: patientUserId }, include: { ehr: true } });
//       const visit = await prisma.visit.create({
//         data: { patientUserId, ehrId: patient!.ehr!.id, doctorId, status: 'in_progress', startTime: new Date() }
//       });
//       await prisma.medicalRecord.create({
//         data: { visitId: visit.id, doctorId, title: 'File Asset Test', diagnosis: 'D', symptoms: 'S', treatments: 'T' }
//       });
//       const result = await visitService.getVisitsOfPatient(patientUserId, {});
//       expect(result.data).toBeDefined();
//     });

//     test('VIS_003: Lấy danh sách lượt khám - Thất bại do bệnh nhân không tồn tại', async () => {
//       // Covers lines 39-41: patient not found in getVisitsOfPatient
//       await expect(visitService.getVisitsOfPatient('00000000-0000-0000-0000-000000000000', {}))
//         .rejects.toThrow(/không tìm thấy bệnh nhân/i);
//     });
//   });

//   // ============================================================
//   // getVisitsOfDoctor (VIS_004 - VIS_006)
//   // ============================================================
//   describe('getVisitsOfDoctor (VIS_004 - VIS_006)', () => {
//     test('VIS_004: Lấy danh sách lượt khám của bác sĩ - Thành công', async () => {
//       const result = await visitService.getVisitsOfDoctor(doctorId, {});
//       expect(result.data).toBeDefined();
//     });

//     test('VIS_005: Lấy danh sách lượt khám bác sĩ - Thành công với visit có medicalRecords (attach file assets)', async () => {
//       // Covers lines 61-75: attach file assets path for doctor visits
//       const patient = await prisma.patient.findUnique({ where: { userId: patientUserId }, include: { ehr: true } });
//       const visit = await prisma.visit.create({
//         data: { patientUserId, ehrId: patient!.ehr!.id, doctorId, status: 'in_progress', startTime: new Date() }
//       });
//       await prisma.medicalRecord.create({
//         data: { visitId: visit.id, doctorId, title: 'Doctor File Asset Test', diagnosis: 'D', symptoms: 'S', treatments: 'T' }
//       });
//       const result = await visitService.getVisitsOfDoctor(doctorId, {});
//       expect(result.data).toBeDefined();
//     });

//     test('VIS_006: Lấy danh sách lượt khám bác sĩ - Thất bại do bác sĩ không tồn tại', async () => {
//       // Covers lines 61-63: doctor not found in getVisitsOfDoctor
//       await expect(visitService.getVisitsOfDoctor('00000000-0000-0000-0000-000000000000', {}))
//         .rejects.toThrow(/không tìm thấy bác sĩ/i);
//     });
//   });

//   // ============================================================
//   // getDetailsOfVisit (VIS_007 - VIS_009)
//   // ============================================================
//   describe('getDetailsOfVisit (VIS_007 - VIS_009)', () => {
//     test('VIS_007: Lấy chi tiết lượt khám - Thất bại do visit không tồn tại', async () => {
//       // Covers lines 79-81: visit not found in getDetailsOfVisit
//       await expect(visitService.getDetailsOfVisit('00000000-0000-0000-0000-000000000000', {
//         id: doctorId, role: 'doctor'
//       } as any)).rejects.toThrow(/không tìm thấy lượt khám/i);
//     });

//     test('VIS_008: Lấy chi tiết lượt khám - Thất bại do bệnh nhân không có quyền', async () => {
//       // Covers lines 84-88: patient forbidden from viewing other's visit
//       const patient = await prisma.patient.findUnique({ where: { userId: patientUserId }, include: { ehr: true } });
//       const visit = await prisma.visit.create({
//         data: { patientUserId, ehrId: patient!.ehr!.id, doctorId, status: 'in_progress', startTime: new Date() }
//       });
//       const otherPatient = await DbHelper.createFreshPatient();
//       await expect(visitService.getDetailsOfVisit(visit.id, { id: otherPatient, role: 'patient' } as any))
//         .rejects.toThrow(/không có quyền/i);
//     });

//     test('VIS_009: Lấy chi tiết lượt khám - Thành công với bệnh nhân sở hữu', async () => {
//       // Covers lines 90-95: attach file assets after authorization pass
//       const patient = await prisma.patient.findUnique({ where: { userId: patientUserId }, include: { ehr: true } });
//       const visit = await prisma.visit.create({
//         data: { patientUserId, ehrId: patient!.ehr!.id, doctorId, status: 'in_progress', startTime: new Date() }
//       });
//       const result = await visitService.getDetailsOfVisit(visit.id, { id: patientUserId, role: 'patient' } as any);
//       expect(result.id).toBe(visit.id);
//     });
//   });

//   // ============================================================
//   // getVisitStatsByDate (VIS_010)
//   // ============================================================
//   describe('getVisitStatsByDate (VIS_010)', () => {
//     test('VIS_010: Lấy thống kê lượt khám theo ngày - Thành công', async () => {
//       // Covers lines 99-100: getVisitStatsByDate
//       const fromDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
//       const toDate = new Date().toISOString().split('T')[0];
//       const result = await visitService.getVisitStatsByDate(fromDate, toDate);
//       expect(result).toBeDefined();
//     });
//   });

//   // ============================================================
//   // createVisit Lifecycle (VIS_011 - VIS_018)
//   // ============================================================
//   describe('createVisit Lifecycle (VIS_011 - VIS_018)', () => {
//     test('VIS_011: Tạo lượt khám - Thành công', async () => {
//       const result = await visitService.createVisit({ patientUserId });
//       expect(result.status).toBe('in_progress');
//     });

//     test('VIS_012: Tạo lượt khám - Thất bại do thiếu EHR', async () => {
//       // Covers line ~113: patient not found or no EHR
//       const user = await prisma.user.create({
//         data: {
//           username: `no_ehr_${Date.now()}`,
//           email: `no_ehr_${Date.now()}@test.com`,
//           password: 'password',
//           roleId: 2,
//           patient: { create: { patientId: `P-NOEHR-${Date.now()}` } }
//         }
//       });
//       await expect(visitService.createVisit({ patientUserId: user.id }))
//         .rejects.toThrow();
//     });

//     test('VIS_013: Tạo lượt khám - Có bác sĩ và lịch hẹn', async () => {
//       const aptId = await DbHelper.getAnyAppointmentId();
//       const result = await visitService.createVisit({ patientUserId, doctorId, appointmentId: aptId });
//       expect(result.doctorId).toBe(doctorId);
//       expect(result.appointmentId).toBe(aptId);
//     });

//     test('VIS_014: Tạo lượt khám - Thất bại do bác sĩ không tồn tại', async () => {
//       // Covers line 133: doctor not found in createVisit
//       await expect(visitService.createVisit({
//         patientUserId,
//         doctorId: '00000000-0000-0000-0000-000000000000'
//       })).rejects.toThrow(/không tìm thấy bác sĩ/i);
//     });

//     test('VIS_015: Tạo lượt khám - Thất bại do lịch hẹn không tồn tại', async () => {
//       // Covers line 143: appointment not found in createVisit
//       await expect(visitService.createVisit({
//         patientUserId,
//         doctorId,
//         appointmentId: '00000000-0000-0000-0000-000000000000'
//       })).rejects.toThrow(/không tìm thấy lịch hẹn/i);
//     });

//     test('VIS_016: Tạo lượt khám - Thất bại do dịch vụ y tế không tồn tại', async () => {
//       // Covers lines 152-156: medicalService not found in createVisit
//       await expect(visitService.createVisit({
//         patientUserId,
//         medicalServiceId: '00000000-0000-0000-0000-000000000000'
//       })).rejects.toThrow(/không tìm thấy dịch vụ y tế/i);
//     });

//     test('VIS_017: Tạo lượt khám - Với đầy đủ optional fields (startTime, status, nextVisitDate, type)', async () => {
//       // Covers lines 173, 177: optional fields assignment in createVisit
//       const result = await visitService.createVisit({
//         patientUserId,
//         doctorId,
//         startTime: new Date().toISOString(),
//         status: 'in_progress',
//         nextVisitDate: '2026-12-01',
//         type: 'follow_up'
//       });
//       expect(result.doctorId).toBe(doctorId);
//       expect(result.type).toBe('follow_up');
//     });

//     test('VIS_018: Tạo lượt khám với dịch vụ y tế hợp lệ - Thành công', async () => {
//       const medicalServiceId = await DbHelper.getAnyMedicalServiceId();
//       const result = await visitService.createVisit({ patientUserId, medicalServiceId });
//       expect(result.medicalServiceId).toBe(medicalServiceId);
//     });
//   });

//   // ============================================================
//   // getVisitSummary (VIS_019 - VIS_023)
//   // ============================================================
//   describe('getVisitSummary (VIS_019 - VIS_023)', () => {
//     test('VIS_019: Lấy tóm tắt (Summary) - Tính đúng chi phí', async () => {
//       const visit = await prisma.visit.findFirst({
//         where: { visitServices: { some: {} }, doctorId: { not: null } },
//         include: { visitServices: true, prescriptions: { include: { medicineUsages: true } } }
//       });
//       if (visit) {
//         const summary = await visitService.getVisitSummary(visit.id, visit.doctorId!, 'doctor');
//         expect(summary).toBeDefined();
//       }
//     });

//     test('VIS_020: Lấy tóm tắt - Thất bại do sai quyền bệnh nhân', async () => {
//       const visit = await prisma.visit.findFirst({ where: { patientUserId: { not: null } } });
//       if (visit) {
//         const otherPatient = await DbHelper.createFreshPatient();
//         await expect(visitService.getVisitSummary(visit.id, otherPatient, 'patient'))
//           .rejects.toThrow(/access your own visits/);
//       }
//     });

//     test('VIS_021: Lấy tóm tắt - Thất bại do Visit không tồn tại', async () => {
//       // Covers line 259: visit not found in getVisitSummary
//       await expect(visitService.getVisitSummary('00000000-0000-0000-0000-000000000000', doctorId, 'doctor'))
//         .rejects.toThrow(/Visit not found/);
//     });

//     test('VIS_022: Lấy tóm tắt - Thất bại do bác sĩ không được phân công', async () => {
//       // Covers line 271: doctor forbidden (wrong doctor) in getVisitSummary
//       const otherDoc = await DbHelper.createFreshDoctor();
//       const patient = await prisma.patient.findUnique({ where: { userId: patientUserId }, include: { ehr: true } });
//       const visit = await prisma.visit.create({
//         data: { patientUserId, ehrId: patient!.ehr!.id, doctorId, status: 'in_progress', startTime: new Date() }
//       });
//       await expect(visitService.getVisitSummary(visit.id, otherDoc, 'doctor'))
//         .rejects.toThrow(/assigned to you/);
//     });

//     test('VIS_023: Lấy tóm tắt - Trả về summary.servicesCost, medicinesCost, totalCost', async () => {
//       // Covers lines 284-287: cost calculation in getVisitSummary
//       const patient = await prisma.patient.findUnique({ where: { userId: patientUserId }, include: { ehr: true } });
//       const visit = await prisma.visit.create({
//         data: { patientUserId, ehrId: patient!.ehr!.id, doctorId, status: 'in_progress', startTime: new Date() }
//       });
//       const result = await visitService.getVisitSummary(visit.id, doctorId, 'doctor');
//       expect(result.summary).toHaveProperty('servicesCost');
//       expect(result.summary).toHaveProperty('medicinesCost');
//       expect(result.summary).toHaveProperty('totalCost');
//       expect(result.summary).toHaveProperty('servicesCount');
//       expect(result.summary).toHaveProperty('medicalRecordsCount');
//     });
//   });

//   // ============================================================
//   // completeVisit (VIS_024 - VIS_028)
//   // ============================================================
//   describe('completeVisit (VIS_024 - VIS_028)', () => {
//     test('VIS_024: Hoàn thành lượt khám - Thành công', async () => {
//       const visit = await visitService.createVisit({ patientUserId, doctorId });
//       const result = await visitService.completeVisit(visit.id, doctorId, 'doctor');
//       expect(result.status).toBe('completed');
//       expect(result.endTime).toBeDefined();
//     });

//     test('VIS_025: Hoàn thành lượt khám - Thất bại do Visit đã bị hủy', async () => {
//       const patient = await prisma.patient.findUnique({ where: { userId: patientUserId }, include: { ehr: true } });
//       const visit = await prisma.visit.create({ data: { patientUserId, ehrId: patient!.ehr!.id, doctorId, status: 'cancelled' } });
//       await expect(visitService.completeVisit(visit.id, doctorId, 'doctor'))
//         .rejects.toThrow(/cancelled visit/);
//     });

//     test('VIS_026: Hoàn thành lượt khám - Thất bại do Visit không tồn tại', async () => {
//       // Covers line 303: visit not found in completeVisit
//       await expect(visitService.completeVisit('00000000-0000-0000-0000-000000000000', doctorId, 'doctor'))
//         .rejects.toThrow(/Visit not found/);
//     });

//     test('VIS_027: Hoàn thành lượt khám - Thất bại do Visit đã hoàn thành', async () => {
//       // Covers line 329: visit already completed
//       const patient = await prisma.patient.findUnique({ where: { userId: patientUserId }, include: { ehr: true } });
//       const visit = await prisma.visit.create({ data: { patientUserId, ehrId: patient!.ehr!.id, doctorId, status: 'completed' } });
//       await expect(visitService.completeVisit(visit.id, doctorId, 'doctor'))
//         .rejects.toThrow(/already completed/);
//     });

//     test('VIS_028: Hoàn thành lượt khám - Thất bại do bác sĩ không được phân công', async () => {
//       // Covers line 342: wrong doctor forbidden in completeVisit
//       const visit = await visitService.createVisit({ patientUserId, doctorId });
//       const otherDoc = await DbHelper.createFreshDoctor();
//       await expect(visitService.completeVisit(visit.id, otherDoc, 'doctor'))
//         .rejects.toThrow(/Only the assigned doctor/);
//     });
//   });

//   // ============================================================
//   // cancelVisit (VIS_029 - VIS_034)
//   // ============================================================
//   describe('cancelVisit (VIS_029 - VIS_034)', () => {
//     test('VIS_029: Hủy lượt khám - Thành công', async () => {
//       const visit = await visitService.createVisit({ patientUserId, doctorId });
//       const result = await visitService.cancelVisit(visit.id, doctorId, 'doctor', { reason: 'No show' });
//       expect(result.status).toBe('cancelled');
//     });

//     test('VIS_030: Hủy lượt khám - Thất bại do sai bác sĩ phân công', async () => {
//       const visit = await visitService.createVisit({ patientUserId, doctorId });
//       const otherDoc = await DbHelper.createFreshDoctor();
//       await expect(visitService.cancelVisit(visit.id, otherDoc, 'doctor', { reason: 'Unauthorized' }))
//         .rejects.toThrow(/Only the assigned doctor/);
//     });

//     test('VIS_031: Hủy lượt khám - Thất bại do Visit không tồn tại', async () => {
//       // Covers line 400: visit not found in cancelVisit
//       await expect(visitService.cancelVisit('00000000-0000-0000-0000-000000000000', doctorId, 'doctor', { reason: 'Ghost' }))
//         .rejects.toThrow(/Visit not found/);
//     });

//     test('VIS_032: Hủy lượt khám - Thất bại do Visit đã hoàn thành', async () => {
//       // Covers line 413: cannot cancel completed visit
//       const patient = await prisma.patient.findUnique({ where: { userId: patientUserId }, include: { ehr: true } });
//       const visit = await prisma.visit.create({ data: { patientUserId, ehrId: patient!.ehr!.id, doctorId, status: 'completed' } });
//       await expect(visitService.cancelVisit(visit.id, doctorId, 'doctor', { reason: 'Already done' }))
//         .rejects.toThrow(/Cannot cancel a completed visit/);
//     });

//     test('VIS_033: Hủy lượt khám - Thất bại do Visit đã bị hủy', async () => {
//       // Covers line 420: visit already cancelled
//       const patient = await prisma.patient.findUnique({ where: { userId: patientUserId }, include: { ehr: true } });
//       const visit = await prisma.visit.create({ data: { patientUserId, ehrId: patient!.ehr!.id, doctorId, status: 'cancelled' } });
//       await expect(visitService.cancelVisit(visit.id, doctorId, 'doctor', { reason: 'Double cancel' }))
//         .rejects.toThrow(/already cancelled/);
//     });

//     test('VIS_034: Hủy lượt khám - Thành công với role admin (không cần phân công)', async () => {
//       const visit = await visitService.createVisit({ patientUserId, doctorId });
//       const result = await visitService.cancelVisit(visit.id, 'any-admin-id', 'admin', { reason: 'Admin cancel' });
//       expect(result.status).toBe('cancelled');
//     });
//   });

//   // ============================================================
//   // calculateVisitCost (VIS_035 - VIS_037)
//   // ============================================================
//   describe('calculateVisitCost (VIS_035 - VIS_037)', () => {
//     test('VIS_035: Tính giá lượt khám - Chi tiết breakdown', async () => {
//       const visit = await prisma.visit.findFirst({ where: { visitServices: { some: {} } } });
//       if (visit) {
//         const cost = await visitService.calculateVisitCost(visit.id);
//         expect(cost).toHaveProperty('breakdown');
//         expect(cost.breakdown.services.length).toBeGreaterThan(0);
//       }
//     });

//     test('VIS_036: Tính giá lượt khám - Thất bại do Visit không tồn tại', async () => {
//       // Covers line 479: visit not found in calculateVisitCost
//       await expect(visitService.calculateVisitCost('00000000-0000-0000-0000-000000000000'))
//         .rejects.toThrow(/Visit not found/);
//     });

//     test('VIS_037: Tính giá lượt khám - Visit không có dịch vụ (cost = 0)', async () => {
//       // Covers lines 488-491: cost calculation with empty services/prescriptions
//       const patient = await prisma.patient.findUnique({ where: { userId: patientUserId }, include: { ehr: true } });
//       const visit = await prisma.visit.create({
//         data: { patientUserId, ehrId: patient!.ehr!.id, doctorId, status: 'in_progress', startTime: new Date() }
//       });
//       const cost = await visitService.calculateVisitCost(visit.id);
//       expect(cost.servicesCost).toBe(0);
//       expect(cost.medicinesCost).toBe(0);
//       expect(cost.totalCost).toBe(0);
//       expect(cost.breakdown.services).toHaveLength(0);
//     });
//   });

//   // ============================================================
//   // searchVisits (VIS_038 - VIS_040)
//   // ============================================================
//   describe('searchVisits (VIS_038 - VIS_040)', () => {
//     test('VIS_038: Tìm kiếm lượt khám - Thành công', async () => {
//       const result = await visitService.searchVisits(patientUserId, {});
//       expect(result.data).toBeDefined();
//     });

//     test('VIS_039: Tìm kiếm lượt khám - Thất bại do bệnh nhân không tồn tại', async () => {
//       // Covers line 509: patient not found in searchVisits
//       await expect(visitService.searchVisits('00000000-0000-0000-0000-000000000000', {}))
//         .rejects.toThrow(/không tìm thấy bệnh nhân/i);
//     });

//     test('VIS_040: Tìm kiếm lượt khám - Có medicalRecords (attach file assets)', async () => {
//       // Covers lines 518-522: attach file assets in searchVisits
//       const patient = await prisma.patient.findUnique({ where: { userId: patientUserId }, include: { ehr: true } });
//       const visit = await prisma.visit.create({
//         data: { patientUserId, ehrId: patient!.ehr!.id, doctorId, status: 'in_progress', startTime: new Date() }
//       });
//       await prisma.medicalRecord.create({
//         data: { visitId: visit.id, doctorId, title: 'Search File Test', diagnosis: 'D', symptoms: 'S', treatments: 'T' }
//       });
//       const result = await visitService.searchVisits(patientUserId, {});
//       expect(result.data).toBeDefined();
//     });
//   });

//   // ============================================================
//   // getTasksOfDoctor (VIS_041 - VIS_043)
//   // ============================================================
//   describe('getTasksOfDoctor (VIS_041 - VIS_043)', () => {
//     test('VIS_041: Lấy danh sách nhiệm vụ của bác sĩ - Thành công', async () => {
//       const result = await visitService.getTasksOfDoctor(doctorId, { page: '1', limit: '10' });
//       expect(result.data).toBeDefined();
//     });

//     test('VIS_042: Lấy nhiệm vụ bác sĩ - Thất bại do bác sĩ không tồn tại', async () => {
//       // Covers line 541: doctor not found in getTasksOfDoctor
//       await expect(visitService.getTasksOfDoctor('00000000-0000-0000-0000-000000000000', { page: '1', limit: '10' }))
//         .rejects.toThrow(/không tìm thấy bác sĩ/i);
//     });

//     test('VIS_043: Lấy nhiệm vụ bác sĩ - Có visit với medicalRecords (attach file assets)', async () => {
//       // Covers line 571: attach file assets in getTasksOfDoctor
//       const patient = await prisma.patient.findUnique({ where: { userId: patientUserId }, include: { ehr: true } });
//       const visit = await prisma.visit.create({
//         data: { patientUserId, ehrId: patient!.ehr!.id, doctorId, status: 'in_progress', startTime: new Date() }
//       });
//       await prisma.medicalRecord.create({
//         data: { visitId: visit.id, doctorId, title: 'Task File Test', diagnosis: 'D', symptoms: 'S', treatments: 'T' }
//       });
//       const result = await visitService.getTasksOfDoctor(doctorId, { page: '1', limit: '10' });
//       expect(result.data).toBeDefined();
//     });
//   });

//   // ============================================================
//   // Costs & Summary - getVisitsByDate & updateNextVisitDate (VIS_044 - VIS_047)
//   // ============================================================
//   describe('Utility Methods (VIS_044 - VIS_047)', () => {
//     test('VIS_044: Cập nhật ngày hẹn tái khám - Thành công', async () => {
//       const visit = await prisma.visit.findFirst();
//       if (visit) {
//         const date = '2026-08-01';
//         const result = await visitService.updateNextVisitDate(visit.id, date);
//         expect(result.nextVisitDate?.toISOString().split('T')[0]).toBe(date);
//       }
//     });

//     test('VIS_045: Lấy danh sách theo ngày - Thành công', async () => {
//       const date = new Date().toISOString().split('T')[0];
//       const result = await visitService.getVisitsByDate({ date });
//       expect(result).toBeDefined();
//     });

//     test('VIS_046: Cập nhật trạng thái dịch vụ trong visit', async () => {
//       const vs = await prisma.visitService.findFirst();
//       if (vs) {
//         const result = await visitService.updateVisitServiceStatus(vs.id, 'done');
//         expect(result.status).toBe('done');
//       }
//     });

//     test('VIS_047: Cập nhật trạng thái visit trực tiếp - Thành công', async () => {
//       const patient = await prisma.patient.findUnique({ where: { userId: patientUserId }, include: { ehr: true } });
//       const visit = await prisma.visit.create({
//         data: { patientUserId, ehrId: patient!.ehr!.id, doctorId, status: 'in_progress', startTime: new Date() }
//       });
//       const result = await visitService.updateVisitStatus(visit.id, 'completed');
//       expect(result.status).toBe('completed');
//     });
//   });
// });