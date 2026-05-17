/**
 * backend/middleware/rateLimiter.ts
 * Project: Obsidian
 */
import type { Request, Response, NextFunction } from "express";
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
export declare function rateLimiter(config: RateLimitConfig): (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const RATE_LIMITS: {
    /** 10 attempts / minute per IP — login brute-force protection. */
    readonly LOGIN: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    /** 5 registrations / hour per IP. */
    readonly REGISTER: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    /** 3 password-reset requests / hour per IP. */
    readonly PASSWORD_RESET: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    /** 3 magic-link requests / hour per IP. */
    readonly MAGIC_LINK: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    /** 60 messages / minute per user (workspace-scoped). */
    readonly MESSAGES: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    /** 20 voice-join requests / minute per user. */
    readonly VOICE_JOIN: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    /** 15 upload-URL requests / minute per user. */
    readonly UPLOADS: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    /** 30 channel-creation requests / hour per workspace. */
    readonly CHANNEL_CREATE: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    /** 10 invite dispatches / hour per workspace. */
    readonly INVITE: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    /** 20 search requests / minute per user. */
    readonly SEARCH: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    /** Strict: 5 webhook deliveries / minute per source IP. */
    readonly WEBHOOK: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    /** Admin actions: 100 / minute per user. */
    readonly ADMIN: (req: Request, res: Response, next: NextFunction) => Promise<void>;
};
/**
 * Builds a one-off rate limiter with custom parameters.
 * Use when the pre-configured limiters don't fit a specific route.
 *
 * @example
 * router.post("/bulk-delete", customRateLimiter("bulk_delete", 5, 60, "user"), ...);
 */
export declare function customRateLimiter(keyPrefix: string, limit: number, windowSeconds: number, strategy?: RateLimitConfig["strategy"], message?: string): (req: Request, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=rateLimitMiddleware.d.ts.map