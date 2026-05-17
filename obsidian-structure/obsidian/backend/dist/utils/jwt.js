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
import * as crypto from "crypto";
import { auth, db, COLLECTIONS } from "../config/firebase";
import { createLogger } from "./logger";
import { errorResponse } from "./helpers";
import { ERROR_CODES, HTTP_STATUS } from "../types/common";
// ─── Logger ──────────────────────────────────────────────────────────────────
const logger = createLogger("jwt");
// ─── Constants ───────────────────────────────────────────────────────────────
/** Header name where clients send their Firebase ID token. */
export const AUTH_HEADER = "Authorization";
/** Prefix expected before the token value. */
export const BEARER_PREFIX = "Bearer ";
/**
 * Internal HMAC secret used for short-lived operation tokens.
 * In production this MUST be loaded from AWS Secrets Manager at cold-start.
 * The fallback value here is only safe for local/dev environments.
 */
const INTERNAL_SECRET = process.env.INTERNAL_JWT_SECRET ??
    "obsidian-dev-secret-change-in-production-32chars";
/** Algorithm used for internal HMAC signing. */
const HMAC_ALGORITHM = "sha256";
/** Default TTLs (seconds) per token purpose. */
const PURPOSE_TTL = {
    voice_join: 300, // 5 minutes
    signed_upload: 600, // 10 minutes
    workspace_invite: 60 * 60 * 24 * 7, // 7 days
    password_reset: 60 * 60, // 1 hour
    email_verify: 60 * 60 * 24, // 24 hours
};
// ─── Internal token helpers ──────────────────────────────────────────────────
/**
 * Base64url-encodes a Buffer or string (no padding).
 */
function b64url(input) {
    const buf = Buffer.isBuffer(input) ? input : Buffer.from(input, "utf8");
    return buf.toString("base64url");
}
/**
 * Decodes a base64url string to a UTF-8 string.
 */
function b64urlDecode(input) {
    return Buffer.from(input, "base64url").toString("utf8");
}
/**
 * Creates a compact, HMAC-signed token (header.payload.signature) for
 * short-lived internal operations. NOT a standards-compliant JWT —
 * kept intentionally minimal to avoid pulling in a full JWT library.
 */
export function createInternalToken(options) {
    const now = Math.floor(Date.now() / 1000);
    const ttl = options.ttlSeconds ?? PURPOSE_TTL[options.purpose];
    const claims = {
        uid: options.uid,
        workspaceId: options.workspaceId,
        purpose: options.purpose,
        context: options.context,
        iat: now,
        exp: now + ttl,
        jti: crypto.randomBytes(16).toString("hex"),
    };
    const header = b64url(JSON.stringify({ alg: "HS256", typ: "OBS" }));
    const payload = b64url(JSON.stringify(claims));
    const signingInput = `${header}.${payload}`;
    const signature = crypto
        .createHmac(HMAC_ALGORITHM, INTERNAL_SECRET)
        .update(signingInput)
        .digest("base64url");
    return `${signingInput}.${signature}`;
}
/**
 * Verifies and decodes an internal Obsidian token.
 * Throws a descriptive Error on any validation failure.
 */
export function verifyInternalToken(token) {
    const parts = token.split(".");
    if (parts.length !== 3) {
        throw new Error("Malformed internal token: expected 3 segments");
    }
    const [header, payload, signature] = parts;
    const signingInput = `${header}.${payload}`;
    // Constant-time HMAC comparison to prevent timing attacks
    const expected = crypto
        .createHmac(HMAC_ALGORITHM, INTERNAL_SECRET)
        .update(signingInput)
        .digest("base64url");
    const expectedBuf = Buffer.from(expected);
    const receivedBuf = Buffer.from(signature);
    if (expectedBuf.length !== receivedBuf.length ||
        !crypto.timingSafeEqual(expectedBuf, receivedBuf)) {
        throw new Error("Internal token signature mismatch");
    }
    // Decode header and validate type
    let headerObj;
    try {
        headerObj = JSON.parse(b64urlDecode(header));
    }
    catch {
        throw new Error("Internal token header is not valid JSON");
    }
    if (headerObj.typ !== "OBS" || headerObj.alg !== "HS256") {
        throw new Error("Internal token type or algorithm mismatch");
    }
    // Decode claims
    let claims;
    try {
        claims = JSON.parse(b64urlDecode(payload));
    }
    catch {
        throw new Error("Internal token payload is not valid JSON");
    }
    // Expiry check
    const now = Math.floor(Date.now() / 1000);
    if (claims.exp <= now) {
        throw new Error(`Internal token expired at ${new Date(claims.exp * 1000).toISOString()}`);
    }
    // Structural validation
    if (!claims.uid || !claims.workspaceId || !claims.purpose || !claims.jti) {
        throw new Error("Internal token missing required claims");
    }
    return claims;
}
/**
 * Verifies an internal token AND asserts it matches the expected purpose.
 * Convenience wrapper used by voice/upload handlers.
 */
export function verifyInternalTokenForPurpose(token, expectedPurpose) {
    const claims = verifyInternalToken(token);
    if (claims.purpose !== expectedPurpose) {
        throw new Error(`Token purpose mismatch: expected "${expectedPurpose}", got "${claims.purpose}"`);
    }
    return claims;
}
// ─── Firebase token verification ─────────────────────────────────────────────
/**
 * Extracts the raw Bearer token from an Authorization header value.
 * Returns null if the header is absent or malformed.
 */
export function extractBearerToken(authHeader) {
    if (!authHeader || !authHeader.startsWith(BEARER_PREFIX))
        return null;
    const token = authHeader.slice(BEARER_PREFIX.length).trim();
    return token.length > 0 ? token : null;
}
/**
 * Verifies a Firebase ID token and resolves the associated Firestore user
 * document to build a full UserSession.
 *
 * @param idToken Raw Firebase ID token string from the client.
 * @param checkRevoked Whether to verify the token hasn't been revoked (adds ~100ms latency).
 */
export async function verifyFirebaseToken(idToken, checkRevoked = false) {
    // 1. Verify signature and standard claims via Firebase Admin
    let decoded;
    try {
        decoded = (await auth.verifyIdToken(idToken, checkRevoked));
    }
    catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        logger.warn("Firebase token verification failed", { error: message });
        throw new Error(`Invalid Firebase token: ${message}`);
    }
    // 2. Load the Firestore user document to get workspace and role info
    const userSnap = await db
        .collection(COLLECTIONS.USERS)
        .doc(decoded.uid)
        .get();
    if (!userSnap.exists) {
        throw new Error(`User record not found for uid: ${decoded.uid}`);
    }
    const userData = userSnap.data();
    const session = {
        uid: decoded.uid,
        email: decoded.email ?? userData.email ?? "",
        displayName: decoded.name ?? userData.displayName ?? "",
        workspaceId: userData.workspaceId ?? "",
        roleId: userData.roleId ?? "role_guest",
        permissions: userData.permissions ?? {},
        emailVerified: decoded.email_verified ?? false,
        avatarUrl: userData.avatarUrl ?? decoded.picture ?? "",
        issuedAt: new Date(decoded.iat * 1000),
        expiresAt: new Date(decoded.exp * 1000),
    };
    return { decoded, session };
}
// ─── Device session tracking ─────────────────────────────────────────────────
/**
 * Registers or refreshes a device session entry in Firestore.
 * Called after every successful token verification to power the
 * "active sessions" management UI.
 */
export async function upsertDeviceSession(uid, deviceInfo) {
    try {
        const ref = db
            .collection(COLLECTIONS.USERS)
            .doc(uid)
            .collection("deviceSessions")
            .doc(deviceInfo.deviceId);
        await ref.set({
            deviceId: deviceInfo.deviceId,
            userAgent: deviceInfo.userAgent,
            ipAddress: deviceInfo.ipAddress,
            lastActiveAt: new Date(),
            isActive: true,
        }, { merge: true });
    }
    catch (err) {
        // Non-critical — log but don't surface to caller
        logger.error("Failed to upsert device session", {
            uid,
            deviceId: deviceInfo.deviceId,
            error: err,
        });
    }
}
/**
 * Marks all device sessions for a user as inactive.
 * Called on explicit sign-out or admin-forced logout.
 */
export async function revokeAllDeviceSessions(uid) {
    const snapshot = await db
        .collection(COLLECTIONS.USERS)
        .doc(uid)
        .collection("deviceSessions")
        .where("isActive", "==", true)
        .get();
    if (snapshot.empty)
        return;
    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
        batch.update(doc.ref, { isActive: false, revokedAt: new Date() });
    });
    await batch.commit();
    // Also revoke Firebase tokens server-side
    try {
        await auth.revokeRefreshTokens(uid);
    }
    catch (err) {
        logger.error("Failed to revoke Firebase refresh tokens", { uid, error: err });
    }
}
// ─── Express middleware factories ────────────────────────────────────────────
/**
 * Middleware: requires a valid Firebase ID token.
 * Attaches `req.user` (UserSession) and `req.decodedToken` on success.
 *
 * @param options.checkRevoked  Enable revocation check (slower; use for sensitive ops).
 * @param options.trackDevice   Register the request in device sessions table.
 */
export function requireAuth(options = {}) {
    return async (req, res, next) => {
        const rawHeader = req.headers[AUTH_HEADER.toLowerCase()];
        const token = extractBearerToken(rawHeader);
        if (!token) {
            res
                .status(HTTP_STATUS.UNAUTHORIZED)
                .json(errorResponse("Authorization token is missing", ERROR_CODES.UNAUTHORIZED));
            return;
        }
        try {
            const { decoded, session } = await verifyFirebaseToken(token, options.checkRevoked ?? false);
            // Attach to request for downstream handlers
            req.user = session;
            req.decodedToken = decoded;
            if (options.trackDevice) {
                const deviceId = req.headers["x-device-id"] ||
                    crypto
                        .createHash("sha1")
                        .update(`${decoded.uid}:${req.ip}:${req.headers["user-agent"] ?? ""}`)
                        .digest("hex");
                await upsertDeviceSession(decoded.uid, {
                    deviceId,
                    userAgent: req.headers["user-agent"] ?? "unknown",
                    ipAddress: req.ip ?? "unknown",
                });
            }
            next();
        }
        catch (err) {
            const message = err instanceof Error ? err.message : "Authentication failed";
            logger.warn("Auth middleware rejected request", {
                path: req.path,
                ip: req.ip,
                error: message,
            });
            res
                .status(HTTP_STATUS.UNAUTHORIZED)
                .json(errorResponse(message, ERROR_CODES.UNAUTHORIZED));
        }
    };
}
/**
 * Middleware: requires a valid Firebase token AND that the workspace in the
 * request body / params / query matches the user's workspaceId claim.
 *
 * Must be placed AFTER `requireAuth`.
 */
export function requireWorkspaceAccess() {
    return (req, res, next) => {
        const session = req.user;
        if (!session) {
            res
                .status(HTTP_STATUS.UNAUTHORIZED)
                .json(errorResponse("Not authenticated", ERROR_CODES.UNAUTHORIZED));
            return;
        }
        const requestedWorkspaceId = req.params.workspaceId ??
            req.body?.workspaceId ??
            req.query.workspaceId;
        if (!requestedWorkspaceId) {
            // No workspace specified — let the handler deal with it
            next();
            return;
        }
        if (session.workspaceId !== requestedWorkspaceId) {
            logger.warn("Workspace access denied", {
                uid: session.uid,
                userWorkspace: session.workspaceId,
                requestedWorkspace: requestedWorkspaceId,
            });
            res
                .status(HTTP_STATUS.FORBIDDEN)
                .json(errorResponse("Access to this workspace is not permitted", ERROR_CODES.FORBIDDEN));
            return;
        }
        next();
    };
}
/**
 * Middleware: verifies an internal Obsidian token passed via the
 * `x-obs-token` header or `obsToken` body field.
 * Attaches `req.internalClaims` on success.
 *
 * @param purpose  Expected token purpose; rejects tokens for other operations.
 */
export function requireInternalToken(purpose) {
    return (req, res, next) => {
        const rawToken = req.headers["x-obs-token"] ??
            req.body?.obsToken;
        if (!rawToken) {
            res
                .status(HTTP_STATUS.UNAUTHORIZED)
                .json(errorResponse("Operation token is missing", ERROR_CODES.UNAUTHORIZED));
            return;
        }
        try {
            const claims = verifyInternalTokenForPurpose(rawToken, purpose);
            req.internalClaims = claims;
            next();
        }
        catch (err) {
            const message = err instanceof Error ? err.message : "Invalid operation token";
            res
                .status(HTTP_STATUS.UNAUTHORIZED)
                .json(errorResponse(message, ERROR_CODES.UNAUTHORIZED));
        }
    };
}
/**
 * Middleware: requires the authenticated user to have a specific permission.
 * Must be placed AFTER `requireAuth`.
 *
 * @param permission Key from the UserSession.permissions map.
 */
export function requirePermission(permission) {
    return (req, res, next) => {
        const session = req.user;
        if (!session) {
            res
                .status(HTTP_STATUS.UNAUTHORIZED)
                .json(errorResponse("Not authenticated", ERROR_CODES.UNAUTHORIZED));
            return;
        }
        const hasPermission = Boolean(session.permissions?.[permission]);
        if (!hasPermission) {
            logger.warn("Permission check failed", {
                uid: session.uid,
                permission,
                workspaceId: session.workspaceId,
            });
            res
                .status(HTTP_STATUS.FORBIDDEN)
                .json(errorResponse(`You do not have the required permission: ${permission}`, ERROR_CODES.FORBIDDEN));
            return;
        }
        next();
    };
}
// ─── Token utilities ─────────────────────────────────────────────────────────
/**
 * Returns true if the epoch-second timestamp is still in the future.
 */
export function isTokenFresh(expEpochSeconds) {
    return Math.floor(Date.now() / 1000) < expEpochSeconds;
}
/**
 * Computes how many seconds remain until a token expires.
 * Returns 0 if already expired.
 */
export function tokenSecondsRemaining(expEpochSeconds) {
    const remaining = expEpochSeconds - Math.floor(Date.now() / 1000);
    return Math.max(0, remaining);
}
/**
 * Derives a deterministic device ID from uid + IP + User-Agent.
 * Useful when clients don't supply an explicit `x-device-id` header.
 */
export function deriveDeviceId(uid, ip, userAgent) {
    return crypto
        .createHash("sha256")
        .update(`${uid}|${ip}|${userAgent}`)
        .digest("hex")
        .slice(0, 32);
}
/**
 * Generates a cryptographically random opaque refresh token string.
 * Stored hashed in Firestore; raw value returned to the client once.
 */
export function generateRefreshToken() {
    const raw = crypto.randomBytes(48).toString("base64url");
    const hashed = crypto.createHash("sha256").update(raw).digest("hex");
    return { raw, hashed };
}
/**
 * Hashes a raw refresh token for safe Firestore storage comparison.
 */
export function hashRefreshToken(raw) {
    return crypto.createHash("sha256").update(raw).digest("hex");
}
//# sourceMappingURL=jwt.js.map