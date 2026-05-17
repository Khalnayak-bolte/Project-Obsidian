/**
 * backend/middleware/rbacMiddleware.ts
 * Project: Obsidian
 */
import type { Request, Response, NextFunction } from "express";
export type Permission = "manage_workspace" | "manage_roles" | "manage_channels" | "manage_members" | "manage_billing" | "create_channels" | "delete_channels" | "send_messages" | "delete_messages" | "pin_messages" | "mention_everyone" | "join_voice" | "mute_members" | "kick_members" | "deafen_members" | "upload_files" | "download_files" | "delete_files" | "ban_members" | "view_audit_log" | "manage_invites";
export declare function invalidatePermissionCache(uid: string, workspaceId: string): void;
/**
 * Middleware factory — requires the authenticated user to hold a specific permission.
 * Must be placed after `authenticate` and `requireWorkspace`.
 *
 * @example
 * router.delete("/:id", authenticate, requireWorkspace, requirePermission("delete_messages"), handler);
 */
export declare function requirePermission(permission: Permission): (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Passes if the user holds AT LEAST ONE of the listed permissions.
 */
export declare function requireAnyPermission(...permissions: Permission[]): (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Passes only if the user holds ALL of the listed permissions.
 */
export declare function requireAllPermissions(...permissions: Permission[]): (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Passes if the user's roleId matches one of the allowed roles.
 * Faster than permission checks when you need role-level gates.
 */
export declare function requireRole(...allowedRoles: string[]): (req: Request, res: Response, next: NextFunction) => void;
/**
 * Passes if:
 *   - The authenticated user IS the target user (acting on their own resource), OR
 *   - The authenticated user has the specified permission.
 *
 * The target user ID is read from `req.params.userId`.
 */
export declare function requireSelfOrPermission(permission: Permission): (req: Request, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=rbacMiddleware.d.ts.map