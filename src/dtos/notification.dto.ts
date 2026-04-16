import z from 'zod';

// Query DTO
export const NotificationQueryDto = z.object({
    page: z.string().optional().default('1'),
    limit: z.string().optional().default('20'),
    isRead: z.enum(['true', 'false']).optional(),
});

export type NotificationQueryDataDto = z.infer<typeof NotificationQueryDto>;

// Create Notification DTO
export const CreateNotificationDto = z.object({
    userId: z.string().uuid(),
    title: z.string().min(1).max(255),
    content: z.string().min(1).max(1000),
    type: z.string().optional(),
});

export type CreateNotificationDataDto = z.infer<typeof CreateNotificationDto>;

// Response Notification DTO
export interface NotificationResponseDto {
    id: string;
    title: string | null;
    content: string;
    type: string | null;
    isRead: boolean;
    createdAt: Date;
}
