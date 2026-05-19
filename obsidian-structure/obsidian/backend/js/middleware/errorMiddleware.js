'use strict';
// js/middleware/errorMiddleware.js
// All errors are printed to the terminal only. Clients receive a sanitized JSON.

const { createLogger } = require('../utils/logger');
const { errorResponse, errorCodeToStatus, HTTP_STATUS, ERROR_CODES } = require('../utils/helpers');
const appConfig = require('../config/appConfig');

const logger = createLogger('errorMiddleware');

// ─── AppError ─────────────────────────────────────────────────────────────────

class AppError extends Error {
  constructor(code, message, details, isOperational = true) {
    super(message);
    this.name          = 'AppError';
    this.code          = code;
    this.statusCode    = errorCodeToStatus(code);
    this.details       = details;
    this.isOperational = isOperational;
    Object.setPrototypeOf(this, new.target.prototype);
    if (Error.captureStackTrace) Error.captureStackTrace(this, this.constructor);
  }
}

// ─── Convenience factories ────────────────────────────────────────────────────

const notFound      = (resource = 'Resource', details) =>
  new AppError(ERROR_CODES.NOT_FOUND, `${resource} not found.`, details);

const unauthorized  = (message = 'Authentication required.', details) =>
  new AppError(ERROR_CODES.UNAUTHORIZED, message, details);

const forbidden     = (message = 'You do not have permission to perform this action.', details) =>
  new AppError(ERROR_CODES.FORBIDDEN, message, details);

const conflict      = (message, details) =>
  new AppError(ERROR_CODES.CONFLICT, message, details);

const validationError = (message, details) =>
  new AppError(ERROR_CODES.VALIDATION_ERROR, message, details);

const internalError = (message = 'An unexpected error occurred.', details) =>
  new AppError(ERROR_CODES.INTERNAL_ERROR, message, details, false);

// ─── Firebase error detector ──────────────────────────────────────────────────

function isFirebaseError(err) {
  return err instanceof Error &&
    ('errorInfo' in err || (typeof err.code === 'string' && err.code.startsWith('auth/')));
}

function mapFirebaseError(err) {
  const fbCode = (err.errorInfo && err.errorInfo.code) || err.code || '';
  const expired = ['auth/id-token-expired', 'auth/session-cookie-expired'];
  const invalid = ['auth/id-token-revoked', 'auth/invalid-id-token', 'auth/invalid-session-cookie', 'auth/argument-error'];

  if (expired.some(c => fbCode.includes(c)))
    return { code: ERROR_CODES.TOKEN_EXPIRED,  status: HTTP_STATUS.UNAUTHORIZED, message: 'Session has expired. Please log in again.' };
  if (invalid.some(c => fbCode.includes(c)))
    return { code: ERROR_CODES.INVALID_TOKEN,  status: HTTP_STATUS.UNAUTHORIZED, message: 'Invalid authentication token.' };
  if (fbCode.includes('auth/user-not-found') || fbCode.includes('auth/email-not-found'))
    return { code: ERROR_CODES.NOT_FOUND,      status: HTTP_STATUS.NOT_FOUND,    message: 'User not found.' };
  if (fbCode.includes('quota-exceeded') || fbCode.includes('resource-exhausted'))
    return { code: ERROR_CODES.SERVICE_UNAVAILABLE, status: HTTP_STATUS.SERVICE_UNAVAILABLE, message: 'Service temporarily unavailable.' };

  return { code: ERROR_CODES.INTERNAL_ERROR, status: HTTP_STATUS.INTERNAL_ERROR, message: 'A Firebase service error occurred.' };
}

// ─── JWT error detector ───────────────────────────────────────────────────────

function isJwtError(err) {
  return err instanceof Error &&
    ['JsonWebTokenError', 'TokenExpiredError', 'NotBeforeError'].includes(err.name);
}

function mapJwtError(err) {
  if (err.name === 'TokenExpiredError')
    return { code: ERROR_CODES.TOKEN_EXPIRED, status: HTTP_STATUS.UNAUTHORIZED, message: 'Token has expired.' };
  return { code: ERROR_CODES.INVALID_TOKEN, status: HTTP_STATUS.UNAUTHORIZED, message: 'Invalid token.' };
}

// ─── 404 handler ─────────────────────────────────────────────────────────────

function notFoundHandler(req, _res, next) {
  next(new AppError(ERROR_CODES.NOT_FOUND, `Route ${req.method} ${req.path} not found.`));
}

// ─── Central error handler ────────────────────────────────────────────────────
// Express identifies a 4-argument function as an error handler.

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, _next) {
  const requestId = req.requestId || 'unknown';

  // 1. AppError (intentional domain errors)
  if (err instanceof AppError) {
    if (!err.isOperational) {
      logger.error('Unrecoverable AppError', err, {
        requestId, code: err.code, uid: req.user && req.user.uid,
      });
    } else {
      logger.warn('Operational AppError', {
        requestId, code: err.code, message: err.message, uid: req.user && req.user.uid,
      });
    }
    return res.status(err.statusCode).json(
      errorResponse(err.code, err.message, appConfig.isDev ? err.details : undefined)
    );
  }

  // 2. Firebase errors
  if (isFirebaseError(err)) {
    const mapped = mapFirebaseError(err);
    logger.warn('Firebase error', { requestId, code: mapped.code, raw: err.message });
    return res.status(mapped.status).json(errorResponse(mapped.code, mapped.message));
  }

  // 3. JWT errors
  if (isJwtError(err)) {
    const mapped = mapJwtError(err);
    logger.warn('JWT error', { requestId, name: err.name });
    return res.status(mapped.status).json(errorResponse(mapped.code, mapped.message));
  }

  // 4. Malformed JSON body
  if (err instanceof SyntaxError && 'body' in err) {
    logger.warn('Malformed JSON body', { requestId });
    return res.status(HTTP_STATUS.BAD_REQUEST).json(
      errorResponse(ERROR_CODES.INVALID_INPUT, 'Malformed JSON in request body.')
    );
  }

  // 5. Unknown / unhandled — full details to terminal, nothing to client
  const unknownErr = err instanceof Error ? err : new Error(String(err));
  logger.error('Unhandled error', unknownErr, {
    requestId,
    uid: req.user && req.user.uid,
    workspaceId: req.user && req.user.workspaceId,
  });

  return res.status(HTTP_STATUS.INTERNAL_ERROR).json(
    errorResponse(
      ERROR_CODES.INTERNAL_ERROR,
      'An unexpected error occurred. Please try again later.',
      appConfig.isDev ? { message: unknownErr.message, stack: unknownErr.stack } : undefined
    )
  );
}

module.exports = {
  AppError, notFound, unauthorized, forbidden, conflict, validationError, internalError,
  notFoundHandler, errorHandler,
};
