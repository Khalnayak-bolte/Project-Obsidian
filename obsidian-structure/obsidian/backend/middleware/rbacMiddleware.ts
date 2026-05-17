/**
 * backend/middleware/rbacMiddleware.ts
 * Project: Obsidian
 */

import type { Request, Response, NextFunction } from "express";
import { db, COLLECTIONS } from "../config/firebase";
import { createLogger } from "../utils/logger";
import { errorResponse } from "../utils/helpers";
import { ERROR_CODES, HTTP_STATUS } from "../types/common";
import type { UserSession } from "../types/auth";
import { SYSTEM_ROLES } from "../utils/constants";

const logger = createLogger("rbacMiddleware");

// ─── Types ────────────────────────────────────────────────────────────────────

export type Permission =
  | "manage_workspace"
  | "manage_roles"
  | "manage_channels"
  | "manage_members"
  | "manage_billing"
  | "create_channels"
  | "delete_channels"
  | "send_messages"
  | "delete_messages"
  | "pin_messages"
  | "mention_everyone"
  | "join_voice"
  | "mute_members"
  | "kick_members"
  | "deafen_members"
  | "upload_files"
  | "download_files"
  | "delete_files"
  | "ban_members"
  | "view_audit_log"
  | "manage_invites";

// ─── Permission cache ─────────────────────────────────────────────────────────

interface CachedPerms {
  permissions: Record<string, boolean>;
  cachedAt: number;
}

const permCache = new Map<string, CachedPerms>();
const CACHE_TTL_MS = 60_000; // 1 minute

function getCacheKey(uid: string, workspaceId: string): string {
  return `${uid}:${workspaceId}`;
}

function getFromCache(uid: string, workspaceId: string): Record<string, boolean> | null {
  const entry = permCache.get(getCacheKey(uid, workspaceId));
  if (!entry) return null;
  if (Date.now() - entry.cachedAt > CACHE_TTL_MS) {
    permCache.delete(getCacheKey(uid, workspaceId));
    return null;
  }
  return entry.permissions;
}

function setCache(uid: string, workspaceId: string, permissions: Record<string, boolean>): void {
  permCache.set(getCacheKey(uid, workspaceId), { permissions, cachedAt: Date.now() });
}

export function invalidatePermissionCache(uid: string, workspaceId: string): void {
  permCache.delete(getCacheKey(uid, workspaceId));
}

// ─── Permission resolver ──────────────────────────────────────────────────────

/**
 * Fetches the effective permissions for a user from Firestore.
 * Uses an in-memory cache to avoid repeated reads on hot routes.
 */
async function resolvePermissions(
  uid: string,
  workspaceId: string
): Promise<Record<string, boolean>> {
  const cached = getFromCache(uid, workspaceId);
  if (cached) return cached;

  const userSnap = await db
    .collection(COLLECTIONS.USERS)
    .doc(uid)
    .get();

  if (!userSnap.exists) return {};

  const userData = userSnap.data()!;
  const roleId: string = userData.roleId ?? SYSTEM_ROLES.GUEST;

  // Owner always has all permissions
  if (roleId === SYSTEM_ROLES.OWNER) {
    const allPerms: Record<string, boolean> = {
      manage_workspace: true,
      manage_roles: true,
      manage_channels: true,
      manage_members: true,
      manage_billing: true,
      create_channels: true,
      delete_channels: true,
      send_messages: true,
      delete_messages: true,
      pin_messages: true,
      mention_everyone: true,
      join_voice: true,
      mute_members: true,
      kick_members: true,
      deafen_members: true,
      upload_files: true,
      download_files: true,
      delete_files: true,
      ban_members: true,
      view_audit_log: true,
      manage_invites: true,
    };
    setCache(uid, workspaceId, allPerms);
    return allPerms;
  }

  // Load role document
  const roleSnap = await db
    .collection(COLLECTIONS.WORKSPACES)
    .doc(workspaceId)
    .collection("roles")
    .doc(roleId)
    .get();

  const permissions: Record<string, boolean> =
    roleSnap.exists ? (roleSnap.data()!.permissions ?? {}) : {};

  setCache(uid, workspaceId, permissions);
  return permissions;
}

// ─── requirePermission ────────────────────────────────────────────────────────

/**
 * Middleware factory — requires the authenticated user to hold a specific permission.
 * Must be placed after `authenticate` and `requireWorkspace`.
 *
 * @example
 * router.delete("/:id", authenticate, requireWorkspace, requirePermission("delete_messages"), handler);
 */
export function requirePermission(permission: Permission) {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const session: UserSession | undefined = (req as any).user;

    if (!session) {
      res
        .status(HTTP_STATUS.UNAUTHORIZED)
        .json(errorResponse("Not authenticated", ERROR_CODES.UNAUTHORIZED));
      return;
    }

    try {
      // Fast path: check permissions already on the session object
      const sessionPerms = session.permissions as Record<string, boolean> | undefined;
      if (sessionPerms && permission in sessionPerms) {
        if (!sessionPerms[permission]) {
          res
            .status(HTTP_STATUS.FORBIDDEN)
            .json(
              errorResponse(
                `Missing required permission: ${permission}`,
                ERROR_CODES.FORBIDDEN
              )
            );
          return;
        }
        next();
        return;
      }

      // Slow path: resolve from Firestore
      const permissions = await resolvePermissions(session.uid, session.workspaceId);

      if (!permissions[permission]) {
        logger.warn("Permission denied", {
          uid: session.uid,
          workspaceId: session.workspaceId,
          permission,
          roleId: session.roleId,
        });
        res
          .status(HTTP_STATUS.FORBIDDEN)
          .json(
            errorResponse(
              `Missing required permission: ${permission}`,
              ERROR_CODES.FORBIDDEN
            )
          );
        return;
      }

      next();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Permission check failed";
      logger.error("requirePermission error", { uid: session.uid, permission, error: message });
      res
        .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
        .json(errorResponse("Failed to verify permissions", ERROR_CODES.INTERNAL_ERROR));
    }
  };
}

// ─── requireAnyPermission ─────────────────────────────────────────────────────

/**
 * Passes if the user holds AT LEAST ONE of the listed permissions.
 */
export function requireAnyPermission(...permissions: Permission[]) {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const session: UserSession | undefined = (req as any).user;

    if (!session) {
      res
        .status(HTTP_STATUS.UNAUTHORIZED)
        .json(errorResponse("Not authenticated", ERROR_CODES.UNAUTHORIZED));
      return;
    }

    try {
      const resolved = await resolvePermissions(session.uid, session.workspaceId);
      const hasAny = permissions.some((p) => resolved[p]);

      if (!hasAny) {
        logger.warn("requireAnyPermission denied", {
          uid: session.uid,
          permissions,
          roleId: session.roleId,
        });
        res
          .status(HTTP_STATUS.FORBIDDEN)
          .json(
            errorResponse(
              `One of these permissions is required: ${permissions.join(", ")}`,
              ERROR_CODES.FORBIDDEN
            )
          );
        return;
      }

      next();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Permission check failed";
      logger.error("requireAnyPermission error", { uid: session.uid, error: message });
      res
        .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
        .json(errorResponse("Failed to verify permissions", ERROR_CODES.INTERNAL_ERROR));
    }
  };
}

// ─── requireAllPermissions ────────────────────────────────────────────────────

/**
 * Passes only if the user holds ALL of the listed permissions.
 */
export function requireAllPermissions(...permissions: Permission[]) {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const session: UserSession | undefined = (req as any).user;

    if (!session) {
      res
        .status(HTTP_STATUS.UNAUTHORIZED)
        .json(errorResponse("Not authenticated", ERROR_CODES.UNAUTHORIZED));
      return;
    }

    try {
      const resolved = await resolvePermissions(session.uid, session.workspaceId);
      const missing = permissions.filter((p) => !resolved[p]);

      if (missing.length > 0) {
        logger.warn("requireAllPermissions denied", {
          uid: session.uid,
          missing,
          roleId: session.roleId,
        });
        res
          .status(HTTP_STATUS.FORBIDDEN)
          .json(
            errorResponse(
              `Missing required permissions: ${missing.join(", ")}`,
              ERROR_CODES.FORBIDDEN
            )
          );
        return;
      }

      next();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Permission check failed";
      logger.error("requireAllPermissions error", { uid: session.uid, error: message });
      res
        .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
        .json(errorResponse("Failed to verify permissions", ERROR_CODES.INTERNAL_ERROR));
    }
  };
}

// ─── requireRole ──────────────────────────────────────────────────────────────

/**
 * Passes if the user's roleId matches one of the allowed roles.
 * Faster than permission checks when you need role-level gates.
 */
export function requireRole(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const session: UserSession | undefined = (req as any).user;

    if (!session) {
      res
        .status(HTTP_STATUS.UNAUTHORIZED)
        .json(errorResponse("Not authenticated", ERROR_CODES.UNAUTHORIZED));
      return;
    }

    if (!allowedRoles.includes(session.roleId)) {
      logger.warn("requireRole denied", {
        uid: session.uid,
        userRole: session.roleId,
        allowedRoles,
      });
      res
        .status(HTTP_STATUS.FORBIDDEN)
        .json(
          errorResponse(
            `This action requires one of these roles: ${allowedRoles.join(", ")}`,
            ERROR_CODES.FORBIDDEN
          )
        );
      return;
    }

    next();
  };
}

// ─── requireSelfOrPermission ──────────────────────────────────────────────────

/**
 * Passes if:
 *   - The authenticated user IS the target user (acting on their own resource), OR
 *   - The authenticated user has the specified permission.
 *
 * The target user ID is read from `req.params.userId`.
 */
export function requireSelfOrPermission(permission: Permission) {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const session: UserSession | undefined = (req as any).user;

    if (!session) {
      res
        .status(HTTP_STATUS.UNAUTHORIZED)
        .json(errorResponse("Not authenticated", ERROR_CODES.UNAUTHORIZED));
      return;
    }

    const targetUserId = req.params.userId;

    if (session.uid === targetUserId) {
      next();
      return;
    }

    try {
      const permissions = await resolvePermissions(session.uid, session.workspaceId);

      if (!permissions[permission]) {
        res
          .status(HTTP_STATUS.FORBIDDEN)
          .json(
            errorResponse(
              `You can only perform this action on your own account or with the '${permission}' permission`,
              ERROR_CODES.FORBIDDEN
            )
          );
        return;
      }

      next();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Permission check failed";
      logger.error("requireSelfOrPermission error", { uid: session.uid, error: message });
      res
        .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
        .json(errorResponse("Failed to verify permissions", ERROR_CODES.INTERNAL_ERROR));
    }
  };
}
