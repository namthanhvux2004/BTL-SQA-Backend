import { Request, Response } from 'express';
import chatService from '@src/services/chat.service';
import { SuccessResponse } from '@src/core/ApiResponse';
import { SendMessageDataDto } from '@src/dtos/chat.dto';
import { CustomError, ErrorType } from '@src/core/Error';

// API Gửi tin nhắn
const sendMessage = async (req: Request, res: Response) => {
    const user = req.user!;
    const userId = user.id;
    const data = req.body as SendMessageDataDto;

    const result = await chatService.sendMessage(userId, data);

    return new SuccessResponse(result, 'Gửi tin nhắn thành công').send(res);
};

// API Lấy danh sách lịch sử
const getHistory = async (req: Request, res: Response) => {
    const user = req.user!;
    const userId = user.id;
    const result = await chatService.getHistory(userId);

    return new SuccessResponse(result, 'Lấy lịch sử thành công').send(res);
};

// API Lấy nội dung hội thoại
const getMessages = async (req: Request, res: Response) => {
    const user = req.user!;
    const userId = user.id;
    const { conversationId } = req.params;

    if (!conversationId) {
        throw new CustomError(
            ErrorType.BAD_REQUEST,
            'Conversation ID là bắt buộc'
        );
    }

    const result = await chatService.getConversationMessages(
        userId,
        conversationId
    );

    return new SuccessResponse(result, 'Lấy tin nhắn thành công').send(res);
};

// API gửi đánh giá phản hồi
const rateResponse = async (
    req: Request<
        { messageId: string },
        {},
        { userFul?: boolean; star?: number }
    >,
    res: Response
) => {
    const user = req.user!;
    const userId = user.id;
    const { messageId } = req.params;

    if (
        !messageId ||
        (req.body.userFul === undefined && req.body.star === undefined)
    ) {
        throw new CustomError(
            ErrorType.BAD_REQUEST,
            'Message ID và nội dung đánh giá là bắt buộc'
        );
    }

    const result = await chatService.rateResponse(userId, messageId, req.body);

    return new SuccessResponse(result, 'Đánh giá thành công').send(res);
};

// API xóa hội thoại
const deleteConversation = async (
    req: Request<{ conversationId: string }>,
    res: Response
) => {
    const user = req.user!;
    const userId = user.id;
    const { conversationId } = req.params;

    if (!conversationId) {
        throw new CustomError(
            ErrorType.BAD_REQUEST,
            'Conversation ID là bắt buộc'
        );
    }

    const isSuccess = await chatService.deleteConversationService(
        userId,
        conversationId
    );

    return new SuccessResponse(isSuccess, 'Xóa hội thoại thành công').send(res);
};

export default {
    sendMessage,
    getHistory,
    getMessages,
    rateResponse,
    deleteConversation,
};
