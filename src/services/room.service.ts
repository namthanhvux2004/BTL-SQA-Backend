import {
    getBuildings,
    getRoomById,
    getRooms,
    createRoomDao,
    updateRoomDao,
    deleteRoomDao,
    getAvailableRooms,
} from '@src/daos/room.dao';
import {
    GetBuildingsDTO,
    GetListRoomDTO,
    CreateRoomDto,
    UpdateRoomDto,
} from '@src/dtos/room.dto';
import { CustomError, ErrorType } from '@src/core/Error';
import { createQueryBuilder } from '@src/helpers/queryBuilder';

const listBuildings = async (params: GetBuildingsDTO) => {
    const buildings = await getBuildings(params);
    if (!buildings) {
        throw new CustomError(ErrorType.NOT_FOUND, 'Tòa nhà không tìm thấy');
    }
    return buildings;
};

const listRooms = async (params: GetListRoomDTO) => {
    const rooms = await getRooms(params);
    if (!rooms) {
        throw new CustomError(ErrorType.NOT_FOUND, 'Phòng không tìm thấy');
    }
    return rooms;
};

const getRoom = async (id: string) => {
    const room = await getRoomById(id);
    if (!room) {
        throw new CustomError(ErrorType.NOT_FOUND, 'Phòng không tồn tại');
    }
    return room;
};

const availableRooms = async () => {
    const rooms = await getAvailableRooms();
    return rooms;
};

const createRoom = async (data: CreateRoomDto) => {
    // kiểm tra building tồn tại nếu có
    if (data.buildingId) {
        const building = await createQueryBuilder('building').findUnique({
            id: data.buildingId,
        });
        if (!building) {
            throw new CustomError(ErrorType.NOT_FOUND, 'Tòa nhà không tồn tại');
        }
    }

    // kiểm tra numberRoom là số hợp lệ
    if (
        typeof data.numberRoom !== 'number' ||
        !Number.isInteger(data.numberRoom) ||
        data.numberRoom <= 0
    ) {
        throw new CustomError(ErrorType.BAD_REQUEST, 'Số phòng không hợp lệ');
    }

    // kiểm tra consistency giữa số phòng và tầng (ví dụ 101 => tầng 1)
    if (typeof data.floor === 'number') {
        const inferredFloor = Math.floor(data.numberRoom / 100);
        if (inferredFloor !== data.floor) {
            throw new CustomError(
                ErrorType.BAD_REQUEST,
                `Số phòng ${data.numberRoom} không phù hợp với tầng ${data.floor} (dự kiến tầng ${inferredFloor})`
            );
        }
    }

    // kiểm tra phòng đã tồn tại trong tòa nhà chưa
    const existingRoom = await createQueryBuilder('room').findFirst({
        where: {
            number_room: data.numberRoom,
            buildingId: data.buildingId,
        },
    });
    if (existingRoom) {
        throw new CustomError(
            ErrorType.BAD_REQUEST,
            `Số phòng "${data.numberRoom}" đã tồn tại trong tòa nhà`
        );
    }

    const room = await createRoomDao(data);
    return room;
};

const updateRoom = async (id: string, data: UpdateRoomDto) => {
    // kiểm tra phòng tồn tại
    const existing = await getRoomById(id);
    if (!existing) {
        throw new CustomError(ErrorType.NOT_FOUND, 'Phòng không tồn tại');
    }

    // validate numberRoom nếu được cung cấp
    if ((data as any).numberRoom !== undefined) {
        const num = (data as any).numberRoom;
        if (typeof num !== 'number' || !Number.isInteger(num) || num <= 0) {
            throw new CustomError(
                ErrorType.BAD_REQUEST,
                'Số phòng không hợp lệ'
            );
        }
    }

    // consistency giữa numberRoom và floor
    const targetNumberRoom =
        (data as any).numberRoom ?? (existing as any).number_room;
    const targetFloor = (data as any).floor ?? (existing as any).floor;
    if (
        typeof targetFloor === 'number' &&
        typeof targetNumberRoom === 'number'
    ) {
        const inferredFloor = Math.floor(targetNumberRoom / 100);
        if (inferredFloor !== targetFloor) {
            throw new CustomError(
                ErrorType.BAD_REQUEST,
                `Số phòng ${targetNumberRoom} không phù hợp với tầng ${targetFloor} (dự kiến tầng ${inferredFloor})`
            );
        }
    }

    // kiểm tra trùng số phòng trong cùng tòa nhà (ngoại trừ chính phòng này)
    const conflict = await createQueryBuilder('room').findFirst({
        where: {
            number_room: targetNumberRoom,
            buildingId: existing.buildingId,
            NOT: { id },
        },
    });
    if (conflict) {
        throw new CustomError(
            ErrorType.BAD_REQUEST,
            `Số phòng "${targetNumberRoom}" đã tồn tại trong tòa nhà`
        );
    }

    const room = await updateRoomDao(id, data);
    if (!room) {
        throw new CustomError(ErrorType.NOT_FOUND, 'Phòng không tồn tại');
    }

    return room;
};

const deleteRoom = async (id: string) => {
    const room = await getRoomById(id);
    if (!room) {
        throw new CustomError(ErrorType.NOT_FOUND, 'Phòng không tồn tại');
    }
    const res = await deleteRoomDao(id);
    return res;
};

export default {
    listBuildings,
    listRooms,
    getRoom,
    availableRooms,
    createRoom,
    updateRoom,
    deleteRoom,
};
