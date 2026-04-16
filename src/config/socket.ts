import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { ACCESS_TOKEN_SECRET_KEY, CORS_URL } from './constants';

// Socket.IO server instance
let io: Server | null = null;

// Map userId to Set of socket IDs (một user có thể mở nhiều tab)
const userSockets = new Map<string, Set<string>>();

interface JwtPayload {
    id: string; // Đổi từ userId thành id
    email: string;
    role: string; // Đổi từ roleId thành role
    username: string;
}

/**
 * Khởi tạo Socket.IO server
 */
export function initializeSocketIO(httpServer: HttpServer): Server {
    io = new Server(httpServer, {
        cors: {
            origin: CORS_URL?.split(',') || ['http://localhost:3000'],
            methods: ['GET', 'POST'],
            credentials: true,
        },
        pingInterval: 25000,
        pingTimeout: 60000,
    });

    // Middleware xác thực JWT
    io.use((socket: Socket, next) => {
        const token = socket.handshake.auth?.token;

        if (!token) {
            console.log('[Socket.IO] No token provided');
            return next(new Error('Authentication error: Token required'));
        }

        try {
            const decoded = jwt.verify(
                token,
                ACCESS_TOKEN_SECRET_KEY!
            ) as JwtPayload;

            // 🔍 DEBUG: Log decoded payload để xem structure
            console.log('[Socket.IO] Decoded JWT:', decoded);

            socket.data.userId = decoded.id; // Sửa: dùng id thay vì userId
            socket.data.email = decoded.email;
            socket.data.role = decoded.role; // Sửa: dùng role thay vì roleId
            next();
        } catch (err) {
            console.log('[Socket.IO] JWT Error:', err);
            return next(new Error('Authentication error: Invalid token'));
        }
    });

    // Xử lý kết nối
    io.on('connection', (socket: Socket) => {
        const userId = socket.data.userId;

        console.log(
            `[Socket.IO] User ${userId} connected (socket: ${socket.id})`
        );

        // Thêm socket vào room của user
        socket.join(`user:${userId}`);

        // Lưu mapping userId -> socketId
        if (!userSockets.has(userId)) {
            userSockets.set(userId, new Set());
        }
        userSockets.get(userId)!.add(socket.id);

        // Xử lý ngắt kết nối
        socket.on('disconnect', (reason) => {
            console.log(`[Socket.IO] User ${userId} disconnected: ${reason}`);

            const sockets = userSockets.get(userId);
            if (sockets) {
                sockets.delete(socket.id);
                if (sockets.size === 0) {
                    userSockets.delete(userId);
                }
            }
        });

        // Ping-pong để kiểm tra kết nối
        socket.on('ping', () => {
            socket.emit('pong', { timestamp: Date.now() });
        });
    });

    console.log('[Socket.IO] Server initialized');
    return io;
}

/**
 * Lấy Socket.IO instance
 */
export function getIO(): Server {
    if (!io) {
        throw new Error('Socket.IO not initialized');
    }
    return io;
}

/**
 * Gửi event đến một user cụ thể
 */
export function emitToUser(userId: string, event: string, data: any): void {
    if (!io) {
        console.warn('[Socket.IO] Server not initialized, skipping emit');
        return;
    }
    io.to(`user:${userId}`).emit(event, data);
}

/**
 * Gửi event đến nhiều users
 */
export function emitToUsers(userIds: string[], event: string, data: any): void {
    userIds.forEach((userId) => emitToUser(userId, event, data));
}

/**
 * Broadcast event đến tất cả connected users
 */
export function broadcast(event: string, data: any): void {
    if (!io) {
        console.warn('[Socket.IO] Server not initialized, skipping broadcast');
        return;
    }
    io.emit(event, data);
}

/**
 * Kiểm tra user có đang online không
 */
export function isUserOnline(userId: string): boolean {
    return userSockets.has(userId) && userSockets.get(userId)!.size > 0;
}

/**
 * Lấy số lượng users đang online
 */
export function getOnlineUsersCount(): number {
    return userSockets.size;
}

export default {
    initializeSocketIO,
    getIO,
    emitToUser,
    emitToUsers,
    broadcast,
    isUserOnline,
    getOnlineUsersCount,
};
