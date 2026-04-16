import { ACCESS_TOKEN_SECRET_KEY } from '@src/config/constants';
import {
    AccessTokenErrorResponse,
    AuthFailureResponse,
    ForbiddenResponse,
} from '@src/core/ApiResponse';
import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface TokenPayload {
    id: string;
    email: string;
    role: string;
    username: string;
}

export const authenticateToken = (exceptionPath: string[] = []) => {
    return (req: Request, res: Response, next: NextFunction): void => {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1];
        for (const path of exceptionPath) {
            if (req.path.includes(path)) {
                if (token) {
                    req.user = jwt.decode(token, { complete: true })
                        ?.payload as TokenPayload;
                }
                next();
                return;
            }
        }
        if (!token) {
            new AuthFailureResponse('Token is required').send(res);
            return;
        }

        try {
            const decoded = jwt.verify(
                token,
                ACCESS_TOKEN_SECRET_KEY || 'fallback-secret'
            ) as TokenPayload;
            req.user = decoded;
            next();
        } catch (error) {
            new AccessTokenErrorResponse('Token is invalid or expired').send(
                res
            );
            return;
        }
    };
};

export const checkRole = (roles: string[]) => {
    return (req: Request, res: Response, next: NextFunction): void => {
        if (roles.length === 0 && req.user) {
            next();
            return;
        }
        if (!req.user || !roles.includes(req.user.role)) {
            new ForbiddenResponse('Access denied').send(res);
            return;
        }
        next();
    };
};
