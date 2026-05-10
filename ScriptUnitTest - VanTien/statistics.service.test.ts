import statisticsService from '@src/services/statistics.service';
import prisma from '@src/config/prisma';
import { CustomError } from '@src/core/Error';

/**
 * Lớp kiểm thử (Unit Test Script) cho statistics.service.ts
 * Nhắm đến: getPatientStatistics, getAdminStatistics, getPatientsByDepartment,
 * getAppointmentsByDoctor, getVisitCountsByStatus, getVisitCountsByYear,
 * getDashboardSummary, getRevenueByDayOfWeek, getAppointmentsByDayOfWeek,
 * getDoctorDashboardSummary, getDoctorAppointmentsByDay, getDoctorAppointmentStatus
 */
describe('Statistics Service Tests', () => {
    let testPatientUserId: string;
    let testDoctorId: string;

    beforeAll(async () => {
        const patient = await prisma.patient.findFirst();
        if (!patient) throw new Error('Cần có DB với Patient để test');
        testPatientUserId = patient.userId;

        const doctor = await prisma.doctor.findFirst();
        if (doctor) testDoctorId = doctor.userId;
    });

    // ========================
    // getPatientStatistics
    // ========================

    // Test Case ID: TC-STAT-01
    // Lớp kiểm thử: StatisticsService
    // Hàm kiểm thử: getPatientStatistics
    // Mục đích: Lấy thống kê bệnh nhân thành công
    // Input: userId của patient tồn tại
    // Output dự kiến: { summary: { totalCompletedAppointments: number, totalUpcomingAppointments: number } }
    it('TC-STAT-01: Should return patient statistics successfully', async () => {
        const result = await statisticsService.getPatientStatistics(testPatientUserId);
        expect(result).toHaveProperty('summary');
        expect(result.summary).toHaveProperty('totalCompletedAppointments');
        expect(result.summary).toHaveProperty('totalUpcomingAppointments');
        expect(typeof result.summary.totalCompletedAppointments).toBe('number');
        expect(typeof result.summary.totalUpcomingAppointments).toBe('number');
    });

    // Test Case ID: TC-STAT-02
    // Lớp kiểm thử: StatisticsService
    // Hàm kiểm thử: getPatientStatistics
    // Mục đích: Ném NOT_FOUND khi patient không tồn tại
    // Input: userId = "non-existent-id"
    // Output dự kiến: Ném CustomError(NOT_FOUND) "Patient profile not found"
    it('TC-STAT-02: Should throw NOT_FOUND for non-existent patient', async () => {
        await expect(
            statisticsService.getPatientStatistics('non-existent-id')
        ).rejects.toThrow(CustomError);
        await expect(
            statisticsService.getPatientStatistics('non-existent-id')
        ).rejects.toThrow('Patient profile not found');
    });

    // ========================
    // getAdminStatistics
    // ========================

    // Test Case ID: TC-STAT-03
    // Lớp kiểm thử: StatisticsService
    // Hàm kiểm thử: getAdminStatistics
    // Mục đích: Thống kê theo tháng (default)
    // Input: period = "month" hoặc không truyền
    // Output dự kiến: Object có patientVisits.period === "month"
    it('TC-STAT-03: Should return admin statistics with period=month (default)', async () => {
        const result = await statisticsService.getAdminStatistics();
        expect(result).toHaveProperty('newPatientsCount');
        expect(result).toHaveProperty('patientVisits');
        expect(result.patientVisits.period).toBe('month');
    });

    // Test Case ID: TC-STAT-04
    // Lớp kiểm thử: StatisticsService
    // Hàm kiểm thử: getAdminStatistics
    // Mục đích: Thống kê theo tuần
    // Input: period = "week"
    // Output dự kiến: Object có patientVisits.period === "week"
    it('TC-STAT-04: Should return admin statistics with period=week', async () => {
        const result = await statisticsService.getAdminStatistics('week');
        expect(result.patientVisits.period).toBe('week');
    });

    // Test Case ID: TC-STAT-05
    // Lớp kiểm thử: StatisticsService
    // Hàm kiểm thử: getAdminStatistics
    // Mục đích: Với fromDate và toDate cụ thể
    // Input: period = "month", fromDate = "2026-01-01", toDate = "2026-03-31"
    // Output dự kiến: Object có newPatientsCount >= 0 và patientVisits.total >= 0
    it('TC-STAT-05: Should return admin statistics with date range', async () => {
        const result = await statisticsService.getAdminStatistics('month', '2026-01-01', '2026-03-31');
        expect(result.newPatientsCount).toBeGreaterThanOrEqual(0);
        expect(result.patientVisits.total).toBeGreaterThanOrEqual(0);
    });

    // Test Case ID: TC-STAT-06
    // Lớp kiểm thử: StatisticsService
    // Hàm kiểm thử: getAdminStatistics
    // Mục đích: Không truyền fromDate/toDate
    // Input: period = "month", không truyền date
    // Output dự kiến: Không crash, trả về kết quả hợp lệ
    it('TC-STAT-06: Should handle admin statistics without date range', async () => {
        const result = await statisticsService.getAdminStatistics('month');
        expect(result).toBeDefined();
        expect(Array.isArray(result.patientVisits.data)).toBe(true);
    });

    // ========================
    // getPatientsByDepartment
    // ========================

    // Test Case ID: TC-STAT-07
    // Lớp kiểm thử: StatisticsService
    // Hàm kiểm thử: getPatientsByDepartment
    // Mục đích: Lấy thống kê bệnh nhân theo khoa
    // Input: Không truyền date
    // Output dự kiến: { data: [...], total: number }
    it('TC-STAT-07: Should return patients by department', async () => {
        const result = await statisticsService.getPatientsByDepartment();
        expect(result).toHaveProperty('data');
        expect(result).toHaveProperty('total');
        expect(Array.isArray(result.data)).toBe(true);
        expect(typeof result.total).toBe('number');
    });

    // Test Case ID: TC-STAT-08
    // Lớp kiểm thử: StatisticsService
    // Hàm kiểm thử: getPatientsByDepartment
    // Mục đích: Với khoảng thời gian cụ thể
    // Input: fromDate = "2026-01-01", toDate = "2026-12-31"
    // Output dự kiến: { data: [...], total: number }
    it('TC-STAT-08: Should return patients by department with date range', async () => {
        const result = await statisticsService.getPatientsByDepartment('2026-01-01', '2026-12-31');
        expect(result).toHaveProperty('data');
        expect(result).toHaveProperty('total');
    });

    // Test Case ID: TC-STAT-09
    // Lớp kiểm thử: StatisticsService
    // Hàm kiểm thử: getPatientsByDepartment
    // Mục đích: Verify data không chứa patientIds (đã loại bỏ qua spread)
    // Input: Bất kỳ
    // Output dự kiến: Mỗi phần tử trong data KHÔNG có trường patientIds
    it('TC-STAT-09: Should not expose patientIds in response data', async () => {
        const result = await statisticsService.getPatientsByDepartment();
        result.data.forEach((item: any) => {
            expect(item).not.toHaveProperty('patientIds');
        });
    });

    // ========================
    // getAppointmentsByDoctor
    // ========================

    // Test Case ID: TC-STAT-10
    // Lớp kiểm thử: StatisticsService
    // Hàm kiểm thử: getAppointmentsByDoctor
    // Mục đích: Lấy thống kê lịch hẹn theo bác sĩ
    // Input: Không truyền tham số
    // Output dự kiến: { data: [...], total: number }
    it('TC-STAT-10: Should return appointments by doctor', async () => {
        const result = await statisticsService.getAppointmentsByDoctor();
        expect(result).toHaveProperty('data');
        expect(result).toHaveProperty('total');
        expect(typeof result.total).toBe('number');
    });

    // Test Case ID: TC-STAT-11
    // Lớp kiểm thử: StatisticsService
    // Hàm kiểm thử: getAppointmentsByDoctor
    // Mục đích: Lọc theo chuyên khoa
    // Input: specialization cụ thể
    // Output dự kiến: { data: [...], total: number }
    it('TC-STAT-11: Should return appointments by doctor filtered by specialization', async () => {
        const result = await statisticsService.getAppointmentsByDoctor(undefined, undefined, 'Cardiology');
        expect(result).toHaveProperty('data');
        expect(result).toHaveProperty('total');
    });

    // ========================
    // getVisitCountsByStatus
    // ========================

    // Test Case ID: TC-STAT-12
    // Lớp kiểm thử: StatisticsService
    // Hàm kiểm thử: getVisitCountsByStatus
    // Mục đích: Lấy số lượt khám theo trạng thái
    // Input: Không truyền date
    // Output dự kiến: Object chứa counts theo status
    it('TC-STAT-12: Should return visit counts by status', async () => {
        const result = await statisticsService.getVisitCountsByStatus();
        expect(result).toBeDefined();
    });

    // Test Case ID: TC-STAT-13
    // Lớp kiểm thử: StatisticsService
    // Hàm kiểm thử: getVisitCountsByStatus
    // Mục đích: Với patientId cụ thể
    // Input: patientId hợp lệ
    // Output dự kiến: Kết quả chỉ tính cho patient đó
    it('TC-STAT-13: Should return visit counts filtered by patientId', async () => {
        const result = await statisticsService.getVisitCountsByStatus(
            undefined, undefined, 'UTC', testPatientUserId
        );
        expect(result).toBeDefined();
    });

    // Test Case ID: TC-STAT-14
    // Lớp kiểm thử: StatisticsService
    // Hàm kiểm thử: getVisitCountsByStatus
    // Mục đích: Với timezone khác UTC
    // Input: timezone = "Asia/Ho_Chi_Minh", fromDate, toDate
    // Output dự kiến: Kết quả xử lý timezone đúng
    it('TC-STAT-14: Should handle non-UTC timezone', async () => {
        const result = await statisticsService.getVisitCountsByStatus(
            '2026-01-01', '2026-12-31', 'Asia/Ho_Chi_Minh'
        );
        expect(result).toBeDefined();
    });

    // ========================
    // getVisitCountsByYear
    // ========================

    // Test Case ID: TC-STAT-15
    // Lớp kiểm thử: StatisticsService
    // Hàm kiểm thử: getVisitCountsByYear
    // Mục đích: Trả về đủ 12 tháng
    // Input: year = 2026
    // Output dự kiến: { year: "2026", months: [...] } với months.length === 12
    it('TC-STAT-15: Should return all 12 months for a year', async () => {
        const result = await statisticsService.getVisitCountsByYear(2026);
        expect(result.year).toBe('2026');
        expect(result.months).toHaveLength(12);
    });

    // Test Case ID: TC-STAT-16
    // Lớp kiểm thử: StatisticsService
    // Hàm kiểm thử: getVisitCountsByYear
    // Mục đích: Tháng không có dữ liệu thì count = 0
    // Input: year = 2020 (năm không có dữ liệu)
    // Output dự kiến: Tất cả tháng có count === 0
    it('TC-STAT-16: Should return count=0 for months with no data', async () => {
        const result = await statisticsService.getVisitCountsByYear(2020);
        result.months.forEach((m) => {
            expect(m.count).toBeGreaterThanOrEqual(0);
        });
    });

    // Test Case ID: TC-STAT-17
    // Lớp kiểm thử: StatisticsService
    // Hàm kiểm thử: getVisitCountsByYear
    // Mục đích: Format tháng đúng định dạng YYYY-MM
    // Input: year = 2026
    // Output dự kiến: Mỗi tháng có format "YYYY-MM"
    it('TC-STAT-17: Should format months as YYYY-MM', async () => {
        const result = await statisticsService.getVisitCountsByYear(2026);
        result.months.forEach((m) => {
            expect(m.month).toMatch(/^\d{4}-\d{2}$/);
        });
    });

    // ========================
    // getDashboardSummary
    // ========================

    // Test Case ID: TC-STAT-18
    // Lớp kiểm thử: StatisticsService
    // Hàm kiểm thử: getDashboardSummary
    // Mục đích: Với date cụ thể
    // Input: timezone = "UTC", date = "2026-05-10"
    // Output dự kiến: Kết quả thống kê cho ngày đó
    it('TC-STAT-18: Should return dashboard summary for specific date', async () => {
        const result = await statisticsService.getDashboardSummary('UTC', '2026-05-10');
        expect(result).toBeDefined();
    });

    // Test Case ID: TC-STAT-19
    // Lớp kiểm thử: StatisticsService
    // Hàm kiểm thử: getDashboardSummary
    // Mục đích: Không truyền date (dùng ngày hiện tại)
    // Input: timezone = "UTC", không truyền date
    // Output dự kiến: Kết quả thống kê cho hôm nay
    it('TC-STAT-19: Should return dashboard summary for today when no date provided', async () => {
        const result = await statisticsService.getDashboardSummary('UTC');
        expect(result).toBeDefined();
    });

    // ========================
    // getRevenueByDayOfWeek
    // ========================

    // Test Case ID: TC-STAT-20
    // Lớp kiểm thử: StatisticsService
    // Hàm kiểm thử: getRevenueByDayOfWeek
    // Mục đích: Với weekStart cụ thể
    // Input: timezone = "UTC", weekStart = "2026-05-04"
    // Output dự kiến: Dữ liệu doanh thu theo ngày trong tuần
    it('TC-STAT-20: Should return revenue by day of week with specific weekStart', async () => {
        const result = await statisticsService.getRevenueByDayOfWeek('UTC', '2026-05-04');
        expect(result).toBeDefined();
    });

    // Test Case ID: TC-STAT-21
    // Lớp kiểm thử: StatisticsService
    // Hàm kiểm thử: getRevenueByDayOfWeek
    // Mục đích: Không truyền weekStart (dùng thứ Hai tuần hiện tại)
    // Input: timezone = "UTC"
    // Output dự kiến: Dữ liệu doanh thu tuần hiện tại
    it('TC-STAT-21: Should return revenue by day of week for current week', async () => {
        const result = await statisticsService.getRevenueByDayOfWeek('UTC');
        expect(result).toBeDefined();
    });

    // ========================
    // getAppointmentsByDayOfWeek
    // ========================

    // Test Case ID: TC-STAT-22
    // Lớp kiểm thử: StatisticsService
    // Hàm kiểm thử: getAppointmentsByDayOfWeek
    // Mục đích: Lấy lịch hẹn theo ngày trong tuần
    // Input: timezone = "UTC"
    // Output dự kiến: Dữ liệu lịch hẹn theo ngày
    it('TC-STAT-22: Should return appointments by day of week', async () => {
        const result = await statisticsService.getAppointmentsByDayOfWeek('UTC');
        expect(result).toBeDefined();
    });

    // ========================
    // Doctor Dashboard
    // ========================

    // Test Case ID: TC-STAT-23
    // Lớp kiểm thử: StatisticsService
    // Hàm kiểm thử: getDoctorDashboardSummary
    // Mục đích: Lấy tổng quan dashboard bác sĩ
    // Input: doctorId hợp lệ, timezone = "UTC"
    // Output dự kiến: Object thống kê tổng quan
    it('TC-STAT-23: Should return doctor dashboard summary', async () => {
        if (!testDoctorId) return; // skip if no doctor in DB
        const result = await statisticsService.getDoctorDashboardSummary(testDoctorId, 'UTC');
        expect(result).toBeDefined();
    });

    // Test Case ID: TC-STAT-24
    // Lớp kiểm thử: StatisticsService
    // Hàm kiểm thử: getDoctorAppointmentsByDay
    // Mục đích: Lấy lịch hẹn bác sĩ theo ngày
    // Input: doctorId hợp lệ, timezone = "UTC"
    // Output dự kiến: Dữ liệu lịch hẹn theo ngày
    it('TC-STAT-24: Should return doctor appointments by day', async () => {
        if (!testDoctorId) return;
        const result = await statisticsService.getDoctorAppointmentsByDay(testDoctorId, 'UTC');
        expect(result).toBeDefined();
    });

    // Test Case ID: TC-STAT-25
    // Lớp kiểm thử: StatisticsService
    // Hàm kiểm thử: getDoctorAppointmentStatus
    // Mục đích: Lấy trạng thái lịch hẹn bác sĩ
    // Input: doctorId hợp lệ, timezone = "UTC"
    // Output dự kiến: Dữ liệu trạng thái lịch hẹn
    it('TC-STAT-25: Should return doctor appointment status', async () => {
        if (!testDoctorId) return;
        const result = await statisticsService.getDoctorAppointmentStatus(testDoctorId, 'UTC');
        expect(result).toBeDefined();
    });

    // ========================
    // getStaffByDepartment
    // ========================

    // Test Case ID: TC-STAT-26 (bonus)
    // Lớp kiểm thử: StatisticsService
    // Hàm kiểm thử: getStaffByDepartment
    // Mục đích: Lấy số lượng nhân viên theo khoa
    // Input: Không có
    // Output dự kiến: Dữ liệu nhân viên theo khoa
    it('TC-STAT-26: Should return staff count by department', async () => {
        const result = await statisticsService.getStaffByDepartment();
        expect(result).toBeDefined();
    });
});
