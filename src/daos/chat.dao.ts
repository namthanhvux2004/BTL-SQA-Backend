import prisma from '@src/config/prisma';

// Tìm hội thoại theo ID và UserId (để check quyền truy cập)
export const findConversationById = async (id: string, userId: string) => {
    return prisma.conversation.findFirst({
        where: { id, userId },
    });
};

// Tạo hội thoại mới
export const createConversation = async (
    userId: string,
    firstMessage: string
) => {
    return prisma.conversation.create({
        data: {
            userId,
            title: firstMessage.substring(0, 50) + '...', // Lấy 50 ký tự đầu làm tiêu đề
        },
    });
};

// Lấy danh sách lịch sử chat của user
export const getUserConversations = async (userId: string) => {
    return prisma.conversation.findMany({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
        select: {
            id: true,
            title: true,
            updatedAt: true,
        },
    });
};

// Lấy chi tiết tin nhắn của 1 cuộc hội thoại
export const getMessagesByConversationId = async (conversationId: string) => {
    return prisma.message.findMany({
        where: { conversationId },
        orderBy: { createdAt: 'asc' }, // Tin cũ xếp trên
    });
};

// Xóa hội thoại
export const deleteConversation = async (id: string, userId: string) => {
    return prisma.conversation.deleteMany({
        where: { id, userId },
    });
};
