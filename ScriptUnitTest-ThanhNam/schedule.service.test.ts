import scheduleService, {
    completePastSchedules,
} from '@src/services/schedule.service';
import {
    getListSchedules,
    getScheduleById,
    createSchedule,
    updateSchedule,
    deleteSchedule,
    getListSchedulesAdmin,
    setScheduleStatus,
} from '@src/daos/schedule.dao';
import { createQueryBuilder } from '@src/helpers/queryBuilder';
import { CustomError, ErrorType } from '@src/core/Error';
import prisma from '@src/config/prisma';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
jest.mock('@src/daos/schedule.dao');
jest.mock('@src/helpers/queryBuilder', () => ({
    createQueryBuilder: jest.fn(),
}));
jest.mock('@src/config/prisma', () => ({
    __esModule: true,
    default: { schedule: { findMany: jest.fn() } },
}));

// ---------------------------------------------------------------------------
// Typed helpers
// ---------------------------------------------------------------------------
const mockedGetListSchedulesAdmin = getListSchedulesAdmin as jest.Mock;
const mockedGetListSchedules      = getListSchedules      as jest.Mock;
const mockedGetScheduleById       = getScheduleById       as jest.Mock;
const mockedCreateSchedule        = createSchedule        as jest.Mock;
const mockedUpdateSchedule        = updateSchedule        as jest.Mock;
const mockedDeleteSchedule        = deleteSchedule        as jest.Mock;
const mockedSetScheduleStatus     = setScheduleStatus     as jest.Mock;
const mockedScheduleFindMany      = prisma.schedule.findMany as jest.Mock;
const mockedCreateQueryBuilder    = createQueryBuilder    as jest.Mock;

const mockStaffFindUnique = jest.fn();

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------
const SCHEDULE_ID = 'schedule-uuid-001';
const STAFF_ID    = 'staff-uuid-001';
const OTHER_ID    = 'other-uuid-999';

const mockSchedule = {
    id: SCHEDULE_ID,
    staffId: STAFF_ID,
    departmentId: 1,
    type: 'work',
    roomId: 'room-001',
    date: new Date('2025-01-10'),
    status: 'pending',
    startTime: new Date('2025-01-10T08:00:00Z'),
    endTime:   new Date('2025-01-10T12:00:00Z'),
    maxSlot: 10,
};

const defaultQuery = { page: '1', limit: '10' };

const validCreateData = {
    staffId: STAFF_ID,
    departmentId: 1,
    type: 'work' as const,
    roomId: 'room-001',
    date: '2025-01-10',
    status: 'pending' as const,
    startTime: '2025-01-10T08:00:00.000Z',
    endTime:   '2025-01-10T12:00:00.000Z',
};

const validUpdateData = {
    id: SCHEDULE_ID,
    type: 'duty' as const,
};

// ---------------------------------------------------------------------------
beforeEach(() => {
    jest.clearAllMocks();
    mockedCreateQueryBuilder.mockImplementation(() => ({
        findUnique: mockStaffFindUnique,
    }));
});

// ===========================================================================
describe('scheduleService', () => {

    // =========================================================================
    // 1. getSchedulesAdmin
    // =========================================================================
    describe('getSchedulesAdmin', () => {
        it('nên trả về danh sách lịch khi tìm thấy', async () => {
            const mockResult = { data: [mockSchedule], total: 1 };
            mockedGetListSchedulesAdmin.mockResolvedValue(mockResult);

            const result = await scheduleService.getSchedulesAdmin(defaultQuery);
            expect(mockedGetListSchedulesAdmin).toHaveBeenCalledWith(defaultQuery);
            expect(result).toEqual(mockResult);
        });

        it('nên ném NOT_FOUND khi parsedQuery là null/falsy', async () => {
            mockedGetListSchedulesAdmin.mockResolvedValue(null);

            await expect(scheduleService.getSchedulesAdmin(defaultQuery))
                .rejects.toMatchObject({ type: ErrorType.NOT_FOUND });
        });
    });

    // =========================================================================
    // 2. getSchedules
    // =========================================================================
    describe('getSchedules', () => {
        it('nên trả về lịch của nhân viên khi hợp lệ', async () => {
            const mockResult = { data: [mockSchedule], total: 1 };
            mockStaffFindUnique.mockResolvedValue({ id: STAFF_ID });
            mockedGetListSchedules.mockResolvedValue(mockResult);

            const result = await scheduleService.getSchedules(defaultQuery, STAFF_ID);
            expect(mockStaffFindUnique).toHaveBeenCalledWith({ userId: STAFF_ID });
            expect(mockedGetListSchedules).toHaveBeenCalledWith(defaultQuery, STAFF_ID);
            expect(result).toEqual(mockResult);
        });

        it('nên ném NOT_FOUND khi nhân viên không tồn tại', async () => {
            mockStaffFindUnique.mockResolvedValue(null);

            await expect(scheduleService.getSchedules(defaultQuery, STAFF_ID))
                .rejects.toMatchObject({
                    type: ErrorType.NOT_FOUND,
                    message: 'Nhân viên không tồn tại',
                });
        });
    });

    // =========================================================================
    // 3. getScheduleByIdService
    // =========================================================================
    describe('getScheduleByIdService', () => {
        it('nên trả về lịch khi tìm thấy theo id', async () => {
            mockedGetScheduleById.mockResolvedValue(mockSchedule);

            const result = await scheduleService.getScheduleByIdService(SCHEDULE_ID);
            expect(mockedGetScheduleById).toHaveBeenCalledWith(SCHEDULE_ID);
            expect(result).toEqual(mockSchedule);
        });

        it('nên ném NOT_FOUND khi lịch không tồn tại', async () => {
            mockedGetScheduleById.mockResolvedValue(null);

            await expect(scheduleService.getScheduleByIdService(SCHEDULE_ID))
                .rejects.toMatchObject({
                    type: ErrorType.NOT_FOUND,
                    message: 'Lịch làm việc không tồn tại',
                });
        });
    });

    // =========================================================================
    // 4. createScheduleService  (mutating – rollback)
    // =========================================================================
    describe('createScheduleService', () => {
        let createdScheduleId: string | null = null;
        afterEach(() => { createdScheduleId = null; });

        it('nên tạo lịch thành công khi nhân viên tồn tại', async () => {
            mockStaffFindUnique.mockResolvedValue({ id: STAFF_ID });
            mockedCreateSchedule.mockImplementation(async () => {
                createdScheduleId = SCHEDULE_ID;
                return mockSchedule;
            });

            const result = await scheduleService.createScheduleService(validCreateData);
            expect(mockedCreateSchedule).toHaveBeenCalledWith(validCreateData);
            expect(result).toEqual(mockSchedule);
            // Rollback marker
            expect(createdScheduleId).toBe(SCHEDULE_ID);
        });

        it('nên ném NOT_FOUND khi staffId không tồn tại', async () => {
            mockStaffFindUnique.mockResolvedValue(null);

            await expect(scheduleService.createScheduleService(validCreateData))
                .rejects.toMatchObject({
                    type: ErrorType.NOT_FOUND,
                    message: 'Nhân viên không tồn tại',
                });
            expect(mockedCreateSchedule).not.toHaveBeenCalled();
        });
    });

    // =========================================================================
    // 5. updateScheduleService  (mutating – rollback)
    // =========================================================================
    describe('updateScheduleService', () => {
        let snapshotBefore: typeof mockSchedule;
        beforeEach(() => { snapshotBefore = { ...mockSchedule }; });
        afterEach(() => { Object.assign(mockSchedule, snapshotBefore); });

        it('nên cập nhật lịch thành công khi là chính nhân viên đó', async () => {
            const updated = { ...mockSchedule, type: 'duty' };
            mockedGetScheduleById.mockResolvedValue(mockSchedule);
            mockedUpdateSchedule.mockImplementation(async () => {
                mockSchedule.type = 'duty';
                return updated;
            });

            const result = await scheduleService.updateScheduleService(validUpdateData, STAFF_ID);
            expect(mockedUpdateSchedule).toHaveBeenCalledWith(SCHEDULE_ID, validUpdateData);
            expect(result).toEqual(updated);

            // Rollback
            Object.assign(mockSchedule, snapshotBefore);
        });

        it('nên ném NOT_FOUND khi lịch không tồn tại', async () => {
            mockedGetScheduleById.mockResolvedValue(null);

            await expect(scheduleService.updateScheduleService(validUpdateData, STAFF_ID))
                .rejects.toMatchObject({
                    type: ErrorType.NOT_FOUND,
                    message: 'Lịch làm việc không tồn tại',
                });
            expect(mockedUpdateSchedule).not.toHaveBeenCalled();
        });

        it('nên ném FORBIDDEN khi userId không phải chủ lịch', async () => {
            mockedGetScheduleById.mockResolvedValue(mockSchedule); // staffId = STAFF_ID

            await expect(scheduleService.updateScheduleService(validUpdateData, OTHER_ID))
                .rejects.toMatchObject({
                    type: ErrorType.FORBIDDEN,
                    message: 'Bạn không có quyền sửa lịch làm việc này',
                });
            expect(mockedUpdateSchedule).not.toHaveBeenCalled();
        });
    });

    // =========================================================================
    // 6. deleteScheduleService  (mutating – rollback)
    // =========================================================================
    describe('deleteScheduleService', () => {
        let deletedId: string | null = null;
        afterEach(() => { deletedId = null; });

        it('nên xóa lịch thành công khi là chủ lịch', async () => {
            mockedGetScheduleById.mockResolvedValue(mockSchedule);
            mockedDeleteSchedule.mockImplementation(async (id) => {
                deletedId = id; // ghi nhận để rollback
                return mockSchedule;
            });

            const result = await scheduleService.deleteScheduleService(SCHEDULE_ID, STAFF_ID);
            expect(mockedDeleteSchedule).toHaveBeenCalledWith(SCHEDULE_ID);
            expect(result).toEqual(mockSchedule);
            // Rollback marker
            expect(deletedId).toBe(SCHEDULE_ID);
        });

        it('nên ném NOT_FOUND khi lịch không tồn tại', async () => {
            mockedGetScheduleById.mockResolvedValue(null);

            await expect(scheduleService.deleteScheduleService(SCHEDULE_ID, STAFF_ID))
                .rejects.toMatchObject({ type: ErrorType.NOT_FOUND });
            expect(deletedId).toBeNull();
        });

        it('nên ném FORBIDDEN khi userId không phải chủ lịch', async () => {
            mockedGetScheduleById.mockResolvedValue(mockSchedule);

            await expect(scheduleService.deleteScheduleService(SCHEDULE_ID, OTHER_ID))
                .rejects.toMatchObject({
                    type: ErrorType.FORBIDDEN,
                    message: 'Bạn không có quyền xóa lịch làm việc này',
                });
            expect(mockedDeleteSchedule).not.toHaveBeenCalled();
        });
    });

    // =========================================================================
    // 7. approveScheduleAdmin  (mutating – rollback)
    // =========================================================================
    describe('approveScheduleAdmin', () => {
        let snapshotStatus: string;
        beforeEach(() => { snapshotStatus = mockSchedule.status; });
        afterEach(() => { mockSchedule.status = snapshotStatus; });

        it('nên duyệt lịch thành confirmed thành công', async () => {
            const updated = { ...mockSchedule, status: 'confirmed' };
            mockedGetScheduleById.mockResolvedValue(mockSchedule);
            mockedSetScheduleStatus.mockImplementation(async () => {
                mockSchedule.status = 'confirmed';
                return updated;
            });

            const result = await scheduleService.approveScheduleAdmin(
                SCHEDULE_ID, 'confirmed'
            );
            expect(mockedSetScheduleStatus).toHaveBeenCalledWith(SCHEDULE_ID, 'confirmed');
            expect(result.status).toBe('confirmed');

            // Rollback
            mockSchedule.status = snapshotStatus;
        });

        it('nên ném NOT_FOUND khi lịch không tồn tại', async () => {
            mockedGetScheduleById.mockResolvedValue(null);

            await expect(scheduleService.approveScheduleAdmin(SCHEDULE_ID, 'confirmed'))
                .rejects.toMatchObject({ type: ErrorType.NOT_FOUND });
            expect(mockedSetScheduleStatus).not.toHaveBeenCalled();
        });
    });

    // =========================================================================
    // 8. completePastSchedules (export riêng)
    // =========================================================================
    describe('completePastSchedules', () => {
        it('nên xử lý và mark completed các lịch đã qua', async () => {
            const pastEndTime = new Date(Date.now() - 60 * 60 * 1000); // 1h trước
            const pastSchedule = {
                id: 'past-schedule-1',
                date: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2h trước
                startTime: new Date(Date.now() - 3 * 60 * 60 * 1000),
                endTime: pastEndTime,
                status: 'confirmed',
            };

            mockedScheduleFindMany.mockResolvedValue([pastSchedule]);
            mockedSetScheduleStatus.mockResolvedValue({ ...pastSchedule, status: 'completed' });

            const result = await completePastSchedules();
            expect(result.processed).toBe(1);
            expect(result.updated).toBe(1);
            expect(mockedSetScheduleStatus).toHaveBeenCalledWith(
                'past-schedule-1', 'completed'
            );
        });

        it('nên KHÔNG mark completed khi lịch chưa kết thúc', async () => {
            // endTime cần đủ xa trong tương lai (>10h) để sau khi
            // computeScheduleEndDatetime chuyển timezone vẫn là tương lai.
            const futureSchedule = {
                id: 'future-schedule-1',
                date: new Date(),
                startTime: new Date(Date.now() + 8 * 60 * 60 * 1000),
                endTime:   new Date(Date.now() + 10 * 60 * 60 * 1000), // 10h nữa
                status: 'confirmed',
            };

            mockedScheduleFindMany.mockResolvedValue([futureSchedule]);

            const result = await completePastSchedules();
            expect(result.processed).toBe(1);
            expect(result.updated).toBe(0);
            expect(mockedSetScheduleStatus).not.toHaveBeenCalled();
        });

        it('nên trả về processed=0 khi không có lịch nào', async () => {
            mockedScheduleFindMany.mockResolvedValue([]);

            const result = await completePastSchedules();
            expect(result.processed).toBe(0);
            expect(result.updated).toBe(0);
        });

        it('nên tiếp tục xử lý các lịch khác khi một lịch bị lỗi', async () => {
            const badSchedule = {
                id: 'bad-1',
                date: 'INVALID_DATE',
                startTime: 'INVALID',
                endTime: 'INVALID',
                status: 'confirmed',
            };
            const goodSchedule = {
                id: 'good-1',
                date: new Date(Date.now() - 2 * 60 * 60 * 1000),
                startTime: new Date(Date.now() - 3 * 60 * 60 * 1000),
                endTime: new Date(Date.now() - 60 * 60 * 1000),
                status: 'confirmed',
            };

            mockedScheduleFindMany.mockResolvedValue([badSchedule, goodSchedule]);
            mockedSetScheduleStatus.mockResolvedValue({ ...goodSchedule, status: 'completed' });

            const result = await completePastSchedules();
            // processed = 2, nhưng bad schedule bị error nên chỉ good được update
            expect(result.processed).toBe(2);
        });
    });
});
