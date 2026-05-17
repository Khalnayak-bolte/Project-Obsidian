/**
 * backend/services/channelService.ts
 * Project: Obsidian
 */
import type { Channel } from "../types/channel";
import type { CreateChannelInput, UpdateChannelInput, ReorderChannelsInput, UpdateChannelPermissionsInput, AddChannelMembersInput, MarkChannelReadInput } from "../schemas/channel.schema";
export declare function createChannel(workspaceId: string, actorId: string, input: CreateChannelInput): Promise<Channel>;
export declare function getChannel(channelId: string, workspaceId: string): Promise<Channel>;
export declare function listChannels(workspaceId: string, roleId: string, opts?: {
    includeArchived?: boolean;
    type?: string;
}): Promise<Channel[]>;
export declare function updateChannel(channelId: string, workspaceId: string, actorId: string, input: UpdateChannelInput): Promise<Channel>;
export declare function deleteChannel(channelId: string, workspaceId: string, actorId: string): Promise<void>;
export declare function archiveChannel(channelId: string, workspaceId: string, actorId: string, isArchived: boolean): Promise<void>;
export declare function reorderChannels(workspaceId: string, actorId: string, input: ReorderChannelsInput): Promise<void>;
export declare function markChannelRead(channelId: string, workspaceId: string, uid: string, _input: MarkChannelReadInput): Promise<void>;
export declare function updateChannelPermissions(channelId: string, workspaceId: string, actorId: string, input: UpdateChannelPermissionsInput): Promise<void>;
export declare function addChannelMembers(channelId: string, workspaceId: string, actorId: string, input: AddChannelMembersInput): Promise<void>;
export declare function getVoiceChannels(workspaceId: string): Promise<Channel[]>;
//# sourceMappingURL=channelService.d.ts.map