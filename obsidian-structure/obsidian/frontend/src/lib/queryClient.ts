import {
  QueryClient,
  type QueryClientConfig,
  type DefaultOptions,
} from "@tanstack/react-query";

// ─── Default Query Options ────────────────────────────────────────────────────

const defaultOptions: DefaultOptions = {
  queries: {
    // Cache for 5 minutes, background-refetch after 2 minutes
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,

    // Retry config — don't retry on 4xx client errors
    retry: (failureCount, error: unknown) => {
      const err = error as { response?: { status?: number } };
      const status = err?.response?.status;
      if (status && status >= 400 && status < 500) return false;
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 15_000),

    // Refetch behavior
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchOnMount: true,

    // Network mode — pause queries when offline
    networkMode: "offlineFirst",
  },
  mutations: {
    retry: false,
    networkMode: "offlineFirst",

    onError: (error: unknown) => {
      console.error("[QueryClient] Mutation error:", error);
    },
  },
};

// ─── Client Config ────────────────────────────────────────────────────────────

const queryClientConfig: QueryClientConfig = {
  defaultOptions,
};

// ─── Singleton Instance ───────────────────────────────────────────────────────

export const queryClient = new QueryClient(queryClientConfig);

// ─── Query Key Factory ────────────────────────────────────────────────────────
// Centralised key factory prevents typo-induced cache misses

export const queryKeys = {
  // Auth
  auth: {
    user: () => ["auth", "user"] as const,
    session: () => ["auth", "session"] as const,
  },

  // Workspaces
  workspaces: {
    all: () => ["workspaces"] as const,
    detail: (workspaceId: string) => ["workspaces", workspaceId] as const,
    members: (workspaceId: string) => ["workspaces", workspaceId, "members"] as const,
    member: (workspaceId: string, uid: string) =>
      ["workspaces", workspaceId, "members", uid] as const,
    roles: (workspaceId: string) => ["workspaces", workspaceId, "roles"] as const,
    invites: (workspaceId: string) => ["workspaces", workspaceId, "invites"] as const,
    activity: (workspaceId: string) => ["workspaces", workspaceId, "activity"] as const,
  },

  // Channels
  channels: {
    all: (workspaceId: string) => ["channels", workspaceId] as const,
    detail: (workspaceId: string, channelId: string) =>
      ["channels", workspaceId, channelId] as const,
    members: (workspaceId: string, channelId: string) =>
      ["channels", workspaceId, channelId, "members"] as const,
    pinned: (workspaceId: string, channelId: string) =>
      ["channels", workspaceId, channelId, "pinned"] as const,
  },

  // Messages
  messages: {
    list: (channelId: string) => ["messages", channelId] as const,
    detail: (channelId: string, messageId: string) =>
      ["messages", channelId, messageId] as const,
  },

  // Voice
  voice: {
    session: (channelId: string) => ["voice", "session", channelId] as const,
    participants: (sessionId: string) => ["voice", "participants", sessionId] as const,
  },

  // Files
  files: {
    list: (workspaceId: string) => ["files", workspaceId] as const,
    channel: (workspaceId: string, channelId: string) =>
      ["files", workspaceId, channelId] as const,
  },

  // Billing
  billing: {
    subscription: (workspaceId: string) => ["billing", "subscription", workspaceId] as const,
    invoices: (workspaceId: string) => ["billing", "invoices", workspaceId] as const,
    usage: (workspaceId: string) => ["billing", "usage", workspaceId] as const,
  },

  // Notifications
  notifications: {
    all: (uid: string) => ["notifications", uid] as const,
    unread: (uid: string) => ["notifications", uid, "unread"] as const,
  },

  // Presence
  presence: {
    workspace: (workspaceId: string) => ["presence", workspaceId] as const,
    user: (workspaceId: string, uid: string) => ["presence", workspaceId, uid] as const,
  },
} as const;

// ─── Cache Invalidation Helpers ───────────────────────────────────────────────

export const invalidateWorkspace = (workspaceId: string): Promise<void> =>
  queryClient.invalidateQueries({ queryKey: queryKeys.workspaces.detail(workspaceId) });

export const invalidateChannels = (workspaceId: string): Promise<void> =>
  queryClient.invalidateQueries({ queryKey: queryKeys.channels.all(workspaceId) });

export const invalidateMessages = (channelId: string): Promise<void> =>
  queryClient.invalidateQueries({ queryKey: queryKeys.messages.list(channelId) });

export const invalidateBilling = (workspaceId: string): Promise<void> =>
  queryClient.invalidateQueries({ queryKey: queryKeys.billing.subscription(workspaceId) });

export default queryClient;
