import { z } from 'zod';

export const CreateContactDto = z.object({
    fullname: z
        .string()
        .min(1, 'Full name is required')
        .max(100, 'Full name must not exceed 100 characters')
        .trim(),
    email: z.email('Invalid email format').trim().toLowerCase(),
    phone: z.string().refine((phone) => {
        return /^\d{10,15}$/.test(phone);
    }, 'Phone number must contain 10–15 digits'),
    subject: z
        .string()
        .max(200, 'Subject must not exceed 200 characters')
        .trim()
        .optional(),
    content: z
        .string()
        .min(1, 'Message content is required')
        .max(1000, 'Message content must not exceed 1000 characters')
        .trim(),
});

export type CreateContactDataDto = z.infer<typeof CreateContactDto>;

// DTO for admin queries
export const ContactQueryDto = z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
    search: z.string().optional(),
    isRead: z.enum(['true', 'false']).optional(),
    userId: z.uuid().optional(),
});

export type ContactQueryDataDto = z.infer<typeof ContactQueryDto>;
