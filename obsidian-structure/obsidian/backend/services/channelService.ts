/**
 * backend/services/channelService.ts
 * Project: Obsidian
 */

import { createLogger } from "../utils/logger";
import { AUDIT_ACTIONS, CHANNEL_TYPES, TIER_LIMITS } from "../utils/constants";
import * as channelRepo from "../repositories/channelRepository";
import * as workspaceRepo from "../repositories/workspaceRepository";
import { AppError } from "../middleware/errorMiddleware";
import { ERROR_CODES, HTTP_STATUS } from "../types/common";
import type { Channel, ChannelCategory } from "../types/channel";
import type {
  CreateChannelInput,
  UpdateChannelInput,
  ReorderChannelsInput,
  CreateCategoryInput,
  UpdateCategoryInput,
  UpdateChannelPermissionsInput,
  AddChannelMembersInput,
  MarkChannelReadInput,
} from "../schemas/channel.schema";

const logger = createLogger("channelService");

// ─── Create channel ───────────────────────────────────────────────────────────

export async function createChannel(
  workspaceId: string,
  actorId: string,
  input: CreateChannelInput
): Promise<Channel> {
  const workspace = await workspaceRepo.getWorkspaceById(workspaceId);
  if (!workspace) {
    throw new AppError("Workspace not found", HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);
  }

  // Tier channel limit
  const limits = TIER_LIMITS[workspace.tier as keyof typeof TIER_LIMITS];
  const existing = await channelRepo.getChannelsByWorkspace(workspaceId);
  if (existing.length >= limits.maxChannels) {
    throw new AppError(
      `Channel limit of ${limits.maxChannels} reached for your plan. Please upgrade.`,
      HTTP_STATUS.FORBIDDEN,
      ERROR_CODES.FORBIDDEN
    );
  }

  // Name uniqueness within workspace + type
  const taken = await channelRepo.channelExists(workspaceId, input.name, input.type);
  if (taken) {
    throw new AppError(
      `A ${input.type} channel named "${input.name}" already exists`,
      HTTP_STATUS.CONFLICT,
      ERROR_CODES.CONFLICT
    );
  }

  const channel = await channelRepo.createChannel({
    workspaceId,
    name: input.name,
    type: input.type,
    visibility: input.visibility,
    description: input.description,
    allowedRoles: input.allowedRoles ?? [],
    position: input.position ?? existing.length,
    createdBy: actorId,
  });

  await workspaceRepo.writeAuditLog({
    workspaceId,
    actorId,
    action: AUDIT_ACTIONS.CHANNEL_CREATED,
    metadata: { channelId: channel.channelId, name: channel.name, type: channel.type },
  });

  logger.info("Channel created", { channelId: channel.channelId, workspaceId });
  return channel;
}

// ─── Get channel ──────────────────────────────────────────────────────────────

export async function getChannel(
  channelId: string,
  workspaceId: string
): Promise<Channel> {
  const channel = await channelRepo.getChannelById(channelId);
  if (!channel || channel.workspaceId !== workspaceId) {
    throw new AppError("Channel not found", HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);
  }
  return channel;
}

// ─── List channels ────────────────────────────────────────────────────────────

export async function listChannels(
  workspaceId: string,
  roleId: string,
  opts: { includeArchived?: boolean; type?: string } = {}
): Promise<Channel[]> {
  const workspace = await workspaceRepo.getWorkspaceById(workspaceId);
  if (!workspace) {
    throw new AppError("Workspace not found", HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);
  }

  if (opts.type) {
    return channelRepo.getChannelsByType(workspaceId, opts.type as any);
  }

  return channelRepo.getAccessibleChannels(workspaceId, roleId);
}

// ─── Update channel ───────────────────────────────────────────────────────────

export async function updateChannel(
  channelId: string,
  workspaceId: string,
  actorId: string,
  input: UpdateChannelInput
): Promise<Channel> {
  const channel = await channelRepo.getChannelById(channelId);
  if (!channel || channel.workspaceId !== workspaceId) {
    throw new AppError("Channel not found", HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);
  }

  if (channel.isDefault && input.isArchived) {
    throw new AppError("Default channels cannot be archived", HTTP_STATUS.BAD_REQUEST, ERROR_CODES.BAD_REQUEST);
  }

  // Name conflict check on rename
  if (input.name && input.name !== channel.name) {
    const taken = await channelRepo.channelExists(workspaceId, input.name, channel.type);
    if (taken) {
      throw new AppError(
        `A channel named "${input.name}" already exists`,
        HTTP_STATUS.CONFLICT,
        ERROR_CODES.CONFLICT
      );
    }
  }

  await channelRepo.updateChannel(channelId, input);

  await workspaceRepo.writeAuditLog({
    workspaceId,
    actorId,
    action: AUDIT_ACTIONS.CHANNEL_UPDATED,
    metadata: { channelId, fields: Object.keys(input) },
  });

  const updated = await channelRepo.getChannelById(channelId);
  logger.info("Channel updated", { channelId, workspaceId });
  return updated!;
}

// ─── Delete channel ───────────────────────────────────────────────────────────

export async function deleteChannel(
  channelId: string,
  workspaceId: string,
  actorId: string
): Promise<void> {
  const channel = await channelRepo.getChannelById(channelId);
  if (!channel || channel.workspaceId !== workspaceId) {
    throw new AppError("Channel not found", HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);
  }

  if (channel.isDefault) {
    throw new AppError("Default channels cannot be deleted", HTTP_STATUS.BAD_REQUEST, ERROR_CODES.BAD_REQUEST);
  }

  await channelRepo.deleteChannel(channelId);

  await workspaceRepo.writeAuditLog({
    workspaceId,
    actorId,
    action: AUDIT_ACTIONS.CHANNEL_DELETED,
    metadata: { channelId, name: channel.name },
  });

  logger.info("Channel deleted", { channelId, workspaceId });
}

// ─── Archive channel ──────────────────────────────────────────────────────────

export async function archiveChannel(
  channelId: string,
  workspaceId: string,
  actorId: string,
  isArchived: boolean
): Promise<void> {
  const channel = await channelRepo.getChannelById(channelId);
  if (!channel || channel.workspaceId !== workspaceId) {
    throw new AppError("Channel not found", HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);
  }

  if (channel.isDefault && isArchived) {
    throw new AppError("Default channels cannot be archived", HTTP_STATUS.BAD_REQUEST, ERROR_CODES.BAD_REQUEST);
  }

  await channelRepo.setChannelArchived(channelId, isArchived);

  await workspaceRepo.writeAuditLog({
    workspaceId,
    actorId,
    action: AUDIT_ACTIONS.CHANNEL_UPDATED,
    metadata: { channelId, isArchived },
  });

  logger.info("Channel archive status updated", { channelId, isArchived });
}

// ─── Reorder channels ─────────────────────────────────────────────────────────

export async function reorderChannels(
  workspaceId: string,
  actorId: string,
  input: ReorderChannelsInput
): Promise<void> {
  // Validate all channels belong to workspace
  const channels = await channelRepo.getChannelsByWorkspace(workspaceId, true);
  const workspaceChannelIds = new Set(channels.map((c) => c.channelId));

  for (const { channelId } of input.order) {
    if (!workspaceChannelIds.has(channelId)) {
      throw new AppError(
        `Channel ${channelId} does not belong to this workspace`,
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.BAD_REQUEST
      );
    }
  }

  await channelRepo.reorderChannels(input.order);
  logger.info("Channels reordered", { workspaceId, count: input.order.length });
}

// ─── Mark channel as read ─────────────────────────────────────────────────────

export async function markChannelRead(
  channelId: string,
  workspaceId: string,
  uid: string,
  _input: MarkChannelReadInput
): Promise<void> {
  const channel = await channelRepo.getChannelById(channelId);
  if (!channel || channel.workspaceId !== workspaceId) {
    throw new AppError("Channel not found", HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);
  }

  await channelRepo.markChannelRead(channelId, uid);
}

// ─── Update channel permissions ───────────────────────────────────────────────

export async function updateChannelPermissions(
  channelId: string,
  workspaceId: string,
  actorId: string,
  input: UpdateChannelPermissionsInput
): Promise<void> {
  const channel = await channelRepo.getChannelById(channelId);
  if (!channel || channel.workspaceId !== workspaceId) {
    throw new AppError("Channel not found", HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);
  }

  // Store permission overrides as a sub-document under channel
  const { db, COLLECTIONS } = await import("../config/firebase");
  await db
    .collection(COLLECTIONS.CHANNELS)
    .doc(channelId)
    .collection("permissionOverrides")
    .doc(input.roleId)
    .set({ roleId: input.roleId, ...input.permissions }, { merge: true });

  logger.info("Channel permissions updated", { channelId, roleId: input.roleId });
}

// ─── Add members to private channel ──────────────────────────────────────────

export async function addChannelMembers(
  channelId: string,
  workspaceId: string,
  actorId: string,
  input: AddChannelMembersInput
): Promise<void> {
  const channel = await channelRepo.getChannelById(channelId);
  if (!channel || channel.workspaceId !== workspaceId) {
    throw new AppError("Channel not found", HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);
  }

  if (channel.visibility !== "private") {
    throw new AppError(
      "Members can only be explicitly added to private channels",
      HTTP_STATUS.BAD_REQUEST,
      ERROR_CODES.BAD_REQUEST
    );
  }

  for (const uid of input.uids) {
    await channelRepo.upsertChannelMember({
      channelId,
      workspaceId,
      uid,
      isMuted: false,
      unreadCount: 0,
    });
  }

  logger.info("Members added to channel", { channelId, count: input.uids.length });
}

// ─── Get voice channels ───────────────────────────────────────────────────────

export async function getVoiceChannels(workspaceId: string): Promise<Channel[]> {
  return channelRepo.getChannelsByType(workspaceId, CHANNEL_TYPES.VOICE);
}
