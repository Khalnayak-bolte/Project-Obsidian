/**
 * backend/services/messageService.ts
 * Project: Obsidian
 */
import type { Message, PinnedMessage } from "../types/message";
import type { SendMessageInput, EditMessageInput, AddReactionInput, BulkDeleteMessagesInput, GetMessagesQueryInput, SearchMessagesQueryInput } from "../schemas/message.schema";
export declare function sendMessage(workspaceId: string, channelId: string, senderId: string, input: SendMessageInput): Promise<Message>;
export declare function getMessages(workspaceId: string, channelId: string, query: GetMessagesQueryInput): Promise<{
    messages: Message[];
    meta: any;
}>;
export declare function getMessagesAround(workspaceId: string, channelId: string, messageId: string): Promise<Message[]>;
export declare function editMessage(workspaceId: string, messageId: string, editorId: string, input: EditMessageInput): Promise<Message>;
export declare function deleteMessage(workspaceId: string, messageId: string, actorId: string, actorPermissions: Record<string, boolean>): Promise<void>;
export declare function bulkDeleteMessages(workspaceId: string, channelId: string, actorId: string, input: BulkDeleteMessagesInput): Promise<{
    deleted: number;
}>;
export declare function addReaction(workspaceId: string, messageId: string, uid: string, input: AddReactionInput): Promise<void>;
export declare function removeReaction(workspaceId: string, messageId: string, uid: string, emoji: string): Promise<void>;
export declare function pinMessage(workspaceId: string, messageId: string, actorId: string): Promise<void>;
export declare function unpinMessage(workspaceId: string, messageId: string, actorId: string): Promise<void>;
export declare function getPinnedMessages(workspaceId: string, channelId: string): Promise<PinnedMessage[]>;
export declare function searchMessages(workspaceId: string, query: SearchMessagesQueryInput): Promise<{
    messages: Message[];
    total: number;
}>;
//# sourceMappingURL=messageService.d.ts.map