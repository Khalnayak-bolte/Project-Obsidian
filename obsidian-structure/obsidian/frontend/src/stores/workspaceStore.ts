import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";

// ─── Types ────────────────────────────────────────────────────────────────────

export type SubscriptionTier = "gold" | "premium" | "deluxe";
export type SubscriptionStatus =
  | "active"
  | "inactive"
  | "past_due"
  | "cancelled"
  | "paused"
  | "trialing";
export type WorkspaceStatus = "active" | "suspended" | "deleted";
export type PresenceStatus = "online" | "away" | "busy" | "offline";
export type ChannelType = "text" | "voice" | "announcement";
export type ChannelVisibility = "public" | "private";
export type WorkspaceIndustry =
  | "technology"
  | "design"
  | "marketing"
  | "finance"
  | "healthcare"
  | "education"
  | "ecommerce"
  | "gaming"
  | "media"
  | "other";

export interface WorkspaceSettings {
  allowGuestAccess: boolean;
  requireEmailVerification: boolean;
  defaultRoleId: string;
  notificationsEnabled: boolean;
  allowMemberInvites: boolean;
}

export interface Workspace {
  workspaceId: string;
  name: string;
  slug: string;
  ownerId: string;
  tier: SubscriptionTier;
  subscriptionStatus: SubscriptionStatus;
  subscriptionId?: string;
  memberCount: number;
  storageUsed: number;
  avatarUrl?: string;
  industry?: WorkspaceIndustry;
  status: WorkspaceStatus;
  settings: WorkspaceSettings;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceMember {
  uid: string;
  workspaceId: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  roleId: string;
  status: "active" | "suspended" | "left";
  presenceStatus: PresenceStatus;
  lastSeen: string;
}

export interface Channel {
  channelId: string;
  workspaceId: string;
  name: string;
  description?: string;
  type: ChannelType;
  visibility: ChannelVisibility;
  allowedRoles: string[];
  position: number;
  isArchived: boolean;
  isDefault: boolean;
  createdBy: string;
  lastMessageAt?: string;
  lastMessagePreview?: string;
  messageCount?: number;
  chimeMeetingId?: string;
  activeParticipantCount?: number;
  unreadCount?: number;
}

export interface Role {
  roleId: string;
  workspaceId: string;
  name: string;
  color?: string;
  permissions: Record<string, boolean>;
  position: number;
  isDefault: boolean;
}

// ─── State Interface ──────────────────────────────────────────────────────────

interface WorkspaceState {
  // Current workspace
  currentWorkspace: Workspace | null;
  workspaces: Workspace[];

  // Channels
  channels: Channel[];
  activeChannelId: string | null;

  // Members & roles
  members: WorkspaceMember[];
  roles: Role[];

  // Presence map — uid → PresenceStatus
  presenceMap: Record<string, PresenceStatus>;

  // Loading flags
  isLoadingWorkspace: boolean;
  isLoadingChannels: boolean;
  isLoadingMembers: boolean;

  // Actions — workspace
  setCurrentWorkspace: (workspace: Workspace | null) => void;
  setWorkspaces: (workspaces: Workspace[]) => void;
  updateWorkspace: (partial: Partial<Workspace>) => void;

  // Actions — channels
  setChannels: (channels: Channel[]) => void;
  upsertChannel: (channel: Channel) => void;
  removeChannel: (channelId: string) => void;
  setActiveChannelId: (channelId: string | null) => void;
  updateChannelUnread: (channelId: string, count: number) => void;

  // Actions — members & roles
  setMembers: (members: WorkspaceMember[]) => void;
  upsertMember: (member: WorkspaceMember) => void;
  removeMember: (uid: string) => void;
  setRoles: (roles: Role[]) => void;

  // Actions — presence
  setPresence: (uid: string, status: PresenceStatus) => void;
  setBulkPresence: (map: Record<string, PresenceStatus>) => void;

  // Actions — loading
  setIsLoadingWorkspace: (v: boolean) => void;
  setIsLoadingChannels: (v: boolean) => void;
  setIsLoadingMembers: (v: boolean) => void;

  // Reset
  reset: () => void;
}

// ─── Initial State ────────────────────────────────────────────────────────────

const initialState = {
  currentWorkspace: null,
  workspaces: [],
  channels: [],
  activeChannelId: null,
  members: [],
  roles: [],
  presenceMap: {},
  isLoadingWorkspace: false,
  isLoadingChannels: false,
  isLoadingMembers: false,
};

// ─── Store ────────────────────────────────────────────────────────────────────

export const useWorkspaceStore = create<WorkspaceState>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,

        // ── Workspace ─────────────────────────────────────────────────────────

        setCurrentWorkspace: (workspace) =>
          set({ currentWorkspace: workspace }, false, "workspace/setCurrent"),

        setWorkspaces: (workspaces) =>
          set({ workspaces }, false, "workspace/setAll"),

        updateWorkspace: (partial) => {
          const current = get().currentWorkspace;
          if (!current) return;
          set(
            { currentWorkspace: { ...current, ...partial } },
            false,
            "workspace/update"
          );
        },

        // ── Channels ──────────────────────────────────────────────────────────

        setChannels: (channels) =>
          set(
            { channels: [...channels].sort((a, b) => a.position - b.position) },
            false,
            "workspace/setChannels"
          ),

        upsertChannel: (channel) => {
          const channels = get().channels;
          const idx = channels.findIndex((c) => c.channelId === channel.channelId);
          const updated =
            idx >= 0
              ? channels.map((c) => (c.channelId === channel.channelId ? channel : c))
              : [...channels, channel];
          set(
            { channels: updated.sort((a, b) => a.position - b.position) },
            false,
            "workspace/upsertChannel"
          );
        },

        removeChannel: (channelId) =>
          set(
            { channels: get().channels.filter((c) => c.channelId !== channelId) },
            false,
            "workspace/removeChannel"
          ),

        setActiveChannelId: (channelId) =>
          set({ activeChannelId: channelId }, false, "workspace/setActiveChannel"),

        updateChannelUnread: (channelId, count) => {
          const channels = get().channels.map((c) =>
            c.channelId === channelId ? { ...c, unreadCount: count } : c
          );
          set({ channels }, false, "workspace/updateUnread");
        },

        // ── Members & Roles ───────────────────────────────────────────────────

        setMembers: (members) =>
          set({ members }, false, "workspace/setMembers"),

        upsertMember: (member) => {
          const members = get().members;
          const idx = members.findIndex((m) => m.uid === member.uid);
          const updated =
            idx >= 0
              ? members.map((m) => (m.uid === member.uid ? member : m))
              : [...members, member];
          set({ members: updated }, false, "workspace/upsertMember");
        },

        removeMember: (uid) =>
          set(
            { members: get().members.filter((m) => m.uid !== uid) },
            false,
            "workspace/removeMember"
          ),

        setRoles: (roles) =>
          set(
            { roles: [...roles].sort((a, b) => a.position - b.position) },
            false,
            "workspace/setRoles"
          ),

        // ── Presence ──────────────────────────────────────────────────────────

        setPresence: (uid, status) =>
          set(
            { presenceMap: { ...get().presenceMap, [uid]: status } },
            false,
            "workspace/setPresence"
          ),

        setBulkPresence: (map) =>
          set(
            { presenceMap: { ...get().presenceMap, ...map } },
            false,
            "workspace/setBulkPresence"
          ),

        // ── Loading ───────────────────────────────────────────────────────────

        setIsLoadingWorkspace: (v) =>
          set({ isLoadingWorkspace: v }, false, "workspace/loadingWorkspace"),

        setIsLoadingChannels: (v) =>
          set({ isLoadingChannels: v }, false, "workspace/loadingChannels"),

        setIsLoadingMembers: (v) =>
          set({ isLoadingMembers: v }, false, "workspace/loadingMembers"),

        // ── Reset ─────────────────────────────────────────────────────────────

        reset: () => set(initialState, false, "workspace/reset"),
      }),
      {
        name: "obsidian:workspace",
        partialize: (state) => ({
          currentWorkspace: state.currentWorkspace,
          workspaces: state.workspaces,
          activeChannelId: state.activeChannelId,
        }),
      }
    ),
    { name: "WorkspaceStore" }
  )
);

// ─── Selectors ────────────────────────────────────────────────────────────────

export const selectTextChannels = (state: WorkspaceState): Channel[] =>
  state.channels.filter((c) => c.type === "text" && !c.isArchived);

export const selectVoiceChannels = (state: WorkspaceState): Channel[] =>
  state.channels.filter((c) => c.type === "voice" && !c.isArchived);

export const selectAnnouncementChannels = (state: WorkspaceState): Channel[] =>
  state.channels.filter((c) => c.type === "announcement" && !c.isArchived);

export const selectActiveChannel = (state: WorkspaceState): Channel | null =>
  state.channels.find((c) => c.channelId === state.activeChannelId) ?? null;

export const selectOnlineMembers = (state: WorkspaceState): WorkspaceMember[] =>
  state.members.filter((m) => state.presenceMap[m.uid] === "online");

export const selectMemberById =
  (uid: string) =>
  (state: WorkspaceState): WorkspaceMember | null =>
    state.members.find((m) => m.uid === uid) ?? null;

export const selectRoleById =
  (roleId: string) =>
  (state: WorkspaceState): Role | null =>
    state.roles.find((r) => r.roleId === roleId) ?? null;

export const selectTotalUnread = (state: WorkspaceState): number =>
  state.channels.reduce((sum, c) => sum + (c.unreadCount ?? 0), 0);
