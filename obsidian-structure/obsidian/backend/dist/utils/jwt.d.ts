/**
 * backend/utils/jwt.ts
 * Project: Obsidian
 *
 * JWT validation, session management, and token utilities.
 * Primary token issuer is Firebase Auth; this module:
 *   - Verifies Firebase ID tokens via Firebase Admin SDK
 *   - Builds and validates lightweight internal signed tokens
 *     (used for short-lived operations: voice join, signed upload, webhook replay prevention)
 *   - Provides Express middleware factories for route protection
 *   - Handles refresh-token rotation tracking in Firestore
 */
import type { Request, Response, NextFunction } from "express";
import type { DecodedFirebaseToken, UserSession, DeviceSession } from "../types/auth";
/** Header name where clients send their Firebase ID token. */
export declare const AUTH_HEADER = "Authorization";
/** Prefix expected before the token value. */
export declare const BEARER_PREFIX = "Bearer ";
/** Claims carried by an internal short-lived operation token. */
export interface InternalTokenClaims {
    /** Firebase UID of the acting user. */
    uid: string;
    /** Workspace the action is scoped to. */
    workspaceId: string;
    /** Discriminator for the token's intended purpose. */
    purpose: "voice_join" | "signed_upload" | "workspace_invite" | "password_reset" | "email_verify";
    /** Additional free-form context (e.g. channelId, fileKey). */
    context?: Record<string, string>;
    /** Issued-at epoch seconds. */
    iat: number;
    /** Expiry epoch seconds. */
    exp: number;
    /** Random nonce for replay prevention. */
    jti: string;
}
/** Result of a successful Firebase token verification. */
export interface VerifiedFirebaseToken {
    decoded: DecodedFirebaseToken;
    session: UserSession;
}
/** Options for internal token generation. */
export interface InternalTokenOptions {
    uid: string;
    workspaceId: string;
    purpose: InternalTokenClaims["purpose"];
    context?: Record<string, string>;
    /** TTL in seconds. Defaults per purpose if not supplied. */
    ttlSeconds?: number;
}
/**
 * Creates a compact, HMAC-signed token (header.payload.signature) for
 * short-lived internal operations. NOT a standards-compliant JWT —
 * kept intentionally minimal to avoid pulling in a full JWT library.
 */
export declare function createInternalToken(options: InternalTokenOptions): string;
/**
 * Verifies and decodes an internal Obsidian token.
 * Throws a descriptive Error on any validation failure.
 */
export declare function verifyInternalToken(token: string): InternalTokenClaims;
/**
 * Verifies an internal token AND asserts it matches the expected purpose.
 * Convenience wrapper used by voice/upload handlers.
 */
export declare function verifyInternalTokenForPurpose(token: string, expectedPurpose: InternalTokenClaims["purpose"]): InternalTokenClaims;
/**
 * Extracts the raw Bearer token from an Authorization header value.
 * Returns null if the header is absent or malformed.
 */
export declare function extractBearerToken(authHeader?: string): string | null;
/**
 * Verifies a Firebase ID token and resolves the associated Firestore user
 * document to build a full UserSession.
 *
 * @param idToken Raw Firebase ID token string from the client.
 * @param checkRevoked Whether to verify the token hasn't been revoked (adds ~100ms latency).
 */
export declare function verifyFirebaseToken(idToken: string, checkRevoked?: boolean): Promise<VerifiedFirebaseToken>;
/**
 * Registers or refreshes a device session entry in Firestore.
 * Called after every successful token verification to power the
 * "active sessions" management UI.
 */
export declare function upsertDeviceSession(uid: string, deviceInfo: Pick<DeviceSession, "deviceId" | "userAgent" | "ipAddress">): Promise<void>;
/**
 * Marks all device sessions for a user as inactive.
 * Called on explicit sign-out or admin-forced logout.
 */
export declare function revokeAllDeviceSessions(uid: string): Promise<void>;
/**
 * Middleware: requires a valid Firebase ID token.
 * Attaches `req.user` (UserSession) and `req.decodedToken` on success.
 *
 * @param options.checkRevoked  Enable revocation check (slower; use for sensitive ops).
 * @param options.trackDevice   Register the request in device sessions table.
 */
export declare function requireAuth(options?: {
    checkRevoked?: boolean;
    trackDevice?: boolean;
}): (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Middleware: requires a valid Firebase token AND that the workspace in the
 * request body / params / query matches the user's workspaceId claim.
 *
 * Must be placed AFTER `requireAuth`.
 */
export declare function requireWorkspaceAccess(): (req: Request, res: Response, next: NextFunction) => void;
/**
 * Middleware: verifies an internal Obsidian token passed via the
 * `x-obs-token` header or `obsToken` body field.
 * Attaches `req.internalClaims` on success.
 *
 * @param purpose  Expected token purpose; rejects tokens for other operations.
 */
export declare function requireInternalToken(purpose: InternalTokenClaims["purpose"]): (req: Request, res: Response, next: NextFunction) => void;
/**
 * Middleware: requires the authenticated user to have a specific permission.
 * Must be placed AFTER `requireAuth`.
 *
 * @param permission Key from the UserSession.permissions map.
 */
export declare function requirePermission(permission: string): (req: Request, res: Response, next: NextFunction) => void;
/**
 * Returns true if the epoch-second timestamp is still in the future.
 */
export declare function isTokenFresh(expEpochSeconds: number): boolean;
/**
 * Computes how many seconds remain until a token expires.
 * Returns 0 if already expired.
 */
export declare function tokenSecondsRemaining(expEpochSeconds: number): number;
/**
 * Derives a deterministic device ID from uid + IP + User-Agent.
 * Useful when clients don't supply an explicit `x-device-id` header.
 */
export declare function deriveDeviceId(uid: string, ip: string, userAgent: string): string;
/**
 * Generates a cryptographically random opaque refresh token string.
 * Stored hashed in Firestore; raw value returned to the client once.
 */
export declare function generateRefreshToken(): {
    raw: string;
    hashed: string;
};
/**
 * Hashes a raw refresh token for safe Firestore storage comparison.
 */
export declare function hashRefreshToken(raw: string): string;
//# sourceMappingURL=jwt.d.ts.map