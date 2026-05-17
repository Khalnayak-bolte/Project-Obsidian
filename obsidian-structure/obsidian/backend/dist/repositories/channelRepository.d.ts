/**
 * backend/repositories/channelRepository.ts
 * Project: Obsidian
 *
 * All Firestore read/write operations for the channels collection.
 * Covers channel lifecycle, membership, categories, and voice session linking.
 * No business logic lives here — only data access.
 */
import type { Channel, ChannelType, ChannelVisibility, ChannelMember } from "../types/channel";
export declare function getChannelById(channelId: string): Promise<Channel | null>;
export declare function getChannelsByWorkspace(workspaceId: string, includeArchived?: boolean): Promise<Channel[]>;
export declare function getChannelsByType(workspaceId: string, type: ChannelType): Promise<Channel[]>;
export declare function getAccessibleChannels(workspaceId: string, roleId: string): Promise<Channel[]>;
export declare function createChannel(params: {
    workspaceId: string;
    name: string;
    type: ChannelType;
    visibility: ChannelVisibility;
    createdBy: string;
    description?: string;
    allowedRoles?: string[];
    isDefault?: boolean;
    position?: number;
}): Promise<Channel>;
export declare function updateChannel(channelId: string, updates: Partial<Pick<Channel, "name" | "description" | "visibility" | "allowedRoles" | "position" | "isArchived" | "lastMessageAt" | "lastMessagePreview" | "chimeMeetingId" | "activeParticipantCount">>): Promise<void>;
export declare function deleteChannel(channelId: string): Promise<void>;
export declare function setChannelArchived(channelId: string, isArchived: boolean): Promise<void>;
export declare function reorderChannels(updates: {
    channelId: string;
    position: number;
}[]): Promise<void>;
export declare function updateChannelLastMessage(channelId: string, preview: string): Promise<void>;
export declare function setChimeMeetingId(channelId: string, chimeMeetingId: string | null): Promise<void>;
export declare function updateActiveParticipantCount(channelId: string, delta: number): Promise<void>;
export declare function getChannelMember(channelId: string, uid: string): Promise<ChannelMember | null>;
export declare function upsertChannelMember(member: Omit<ChannelMember, "joinedAt"> & {
    joinedAt?: FirebaseFirestore.Timestamp;
}): Promise<void>;
export declare function markChannelRead(channelId: string, uid: string): Promise<void>;
export declare function incrementUnreadCount(channelId: string, excludeUid: string, workspaceId: string): Promise<void>;
export declare function seedDefaultChannels(workspaceId: string, createdBy: string): Promise<Channel[]>;
export declare function channelExists(workspaceId: string, name: string, type: ChannelType): Promise<boolean>;
//# sourceMappingURL=channelRepository.d.ts.map