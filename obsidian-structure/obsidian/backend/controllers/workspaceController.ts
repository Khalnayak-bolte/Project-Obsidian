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
import { createLogger } from "../utils/logger";
import { successResponse } from "../utils/helpers";
import { HTTP_STATUS } from "../types/common";
import type { AuthenticatedRequest } from "../types/common";
import {
  CreateWorkspaceSchema,
  UpdateWorkspaceSchema,
  InviteMemberSchema,
  BulkInviteMembersSchema,
  AcceptInviteSchema,
  UpdateMemberRoleSchema,
  DeleteWorkspaceSchema,
  TransferOwnershipSchema,
  UpdatePresenceSchema,
  WorkspaceMembersQuerySchema,
} from "../schemas/workspace.schema";
import {
  createWorkspace as createWorkspaceService,
  getWorkspace,
  updateWorkspace as updateWorkspaceService,
  deleteWorkspace as deleteWorkspaceService,
  inviteMember as inviteMemberService,
  bulkInviteMembers,
  acceptInvite as acceptInviteService,
  removeMember as removeMemberService,
  updateMemberRole as updateMemberRoleService,
  transferOwnership as transferOwnershipService,
  listMembers as listMembersService,
  updatePresence as updatePresenceService,
  getWorkspaceStats as getWorkspaceStatsService,
} from "../services/workspaceService";

const logger = createLogger("workspaceController");

// ─── POST /api/v1/workspaces ──────────────────────────────────────────────────

export async function createWorkspace(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authedReq = req as AuthenticatedRequest;
    const uid = authedReq.user.uid;
    const body = CreateWorkspaceSchema.parse(req.body);

    const workspace = await createWorkspaceService(uid, body);

    logger.info("Workspace created", { workspaceId: workspace.workspaceId, uid });

    res.status(HTTP_STATUS.CREATED).json(
      successResponse(workspace, "Workspace created successfully.")
    );
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/v1/workspaces/:workspaceId ──────────────────────────────────────

export async function getWorkspaceById(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { workspaceId } = req.params;
    const workspace = await getWorkspace(workspaceId);

    res.status(HTTP_STATUS.OK).json(successResponse(workspace));
  } catch (err) {
    next(err);
  }
}

// ─── PATCH /api/v1/workspaces/:workspaceId ────────────────────────────────────

export async function updateWorkspace(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authedReq = req as AuthenticatedRequest;
    const uid = authedReq.user.uid;
    const { workspaceId } = req.params;
    const body = UpdateWorkspaceSchema.parse(req.body);

    const workspace = await updateWorkspaceService(workspaceId, uid, body);

    logger.info("Workspace updated", { workspaceId, uid });

    res.status(HTTP_STATUS.OK).json(
      successResponse(workspace, "Workspace updated successfully.")
    );
  } catch (err) {
    next(err);
  }
}

// ─── DELETE /api/v1/workspaces/:workspaceId ───────────────────────────────────

export async function deleteWorkspace(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authedReq = req as AuthenticatedRequest;
    const uid = authedReq.user.uid;
    const { workspaceId } = req.params;
    const body = DeleteWorkspaceSchema.parse(req.body);

    await deleteWorkspaceService(workspaceId, uid, body);

    logger.info("Workspace deleted", { workspaceId, uid });

    res.status(HTTP_STATUS.OK).json(
      successResponse(null, "Workspace deleted successfully.")
    );
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/v1/workspaces/:workspaceId/stats ────────────────────────────────

export async function getWorkspaceStats(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { workspaceId } = req.params;
    const stats = await getWorkspaceStatsService(workspaceId);

    res.status(HTTP_STATUS.OK).json(successResponse(stats));
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/v1/workspaces/:workspaceId/members ──────────────────────────────

export async function listMembers(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { workspaceId } = req.params;
    const query = WorkspaceMembersQuerySchema.parse(req.query);

    const result = await listMembersService(workspaceId, {
      limit: query.limit,
      cursor: query.cursor,
      roleId: query.roleId,
      search: query.search,
    });

    res.status(HTTP_STATUS.OK).json(
      successResponse(result.members, undefined, {
        limit: query.limit,
        hasMore: !!result.nextCursor,
        nextCursor: result.nextCursor ?? undefined,
      })
    );
  } catch (err) {
    next(err);
  }
}

// ─── POST /api/v1/workspaces/:workspaceId/invites ─────────────────────────────

export async function inviteMember(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authedReq = req as AuthenticatedRequest;
    const uid = authedReq.user.uid;
    const { workspaceId } = req.params;
    const body = InviteMemberSchema.parse(req.body);

    const result = await inviteMemberService(workspaceId, uid, body);

    logger.info("Member invited", { workspaceId, email: body.email, uid });

    res.status(HTTP_STATUS.CREATED).json(
      successResponse(result, "Invitation sent successfully.")
    );
  } catch (err) {
    next(err);
  }
}

// ─── POST /api/v1/workspaces/:workspaceId/invites/bulk ───────────────────────

export async function inviteMembersBulk(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authedReq = req as AuthenticatedRequest;
    const uid = authedReq.user.uid;
    const { workspaceId } = req.params;
    const body = BulkInviteMembersSchema.parse(req.body);

    const result = await bulkInviteMembers(workspaceId, uid, body);

    logger.info("Bulk invite complete", {
      workspaceId,
      sent: result.sent.length,
      skipped: result.skipped.length,
    });

    res.status(HTTP_STATUS.OK).json(
      successResponse(result, `${result.sent.length} invitation(s) sent.`)
    );
  } catch (err) {
    next(err);
  }
}

// ─── POST /api/v1/workspaces/:workspaceId/invites/accept ─────────────────────

export async function acceptInvite(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authedReq = req as AuthenticatedRequest;
    const uid = authedReq.user.uid;
    const { workspaceId } = req.params;
    const body = AcceptInviteSchema.parse(req.body);

    await acceptInviteService(workspaceId, uid, body);

    logger.info("Invite accepted", { workspaceId, uid });

    res.status(HTTP_STATUS.OK).json(
      successResponse(null, "You have joined the workspace.")
    );
  } catch (err) {
    next(err);
  }
}

// ─── PATCH /api/v1/workspaces/:workspaceId/members/:uid/role ─────────────────

export async function updateMemberRole(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authedReq = req as AuthenticatedRequest;
    const actorId = authedReq.user.uid;
    const { workspaceId, uid: targetUid } = req.params;
    const body = UpdateMemberRoleSchema.parse(req.body);

    await updateMemberRoleService(workspaceId, actorId, targetUid, body.roleId);

    logger.info("Member role updated", { workspaceId, actorId, targetUid, roleId: body.roleId });

    res.status(HTTP_STATUS.OK).json(
      successResponse(null, "Member role updated successfully.")
    );
  } catch (err) {
    next(err);
  }
}

// ─── DELETE /api/v1/workspaces/:workspaceId/members/:uid ─────────────────────

export async function removeMember(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authedReq = req as AuthenticatedRequest;
    const actorId = authedReq.user.uid;
    const { workspaceId, uid: targetUid } = req.params;

    await removeMemberService(workspaceId, actorId, targetUid);

    logger.info("Member removed", { workspaceId, actorId, targetUid });

    res.status(HTTP_STATUS.OK).json(
      successResponse(null, "Member removed from workspace.")
    );
  } catch (err) {
    next(err);
  }
}

// ─── POST /api/v1/workspaces/:workspaceId/transfer ───────────────────────────

export async function transferOwnership(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authedReq = req as AuthenticatedRequest;
    const uid = authedReq.user.uid;
    const { workspaceId } = req.params;
    const body = TransferOwnershipSchema.parse(req.body);

    await transferOwnershipService(workspaceId, uid, body);

    logger.info("Ownership transferred", {
      workspaceId,
      from: uid,
      to: body.newOwnerUid,
    });

    res.status(HTTP_STATUS.OK).json(
      successResponse(null, "Workspace ownership transferred successfully.")
    );
  } catch (err) {
    next(err);
  }
}

// ─── PATCH /api/v1/workspaces/:workspaceId/presence ──────────────────────────

export async function updatePresence(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authedReq = req as AuthenticatedRequest;
    const uid = authedReq.user.uid;
    const { workspaceId } = req.params;
    const body = UpdatePresenceSchema.parse(req.body);

    await updatePresenceService(workspaceId, uid, body);

    res.status(HTTP_STATUS.OK).json(
      successResponse({ status: body.status }, "Presence updated.")
    );
  } catch (err) {
    next(err);
  }
}
