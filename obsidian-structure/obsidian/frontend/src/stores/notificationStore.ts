import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";

// ─── Types ────────────────────────────────────────────────────────────────────

export type NotificationType =
  | "mention"
  | "voice_invite"
  | "workspace_invite"
  | "billing"
  | "role_update"
  | "file_upload"
  | "system";

export type NotificationPriority = "high" | "medium" | "low";

export interface AppNotification {
  notificationId: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;

  // Optional contextual links
  workspaceId?: string;
  channelId?: string;
  messageId?: string;
  actorUid?: string;
  actorDisplayName?: string;
  actorAvatarUrl?: string;
  actionUrl?: string;
}

export interface NotificationPreferences {
  mentions: boolean;
  voiceInvites: boolean;
  workspaceInvites: boolean;
  billing: boolean;
  roleUpdates: boolean;
  fileUploads: boolean;
  systemUpdates: boolean;
  soundEnabled: boolean;
  desktopEnabled: boolean;
  emailEnabled: boolean;
}

// ─── State Interface ──────────────────────────────────────────────────────────

interface NotificationState {
  notifications: AppNotification[];
  unreadCount: number;
  hasMentions: boolean;
  preferences: NotificationPreferences;
  isPermissionGranted: boolean;
  isLoading: boolean;

  // Actions — notifications
  setNotifications: (notifications: AppNotification[]) => void;
  addNotification: (notification: AppNotification) => void;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  removeNotification: (notificationId: string) => void;
  clearAll: () => void;

  // Actions — preferences
  setPreferences: (prefs: Partial<NotificationPreferences>) => void;

  // Actions — permission
  setPermissionGranted: (granted: boolean) => void;

  // Actions — loading
  setIsLoading: (loading: boolean) => void;

  // Reset
  reset: () => void;
}

// ─── Default Preferences ──────────────────────────────────────────────────────

const defaultPreferences: NotificationPreferences = {
  mentions: true,
  voiceInvites: true,
  workspaceInvites: true,
  billing: true,
  roleUpdates: true,
  fileUploads: false,
  systemUpdates: true,
  soundEnabled: true,
  desktopEnabled: true,
  emailEnabled: true,
};

// ─── Initial State ────────────────────────────────────────────────────────────

const initialState = {
  notifications: [],
  unreadCount: 0,
  hasMentions: false,
  preferences: defaultPreferences,
  isPermissionGranted: false,
  isLoading: false,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const computeUnreadCount = (notifications: AppNotification[]): number =>
  notifications.filter((n) => !n.isRead).length;

const computeHasMentions = (notifications: AppNotification[]): boolean =>
  notifications.some((n) => !n.isRead && n.type === "mention");

// ─── Store ────────────────────────────────────────────────────────────────────

export const useNotificationStore = create<NotificationState>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,

        // ── Notifications ──────────────────────────────────────────────────────

        setNotifications: (notifications) =>
          set(
            {
              notifications,
              unreadCount: computeUnreadCount(notifications),
              hasMentions: computeHasMentions(notifications),
            },
            false,
            "notifications/setAll"
          ),

        addNotification: (notification) => {
          // Deduplicate by notificationId
          const existing = get().notifications;
          if (existing.some((n) => n.notificationId === notification.notificationId)) {
            return;
          }
          // Prepend newest first, cap at 100
          const updated = [notification, ...existing].slice(0, 100);
          set(
            {
              notifications: updated,
              unreadCount: computeUnreadCount(updated),
              hasMentions: computeHasMentions(updated),
            },
            false,
            "notifications/add"
          );
        },

        markAsRead: (notificationId) => {
          const updated = get().notifications.map((n) =>
            n.notificationId === notificationId ? { ...n, isRead: true } : n
          );
          set(
            {
              notifications: updated,
              unreadCount: computeUnreadCount(updated),
              hasMentions: computeHasMentions(updated),
            },
            false,
            "notifications/markRead"
          );
        },

        markAllAsRead: () => {
          const updated = get().notifications.map((n) => ({ ...n, isRead: true }));
          set(
            {
              notifications: updated,
              unreadCount: 0,
              hasMentions: false,
            },
            false,
            "notifications/markAllRead"
          );
        },

        removeNotification: (notificationId) => {
          const updated = get().notifications.filter(
            (n) => n.notificationId !== notificationId
          );
          set(
            {
              notifications: updated,
              unreadCount: computeUnreadCount(updated),
              hasMentions: computeHasMentions(updated),
            },
            false,
            "notifications/remove"
          );
        },

        clearAll: () =>
          set(
            { notifications: [], unreadCount: 0, hasMentions: false },
            false,
            "notifications/clearAll"
          ),

        // ── Preferences ───────────────────────────────────────────────────────

        setPreferences: (prefs) =>
          set(
            { preferences: { ...get().preferences, ...prefs } },
            false,
            "notifications/setPreferences"
          ),

        // ── Permission ────────────────────────────────────────────────────────

        setPermissionGranted: (granted) =>
          set({ isPermissionGranted: granted }, false, "notifications/setPermission"),

        // ── Loading ───────────────────────────────────────────────────────────

        setIsLoading: (loading) =>
          set({ isLoading: loading }, false, "notifications/setLoading"),

        // ── Reset ─────────────────────────────────────────────────────────────

        reset: () =>
          set(
            { ...initialState, preferences: get().preferences },
            false,
            "notifications/reset"
          ),
      }),
      {
        name: "obsidian:notifications",
        partialize: (state) => ({
          preferences: state.preferences,
          isPermissionGranted: state.isPermissionGranted,
        }),
      }
    ),
    { name: "NotificationStore" }
  )
);

// ─── Selectors ────────────────────────────────────────────────────────────────

export const selectUnreadNotifications = (
  state: NotificationState
): AppNotification[] => state.notifications.filter((n) => !n.isRead);

export const selectHighPriorityUnread = (
  state: NotificationState
): AppNotification[] =>
  state.notifications.filter((n) => !n.isRead && n.priority === "high");

export const selectNotificationsByType =
  (type: NotificationType) =>
  (state: NotificationState): AppNotification[] =>
    state.notifications.filter((n) => n.type === type);

export const selectIsSoundEnabled = (state: NotificationState): boolean =>
  state.preferences.soundEnabled;

export const selectIsDesktopEnabled = (state: NotificationState): boolean =>
  state.preferences.desktopEnabled && state.isPermissionGranted;
