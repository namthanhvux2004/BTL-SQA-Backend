import { Response } from 'express';
import { NODE_ENV as environment } from '../config/constants';
import {
    AuthFailureResponse,
    AccessTokenErrorResponse,
    InternalErrorResponse,
    NotFoundResponse,
    BadRequestResponse,
    ForbiddenResponse,
    ValidationErrorResponse,
    ValidationErrorDetail,
    RefreshTokenErrorResponse,
} from './ApiResponse';

export enum ErrorType {
    FAILURE = 'FailureError',
    RETRY = 'RetryError',
    INVALID_ACCESS_TOKEN = 'InvalidAccessTokenError',
    INVALID_REFRESH_TOKEN = 'InvalidRefreshTokenError',
    FORBIDDEN = 'ForbiddenError',
    BAD_REQUEST = 'BadRequestError',
    UNAUTHORIZED = 'UnauthorizedError',
    NOT_FOUND = 'NotFoundError',
    VALIDATION_ERROR = 'ValidationError',
    INTERNAL_ERROR = 'InternalError',
}

export class CustomError extends Error {
    constructor(
        public type: ErrorType,
        message: string = 'error'
    ) {
        super(message);
        this.type = type;
    }

    public static handle(err: CustomError, res: Response): Response {
        switch (err.type) {
            case ErrorType.UNAUTHORIZED:
                return new AuthFailureResponse(err.message).send(res);
            case ErrorType.INVALID_ACCESS_TOKEN:
                return new AccessTokenErrorResponse(err.message).send(res);
            case ErrorType.INVALID_REFRESH_TOKEN:
                return new RefreshTokenErrorResponse(err.message).send(res);
            case ErrorType.NOT_FOUND:
                return new NotFoundResponse(err.message).send(res);
            case ErrorType.BAD_REQUEST:
                return new BadRequestResponse(err.message).send(res);
            case ErrorType.FORBIDDEN:
                return new ForbiddenResponse(err.message).send(res);
            case ErrorType.VALIDATION_ERROR:
                if (err instanceof ValidationError) {
                    return new ValidationErrorResponse(
                        err.errors,
                        err.message
                    ).send(res);
                }
                return new InternalErrorResponse(err.message).send(res);
            default: {
                let message = err.message;
                // Do not send failure message in production as it may send sensitive data
                if (environment === 'production')
                    message = 'Something wrong happened.';
                return new InternalErrorResponse(message).send(res);
            }
        }
    }
}

export class ValidationError extends CustomError {
    constructor(
        public errors: ValidationErrorDetail[],
        message = 'Validation Error'
    ) {
        super(ErrorType.VALIDATION_ERROR, message);
    }
}
