import axios from 'axios';
import { CustomError, ErrorType } from '@src/core/Error';
import {
    createConversation,
    findConversationById,
    getMessagesByConversationId,
    getUserConversations,
    deleteConversation,
} from '@src/daos/chat.dao';
import { SendMessageDataDto } from '@src/dtos/chat.dto';
import { CHATBOT_SERVICE_URL } from '@src/config/constants';
import prisma from '@src/config/prisma';

// 1. Logic Gửi Tin Nhắn
const sendMessage = async (userId: string, data: SendMessageDataDto) => {
    // eslint-disable-next-line prefer-const
    let { message, conversationId } = data;
    // XỬ LÝ ID HỘI THOẠI
    if (!conversationId) {
        // Trường hợp 1: Chat mới -> Tạo Conversation trước
        const newConv = await createConversation(userId, message);
        conversationId = newConv.id;
    } else {
        // Trường hợp 2: Chat cũ -> Kiểm tra quyền sở hữu
        const exists = await findConversationById(conversationId, userId);
        if (!exists) {
            throw new CustomError(
                ErrorType.FORBIDDEN,
                'Bạn không có quyền truy cập hội thoại này'
            );
        }
    }

    // GỌI SANG PYTHON AI SERVICE
    try {
        const response = await axios.post(
            `${CHATBOT_SERVICE_URL}/api/v1/chat`,
            {
                conversation_id: conversationId, // Python cần id này
                message: message,
            },
            {
                timeout: 120000, // 2 phút timeout
                proxy: false, // Tắt proxy để tránh lỗi khi gọi localhost
            }
        );

        console.log('[DEBUG] Python Service Responded');
        console.log(response.data);

        // Python đã tự lưu message vào DB, chỉ cần trả kết quả về
        return {
            conversationId: conversationId, // Trả lại ID để FE cập nhật URL
            response: response.data.data.response,
            source: response.data.data.source,
            timestamp: response.data.data.timestamp,
        };
    } catch (error: any) {
        console.error('AI Service Error:', error.message);

        if (error.code === 'ECONNREFUSED') {
            throw new CustomError(
                ErrorType.INTERNAL_ERROR,
                'Không thể kết nối tới AI Service. Vui lòng kiểm tra service Python.'
            );
        }
        if (error.code === 'ECONNABORTED') {
            throw new CustomError(
                ErrorType.INTERNAL_ERROR,
                'AI Service phản hồi quá lâu (Timeout).'
            );
        }

        throw new CustomError(
            ErrorType.INTERNAL_ERROR,
            'Hệ thống AI đang bận, vui lòng thử lại sau'
        );
    }
};

// 2. Logic Lấy Lịch Sử
const getHistory = async (userId: string) => {
    return getUserConversations(userId);
};

// 3. Logic Load Tin Nhắn Cũ
const getConversationMessages = async (
    userId: string,
    conversationId: string
) => {
    // Check quyền trước
    const exists = await findConversationById(conversationId, userId);
    if (!exists) {
        throw new CustomError(ErrorType.NOT_FOUND, 'Hội thoại không tồn tại');
    }
    return getMessagesByConversationId(conversationId);
};

// 4. Logic Đánh Giá Phản Hồi
const rateResponse = async (
    userId: string,
    messageId: string,
    data: { userFul?: boolean; star?: number }
) => {
    const exitingMessage = await prisma.message.findFirst({
        where: { id: messageId, conversation: { userId } },
    });
    if (!exitingMessage) {
        throw new CustomError(ErrorType.NOT_FOUND, 'Tin nhắn không tồn tại');
    }
    const updatedData = {};
    if (data.userFul !== undefined) updatedData['useFul'] = !!data.userFul;
    if (data.star !== undefined)
        updatedData['star'] = Math.min(Math.max(data.star, 1), 5);
    return prisma.message.update({
        where: { id: messageId },
        data: updatedData,
    });
};

// 5. Logic Xóa Hội Thoại
const deleteConversationService = async (
    userId: string,
    conversationId: string
) => {
    // Check quyền trước
    const exists = await findConversationById(conversationId, userId);
    if (!exists) {
        throw new CustomError(ErrorType.NOT_FOUND, 'Hội thoại không tồn tại');
    }
    await deleteConversation(conversationId, userId);
    return true;
};

export default {
    sendMessage,
    getHistory,
    getConversationMessages,
    rateResponse,
    deleteConversationService,
};
