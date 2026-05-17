/**
 * backend/middleware/rateLimiter.ts
 * Project: Obsidian
 */

import type { Request, Response, NextFunction } from "express";
import { db } from "../config/firebase";
import { HTTP_STATUS, ERROR_CODES } from "../types/common";
import { errorResponse } from "../utils/helpers";
import { createLogger } from "../utils/logger";
import { APP_CONFIG } from "../config/appConfig";

const logger = createLogger("rateLimiter");

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RateLimitConfig {
  /** Maximum requests allowed within the window. */
  limit: number;
  /** Window duration in seconds. */
  windowSeconds: number;
  /** Key prefix to namespace this limiter (e.g. "login", "messages"). */
  keyPrefix: string;
  /**
   * How to derive the bucket key from the request.
   * "ip"        — per originating IP (unauthenticated routes)
   * "user"      — per Firebase UID (authenticated routes)
   * "workspace" — per workspaceId (collaborative limits)
   * "composite" — uid + workspaceId combined
   */
  strategy: "ip" | "user" | "workspace" | "composite";
  /** Skip limiting for these UIDs (e.g. internal service accounts). */
  skipUids?: string[];
  /** Custom response message. */
  message?: string;
}

interface BucketEntry {
  count: number;
  resetAt: number; // epoch ms
}

// ─── In-memory sliding window cache ──────────────────────────────────────────
// Reduces Firestore reads for high-frequency endpoints (messages, presence).
// The cache is per Lambda instance; Firestore acts as the authoritative store
// for cross-instance consistency on security-sensitive endpoints (login).

const memCache = new Map<string, BucketEntry>();

/** Evict expired entries every 5 minutes to prevent memory leaks. */
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of memCache.entries()) {
    if (entry.resetAt <= now) memCache.delete(key);
  }
}, 5 * 60 * 1000);

// ─── Core sliding-window logic ────────────────────────────────────────────────

/**
 * Checks and increments the rate-limit counter for a given bucket key.
 * Uses in-memory cache as L1 and Firestore as L2.
 *
 * Returns { allowed, remaining, resetAt }.
 */
async function checkLimit(
  bucketKey: string,
  config: RateLimitConfig,
  useFirestore: boolean
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const now = Date.now();
  const windowMs = config.windowSeconds * 1000;

  // ── L1: memory cache ──────────────────────────────────────────────────────
  const cached = memCache.get(bucketKey);

  if (cached && cached.resetAt > now) {
    // Window still active
    cached.count += 1;
    const allowed = cached.count <= config.limit;
    const remaining = Math.max(0, config.limit - cached.count);
    return { allowed, remaining, resetAt: cached.resetAt };
  }

  // Window expired or no entry — start a new window
  const resetAt = now + windowMs;
  memCache.set(bucketKey, { count: 1, resetAt });

  if (!useFirestore) {
    return { allowed: true, remaining: config.limit - 1, resetAt };
  }

  // ── L2: Firestore (for security-sensitive endpoints) ──────────────────────
  try {
    const ref = db.collection("_rateLimits").doc(bucketKey);

    const result = await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const data = snap.data() as { count: number; resetAt: number } | undefined;

      if (!data || data.resetAt <= now) {
        // New window
        tx.set(ref, { count: 1, resetAt, updatedAt: now });
        return { count: 1, resetAt };
      }

      const newCount = data.count + 1;
      tx.update(ref, { count: newCount, updatedAt: now });
      return { count: newCount, resetAt: data.resetAt };
    });

    // Sync memory cache with Firestore result
    memCache.set(bucketKey, { count: result.count, resetAt: result.resetAt });

    const allowed = result.count <= config.limit;
    const remaining = Math.max(0, config.limit - result.count);
    return { allowed, remaining, resetAt: result.resetAt };
  } catch (err) {
    // Fail open — if Firestore is unreachable, don't block the request
    logger.error("Firestore rate-limit check failed, failing open", {
      bucketKey,
      error: err,
    });
    return { allowed: true, remaining: 0, resetAt: now + windowMs };
  }
}

// ─── Bucket key builder ───────────────────────────────────────────────────────

function buildBucketKey(req: Request, config: RateLimitConfig): string {
  const session = (req as any).user;
  const uid: string = session?.uid ?? "anon";
  const workspaceId: string =
    session?.workspaceId ??
    req.params.workspaceId ??
    req.body?.workspaceId ??
    "none";
  const ip: string = (req.ip ?? "0.0.0.0").replace(/[^a-z0-9.:-]/gi, "_");

  switch (config.strategy) {
    case "ip":
      return `${config.keyPrefix}:ip:${ip}`;
    case "user":
      return `${config.keyPrefix}:uid:${uid}`;
    case "workspace":
      return `${config.keyPrefix}:ws:${workspaceId}`;
    case "composite":
      return `${config.keyPrefix}:cmp:${uid}:${workspaceId}`;
    default:
      return `${config.keyPrefix}:ip:${ip}`;
  }
}

// ─── Middleware factory ───────────────────────────────────────────────────────

/**
 * Creates a rate-limiting middleware for the given config.
 *
 * Security-sensitive endpoints (login, password reset) use Firestore for
 * cross-instance consistency. High-frequency endpoints (messages, presence)
 * use the in-memory cache only for minimal latency.
 *
 * @example
 * router.post("/login", rateLimiter(RATE_LIMITS.LOGIN), authController.login);
 */
export function rateLimiter(config: RateLimitConfig) {
  // Security-sensitive prefixes that require Firestore backing
  const firestoreBackedPrefixes = new Set([
    "login",
    "register",
    "password_reset",
    "magic_link",
    "voice_join",
    "webhook",
  ]);

  const useFirestore = firestoreBackedPrefixes.has(config.keyPrefix);

  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    // Allow internal service accounts to bypass
    const uid: string | undefined = (req as any).user?.uid;
    if (uid && config.skipUids?.includes(uid)) {
      next();
      return;
    }

    const bucketKey = buildBucketKey(req, config);

    try {
      const { allowed, remaining, resetAt } = await checkLimit(
        bucketKey,
        config,
        useFirestore
      );

      // Always attach rate-limit headers
      res.setHeader("X-RateLimit-Limit", config.limit);
      res.setHeader("X-RateLimit-Remaining", remaining);
      res.setHeader(
        "X-RateLimit-Reset",
        Math.ceil(resetAt / 1000).toString()
      );
      res.setHeader(
        "X-RateLimit-Window",
        config.windowSeconds.toString()
      );

      if (!allowed) {
        const retryAfter = Math.ceil((resetAt - Date.now()) / 1000);
        res.setHeader("Retry-After", retryAfter.toString());

        logger.warn("Rate limit exceeded", {
          bucketKey,
          limit: config.limit,
          window: config.windowSeconds,
          ip: req.ip,
          uid,
        });

        res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json(
          errorResponse(
            config.message ??
              `Too many requests. Please retry after ${retryAfter} seconds.`,
            ERROR_CODES.RATE_LIMITED,
            { retryAfterSeconds: retryAfter }
          )
        );
        return;
      }

      next();
    } catch (err) {
      // Fail open — rate limiter errors must never block legitimate traffic
      logger.error("Rate limiter threw unexpectedly, failing open", {
        bucketKey,
        error: err,
      });
      next();
    }
  };
}

// ─── Pre-configured limiters (matching appConfig.ts) ─────────────────────────

export const RATE_LIMITS = {
  /** 10 attempts / minute per IP — login brute-force protection. */
  LOGIN: rateLimiter({
    keyPrefix: "login",
    limit: APP_CONFIG.RATE_LIMITS.LOGIN_PER_MINUTE,
    windowSeconds: 60,
    strategy: "ip",
    message: "Too many login attempts. Please wait a minute and try again.",
  }),

  /** 5 registrations / hour per IP. */
  REGISTER: rateLimiter({
    keyPrefix: "register",
    limit: 5,
    windowSeconds: 3600,
    strategy: "ip",
    message: "Too many registration attempts.",
  }),

  /** 3 password-reset requests / hour per IP. */
  PASSWORD_RESET: rateLimiter({
    keyPrefix: "password_reset",
    limit: 3,
    windowSeconds: 3600,
    strategy: "ip",
    message: "Too many password reset requests. Please try again later.",
  }),

  /** 3 magic-link requests / hour per IP. */
  MAGIC_LINK: rateLimiter({
    keyPrefix: "magic_link",
    limit: 3,
    windowSeconds: 3600,
    strategy: "ip",
  }),

  /** 60 messages / minute per user (workspace-scoped). */
  MESSAGES: rateLimiter({
    keyPrefix: "messages",
    limit: APP_CONFIG.RATE_LIMITS.MESSAGES_PER_MINUTE,
    windowSeconds: 60,
    strategy: "composite",
  }),

  /** 20 voice-join requests / minute per user. */
  VOICE_JOIN: rateLimiter({
    keyPrefix: "voice_join",
    limit: APP_CONFIG.RATE_LIMITS.VOICE_JOIN_PER_MINUTE,
    windowSeconds: 60,
    strategy: "user",
    message: "Too many voice join attempts. Please wait before reconnecting.",
  }),

  /** 15 upload-URL requests / minute per user. */
  UPLOADS: rateLimiter({
    keyPrefix: "uploads",
    limit: APP_CONFIG.RATE_LIMITS.UPLOADS_PER_MINUTE,
    windowSeconds: 60,
    strategy: "user",
  }),

  /** 30 channel-creation requests / hour per workspace. */
  CHANNEL_CREATE: rateLimiter({
    keyPrefix: "channel_create",
    limit: 30,
    windowSeconds: 3600,
    strategy: "workspace",
  }),

  /** 10 invite dispatches / hour per workspace. */
  INVITE: rateLimiter({
    keyPrefix: "invite",
    limit: 10,
    windowSeconds: 3600,
    strategy: "workspace",
  }),

  /** 20 search requests / minute per user. */
  SEARCH: rateLimiter({
    keyPrefix: "search",
    limit: 20,
    windowSeconds: 60,
    strategy: "user",
  }),

  /** Strict: 5 webhook deliveries / minute per source IP. */
  WEBHOOK: rateLimiter({
    keyPrefix: "webhook",
    limit: 5,
    windowSeconds: 60,
    strategy: "ip",
    message: "Webhook rate limit exceeded.",
  }),

  /** Admin actions: 100 / minute per user. */
  ADMIN: rateLimiter({
    keyPrefix: "admin",
    limit: 100,
    windowSeconds: 60,
    strategy: "user",
  }),
} as const;

// ─── Dynamic limiter factory ──────────────────────────────────────────────────

/**
 * Builds a one-off rate limiter with custom parameters.
 * Use when the pre-configured limiters don't fit a specific route.
 *
 * @example
 * router.post("/bulk-delete", customRateLimiter("bulk_delete", 5, 60, "user"), ...);
 */
export function customRateLimiter(
  keyPrefix: string,
  limit: number,
  windowSeconds: number,
  strategy: RateLimitConfig["strategy"] = "user",
  message?: string
) {
  return rateLimiter({ keyPrefix, limit, windowSeconds, strategy, message });
}
