/**
 * backend/middleware/errorHandler.ts
 * Project: Obsidian
 */
import type { Request, Response, NextFunction } from "express";
export declare class AppError extends Error {
    readonly statusCode: number;
    readonly errorCode: string;
    readonly details?: unknown;
    readonly isOperational: boolean;
    constructor(message: string, statusCode?: number, errorCode?: string, details?: unknown, isOperational?: boolean);
}
export declare const Errors: {
    badRequest: (message: string, details?: unknown) => AppError;
    unauthorized: (message?: string) => AppError;
    forbidden: (message?: string) => AppError;
    notFound: (resource: string) => AppError;
    conflict: (message: string) => AppError;
    unprocessable: (message: string, details?: unknown) => AppError;
    tooManyRequests: (retryAfter: number) => AppError;
    internal: (message?: string) => AppError;
    serviceUnavailable: (service: string) => AppError;
};
export declare function notFoundHandler(req: Request, res: Response): void;
export declare function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void;
/**
 * Wraps an async Express route handler so unhandled promise rejections
 * are forwarded to the global error handler automatically.
 *
 * @example
 * router.post("/join", asyncHandler(voiceController.join));
 */
export declare function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>): (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=errorMiddleware.d.ts.map