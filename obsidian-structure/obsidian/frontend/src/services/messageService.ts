/**
 * frontend/src/services/messageService.ts
 * Project: Obsidian
 */

import { apiGet, apiPost, apiPatch, apiDelete } from "../lib/axios";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Attachment {
  fileId: string;
  fileKey: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  url?: string;
}

export interface Mention {
  type: "user" | "role" | "channel" | "everyone" | "here";
  targetId: string;
  displayName: string;
}

export interface Reaction {
  emoji: string;
  count: number;
  userIds: string[];
}

export interface Message {
  messageId: string;
  channelId: string;
  workspaceId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  content: string;
  attachments: Attachment[];
  mentions: Mention[];
  reactions: Record<string, Reaction>;
  replyTo?: string;
  replyPreview?: { senderId: string; content: string };
  isPinned: boolean;
  isEdited: boolean;
  status: "sending" | "sent" | "failed" | "deleted";
  createdAt: string;
  updatedAt: string;
}

export interface PinnedMessage {
  messageId: string;
  channelId: string;
  content: string;
  senderId: string;
  senderName: string;
  pinnedBy: string;
  pinnedAt: string;
}

export interface SendMessagePayload {
  content?: string;
  attachments?: Omit<Attachment, "url">[];
  mentions?: Mention[];
  replyTo?: string;
  nonce?: string;
}

export interface EditMessagePayload {
  content: string;
}

export interface GetMessagesParams {
  limit?: number;
  cursor?: string;
}

export interface SearchMessagesParams {
  query: string;
  channelId?: string;
  senderId?: string;
  limit?: number;
  cursor?: string;
}

export interface MessagesResponse {
  messages: Message[];
  meta: {
    nextCursor: string | null;
    hasMore: boolean;
    total?: number;
  };
}

// ─── Message CRUD ─────────────────────────────────────────────────────────────

export async function getMessages(
  workspaceId: string,
  channelId: string,
  params: GetMessagesParams = {}
): Promise<MessagesResponse> {
  return apiGet<MessagesResponse>(
    `/api/v1/workspaces/${workspaceId}/channels/${channelId}/messages`,
    { params }
  );
}

export async function getMessagesAround(
  workspaceId: string,
  channelId: string,
  messageId: string
): Promise<Message[]> {
  return apiGet<Message[]>(
    `/api/v1/workspaces/${workspaceId}/channels/${channelId}/messages/${messageId}/around`
  );
}

export async function sendMessage(
  workspaceId: string,
  channelId: string,
  payload: SendMessagePayload
): Promise<Message> {
  return apiPost<Message>(
    `/api/v1/workspaces/${workspaceId}/channels/${channelId}/messages`,
    payload
  );
}

export async function editMessage(
  workspaceId: string,
  messageId: string,
  payload: EditMessagePayload
): Promise<Message> {
  return apiPatch<Message>(
    `/api/v1/workspaces/${workspaceId}/messages/${messageId}`,
    payload
  );
}

export async function deleteMessage(
  workspaceId: string,
  messageId: string
): Promise<void> {
  return apiDelete<void>(
    `/api/v1/workspaces/${workspaceId}/messages/${messageId}`
  );
}

export async function bulkDeleteMessages(
  workspaceId: string,
  channelId: string,
  messageIds: string[]
): Promise<{ deleted: number }> {
  return apiPost<{ deleted: number }>(
    `/api/v1/workspaces/${workspaceId}/channels/${channelId}/messages/bulk-delete`,
    { messageIds }
  );
}

// ─── Reactions ────────────────────────────────────────────────────────────────

export async function addReaction(
  workspaceId: string,
  messageId: string,
  emoji: string
): Promise<void> {
  return apiPost<void>(
    `/api/v1/workspaces/${workspaceId}/messages/${messageId}/reactions`,
    { emoji }
  );
}

export async function removeReaction(
  workspaceId: string,
  messageId: string,
  emoji: string
): Promise<void> {
  return apiDelete<void>(
    `/api/v1/workspaces/${workspaceId}/messages/${messageId}/reactions/${encodeURIComponent(emoji)}`
  );
}

// ─── Pins ─────────────────────────────────────────────────────────────────────

export async function pinMessage(
  workspaceId: string,
  messageId: string
): Promise<void> {
  return apiPost<void>(
    `/api/v1/workspaces/${workspaceId}/messages/${messageId}/pin`,
    {}
  );
}

export async function unpinMessage(
  workspaceId: string,
  messageId: string
): Promise<void> {
  return apiDelete<void>(
    `/api/v1/workspaces/${workspaceId}/messages/${messageId}/pin`
  );
}

export async function getPinnedMessages(
  workspaceId: string,
  channelId: string
): Promise<PinnedMessage[]> {
  return apiGet<PinnedMessage[]>(
    `/api/v1/workspaces/${workspaceId}/channels/${channelId}/pins`
  );
}

// ─── Search ───────────────────────────────────────────────────────────────────

export async function searchMessages(
  workspaceId: string,
  params: SearchMessagesParams
): Promise<{ messages: Message[]; total: number }> {
  return apiGet<{ messages: Message[]; total: number }>(
    `/api/v1/workspaces/${workspaceId}/messages/search`,
    { params }
  );
}
