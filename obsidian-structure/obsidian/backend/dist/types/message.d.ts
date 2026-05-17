import { FirestoreTimestamps } from "./common";
export type MessageType = "text" | "system" | "file" | "voice_started" | "voice_ended";
export type MessageStatus = "sending" | "sent" | "failed" | "deleted";
export interface Message extends FirestoreTimestamps {
    messageId: string;
    channelId: string;
    workspaceId: string;
    senderId: string;
    senderName: string;
    senderAvatarUrl?: string;
    type: MessageType;
    content: string;
    status: MessageStatus;
    attachments: MessageAttachment[];
    reactions: MessageReaction[];
    mentions: MessageMention[];
    replyTo?: MessageReply;
    isPinned: boolean;
    isEdited: boolean;
    editedAt?: FirebaseFirestore.Timestamp;
    deletedAt?: FirebaseFirestore.Timestamp;
    metadata?: Record<string, unknown>;
}
export type AttachmentType = "image" | "video" | "audio" | "document" | "other";
export interface MessageAttachment {
    attachmentId: string;
    fileId: string;
    name: string;
    type: AttachmentType;
    mimeType: string;
    sizeBytes: number;
    url: string;
    thumbnailUrl?: string;
    width?: number;
    height?: number;
    durationSeconds?: number;
}
export interface MessageReaction {
    emoji: string;
    count: number;
    reactedBy: string[];
}
export type MentionType = "user" | "role" | "channel" | "everyone";
export interface MessageMention {
    type: MentionType;
    targetId: string;
    displayName: string;
    offset: number;
}
export interface MessageReply {
    messageId: string;
    senderId: string;
    senderName: string;
    contentPreview: string;
}
export interface PinnedMessage {
    messageId: string;
    channelId: string;
    workspaceId: string;
    pinnedBy: string;
    pinnedAt: FirebaseFirestore.Timestamp;
    message: Pick<Message, "messageId" | "senderId" | "senderName" | "content" | "createdAt">;
}
export declare const SYSTEM_MESSAGE_TEMPLATES: {
    readonly MEMBER_JOINED: (name: string) => string;
    readonly MEMBER_LEFT: (name: string) => string;
    readonly MEMBER_KICKED: (name: string, by: string) => string;
    readonly CHANNEL_CREATED: (name: string, by: string) => string;
    readonly CHANNEL_ARCHIVED: (name: string) => string;
    readonly VOICE_STARTED: (by: string) => string;
    readonly VOICE_ENDED: () => string;
    readonly ROLE_UPDATED: (name: string, role: string) => string;
};
export interface SendMessageDto {
    content: string;
    type?: MessageType;
    attachments?: Omit<MessageAttachment, "attachmentId">[];
    replyToMessageId?: string;
    mentions?: Omit<MessageMention, "offset">[];
}
export interface EditMessageDto {
    content: string;
}
export interface AddReactionDto {
    emoji: string;
}
export interface GetMessagesDto {
    limit?: number;
    cursor?: string;
    before?: string;
    after?: string;
}
export interface MessageSummaryDto {
    messageId: string;
    channelId: string;
    senderId: string;
    senderName: string;
    senderAvatarUrl?: string;
    type: MessageType;
    content: string;
    attachments: MessageAttachment[];
    reactions: MessageReaction[];
    replyTo?: MessageReply;
    isPinned: boolean;
    isEdited: boolean;
    createdAt: FirebaseFirestore.Timestamp;
    editedAt?: FirebaseFirestore.Timestamp;
}
//# sourceMappingURL=message.d.ts.map