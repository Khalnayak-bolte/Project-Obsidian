/**
 * backend/services/workspaceService.ts
 * Project: Obsidian
 */

import { Timestamp } from "../config/firebase";
import { createLogger } from "../utils/logger";
import { generateSecureToken } from "../utils/hmac";
import { sha256 } from "../utils/hmac";
import { generateSlug } from "../utils/helpers";
import { TIER_LIMITS, DEFAULT_CHANNELS, SYSTEM_ROLES, AUDIT_ACTIONS } from "../utils/constants";
import * as workspaceRepo from "../repositories/workspaceRepository";
import * as userRepo from "../repositories/userRepository";
import * as channelRepo from "../repositories/channelRepository";
import * as subscriptionRepo from "../repositories/subscriptionRepository";
import { AppError } from "../middleware/errorMiddleware";
import { ERROR_CODES, HTTP_STATUS } from "../types/common";
import type { Workspace, WorkspaceMember } from "../types/workspace";
import type {
  CreateWorkspaceInput,
  UpdateWorkspaceInput,
  InviteMemberInput,
  BulkInviteMembersInput,
  AcceptInviteInput,
  TransferOwnershipInput,
  DeleteWorkspaceInput,
  UpdatePresenceInput,
} from "../schemas/workspace.schema";

const logger = createLogger("workspaceService");

// ─── Create workspace ─────────────────────────────────────────────────────────

export async function createWorkspace(
  ownerId: string,
  input: CreateWorkspaceInput
): Promise<Workspace> {
  logger.info("createWorkspace", { ownerId, name: input.name });

  // Ensure user exists
  const user = await userRepo.getUserById(ownerId);
  if (!user) {
    throw new AppError("User not found", HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);
  }

  // Generate unique slug
  const baseSlug = generateSlug(input.name);
  const existing = await workspaceRepo.getWorkspaceBySlug(baseSlug);
  const slug = existing
    ? `${baseSlug}-${Date.now().toString(36)}`
    : baseSlug;

  // Create workspace document
  const workspace = await workspaceRepo.createWorkspace({
    name: input.name,
    slug,
    ownerId,
    industry: input.industry ?? "other",
    teamSize: input.teamSize,
  });

  // Seed default channels
  try {
    for (const ch of DEFAULT_CHANNELS) {
      await channelRepo.createChannel({
        workspaceId: workspace.workspaceId,
        name: ch.name,
        type: ch.type,
        visibility: ch.visibility,
        description: ch.description,
        isDefault: ch.isDefault,
        position: ch.position,
        allowedRoles: [],
        createdBy: ownerId,
      });
    }
  } catch (err) {
    logger.error("Failed to seed default channels", {
      workspaceId: workspace.workspaceId,
      error: err,
    });
    // Non-fatal — workspace still usable
  }

  // Add owner as member with owner role
  await workspaceRepo.addMember({
    workspaceId: workspace.workspaceId,
    uid: ownerId,
    roleId: SYSTEM_ROLES.OWNER,
    email: user.email,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
  });

  // Update user's workspaceId
  await userRepo.updateUser(ownerId, { workspaceId: workspace.workspaceId, roleId: SYSTEM_ROLES.OWNER });

  // Initialize subscription (gold by default)
  await subscriptionRepo.createSubscription({
    workspaceId: workspace.workspaceId,
    tier: "gold",
    ownerId,
  });

  // Audit log
  await workspaceRepo.writeAuditLog({
    workspaceId: workspace.workspaceId,
    actorId: ownerId,
    action: AUDIT_ACTIONS.WORKSPACE_CREATED,
    metadata: { name: input.name, slug },
  });

  logger.info("Workspace created", { workspaceId: workspace.workspaceId, slug });
  return workspace;
}

// ─── Get workspace ────────────────────────────────────────────────────────────

export async function getWorkspace(workspaceId: string): Promise<Workspace> {
  const workspace = await workspaceRepo.getWorkspaceById(workspaceId);
  if (!workspace) {
    throw new AppError("Workspace not found", HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);
  }
  return workspace;
}

// ─── Update workspace ─────────────────────────────────────────────────────────

export async function updateWorkspace(
  workspaceId: string,
  actorId: string,
  input: UpdateWorkspaceInput
): Promise<Workspace> {
  const workspace = await workspaceRepo.getWorkspaceById(workspaceId);
  if (!workspace) {
    throw new AppError("Workspace not found", HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);
  }

  // If renaming, regenerate slug
  let slug: string | undefined;
  if (input.name && input.name !== workspace.name) {
    const baseSlug = generateSlug(input.name);
    const existing = await workspaceRepo.getWorkspaceBySlug(baseSlug);
    slug = existing && existing.workspaceId !== workspaceId
      ? `${baseSlug}-${Date.now().toString(36)}`
      : baseSlug;
  }

  const updated = await workspaceRepo.updateWorkspace(workspaceId, {
    ...input,
    ...(slug ? { slug } : {}),
  });

  await workspaceRepo.writeAuditLog({
    workspaceId,
    actorId,
    action: AUDIT_ACTIONS.WORKSPACE_UPDATED,
    metadata: { fields: Object.keys(input) },
  });

  logger.info("Workspace updated", { workspaceId, actorId });
  return updated;
}

// ─── Delete workspace ─────────────────────────────────────────────────────────

export async function deleteWorkspace(
  workspaceId: string,
  ownerId: string,
  input: DeleteWorkspaceInput
): Promise<void> {
  const workspace = await workspaceRepo.getWorkspaceById(workspaceId);
  if (!workspace) {
    throw new AppError("Workspace not found", HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);
  }

  if (workspace.ownerId !== ownerId) {
    throw new AppError("Only the owner can delete this workspace", HTTP_STATUS.FORBIDDEN, ERROR_CODES.FORBIDDEN);
  }

  if (input.confirmName !== workspace.name) {
    throw new AppError(
      "Workspace name confirmation does not match",
      HTTP_STATUS.BAD_REQUEST,
      ERROR_CODES.BAD_REQUEST
    );
  }

  await workspaceRepo.softDeleteWorkspace(workspaceId);

  await workspaceRepo.writeAuditLog({
    workspaceId,
    actorId: ownerId,
    action: AUDIT_ACTIONS.WORKSPACE_DELETED,
    metadata: { name: workspace.name },
  });

  logger.info("Workspace deleted", { workspaceId, ownerId });
}

// ─── Invite member ────────────────────────────────────────────────────────────

export async function inviteMember(
  workspaceId: string,
  invitedByUid: string,
  input: InviteMemberInput
): Promise<{ inviteToken: string }> {
  const workspace = await workspaceRepo.getWorkspaceById(workspaceId);
  if (!workspace) {
    throw new AppError("Workspace not found", HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);
  }

  // Check tier member limit
  const limits = TIER_LIMITS[workspace.tier as keyof typeof TIER_LIMITS];
  if (workspace.memberCount >= limits.maxMembers) {
    throw new AppError(
      `Member limit of ${limits.maxMembers} reached for your plan. Please upgrade.`,
      HTTP_STATUS.FORBIDDEN,
      ERROR_CODES.FORBIDDEN
    );
  }

  // Check for existing pending invite
  const existing = await workspaceRepo.getInviteByEmail(workspaceId, input.email);
  if (existing) {
    throw new AppError(
      "An invite has already been sent to this email",
      HTTP_STATUS.CONFLICT,
      ERROR_CODES.CONFLICT
    );
  }

  // Check if already a member
  const existingMember = await workspaceRepo.getMemberByEmail(workspaceId, input.email);
  if (existingMember) {
    throw new AppError("This user is already a member of the workspace", HTTP_STATUS.CONFLICT, ERROR_CODES.CONFLICT);
  }

  // Generate token
  const rawToken = generateSecureToken(32);
  const hashedToken = sha256(rawToken);
  const expiresAt = Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));

  await workspaceRepo.createInvite({
    workspaceId,
    invitedByUid,
    email: input.email,
    roleId: input.roleId,
    hashedToken,
    expiresAt,
  });

  await workspaceRepo.writeAuditLog({
    workspaceId,
    actorId: invitedByUid,
    action: AUDIT_ACTIONS.MEMBER_INVITED,
    metadata: { email: input.email, roleId: input.roleId },
  });

  logger.info("Member invited", { workspaceId, email: input.email });
  return { inviteToken: rawToken };
}

// ─── Bulk invite ──────────────────────────────────────────────────────────────

export async function bulkInviteMembers(
  workspaceId: string,
  invitedByUid: string,
  input: BulkInviteMembersInput
): Promise<{ sent: string[]; skipped: string[] }> {
  const sent: string[] = [];
  const skipped: string[] = [];

  for (const invite of input.invites) {
    try {
      await inviteMember(workspaceId, invitedByUid, invite);
      sent.push(invite.email);
    } catch {
      skipped.push(invite.email);
    }
  }

  logger.info("Bulk invite complete", { workspaceId, sent: sent.length, skipped: skipped.length });
  return { sent, skipped };
}

// ─── Accept invite ────────────────────────────────────────────────────────────

export async function acceptInvite(
  workspaceId: string,
  uid: string,
  input: AcceptInviteInput
): Promise<void> {
  const hashedToken = sha256(input.token);
  const invite = await workspaceRepo.getInviteByToken(workspaceId, hashedToken);

  if (!invite) {
    throw new AppError("Invalid or expired invite token", HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);
  }

  const now = Timestamp.now();
  if (invite.expiresAt.toMillis() < now.toMillis()) {
    throw new AppError("This invite has expired", HTTP_STATUS.BAD_REQUEST, ERROR_CODES.BAD_REQUEST);
  }

  const user = await userRepo.getUserById(uid);
  if (!user) {
    throw new AppError("User not found", HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);
  }

  // Add as member
  await workspaceRepo.addMember({
    workspaceId,
    uid,
    roleId: invite.roleId,
    email: user.email,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
  });

  // Update user's workspace
  await userRepo.updateUser(uid, { workspaceId, roleId: invite.roleId });

  // Mark invite accepted
  await workspaceRepo.updateInviteStatus(workspaceId, invite.inviteId, "accepted");

  // Increment member count
  await workspaceRepo.incrementMemberCount(workspaceId, 1);

  await workspaceRepo.writeAuditLog({
    workspaceId,
    actorId: uid,
    action: AUDIT_ACTIONS.MEMBER_JOINED,
    metadata: { email: invite.email, roleId: invite.roleId },
  });

  logger.info("Invite accepted", { workspaceId, uid });
}

// ─── Remove member ────────────────────────────────────────────────────────────

export async function removeMember(
  workspaceId: string,
  actorId: string,
  targetUid: string
): Promise<void> {
  const workspace = await workspaceRepo.getWorkspaceById(workspaceId);
  if (!workspace) {
    throw new AppError("Workspace not found", HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);
  }

  if (workspace.ownerId === targetUid) {
    throw new AppError("Cannot remove the workspace owner", HTTP_STATUS.BAD_REQUEST, ERROR_CODES.BAD_REQUEST);
  }

  await workspaceRepo.removeMember(workspaceId, targetUid);
  await workspaceRepo.incrementMemberCount(workspaceId, -1);
  await userRepo.updateUser(targetUid, { workspaceId: "", roleId: SYSTEM_ROLES.GUEST });

  await workspaceRepo.writeAuditLog({
    workspaceId,
    actorId,
    action: AUDIT_ACTIONS.MEMBER_REMOVED,
    metadata: { targetUid },
  });

  logger.info("Member removed", { workspaceId, actorId, targetUid });
}

// ─── Update member role ───────────────────────────────────────────────────────

export async function updateMemberRole(
  workspaceId: string,
  actorId: string,
  targetUid: string,
  roleId: string
): Promise<void> {
  const workspace = await workspaceRepo.getWorkspaceById(workspaceId);
  if (!workspace) {
    throw new AppError("Workspace not found", HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);
  }

  // Cannot change owner's role
  if (workspace.ownerId === targetUid) {
    throw new AppError("Cannot change the owner's role", HTTP_STATUS.FORBIDDEN, ERROR_CODES.FORBIDDEN);
  }

  await workspaceRepo.updateMemberRole(workspaceId, targetUid, roleId);
  await userRepo.updateUser(targetUid, { roleId });

  await workspaceRepo.writeAuditLog({
    workspaceId,
    actorId,
    action: AUDIT_ACTIONS.ROLE_ASSIGNED,
    metadata: { targetUid, roleId },
  });

  logger.info("Member role updated", { workspaceId, actorId, targetUid, roleId });
}

// ─── Transfer ownership ───────────────────────────────────────────────────────

export async function transferOwnership(
  workspaceId: string,
  currentOwnerId: string,
  input: TransferOwnershipInput
): Promise<void> {
  const workspace = await workspaceRepo.getWorkspaceById(workspaceId);
  if (!workspace) {
    throw new AppError("Workspace not found", HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);
  }

  if (workspace.ownerId !== currentOwnerId) {
    throw new AppError("Only the current owner can transfer ownership", HTTP_STATUS.FORBIDDEN, ERROR_CODES.FORBIDDEN);
  }

  if (input.confirmName !== workspace.name) {
    throw new AppError("Workspace name confirmation does not match", HTTP_STATUS.BAD_REQUEST, ERROR_CODES.BAD_REQUEST);
  }

  if (input.newOwnerUid === currentOwnerId) {
    throw new AppError("New owner must be a different user", HTTP_STATUS.BAD_REQUEST, ERROR_CODES.BAD_REQUEST);
  }

  // Verify new owner is a member
  const newOwnerMember = await workspaceRepo.getMemberById(workspaceId, input.newOwnerUid);
  if (!newOwnerMember) {
    throw new AppError("New owner must be an existing workspace member", HTTP_STATUS.BAD_REQUEST, ERROR_CODES.BAD_REQUEST);
  }

  // Swap roles
  await workspaceRepo.updateMemberRole(workspaceId, currentOwnerId, SYSTEM_ROLES.ADMIN);
  await workspaceRepo.updateMemberRole(workspaceId, input.newOwnerUid, SYSTEM_ROLES.OWNER);
  await workspaceRepo.updateWorkspace(workspaceId, { ownerId: input.newOwnerUid });
  await userRepo.updateUser(currentOwnerId, { roleId: SYSTEM_ROLES.ADMIN });
  await userRepo.updateUser(input.newOwnerUid, { roleId: SYSTEM_ROLES.OWNER });

  await workspaceRepo.writeAuditLog({
    workspaceId,
    actorId: currentOwnerId,
    action: AUDIT_ACTIONS.OWNERSHIP_TRANSFERRED,
    metadata: { previousOwner: currentOwnerId, newOwner: input.newOwnerUid },
  });

  logger.info("Ownership transferred", { workspaceId, from: currentOwnerId, to: input.newOwnerUid });
}

// ─── List members ─────────────────────────────────────────────────────────────

export async function listMembers(
  workspaceId: string,
  query: { limit?: number; cursor?: string; roleId?: string; search?: string }
): Promise<{ members: WorkspaceMember[]; nextCursor: string | null }> {
  const workspace = await workspaceRepo.getWorkspaceById(workspaceId);
  if (!workspace) {
    throw new AppError("Workspace not found", HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);
  }

  return workspaceRepo.listMembers(workspaceId, {
    limit: query.limit ?? 50,
    cursor: query.cursor,
    roleId: query.roleId,
    search: query.search,
  });
}

// ─── Update presence ──────────────────────────────────────────────────────────

export async function updatePresence(
  workspaceId: string,
  uid: string,
  input: UpdatePresenceInput
): Promise<void> {
  await userRepo.updatePresence(uid, workspaceId, input.status);
}

// ─── Expire stale invites ─────────────────────────────────────────────────────

export async function expireStaleInvites(workspaceId: string): Promise<number> {
  return workspaceRepo.expireStaleInvites(workspaceId);
}

// ─── Get workspace stats ──────────────────────────────────────────────────────

export async function getWorkspaceStats(workspaceId: string): Promise<{
  memberCount: number;
  storageUsedBytes: number;
  storageCapacityBytes: number;
  tier: string;
  storagePercent: number;
}> {
  const workspace = await workspaceRepo.getWorkspaceById(workspaceId);
  if (!workspace) {
    throw new AppError("Workspace not found", HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);
  }

  const limits = TIER_LIMITS[workspace.tier as keyof typeof TIER_LIMITS];
  const storageUsedBytes = workspace.storageUsed ?? 0;
  const storageCapacityBytes = limits.maxStorageBytes;
  const storagePercent = Math.round((storageUsedBytes / storageCapacityBytes) * 100);

  return {
    memberCount: workspace.memberCount,
    storageUsedBytes,
    storageCapacityBytes,
    tier: workspace.tier,
    storagePercent,
  };
}
