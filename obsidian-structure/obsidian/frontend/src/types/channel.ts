/**
 * frontend/src/types/channel.ts
 * Project: Obsidian
 */

// ─── Enums ────────────────────────────────────────────────────────────────────

export type ChannelType = "text" | "voice" | "announcement" | "forum";
export type ChannelVisibility = "public" | "private" | "secret";

// ─── Channel ──────────────────────────────────────────────────────────────────

export interface Channel {
  channelId: string;
  workspaceId: string;
  name: string;
  description?: string;
  topic?: string;
  type: ChannelType;
  visibility: ChannelVisibility;
  allowedRoles: string[];
  position: number;
  isArchived: boolean;
  isDefault: boolean;
  slowMode: number;
  createdBy: string;
  lastMessageAt?: string;
  lastMessagePreview?: string;
  unreadCount?: number;
  activeParticipantCount?: number;
  chimeMeetingId?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Category ─────────────────────────────────────────────────────────────────

export interface ChannelCategory {
  categoryId: string;
  workspaceId: string;
  name: string;
  position: number;
  channels: Channel[];
}

// ─── Member ───────────────────────────────────────────────────────────────────

export interface ChannelMember {
  uid: string;
  channelId: string;
  workspaceId: string;
  isMuted: boolean;
  unreadCount: number;
  lastReadAt?: string;
  joinedAt: string;
}

// ─── Permission overrides ─────────────────────────────────────────────────────

export interface ChannelPermissionOverride {
  roleId: string;
  viewChannel?: boolean;
  sendMessages?: boolean;
  manageMessages?: boolean;
  manageChannel?: boolean;
  joinVoice?: boolean;
  muteMembers?: boolean;
  moveMembers?: boolean;
}

// ─── DTOs ─────────────────────────────────────────────────────────────────────

export interface CreateChannelPayload {
  name: string;
  type?: ChannelType;
  visibility?: ChannelVisibility;
  description?: string;
  allowedRoles?: string[];
  position?: number;
  slowMode?: number;
  topic?: string;
  isDefault?: boolean;
}

export interface UpdateChannelPayload {
  name?: string;
  description?: string;
  topic?: string;
  visibility?: ChannelVisibility;
  allowedRoles?: string[];
  slowMode?: number;
  isArchived?: boolean;
}

export interface ReorderChannelEntry {
  channelId: string;
  position: number;
}

export interface ReorderChannelsPayload {
  order: ReorderChannelEntry[];
}

export interface UpdateChannelPermissionsPayload {
  roleId: string;
  permissions: Omit<ChannelPermissionOverride, "roleId">;
}

export interface AddChannelMembersPayload {
  uids: string[];
}

export interface ChannelsResponse {
  channels: Channel[];
}
