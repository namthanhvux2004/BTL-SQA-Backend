import prisma from '@src/config/prisma';
import {
    GetListRoomDTO,
    CreateRoomDto,
    UpdateRoomDto,
    GetBuildingsDTO,
} from '@src/dtos/room.dto';

export const getBuildings = async (params: GetBuildingsDTO) => {
    const page = Math.max(Number(params.page || '1'), 1);
    const limit = Math.max(Number(params.limit || '10'), 1);
    const skip = (page - 1) * limit;
    const search = params.search?.trim() || '';
    const sortBy = params.sortBy || 'name';
    const sortOrder = (params.sortOrder || 'asc') as 'asc' | 'desc';
    const where: any = {};

    if (search) {
        where.name = { contains: search, mode: 'insensitive' };
    }
    const orderByMap: Record<string, any> = {
        name: { name: sortOrder },
        createdAt: { createdAt: sortOrder },
        updatedAt: { updatedAt: sortOrder },
    };
    const orderBy = orderByMap[sortBy] ?? { name: sortOrder };
    const [total, data] = await Promise.all([
        prisma.building.count({ where }),
        prisma.building.findMany({
            where,
            skip,
            take: limit,
            orderBy,
        }),
    ]);
    return {
        data,
        metadata: {
            page,
            limit,
            totalItems: total,
            totalPages: Math.ceil(total / limit),
            hasPrev: page > 1,
            hasNext: page * limit < total,
        },
    };
};

export const getRooms = async (params: GetListRoomDTO): Promise<any> => {
    const page = Math.max(Number(params.page || '1'), 1);
    const limit = Math.max(Number(params.limit || '10'), 1);
    const skip = (page - 1) * limit;
    const search = params.search?.trim() || '';
    const sortBy = params.sortBy || 'name';
    const sortOrder = (params.sortOrder || 'asc') as 'asc' | 'desc';

    const where: any = {};

    if (search) {
        const num = Number(search);
        where.OR = [
            { name: { contains: search, mode: 'insensitive' } },
            ...(Number.isFinite(num) ? [{ number_room: num }] : []),
        ];
    }

    if (params.buildingId) where.buildingId = params.buildingId;
    if (params.type) where.type = params.type;
    if (params.status) where.status = params.status;

    const orderByMap: Record<string, any> = {
        name: { name: sortOrder },
        createdAt: { createdAt: sortOrder },
        updatedAt: { updatedAt: sortOrder },
    };
    const orderBy = orderByMap[sortBy] ?? { name: sortOrder };

    const [total, data] = await Promise.all([
        prisma.room.count({ where }),
        prisma.room.findMany({
            where,
            skip,
            take: limit,
            orderBy,
            include: {
                building: true,
                department: true,
                medicalServices: true,
            },
        }),
    ]);

    return {
        data,
        metadata: {
            page,
            limit,
            totalItems: total,
            totalPages: Math.ceil(total / limit),
            hasPrev: page > 1,
            hasNext: page * limit < total,
        },
    };
};

// lấy phòng còn trống chưa có khoa
export const getAvailableRooms = async () => {
    // Lấy tất cả phòng (kèm department) rồi lọc phía JS những phòng chưa có department
    const rooms = await prisma.room.findMany({
        where: {
            department: null, // nghĩa là không có bản ghi liên kết
        },
        include: {
            building: true,
            department: true,
        },
    });
    return rooms;
};
export const getRoomById = async (id: string) => {
    return prisma.room.findUnique({
        where: { id },
        include: {
            building: true,
            department: true,
            medicalServices: true,
        },
    });
};

export const createRoomDao = async (data: CreateRoomDto) => {
    const createData: any = {
        buildingId: (data as any).buildingId,
        name: (data as any).name,
        number_room: (data as any).numberRoom ?? (data as any).number_room,
        floor: (data as any).floor,
        type: (data as any).type,
        status: (data as any).status,
    };

    const room = await prisma.room.create({
        data: createData,
        include: {
            building: true,
            department: true,
        },
    });

    return room;
};

export const updateRoomDao = async (
    id: string,
    data: Partial<UpdateRoomDto>
) => {
    const updateData: any = {};

    if ((data as any).buildingId !== undefined)
        updateData.buildingId = (data as any).buildingId;
    if (data.name !== undefined) updateData.name = data.name;
    if ((data as any).numberRoom !== undefined)
        updateData.number_room = (data as any).numberRoom;
    if (data.floor !== undefined) updateData.floor = data.floor;
    if (data.type !== undefined) updateData.type = data.type;
    if (data.status !== undefined) updateData.status = data.status;

    const room = await prisma.room.update({
        where: { id },
        data: updateData,
        include: {
            building: true,
            department: true,
        },
    });

    return room;
};

export const deleteRoomDao = async (id: string) => {
    return prisma.room.delete({
        where: { id },
    });
};

export default {
    getBuildings,
    getRooms,
    getRoomById,
    getAvailableRooms,
    createRoomDao,
    updateRoomDao,
    deleteRoomDao,
};
