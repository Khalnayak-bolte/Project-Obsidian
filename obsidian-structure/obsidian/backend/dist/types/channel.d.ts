import { FirestoreTimestamps } from "./common";
export type ChannelType = "text" | "voice" | "announcement";
export type ChannelVisibility = "public" | "private";
export interface Channel extends FirestoreTimestamps {
    channelId: string;
    workspaceId: string;
    name: string;
    description?: string;
    type: ChannelType;
    visibility: ChannelVisibility;
    allowedRoles: string[];
    position: number;
    isArchived: boolean;
    isDefault: boolean;
    createdBy: string;
    lastMessageAt?: FirebaseFirestore.Timestamp;
    lastMessagePreview?: string;
    messageCount?: number;
    chimeMeetingId?: string;
    activeParticipantCount?: number;
}
export interface ChannelCategory extends FirestoreTimestamps {
    categoryId: string;
    workspaceId: string;
    name: string;
    position: number;
    isCollapsed: boolean;
    channelIds: string[];
}
export interface ChannelMember {
    uid: string;
    channelId: string;
    workspaceId: string;
    lastReadAt: FirebaseFirestore.Timestamp;
    unreadCount: number;
    isMuted: boolean;
    joinedAt: FirebaseFirestore.Timestamp;
}
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
export declare const DEFAULT_CHANNELS: Omit<Channel, "channelId" | "workspaceId" | "createdBy" | "chimeMeetingId" | "activeParticipantCount" | "createdAt" | "updatedAt">[];
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
//# sourceMappingURL=channel.d.ts.map