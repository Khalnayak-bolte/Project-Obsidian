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
import { ZodError } from "zod";
import { createLogger } from "../utils/logger";
import { errorResponse, errorCodeToStatus } from "../utils/helpers";
import { ERROR_CODES, HTTP_STATUS } from "../types/common";
import appConfig from "../config/appConfig";
const logger = createLogger("errorMiddleware");
// ─── AppError ─────────────────────────────────────────────────────────────────
// All intentional, domain-level errors thrown anywhere in the backend should
// use this class so the handler can map them precisely.
export class AppError extends Error {
    code;
    statusCode;
    details;
    isOperational;
    constructor(code, message, details, isOperational = true) {
        super(message);
        this.name = "AppError";
        this.code = code;
        this.statusCode = errorCodeToStatus(code);
        this.details = details;
        this.isOperational = isOperational;
        // Restore prototype chain so instanceof checks work after transpilation
        Object.setPrototypeOf(this, new.target.prototype);
        Error.captureStackTrace(this, this.constructor);
    }
}
// ─── Convenience factory helpers ──────────────────────────────────────────────
export const notFound = (resource = "Resource", details) => new AppError(ERROR_CODES.NOT_FOUND, `${resource} not found.`, details);
export const unauthorized = (message = "Authentication required.", details) => new AppError(ERROR_CODES.UNAUTHORIZED, message, details);
export const forbidden = (message = "You do not have permission to perform this action.", details) => new AppError(ERROR_CODES.FORBIDDEN, message, details);
export const conflict = (message, details) => new AppError(ERROR_CODES.CONFLICT, message, details);
export const validationError = (message, details) => new AppError(ERROR_CODES.VALIDATION_ERROR, message, details);
export const internalError = (message = "An unexpected error occurred.", details) => new AppError(ERROR_CODES.INTERNAL_ERROR, message, details, false);
// ─── Zod error flattener ──────────────────────────────────────────────────────
function flattenZodError(err) {
    const flat = err.flatten();
    const out = { ...flat.fieldErrors };
    if (flat.formErrors.length)
        out._form = flat.formErrors;
    return out;
}
function isFirebaseError(err) {
    return (err instanceof Error &&
        ("errorInfo" in err || (typeof err.code === "string" && err.code.startsWith("auth/"))));
}
function mapFirebaseError(err) {
    const fbCode = err.errorInfo?.code ?? err.code ?? "";
    const authExpired = ["auth/id-token-expired", "auth/session-cookie-expired"];
    const authInvalid = [
        "auth/id-token-revoked",
        "auth/invalid-id-token",
        "auth/invalid-session-cookie",
        "auth/argument-error",
    ];
    if (authExpired.some((c) => fbCode.includes(c))) {
        return { code: ERROR_CODES.TOKEN_EXPIRED, status: HTTP_STATUS.UNAUTHORIZED, message: "Session has expired. Please log in again." };
    }
    if (authInvalid.some((c) => fbCode.includes(c))) {
        return { code: ERROR_CODES.INVALID_TOKEN, status: HTTP_STATUS.UNAUTHORIZED, message: "Invalid authentication token." };
    }
    if (fbCode.includes("auth/user-not-found") || fbCode.includes("auth/email-not-found")) {
        return { code: ERROR_CODES.NOT_FOUND, status: HTTP_STATUS.NOT_FOUND, message: "User not found." };
    }
    if (fbCode.includes("quota-exceeded") || fbCode.includes("resource-exhausted")) {
        return { code: ERROR_CODES.SERVICE_UNAVAILABLE, status: HTTP_STATUS.SERVICE_UNAVAILABLE, message: "Service temporarily unavailable. Please retry shortly." };
    }
    return { code: ERROR_CODES.INTERNAL_ERROR, status: HTTP_STATUS.INTERNAL_ERROR, message: "A Firebase service error occurred." };
}
// ─── JWT error detector ───────────────────────────────────────────────────────
function isJwtError(err) {
    if (!(err instanceof Error))
        return false;
    return ["JsonWebTokenError", "TokenExpiredError", "NotBeforeError"].includes(err.name);
}
function mapJwtError(err) {
    if (err.name === "TokenExpiredError") {
        return { code: ERROR_CODES.TOKEN_EXPIRED, status: HTTP_STATUS.UNAUTHORIZED, message: "Token has expired." };
    }
    return { code: ERROR_CODES.INVALID_TOKEN, status: HTTP_STATUS.UNAUTHORIZED, message: "Invalid token." };
}
// ─── 404 handler (must be registered before errorHandler) ────────────────────
export function notFoundHandler(req, _res, next) {
    next(new AppError(ERROR_CODES.NOT_FOUND, `Route ${req.method} ${req.path} not found.`));
}
// ─── Central error handler ────────────────────────────────────────────────────
// Express identifies a 4-arg function as an error handler — all four params
// must be declared even if some are unused.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err, req, res, _next) {
    const requestId = req.requestId ?? "unknown";
    // ── 1. AppError (intentional domain errors) ──────────────────────────────
    if (err instanceof AppError) {
        if (!err.isOperational) {
            logger.error("Unrecoverable AppError", {
                requestId,
                code: err.code,
                message: err.message,
                stack: err.stack,
                uid: req.user?.uid,
                workspaceId: req.user?.workspaceId,
            });
        }
        else {
            logger.warn("Operational AppError", {
                requestId,
                code: err.code,
                message: err.message,
                uid: req.user?.uid,
            });
        }
        res.status(err.statusCode).json(errorResponse(err.code, err.message, appConfig.isDev ? err.details : undefined));
        return;
    }
    // ── 2. Zod validation errors ──────────────────────────────────────────────
    if (err instanceof ZodError) {
        const details = flattenZodError(err);
        logger.warn("Zod validation failed", { requestId, details });
        res.status(HTTP_STATUS.BAD_REQUEST).json(errorResponse(ERROR_CODES.VALIDATION_ERROR, "Request validation failed.", details));
        return;
    }
    // ── 3. Firebase errors ────────────────────────────────────────────────────
    if (isFirebaseError(err)) {
        const mapped = mapFirebaseError(err);
        logger.warn("Firebase error", { requestId, code: mapped.code, raw: err.message });
        res.status(mapped.status).json(errorResponse(mapped.code, mapped.message));
        return;
    }
    // ── 4. JWT errors ─────────────────────────────────────────────────────────
    if (isJwtError(err)) {
        const mapped = mapJwtError(err);
        logger.warn("JWT error", { requestId, name: err.name });
        res.status(mapped.status).json(errorResponse(mapped.code, mapped.message));
        return;
    }
    // ── 5. Express body-parser / payload errors ───────────────────────────────
    if (err instanceof SyntaxError && "body" in err) {
        logger.warn("Malformed JSON body", { requestId });
        res.status(HTTP_STATUS.BAD_REQUEST).json(errorResponse(ERROR_CODES.INVALID_INPUT, "Malformed JSON in request body."));
        return;
    }
    // ── 6. Unknown / unhandled errors (never leak internals) ─────────────────
    const unknownErr = err instanceof Error ? err : new Error(String(err));
    logger.error("Unhandled error", {
        requestId,
        message: unknownErr.message,
        stack: unknownErr.stack,
        uid: req.user?.uid,
        workspaceId: req.user?.workspaceId,
    });
    res.status(HTTP_STATUS.INTERNAL_ERROR).json(errorResponse(ERROR_CODES.INTERNAL_ERROR, "An unexpected error occurred. Please try again later.", appConfig.isDev ? { message: unknownErr.message, stack: unknownErr.stack } : undefined));
}
//# sourceMappingURL=errorMiddleware.js.map