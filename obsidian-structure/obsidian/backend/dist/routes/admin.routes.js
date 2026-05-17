/**
 * backend/routes/admin.routes.ts
 * Project: Obsidian
 *
 * Express router for all workspace administration and moderation endpoints.
 * All routes require authentication + Owner or Admin role.
 * Fine-grained permission checks are applied per-route where needed.
 *
 *  GET    /api/v1/admin/audit-log                   → getAuditLog
 *  GET    /api/v1/admin/members                     → listMembers
 *  POST   /api/v1/admin/members/:uid/ban            → banMember
 *  DELETE /api/v1/admin/members/:uid/ban            → unbanMember
 *  DELETE /api/v1/admin/members/:uid                → removeMember
 *  GET    /api/v1/admin/roles                       → listRoles
 *  POST   /api/v1/admin/roles                       → createRole
 *  PATCH  /api/v1/admin/roles/:roleId               → updateRole
 *  DELETE /api/v1/admin/roles/:roleId               → deleteRole
 *  PATCH  /api/v1/admin/members/:uid/role           → assignRole
 *  GET    /api/v1/admin/stats                       → getWorkspaceStats
 *  POST   /api/v1/admin/messages/bulk-delete        → bulkDeleteMessages
 */
import { Router } from "express";
import { authenticate } from "../middleware/authMiddleware";
import { requirePermission, requireAnyPermission } from "../middleware/rbacMiddleware";
import { RATE_LIMITS } from "../middleware/rateLimitMiddleware";
import { getAuditLog, listMembers, banMember, unbanMember, removeMember, listRoles, createRole, updateRole, deleteRole, assignRole, getWorkspaceStats, bulkDeleteMessages, } from "../controllers/adminController";
export const adminRouter = Router();
// All admin routes require authentication
adminRouter.use(authenticate);
// Apply global admin rate limit to all routes in this router
adminRouter.use(RATE_LIMITS.ADMIN);
// ─── Audit log ────────────────────────────────────────────────────────────────
// GET /api/v1/admin/audit-log
adminRouter.get("/audit-log", requirePermission("view_audit_log"), getAuditLog);
// ─── Member management ────────────────────────────────────────────────────────
// GET /api/v1/admin/members
adminRouter.get("/members", requirePermission("manage_members"), listMembers);
// POST /api/v1/admin/members/:uid/ban  — must come before DELETE /:uid
adminRouter.post("/members/:uid/ban", requirePermission("ban_members"), banMember);
// DELETE /api/v1/admin/members/:uid/ban
adminRouter.delete("/members/:uid/ban", requirePermission("ban_members"), unbanMember);
// PATCH /api/v1/admin/members/:uid/role
adminRouter.patch("/members/:uid/role", requirePermission("manage_roles"), assignRole);
// DELETE /api/v1/admin/members/:uid
adminRouter.delete("/members/:uid", requirePermission("manage_members"), removeMember);
// ─── Role management ──────────────────────────────────────────────────────────
// GET /api/v1/admin/roles
adminRouter.get("/roles", requireAnyPermission("manage_roles", "manage_workspace"), listRoles);
// POST /api/v1/admin/roles
adminRouter.post("/roles", requirePermission("manage_roles"), createRole);
// PATCH /api/v1/admin/roles/:roleId
adminRouter.patch("/roles/:roleId", requirePermission("manage_roles"), updateRole);
// DELETE /api/v1/admin/roles/:roleId
adminRouter.delete("/roles/:roleId", requirePermission("manage_roles"), deleteRole);
// ─── Stats ────────────────────────────────────────────────────────────────────
// GET /api/v1/admin/stats
adminRouter.get("/stats", requirePermission("manage_workspace"), getWorkspaceStats);
// ─── Message moderation ───────────────────────────────────────────────────────
// POST /api/v1/admin/messages/bulk-delete
adminRouter.post("/messages/bulk-delete", requirePermission("delete_messages"), bulkDeleteMessages);
//# sourceMappingURL=admin.routes.js.map