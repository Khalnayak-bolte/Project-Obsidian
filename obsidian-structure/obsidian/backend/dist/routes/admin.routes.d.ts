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
export declare const adminRouter: import("express-serve-static-core").Router;
//# sourceMappingURL=admin.routes.d.ts.map