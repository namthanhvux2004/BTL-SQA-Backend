import { Router } from 'express';
import { authenticateToken, checkRole } from '@src/middleware/auth.middleware';
import { validateDto } from '@src/middleware/validatation.middleware';
import asyncHandler from '@src/helpers/asyncHandler';
import roomController from '@src/controllers/room.controller';
import {
    createRoomDto,
    getBuildingsDto,
    getListRoomDto,
    updateRoomDto,
} from '@src/dtos/room.dto';

const router = Router();

/**
 * @swagger
 * /api/v1/rooms:
 *   get:
 *     summary: Lấy danh sách phòng (phân trang, lọc)
 *     tags: [Rooms]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Số trang
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Số phần tử trên trang
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Từ khóa tìm theo tên hoặc số phòng
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [name, createdAt, updatedAt]
 *         description: Trường sắp xếp
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *         description: Thứ tự sắp xếp
 *       - in: query
 *         name: buildingId
 *         schema:
 *           type: string
 *         description: Lọc theo tòa nhà
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *         description: Lọc theo loại phòng
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [not_used, used, maintenance]
 *         description: Trạng thái phòng
 *     responses:
 *       200:
 *         description: Danh sách phòng phân trang
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/RoomResponse'
 *                 metadata:
 *                   type: object
 */
router.get(
    '/',
    authenticateToken(),
    checkRole(['admin']),
    validateDto(getListRoomDto, 'query'),
    asyncHandler(roomController.getRooms as any)
);

/**
 * @swagger
 * /api/v1/rooms/buildings:
 *   get:
 *     summary: Lấy danh sách tòa nhà hỗ trợ khi tạo phòng (phân trang)
 *     tags: [Rooms]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Danh sách tòa nhà phân trang
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                 metadata:
 *                   type: object
 */
router.get(
    '/buildings',
    authenticateToken(),
    checkRole(['admin']),
    validateDto(getBuildingsDto, 'query'),
    asyncHandler(roomController.getBuildings as any)
);

/**
 * @swagger
 * /api/v1/rooms/available-rooms:
 *   get:
 *     summary: Lấy danh sách phòng chưa có khoa (phân trang, lọc)
 *     tags: [Rooms]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Danh sách phòng chưa có khoa (phân trang)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/RoomResponse'
 *                 metadata:
 *                   type: object
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get(
    '/available-rooms',
    authenticateToken(),
    checkRole(['admin']),
    asyncHandler(roomController.availableRooms as any)
);

/**
 * @swagger
 * /api/v1/rooms/{id}:
 *   get:
 *     summary: Lấy thông tin phòng theo ID
 *     tags: [Rooms]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: UUID của phòng
 *     responses:
 *       200:
 *         description: Thông tin phòng
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RoomResponse'
 *       404:
 *         description: Không tìm thấy phòng
 */
router.get(
    '/:id',
    authenticateToken(),
    checkRole(['admin']),
    asyncHandler(roomController.getRoomById as any)
);

/**
 * @swagger
 * /api/v1/rooms/create:
 *   post:
 *     summary: Tạo mới phòng
 *     tags: [Rooms]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RoomCreateRequest'
 *     responses:
 *       201:
 *         description: Phòng được tạo thành công
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RoomResponse'
 *       400:
 *         description: Dữ liệu gửi lên không hợp lệ
 */
router.post(
    '/create',
    authenticateToken(),
    checkRole(['admin']),
    validateDto(createRoomDto, 'body'),
    asyncHandler(roomController.createRoom as any)
);

/**
 * @swagger
 * /api/v1/rooms/update/{id}:
 *   put:
 *     summary: Cập nhật thông tin phòng
 *     tags: [Rooms]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: UUID phòng cần cập nhật
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RoomUpdateRequest'
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RoomResponse'
 *       404:
 *         description: Không tìm thấy phòng
 */
router.put(
    '/update/:id',
    authenticateToken(),
    checkRole(['admin']),
    validateDto(updateRoomDto, 'body'),
    asyncHandler(roomController.updateRoom as any)
);

/**
 * @swagger
 * /api/v1/rooms/delete/{id}:
 *   delete:
 *     summary: Xóa phòng theo ID
 *     tags: [Rooms]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: UUID phòng cần xóa
 *     responses:
 *       200:
 *         description: Xóa thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   nullable: true
 *       404:
 *         description: Không tìm thấy phòng
 */
router.delete(
    '/delete/:id',
    authenticateToken(),
    checkRole(['admin']),
    asyncHandler(roomController.deleteRoom as any)
);

/**
 * @swagger
 * components:
 *   schemas:
 *     RoomCreateRequest:
 *       type: object
 *       required:
 *         - buildingId
 *         - name
 *         - numberRoom
 *         - floor
 *         - type
 *       properties:
 *         buildingId:
 *           type: string
 *         name:
 *           type: string
 *         numberRoom:
 *           type: integer
 *         floor:
 *           type: integer
 *         type:
 *           type: string
 *         status:
 *           type: string
 *           enum: [not_used, used, maintenance]
 *
 *     RoomUpdateRequest:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *         numberRoom:
 *           type: integer
 *         floor:
 *           type: integer
 *         type:
 *           type: string
 *         status:
 *           type: string
 *           enum: [not_used, used, maintenance]
 *
 *     RoomResponse:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         buildingId:
 *           type: string
 *         name:
 *           type: string
 *         number_room:
 *           type: integer
 *         floor:
 *           type: integer
 *         type:
 *           type: string
 *         status:
 *           type: string
 *         building:
 *           type: object
 *         department:
 *           type: object
 */
export default router;
