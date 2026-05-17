/**
 * backend/controllers/workspaceController.ts
 * Project: Obsidian
 *
 * HTTP request handlers for all workspace routes.
 * Validates input via Zod schemas, delegates to workspaceService,
 * and returns consistent ApiSuccess / ApiError responses.
 *
 * Route map (wired in routes/workspace.routes.ts):
 *  POST   /api/v1/workspaces                          → createWorkspace
 *  GET    /api/v1/workspaces/:workspaceId             → getWorkspace
 *  PATCH  /api/v1/workspaces/:workspaceId             → updateWorkspace
 *  DELETE /api/v1/workspaces/:workspaceId             → deleteWorkspace
 *  GET    /api/v1/workspaces/:workspaceId/stats       → getWorkspaceStats
 *  GET    /api/v1/workspaces/:workspaceId/members     → listMembers
 *  POST   /api/v1/workspaces/:workspaceId/invites     → inviteMember
 *  POST   /api/v1/workspaces/:workspaceId/invites/bulk → bulkInviteMembers
 *  POST   /api/v1/workspaces/:workspaceId/invites/accept → acceptInvite
 *  PATCH  /api/v1/workspaces/:workspaceId/members/:uid/role → updateMemberRole
 *  DELETE /api/v1/workspaces/:workspaceId/members/:uid → removeMember
 *  POST   /api/v1/workspaces/:workspaceId/transfer    → transferOwnership
 *  PATCH  /api/v1/workspaces/:workspaceId/presence    → updatePresence
 */
import type { Request, Response, NextFunction } from "express";
export declare function createWorkspace(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function getWorkspaceById(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function updateWorkspace(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function deleteWorkspace(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function getWorkspaceStats(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function listMembers(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function inviteMember(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function inviteMembersBulk(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function acceptInvite(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function updateMemberRole(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function removeMember(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function transferOwnership(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function updatePresence(req: Request, res: Response, next: NextFunction): Promise<void>;
//# sourceMappingURL=workspaceController.d.ts.map