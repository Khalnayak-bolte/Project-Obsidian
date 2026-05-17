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
import { Router } from "express";
import { authenticate } from "../middleware/authMiddleware";
import { requirePermission, requireRole } from "../middleware/rbacMiddleware";
import { RATE_LIMITS } from "../middleware/rateLimitMiddleware";
import { createWorkspace, getWorkspaceById, updateWorkspace, deleteWorkspace, getWorkspaceStats, listMembers, inviteMember, inviteMembersBulk, acceptInvite, updateMemberRole, removeMember, transferOwnership, updatePresence, } from "../controllers/workspaceController";
import { SYSTEM_ROLES } from "../utils/constants";
export const workspaceRouter = Router();
// All workspace routes require authentication
workspaceRouter.use(authenticate);
// ─── Workspace CRUD ───────────────────────────────────────────────────────────
// POST /api/v1/workspaces
workspaceRouter.post("/", createWorkspace);
// GET /api/v1/workspaces/:workspaceId
workspaceRouter.get("/:workspaceId", getWorkspaceById);
// PATCH /api/v1/workspaces/:workspaceId
workspaceRouter.patch("/:workspaceId", requirePermission("manage_workspace"), updateWorkspace);
// DELETE /api/v1/workspaces/:workspaceId
workspaceRouter.delete("/:workspaceId", requireRole(SYSTEM_ROLES.OWNER), deleteWorkspace);
// ─── Stats ────────────────────────────────────────────────────────────────────
// GET /api/v1/workspaces/:workspaceId/stats
workspaceRouter.get("/:workspaceId/stats", requirePermission("manage_workspace"), getWorkspaceStats);
// ─── Members ──────────────────────────────────────────────────────────────────
// GET /api/v1/workspaces/:workspaceId/members
workspaceRouter.get("/:workspaceId/members", listMembers);
// PATCH /api/v1/workspaces/:workspaceId/members/:uid/role
workspaceRouter.patch("/:workspaceId/members/:uid/role", requirePermission("manage_roles"), updateMemberRole);
// DELETE /api/v1/workspaces/:workspaceId/members/:uid
workspaceRouter.delete("/:workspaceId/members/:uid", requirePermission("manage_members"), removeMember);
// ─── Invites ──────────────────────────────────────────────────────────────────
// POST /api/v1/workspaces/:workspaceId/invites
workspaceRouter.post("/:workspaceId/invites", requirePermission("manage_invites"), RATE_LIMITS.INVITE, inviteMember);
// POST /api/v1/workspaces/:workspaceId/invites/bulk
workspaceRouter.post("/:workspaceId/invites/bulk", requirePermission("manage_invites"), RATE_LIMITS.INVITE, inviteMembersBulk);
// POST /api/v1/workspaces/:workspaceId/invites/accept
// Public-ish: authenticated user accepts an invite token — no extra RBAC needed
workspaceRouter.post("/:workspaceId/invites/accept", acceptInvite);
// ─── Ownership ────────────────────────────────────────────────────────────────
// POST /api/v1/workspaces/:workspaceId/transfer
workspaceRouter.post("/:workspaceId/transfer", requireRole(SYSTEM_ROLES.OWNER), transferOwnership);
// ─── Presence ─────────────────────────────────────────────────────────────────
// PATCH /api/v1/workspaces/:workspaceId/presence
workspaceRouter.patch("/:workspaceId/presence", updatePresence);
//# sourceMappingURL=workspace.routes.js.map