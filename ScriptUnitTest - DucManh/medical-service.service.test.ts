import medicalServiceService from '@src/services/medical-service.service';
import { DbHelper } from './helpers/db-helper';
import prisma from '@src/config/prisma';

describe('MedicalServiceService Integration Tests (Full Excel Alignment)', () => {
  let roomId: string;
  let departmentId: number;

  beforeAll(async () => {
    roomId = await DbHelper.getAnyRoomId();
    departmentId = await DbHelper.getAnyDepartmentId();
  });

  describe('Query & Search (MSV_001 - MSV_003, MSV_010, MSV_012, MSV_015)', () => {
    test('MSV_001: Lấy danh sách - Thành công', async () => {
      const result = await medicalServiceService.getMedicalServices({ page: 1, limit: 10 });
      expect(result.data).toBeDefined();
      expect(result.metadata).toBeDefined();
    });

    test('MSV_002: Lấy danh sách - Có lọc giá', async () => {
      const result = await medicalServiceService.getMedicalServices({ minPrice: 100, maxPrice: 1000000 });
      expect(result.data.every((s: any) => s.price >= 100 && s.price <= 1000000)).toBe(true);
    });

    test('MSV_003: Lấy danh sách - Thất bại do minPrice > maxPrice', async () => {
      await expect(medicalServiceService.getMedicalServices({ minPrice: 500, maxPrice: 100 }))
        .rejects.toThrow(/giá tối thiểu không được lớn hơn/i);
    });

    test('MSV_010: Lấy dịch vụ theo khoa - Thành công', async () => {
      const result = await medicalServiceService.getMedicalServices({ departmentId });
      expect(result.data.every((s: any) => s.departmentId === departmentId)).toBe(true);
    });

    test('MSV_012: Tìm kiếm nâng cao - Thành công', async () => {
      const result = await medicalServiceService.getMedicalServices({ search: 'khám', maxPrice: 2000000 });
      expect(result.data).toBeDefined();
    });

    test('MSV_015: Lấy danh sách - Thất bại do trang < 1', async () => {
      await expect(medicalServiceService.getMedicalServices({ page: 0 }))
        .rejects.toThrow(/số trang phải lớn hơn 0/i);
    });
  });

  describe('Detail & Formatting (MSV_004 - MSV_005)', () => {
    test('MSV_004: Lấy dịch vụ theo ID - Thành công', async () => {
      const service = await prisma.medicalService.findFirst();
      if (service) {
        const result: any = await medicalServiceService.getMedicalServiceById(service.id);
        expect(result.priceFormatted).toContain('₫');
      }
    });

    test('MSV_005: Lấy dịch vụ theo ID - Thất bại do không tồn tại', async () => {
      await expect(medicalServiceService.getMedicalServiceById('00000000-0000-0000-0000-000000000000'))
        .rejects.toThrow(/không tìm thấy/i);
    });
  });

  describe('CRUD Operations (MSV_006 - MSV_007, MSV_013 - MSV_014)', () => {
    test('MSV_006: Tạo dịch vụ y tế - Thành công', async () => {
      const data = {
        name: 'New Test Service',
        roomId,
        departmentId,
        price: 150000,
        unit: 'Lượt',
        durationMinutes: 30,
        isActive: true
      };
      const result = await medicalServiceService.createMedicalService(data as any);
      expect(result.name).toBe('New Test Service');
    });

    test('MSV_007: Tạo dịch vụ - Thất bại do sai định dạng ID (Check via getListDoctorMedicalService)', async () => {
       await expect(medicalServiceService.getListDoctorMedicalService({ medicalServiceId: 'abc' }))
         .rejects.toThrow(/Validation Error/);
    });

    test('MSV_013: Cập nhật dịch vụ - Thành công', async () => {
      const service = await prisma.medicalService.findFirst();
      if (service) {
        const result = await medicalServiceService.updateMedicalService({ 
          price: 250000,
          name: service.name,
          departmentId: service.departmentId,
          unit: service.unit,
          durationMinutes: service.durationMinutes
        } as any, service.id);
        expect(result.price).toBe(250000);
      }
    });

    test('MSV_014: Xóa dịch vụ - Thành công', async () => {
      const service = await prisma.medicalService.create({
        data: { name: 'To Delete', roomId, departmentId, price: 100, unit: 'U', durationMinutes: 10 }
      });
      await medicalServiceService.deleteMedicalService(service.id);
      const exists = await prisma.medicalService.findUnique({ where: { id: service.id } });
      expect(exists).toBeNull();
    });
  });

  describe('Doctor Service & Ranking (MSV_008 - MSV_009, MSV_011)', () => {
    test('MSV_008: Tạo DoctorService - Thành công', async () => {
      const doctorId = await DbHelper.createFreshDoctor();
      const doctor = await prisma.doctor.findUnique({ where: { userId: doctorId }, include: { staff: true } });
      const service = await prisma.medicalService.findFirst({ where: { departmentId: doctor?.staff.departmentId } });
      if (service) {
        const result = await medicalServiceService.createDoctorService({
          doctorId,
          medicalServiceId: service.id,
          price: 200000,
          durationMinutes: 30
        } as any);
        expect(result.doctorServices.some((ds: any) => ds.doctorId === doctorId)).toBe(true);
      }
    });

    test('MSV_009: Tạo DoctorService - Thất bại do khác khoa', async () => {
      const doctor = await prisma.doctor.findFirst({ include: { staff: true } });
      const service = await prisma.medicalService.findFirst({
        where: { departmentId: { not: doctor?.staff.departmentId } }
      });
      if (doctor && service) {
        await expect(medicalServiceService.createDoctorService({
          doctorId: doctor.userId,
          medicalServiceId: service.id,
          price: 100,
          durationMinutes: 30
        } as any)).rejects.toThrow(/không thuộc khoa/);
      }
    });

    test('MSV_011: Lấy dịch vụ phổ biến - Có ranking', async () => {
      const result = await medicalServiceService.getPopularServices(5);
      if (result.length > 0) {
        expect(result[0]).toHaveProperty('ranking');
        expect(result[0]).toHaveProperty('popularityScore');
      }
    });
  });
});

// import medicalServiceService from '@src/services/medical-service.service';
// import { DbHelper } from './helpers/db-helper';
// import prisma from '@src/config/prisma';
// import { ValidationError } from '@src/core/Error';

// /**
//  * Helper: assert một promise reject với ValidationError chứa message khớp pattern.
//  * Dùng thay cho .rejects.toThrow() khi ValidationError.message luôn là "Validation Error"
//  * và nội dung thực nằm trong error.errors[].message hoặc error.validationMessage.
//  */
// async function expectValidationError(promise: Promise<any>, pattern: RegExp): Promise<void> {
//   try {
//     await promise;
//     throw new Error('Expected promise to reject but it resolved');
//   } catch (err: any) {
//     expect(err).toBeInstanceOf(ValidationError);
//     const allMessages = [
//       err.validationMessage ?? '',
//       ...(err.errors ?? []).map((e: any) => e.message ?? ''),
//     ].join(' ');
//     expect(allMessages).toMatch(pattern);
//   }
// }

// describe('MedicalServiceService Integration Tests (Full Excel Alignment)', () => {
//   let roomId: string;
//   let departmentId: number;

//   beforeAll(async () => {
//     roomId = await DbHelper.getAnyRoomId();
//     departmentId = await DbHelper.getAnyDepartmentId();
//   });

//   // ============================================================
//   // Query & Search - getMedicalServices (MSV_001 - MSV_012)
//   // ============================================================
//   describe('Query & Search - getMedicalServices (MSV_001 - MSV_012)', () => {
//     test('MSV_001: Lấy danh sách - Thành công', async () => {
//       const result = await medicalServiceService.getMedicalServices({ page: 1, limit: 10 });
//       expect(result.data).toBeDefined();
//       expect(result.metadata).toBeDefined();
//     });

//     test('MSV_002: Lấy danh sách - Có lọc giá', async () => {
//       const result = await medicalServiceService.getMedicalServices({ minPrice: 100, maxPrice: 1000000 });
//       expect(result.data.every((s: any) => s.price >= 100 && s.price <= 1000000)).toBe(true);
//     });

//     test('MSV_003: Lấy danh sách - Thất bại do minPrice > maxPrice', async () => {
//       await expectValidationError(
//         medicalServiceService.getMedicalServices({ minPrice: 500, maxPrice: 100 }),
//         /giá tối thiểu không được lớn hơn/i
//       );
//     });

//     test('MSV_004: Lấy danh sách - Thất bại do trang < 1', async () => {
//       await expectValidationError(
//         medicalServiceService.getMedicalServices({ page: 0 }),
//         /số trang phải lớn hơn 0/i
//       );
//     });

//     test('MSV_005: Lấy danh sách - Thất bại do limit < 1', async () => {
//       await expectValidationError(
//         medicalServiceService.getMedicalServices({ page: 1, limit: 0 }),
//         /số lượng bản ghi phải từ 1 đến 100/i
//       );
//     });

//     test('MSV_006: Lấy danh sách - Thất bại do limit > 100', async () => {
//       await expectValidationError(
//         medicalServiceService.getMedicalServices({ page: 1, limit: 101 }),
//         /số lượng bản ghi phải từ 1 đến 100/i
//       );
//     });

//     test('MSV_007: Lấy danh sách - Thất bại do minPrice âm', async () => {
//       await expectValidationError(
//         medicalServiceService.getMedicalServices({ minPrice: -1 }),
//         /giá tối thiểu phải lớn hơn hoặc bằng 0/i
//       );
//     });

//     test('MSV_008: Lấy danh sách - Thất bại do maxPrice âm', async () => {
//       await expectValidationError(
//         medicalServiceService.getMedicalServices({ maxPrice: -1 }),
//         /giá tối đa phải lớn hơn hoặc bằng 0/i
//       );
//     });

//     test('MSV_009: Lấy danh sách - Thất bại do search rỗng (chỉ khoảng trắng)', async () => {
//       await expectValidationError(
//         medicalServiceService.getMedicalServices({ search: '   ' }),
//         /từ khóa tìm kiếm phải có ít nhất 1 ký tự/i
//       );
//     });

//     test('MSV_010: Lấy dịch vụ theo khoa - Thành công', async () => {
//       const result = await medicalServiceService.getMedicalServices({ departmentId });
//       expect(result.data.every((s: any) => s.departmentId === departmentId)).toBe(true);
//     });

//     test('MSV_011: Tìm kiếm nâng cao - Thành công', async () => {
//       const result = await medicalServiceService.getMedicalServices({ search: 'khám', maxPrice: 2000000 });
//       expect(result.data).toBeDefined();
//     });

//     test('MSV_012: Lấy danh sách - Trả về trường computed (isPopular, priceFormatted, hasInsuranceSupport)', async () => {
//       const result = await medicalServiceService.getMedicalServices({ page: 1, limit: 5 });
//       if (result.data.length > 0) {
//         expect(result.data[0]).toHaveProperty('isPopular');
//         expect(result.data[0]).toHaveProperty('priceFormatted');
//         expect(result.data[0]).toHaveProperty('hasInsuranceSupport');
//         expect(result.data[0].priceFormatted).toContain('₫');
//       }
//     });
//   });

//   // ============================================================
//   // Detail & Formatting - getMedicalServiceById (MSV_013 - MSV_016)
//   // ============================================================
//   describe('Detail & Formatting - getMedicalServiceById (MSV_013 - MSV_016)', () => {
//     test('MSV_013: Lấy dịch vụ theo ID - Thành công', async () => {
//       const service = await prisma.medicalService.findFirst();
//       if (service) {
//         const result: any = await medicalServiceService.getMedicalServiceById(service.id);
//         expect(result.priceFormatted).toContain('₫');
//       }
//     });

//     test('MSV_014: Lấy dịch vụ theo ID - Thất bại do không tồn tại', async () => {
//       await expect(medicalServiceService.getMedicalServiceById('00000000-0000-0000-0000-000000000000'))
//         .rejects.toThrow(/không tìm thấy/i);
//     });

//     test('MSV_015: Lấy dịch vụ theo ID - Thất bại do ID rỗng', async () => {
//       await expectValidationError(
//         medicalServiceService.getMedicalServiceById(''),
//         /ID dịch vụ y tế là bắt buộc/i
//       );
//     });

//     test('MSV_016: Lấy dịch vụ theo ID - Trả về trường hasInsuranceSupport và discountAmount', async () => {
//       const service = await prisma.medicalService.findFirst();
//       if (service) {
//         const result: any = await medicalServiceService.getMedicalServiceById(service.id);
//         expect(result).toHaveProperty('hasInsuranceSupport');
//         expect(result).toHaveProperty('discountAmount');
//       }
//     });
//   });

//   // ============================================================
//   // getListDoctorMedicalService (MSV_017 - MSV_018)
//   // ============================================================
//   describe('getListDoctorMedicalService (MSV_017 - MSV_018)', () => {
//     test('MSV_017: Lấy danh sách doctor service - Thất bại do sai định dạng ID', async () => {
//       await expect(medicalServiceService.getListDoctorMedicalService({ medicalServiceId: 'abc' }))
//         .rejects.toThrow(/Validation Error/);
//     });

//     test('MSV_018: Lấy danh sách doctor service - Thất bại do ID đúng format nhưng không tồn tại', async () => {
//       await expect(medicalServiceService.getListDoctorMedicalService({
//         medicalServiceId: 'MSV-00000000-0000-1000-8000-000000000000'
//       })).rejects.toThrow(/không tồn tại/i);
//     });
//   });

//   // ============================================================
//   // CRUD Operations - createMedicalService (MSV_019 - MSV_021)
//   // ============================================================
//   describe('CRUD Operations - createMedicalService (MSV_019 - MSV_021)', () => {
//     test('MSV_019: Tạo dịch vụ y tế - Thành công', async () => {
//       const data = {
//         name: 'New Test Service',
//         roomId,
//         departmentId,
//         price: 150000,
//         unit: 'Lượt',
//         durationMinutes: 30,
//         isActive: true
//       };
//       const result = await medicalServiceService.createMedicalService(data as any);
//       expect(result.name).toBe('New Test Service');
//     });

//     test('MSV_020: Tạo dịch vụ - Thất bại do phòng không tồn tại', async () => {
//       await expect(medicalServiceService.createMedicalService({
//         name: 'Invalid Room Service',
//         roomId: '00000000-0000-0000-0000-000000000000',
//         departmentId,
//         price: 100000,
//         unit: 'Lượt',
//         durationMinutes: 30
//       } as any)).rejects.toThrow(/phòng khám không tồn tại/i);
//     });

//     test('MSV_021: Tạo dịch vụ - Thất bại do khoa không tồn tại', async () => {
//       await expect(medicalServiceService.createMedicalService({
//         name: 'Invalid Department Service',
//         roomId,
//         departmentId: 999999,
//         price: 100000,
//         unit: 'Lượt',
//         durationMinutes: 30
//       } as any)).rejects.toThrow(/khoa không tồn tại/i);
//     });
//   });

//   // ============================================================
//   // CRUD Operations - updateMedicalService (MSV_022 - MSV_026)
//   // ============================================================
//   describe('CRUD Operations - updateMedicalService (MSV_022 - MSV_026)', () => {
//     test('MSV_022: Cập nhật dịch vụ - Thành công', async () => {
//       const service = await prisma.medicalService.findFirst();
//       if (service) {
//         const result = await medicalServiceService.updateMedicalService({
//           price: 250000,
//           name: service.name,
//           departmentId: service.departmentId,
//           unit: service.unit,
//           durationMinutes: service.durationMinutes
//         } as any, service.id);
//         expect(result.price).toBe(250000);
//       }
//     });

//     test('MSV_023: Cập nhật dịch vụ - Thất bại do dịch vụ không tồn tại', async () => {
//       await expect(medicalServiceService.updateMedicalService({
//         price: 100000,
//         name: 'Ghost',
//         departmentId,
//         unit: 'Lượt',
//         durationMinutes: 30
//       } as any, '00000000-0000-0000-0000-000000000000'))
//         .rejects.toThrow(/dịch vụ y tế không tồn tại/i);
//     });

//     test('MSV_024: Cập nhật dịch vụ - Thất bại do phòng mới không tồn tại', async () => {
//       const service = await prisma.medicalService.findFirst();
//       if (service) {
//         await expect(medicalServiceService.updateMedicalService({
//           roomId: '00000000-0000-0000-0000-000000000000'
//         } as any, service.id)).rejects.toThrow(/phòng khám không tồn tại/i);
//       }
//     });

//     test('MSV_025: Cập nhật dịch vụ - Thất bại do khoa mới không tồn tại', async () => {
//       const service = await prisma.medicalService.findFirst();
//       if (service) {
//         await expect(medicalServiceService.updateMedicalService({
//           departmentId: 999999
//         } as any, service.id)).rejects.toThrow(/khoa không tồn tại/i);
//       }
//     });

//     test('MSV_026: Cập nhật dịch vụ - Thành công khi không truyền roomId và departmentId (bỏ qua validation)', async () => {
//       const service = await prisma.medicalService.findFirst();
//       if (service) {
//         const result = await medicalServiceService.updateMedicalService({
//           price: 300000
//         } as any, service.id);
//         expect(result.price).toBe(300000);
//       }
//     });
//   });

//   // ============================================================
//   // CRUD Operations - deleteMedicalService (MSV_027 - MSV_028)
//   // ============================================================
//   describe('CRUD Operations - deleteMedicalService (MSV_027 - MSV_028)', () => {
//     test('MSV_027: Xóa dịch vụ - Thành công', async () => {
//       const service = await prisma.medicalService.create({
//         data: { name: 'To Delete', roomId, departmentId, price: 100, unit: 'U', durationMinutes: 10 }
//       });
//       await medicalServiceService.deleteMedicalService(service.id);
//       const exists = await prisma.medicalService.findUnique({ where: { id: service.id } });
//       expect(exists).toBeNull();
//     });

//     test('MSV_028: Xóa dịch vụ - Thất bại do dịch vụ không tồn tại', async () => {
//       await expect(medicalServiceService.deleteMedicalService('00000000-0000-0000-0000-000000000000'))
//         .rejects.toThrow(/dịch vụ y tế không tồn tại/i);
//     });
//   });

//   // ============================================================
//   // Doctor Service & Ranking (MSV_029 - MSV_036)
//   // ============================================================
//   describe('Doctor Service & Ranking (MSV_029 - MSV_036)', () => {
//     test('MSV_029: Tạo DoctorService - Thành công', async () => {
//       const doctorId = await DbHelper.createFreshDoctor();
//       const doctor = await prisma.doctor.findUnique({ where: { userId: doctorId }, include: { staff: true } });
//       const service = await prisma.medicalService.findFirst({ where: { departmentId: doctor?.staff.departmentId } });
//       if (service) {
//         const result = await medicalServiceService.createDoctorService({
//           doctorId,
//           medicalServiceId: service.id,
//           price: 200000,
//           durationMinutes: 30
//         } as any);
//         expect(result.doctorServices.some((ds: any) => ds.doctorId === doctorId)).toBe(true);
//       }
//     });

//     test('MSV_030: Tạo DoctorService - Thất bại do khác khoa', async () => {
//       const doctor = await prisma.doctor.findFirst({ include: { staff: true } });
//       const service = await prisma.medicalService.findFirst({
//         where: { departmentId: { not: doctor?.staff.departmentId } }
//       });
//       if (doctor && service) {
//         await expect(medicalServiceService.createDoctorService({
//           doctorId: doctor.userId,
//           medicalServiceId: service.id,
//           price: 100,
//           durationMinutes: 30
//         } as any)).rejects.toThrow(/không thuộc khoa/);
//       }
//     });

//     test('MSV_031: Tạo DoctorService - Thất bại do bác sĩ không tồn tại', async () => {
//       const service = await prisma.medicalService.findFirst();
//       if (service) {
//         await expect(medicalServiceService.createDoctorService({
//           doctorId: '00000000-0000-0000-0000-000000000000',
//           medicalServiceId: service.id,
//           price: 100,
//           durationMinutes: 30
//         } as any)).rejects.toThrow(/bác sĩ không tồn tại/i);
//       }
//     });

//     test('MSV_032: Tạo DoctorService - Thất bại do dịch vụ không tồn tại', async () => {
//       const doctorId = await DbHelper.createFreshDoctor();
//       await expect(medicalServiceService.createDoctorService({
//         doctorId,
//         medicalServiceId: '00000000-0000-0000-0000-000000000000',
//         price: 100,
//         durationMinutes: 30
//       } as any)).rejects.toThrow(/dịch vụ y tế không tồn tại/i);
//     });

//     test('MSV_033: Xóa DoctorService - Thành công', async () => {
//       const doctorId = await DbHelper.createFreshDoctor();
//       const doctor = await prisma.doctor.findUnique({ where: { userId: doctorId }, include: { staff: true } });
//       const service = await prisma.medicalService.findFirst({ where: { departmentId: doctor?.staff.departmentId } });
//       if (service) {
//         await medicalServiceService.createDoctorService({
//           doctorId,
//           medicalServiceId: service.id,
//           price: 200000,
//           durationMinutes: 30
//         } as any);
//         const result = await medicalServiceService.deleteDoctorService(doctorId, service.id);
//         expect(result).toBeDefined();
//       }
//     });

//     test('MSV_034: Xóa DoctorService - Thất bại do bác sĩ không tồn tại', async () => {
//       const service = await prisma.medicalService.findFirst();
//       if (service) {
//         await expect(medicalServiceService.deleteDoctorService(
//           '00000000-0000-0000-0000-000000000000',
//           service.id
//         )).rejects.toThrow(/bác sĩ không tồn tại/i);
//       }
//     });

//     test('MSV_035: Xóa DoctorService - Thất bại do dịch vụ không tồn tại', async () => {
//       const doctorId = await DbHelper.createFreshDoctor();
//       await expect(medicalServiceService.deleteDoctorService(
//         doctorId,
//         '00000000-0000-0000-0000-000000000000'
//       )).rejects.toThrow(/dịch vụ y tế không tồn tại/i);
//     });

//     test('MSV_036: Lấy dịch vụ phổ biến - Có ranking', async () => {
//       const result = await medicalServiceService.getPopularServices(5);
//       if (result.length > 0) {
//         expect(result[0]).toHaveProperty('ranking');
//         expect(result[0]).toHaveProperty('popularityScore');
//       }
//     });
//   });

//   // ============================================================
//   // getServicesByDepartment (MSV_037 - MSV_040)
//   // ============================================================
//   describe('getServicesByDepartment (MSV_037 - MSV_040)', () => {
//     test('MSV_037: Lấy dịch vụ theo khoa - Thành công', async () => {
//       const result = await medicalServiceService.getServicesByDepartment(departmentId);
//       expect(Array.isArray(result)).toBe(true);
//       if (result.length > 0) {
//         expect(result[0]).toHaveProperty('priceFormatted');
//         expect(result[0]).toHaveProperty('hasInsuranceSupport');
//       }
//     });

//     test('MSV_038: Lấy dịch vụ theo khoa - Thất bại do departmentId không hợp lệ (= 0)', async () => {
//       await expectValidationError(
//         medicalServiceService.getServicesByDepartment(0),
//         /ID khoa không hợp lệ/i
//       );
//     });

//     test('MSV_039: Lấy dịch vụ theo khoa - Thất bại do departmentId âm', async () => {
//       await expectValidationError(
//         medicalServiceService.getServicesByDepartment(-1),
//         /ID khoa không hợp lệ/i
//       );
//     });

//     test('MSV_040: Lấy dịch vụ theo khoa - Thành công với phân trang', async () => {
//       const result = await medicalServiceService.getServicesByDepartment(departmentId, 1, 5);
//       expect(Array.isArray(result)).toBe(true);
//     });
//   });

//   // ============================================================
//   // getPopularServices (MSV_041 - MSV_043)
//   // ============================================================
//   describe('getPopularServices (MSV_041 - MSV_043)', () => {
//     test('MSV_041: Lấy dịch vụ phổ biến - Thành công', async () => {
//       const result = await medicalServiceService.getPopularServices(10);
//       expect(Array.isArray(result)).toBe(true);
//     });

//     test('MSV_042: Lấy dịch vụ phổ biến - Thất bại do limit < 1', async () => {
//       await expectValidationError(
//         medicalServiceService.getPopularServices(0),
//         /số lượng dịch vụ phải từ 1 đến 50/i
//       );
//     });

//     test('MSV_043: Lấy dịch vụ phổ biến - Thất bại do limit > 50', async () => {
//       await expectValidationError(
//         medicalServiceService.getPopularServices(51),
//         /số lượng dịch vụ phải từ 1 đến 50/i
//       );
//     });
//   });

//   // ============================================================
//   // getServicesByPriceRange (MSV_044 - MSV_047)
//   // ============================================================
//   describe('getServicesByPriceRange (MSV_044 - MSV_047)', () => {
//     test('MSV_044: Lấy dịch vụ theo khoảng giá - Thành công', async () => {
//       const result = await medicalServiceService.getServicesByPriceRange(100000, 500000);
//       expect(Array.isArray(result)).toBe(true);
//       if (result.length > 0) {
//         expect(result[0]).toHaveProperty('priceFormatted');
//         expect(result[0]).toHaveProperty('savingAmount');
//         expect(result[0]).toHaveProperty('hasInsuranceSupport');
//       }
//     });

//     test('MSV_045: Lấy dịch vụ theo khoảng giá - Thất bại do minPrice âm', async () => {
//       await expectValidationError(
//         medicalServiceService.getServicesByPriceRange(-1, 500000),
//         /giá không được âm/i
//       );
//     });

//     test('MSV_046: Lấy dịch vụ theo khoảng giá - Thất bại do maxPrice âm', async () => {
//       await expectValidationError(
//         medicalServiceService.getServicesByPriceRange(100, -1),
//         /giá không được âm/i
//       );
//     });

//     test('MSV_047: Lấy dịch vụ theo khoảng giá - Thất bại do minPrice > maxPrice', async () => {
//       await expectValidationError(
//         medicalServiceService.getServicesByPriceRange(500000, 100000),
//         /giá tối thiểu không được lớn hơn giá tối đa/i
//       );
//     });
//   });

//   // ============================================================
//   // searchServices (MSV_048 - MSV_051)
//   // ============================================================
//   describe('searchServices (MSV_048 - MSV_051)', () => {
//     test('MSV_048: Tìm kiếm nâng cao - Thành công', async () => {
//       const result = await medicalServiceService.searchServices('khám');
//       expect(result.data).toBeDefined();
//     });

//     test('MSV_049: Tìm kiếm nâng cao - Thất bại do từ khóa quá ngắn (< 2 ký tự)', async () => {
//       await expectValidationError(
//         medicalServiceService.searchServices('k'),
//         /từ khóa tìm kiếm phải có ít nhất 2 ký tự/i
//       );
//     });

//     test('MSV_050: Tìm kiếm nâng cao - Thất bại do từ khóa rỗng', async () => {
//       await expectValidationError(
//         medicalServiceService.searchServices(''),
//         /từ khóa tìm kiếm phải có ít nhất 2 ký tự/i
//       );
//     });

//     test('MSV_051: Tìm kiếm nâng cao - Thành công với filter departmentId và maxPrice', async () => {
//       const result = await medicalServiceService.searchServices('khám', {
//         departmentId,
//         maxPrice: 2000000
//       });
//       expect(result.data).toBeDefined();
//     });
//   });
// });