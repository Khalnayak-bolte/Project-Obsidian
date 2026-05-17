/**
 * backend/controllers/adminController.ts
 * Project: Obsidian
 *
 * HTTP request handlers for workspace administration and moderation.
 * All routes require Owner or Admin role (enforced by RBAC middleware).
 * Delegates business logic to workspaceService, userRepository, and Firestore directly
 * for audit log and role management operations.
 *
 * Route map (wired in routes/admin.routes.ts):
 *  GET    /api/v1/admin/audit-log                           → getAuditLog
 *  GET    /api/v1/admin/members                             → listMembers
 *  POST   /api/v1/admin/members/:uid/ban                    → banMember
 *  DELETE /api/v1/admin/members/:uid/ban                    → unbanMember
 *  DELETE /api/v1/admin/members/:uid                        → removeMember
 *  GET    /api/v1/admin/roles                               → listRoles
 *  POST   /api/v1/admin/roles                               → createRole
 *  PATCH  /api/v1/admin/roles/:roleId                       → updateRole
 *  DELETE /api/v1/admin/roles/:roleId                       → deleteRole
 *  PATCH  /api/v1/admin/members/:uid/role                   → assignRole
 *  GET    /api/v1/admin/stats                               → getWorkspaceStats
 *  POST   /api/v1/admin/messages/bulk-delete                → bulkDeleteMessages
 */
import type { Request, Response, NextFunction } from "express";
export declare function getAuditLog(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function listMembers(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function banMember(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function unbanMember(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function removeMember(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function listRoles(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function createRole(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function updateRole(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function deleteRole(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function assignRole(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function getWorkspaceStats(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function bulkDeleteMessages(req: Request, res: Response, next: NextFunction): Promise<void>;
//# sourceMappingURL=adminController.d.ts.map