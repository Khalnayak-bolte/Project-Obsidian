/**
 * backend/middleware/authMiddleware.ts
 * Project: Obsidian
 */
import { auth, db, COLLECTIONS } from "../config/firebase";
import { createLogger } from "../utils/logger";
import { errorResponse } from "../utils/helpers";
import { ERROR_CODES, HTTP_STATUS } from "../types/common";
import { HEADERS } from "../utils/constants";
const logger = createLogger("authMiddleware");
// ─── Extract token ────────────────────────────────────────────────────────────
function extractToken(req) {
    const header = req.headers[HEADERS.AUTH];
    if (!header?.startsWith("Bearer "))
        return null;
    const token = header.slice(7).trim();
    return token.length > 0 ? token : null;
}
// ─── Build UserSession from Firestore ────────────────────────────────────────
async function buildSession(uid, decoded) {
    const userSnap = await db.collection(COLLECTIONS.USERS).doc(uid).get();
    if (!userSnap.exists) {
        throw new Error(`User record not found: ${uid}`);
    }
    const u = userSnap.data();
    return {
        uid,
        email: decoded.email ?? u.email ?? "",
        displayName: decoded.name ?? u.displayName ?? "",
        workspaceId: u.workspaceId ?? "",
        roleId: u.roleId ?? "role_guest",
        permissions: u.permissions ?? {},
        emailVerified: decoded.email_verified ?? false,
        avatarUrl: u.avatarUrl ?? decoded.picture ?? "",
        issuedAt: new Date(decoded.iat * 1000),
        expiresAt: new Date(decoded.exp * 1000),
    };
}
// ─── authenticate ─────────────────────────────────────────────────────────────
/**
 * Verifies the Firebase ID token and attaches `req.user` (UserSession).
 * All protected routes must use this middleware first.
 */
export async function authenticate(req, res, next) {
    const token = extractToken(req);
    if (!token) {
        res
            .status(HTTP_STATUS.UNAUTHORIZED)
            .json(errorResponse("Authorization token is missing", ERROR_CODES.UNAUTHORIZED));
        return;
    }
    try {
        const decoded = await auth.verifyIdToken(token, false);
        const session = await buildSession(decoded.uid, decoded);
        req.user = session;
        next();
    }
    catch (err) {
        const message = err instanceof Error ? err.message : "Authentication failed";
        logger.warn("authenticate failed", { ip: req.ip, error: message });
        res
            .status(HTTP_STATUS.UNAUTHORIZED)
            .json(errorResponse(message, ERROR_CODES.UNAUTHORIZED));
    }
}
// ─── authenticateStrict ───────────────────────────────────────────────────────
/**
 * Same as `authenticate` but also checks token revocation.
 * Use on sensitive operations: billing changes, ownership transfer, deletion.
 */
export async function authenticateStrict(req, res, next) {
    const token = extractToken(req);
    if (!token) {
        res
            .status(HTTP_STATUS.UNAUTHORIZED)
            .json(errorResponse("Authorization token is missing", ERROR_CODES.UNAUTHORIZED));
        return;
    }
    try {
        const decoded = await auth.verifyIdToken(token, true); // checkRevoked = true
        const session = await buildSession(decoded.uid, decoded);
        req.user = session;
        next();
    }
    catch (err) {
        const message = err instanceof Error ? err.message : "Authentication failed";
        logger.warn("authenticateStrict failed", { ip: req.ip, error: message });
        res
            .status(HTTP_STATUS.UNAUTHORIZED)
            .json(errorResponse(message, ERROR_CODES.UNAUTHORIZED));
    }
}
// ─── optionalAuth ─────────────────────────────────────────────────────────────
/**
 * Attempts token verification but does not block the request on failure.
 * Attaches `req.user` if valid; leaves it undefined otherwise.
 * Use on public routes that have optional authenticated behaviour.
 */
export async function optionalAuth(req, _res, next) {
    const token = extractToken(req);
    if (!token) {
        next();
        return;
    }
    try {
        const decoded = await auth.verifyIdToken(token, false);
        const session = await buildSession(decoded.uid, decoded);
        req.user = session;
    }
    catch {
        // Silently ignore — request proceeds unauthenticated
    }
    next();
}
// ─── requireWorkspace ─────────────────────────────────────────────────────────
/**
 * Ensures the authenticated user belongs to the workspace specified in
 * `req.params.workspaceId`, `req.body.workspaceId`, or `req.query.workspaceId`.
 * Must be placed after `authenticate`.
 */
export function requireWorkspace(req, res, next) {
    const session = req.user;
    if (!session) {
        res
            .status(HTTP_STATUS.UNAUTHORIZED)
            .json(errorResponse("Not authenticated", ERROR_CODES.UNAUTHORIZED));
        return;
    }
    const requestedId = req.params.workspaceId ??
        req.body?.workspaceId ??
        req.query.workspaceId;
    if (requestedId && session.workspaceId !== requestedId) {
        logger.warn("Workspace mismatch", {
            uid: session.uid,
            userWorkspace: session.workspaceId,
            requestedWorkspace: requestedId,
        });
        res
            .status(HTTP_STATUS.FORBIDDEN)
            .json(errorResponse("Access to this workspace is not permitted", ERROR_CODES.FORBIDDEN));
        return;
    }
    next();
}
// ─── requireEmailVerified ─────────────────────────────────────────────────────
/**
 * Blocks access if the user's email is not verified.
 * Must be placed after `authenticate`.
 */
export function requireEmailVerified(req, res, next) {
    const session = req.user;
    if (!session?.emailVerified) {
        res
            .status(HTTP_STATUS.FORBIDDEN)
            .json(errorResponse("Email verification is required to access this resource", ERROR_CODES.FORBIDDEN));
        return;
    }
    next();
}
// ─── requireOwner ─────────────────────────────────────────────────────────────
/**
 * Ensures the authenticated user is the workspace owner.
 * Looks up the workspace document to verify ownership.
 * Must be placed after `authenticate` and `requireWorkspace`.
 */
export async function requireOwner(req, res, next) {
    const session = req.user;
    if (!session) {
        res
            .status(HTTP_STATUS.UNAUTHORIZED)
            .json(errorResponse("Not authenticated", ERROR_CODES.UNAUTHORIZED));
        return;
    }
    try {
        const wsSnap = await db
            .collection(COLLECTIONS.WORKSPACES)
            .doc(session.workspaceId)
            .get();
        if (!wsSnap.exists) {
            res
                .status(HTTP_STATUS.NOT_FOUND)
                .json(errorResponse("Workspace not found", ERROR_CODES.NOT_FOUND));
            return;
        }
        const ownerId = wsSnap.data().ownerId;
        if (ownerId !== session.uid) {
            res
                .status(HTTP_STATUS.FORBIDDEN)
                .json(errorResponse("Only the workspace owner can perform this action", ERROR_CODES.FORBIDDEN));
            return;
        }
        next();
    }
    catch (err) {
        const message = err instanceof Error ? err.message : "Owner check failed";
        logger.error("requireOwner error", { uid: session.uid, error: message });
        res
            .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
            .json(errorResponse("Failed to verify ownership", ERROR_CODES.INTERNAL_ERROR));
    }
}
//# sourceMappingURL=authMiddleware.js.map