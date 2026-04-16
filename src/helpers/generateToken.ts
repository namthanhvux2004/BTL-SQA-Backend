import jwt from 'jsonwebtoken';
import { StringValue } from 'ms';
import {
    ACCESS_TOKEN_SECRET_KEY,
    REFRESH_TOKEN_SECRET_KEY,
} from '@src/config/constants';

export const generateToken = (
    payload: any,
    secretKey: string,
    expiresIn: StringValue | number
): string => {
    return jwt.sign(payload, secretKey as jwt.Secret, {
        expiresIn,
    });
};

export const generateAccessToken = (payload: any): string => {
    return generateToken(
        payload,
        ACCESS_TOKEN_SECRET_KEY || 'fallback-secret',
        '24h'
    );
};

export const generateRefreshToken = (payload: any): string => {
    return generateToken(
        payload,
        REFRESH_TOKEN_SECRET_KEY || 'fallback-secret',
        '7d'
    );
};
