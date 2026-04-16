import { z } from 'zod';

const optionalTrimmedString = z
    .union([z.string().trim().min(1).max(255), z.literal('')])
    .transform((value) => (value === '' ? undefined : value));

export const uploadFileOptionsDto = z
    .object({
        folder: optionalTrimmedString.optional(),
        publicId: optionalTrimmedString.optional(),
        uploadPreset: optionalTrimmedString.optional(),
    })
    .strict()
    .transform((value) => ({
        folder: value.folder ?? undefined,
        publicId: value.publicId ?? undefined,
        uploadPreset: value.uploadPreset ?? undefined,
    }));

export type UploadFileOptionsDto = z.infer<typeof uploadFileOptionsDto>;

export const singleUploadedFileDto = z
    .object({
        path: z.string().min(1, { message: 'File path is required.' }),
        mimetype: z.string().min(1, { message: 'Mimetype is required.' }),
        size: z.number().max(10 * 1024 * 1024, {
            message: 'Kích thước file phải nhỏ hơn 10MB.',
        }),
        originalname: z.string().min(1, { message: 'Tên file là bắt buộc.' }),
        filename: z.string().min(1, { message: 'Tên lưu trữ là bắt buộc.' }),
    })
    .loose();

export type SingleUploadedFileDto = z.infer<typeof singleUploadedFileDto>;
