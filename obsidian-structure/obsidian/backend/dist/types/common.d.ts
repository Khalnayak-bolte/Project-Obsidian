import { Request } from "express";
export interface ApiSuccess<T = unknown> {
    success: true;
    data: T;
    message?: string;
    meta?: PaginationMeta;
}
export interface ApiError {
    success: false;
    error: {
        code: string;
        message: string;
        details?: unknown;
    };
}
export type ApiResponse<T = unknown> = ApiSuccess<T> | ApiError;
export interface PaginationMeta {
    limit: number;
    hasMore: boolean;
    nextCursor?: string;
    total?: number;
}
export interface PaginationParams {
    limit?: number;
    cursor?: string;
}
export interface FirestoreTimestamps {
    createdAt: FirebaseFirestore.Timestamp;
    updatedAt: FirebaseFirestore.Timestamp;
}
export interface AuthenticatedUser {
    uid: string;
    email: string;
    workspaceId: string;
    roleId: string;
    permissions: Record<string, boolean>;
}
export interface AuthenticatedRequest extends Request {
    user: AuthenticatedUser;
    workspaceId: string;
}
export declare const ERROR_CODES: {
    readonly UNAUTHORIZED: "UNAUTHORIZED";
    readonly FORBIDDEN: "FORBIDDEN";
    readonly TOKEN_EXPIRED: "TOKEN_EXPIRED";
    readonly INVALID_TOKEN: "INVALID_TOKEN";
    readonly NOT_FOUND: "NOT_FOUND";
    readonly ALREADY_EXISTS: "ALREADY_EXISTS";
    readonly CONFLICT: "CONFLICT";
    readonly VALIDATION_ERROR: "VALIDATION_ERROR";
    readonly INVALID_INPUT: "INVALID_INPUT";
    readonly SUBSCRIPTION_REQUIRED: "SUBSCRIPTION_REQUIRED";
    readonly TIER_LIMIT_EXCEEDED: "TIER_LIMIT_EXCEEDED";
    readonly STORAGE_LIMIT_EXCEEDED: "STORAGE_LIMIT_EXCEEDED";
    readonly MEMBER_LIMIT_EXCEEDED: "MEMBER_LIMIT_EXCEEDED";
    readonly VOICE_SESSION_NOT_FOUND: "VOICE_SESSION_NOT_FOUND";
    readonly VOICE_JOIN_FAILED: "VOICE_JOIN_FAILED";
    readonly FILE_TOO_LARGE: "FILE_TOO_LARGE";
    readonly INVALID_FILE_TYPE: "INVALID_FILE_TYPE";
    readonly UPLOAD_FAILED: "UPLOAD_FAILED";
    readonly PAYMENT_FAILED: "PAYMENT_FAILED";
    readonly INVALID_WEBHOOK: "INVALID_WEBHOOK";
    readonly WEBHOOK_REPLAY: "WEBHOOK_REPLAY";
    readonly INTERNAL_ERROR: "INTERNAL_ERROR";
    readonly SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE";
    readonly RATE_LIMITED: "RATE_LIMITED";
};
export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];
export declare const HTTP_STATUS: {
    readonly OK: 200;
    readonly CREATED: 201;
    readonly NO_CONTENT: 204;
    readonly BAD_REQUEST: 400;
    readonly UNAUTHORIZED: 401;
    readonly FORBIDDEN: 403;
    readonly NOT_FOUND: 404;
    readonly CONFLICT: 409;
    readonly UNPROCESSABLE: 422;
    readonly TOO_MANY_REQUESTS: 429;
    readonly INTERNAL_ERROR: 500;
    readonly SERVICE_UNAVAILABLE: 503;
};
export type HttpStatus = (typeof HTTP_STATUS)[keyof typeof HTTP_STATUS];
export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type DeepPartial<T> = {
    [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};
export type CreatePayload<T> = Omit<T, "createdAt" | "updatedAt" | "id">;
export type UpdatePayload<T> = Partial<Omit<T, "createdAt" | "updatedAt" | "id">>;
//# sourceMappingURL=common.d.ts.map