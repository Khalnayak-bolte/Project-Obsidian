/**
 * backend/repositories/messageRepository.ts
 * Project: Obsidian
 *
 * All Firestore read/write operations for the messages collection.
 * Covers message CRUD, reactions, pinning, pagination, and soft deletes.
 * No business logic lives here — only data access.
 */
import type { Message, MessageType, MessageAttachment, MessageMention, MessageReply, PinnedMessage } from "../types/message";
import type { PaginationMeta } from "../types/common";
export declare function getMessageById(messageId: string): Promise<Message | null>;
export declare function getMessagesByChannel(channelId: string, workspaceId: string, limit?: number, cursor?: string): Promise<{
    messages: Message[];
    meta: PaginationMeta;
}>;
export declare function getMessagesAround(channelId: string, workspaceId: string, messageId: string, limit?: number): Promise<Message[]>;
export declare function createMessage(params: {
    channelId: string;
    workspaceId: string;
    senderId: string;
    senderName: string;
    senderAvatarUrl?: string;
    type: MessageType;
    content: string;
    attachments?: MessageAttachment[];
    mentions?: MessageMention[];
    replyTo?: MessageReply;
    metadata?: Record<string, unknown>;
}): Promise<Message>;
export declare function editMessage(messageId: string, content: string): Promise<void>;
export declare function softDeleteMessage(messageId: string): Promise<void>;
export declare function hardDeleteMessage(messageId: string): Promise<void>;
export declare function addReaction(messageId: string, emoji: string, uid: string): Promise<void>;
export declare function removeReaction(messageId: string, emoji: string, uid: string): Promise<void>;
export declare function pinMessage(messageId: string, channelId: string, workspaceId: string, pinnedBy: string): Promise<PinnedMessage>;
export declare function unpinMessage(messageId: string, channelId: string): Promise<void>;
export declare function getPinnedMessages(channelId: string): Promise<PinnedMessage[]>;
export declare function searchMessages(workspaceId: string, channelId: string, query: string, limit?: number): Promise<Message[]>;
export declare function deleteMessagesByChannel(channelId: string): Promise<void>;
//# sourceMappingURL=messageRepository.d.ts.map