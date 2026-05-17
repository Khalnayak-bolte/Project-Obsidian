/**
 * backend/middleware/errorMiddleware.ts
 * Project: Obsidian
 *
 * Centralised Express error-handling middleware.
 *
 * Responsibilities:
 *  1. Define the typed AppError class used across the entire backend.
 *  2. Catch all errors forwarded via next(err) and convert them to a
 *     consistent ApiError response shape.
 *  3. Map known error types (AppError, Zod, Firebase, JWT, Razorpay) to
 *     appropriate HTTP status codes and ERROR_CODES.
 *  4. Never leak internal stack traces to the client in production.
 *  5. Log every error with its requestId for CloudWatch correlation.
 */
import type { Request, Response, NextFunction } from "express";
import type { ErrorCode } from "../types/common";
export declare class AppError extends Error {
    readonly code: ErrorCode;
    readonly statusCode: number;
    readonly details?: unknown;
    readonly isOperational: boolean;
    constructor(code: ErrorCode, message: string, details?: unknown, isOperational?: boolean);
}
export declare const notFound: (resource?: string, details?: unknown) => AppError;
export declare const unauthorized: (message?: string, details?: unknown) => AppError;
export declare const forbidden: (message?: string, details?: unknown) => AppError;
export declare const conflict: (message: string, details?: unknown) => AppError;
export declare const validationError: (message: string, details?: unknown) => AppError;
export declare const internalError: (message?: string, details?: unknown) => AppError;
export declare function notFoundHandler(req: Request, _res: Response, next: NextFunction): void;
export declare function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void;
//# sourceMappingURL=errorMiddleware.d.ts.map