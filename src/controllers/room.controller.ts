import { Request, Response } from 'express';
import { SuccessResponse } from '@src/core/ApiResponse';
import roomService from '@src/services/room.service';
import {
    CreateRoomDto,
    GetBuildingsDTO,
    GetListRoomDTO,
    UpdateRoomDto,
} from '@src/dtos/room.dto';

const getBuildings = async (
    req: Request<{}, {}, {}, GetBuildingsDTO>,
    res: Response<SuccessResponse<any>>
) => {
    const query = req.query;
    const result = await roomService.listBuildings(query);
    return new SuccessResponse(result, 'Lấy danh sách tòa nhà thành công').send(
        res
    );
};

const getRooms = async (
    req: Request<{}, {}, {}, GetListRoomDTO>,
    res: Response<SuccessResponse<any>>
) => {
    const query = req.query;
    const result = await roomService.listRooms(query);
    return new SuccessResponse(result, 'Lấy danh sách phòng thành công').send(
        res
    );
};

const getRoomById = async (
    req: Request<{ id: string }>,
    res: Response<SuccessResponse<any>>
) => {
    const { id } = req.params;
    const room = await roomService.getRoom(id || '');
    return new SuccessResponse(room, 'Lấy thông tin phòng thành công').send(
        res
    );
};

const availableRooms = async (
    req: Request,
    res: Response<SuccessResponse<any>>
) => {
    const rooms = await roomService.availableRooms();
    return new SuccessResponse(
        rooms,
        'Lấy danh sách phòng trống thành công'
    ).send(res);
};

const createRoom = async (
    req: Request<{}, {}, CreateRoomDto>,
    res: Response<SuccessResponse<any>>
) => {
    const roomData = req.body;
    const newRoom = await roomService.createRoom(roomData);
    return new SuccessResponse(newRoom, 'Tạo phòng mới thành công').send(res);
};
const updateRoom = async (
    req: Request<{ id: string }, {}, UpdateRoomDto>,
    res: Response<SuccessResponse<any>>
) => {
    const { id } = req.params;
    const roomData = req.body;
    const updatedRoom = await roomService.updateRoom(id, roomData);
    return new SuccessResponse(updatedRoom, 'Cập nhật phòng thành công').send(
        res
    );
};

const deleteRoom = async (
    req: Request<{ id: string }>,
    res: Response<SuccessResponse<any>>
) => {
    const { id } = req.params;
    const room = await roomService.deleteRoom(id);
    return new SuccessResponse(room, 'Xóa phòng thành công').send(res);
};

export default {
    getBuildings,
    getRooms,
    getRoomById,
    availableRooms,
    createRoom,
    updateRoom,
    deleteRoom,
};
