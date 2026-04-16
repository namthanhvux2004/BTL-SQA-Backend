// src/middlewares/validate.middleware.ts
import { ZodObject, ZodError, ZodIssue } from 'zod';
import { Request, Response, NextFunction } from 'express';
import {
    InternalErrorResponse,
    ValidationErrorResponse,
} from '@src/core/ApiResponse';
import { NODE_ENV } from '@src/config/constants';

export const validateDto =
    (
        schema: ZodObject<any>,
        type: 'body' | 'headers' | 'query' | 'params' | 'files' = 'body'
    ) =>
    (req: Request, res: Response, next: NextFunction) => {
        try {
            req[type] = schema.parse(req[type]);
            return next();
        } catch (error: any) {
            if (error instanceof ZodError) {
                const details = error.issues.map((err: ZodIssue) => ({
                    field: err.path.join('.'),
                    message: err.message,
                }));
                if (NODE_ENV !== 'production') {
                    console.error('Validation error:', details);
                }
                return new ValidationErrorResponse(
                    details,
                    'Lỗi validate'
                ).send(res);
            } else {
                return new InternalErrorResponse().send(res);
            }
        }
    };
