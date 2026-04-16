import { z } from 'zod';

export const multerFileDto = z
    .object({
        originalname: z.string(),
        mimetype: z
            .string()
            .refine(
                (t) =>
                    [
                        'image/jpeg',
                        'image/png',
                        'image/jpg',
                        'image/webp',
                    ].includes(t),
                {
                    message: 'File phải là ảnh (JPEG, PNG, JPG, WEBP).',
                }
            ),
        size: z.number().max(10 * 1024 * 1024, {
            message: 'Kích thước ảnh phải nhỏ hơn 10 MB.',
        }),
    })
    .loose();

export const filesArrayDto = z
    .array(multerFileDto)
    .min(1, { message: 'Cần ít nhất 1 ảnh.' });

export type MulterFile = z.infer<typeof multerFileDto>;
export type FilesArray = z.infer<typeof filesArrayDto>;
