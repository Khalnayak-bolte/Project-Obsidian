/**
 * backend/routes/workspace.routes.ts
 * Project: Obsidian
 *
 * Express router for all workspace management endpoints.
 * All routes require a valid Firebase JWT via authenticate middleware.
 * Mutating routes additionally require RBAC permission checks.
 *
 *  POST   /api/v1/workspaces                                → createWorkspace
 *  GET    /api/v1/workspaces/:workspaceId                   → getWorkspaceById
 *  PATCH  /api/v1/workspaces/:workspaceId                   → updateWorkspace
 *  DELETE /api/v1/workspaces/:workspaceId                   → deleteWorkspace
 *  GET    /api/v1/workspaces/:workspaceId/stats             → getWorkspaceStats
 *  GET    /api/v1/workspaces/:workspaceId/members           → listMembers
 *  POST   /api/v1/workspaces/:workspaceId/invites           → inviteMember
 *  POST   /api/v1/workspaces/:workspaceId/invites/bulk      → inviteMembersBulk
 *  POST   /api/v1/workspaces/:workspaceId/invites/accept    → acceptInvite
 *  PATCH  /api/v1/workspaces/:workspaceId/members/:uid/role → updateMemberRole
 *  DELETE /api/v1/workspaces/:workspaceId/members/:uid      → removeMember
 *  POST   /api/v1/workspaces/:workspaceId/transfer          → transferOwnership
 *  PATCH  /api/v1/workspaces/:workspaceId/presence          → updatePresence
 */
export declare const workspaceRouter: import("express-serve-static-core").Router;
//# sourceMappingURL=workspace.routes.d.ts.map