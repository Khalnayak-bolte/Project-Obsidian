import { useState, useEffect, useCallback, useRef } from "react";
import { useMutation, useInfiniteQuery } from "@tanstack/react-query";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuthStore, selectCurrentUser, selectWorkspaceId } from "../stores/authStore";
import { apiGet, apiPost, apiPatch, apiDelete } from "../lib/axios";
import { queryKeys } from "../lib/queryClient";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MessageAttachment {
  attachmentId: string;
  fileId: string;
  name: string;
  type: "image" | "video" | "audio" | "document" | "other";
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

export interface MessageReply {
  messageId: string;
  senderId: string;
  senderName: string;
  contentPreview: string;
}

export type MessageStatus = "sending" | "sent" | "failed" | "deleted";
export type MessageType = "text" | "system" | "file" | "voice_started" | "voice_ended";

export interface Message {
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
  replyTo?: MessageReply;
  isPinned: boolean;
  isEdited: boolean;
  editedAt?: string;
  createdAt: string;
}

interface SendMessagePayload {
  content: string;
  attachments?: Omit<MessageAttachment, "attachmentId">[];
  replyToMessageId?: string;
}

interface MessagesPage {
  messages: Message[];
  nextCursor: string | null;
  hasMore: boolean;
}

const PAGE_SIZE = 50;
const REALTIME_LIMIT = 30;

// ─── Hook ─────────────────────────────────────────────────────────────────────

export const useMessages = (channelId: string | null) => {
  const currentUser = useAuthStore(selectCurrentUser);
  const workspaceId = useAuthStore(selectWorkspaceId);

  // Optimistic messages pending send confirmation
  const [optimisticMessages, setOptimisticMessages] = useState<Message[]>([]);
  // Real-time recent messages from Firestore
  const [realtimeMessages, setRealtimeMessages] = useState<Message[]>([]);
  // Typing indicators
  const [typingUids, setTypingUids] = useState<string[]>([]);

  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const realtimeUnsubRef = useRef<Unsubscribe | null>(null);

  // ── Paginated history (TanStack Query infinite) ────────────────────────────

  const {
    data: historyPages,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: isLoadingHistory,
  } = useInfiniteQuery({
    queryKey: queryKeys.messages.list(channelId ?? ""),
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams({ limit: String(PAGE_SIZE) });
      if (pageParam) params.set("cursor", pageParam as string);
      return apiGet<MessagesPage>(`/api/v1/messages/${channelId}?${params}`);
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.nextCursor : undefined,
    enabled: !!channelId && !!workspaceId,
    staleTime: 30_000,
  });

  // ── Real-time Firestore listener for latest messages ───────────────────────

  useEffect(() => {
    if (!channelId || !workspaceId) return;

    // Clean up previous listener
    realtimeUnsubRef.current?.();

    const q = query(
      collection(db, "messages"),
      where("channelId", "==", channelId),
      where("status", "!=", "deleted"),
      orderBy("createdAt", "desc"),
      limit(REALTIME_LIMIT)
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const msgs = snap.docs
          .map((d) => ({ messageId: d.id, ...d.data() } as Message))
          .reverse(); // newest last
        setRealtimeMessages(msgs);
        // Remove optimistic messages that are now confirmed
        setOptimisticMessages((prev) =>
          prev.filter(
            (om) => !msgs.some((m) => m.messageId === om.messageId)
          )
        );
      },
      (error) => {
        console.error("[useMessages] Real-time listener error:", error);
      }
    );

    realtimeUnsubRef.current = unsub;
    return () => unsub();
  }, [channelId, workspaceId]);

  // ── Typing indicators listener ─────────────────────────────────────────────

  useEffect(() => {
    if (!channelId || !workspaceId) return;

    const q = query(
      collection(db, "typingIndicators"),
      where("channelId", "==", channelId)
    );

    const unsub = onSnapshot(q, (snap) => {
      const now = Date.now();
      const active = snap.docs
        .map((d) => d.data())
        .filter(
          (d) =>
            d.uid !== currentUser?.uid &&
            d.expiresAt?.toMillis?.() > now
        )
        .map((d) => d.uid as string);
      setTypingUids(active);
    });

    return () => unsub();
  }, [channelId, workspaceId, currentUser?.uid]);

  // ── Merge history + realtime (deduplicated) ────────────────────────────────

  const historyMessages: Message[] =
    historyPages?.pages.flatMap((p) => p.messages) ?? [];

  const seenIds = new Set(realtimeMessages.map((m) => m.messageId));
  const olderMessages = historyMessages.filter((m) => !seenIds.has(m.messageId));

  const allMessages: Message[] = [
    ...olderMessages,
    ...realtimeMessages,
    ...optimisticMessages,
  ];

  // ── Send message ───────────────────────────────────────────────────────────

  const sendMessageMutation = useMutation({
    mutationFn: (payload: SendMessagePayload) =>
      apiPost<Message>(`/api/v1/messages/${channelId}`, {
        ...payload,
        workspaceId,
      }),
    onMutate: (payload) => {
      // Optimistic insert
      const optimistic: Message = {
        messageId: `optimistic-${Date.now()}`,
        channelId: channelId!,
        workspaceId: workspaceId!,
        senderId: currentUser!.uid,
        senderName: currentUser!.displayName,
        senderAvatarUrl: currentUser?.avatarUrl,
        type: "text",
        content: payload.content,
        status: "sending",
        attachments: [],
        reactions: [],
        isPinned: false,
        isEdited: false,
        createdAt: new Date().toISOString(),
      };
      setOptimisticMessages((prev) => [...prev, optimistic]);
      return { optimisticId: optimistic.messageId };
    },
    onError: (error, _, context) => {
      console.error("[useMessages] Send failed:", error);
      if (context?.optimisticId) {
        setOptimisticMessages((prev) =>
          prev.map((m) =>
            m.messageId === context.optimisticId
              ? { ...m, status: "failed" }
              : m
          )
        );
      }
    },
  });

  // ── Edit message ───────────────────────────────────────────────────────────

  const editMessageMutation = useMutation({
    mutationFn: ({ messageId, content }: { messageId: string; content: string }) =>
      apiPatch<Message>(`/api/v1/messages/${channelId}/${messageId}`, { content }),
    onError: (error) => {
      console.error("[useMessages] Edit failed:", error);
    },
  });

  // ── Delete message ─────────────────────────────────────────────────────────

  const deleteMessageMutation = useMutation({
    mutationFn: (messageId: string) =>
      apiDelete(`/api/v1/messages/${channelId}/${messageId}`),
    onError: (error) => {
      console.error("[useMessages] Delete failed:", error);
    },
  });

  // ── Reactions ──────────────────────────────────────────────────────────────

  const addReactionMutation = useMutation({
    mutationFn: ({ messageId, emoji }: { messageId: string; emoji: string }) =>
      apiPost(`/api/v1/messages/${channelId}/${messageId}/reactions`, { emoji }),
    onError: (error) => {
      console.error("[useMessages] Add reaction failed:", error);
    },
  });

  const removeReactionMutation = useMutation({
    mutationFn: ({ messageId, emoji }: { messageId: string; emoji: string }) =>
      apiDelete(`/api/v1/messages/${channelId}/${messageId}/reactions/${encodeURIComponent(emoji)}`),
    onError: (error) => {
      console.error("[useMessages] Remove reaction failed:", error);
    },
  });

  // ── Pin / Unpin ────────────────────────────────────────────────────────────

  const pinMessageMutation = useMutation({
    mutationFn: (messageId: string) =>
      apiPost(`/api/v1/messages/${channelId}/${messageId}/pin`),
    onError: (error) => {
      console.error("[useMessages] Pin failed:", error);
    },
  });

  const unpinMessageMutation = useMutation({
    mutationFn: (messageId: string) =>
      apiDelete(`/api/v1/messages/${channelId}/${messageId}/pin`),
    onError: (error) => {
      console.error("[useMessages] Unpin failed:", error);
    },
  });

  // ── Pinned messages ────────────────────────────────────────────────────────

  const { data: pinnedMessages = [] } = useInfiniteQuery({
    queryKey: queryKeys.channels.pinned(workspaceId ?? "", channelId ?? ""),
    queryFn: () =>
      apiGet<Message[]>(`/api/v1/messages/${channelId}/pinned`),
    initialPageParam: null,
    getNextPageParam: () => undefined,
    enabled: !!channelId && !!workspaceId,
  });

  // ── Typing indicator ───────────────────────────────────────────────────────

  const sendTypingIndicator = useCallback(async (): Promise<void> => {
    if (!channelId || !currentUser) return;
    try {
      // Debounce — clear previous timer
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

      await apiPost(`/api/v1/messages/${channelId}/typing`);

      typingTimeoutRef.current = setTimeout(() => {
        typingTimeoutRef.current = null;
      }, 3000);
    } catch (error) {
      // Non-critical — swallow silently
    }
  }, [channelId, currentUser]);

  return {
    // Messages
    messages: allMessages,
    isLoadingHistory,
    hasNextPage: !!hasNextPage,
    isFetchingNextPage,
    loadMoreMessages: fetchNextPage,

    // Pinned
    pinnedMessages: pinnedMessages.pages?.flatMap((p) => p) ?? [],

    // Typing
    typingUids,
    sendTypingIndicator,

    // Mutations
    sendMessage: sendMessageMutation.mutateAsync,
    isSending: sendMessageMutation.isPending,

    editMessage: editMessageMutation.mutateAsync,
    isEditing: editMessageMutation.isPending,

    deleteMessage: deleteMessageMutation.mutateAsync,
    isDeleting: deleteMessageMutation.isPending,

    addReaction: addReactionMutation.mutate,
    removeReaction: removeReactionMutation.mutate,

    pinMessage: pinMessageMutation.mutate,
    unpinMessage: unpinMessageMutation.mutate,
  };
};
