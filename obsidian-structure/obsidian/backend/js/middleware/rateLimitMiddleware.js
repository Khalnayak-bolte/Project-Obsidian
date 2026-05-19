'use strict';
// js/middleware/rateLimitMiddleware.js
// Simple in-memory rate limiter — no external dependencies needed.

const { createLogger } = require('../utils/logger');
const { errorResponse, HTTP_STATUS, ERROR_CODES } = require('../utils/helpers');

const logger = createLogger('rateLimit');

// Map<key, { count, resetAt }>
const store = new Map();

function rateLimiter(windowMs, max) {
  return (req, res, next) => {
    const key      = req.ip || 'unknown';
    const now      = Date.now();
    const entry    = store.get(key);

    if (!entry || now > entry.resetAt) {
      store.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    entry.count += 1;

    if (entry.count > max) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      logger.warn('Rate limit exceeded', { ip: key, count: entry.count, max });
      res.setHeader('Retry-After', retryAfter);
      return res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json(
        errorResponse(ERROR_CODES.RATE_LIMITED, `Too many requests. Retry after ${retryAfter}s.`)
      );
    }

    next();
  };
}

// Pre-built limiters matching the TS version's RATE_LIMITS export
const RATE_LIMITS = {
  LOGIN:          rateLimiter(60_000, 10),
  REGISTER:       rateLimiter(60_000, 5),
  PASSWORD_RESET: rateLimiter(60_000, 5),
  MESSAGES:       rateLimiter(60_000, 60),
  VOICE_JOIN:     rateLimiter(60_000, 20),
  UPLOADS:        rateLimiter(60_000, 15),
  WEBHOOK:        rateLimiter(60_000, 60),
  DEFAULT:        rateLimiter(60_000, 100),
};

module.exports = { rateLimiter, RATE_LIMITS };
