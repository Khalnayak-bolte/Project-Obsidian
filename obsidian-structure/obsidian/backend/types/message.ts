import { FirestoreTimestamps } from "./common";

// ─── Message ──────────────────────────────────────────────────────────────────

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
  content: string;                      // markdown supported
  status: MessageStatus;
  attachments: MessageAttachment[];
  reactions: MessageReaction[];
  mentions: MessageMention[];
  replyTo?: MessageReply;               // thread reply reference
  isPinned: boolean;
  isEdited: boolean;
  editedAt?: FirebaseFirestore.Timestamp;
  deletedAt?: FirebaseFirestore.Timestamp;
  metadata?: Record<string, unknown>;   // for system messages
}

// ─── Attachment ───────────────────────────────────────────────────────────────

export type AttachmentType = "image" | "video" | "audio" | "document" | "other";

export interface MessageAttachment {
  attachmentId: string;
  fileId: string;                       // reference to files collection
  name: string;
  type: AttachmentType;
  mimeType: string;
  sizeBytes: number;
  url: string;                          // CloudFront CDN URL
  thumbnailUrl?: string;                // for images/videos
  width?: number;                       // for images
  height?: number;                      // for images
  durationSeconds?: number;             // for audio/video
}

// ─── Reaction ─────────────────────────────────────────────────────────────────

export interface MessageReaction {
  emoji: string;                        // unicode emoji e.g. "👍"
  count: number;
  reactedBy: string[];                  // uids
}

// ─── Mention ──────────────────────────────────────────────────────────────────

export type MentionType = "user" | "role" | "channel" | "everyone";

export interface MessageMention {
  type: MentionType;
  targetId: string;                     // uid / roleId / channelId
  displayName: string;                  // @username / @role / #channel
  offset: number;                       // char position in content
}

// ─── Reply ────────────────────────────────────────────────────────────────────

export interface MessageReply {
  messageId: string;
  senderId: string;
  senderName: string;
  contentPreview: string;               // first 100 chars of replied message
}

// ─── Pinned Message ───────────────────────────────────────────────────────────

export interface PinnedMessage {
  messageId: string;
  channelId: string;
  workspaceId: string;
  pinnedBy: string;                     // uid
  pinnedAt: FirebaseFirestore.Timestamp;
  message: Pick<Message, "messageId" | "senderId" | "senderName" | "content" | "createdAt">;
}

// ─── System Message Templates ─────────────────────────────────────────────────

export const SYSTEM_MESSAGE_TEMPLATES = {
  MEMBER_JOINED: (name: string) => `**${name}** joined the workspace`,
  MEMBER_LEFT: (name: string) => `**${name}** left the workspace`,
  MEMBER_KICKED: (name: string, by: string) => `**${name}** was removed by **${by}**`,
  CHANNEL_CREATED: (name: string, by: string) => `**${by}** created channel **#${name}**`,
  CHANNEL_ARCHIVED: (name: string) => `Channel **#${name}** was archived`,
  VOICE_STARTED: (by: string) => `**${by}** started a voice session`,
  VOICE_ENDED: () => `Voice session ended`,
  ROLE_UPDATED: (name: string, role: string) => `**${name}** is now a **${role}**`,
} as const;

// ─── Request / Response DTOs ──────────────────────────────────────────────────

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
  cursor?: string;                      // messageId to paginate from
  before?: string;                      // ISO timestamp
  after?: string;                       // ISO timestamp
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
