/**
 * backend/middleware/rateLimitMiddleware.ts
 * Project: Obsidian
 *
 * Re-exports the rate limiting middleware from utils/rateLimitMiddleware.ts
 * so it can be imported from either location consistently.
 *
 * The full implementation lives in utils/rateLimitMiddleware.ts which contains:
 *  - RateLimitConfig interface
 *  - In-memory L1 + Firestore L2 sliding window logic
 *  - rateLimiter() middleware factory
 *  - customRateLimiter() for one-off limits
 *  - RATE_LIMITS pre-configured instances (LOGIN, MESSAGES, VOICE_JOIN, etc.)
 */
export { rateLimiter, customRateLimiter, RATE_LIMITS, } from "../utils/rateLimitMiddleware";
//# sourceMappingURL=rateLimitMiddleware.js.map