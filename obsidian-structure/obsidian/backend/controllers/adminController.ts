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
import { z } from "zod";
import { createLogger } from "../utils/logger";
import { successResponse, generateRoleId } from "../utils/helpers";
import { HTTP_STATUS, ERROR_CODES } from "../types/common";
import type { AuthenticatedRequest } from "../types/common";
import { AppError } from "../middleware/errorMiddleware";
import { db, COLLECTIONS, FieldValue, Timestamp } from "../config/firebase";
import { AUDIT_ACTIONS, SYSTEM_ROLES } from "../utils/constants";
import {
  listMembers as listMembersService,
  removeMember as removeMemberService,
  getWorkspaceStats as getWorkspaceStatsService,
} from "../services/workspaceService";
import {
  getUserById,
  updateUserProfile,
} from "../repositories/userRepository";
import { getWorkspaceById } from "../repositories/workspaceRepository";

const logger = createLogger("adminController");

// ─── Local Zod schemas (admin-specific, not in payment.schema.ts) ─────────────

const AuditLogQuerySchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 50))
    .pipe(z.number().int().min(1).max(200)),
  cursor: z.string().trim().optional(),
  action: z.string().trim().optional(),
  uid: z.string().trim().optional(),
});

const BanMemberSchema = z.object({
  reason: z
    .string({ required_error: "Ban reason is required." })
    .trim()
    .min(4, "Reason must be at least 4 characters.")
    .max(512, "Reason must not exceed 512 characters."),
  permanent: z.boolean().optional().default(true),
  expiresAt: z.number().int().positive().optional(), // Unix timestamp
});

const CreateRoleSchema = z.object({
  name: z
    .string({ required_error: "Role name is required." })
    .trim()
    .min(2, "Role name must be at least 2 characters.")
    .max(32, "Role name must not exceed 32 characters.")
    .regex(/^[a-zA-Z0-9 _-]+$/, "Role name contains invalid characters."),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Color must be a valid hex code.")
    .optional()
    .default("#6D5EF5"),
  permissions: z.record(z.boolean()).optional().default({}),
  hoistable: z.boolean().optional().default(false),
});

const UpdateRoleSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2)
    .max(32)
    .regex(/^[a-zA-Z0-9 _-]+$/)
    .optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
  permissions: z.record(z.boolean()).optional(),
  hoistable: z.boolean().optional(),
});

const AssignRoleSchema = z.object({
  roleId: z
    .string({ required_error: "Role ID is required." })
    .trim()
    .min(1)
    .max(64),
});

const BulkDeleteMessagesSchema = z.object({
  channelId: z
    .string({ required_error: "Channel ID is required." })
    .trim()
    .min(1)
    .max(64),
  messageIds: z
    .array(z.string().trim().min(1).max(64))
    .min(1, "At least one message ID is required.")
    .max(100, "Cannot bulk-delete more than 100 messages at once."),
});

// ─── Helper: write audit log entry ───────────────────────────────────────────

async function writeAuditLog(
  workspaceId: string,
  uid: string,
  action: string,
  meta: Record<string, unknown> = {}
): Promise<void> {
  try {
    await db.collection(COLLECTIONS.ACTIVITY_LOGS).add({
      workspaceId,
      actorId: uid,
      action,
      meta,
      createdAt: Timestamp.now(),
    });
  } catch (err) {
    logger.error("Failed to write audit log", { workspaceId, uid, action, err });
  }
}

// ─── GET /api/v1/admin/audit-log ─────────────────────────────────────────────

export async function getAuditLog(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authedReq = req as AuthenticatedRequest;
    const workspaceId = authedReq.user.workspaceId;
    const query = AuditLogQuerySchema.parse(req.query);

    let ref = db
      .collection(COLLECTIONS.ACTIVITY_LOGS)
      .where("workspaceId", "==", workspaceId)
      .orderBy("createdAt", "desc");

    if (query.action) {
      ref = ref.where("action", "==", query.action) as typeof ref;
    }

    if (query.uid) {
      ref = ref.where("actorId", "==", query.uid) as typeof ref;
    }

    if (query.cursor) {
      const cursorSnap = await db
        .collection(COLLECTIONS.ACTIVITY_LOGS)
        .doc(query.cursor)
        .get();
      if (cursorSnap.exists) {
        ref = ref.startAfter(cursorSnap) as typeof ref;
      }
    }

    const snap = await ref.limit(query.limit + 1).get();
    const hasMore = snap.docs.length > query.limit;
    const docs = hasMore ? snap.docs.slice(0, query.limit) : snap.docs;

    const entries = docs.map((d) => ({ id: d.id, ...d.data() }));
    const nextCursor = hasMore ? docs[docs.length - 1].id : undefined;

    logger.info("Audit log fetched", { workspaceId, count: entries.length });

    res.status(HTTP_STATUS.OK).json(
      successResponse(
        { entries, hasMore, nextCursor },
        "Audit log retrieved."
      )
    );
  } catch (err) {
    logger.error("getAuditLog failed", { error: err });
    next(err);
  }
}

// ─── GET /api/v1/admin/members ────────────────────────────────────────────────

export async function listMembers(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authedReq = req as AuthenticatedRequest;
    const workspaceId = authedReq.user.workspaceId;

    const limit = parseInt((req.query.limit as string) ?? "50", 10);
    const cursor = req.query.cursor as string | undefined;

    const result = await listMembersService(workspaceId, {
      limit: Math.min(limit, 200),
      cursor,
    });

    logger.info("Admin: members listed", { workspaceId });

    res
      .status(HTTP_STATUS.OK)
      .json(successResponse(result, "Members retrieved."));
  } catch (err) {
    logger.error("listMembers (admin) failed", { error: err });
    next(err);
  }
}

// ─── POST /api/v1/admin/members/:uid/ban ────────────────────────────────────

export async function banMember(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authedReq = req as AuthenticatedRequest;
    const actorId = authedReq.user.uid;
    const workspaceId = authedReq.user.workspaceId;
    const targetUid = req.params.uid;
    const body = BanMemberSchema.parse(req.body);

    if (targetUid === actorId) {
      throw new AppError(
        "You cannot ban yourself.",
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.BAD_REQUEST
      );
    }

    const targetUser = await getUserById(targetUid);
    if (!targetUser || targetUser.workspaceId !== workspaceId) {
      throw new AppError(
        "Member not found in this workspace.",
        HTTP_STATUS.NOT_FOUND,
        ERROR_CODES.NOT_FOUND
      );
    }

    if (targetUser.roleId === SYSTEM_ROLES.OWNER) {
      throw new AppError(
        "Workspace owner cannot be banned.",
        HTTP_STATUS.FORBIDDEN,
        ERROR_CODES.FORBIDDEN
      );
    }

    // Mark user as banned in their profile
    await updateUserProfile(targetUid, {
      status: "banned",
      bannedAt: Timestamp.now(),
      bannedBy: actorId,
      banReason: body.reason,
      banExpiresAt: body.expiresAt
        ? Timestamp.fromMillis(body.expiresAt * 1000)
        : null,
    } as Parameters<typeof updateUserProfile>[1]);

    await writeAuditLog(workspaceId, actorId, AUDIT_ACTIONS.MEMBER_BANNED, {
      targetUid,
      reason: body.reason,
      permanent: body.permanent,
    });

    logger.info("Member banned", { workspaceId, actorId, targetUid });

    res
      .status(HTTP_STATUS.OK)
      .json(successResponse({ uid: targetUid }, "Member banned."));
  } catch (err) {
    logger.error("banMember failed", { error: err });
    next(err);
  }
}

// ─── DELETE /api/v1/admin/members/:uid/ban ───────────────────────────────────

export async function unbanMember(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authedReq = req as AuthenticatedRequest;
    const actorId = authedReq.user.uid;
    const workspaceId = authedReq.user.workspaceId;
    const targetUid = req.params.uid;

    const targetUser = await getUserById(targetUid);
    if (!targetUser || targetUser.workspaceId !== workspaceId) {
      throw new AppError(
        "Member not found in this workspace.",
        HTTP_STATUS.NOT_FOUND,
        ERROR_CODES.NOT_FOUND
      );
    }

    await updateUserProfile(targetUid, {
      status: "offline",
      bannedAt: FieldValue.delete() as unknown as FirebaseFirestore.Timestamp,
      bannedBy: FieldValue.delete() as unknown as string,
      banReason: FieldValue.delete() as unknown as string,
      banExpiresAt: FieldValue.delete() as unknown as FirebaseFirestore.Timestamp,
    } as Parameters<typeof updateUserProfile>[1]);

    await writeAuditLog(workspaceId, actorId, AUDIT_ACTIONS.MEMBER_UNBANNED, {
      targetUid,
    });

    logger.info("Member unbanned", { workspaceId, actorId, targetUid });

    res
      .status(HTTP_STATUS.OK)
      .json(successResponse({ uid: targetUid }, "Member unbanned."));
  } catch (err) {
    logger.error("unbanMember failed", { error: err });
    next(err);
  }
}

// ─── DELETE /api/v1/admin/members/:uid ───────────────────────────────────────

export async function removeMember(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authedReq = req as AuthenticatedRequest;
    const actorId = authedReq.user.uid;
    const workspaceId = authedReq.user.workspaceId;
    const targetUid = req.params.uid;

    if (targetUid === actorId) {
      throw new AppError(
        "You cannot remove yourself.",
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.BAD_REQUEST
      );
    }

    await removeMemberService(workspaceId, actorId, targetUid);

    await writeAuditLog(workspaceId, actorId, AUDIT_ACTIONS.MEMBER_REMOVED, {
      targetUid,
    });

    logger.info("Member removed by admin", { workspaceId, actorId, targetUid });

    res
      .status(HTTP_STATUS.OK)
      .json(successResponse({ uid: targetUid }, "Member removed from workspace."));
  } catch (err) {
    logger.error("removeMember (admin) failed", { error: err });
    next(err);
  }
}

// ─── GET /api/v1/admin/roles ──────────────────────────────────────────────────

export async function listRoles(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authedReq = req as AuthenticatedRequest;
    const workspaceId = authedReq.user.workspaceId;

    const snap = await db
      .collection(COLLECTIONS.ROLES)
      .where("workspaceId", "==", workspaceId)
      .orderBy("createdAt", "asc")
      .get();

    const roles = snap.docs.map((d) => ({ roleId: d.id, ...d.data() }));

    logger.info("Roles listed", { workspaceId, count: roles.length });

    res
      .status(HTTP_STATUS.OK)
      .json(successResponse({ roles }, "Roles retrieved."));
  } catch (err) {
    logger.error("listRoles failed", { error: err });
    next(err);
  }
}

// ─── POST /api/v1/admin/roles ─────────────────────────────────────────────────

export async function createRole(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authedReq = req as AuthenticatedRequest;
    const actorId = authedReq.user.uid;
    const workspaceId = authedReq.user.workspaceId;
    const body = CreateRoleSchema.parse(req.body);

    // Enforce per-tier role limits
    const workspace = await getWorkspaceById(workspaceId);
    if (!workspace) {
      throw new AppError("Workspace not found.", HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);
    }

    const existingSnap = await db
      .collection(COLLECTIONS.ROLES)
      .where("workspaceId", "==", workspaceId)
      .get();

    const maxRoles = workspace.tier === "gold" ? 5 : workspace.tier === "premium" ? 15 : 50;
    if (existingSnap.size >= maxRoles) {
      throw new AppError(
        `Your plan allows a maximum of ${maxRoles} custom roles.`,
        HTTP_STATUS.FORBIDDEN,
        ERROR_CODES.TIER_LIMIT_EXCEEDED
      );
    }

    const roleId = generateRoleId();
    const now = Timestamp.now();

    const roleData = {
      roleId,
      workspaceId,
      name: body.name,
      color: body.color,
      permissions: body.permissions,
      hoistable: body.hoistable,
      isSystem: false,
      createdBy: actorId,
      createdAt: now,
      updatedAt: now,
    };

    await db.collection(COLLECTIONS.ROLES).doc(roleId).set(roleData);

    await writeAuditLog(workspaceId, actorId, AUDIT_ACTIONS.ROLE_CREATED, {
      roleId,
      name: body.name,
    });

    logger.info("Role created", { workspaceId, actorId, roleId });

    res
      .status(HTTP_STATUS.CREATED)
      .json(successResponse(roleData, "Role created."));
  } catch (err) {
    logger.error("createRole failed", { error: err });
    next(err);
  }
}

// ─── PATCH /api/v1/admin/roles/:roleId ───────────────────────────────────────

export async function updateRole(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authedReq = req as AuthenticatedRequest;
    const actorId = authedReq.user.uid;
    const workspaceId = authedReq.user.workspaceId;
    const { roleId } = req.params;
    const body = UpdateRoleSchema.parse(req.body);

    const roleRef = db.collection(COLLECTIONS.ROLES).doc(roleId);
    const roleSnap = await roleRef.get();

    if (!roleSnap.exists || roleSnap.data()?.workspaceId !== workspaceId) {
      throw new AppError("Role not found.", HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);
    }

    if (roleSnap.data()?.isSystem) {
      throw new AppError(
        "System roles cannot be modified.",
        HTTP_STATUS.FORBIDDEN,
        ERROR_CODES.FORBIDDEN
      );
    }

    const updates: Record<string, unknown> = { updatedAt: Timestamp.now() };
    if (body.name !== undefined) updates.name = body.name;
    if (body.color !== undefined) updates.color = body.color;
    if (body.permissions !== undefined) updates.permissions = body.permissions;
    if (body.hoistable !== undefined) updates.hoistable = body.hoistable;

    await roleRef.update(updates);

    await writeAuditLog(workspaceId, actorId, AUDIT_ACTIONS.ROLE_UPDATED, {
      roleId,
      changes: Object.keys(updates).filter((k) => k !== "updatedAt"),
    });

    logger.info("Role updated", { workspaceId, actorId, roleId });

    res
      .status(HTTP_STATUS.OK)
      .json(successResponse({ roleId, ...updates }, "Role updated."));
  } catch (err) {
    logger.error("updateRole failed", { error: err });
    next(err);
  }
}

// ─── DELETE /api/v1/admin/roles/:roleId ──────────────────────────────────────

export async function deleteRole(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authedReq = req as AuthenticatedRequest;
    const actorId = authedReq.user.uid;
    const workspaceId = authedReq.user.workspaceId;
    const { roleId } = req.params;

    const roleRef = db.collection(COLLECTIONS.ROLES).doc(roleId);
    const roleSnap = await roleRef.get();

    if (!roleSnap.exists || roleSnap.data()?.workspaceId !== workspaceId) {
      throw new AppError("Role not found.", HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);
    }

    if (roleSnap.data()?.isSystem) {
      throw new AppError(
        "System roles cannot be deleted.",
        HTTP_STATUS.FORBIDDEN,
        ERROR_CODES.FORBIDDEN
      );
    }

    // Reassign members with this role to guest before deleting
    const affectedSnap = await db
      .collection(COLLECTIONS.USERS)
      .where("workspaceId", "==", workspaceId)
      .where("roleId", "==", roleId)
      .get();

    const batch = db.batch();
    affectedSnap.docs.forEach((d) => {
      batch.update(d.ref, { roleId: SYSTEM_ROLES.GUEST, updatedAt: Timestamp.now() });
    });
    batch.delete(roleRef);
    await batch.commit();

    await writeAuditLog(workspaceId, actorId, AUDIT_ACTIONS.ROLE_DELETED, {
      roleId,
      affectedMembers: affectedSnap.size,
    });

    logger.info("Role deleted", { workspaceId, actorId, roleId, affectedMembers: affectedSnap.size });

    res
      .status(HTTP_STATUS.OK)
      .json(successResponse({ roleId }, "Role deleted. Affected members reassigned to Guest."));
  } catch (err) {
    logger.error("deleteRole failed", { error: err });
    next(err);
  }
}

// ─── PATCH /api/v1/admin/members/:uid/role ────────────────────────────────────

export async function assignRole(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authedReq = req as AuthenticatedRequest;
    const actorId = authedReq.user.uid;
    const workspaceId = authedReq.user.workspaceId;
    const targetUid = req.params.uid;
    const body = AssignRoleSchema.parse(req.body);

    const targetUser = await getUserById(targetUid);
    if (!targetUser || targetUser.workspaceId !== workspaceId) {
      throw new AppError(
        "Member not found in this workspace.",
        HTTP_STATUS.NOT_FOUND,
        ERROR_CODES.NOT_FOUND
      );
    }

    if (targetUser.roleId === SYSTEM_ROLES.OWNER) {
      throw new AppError(
        "Workspace owner role cannot be reassigned via this endpoint. Use transfer ownership.",
        HTTP_STATUS.FORBIDDEN,
        ERROR_CODES.FORBIDDEN
      );
    }

    // Verify role exists in this workspace (or is a system role)
    const isSystemRole = Object.values(SYSTEM_ROLES).includes(body.roleId as typeof SYSTEM_ROLES[keyof typeof SYSTEM_ROLES]);
    if (!isSystemRole) {
      const roleSnap = await db.collection(COLLECTIONS.ROLES).doc(body.roleId).get();
      if (!roleSnap.exists || roleSnap.data()?.workspaceId !== workspaceId) {
        throw new AppError("Role not found in this workspace.", HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);
      }
    }

    await updateUserProfile(targetUid, { roleId: body.roleId } as Parameters<typeof updateUserProfile>[1]);

    await writeAuditLog(workspaceId, actorId, AUDIT_ACTIONS.ROLE_ASSIGNED, {
      targetUid,
      roleId: body.roleId,
      previousRoleId: targetUser.roleId,
    });

    logger.info("Role assigned", { workspaceId, actorId, targetUid, roleId: body.roleId });

    res
      .status(HTTP_STATUS.OK)
      .json(successResponse({ uid: targetUid, roleId: body.roleId }, "Role assigned."));
  } catch (err) {
    logger.error("assignRole failed", { error: err });
    next(err);
  }
}

// ─── GET /api/v1/admin/stats ──────────────────────────────────────────────────

export async function getWorkspaceStats(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authedReq = req as AuthenticatedRequest;
    const workspaceId = authedReq.user.workspaceId;

    const stats = await getWorkspaceStatsService(workspaceId);

    logger.info("Admin: workspace stats fetched", { workspaceId });

    res
      .status(HTTP_STATUS.OK)
      .json(successResponse(stats, "Workspace stats retrieved."));
  } catch (err) {
    logger.error("getWorkspaceStats (admin) failed", { error: err });
    next(err);
  }
}

// ─── POST /api/v1/admin/messages/bulk-delete ─────────────────────────────────

export async function bulkDeleteMessages(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authedReq = req as AuthenticatedRequest;
    const actorId = authedReq.user.uid;
    const workspaceId = authedReq.user.workspaceId;
    const body = BulkDeleteMessagesSchema.parse(req.body);

    // Verify channel belongs to this workspace
    const channelSnap = await db
      .collection(COLLECTIONS.CHANNELS)
      .doc(body.channelId)
      .get();

    if (!channelSnap.exists || channelSnap.data()?.workspaceId !== workspaceId) {
      throw new AppError(
        "Channel not found in this workspace.",
        HTTP_STATUS.NOT_FOUND,
        ERROR_CODES.NOT_FOUND
      );
    }

    // Soft-delete each message: mark as deleted, clear content
    const batch = db.batch();
    const now = Timestamp.now();

    for (const messageId of body.messageIds) {
      const msgRef = db.collection(COLLECTIONS.MESSAGES).doc(messageId);
      batch.update(msgRef, {
        deleted: true,
        deletedAt: now,
        deletedBy: actorId,
        content: "",
        attachments: [],
        updatedAt: now,
      });
    }

    await batch.commit();

    await writeAuditLog(workspaceId, actorId, AUDIT_ACTIONS.MESSAGES_BULK_DELETED, {
      channelId: body.channelId,
      count: body.messageIds.length,
      messageIds: body.messageIds,
    });

    logger.info("Bulk messages deleted", {
      workspaceId,
      actorId,
      channelId: body.channelId,
      count: body.messageIds.length,
    });

    res.status(HTTP_STATUS.OK).json(
      successResponse(
        { deleted: body.messageIds.length, channelId: body.channelId },
        `${body.messageIds.length} message(s) deleted.`
      )
    );
  } catch (err) {
    logger.error("bulkDeleteMessages failed", { error: err });
    next(err);
  }
}
