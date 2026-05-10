import roomService from '@src/services/room.service';
import {
    getBuildings,
    getRoomById,
    getRooms,
    createRoomDao,
    updateRoomDao,
    deleteRoomDao,
    getAvailableRooms,
} from '@src/daos/room.dao';
import { createQueryBuilder } from '@src/helpers/queryBuilder';
import { CustomError, ErrorType } from '@src/core/Error';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
jest.mock('@src/daos/room.dao');
jest.mock('@src/helpers/queryBuilder', () => ({
    createQueryBuilder: jest.fn(),
}));

// ---------------------------------------------------------------------------
// Typed helpers
// ---------------------------------------------------------------------------
const mockedGetBuildings     = getBuildings     as jest.Mock;
const mockedGetRooms         = getRooms         as jest.Mock;
const mockedGetRoomById      = getRoomById      as jest.Mock;
const mockedCreateRoomDao    = createRoomDao    as jest.Mock;
const mockedUpdateRoomDao    = updateRoomDao    as jest.Mock;
const mockedDeleteRoomDao    = deleteRoomDao    as jest.Mock;
const mockedGetAvailableRooms= getAvailableRooms as jest.Mock;
const mockedCreateQueryBuilder = createQueryBuilder as jest.Mock;

// Sub-mocks cho queryBuilder models
const mockBuildingFindUnique = jest.fn();
const mockRoomFindFirst      = jest.fn();

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------
const ROOM_ID      = 'room-uuid-001';
const BUILDING_ID  = 'building-uuid-001';

const mockRoom = {
    id: ROOM_ID,
    name: 'Phòng 101',
    number_room: 101,
    floor: 1,
    buildingId: BUILDING_ID,
    type: 'examination',
    status: 'not_used',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
};

const mockBuilding = { id: BUILDING_ID, name: 'Nhà A' };

const defaultPagination = {
    page: '1', limit: '10',
    sortBy: 'name' as const, sortOrder: 'asc' as const,
};

// ---------------------------------------------------------------------------
beforeEach(() => {
    jest.clearAllMocks();
    mockedCreateQueryBuilder.mockImplementation((model: string) => {
        if (model === 'building') return { findUnique: mockBuildingFindUnique };
        if (model === 'room')     return { findFirst: mockRoomFindFirst };
        return { findUnique: jest.fn(), findFirst: jest.fn() };
    });
});

// ===========================================================================
describe('roomService', () => {

    // =========================================================================
    // 1. listBuildings
    // =========================================================================
    describe('listBuildings', () => {
        it('nên trả về danh sách tòa nhà khi tìm thấy', async () => {
            const mockList = [mockBuilding];
            mockedGetBuildings.mockResolvedValue(mockList);

            const result = await roomService.listBuildings(defaultPagination);
            expect(mockedGetBuildings).toHaveBeenCalledWith(defaultPagination);
            expect(result).toEqual(mockList);
        });

        it('nên ném NOT_FOUND khi getBuildings trả về null/falsy', async () => {
            mockedGetBuildings.mockResolvedValue(null);

            await expect(roomService.listBuildings(defaultPagination))
                .rejects.toMatchObject({
                    type: ErrorType.NOT_FOUND,
                    message: 'Tòa nhà không tìm thấy',
                });
        });
    });

    // =========================================================================
    // 2. listRooms
    // =========================================================================
    describe('listRooms', () => {
        const roomQuery = { ...defaultPagination, buildingId: BUILDING_ID };

        it('nên trả về danh sách phòng khi tìm thấy', async () => {
            mockedGetRooms.mockResolvedValue({ data: [mockRoom], total: 1 });

            const result = await roomService.listRooms(roomQuery);
            expect(mockedGetRooms).toHaveBeenCalledWith(roomQuery);
            expect(result).toBeDefined();
        });

        it('nên ném NOT_FOUND khi getRooms trả về null/falsy', async () => {
            mockedGetRooms.mockResolvedValue(null);

            await expect(roomService.listRooms(roomQuery))
                .rejects.toMatchObject({
                    type: ErrorType.NOT_FOUND,
                    message: 'Phòng không tìm thấy',
                });
        });
    });

    // =========================================================================
    // 3. getRoom
    // =========================================================================
    describe('getRoom', () => {
        it('nên trả về phòng khi tìm thấy theo id', async () => {
            mockedGetRoomById.mockResolvedValue(mockRoom);

            const result = await roomService.getRoom(ROOM_ID);
            expect(mockedGetRoomById).toHaveBeenCalledWith(ROOM_ID);
            expect(result).toEqual(mockRoom);
        });

        it('nên ném NOT_FOUND khi phòng không tồn tại', async () => {
            mockedGetRoomById.mockResolvedValue(null);

            await expect(roomService.getRoom('non-existent'))
                .rejects.toMatchObject({
                    type: ErrorType.NOT_FOUND,
                    message: 'Phòng không tồn tại',
                });
        });
    });

    // =========================================================================
    // 4. availableRooms
    // =========================================================================
    describe('availableRooms', () => {
        it('nên trả về danh sách phòng trống', async () => {
            mockedGetAvailableRooms.mockResolvedValue([mockRoom]);

            const result = await roomService.availableRooms();
            expect(mockedGetAvailableRooms).toHaveBeenCalled();
            expect(result).toEqual([mockRoom]);
        });

        it('nên trả về mảng rỗng khi không có phòng nào', async () => {
            mockedGetAvailableRooms.mockResolvedValue([]);

            const result = await roomService.availableRooms();
            expect(result).toHaveLength(0);
        });
    });

    // =========================================================================
    // 5. createRoom  (mutating – rollback)
    // =========================================================================
    describe('createRoom', () => {
        const validData = {
            buildingId: BUILDING_ID,
            name: 'Phòng 101',
            numberRoom: 101,
            floor: 1,
            type: 'examination',
            status: 'not_used' as const,
        };

        let createdRoomId: string | null = null;
        afterEach(() => { createdRoomId = null; });

        it('nên tạo phòng thành công khi dữ liệu hợp lệ', async () => {
            mockBuildingFindUnique.mockResolvedValue(mockBuilding);
            mockRoomFindFirst.mockResolvedValue(null);
            mockedCreateRoomDao.mockImplementation(async (d) => {
                createdRoomId = ROOM_ID;
                return { ...mockRoom, ...d };
            });

            const result = await roomService.createRoom(validData);
            expect(mockedCreateRoomDao).toHaveBeenCalledWith(validData);
            expect(result).toHaveProperty('name', 'Phòng 101');
            // Rollback marker
            expect(createdRoomId).toBe(ROOM_ID);
        });

        it('nên ném NOT_FOUND khi buildingId không tồn tại', async () => {
            mockBuildingFindUnique.mockResolvedValue(null);

            await expect(roomService.createRoom(validData))
                .rejects.toMatchObject({
                    type: ErrorType.NOT_FOUND,
                    message: 'Tòa nhà không tồn tại',
                });
            expect(mockedCreateRoomDao).not.toHaveBeenCalled();
        });

        it('nên ném BAD_REQUEST khi numberRoom không phải số nguyên dương', async () => {
            mockBuildingFindUnique.mockResolvedValue(mockBuilding);

            await expect(
                roomService.createRoom({ ...validData, numberRoom: 0 })
            ).rejects.toMatchObject({
                type: ErrorType.BAD_REQUEST,
                message: 'Số phòng không hợp lệ',
            });
        });

        it('nên ném BAD_REQUEST khi số phòng không khớp với tầng (101 phải là tầng 1)', async () => {
            mockBuildingFindUnique.mockResolvedValue(mockBuilding);

            // numberRoom=101 (tầng 1) nhưng floor=2
            await expect(
                roomService.createRoom({ ...validData, numberRoom: 101, floor: 2 })
            ).rejects.toMatchObject({
                type: ErrorType.BAD_REQUEST,
            });
            expect(mockedCreateRoomDao).not.toHaveBeenCalled();
        });

        it('nên ném BAD_REQUEST khi số phòng đã tồn tại trong tòa nhà', async () => {
            mockBuildingFindUnique.mockResolvedValue(mockBuilding);
            mockRoomFindFirst.mockResolvedValue(mockRoom); // phòng đã có

            await expect(roomService.createRoom(validData))
                .rejects.toMatchObject({
                    type: ErrorType.BAD_REQUEST,
                    message: `Số phòng "101" đã tồn tại trong tòa nhà`,
                });
        });

        it('nên tạo thành công khi không cung cấp buildingId (bỏ qua kiểm tra building)', async () => {
            mockRoomFindFirst.mockResolvedValue(null);
            mockedCreateRoomDao.mockResolvedValue({ ...mockRoom, buildingId: undefined });

            const dataNoBuilding = { ...validData, buildingId: '' };
            // buildingId falsy → skip building check
            // numberRoom=101, floor=1 → hợp lệ
            const result = await roomService.createRoom(dataNoBuilding);
            expect(result).toBeDefined();
        });
    });

    // =========================================================================
    // 6. updateRoom  (mutating – rollback)
    // =========================================================================
    describe('updateRoom', () => {
        let snapshotBefore: typeof mockRoom;
        beforeEach(() => { snapshotBefore = { ...mockRoom }; });
        afterEach(() => { Object.assign(mockRoom, snapshotBefore); });

        it('nên cập nhật phòng thành công', async () => {
            const updated = { ...mockRoom, name: 'Phòng 101 Updated' };
            mockedGetRoomById.mockResolvedValue(mockRoom);
            mockRoomFindFirst.mockResolvedValue(null); // không trùng
            mockedUpdateRoomDao.mockImplementation(async () => {
                mockRoom.name = 'Phòng 101 Updated';
                return updated;
            });

            const result = await roomService.updateRoom(ROOM_ID, { name: 'Phòng 101 Updated' });
            expect(mockedUpdateRoomDao).toHaveBeenCalledWith(ROOM_ID, { name: 'Phòng 101 Updated' });
            expect(result.name).toBe('Phòng 101 Updated');

            // Rollback
            Object.assign(mockRoom, snapshotBefore);
        });

        it('nên ném NOT_FOUND khi phòng không tồn tại', async () => {
            mockedGetRoomById.mockResolvedValue(null);

            await expect(roomService.updateRoom('bad-id', { name: 'X' }))
                .rejects.toMatchObject({ type: ErrorType.NOT_FOUND });
            expect(mockedUpdateRoomDao).not.toHaveBeenCalled();
        });

        it('nên ném BAD_REQUEST khi numberRoom không hợp lệ (số âm)', async () => {
            mockedGetRoomById.mockResolvedValue(mockRoom);

            await expect(
                roomService.updateRoom(ROOM_ID, { numberRoom: -5 } as any)
            ).rejects.toMatchObject({
                type: ErrorType.BAD_REQUEST,
                message: 'Số phòng không hợp lệ',
            });
        });

        it('nên ném BAD_REQUEST khi numberRoom không khớp floor sau update', async () => {
            mockedGetRoomById.mockResolvedValue(mockRoom); // floor=1, number_room=101

            // numberRoom=201 (tầng 2) nhưng floor hiện tại là 1
            await expect(
                roomService.updateRoom(ROOM_ID, { numberRoom: 201 } as any)
            ).rejects.toMatchObject({ type: ErrorType.BAD_REQUEST });
        });

        it('nên ném BAD_REQUEST khi số phòng trùng với phòng khác trong cùng tòa nhà', async () => {
            mockedGetRoomById.mockResolvedValue(mockRoom);
            mockRoomFindFirst.mockResolvedValue({ id: 'other-room', number_room: 101 });

            await expect(
                roomService.updateRoom(ROOM_ID, { name: 'Updated' })
            ).rejects.toMatchObject({ type: ErrorType.BAD_REQUEST });
        });
    });

    // =========================================================================
    // 7. deleteRoom  (mutating – rollback)
    // =========================================================================
    describe('deleteRoom', () => {
        let deletedRoomId: string | null = null;
        afterEach(() => { deletedRoomId = null; });

        it('nên xóa phòng thành công', async () => {
            mockedGetRoomById.mockResolvedValue(mockRoom);
            mockedDeleteRoomDao.mockImplementation(async (id) => {
                deletedRoomId = id; // ghi nhận để rollback
                return mockRoom;
            });

            const result = await roomService.deleteRoom(ROOM_ID);
            expect(mockedDeleteRoomDao).toHaveBeenCalledWith(ROOM_ID);
            expect(result).toEqual(mockRoom);
            // Rollback marker
            expect(deletedRoomId).toBe(ROOM_ID);
        });

        it('nên ném NOT_FOUND khi phòng không tồn tại', async () => {
            mockedGetRoomById.mockResolvedValue(null);

            await expect(roomService.deleteRoom('non-existent'))
                .rejects.toMatchObject({
                    type: ErrorType.NOT_FOUND,
                    message: 'Phòng không tồn tại',
                });
            // deleteRoomDao không được gọi
            expect(mockedDeleteRoomDao).not.toHaveBeenCalled();
            expect(deletedRoomId).toBeNull();
        });
    });
});
