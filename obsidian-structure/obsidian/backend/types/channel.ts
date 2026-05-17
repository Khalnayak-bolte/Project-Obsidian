import { FirestoreTimestamps } from "./common";

// ─── Channel Types ────────────────────────────────────────────────────────────

export type ChannelType = "text" | "voice" | "announcement";
export type ChannelVisibility = "public" | "private";

// ─── Channel ──────────────────────────────────────────────────────────────────

export interface Channel extends FirestoreTimestamps {
  channelId: string;
  workspaceId: string;
  name: string;
  description?: string;
  type: ChannelType;
  visibility: ChannelVisibility;
  allowedRoles: string[];              // roleIds that can access this channel
  position: number;                    // ordering in sidebar
  isArchived: boolean;
  isDefault: boolean;                  // auto-joined on workspace entry
  createdBy: string;                   // uid

  // Text channel specific
  lastMessageAt?: FirebaseFirestore.Timestamp;
  lastMessagePreview?: string;
  messageCount?: number;

  // Voice channel specific
  chimeMeetingId?: string;             // active Chime meeting ID if session exists
  activeParticipantCount?: number;
}

// ─── Channel Category ─────────────────────────────────────────────────────────

// Groups channels in the sidebar (like Discord categories)
export interface ChannelCategory extends FirestoreTimestamps {
  categoryId: string;
  workspaceId: string;
  name: string;
  position: number;
  isCollapsed: boolean;
  channelIds: string[];
}

// ─── Channel Member ───────────────────────────────────────────────────────────

export interface ChannelMember {
  uid: string;
  channelId: string;
  workspaceId: string;
  lastReadAt: FirebaseFirestore.Timestamp;
  unreadCount: number;
  isMuted: boolean;
  joinedAt: FirebaseFirestore.Timestamp;
}

// ─── Channel Permissions ──────────────────────────────────────────────────────

export interface ChannelPermissions {
  canSendMessages: boolean;
  canDeleteMessages: boolean;
  canPinMessages: boolean;
  canUploadFiles: boolean;
  canManageChannel: boolean;
  canJoinVoice: boolean;
  canMuteMembers: boolean;
  canKickMembers: boolean;
}

// ─── Default Channels ─────────────────────────────────────────────────────────

// Created automatically when a workspace is initialized
export const DEFAULT_CHANNELS: Omit<
  Channel,
  | "channelId"
  | "workspaceId"
  | "createdBy"
  | "chimeMeetingId"
  | "activeParticipantCount"
  | "createdAt"
  | "updatedAt"
>[] = [
  {
    name: "general",
    type: "text",
    visibility: "public",
    allowedRoles: [],
    position: 0,
    isArchived: false,
    isDefault: true,
    description: "General discussion for the whole team",
  },
  {
    name: "announcements",
    type: "announcement",
    visibility: "public",
    allowedRoles: [],
    position: 1,
    isArchived: false,
    isDefault: true,
    description: "Important announcements from the team",
  },
  {
    name: "general-voice",
    type: "voice",
    visibility: "public",
    allowedRoles: [],
    position: 2,
    isArchived: false,
    isDefault: true,
    description: "General voice room",
  },
];

// ─── Request / Response DTOs ──────────────────────────────────────────────────

export interface CreateChannelDto {
  name: string;
  type: ChannelType;
  visibility: ChannelVisibility;
  description?: string;
  allowedRoles?: string[];
  categoryId?: string;
}

export interface UpdateChannelDto {
  name?: string;
  description?: string;
  visibility?: ChannelVisibility;
  allowedRoles?: string[];
  position?: number;
  isArchived?: boolean;
}

export interface ChannelSummaryDto {
  channelId: string;
  workspaceId: string;
  name: string;
  type: ChannelType;
  visibility: ChannelVisibility;
  position: number;
  isArchived: boolean;
  isDefault: boolean;
  unreadCount?: number;
  lastMessageAt?: FirebaseFirestore.Timestamp;
  lastMessagePreview?: string;
  activeParticipantCount?: number;
  chimeMeetingId?: string;
}
