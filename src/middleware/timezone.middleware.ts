import type { Request, Response, NextFunction } from 'express';

export const timezoneMiddleware = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const timezone = req.headers['timezone'] as string;
    req.timezone = timezone || 'Europe/London';
    next();
};
