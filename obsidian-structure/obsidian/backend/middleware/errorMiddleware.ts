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
import { ZodError } from "zod";
import { createLogger } from "../utils/logger";
import { errorResponse, errorCodeToStatus } from "../utils/helpers";
import { ERROR_CODES, HTTP_STATUS } from "../types/common";
import type { ErrorCode } from "../types/common";
import appConfig from "../config/appConfig";

const logger = createLogger("errorMiddleware");

// ─── AppError ─────────────────────────────────────────────────────────────────
// All intentional, domain-level errors thrown anywhere in the backend should
// use this class so the handler can map them precisely.

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly details?: unknown;
  public readonly isOperational: boolean;

  constructor(
    code: ErrorCode,
    message: string,
    details?: unknown,
    isOperational = true
  ) {
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

export const notFound = (resource = "Resource", details?: unknown) =>
  new AppError(ERROR_CODES.NOT_FOUND, `${resource} not found.`, details);

export const unauthorized = (message = "Authentication required.", details?: unknown) =>
  new AppError(ERROR_CODES.UNAUTHORIZED, message, details);

export const forbidden = (message = "You do not have permission to perform this action.", details?: unknown) =>
  new AppError(ERROR_CODES.FORBIDDEN, message, details);

export const conflict = (message: string, details?: unknown) =>
  new AppError(ERROR_CODES.CONFLICT, message, details);

export const validationError = (message: string, details?: unknown) =>
  new AppError(ERROR_CODES.VALIDATION_ERROR, message, details);

export const internalError = (message = "An unexpected error occurred.", details?: unknown) =>
  new AppError(ERROR_CODES.INTERNAL_ERROR, message, details, false);

// ─── Zod error flattener ──────────────────────────────────────────────────────

function flattenZodError(err: ZodError): Record<string, string[]> {
  const flat = err.flatten();
  const out: Record<string, string[]> = { ...flat.fieldErrors as Record<string, string[]> };
  if (flat.formErrors.length) out._form = flat.formErrors;
  return out;
}

// ─── Firebase / Google error detector ────────────────────────────────────────

interface FirebaseError extends Error {
  code?: string;
  errorInfo?: { code: string; message: string };
}

function isFirebaseError(err: unknown): err is FirebaseError {
  return (
    err instanceof Error &&
    ("errorInfo" in err || (typeof (err as any).code === "string" && (err as any).code.startsWith("auth/")))
  );
}

function mapFirebaseError(err: FirebaseError): { code: ErrorCode; status: number; message: string } {
  const fbCode = err.errorInfo?.code ?? (err as any).code ?? "";

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

function isJwtError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  return ["JsonWebTokenError", "TokenExpiredError", "NotBeforeError"].includes(err.name);
}

function mapJwtError(err: Error): { code: ErrorCode; status: number; message: string } {
  if (err.name === "TokenExpiredError") {
    return { code: ERROR_CODES.TOKEN_EXPIRED, status: HTTP_STATUS.UNAUTHORIZED, message: "Token has expired." };
  }
  return { code: ERROR_CODES.INVALID_TOKEN, status: HTTP_STATUS.UNAUTHORIZED, message: "Invalid token." };
}

// ─── 404 handler (must be registered before errorHandler) ────────────────────

export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
  next(new AppError(ERROR_CODES.NOT_FOUND, `Route ${req.method} ${req.path} not found.`));
}

// ─── Central error handler ────────────────────────────────────────────────────
// Express identifies a 4-arg function as an error handler — all four params
// must be declared even if some are unused.

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const requestId: string = (req as any).requestId ?? "unknown";

  // ── 1. AppError (intentional domain errors) ──────────────────────────────
  if (err instanceof AppError) {
    if (!err.isOperational) {
      logger.error("Unrecoverable AppError", {
        requestId,
        code: err.code,
        message: err.message,
        stack: err.stack,
        uid: (req as any).user?.uid,
        workspaceId: (req as any).user?.workspaceId,
      });
    } else {
      logger.warn("Operational AppError", {
        requestId,
        code: err.code,
        message: err.message,
        uid: (req as any).user?.uid,
      });
    }

    res.status(err.statusCode).json(
      errorResponse(err.code, err.message, appConfig.isDev ? err.details : undefined)
    );
    return;
  }

  // ── 2. Zod validation errors ──────────────────────────────────────────────
  if (err instanceof ZodError) {
    const details = flattenZodError(err);
    logger.warn("Zod validation failed", { requestId, details });

    res.status(HTTP_STATUS.BAD_REQUEST).json(
      errorResponse(ERROR_CODES.VALIDATION_ERROR, "Request validation failed.", details)
    );
    return;
  }

  // ── 3. Firebase errors ────────────────────────────────────────────────────
  if (isFirebaseError(err)) {
    const mapped = mapFirebaseError(err);
    logger.warn("Firebase error", { requestId, code: mapped.code, raw: (err as Error).message });

    res.status(mapped.status).json(
      errorResponse(mapped.code, mapped.message)
    );
    return;
  }

  // ── 4. JWT errors ─────────────────────────────────────────────────────────
  if (isJwtError(err)) {
    const mapped = mapJwtError(err as Error);
    logger.warn("JWT error", { requestId, name: (err as Error).name });

    res.status(mapped.status).json(
      errorResponse(mapped.code, mapped.message)
    );
    return;
  }

  // ── 5. Express body-parser / payload errors ───────────────────────────────
  if (err instanceof SyntaxError && "body" in err) {
    logger.warn("Malformed JSON body", { requestId });

    res.status(HTTP_STATUS.BAD_REQUEST).json(
      errorResponse(ERROR_CODES.INVALID_INPUT, "Malformed JSON in request body.")
    );
    return;
  }

  // ── 6. Unknown / unhandled errors (never leak internals) ─────────────────
  const unknownErr = err instanceof Error ? err : new Error(String(err));

  logger.error("Unhandled error", {
    requestId,
    message: unknownErr.message,
    stack: unknownErr.stack,
    uid: (req as any).user?.uid,
    workspaceId: (req as any).user?.workspaceId,
  });

  res.status(HTTP_STATUS.INTERNAL_ERROR).json(
    errorResponse(
      ERROR_CODES.INTERNAL_ERROR,
      "An unexpected error occurred. Please try again later.",
      appConfig.isDev ? { message: unknownErr.message, stack: unknownErr.stack } : undefined
    )
  );
}
