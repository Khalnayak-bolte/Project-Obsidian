/**
 * frontend/src/types/message.ts
 * Project: Obsidian
 */

// ─── Enums ────────────────────────────────────────────────────────────────────

export type MessageStatus = "sending" | "sent" | "failed" | "deleted";
export type MessageType = "text" | "system" | "file" | "voice_join" | "voice_leave";
export type MentionType = "user" | "role" | "channel" | "everyone" | "here";

// ─── Attachment ───────────────────────────────────────────────────────────────

export interface MessageAttachment {
  fileId: string;
  fileKey: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  url?: string;
  width?: number;
  height?: number;
  thumbnailUrl?: string;
}

// ─── Mention ──────────────────────────────────────────────────────────────────

export interface MessageMention {
  type: MentionType;
  targetId: string;
  displayName: string;
}

// ─── Reaction ─────────────────────────────────────────────────────────────────

export interface MessageReaction {
  emoji: string;
  count: number;
  userIds: string[];
  hasReacted?: boolean; // computed on client for current user
}

// ─── Reply preview ────────────────────────────────────────────────────────────

export interface ReplyPreview {
  messageId: string;
  senderId: string;
  senderName: string;
  content: string;
}

// ─── Message ──────────────────────────────────────────────────────────────────

export interface Message {
  messageId: string;
  channelId: string;
  workspaceId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  senderRoleId?: string;
  content: string;
  type: MessageType;
  attachments: MessageAttachment[];
  mentions: MessageMention[];
  reactions: Record<string, MessageReaction>;
  replyTo?: string;
  replyPreview?: ReplyPreview;
  isPinned: boolean;
  isEdited: boolean;
  status: MessageStatus;
  nonce?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Pinned message ───────────────────────────────────────────────────────────

export interface PinnedMessage {
  messageId: string;
  channelId: string;
  content: string;
  senderId: string;
  senderName: string;
  pinnedBy: string;
  pinnedByName?: string;
  pinnedAt: string;
  attachments?: MessageAttachment[];
}

// ─── Optimistic message (client-side before server confirms) ──────────────────

export interface OptimisticMessage extends Message {
  isOptimistic: true;
  nonce: string;
}

// ─── DTOs ─────────────────────────────────────────────────────────────────────

export interface SendMessagePayload {
  content?: string;
  attachments?: Omit<MessageAttachment, "url" | "thumbnailUrl">[];
  mentions?: MessageMention[];
  replyTo?: string;
  nonce?: string;
}

export interface EditMessagePayload {
  content: string;
}

export interface AddReactionPayload {
  emoji: string;
}

export interface BulkDeletePayload {
  messageIds: string[];
}

// ─── Pagination ───────────────────────────────────────────────────────────────

export interface MessagesPage {
  messages: Message[];
  meta: {
    nextCursor: string | null;
    hasMore: boolean;
  };
}

// ─── Search ───────────────────────────────────────────────────────────────────

export interface MessageSearchParams {
  query: string;
  channelId?: string;
  senderId?: string;
  limit?: number;
  cursor?: string;
}

export interface MessageSearchResult {
  messages: Message[];
  total: number;
}
