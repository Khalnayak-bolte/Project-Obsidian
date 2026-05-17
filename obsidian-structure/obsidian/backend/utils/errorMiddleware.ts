/**
 * backend/middleware/errorHandler.ts
 * Project: Obsidian
 */

import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { createLogger } from "../utils/logger";
import { errorResponse } from "../utils/helpers";
import { ERROR_CODES, HTTP_STATUS } from "../types/common";
import { formatZodErrors } from "../utils/validators";

const logger = createLogger("errorHandler");

// ─── Custom application error ─────────────────────────────────────────────────

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly errorCode: string;
  public readonly details?: unknown;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode: number = HTTP_STATUS.INTERNAL_SERVER_ERROR,
    errorCode: string = ERROR_CODES.INTERNAL_ERROR,
    details?: unknown,
    isOperational = true
  ) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

// ─── Typed error factories ────────────────────────────────────────────────────

export const Errors = {
  badRequest: (message: string, details?: unknown) =>
    new AppError(message, HTTP_STATUS.BAD_REQUEST, ERROR_CODES.BAD_REQUEST, details),

  unauthorized: (message = "Unauthorized") =>
    new AppError(message, HTTP_STATUS.UNAUTHORIZED, ERROR_CODES.UNAUTHORIZED),

  forbidden: (message = "Access denied") =>
    new AppError(message, HTTP_STATUS.FORBIDDEN, ERROR_CODES.FORBIDDEN),

  notFound: (resource: string) =>
    new AppError(
      `${resource} not found`,
      HTTP_STATUS.NOT_FOUND,
      ERROR_CODES.NOT_FOUND
    ),

  conflict: (message: string) =>
    new AppError(message, HTTP_STATUS.CONFLICT, ERROR_CODES.CONFLICT),

  unprocessable: (message: string, details?: unknown) =>
    new AppError(
      message,
      HTTP_STATUS.UNPROCESSABLE_ENTITY,
      ERROR_CODES.VALIDATION_ERROR,
      details
    ),

  tooManyRequests: (retryAfter: number) =>
    new AppError(
      `Too many requests. Retry after ${retryAfter}s.`,
      HTTP_STATUS.TOO_MANY_REQUESTS,
      ERROR_CODES.RATE_LIMITED,
      { retryAfterSeconds: retryAfter }
    ),

  internal: (message = "Internal server error") =>
    new AppError(
      message,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      ERROR_CODES.INTERNAL_ERROR,
      undefined,
      false
    ),

  serviceUnavailable: (service: string) =>
    new AppError(
      `${service} is temporarily unavailable`,
      503,
      ERROR_CODES.INTERNAL_ERROR,
      undefined,
      false
    ),
};

// ─── 404 handler (place before errorHandler in app.ts) ───────────────────────

export function notFoundHandler(req: Request, res: Response): void {
  res.status(HTTP_STATUS.NOT_FOUND).json(
    errorResponse(
      `Route ${req.method} ${req.path} not found`,
      ERROR_CODES.NOT_FOUND
    )
  );
}

// ─── Global error handler ─────────────────────────────────────────────────────

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void {
  // ── Zod validation errors ────────────────────────────────────────────────
  if (err instanceof ZodError) {
    res.status(HTTP_STATUS.UNPROCESSABLE_ENTITY).json(
      errorResponse("Validation failed", ERROR_CODES.VALIDATION_ERROR, {
        fields: formatZodErrors(err),
      })
    );
    return;
  }

  // ── Operational AppErrors ────────────────────────────────────────────────
  if (err instanceof AppError) {
    if (!err.isOperational) {
      logger.error("Non-operational AppError", {
        message: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method,
      });
    }

    res.status(err.statusCode).json(
      errorResponse(err.message, err.errorCode, err.details)
    );
    return;
  }

  // ── Firebase Admin errors ─────────────────────────────────────────────────
  if (isFirebaseError(err)) {
    const { statusCode, message, errorCode } = mapFirebaseError(err);

    logger.warn("Firebase error", {
      code: (err as any).code,
      message,
      path: req.path,
    });

    res.status(statusCode).json(errorResponse(message, errorCode));
    return;
  }

  // ── AWS SDK errors ────────────────────────────────────────────────────────
  if (isAwsError(err)) {
    const { statusCode, message } = mapAwsError(err);

    logger.error("AWS SDK error", {
      code: (err as any).Code ?? (err as any).code,
      message,
      path: req.path,
    });

    res
      .status(statusCode)
      .json(errorResponse(message, ERROR_CODES.INTERNAL_ERROR));
    return;
  }

  // ── Generic / unknown errors ──────────────────────────────────────────────
  const message =
    err instanceof Error ? err.message : "An unexpected error occurred";
  const stack = err instanceof Error ? err.stack : undefined;

  logger.error("Unhandled error", {
    message,
    stack,
    path: req.path,
    method: req.method,
    uid: (req as any).user?.uid,
  });

  const responseMessage =
    process.env.NODE_ENV === "production"
      ? "An unexpected error occurred. Please try again."
      : message;

  res
    .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
    .json(errorResponse(responseMessage, ERROR_CODES.INTERNAL_ERROR));
}

// ─── Firebase error mapping ───────────────────────────────────────────────────

function isFirebaseError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    typeof (err as any).code === "string" &&
    ((err as any).code as string).startsWith("auth/")
  );
}

function mapFirebaseError(err: unknown): {
  statusCode: number;
  message: string;
  errorCode: string;
} {
  const code = (err as any).code as string;

  const map: Record<string, { statusCode: number; message: string; errorCode: string }> = {
    "auth/id-token-expired": {
      statusCode: HTTP_STATUS.UNAUTHORIZED,
      message: "Session expired. Please sign in again.",
      errorCode: ERROR_CODES.UNAUTHORIZED,
    },
    "auth/id-token-revoked": {
      statusCode: HTTP_STATUS.UNAUTHORIZED,
      message: "Session revoked. Please sign in again.",
      errorCode: ERROR_CODES.UNAUTHORIZED,
    },
    "auth/invalid-id-token": {
      statusCode: HTTP_STATUS.UNAUTHORIZED,
      message: "Invalid authentication token.",
      errorCode: ERROR_CODES.UNAUTHORIZED,
    },
    "auth/user-not-found": {
      statusCode: HTTP_STATUS.NOT_FOUND,
      message: "User account not found.",
      errorCode: ERROR_CODES.NOT_FOUND,
    },
    "auth/email-already-exists": {
      statusCode: HTTP_STATUS.CONFLICT,
      message: "An account with this email already exists.",
      errorCode: ERROR_CODES.CONFLICT,
    },
    "auth/insufficient-permission": {
      statusCode: HTTP_STATUS.FORBIDDEN,
      message: "Insufficient permissions.",
      errorCode: ERROR_CODES.FORBIDDEN,
    },
    "auth/too-many-requests": {
      statusCode: HTTP_STATUS.TOO_MANY_REQUESTS,
      message: "Too many requests. Please try again later.",
      errorCode: ERROR_CODES.RATE_LIMITED,
    },
  };

  return (
    map[code] ?? {
      statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR,
      message: "Authentication service error.",
      errorCode: ERROR_CODES.INTERNAL_ERROR,
    }
  );
}

// ─── AWS error mapping ────────────────────────────────────────────────────────

function isAwsError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    ("$metadata" in err || ("Code" in err && "message" in err))
  );
}

function mapAwsError(err: unknown): { statusCode: number; message: string } {
  const code =
    (err as any).Code ??
    (err as any).code ??
    (err as any).name ??
    "UnknownError";

  const map: Record<string, { statusCode: number; message: string }> = {
    NoSuchKey: {
      statusCode: HTTP_STATUS.NOT_FOUND,
      message: "The requested file does not exist.",
    },
    AccessDenied: {
      statusCode: HTTP_STATUS.FORBIDDEN,
      message: "Access to this resource is denied.",
    },
    EntityTooLarge: {
      statusCode: HTTP_STATUS.BAD_REQUEST,
      message: "File exceeds the maximum allowed size.",
    },
    ServiceUnavailable: {
      statusCode: 503,
      message: "Storage service is temporarily unavailable.",
    },
    ThrottlingException: {
      statusCode: HTTP_STATUS.TOO_MANY_REQUESTS,
      message: "Request throttled by AWS. Please retry.",
    },
    NotFoundException: {
      statusCode: HTTP_STATUS.NOT_FOUND,
      message: "Resource not found.",
    },
  };

  return (
    map[code] ?? {
      statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR,
      message: "Cloud service error. Please try again.",
    }
  );
}

// ─── Async handler wrapper ────────────────────────────────────────────────────

/**
 * Wraps an async Express route handler so unhandled promise rejections
 * are forwarded to the global error handler automatically.
 *
 * @example
 * router.post("/join", asyncHandler(voiceController.join));
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    fn(req, res, next).catch(next);
  };
}
