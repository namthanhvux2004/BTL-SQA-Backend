import { z } from 'zod';

export const GetPatientByIdDto = z.object({
    id: z.union([
        z.uuid('User ID không hợp lệ'),
        z.string().regex(/^PAT/, 'Patient ID không hợp lệ'),
    ]),
});

export type GetPatientByIdDataDto = z.infer<typeof GetPatientByIdDto>;
