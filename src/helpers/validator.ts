import { ValidationError } from '@src/core/Error';
import z, { ZodIssue } from 'zod';

const validate = <T extends z.ZodTypeAny>(schema: T, value: z.infer<T>) => {
    try {
        const result = schema.parse(value);
        return result;
    } catch (err) {
        if (err instanceof z.ZodError) {
            throw new ValidationError(
                err.issues.map((err: ZodIssue) => ({
                    field: err.path.join('.'),
                    message: err.message,
                }))
            );
        }
        throw new Error('Validation failed');
    }
};

export default validate;
