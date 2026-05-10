import medicineService from '@src/services/medicineService';

/**
 * Lớp kiểm thử (Unit Test Script) cho medicineService.ts
 * Nhắm đến: getAllMedicines
 */
describe('Medicine Service Tests', () => {
    // Test Case ID: TC-MED-01
    // Lớp kiểm thử: MedicineService
    // Hàm kiểm thử: getAllMedicines
    // Mục đích: Lấy danh sách thuốc thành công
    // Input: query = { page: "1", limit: "10" }
    // Output dự kiến: Object { data: [...] } với mảng data
    it('TC-MED-01: Should return list of medicines', async () => {
        const query = { page: '1', limit: '10' };
        const result = await medicineService.getAllMedicines(query);
        expect(result).toHaveProperty('data');
        expect(Array.isArray(result.data)).toBe(true);
    });

    // Test Case ID: TC-MED-02
    // Lớp kiểm thử: MedicineService
    // Hàm kiểm thử: getAllMedicines
    // Mục đích: Phân trang hoạt động đúng
    // Input: query = { page: "1", limit: "2" }
    // Output dự kiến: data.length <= 2
    it('TC-MED-02: Should respect pagination limit', async () => {
        const query = { page: '1', limit: '2' };
        const result = await medicineService.getAllMedicines(query);
        expect(result.data.length).toBeLessThanOrEqual(2);
    });

    // Test Case ID: TC-MED-03
    // Lớp kiểm thử: MedicineService
    // Hàm kiểm thử: getAllMedicines
    // Mục đích: Trả về rỗng khi không có dữ liệu ở trang cao
    // Input: query = { page: "9999", limit: "10" }
    // Output dự kiến: data.length === 0
    it('TC-MED-03: Should return empty data for high page number', async () => {
        const query = { page: '9999', limit: '10' };
        const result = await medicineService.getAllMedicines(query);
        expect(result.data.length).toBe(0);
    });
});
