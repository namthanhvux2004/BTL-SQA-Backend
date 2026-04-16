import { Response } from 'express';

// Helper code for the API consumer to understand the error and handle is accordingly
enum ResponseCode {
    SUCCESS = '10000',
    FAILURE = '10001',
    RETRY = '10002',
    INVALID_ACCESS_TOKEN = '10003',
    INVALID_REFRESH_TOKEN = '10004',
    FORBIDDEN = '10005',
    UNAUTHORIZED = '10006',
    NOT_FOUND = '10007',
    VALIDATION_ERROR = '10008',
    INTERNAL_ERROR = '10009',
    BAD_REQUEST = '10010',
}

type MetaData = {
    page?: number;
    limit?: number | undefined;
    totalItems?: number;
    totalPages?: number;
    hasNext?: boolean;
    hasPrev?: boolean;
};

enum ResponseStatus {
    SUCCESS = 200,
    BAD_REQUEST = 400,
    UNAUTHORIZED = 401,
    FORBIDDEN = 403,
    NOT_FOUND = 404,
    INTERNAL_ERROR = 500,
}

export type ValidationErrorDetail = Record<string, string>;

export class ApiResponse {
    constructor(
        protected success: boolean,
        protected message: string,
        protected statusCode: ResponseStatus,
        protected code: ResponseCode,
        protected metadata: MetaData | undefined = undefined
    ) {}

    protected prepare<T extends ApiResponse>(
        res: Response,
        response: T,
        headers: { [key: string]: string }
    ): Response {
        for (const [key, value] of Object.entries(headers))
            res.append(key, value);
        return res.status(this.statusCode).json(ApiResponse.sanitize(response));
    }

    public send(
        res: Response,
        headers: { [key: string]: string } = {}
    ): Response {
        return this.prepare<ApiResponse>(res, this, headers);
    }

    private static sanitize<T extends ApiResponse>(response: T): T {
        const clone: T = {} as T;
        Object.assign(clone, response);

        delete (clone as any).statusCode;
        for (const i in clone)
            if (typeof clone[i] === 'undefined') delete clone[i];
        return clone;
    }
}

export class ErrorResponse extends ApiResponse {
    constructor(
        message: string,
        statusCode: ResponseStatus,
        code: ResponseCode
    ) {
        super(false, message, statusCode, code);
    }
}

export class AuthFailureResponse extends ErrorResponse {
    constructor(message = 'Authentication Failure') {
        super(message, ResponseStatus.UNAUTHORIZED, ResponseCode.UNAUTHORIZED);
    }
}

export class NotFoundResponse extends ErrorResponse {
    constructor(message = 'Not Found') {
        super(message, ResponseStatus.NOT_FOUND, ResponseCode.NOT_FOUND);
    }

    override send(
        res: Response,
        headers: { [key: string]: string } = {}
    ): Response {
        return super.prepare<NotFoundResponse>(res, this, headers);
    }
}

export class ForbiddenResponse extends ErrorResponse {
    constructor(message = 'Forbidden') {
        super(message, ResponseStatus.FORBIDDEN, ResponseCode.FORBIDDEN);
    }
}

export class BadRequestResponse extends ErrorResponse {
    constructor(message = 'Bad Parameters') {
        super(message, ResponseStatus.BAD_REQUEST, ResponseCode.BAD_REQUEST);
    }
}

export class InternalErrorResponse extends ErrorResponse {
    constructor(message = 'Internal Error') {
        super(
            message,
            ResponseStatus.INTERNAL_ERROR,
            ResponseCode.INTERNAL_ERROR
        );
    }
}

export class ValidationErrorResponse extends ErrorResponse {
    constructor(
        public errors: ValidationErrorDetail[],
        message = 'Validation Error'
    ) {
        super(
            message,
            ResponseStatus.BAD_REQUEST,
            ResponseCode.VALIDATION_ERROR
        );
    }
    override send(
        res: Response,
        headers: { [key: string]: string } = {}
    ): Response {
        return super.prepare<ValidationErrorResponse>(res, this, headers);
    }
}

export class SuccessResponse<T> extends ApiResponse {
    constructor(
        private data: T,
        message: string,
        metadata?: MetaData
    ) {
        super(
            true,
            message,
            ResponseStatus.SUCCESS,
            ResponseCode.SUCCESS,
            metadata
        );
        this.data = data;
    }

    override send(
        res: Response,
        headers: { [key: string]: string } = {}
    ): Response {
        return super.prepare<SuccessResponse<T>>(res, this, headers);
    }
}
export class AccessTokenErrorResponse extends ErrorResponse {
    constructor(message = 'Access token invalid') {
        super(
            message,
            ResponseStatus.UNAUTHORIZED,
            ResponseCode.INVALID_ACCESS_TOKEN
        );
    }

    override send(
        res: Response,
        headers: { [key: string]: string } = {}
    ): Response {
        return super.prepare<AccessTokenErrorResponse>(res, this, headers);
    }
}

export class RefreshTokenErrorResponse extends ErrorResponse {
    constructor(message = 'Refresh token invalid') {
        super(
            message,
            ResponseStatus.UNAUTHORIZED,
            ResponseCode.INVALID_REFRESH_TOKEN
        );
    }

    override send(
        res: Response,
        headers: { [key: string]: string } = {}
    ): Response {
        return super.prepare<RefreshTokenErrorResponse>(res, this, headers);
    }
}
