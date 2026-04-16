import { ErrorRequestHandler, NextFunction, Request, Response } from 'express';
import { CustomError, ErrorType } from '@src/core/Error';
import { AxiosError } from 'axios';

// Express error handler must have 4 args: (err, req, res, next)
const errorHandler: ErrorRequestHandler = (
    err: unknown,
    req: Request,
    res: Response,
    next: NextFunction
) => {
    // If response headers already sent, delegate to default Express error handler
    if (res.headersSent) {
        return next(err as any);
    }

    if (err instanceof CustomError) {
        CustomError.handle(err, res);
    } else if (err instanceof AxiosError || err instanceof Error) {
        CustomError.handle(
            new CustomError(ErrorType.INTERNAL_ERROR, (err as Error).message),
            res
        );
    } else {
        CustomError.handle(
            new CustomError(ErrorType.INTERNAL_ERROR, 'Something went wrong!'),
            res
        );
    }
    return;
};

export default errorHandler;
