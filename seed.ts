import { PrismaClient, DepartmentType, RoomType, UserGender } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const hashPassword = async (password: string) => {
    return await bcrypt.hash(password, 10);
};

export async function main() {
    console.log('Seeding roles...');
    await prisma.role.createMany({
        data: [
            { id: 1, name: 'patient', prefix: 'PAT' },
            { id: 2, name: 'admin', prefix: 'ADM' },
            { id: 3, name: 'doctor', prefix: 'DOC' },
            { id: 4, name: 'pharmacist', prefix: 'PHARM' },
            { id: 5, name: 'accountant', prefix: 'ACC' },
        ],
        skipDuplicates: true,
    });

    console.log('Seeding counters...');
    await prisma.counter.createMany({
        data: [
            { id: 'patient', value: 0n },
            { id: 'staff', value: 0n },
        ],
        skipDuplicates: true,
    });

    console.log('Seeding addresses and hospital...');
    const hospitalAddress = await prisma.address.upsert({
        where: { id: "addr-hospital" },
        update: {},
        create: {
            id: "addr-hospital",
            detail: "123 Nguyễn Văn Cừ",
            ward: "Phường 4",
            district: "Quận 5",
            city: "Thành phố Hồ Chí Minh",
            country: "Việt Nam",
        }
    });

    const hospital = await prisma.hospital.upsert({
        where: { id: "hospital-1" },
        update: {},
        create: {
            id: "hospital-1",
            name: "Bệnh viện Đa khoa ABC",
            phone: "028-1234-5678",
            addressId: hospitalAddress.id,
        }
    });

    console.log('Seeding buildings...');
    const bA = await prisma.building.upsert({
        where: { id: "building-A" },
        update: {},
        create: { id: "building-A", hospitalId: hospital.id, name: "Tòa A - Khám bệnh", floorCount: 5 }
    });
    const bB = await prisma.building.upsert({
        where: { id: "building-B" },
        update: {},
        create: { id: "building-B", hospitalId: hospital.id, name: "Tòa B - Cận lâm sàng", floorCount: 3 }
    });
    const bC = await prisma.building.upsert({
        where: { id: "building-C" },
        update: {},
        create: { id: "building-C", hospitalId: hospital.id, name: "Tòa C - Hành chính", floorCount: 2 }
    });

    console.log('Seeding rooms...');
    const roomsData = [
        { id: "room-A-101", buildingId: bA.id, name: "Phòng khám 101", number_room: 101, floor: 1, type: RoomType.examination },
        { id: "room-A-102", buildingId: bA.id, name: "Phòng khám 102", number_room: 102, floor: 1, type: RoomType.examination },
        { id: "room-A-201", buildingId: bA.id, name: "Phòng khám 201", number_room: 201, floor: 2, type: RoomType.examination },
        { id: "room-A-103", buildingId: bA.id, name: "Phòng cấp cứu 103", number_room: 103, floor: 1, type: RoomType.emergency },
        { id: "room-B-101", buildingId: bB.id, name: "Phòng xét nghiệm 101", number_room: 101, floor: 1, type: RoomType.laboratory },
        { id: "room-B-102", buildingId: bB.id, name: "Phòng X-quang 102", number_room: 102, floor: 1, type: RoomType.radiology },
        { id: "room-B-201", buildingId: bB.id, name: "Phòng lấy thuốc 201", number_room: 201, floor: 2, type: RoomType.pharmacy },
        { id: "room-A-104", buildingId: bA.id, name: "Phòng chờ 104", number_room: 104, floor: 1, type: RoomType.waiting },
        { id: "room-C-101", buildingId: bC.id, name: "Văn phòng 101", number_room: 101, floor: 1, type: RoomType.office },
    ];

    for (const r of roomsData) {
        await prisma.room.upsert({
            where: { id: r.id },
            update: {},
            create: r
        });
    }

    console.log('Seeding departments...');
    const departmentsData = [
        { id: 1, code: "NOI-TQ", name: "Khoa Nội tổng quát", description: "Khám và điều trị các bệnh nội khoa", type: DepartmentType.clinical, roomId: "room-A-101" },
        { id: 2, code: "NGOAI-TQ", name: "Khoa Ngoại tổng quát", description: "Khám và điều trị các bệnh ngoại khoa", type: DepartmentType.clinical, roomId: "room-A-102" },
        { id: 3, code: "TIM-MACH", name: "Khoa Tim mạch", description: "Khám và điều trị bệnh tim mạch", type: DepartmentType.clinical, roomId: "room-A-201" },
        { id: 4, code: "NHI", name: "Khoa Nhi", description: "Khám và điều trị bệnh trẻ em", type: DepartmentType.clinical, roomId: null },
        { id: 5, code: "SAN", name: "Khoa Sản", description: "Khám và chăm sóc sản khoa", type: DepartmentType.clinical, roomId: null },
        { id: 6, code: "DA-LIEU", name: "Khoa Da liễu", description: "Khám và điều trị da liễu", type: DepartmentType.clinical, roomId: null },
        { id: 7, code: "XET-NGHIEM", name: "Khoa Xét nghiệm", description: "Xét nghiệm máu, nước tiểu", type: DepartmentType.paraclinical, roomId: "room-B-101" },
        { id: 8, code: "CDHA", name: "Khoa Chẩn đoán hình ảnh", description: "X-quang, siêu âm, CT, MRI", type: DepartmentType.paraclinical, roomId: "room-B-102" },
        { id: 9, code: "DUOC", name: "Khoa Dược", description: "Quản lý và cấp phát thuốc", type: DepartmentType.paraclinical, roomId: "room-B-201" },
        { id: 10, code: "HANH-CHINH", name: "Phòng Hành chính", description: "Quản lý hành chính bệnh viện", type: DepartmentType.administrative, roomId: "room-C-101" },
        { id: 11, code: "KE-TOAN", name: "Phòng Kế toán", description: "Quản lý tài chính, hóa đơn", type: DepartmentType.administrative, roomId: null },
    ];

    for (const d of departmentsData) {
        await prisma.department.upsert({
            where: { id: d.id },
            update: {},
            create: d
        });
    }

    // Prepare password
    const adminPass = await hashPassword("Admin@123");
    const doctorPass = await hashPassword("Doctor@123");
    const patientPass = await hashPassword("Patient@123");

    console.log('Seeding users (admin)...');
    
    // Address for Admin
    const addrAdmin = await prisma.address.upsert({
        where: { id: "addr-admin001" },
        update: {},
        create: { id: "addr-admin001", detail: "456 Nguyễn Văn Cừ", ward: "Phường 4", district: "Quận 5", city: "Hồ Chí Minh", country: "Việt Nam" }
    });

    await prisma.user.upsert({
        where: { username: "admin001" },
        update: {},
        create: {
            id: "user-admin-1", username: "admin001", email: "admin@hospital.vn", password: adminPass, gender: UserGender.male, roleId: 2, addressId: addrAdmin.id,
            name: { create: { firstName: "Admin", lastName: "Hệ Thống" } },
            authentication: { create: { isVerified: true } },
            staff: { create: { staffId: "ADM_SEED", departmentId: 10, position: "Quản trị viên", joinTime: new Date("2024-01-01") } }
        }
    });

    console.log('Seeding users (doctors)...');
    
    // Bác sĩ 1
    const addrDoc1 = await prisma.address.upsert({
        where: { id: "addr-doc1" },
        update: {},
        create: { id: "addr-doc1", detail: "789 Lý Thái Tổ", ward: "Phường 10", district: "Quận 10", city: "Hồ Chí Minh", country: "Việt Nam" }
    });

    await prisma.user.upsert({
        where: { username: "doctor001" },
        update: {},
        create: {
            id: "user-doc-1", username: "doctor001", email: "bs.nguyenvana@hospital.vn", password: doctorPass, gender: UserGender.male, roleId: 3, addressId: addrDoc1.id,
            name: { create: { firstName: "Nguyễn Văn", lastName: "A" } },
            authentication: { create: { isVerified: true } },
            staff: { 
                create: { 
                    staffId: "DOC_SEED1", departmentId: 1, position: "Bác sĩ", joinTime: new Date("2020-06-15"),
                    doctor: { create: { specialization: "Nội tổng quát", licenseNumber: "BS-001234", experienceYears: 10, level: "Thạc sĩ" } }
                } 
            }
        }
    });

    // Bác sĩ 2
    const addrDoc2 = await prisma.address.upsert({
        where: { id: "addr-doc2" },
        update: {},
        create: { id: "addr-doc2", detail: "12 Võ Văn Tần", ward: "Phường 6", district: "Quận 3", city: "Hồ Chí Minh", country: "Việt Nam" }
    });

    await prisma.user.upsert({
        where: { username: "doctor002" },
        update: {},
        create: {
            id: "user-doc-2", username: "doctor002", email: "bs.tranthib@hospital.vn", password: doctorPass, gender: UserGender.female, roleId: 3, addressId: addrDoc2.id,
            name: { create: { firstName: "Trần Thị", lastName: "B" } },
            authentication: { create: { isVerified: true } },
            staff: { 
                create: { 
                    staffId: "DOC_SEED2", departmentId: 3, position: "Bác sĩ", joinTime: new Date("2018-05-20"),
                    doctor: { create: { specialization: "Tim mạch", licenseNumber: "BS-005678", experienceYears: 15, level: "Tiến sĩ" } }
                } 
            }
        }
    });

    // Bác sĩ 3
    const addrDoc3 = await prisma.address.upsert({
        where: { id: "addr-doc3" },
        update: {},
        create: { id: "addr-doc3", detail: "45 Lê Lợi", ward: "Bến Nghé", district: "Quận 1", city: "Hồ Chí Minh", country: "Việt Nam" }
    });

    await prisma.user.upsert({
        where: { username: "doctor003" },
        update: {},
        create: {
            id: "user-doc-3", username: "doctor003", email: "bs.levanc@hospital.vn", password: doctorPass, gender: UserGender.male, roleId: 3, addressId: addrDoc3.id,
            name: { create: { firstName: "Lê Văn", lastName: "C" } },
            authentication: { create: { isVerified: true } },
            staff: { 
                create: { 
                    staffId: "DOC_SEED3", departmentId: 4, position: "Bác sĩ", joinTime: new Date("2021-08-10"),
                    doctor: { create: { specialization: "Nhi khoa", licenseNumber: "BS-009012", experienceYears: 8, level: "Bác sĩ chuyên khoa II" } }
                } 
            }
        }
    });

    console.log('Seeding patients/pharmacists/accountants...');
    
    // Bệnh nhân
    const addrPat = await prisma.address.upsert({
        where: { id: "addr-pat1" },
        update: {},
        create: { id: "addr-pat1", detail: "102 Điện Biên Phủ", ward: "Phường 22", district: "Bình Thạnh", city: "Hồ Chí Minh", country: "Việt Nam" }
    });

    await prisma.user.upsert({
        where: { username: "patient001" },
        update: {},
        create: {
            id: "user-pat-1", username: "patient001", email: "benhnhan1@gmail.com", password: patientPass, gender: UserGender.female, roleId: 1, addressId: addrPat.id,
            name: { create: { firstName: "Phạm Thị", lastName: "D" } },
            authentication: { create: { isVerified: true } },
            patient: { 
                create: { 
                    patientId: "PAT_SEED1",
                    ehr: { create: {} }
                } 
            }
        }
    });

    // Dược sĩ
    const addrPharm = await prisma.address.upsert({
        where: { id: "addr-pharm1" },
        update: {},
        create: { id: "addr-pharm1", detail: "111 Đinh Tiên Hoàng", ward: "Đa Kao", district: "Quận 1", city: "Hồ Chí Minh", country: "Việt Nam" }
    });

    await prisma.user.upsert({
        where: { username: "pharmacist001" },
        update: {},
        create: {
            id: "user-pharm-1", username: "pharmacist001", email: "duocsi1@hospital.vn", password: doctorPass, gender: UserGender.male, roleId: 4, addressId: addrPharm.id,
            name: { create: { firstName: "Võ Văn", lastName: "E" } },
            authentication: { create: { isVerified: true } },
            staff: { create: { staffId: "PHA_SEED", departmentId: 9, position: "Dược sĩ", joinTime: new Date("2022-02-15") } }
        }
    });

    // Kế toán
    const addrAcc = await prisma.address.upsert({
        where: { id: "addr-acc1" },
        update: {},
        create: { id: "addr-acc1", detail: "222 Hùng Vương", ward: "Phường 9", district: "Quận 5", city: "Hồ Chí Minh", country: "Việt Nam" }
    });

    await prisma.user.upsert({
        where: { username: "accountant001" },
        update: {},
        create: {
            id: "user-acc-1", username: "accountant001", email: "ketoan1@hospital.vn", password: doctorPass, gender: UserGender.female, roleId: 5, addressId: addrAcc.id,
            name: { create: { firstName: "Hoàng Thị", lastName: "F" } },
            authentication: { create: { isVerified: true } },
            staff: { create: { staffId: "ACC_SEED", departmentId: 11, position: "Kế toán viên", joinTime: new Date("2020-11-20") } }
        }
    });

    console.log('Seeding medical services...');
    const medServices = [
        { id: "med-1", name: "Khám tổng quát", departmentId: 1, price: 200000, durationMinutes: 30, unit: "lần", percentApplyHealthInsurance: 80 },
        { id: "med-2", name: "Khám tim mạch", departmentId: 3, price: 350000, durationMinutes: 45, unit: "lần", percentApplyHealthInsurance: 70 },
        { id: "med-3", name: "Khám nhi khoa", departmentId: 4, price: 250000, durationMinutes: 30, unit: "lần", percentApplyHealthInsurance: 80 },
        { id: "med-4", name: "Khám sản khoa", departmentId: 5, price: 300000, durationMinutes: 40, unit: "lần", percentApplyHealthInsurance: 70 },
        { id: "med-5", name: "Khám da liễu", departmentId: 6, price: 250000, durationMinutes: 30, unit: "lần", percentApplyHealthInsurance: 50 },
        { id: "med-6", name: "Xét nghiệm máu tổng quát", departmentId: 7, price: 150000, durationMinutes: 15, unit: "lần", percentApplyHealthInsurance: 90 },
        { id: "med-7", name: "Xét nghiệm nước tiểu", departmentId: 7, price: 100000, durationMinutes: 10, unit: "lần", percentApplyHealthInsurance: 90 },
        { id: "med-8", name: "Chụp X-quang", departmentId: 8, price: 200000, durationMinutes: 20, unit: "lần", percentApplyHealthInsurance: 80 },
        { id: "med-9", name: "Siêu âm tổng quát", departmentId: 8, price: 250000, durationMinutes: 30, unit: "lần", percentApplyHealthInsurance: 70 },
        { id: "med-10", name: "Chụp CT Scanner", departmentId: 8, price: 1500000, durationMinutes: 45, unit: "lần", percentApplyHealthInsurance: 60 }
    ];

    for (const ms of medServices) {
        await prisma.medicalService.upsert({
            where: { id: ms.id },
            update: {},
            create: ms
        });
    }

    console.log('Seeding doctor services...');
    // BS 1 - Khám tổng quát
    await prisma.doctorService.upsert({
        where: { doctorId_medicalServiceId: { doctorId: "user-doc-1", medicalServiceId: "med-1" } },
        update: {},
        create: { doctorId: "user-doc-1", medicalServiceId: "med-1", price: 250000, durationMinutes: 30, isActive: true }
    });
    // BS 2 - Khám tim mạch
    await prisma.doctorService.upsert({
        where: { doctorId_medicalServiceId: { doctorId: "user-doc-2", medicalServiceId: "med-2" } },
        update: {},
        create: { doctorId: "user-doc-2", medicalServiceId: "med-2", price: 400000, durationMinutes: 45, isActive: true }
    });
    // BS 3 - Khám nhi khoa
    await prisma.doctorService.upsert({
        where: { doctorId_medicalServiceId: { doctorId: "user-doc-3", medicalServiceId: "med-3" } },
        update: {},
        create: { doctorId: "user-doc-3", medicalServiceId: "med-3", price: 300000, durationMinutes: 30, isActive: true }
    });

    console.log('Seeding categories...');
    const catTotal = await prisma.category.upsert({
        where: { slug: "suc-khoe-tong-quat" },
        update: {},
        create: { name: "Sức khỏe tổng quát", slug: "suc-khoe-tong-quat", description: "Kiến thức sức khỏe chung" }
    });
    await prisma.category.upsert({
        where: { slug: "dinh-duong" },
        update: {},
        create: { name: "Dinh dưỡng", slug: "dinh-duong", description: "Chế độ ăn uống khoa học" }
    });
    await prisma.category.upsert({
        where: { slug: "tim-mach" },
        update: {},
        create: { name: "Tim mạch", slug: "tim-mach", description: "Sức khỏe tim mạch", parentId: catTotal.id }
    });
    await prisma.category.upsert({
        where: { slug: "nhi-khoa" },
        update: {},
        create: { name: "Nhi khoa", slug: "nhi-khoa", description: "Sức khỏe trẻ em", parentId: catTotal.id }
    });
    await prisma.category.upsert({
        where: { slug: "san-phu-khoa" },
        update: {},
        create: { name: "Sản phụ khoa", slug: "san-phu-khoa", description: "Sức khỏe phụ nữ và thai kỳ", parentId: catTotal.id }
    });
    await prisma.category.upsert({
        where: { slug: "the-duc-the-thao" },
        update: {},
        create: { name: "Thể dục thể thao", slug: "the-duc-the-thao", description: "Vận động và sức khỏe" }
    });

    console.log('Seeding medicines...');
    const medicinesData = [
        { id: "med-pill-1", name: "Paracetamol 500mg", genericName: "Paracetamol", brandName: "Panadol", category: "Giảm đau, hạ sốt", form: "Viên nén", dosage: "500mg", unit: "viên", price: 2000, stock: 5000, manufacturer: "GSK", country: "Anh", description: "Thuốc giảm đau hạ sốt" },
        { id: "med-pill-2", name: "Amoxicillin 500mg", genericName: "Amoxicillin", brandName: "Amoxil", category: "Kháng sinh", form: "Viên nang", dosage: "500mg", unit: "viên", price: 5000, stock: 3000, manufacturer: "Hậu Giang", country: "Việt Nam", description: "Thuốc kháng sinh" },
        { id: "med-pill-3", name: "Omeprazole 20mg", genericName: "Omeprazole", brandName: "Losec", category: "Tiêu hóa", form: "Viên nang", dosage: "20mg", unit: "viên", price: 3000, stock: 2000, manufacturer: "AstraZeneca", country: "Anh", description: "Thuốc trị trào ngược dạ dày" },
        { id: "med-pill-4", name: "Metformin 500mg", genericName: "Metformin", brandName: "Glucophage", category: "Tiểu đường", form: "Viên nén", dosage: "500mg", unit: "viên", price: 4000, stock: 2500, manufacturer: "Merck", country: "Đức", description: "Thuốc tiểu đường" },
        { id: "med-pill-5", name: "Amlodipine 5mg", genericName: "Amlodipine", brandName: "Norvasc", category: "Huyết áp", form: "Viên nén", dosage: "5mg", unit: "viên", price: 6000, stock: 2000, manufacturer: "Pfizer", country: "Mỹ", description: "Thuốc huyết áp" },
        { id: "med-pill-6", name: "Ibuprofen 400mg", genericName: "Ibuprofen", brandName: "Brufen", category: "Giảm đau, kháng viêm", form: "Viên nén", dosage: "400mg", unit: "viên", price: 3000, stock: 4000, manufacturer: "Abbott", country: "Mỹ", description: "Kháng viêm không steroid" },
        { id: "med-pill-7", name: "Cetirizine 10mg", genericName: "Cetirizine", brandName: "Zyrtec", category: "Dị ứng", form: "Viên nén", dosage: "10mg", unit: "viên", price: 2500, stock: 3000, manufacturer: "GSK", country: "Anh", description: "Thuốc trị dị ứng" },
        { id: "med-pill-8", name: "Vitamin C 1000mg", genericName: "Acid Ascorbic", brandName: "Cebion", category: "Vitamin", form: "Viên sủi", dosage: "1000mg", unit: "viên", price: 8000, stock: 5000, manufacturer: "Merck", country: "Đức", description: "Bổ sung vitamin C" }
    ];

    for (const med of medicinesData) {
        await prisma.medicine.upsert({
            where: { id: med.id },
            update: {},
            create: med
        });
    }

    console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
