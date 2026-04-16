import z from 'zod';

export const SendMessageDto = z.object({
    message: z.string().min(1, 'Tin nhắn không được để trống'),
    conversationId: z.uuid().optional().nullable(), // Có thể null khi bắt đầu một cuộc hội thoại mơi
});

// Validate để lấy tin nhắn cũ
export const GetMessagesDto = z.object({
    id: z.uuid('ID hội thoại không hợp lệ'),
});

export const RateMessageDto = z.object({
    userFul: z.boolean().optional(),
    star: z.number().min(1).max(5).optional(),
});

export type SendMessageDataDto = z.infer<typeof SendMessageDto>;
export type GetMessagesDataDto = z.infer<typeof GetMessagesDto>;
export type RateMessageDataDto = z.infer<typeof RateMessageDto>;
