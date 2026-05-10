import appointmentService from '@src/services/appointment.service';
import { DbHelper } from './helpers/db-helper';
import prisma from '@src/config/prisma';

describe('AppointmentService Integration Tests (Full Excel Alignment)', () => {
  let doctorId: string;
  let patientId: string;
  let departmentId: number;
  let medicalServiceId: string;

  beforeAll(async () => {
    doctorId = await DbHelper.getAnyDoctorId();
    patientId = await DbHelper.getAnyPatientId();
    departmentId = await DbHelper.getAnyDepartmentId();
    medicalServiceId = await DbHelper.getAnyMedicalServiceId(doctorId);
  });

  describe('Get Available Slots (APT_001 - APT_005)', () => {
    test('APT_001: Lấy slots - Thành công (Mặc định)', async () => {
      const date = new Date();
      date.setDate(date.getDate() + 1);
      const query = { doctorId, date: date.toISOString().split('T')[0] };
      const result = await appointmentService.getAvailableSlots(query);
      expect(result).toHaveProperty('slots');
      expect(result.totalSlots).toBeDefined();
    });

    // test('APT_002: Lấy slots - Có MedicalService (Thay đổi duration)', async () => {
    //   const date = new Date();
    //   date.setDate(date.getDate() + 1);
    //   const query = { doctorId, date: date.toISOString().split('T')[0], medicalServiceId };
    //   const result = await appointmentService.getAvailableSlots(query);
    //   expect(result.slots.length).toBeGreaterThanOrEqual(0);
    // });

    test('APT_002: Lấy slots - Có MedicalService (Thay đổi duration)', async () => {
      const freshDocId = await DbHelper.createFreshDoctor();
      const roomId = await DbHelper.getAnyRoomId();

      const svc = await prisma.medicalService.create({
        data: {
          name: `Svc_APT002_${Date.now()}`,
          roomId,
          departmentId,
          isActive: true,
          price: 100,
          durationMinutes: 45,
        }
      });

      await prisma.doctorService.create({
        data: {
          doctorId: freshDocId,
          medicalServiceId: svc.id,
          price: 100,
          durationMinutes: 45,
          isActive: true,
        }
      });

      const date = new Date();
      date.setDate(date.getDate() + 1);
      const query = {
        doctorId: freshDocId,
        date: date.toISOString().split('T')[0],
        medicalServiceId: svc.id,
      };
      const result = await appointmentService.getAvailableSlots(query);
      expect(result.slots.length).toBeGreaterThanOrEqual(0);
    });

    test('APT_003: Lấy slots - Thất bại do Bác sĩ không tồn tại', async () => {
      await expect(appointmentService.getAvailableSlots({ doctorId: '00000000-0000-0000-0000-000000000000', date: '2026-06-01' }))
        .rejects.toThrow(/Không tìm thấy bác sĩ/);
    });

    test('APT_004: Lấy slots - Thất bại do Dịch vụ bị vô hiệu hóa', async () => {
      const inactiveSvc = await prisma.medicalService.create({
        data: { name: 'Inactive ' + Date.now(), roomId: await DbHelper.getAnyRoomId(), departmentId, isActive: false, price: 100, durationMinutes: 30 }
      });
      await prisma.doctorService.create({
        data: { doctorId, medicalServiceId: inactiveSvc.id, price: 100, durationMinutes: 30, isActive: true }
      });
      await expect(appointmentService.getAvailableSlots({ doctorId, date: '2026-06-01', medicalServiceId: inactiveSvc.id }))
        .rejects.toThrow(/không khả dụng/);
    });

    test('APT_005: Lấy slots - Trường hợp không có lịch làm việc', async () => {
      const farFutureDate = '2099-01-01';
      const result = await appointmentService.getAvailableSlots({ doctorId, date: farFutureDate });
      expect(result.slots).toHaveLength(0);
    });
  });

  describe('Create Appointment (APT_006 - APT_010, APT_019)', () => {
    test('APT_006: Tạo lịch hẹn - Thành công (Full data)', async () => {
      const freshDocId = await DbHelper.createFreshDoctor();
      const freshPatId = await DbHelper.createFreshPatient();
      const startTime = new Date();
      startTime.setFullYear(startTime.getFullYear() + 5);
      startTime.setHours(10, 0, 0, 0);

      await prisma.doctorService.create({
        data: { doctorId: freshDocId, medicalServiceId, price: 100, durationMinutes: 30, isActive: true }
      });

      const apt = await appointmentService.createAppointment({
        doctorId: freshDocId, patientId: freshPatId, startTime: startTime.toISOString(), reason: 'Regular Checkup with 10+ chars', departmentId, medicalServiceId
      }, freshPatId);
      expect(apt.status).toBe('pending');
    });

    test('APT_007: Tạo lịch hẹn - Thất bại do trùng lịch Bệnh nhân', async () => {
      const freshDocId = await DbHelper.createFreshDoctor();
      const freshPatId = await DbHelper.createFreshPatient();
      const startTime = new Date();
      startTime.setFullYear(startTime.getFullYear() + 5);
      startTime.setHours(11, 0, 0, 0);

      await appointmentService.createAppointment({
        doctorId: freshDocId, patientId: freshPatId, startTime: startTime.toISOString(), reason: 'First Appointment'
      }, freshPatId);

      const otherDocId = await DbHelper.createFreshDoctor();
      await expect(appointmentService.createAppointment({
        doctorId: otherDocId, patientId: freshPatId, startTime: startTime.toISOString(), reason: 'Overlapping Appointment'
      }, freshPatId)).rejects.toThrow(/đã có lịch hẹn/);
    });

    test('APT_008: Tạo lịch hẹn - Thất bại do trùng lịch Bác sĩ', async () => {
       const freshDocId = await DbHelper.createFreshDoctor();
       const freshPatId = await DbHelper.createFreshPatient();
       const startTime = new Date();
       startTime.setFullYear(startTime.getFullYear() + 5);
       startTime.setHours(12, 0, 0, 0);

       await appointmentService.createAppointment({
         doctorId: freshDocId, patientId: freshPatId, startTime: startTime.toISOString(), reason: 'First Appointment'
       }, freshPatId);

       const otherPatId = await DbHelper.createFreshPatient();
       await expect(appointmentService.createAppointment({
         doctorId: freshDocId, patientId: otherPatId, startTime: startTime.toISOString(), reason: 'Doctor Busy Check'
       }, otherPatId)).rejects.toThrow(/Bác sĩ không rảnh/);
    });

    test('APT_009: Tạo lịch hẹn - Thất bại do Slot đầy', async () => {
      const freshDocId = await DbHelper.createFreshDoctor();
      const doctor = await prisma.doctor.findUnique({ where: { userId: freshDocId }, include: { staff: true } });
      const sch = await prisma.schedule.create({
        data: {
          staffId: doctor!.userId,
          date: new Date(Date.now() + 1000 * 3600 * 24 * 401),
          startTime: new Date(Date.now() + 1000 * 3600 * 24 * 401),
          endTime: new Date(Date.now() + 1000 * 3600 * 24 * 401 + 3600 * 1000),
          maxSlot: 0,
          roomId: await DbHelper.getAnyRoomId(),
          departmentId
        }
      });
      const freshPatId = await DbHelper.createFreshPatient();
      await expect(appointmentService.createAppointment({
        doctorId: freshDocId, patientId: freshPatId, startTime: sch.startTime.toISOString(), scheduleId: sch.id, reason: 'Full Slot Check'
      }, freshPatId)).rejects.toThrow(/đã đầy/);
    });

    test('APT_010: Tạo lịch hẹn - Thất bại do sai khoảng thời gian làm việc', async () => {
      const freshDocId = await DbHelper.createFreshDoctor();
      const doctor = await prisma.doctor.findUnique({ where: { userId: freshDocId }, include: { staff: true } });
      const sch = await prisma.schedule.create({
        data: {
          staffId: doctor!.userId,
          date: new Date(Date.now() + 1000 * 3600 * 24 * 402),
          startTime: new Date(Date.now() + 1000 * 3600 * 24 * 402),
          endTime: new Date(Date.now() + 1000 * 3600 * 24 * 402 + 3600 * 1000),
          maxSlot: 10,
          roomId: await DbHelper.getAnyRoomId(),
          departmentId
        }
      });
      const outsideTime = new Date(sch.endTime.getTime() + 1000);
      await expect(appointmentService.createAppointment({
        doctorId: freshDocId, patientId, startTime: outsideTime.toISOString(), scheduleId: sch.id, reason: 'Outside work hours'
      }, patientId)).rejects.toThrow(/không thuộc khoảng lịch làm việc/);
    });

    test('APT_019: Tạo lịch hẹn - Tự động lấy patientId từ userId', async () => {
      const freshDocId = await DbHelper.createFreshDoctor();
      const freshPatId = await DbHelper.createFreshPatient();
      const startTime = new Date();
      startTime.setFullYear(startTime.getFullYear() + 8);
      startTime.setHours(10, 0, 0, 0);
      const apt = await appointmentService.createAppointment({
        doctorId: freshDocId, startTime: startTime.toISOString(), reason: 'Auto Patient ID test'
      }, freshPatId);
      expect(apt.patient.id).toBe(freshPatId);
    });
  });

  describe('Administrative Actions & Updates (APT_011 - APT_016)', () => {
    test('APT_011: Hủy lịch hẹn - Thành công (Staff hủy)', async () => {
      const aptId = await DbHelper.createPendingAppointment();
      const result = await appointmentService.cancelAppointment(aptId, { reason: 'Staff decided to cancel' }, 'staff');
      expect(result.status).toBe('cancelled');
    });

    test('APT_012: Hủy lịch hẹn - Thất bại (Patient hủy sát giờ)', async () => {
      const soon = new Date(Date.now() + 2 * 3600 * 1000); // 2 hours from now
      const apt = await prisma.appointment.create({
        data: { patientId, doctorId, startTime: soon, reason: 'Soon Apt', status: 'pending' }
      });
      await expect(appointmentService.cancelAppointment(apt.id, { reason: 'Too late to cancel' }, 'patient'))
        .rejects.toThrow(/24 giờ/);
    });

    test('APT_013: Cập nhật lịch hẹn - Thành công (Đổi ghi chú)', async () => {
      const aptId = await DbHelper.getAnyAppointmentId();
      const result = await appointmentService.updateAppointment(aptId, { notes: 'Updated notes' });
      expect(result.notes).toBe('Updated notes');
    });

    test('APT_014: Cập nhật lịch hẹn - Thất bại (Đổi giờ gây trùng)', async () => {
      const freshPatId = await DbHelper.createFreshPatient();
      const freshDocId = await DbHelper.createFreshDoctor();
      const time1 = new Date(); time1.setFullYear(time1.getFullYear() + 7); time1.setHours(9,0,0,0);
      const time2 = new Date(); time2.setFullYear(time2.getFullYear() + 7); time2.setHours(10,0,0,0);
      
      const apt1 = await appointmentService.createAppointment({ doctorId: freshDocId, patientId: freshPatId, startTime: time1.toISOString(), reason: 'Apt 1' }, freshPatId);
      await appointmentService.createAppointment({ doctorId: freshDocId, patientId: freshPatId, startTime: time2.toISOString(), reason: 'Apt 2' }, freshPatId);
      
      await expect(appointmentService.updateAppointment(apt1.id, { startTime: time2.toISOString() }))
        .rejects.toThrow();
    });

    test('APT_015: Phê duyệt lịch hẹn - Thành công', async () => {
      const aptId = await DbHelper.createPendingAppointment();
      const result = await appointmentService.approveAppointment(aptId, {}, 'admin');
      expect(result.status).toBe('confirmed');
    });

    test('APT_016: Từ chối lịch hẹn - Thành công', async () => {
      const aptId = await DbHelper.createPendingAppointment();
      const result = await appointmentService.rejectAppointment(aptId, { reasonCancel: 'Busy with emergency' }, 'admin');
      expect(result.status).toBe('rejected');
    });
  });

  describe('Query & Details (APT_017 - APT_018, APT_020)', () => {
    test('APT_017: Lấy danh sách - Lọc theo ngày (fromDate > toDate)', async () => {
      await expect(appointmentService.getAppointments({ fromDate: '2026-01-02', toDate: '2026-01-01' } as any))
        .rejects.toThrow(/fromDate phải nhỏ hơn hoặc bằng toDate/);
    });

    test('APT_018: Lấy danh sách - Phân trang hợp lệ', async () => {
      const result = await appointmentService.getAppointments({ page: 1, limit: 5 });
      expect(result.pagination.page).toBe(1);
    });

    test('APT_020: Lấy chi tiết - Có đầy đủ thông tin (Include)', async () => {
      const aptId = await DbHelper.getAnyAppointmentId();
      const result = await appointmentService.getAppointmentById(aptId);
      expect(result).toHaveProperty('patient');
      expect(result).toHaveProperty('doctor');
    });
  });
});

///////////////////
// import appointmentService from '@src/services/appointment.service';
// import { DbHelper } from './helpers/db-helper';
// import prisma from '@src/config/prisma';

// describe('AppointmentService Integration Tests (Full Excel Alignment)', () => {
//   let doctorId: string;
//   let patientId: string;
//   let departmentId: number;
//   let medicalServiceId: string;

//   beforeAll(async () => {
//     doctorId = await DbHelper.getAnyDoctorId();
//     patientId = await DbHelper.getAnyPatientId();
//     departmentId = await DbHelper.getAnyDepartmentId();
//     medicalServiceId = await DbHelper.getAnyMedicalServiceId(doctorId);
//   });

//   describe('Get Available Slots (APT_001 - APT_010)', () => {
//     test('APT_001: Lấy slots - Thành công (Mặc định)', async () => {
//       const date = new Date();
//       date.setDate(date.getDate() + 1);
//       const query = { doctorId, date: date.toISOString().split('T')[0] };
//       const result = await appointmentService.getAvailableSlots(query);
//       expect(result).toHaveProperty('slots');
//       expect(result.totalSlots).toBeDefined();
//     });

//     test('APT_002: Lấy slots - Có MedicalService (Thay đổi duration)', async () => {
//       const freshDocId = await DbHelper.createFreshDoctor();
//       const roomId = await DbHelper.getAnyRoomId();

//       const svc = await prisma.medicalService.create({
//         data: {
//           name: `Svc_APT002_${Date.now()}`,
//           roomId,
//           departmentId,
//           isActive: true,
//           price: 100,
//           durationMinutes: 45,
//         }
//       });

//       await prisma.doctorService.create({
//         data: {
//           doctorId: freshDocId,
//           medicalServiceId: svc.id,
//           price: 100,
//           durationMinutes: 45,
//           isActive: true,
//         }
//       });

//       const date = new Date();
//       date.setDate(date.getDate() + 1);
//       const query = {
//         doctorId: freshDocId,
//         date: date.toISOString().split('T')[0],
//         medicalServiceId: svc.id,
//       };
//       const result = await appointmentService.getAvailableSlots(query);
//       expect(result.slots.length).toBeGreaterThanOrEqual(0);
//     });

//     test('APT_003: Lấy slots - Thất bại do Bác sĩ không tồn tại', async () => {
//       await expect(appointmentService.getAvailableSlots({ doctorId: '00000000-0000-0000-0000-000000000000', date: '2026-06-01' }))
//         .rejects.toThrow(/Không tìm thấy bác sĩ/);
//     });

//     test('APT_004: Lấy slots - Thất bại do Dịch vụ bị vô hiệu hóa', async () => {
//       const inactiveSvc = await prisma.medicalService.create({
//         data: { name: 'Inactive ' + Date.now(), roomId: await DbHelper.getAnyRoomId(), departmentId, isActive: false, price: 100, durationMinutes: 30 }
//       });
//       await prisma.doctorService.create({
//         data: { doctorId, medicalServiceId: inactiveSvc.id, price: 100, durationMinutes: 30, isActive: true }
//       });
//       await expect(appointmentService.getAvailableSlots({ doctorId, date: '2026-06-01', medicalServiceId: inactiveSvc.id }))
//         .rejects.toThrow(/không khả dụng/);
//     });

//     test('APT_005: Lấy slots - Trường hợp không có lịch làm việc', async () => {
//       const farFutureDate = '2099-01-01';
//       const result = await appointmentService.getAvailableSlots({ doctorId, date: farFutureDate });
//       expect(result.slots).toHaveLength(0);
//     });

//     test('APT_006: Lấy slots - Validate query không hợp lệ (thiếu doctorId)', async () => {
//       await expect(appointmentService.getAvailableSlots({ date: '2026-06-01' }))
//         .rejects.toThrow();
//     });

//     test('APT_007: Lấy slots - Dịch vụ không tồn tại cho bác sĩ', async () => {
//       const freshDocId = await DbHelper.createFreshDoctor();
//       const roomId = await DbHelper.getAnyRoomId();
//       const svc = await prisma.medicalService.create({
//         data: { name: `Svc_NoDoc_${Date.now()}`, roomId, departmentId, isActive: true, price: 100, durationMinutes: 30 }
//       });
//       // Không tạo doctorService liên kết
//       await expect(appointmentService.getAvailableSlots({
//         doctorId: freshDocId,
//         date: '2026-06-01',
//         medicalServiceId: svc.id,
//       })).rejects.toThrow(/Bác sĩ không cung cấp dịch vụ/);
//     });

//     test('APT_008: Lấy slots - DoctorService bị vô hiệu hóa', async () => {
//       const freshDocId = await DbHelper.createFreshDoctor();
//       const roomId = await DbHelper.getAnyRoomId();
//       const svc = await prisma.medicalService.create({
//         data: { name: `Svc_InactiveDoc_${Date.now()}`, roomId, departmentId, isActive: true, price: 100, durationMinutes: 30 }
//       });
//       await prisma.doctorService.create({
//         data: { doctorId: freshDocId, medicalServiceId: svc.id, price: 100, durationMinutes: 30, isActive: false }
//       });
//       await expect(appointmentService.getAvailableSlots({
//         doctorId: freshDocId,
//         date: '2026-06-01',
//         medicalServiceId: svc.id,
//       })).rejects.toThrow(/không khả dụng/);
//     });

//     test('APT_009: Lấy slots - Có lịch nhưng đã đầy slot', async () => {
//       const freshDocId = await DbHelper.createFreshDoctor();
//       const freshPatId = await DbHelper.createFreshPatient();
//       const roomId = await DbHelper.getAnyRoomId();

//       const scheduleDate = new Date(Date.now() + 1000 * 3600 * 24 * 10);
//       const startTime = new Date(scheduleDate);
//       startTime.setHours(8, 0, 0, 0);
//       const endTime = new Date(scheduleDate);
//       endTime.setHours(9, 0, 0, 0);

//       const sch = await prisma.schedule.create({
//         data: {
//           staffId: freshDocId,
//           date: scheduleDate,
//           startTime,
//           endTime,
//           maxSlot: 1,
//           roomId,
//           departmentId,
//         }
//       });

//       // Tạo 1 appointment để lấp đầy slot
//       await prisma.appointment.create({
//         data: {
//           patientId: freshPatId,
//           doctorId: freshDocId,
//           scheduleId: sch.id,
//           startTime,
//           endTime,
//           reason: 'Fill slot',
//           status: 'pending',
//           bookedByUserId: freshPatId,
//         }
//       });

//       const result = await appointmentService.getAvailableSlots({
//         doctorId: freshDocId,
//         date: scheduleDate.toISOString().split('T')[0],
//       });
//       expect(result.slots).toHaveLength(0);
//     });

//     test('APT_010: Lấy slots - Có timezone tùy chỉnh', async () => {
//       const date = new Date();
//       date.setDate(date.getDate() + 1);
//       const query = { doctorId, date: date.toISOString().split('T')[0] };
//       const result = await appointmentService.getAvailableSlots(query, 'Asia/Ho_Chi_Minh');
//       expect(result).toHaveProperty('slots');
//     });
//   });

//   describe('Create Appointment (APT_011 - APT_022)', () => {
//     test('APT_011: Tạo lịch hẹn - Thành công (Full data)', async () => {
//       const freshDocId = await DbHelper.createFreshDoctor();
//       const freshPatId = await DbHelper.createFreshPatient();
//       const startTime = new Date();
//       startTime.setFullYear(startTime.getFullYear() + 5);
//       startTime.setHours(10, 0, 0, 0);

//       await prisma.doctorService.create({
//         data: { doctorId: freshDocId, medicalServiceId, price: 100, durationMinutes: 30, isActive: true }
//       });

//       const apt = await appointmentService.createAppointment({
//         doctorId: freshDocId, patientId: freshPatId, startTime: startTime.toISOString(), reason: 'Regular Checkup with 10+ chars', departmentId, medicalServiceId
//       }, freshPatId);
//       expect(apt.status).toBe('pending');
//     });

//     test('APT_012: Tạo lịch hẹn - Thất bại do trùng lịch Bệnh nhân', async () => {
//       const freshDocId = await DbHelper.createFreshDoctor();
//       const freshPatId = await DbHelper.createFreshPatient();
//       const startTime = new Date();
//       startTime.setFullYear(startTime.getFullYear() + 5);
//       startTime.setHours(11, 0, 0, 0);

//       await appointmentService.createAppointment({
//         doctorId: freshDocId, patientId: freshPatId, startTime: startTime.toISOString(), reason: 'First Appointment'
//       }, freshPatId);

//       const otherDocId = await DbHelper.createFreshDoctor();
//       await expect(appointmentService.createAppointment({
//         doctorId: otherDocId, patientId: freshPatId, startTime: startTime.toISOString(), reason: 'Overlapping Appointment'
//       }, freshPatId)).rejects.toThrow(/đã có lịch hẹn/);
//     });

//     test('APT_013: Tạo lịch hẹn - Thất bại do trùng lịch Bác sĩ', async () => {
//       const freshDocId = await DbHelper.createFreshDoctor();
//       const freshPatId = await DbHelper.createFreshPatient();
//       const startTime = new Date();
//       startTime.setFullYear(startTime.getFullYear() + 5);
//       startTime.setHours(12, 0, 0, 0);

//       await appointmentService.createAppointment({
//         doctorId: freshDocId, patientId: freshPatId, startTime: startTime.toISOString(), reason: 'First Appointment'
//       }, freshPatId);

//       const otherPatId = await DbHelper.createFreshPatient();
//       await expect(appointmentService.createAppointment({
//         doctorId: freshDocId, patientId: otherPatId, startTime: startTime.toISOString(), reason: 'Doctor Busy Check'
//       }, otherPatId)).rejects.toThrow(/Bác sĩ không rảnh/);
//     });

//     test('APT_014: Tạo lịch hẹn - Thất bại do Slot đầy', async () => {
//       const freshDocId = await DbHelper.createFreshDoctor();
//       const doctor = await prisma.doctor.findUnique({ where: { userId: freshDocId }, include: { staff: true } });
//       const sch = await prisma.schedule.create({
//         data: {
//           staffId: doctor!.userId,
//           date: new Date(Date.now() + 1000 * 3600 * 24 * 401),
//           startTime: new Date(Date.now() + 1000 * 3600 * 24 * 401),
//           endTime: new Date(Date.now() + 1000 * 3600 * 24 * 401 + 3600 * 1000),
//           maxSlot: 0,
//           roomId: await DbHelper.getAnyRoomId(),
//           departmentId
//         }
//       });
//       const freshPatId = await DbHelper.createFreshPatient();
//       await expect(appointmentService.createAppointment({
//         doctorId: freshDocId, patientId: freshPatId, startTime: sch.startTime.toISOString(), scheduleId: sch.id, reason: 'Full Slot Check'
//       }, freshPatId)).rejects.toThrow(/đã đầy/);
//     });

//     test('APT_015: Tạo lịch hẹn - Thất bại do sai khoảng thời gian làm việc', async () => {
//       const freshDocId = await DbHelper.createFreshDoctor();
//       const doctor = await prisma.doctor.findUnique({ where: { userId: freshDocId }, include: { staff: true } });
//       const sch = await prisma.schedule.create({
//         data: {
//           staffId: doctor!.userId,
//           date: new Date(Date.now() + 1000 * 3600 * 24 * 402),
//           startTime: new Date(Date.now() + 1000 * 3600 * 24 * 402),
//           endTime: new Date(Date.now() + 1000 * 3600 * 24 * 402 + 3600 * 1000),
//           maxSlot: 10,
//           roomId: await DbHelper.getAnyRoomId(),
//           departmentId
//         }
//       });
//       const outsideTime = new Date(sch.endTime.getTime() + 1000);
//       await expect(appointmentService.createAppointment({
//         doctorId: freshDocId, patientId, startTime: outsideTime.toISOString(), scheduleId: sch.id, reason: 'Outside work hours'
//       }, patientId)).rejects.toThrow(/không thuộc khoảng lịch làm việc/);
//     });

//     test('APT_016: Tạo lịch hẹn - Tự động lấy patientId từ userId', async () => {
//       const freshDocId = await DbHelper.createFreshDoctor();
//       const freshPatId = await DbHelper.createFreshPatient();
//       const startTime = new Date();
//       startTime.setFullYear(startTime.getFullYear() + 8);
//       startTime.setHours(10, 0, 0, 0);
//       const apt = await appointmentService.createAppointment({
//         doctorId: freshDocId, startTime: startTime.toISOString(), reason: 'Auto Patient ID test'
//       }, freshPatId);
//       expect(apt.patient.id).toBe(freshPatId);
//     });

//     test('APT_017: Tạo lịch hẹn - Thất bại do dữ liệu không hợp lệ', async () => {
//       await expect(appointmentService.createAppointment({}, patientId))
//         .rejects.toThrow();
//     });

//     test('APT_018: Tạo lịch hẹn - Thất bại do bác sĩ không tồn tại', async () => {
//       const startTime = new Date();
//       startTime.setFullYear(startTime.getFullYear() + 5);
//       await expect(appointmentService.createAppointment({
//         doctorId: '00000000-0000-0000-0000-000000000000',
//         startTime: startTime.toISOString(),
//         reason: 'Test reason here',
//       }, patientId)).rejects.toThrow(/Không tìm thấy bác sĩ/);
//     });

//     test('APT_019: Tạo lịch hẹn - Thất bại do dịch vụ không khả dụng cho bác sĩ', async () => {
//       const freshDocId = await DbHelper.createFreshDoctor();
//       const freshPatId = await DbHelper.createFreshPatient();
//       const roomId = await DbHelper.getAnyRoomId();
//       const inactiveSvc = await prisma.medicalService.create({
//         data: { name: `InactiveSvc_${Date.now()}`, roomId, departmentId, isActive: false, price: 100, durationMinutes: 30 }
//       });
//       await prisma.doctorService.create({
//         data: { doctorId: freshDocId, medicalServiceId: inactiveSvc.id, price: 100, durationMinutes: 30, isActive: true }
//       });

//       const startTime = new Date();
//       startTime.setFullYear(startTime.getFullYear() + 5);
//       startTime.setHours(9, 0, 0, 0);

//       await expect(appointmentService.createAppointment({
//         doctorId: freshDocId,
//         patientId: freshPatId,
//         startTime: startTime.toISOString(),
//         reason: 'Inactive service test',
//         medicalServiceId: inactiveSvc.id,
//       }, freshPatId)).rejects.toThrow(/không khả dụng/);
//     });

//     test('APT_020: Tạo lịch hẹn - Thất bại do startTime >= endTime', async () => {
//       const freshDocId = await DbHelper.createFreshDoctor();
//       const freshPatId = await DbHelper.createFreshPatient();
//       const startTime = new Date();
//       startTime.setFullYear(startTime.getFullYear() + 5);
//       startTime.setHours(10, 0, 0, 0);
//       const endTime = new Date(startTime.getTime() - 60000); // endTime trước startTime

//       await expect(appointmentService.createAppointment({
//         doctorId: freshDocId,
//         patientId: freshPatId,
//         startTime: startTime.toISOString(),
//         endTime: endTime.toISOString(),
//         reason: 'Invalid time range test',
//       }, freshPatId)).rejects.toThrow(/Thời gian/);
//     });

//     test('APT_021: Tạo lịch hẹn với scheduleId - Thành công', async () => {
//       const freshDocId = await DbHelper.createFreshDoctor();
//       const freshPatId = await DbHelper.createFreshPatient();
//       const roomId = await DbHelper.getAnyRoomId();

//       const scheduleStart = new Date(Date.now() + 1000 * 3600 * 24 * 500);
//       scheduleStart.setHours(8, 0, 0, 0);
//       const scheduleEnd = new Date(scheduleStart.getTime() + 2 * 3600 * 1000);

//       const sch = await prisma.schedule.create({
//         data: {
//           staffId: freshDocId,
//           date: scheduleStart,
//           startTime: scheduleStart,
//           endTime: scheduleEnd,
//           maxSlot: 5,
//           roomId,
//           departmentId,
//         }
//       });

//       const apt = await appointmentService.createAppointment({
//         doctorId: freshDocId,
//         patientId: freshPatId,
//         startTime: scheduleStart.toISOString(),
//         scheduleId: sch.id,
//         reason: 'Valid schedule appointment',
//       }, freshPatId);
//       expect(apt.status).toBe('pending');
//     });

//     test('APT_022: Tạo lịch hẹn - Thất bại do scheduleId không tồn tại', async () => {
//       const freshDocId = await DbHelper.createFreshDoctor();
//       const freshPatId = await DbHelper.createFreshPatient();
//       const startTime = new Date(Date.now() + 1000 * 3600 * 24 * 600);
//       startTime.setHours(9, 0, 0, 0);

//       await expect(appointmentService.createAppointment({
//         doctorId: freshDocId,
//         patientId: freshPatId,
//         startTime: startTime.toISOString(),
//         scheduleId: '00000000-0000-0000-0000-000000000000',
//         reason: 'Non-existent schedule',
//       }, freshPatId)).rejects.toThrow(/Không tìm thấy schedule/);
//     });
//   });

//   describe('Cancel Appointment (APT_023 - APT_028)', () => {
//     test('APT_023: Hủy lịch hẹn - Thành công (Staff hủy)', async () => {
//       const aptId = await DbHelper.createPendingAppointment();
//       const result = await appointmentService.cancelAppointment(aptId, { reason: 'Staff decided to cancel' }, 'staff');
//       expect(result.status).toBe('cancelled');
//     });

//     test('APT_024: Hủy lịch hẹn - Thất bại (Patient hủy sát giờ)', async () => {
//       const soon = new Date(Date.now() + 2 * 3600 * 1000); // 2 hours from now
//       const apt = await prisma.appointment.create({
//         data: { patientId, doctorId, startTime: soon, reason: 'Soon Apt', status: 'pending' }
//       });
//       await expect(appointmentService.cancelAppointment(apt.id, { reason: 'Too late to cancel' }, 'patient'))
//         .rejects.toThrow(/24 giờ/);
//     });

//     test('APT_025: Hủy lịch hẹn - Bệnh nhân hủy trước 24 giờ - Thành công', async () => {
//       const freshDocId = await DbHelper.createFreshDoctor();
//       const freshPatId = await DbHelper.createFreshPatient();
//       const startTime = new Date();
//       startTime.setFullYear(startTime.getFullYear() + 5);
//       startTime.setHours(10, 0, 0, 0);

//       const apt = await appointmentService.createAppointment({
//         doctorId: freshDocId,
//         startTime: startTime.toISOString(),
//         reason: 'Patient cancel test',
//       }, freshPatId);

//       const result = await appointmentService.cancelAppointment(apt.id, { reason: 'Changed my mind' }, 'patient');
//       expect(result.status).toBe('cancelled');
//     });

//     test('APT_026: Hủy lịch hẹn - Bác sĩ hủy - Thông báo bệnh nhân', async () => {
//       const freshDocId = await DbHelper.createFreshDoctor();
//       const freshPatId = await DbHelper.createFreshPatient();
//       const startTime = new Date();
//       startTime.setFullYear(startTime.getFullYear() + 5);
//       startTime.setHours(14, 0, 0, 0);

//       const apt = await appointmentService.createAppointment({
//         doctorId: freshDocId,
//         startTime: startTime.toISOString(),
//         reason: 'Doctor cancel test',
//       }, freshPatId);

//       const result = await appointmentService.cancelAppointment(apt.id, {}, 'doctor');
//       expect(result.status).toBe('cancelled');
//     });

//     test('APT_027: Hủy lịch hẹn - Không tìm thấy appointment', async () => {
//       await expect(appointmentService.cancelAppointment(
//         '00000000-0000-0000-0000-000000000000',
//         { reason: 'test' }
//       )).rejects.toThrow(/Không tìm thấy appointment/);
//     });

//     test('APT_028: Hủy lịch hẹn - Appointment đã hoàn thành (no role)', async () => {
//       const apt = await prisma.appointment.create({
//         data: { patientId, doctorId, startTime: new Date(), reason: 'Completed apt', status: 'completed' }
//       });
//       await expect(appointmentService.cancelAppointment(apt.id, {}))
//         .rejects.toThrow(/hoàn thành/);
//     });
//   });

//   describe('Update Appointment (APT_029 - APT_038)', () => {
//     test('APT_029: Cập nhật lịch hẹn - Thành công (Đổi ghi chú)', async () => {
//       const aptId = await DbHelper.getAnyAppointmentId();
//       const result = await appointmentService.updateAppointment(aptId, { notes: 'Updated notes' });
//       expect(result.notes).toBe('Updated notes');
//     });

//     test('APT_030: Cập nhật lịch hẹn - Thất bại (Đổi giờ gây trùng)', async () => {
//       const freshPatId = await DbHelper.createFreshPatient();
//       const freshDocId = await DbHelper.createFreshDoctor();
//       const time1 = new Date(); time1.setFullYear(time1.getFullYear() + 7); time1.setHours(9, 0, 0, 0);
//       const time2 = new Date(); time2.setFullYear(time2.getFullYear() + 7); time2.setHours(10, 0, 0, 0);

//       const apt1 = await appointmentService.createAppointment({ doctorId: freshDocId, patientId: freshPatId, startTime: time1.toISOString(), reason: 'Apt 1' }, freshPatId);
//       await appointmentService.createAppointment({ doctorId: freshDocId, patientId: freshPatId, startTime: time2.toISOString(), reason: 'Apt 2' }, freshPatId);

//       await expect(appointmentService.updateAppointment(apt1.id, { startTime: time2.toISOString() }))
//         .rejects.toThrow();
//     });

//     test('APT_031: Cập nhật lịch hẹn - Không tìm thấy appointment', async () => {
//       await expect(appointmentService.updateAppointment(
//         '00000000-0000-0000-0000-000000000000',
//         { notes: 'Some note' }
//       )).rejects.toThrow(/Không tìm thấy appointment/);
//     });

//     test('APT_032: Cập nhật lịch hẹn - Thất bại do đã hoàn thành', async () => {
//       const apt = await prisma.appointment.create({
//         data: { patientId, doctorId, startTime: new Date(), reason: 'Completed apt', status: 'completed' }
//       });
//       await expect(appointmentService.updateAppointment(apt.id, { notes: 'try update' }))
//         .rejects.toThrow(/hoàn thành/);
//     });

//     test('APT_033: Cập nhật lịch hẹn - Patient thay đổi thời gian, tự động chuyển pending', async () => {
//       const freshDocId = await DbHelper.createFreshDoctor();
//       const freshPatId = await DbHelper.createFreshPatient();
//       const startTime = new Date();
//       startTime.setFullYear(startTime.getFullYear() + 6);
//       startTime.setHours(9, 0, 0, 0);

//       const apt = await appointmentService.createAppointment({
//         doctorId: freshDocId,
//         startTime: startTime.toISOString(),
//         reason: 'Patient update time test',
//       }, freshPatId);

//       // Manually set to confirmed
//       await prisma.appointment.update({ where: { id: apt.id }, data: { status: 'confirmed' } });

//       const newTime = new Date(startTime);
//       newTime.setHours(10, 0, 0, 0);

//       const result = await appointmentService.updateAppointment(apt.id, {
//         startTime: newTime.toISOString(),
//       }, 'patient');
//       expect(result.status).toBe('pending');
//     });

//     test('APT_034: Cập nhật lịch hẹn - Thất bại do patient sửa sát giờ', async () => {
//       const soon = new Date(Date.now() + 2 * 3600 * 1000);
//       const apt = await prisma.appointment.create({
//         data: { patientId, doctorId, startTime: soon, reason: 'Soon Apt Edit', status: 'pending' }
//       });
//       await expect(appointmentService.updateAppointment(apt.id, { notes: 'update' }, 'patient'))
//         .rejects.toThrow(/24 giờ/);
//     });

//     test('APT_035: Cập nhật lịch hẹn - Thất bại do dữ liệu không hợp lệ', async () => {
//       const aptId = await DbHelper.getAnyAppointmentId();
//       await expect(appointmentService.updateAppointment(aptId, { startTime: 'invalid-date' }))
//         .rejects.toThrow();
//     });

//     test('APT_036: Cập nhật lịch hẹn - Bác sĩ đổi lịch → thông báo bệnh nhân', async () => {
//       const freshDocId = await DbHelper.createFreshDoctor();
//       const freshPatId = await DbHelper.createFreshPatient();
//       const startTime = new Date();
//       startTime.setFullYear(startTime.getFullYear() + 6);
//       startTime.setHours(8, 0, 0, 0);

//       const apt = await appointmentService.createAppointment({
//         doctorId: freshDocId,
//         startTime: startTime.toISOString(),
//         reason: 'Doctor reschedule test',
//       }, freshPatId);

//       const newStart = new Date(startTime);
//       newStart.setDate(newStart.getDate() + 1);

//       const result = await appointmentService.updateAppointment(apt.id, {
//         startTime: newStart.toISOString(),
//       }, 'doctor');
//       expect(result).toHaveProperty('startTime');
//     });

//     test('APT_037: Cập nhật lịch hẹn - Patient đổi lịch → thông báo bác sĩ', async () => {
//       const freshDocId = await DbHelper.createFreshDoctor();
//       const freshPatId = await DbHelper.createFreshPatient();
//       const startTime = new Date();
//       startTime.setFullYear(startTime.getFullYear() + 6);
//       startTime.setHours(7, 0, 0, 0);

//       const apt = await appointmentService.createAppointment({
//         doctorId: freshDocId,
//         startTime: startTime.toISOString(),
//         reason: 'Patient reschedule test',
//       }, freshPatId);

//       const newStart = new Date(startTime);
//       newStart.setDate(newStart.getDate() + 1);

//       const result = await appointmentService.updateAppointment(apt.id, {
//         startTime: newStart.toISOString(),
//       }, 'patient');
//       expect(result).toHaveProperty('startTime');
//     });

//     test('APT_038: Cập nhật lịch hẹn - Cập nhật status confirmed → gửi thông báo', async () => {
//       const aptId = await DbHelper.createPendingAppointment();
//       const result = await appointmentService.updateAppointment(aptId, { status: 'confirmed' });
//       expect(result.status).toBe('confirmed');
//     });
//   });

//   describe('Approve Appointment (APT_039 - APT_043)', () => {
//     test('APT_039: Phê duyệt lịch hẹn - Thành công', async () => {
//       const aptId = await DbHelper.createPendingAppointment();
//       const result = await appointmentService.approveAppointment(aptId, {}, 'admin');
//       expect(result.status).toBe('confirmed');
//     });

//     test('APT_040: Phê duyệt lịch hẹn - Thành công với notes', async () => {
//       const aptId = await DbHelper.createPendingAppointment();
//       const result = await appointmentService.approveAppointment(aptId, { notes: 'Please bring ID' }, 'doctor');
//       expect(result.status).toBe('confirmed');
//       expect(result.notes).toBe('Please bring ID');
//     });

//     test('APT_041: Phê duyệt lịch hẹn - Thất bại do không có quyền (patient)', async () => {
//       const aptId = await DbHelper.createPendingAppointment();
//       await expect(appointmentService.approveAppointment(aptId, {}, 'patient'))
//         .rejects.toThrow(/Chỉ bác sĩ hoặc admin/);
//     });

//     test('APT_042: Phê duyệt lịch hẹn - Thất bại do không phải pending', async () => {
//       const freshDocId = await DbHelper.createFreshDoctor();
//       const freshPatId = await DbHelper.createFreshPatient();
//       const startTime = new Date();
//       startTime.setFullYear(startTime.getFullYear() + 5);
//       startTime.setHours(15, 0, 0, 0);
//       const apt = await appointmentService.createAppointment({
//         doctorId: freshDocId,
//         startTime: startTime.toISOString(),
//         reason: 'Approve non-pending test',
//       }, freshPatId);
//       // First approve
//       await appointmentService.approveAppointment(apt.id, {}, 'admin');
//       // Try approve again
//       await expect(appointmentService.approveAppointment(apt.id, {}, 'admin'))
//         .rejects.toThrow(/pending/);
//     });

//     test('APT_043: Phê duyệt lịch hẹn - Không tìm thấy appointment', async () => {
//       await expect(appointmentService.approveAppointment(
//         '00000000-0000-0000-0000-000000000000',
//         {},
//         'admin'
//       )).rejects.toThrow(/Không tìm thấy appointment/);
//     });
//   });

//   describe('Reject Appointment (APT_044 - APT_048)', () => {
//     test('APT_044: Từ chối lịch hẹn - Thành công', async () => {
//       const aptId = await DbHelper.createPendingAppointment();
//       const result = await appointmentService.rejectAppointment(aptId, { reasonCancel: 'Busy with emergency' }, 'admin');
//       expect(result.status).toBe('rejected');
//     });

//     test('APT_045: Từ chối lịch hẹn - Thất bại do không có quyền (patient)', async () => {
//       const aptId = await DbHelper.createPendingAppointment();
//       await expect(appointmentService.rejectAppointment(aptId, { reasonCancel: 'test' }, 'patient'))
//         .rejects.toThrow(/Chỉ bác sĩ hoặc admin/);
//     });

//     test('APT_046: Từ chối lịch hẹn - Thất bại do không phải pending', async () => {
//       const freshDocId = await DbHelper.createFreshDoctor();
//       const freshPatId = await DbHelper.createFreshPatient();
//       const startTime = new Date();
//       startTime.setFullYear(startTime.getFullYear() + 5);
//       startTime.setHours(16, 0, 0, 0);
//       const apt = await appointmentService.createAppointment({
//         doctorId: freshDocId,
//         startTime: startTime.toISOString(),
//         reason: 'Reject non-pending test',
//       }, freshPatId);
//       await appointmentService.approveAppointment(apt.id, {}, 'admin');
//       await expect(appointmentService.rejectAppointment(apt.id, { reasonCancel: 'Cannot' }, 'admin'))
//         .rejects.toThrow(/pending/);
//     });

//     test('APT_047: Từ chối lịch hẹn - Không tìm thấy appointment', async () => {
//       await expect(appointmentService.rejectAppointment(
//         '00000000-0000-0000-0000-000000000000',
//         { reasonCancel: 'test' },
//         'admin'
//       )).rejects.toThrow(/Không tìm thấy appointment/);
//     });

//     test('APT_048: Từ chối lịch hẹn - Thất bại do thiếu reasonCancel', async () => {
//       const aptId = await DbHelper.createPendingAppointment();
//       await expect(appointmentService.rejectAppointment(aptId, {}, 'admin'))
//         .rejects.toThrow();
//     });
//   });

//   describe('Query & Details (APT_049 - APT_058)', () => {
//     test('APT_049: Lấy danh sách - Lọc theo ngày (fromDate > toDate)', async () => {
//       await expect(appointmentService.getAppointments({ fromDate: '2026-01-02', toDate: '2026-01-01' } as any))
//         .rejects.toThrow(/fromDate phải nhỏ hơn hoặc bằng toDate/);
//     });

//     test('APT_050: Lấy danh sách - Phân trang hợp lệ', async () => {
//       const result = await appointmentService.getAppointments({ page: 1, limit: 5 });
//       expect(result.pagination.page).toBe(1);
//     });

//     test('APT_051: Lấy danh sách - Lọc theo doctorId', async () => {
//       const result = await appointmentService.getAppointments({ doctorId, page: 1, limit: 5 });
//       expect(result).toHaveProperty('appointments');
//       expect(result).toHaveProperty('pagination');
//     });

//     test('APT_052: Lấy danh sách - Lọc theo patientId', async () => {
//       const result = await appointmentService.getAppointments({ patientId, page: 1, limit: 5 });
//       expect(result).toHaveProperty('appointments');
//     });

//     test('APT_053: Lấy danh sách - Lọc theo status', async () => {
//       const result = await appointmentService.getAppointments({ status: 'pending', page: 1, limit: 5 });
//       expect(result.appointments.every(a => a.status === 'pending')).toBe(true);
//     });

//     test('APT_054: Lấy danh sách - Query không hợp lệ', async () => {
//       await expect(appointmentService.getAppointments({ page: -1 } as any))
//         .rejects.toThrow();
//     });

//     test('APT_055: Lấy danh sách - Lọc theo fromDate và toDate hợp lệ', async () => {
//       const result = await appointmentService.getAppointments({
//         fromDate: '2020-01-01',
//         toDate: '2099-01-01',
//         page: 1,
//         limit: 5,
//       });
//       expect(result).toHaveProperty('appointments');
//     });

//     test('APT_056: Lấy chi tiết - Có đầy đủ thông tin (Include)', async () => {
//       const aptId = await DbHelper.getAnyAppointmentId();
//       const result = await appointmentService.getAppointmentById(aptId);
//       expect(result).toHaveProperty('patient');
//       expect(result).toHaveProperty('doctor');
//     });

//     test('APT_057: Lấy chi tiết - Không tìm thấy appointment', async () => {
//       await expect(appointmentService.getAppointmentById('00000000-0000-0000-0000-000000000000'))
//         .rejects.toThrow(/Không tìm thấy appointment/);
//     });

//     test('APT_058: Lấy chi tiết - ID rỗng', async () => {
//       await expect(appointmentService.getAppointmentById(''))
//         .rejects.toThrow(/ID/);
//     });
//   });
// });