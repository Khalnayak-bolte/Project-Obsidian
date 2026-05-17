/**
 * frontend/src/hooks/useNotifications.ts
 * Project: Obsidian
 *
 * Manages in-app notifications:
 * - Fetches notification history from backend on mount
 * - Subscribes to real-time notifications via Firestore snapshot
 * - Handles FCM push notification permission + token registration
 * - Exposes mark-read, clear, and preference update actions
 */

import { useEffect, useCallback, useRef } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  type Unsubscribe,
} from "firebase/firestore";
import { getToken } from "firebase/messaging";
import { db, getFirebaseMessaging } from "../lib/firebase";
import { apiClient } from "../lib/axios";
import { useNotificationStore, type AppNotification, type NotificationPreferences } from "../stores/notificationStore";
import { useAuthStore } from "../stores/authStore";

// ─── Constants ────────────────────────────────────────────────────────────────

const NOTIFICATIONS_COLLECTION = "notifications";
const MAX_NOTIFICATIONS = 50;
const NOTIFICATION_SOUND_URL = "/sounds/notification.mp3";

// ─── Audio player singleton ───────────────────────────────────────────────────

let notificationAudio: HTMLAudioElement | null = null;

const playNotificationSound = () => {
  try {
    if (!notificationAudio) {
      notificationAudio = new Audio(NOTIFICATION_SOUND_URL);
      notificationAudio.volume = 0.5;
    }
    notificationAudio.currentTime = 0;
    notificationAudio.play().catch(() => {
      // Autoplay blocked — silently ignore
    });
  } catch {
    // Audio not supported
  }
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useNotifications() {
  const {
    notifications,
    unreadCount,
    hasMentions,
    preferences,
    isPermissionGranted,
    isLoading,
    setNotifications,
    addNotification,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAll,
    setPreferences,
    setPermissionGranted,
    setIsLoading,
  } = useNotificationStore();

  const { user, workspaceAccess } = useAuthStore();
  const snapshotUnsubRef = useRef<Unsubscribe | null>(null);
  const fcmTokenRef = useRef<string | null>(null);

  // ─── Fetch notification history ───────────────────────────────────────────

  const fetchNotifications = useCallback(async () => {
    if (!user || !workspaceAccess?.workspaceId) return;

    setIsLoading(true);
    try {
      const { data } = await apiClient.get<{ notifications: AppNotification[] }>(
        "/api/v1/notifications",
        { params: { limit: MAX_NOTIFICATIONS } }
      );
      setNotifications(data.notifications);
    } catch (err) {
      console.error("[useNotifications] fetchNotifications failed:", err);
    } finally {
      setIsLoading(false);
    }
  }, [user, workspaceAccess?.workspaceId]);

  // ─── Subscribe to real-time Firestore notifications ───────────────────────

  const subscribeToNotifications = useCallback(() => {
    if (!user || !workspaceAccess?.workspaceId) return;

    // Unsubscribe from previous listener
    if (snapshotUnsubRef.current) {
      snapshotUnsubRef.current();
      snapshotUnsubRef.current = null;
    }

    const notifQuery = query(
      collection(db, NOTIFICATIONS_COLLECTION),
      where("uid", "==", user.uid),
      where("workspaceId", "==", workspaceAccess.workspaceId),
      where("isRead", "==", false),
      orderBy("createdAt", "desc"),
      limit(MAX_NOTIFICATIONS)
    );

    snapshotUnsubRef.current = onSnapshot(
      notifQuery,
      (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === "added") {
            const data = change.doc.data() as AppNotification;
            const notification: AppNotification = {
              ...data,
              notificationId: change.doc.id,
            };

            addNotification(notification);

            // Play sound if enabled
            if (preferences.soundEnabled) {
              playNotificationSound();
            }

            // Show desktop notification if enabled + permitted
            if (preferences.desktopEnabled && isPermissionGranted) {
              showDesktopNotification(notification);
            }
          }
        });
      },
      (err) => {
        console.error("[useNotifications] Firestore snapshot error:", err);
      }
    );
  }, [user, workspaceAccess?.workspaceId, preferences, isPermissionGranted]);

  // ─── Mark single notification as read ─────────────────────────────────────

  const markRead = useCallback(
    async (notificationId: string) => {
      markAsRead(notificationId);
      try {
        await apiClient.patch(`/api/v1/notifications/${notificationId}/read`);
      } catch (err) {
        console.error("[useNotifications] markRead failed:", err);
      }
    },
    [markAsRead]
  );

  // ─── Mark all as read ─────────────────────────────────────────────────────

  const markAllRead = useCallback(async () => {
    markAllAsRead();
    try {
      await apiClient.patch("/api/v1/notifications/read-all");
    } catch (err) {
      console.error("[useNotifications] markAllRead failed:", err);
    }
  }, [markAllAsRead]);

  // ─── Delete notification ──────────────────────────────────────────────────

  const deleteNotification = useCallback(
    async (notificationId: string) => {
      removeNotification(notificationId);
      try {
        await apiClient.delete(`/api/v1/notifications/${notificationId}`);
      } catch (err) {
        console.error("[useNotifications] deleteNotification failed:", err);
      }
    },
    [removeNotification]
  );

  // ─── Clear all notifications ──────────────────────────────────────────────

  const clearAllNotifications = useCallback(async () => {
    clearAll();
    try {
      await apiClient.delete("/api/v1/notifications");
    } catch (err) {
      console.error("[useNotifications] clearAll failed:", err);
    }
  }, [clearAll]);

  // ─── Update preferences ───────────────────────────────────────────────────

  const updatePreferences = useCallback(
    async (prefs: Partial<NotificationPreferences>) => {
      setPreferences(prefs);
      try {
        await apiClient.patch("/api/v1/notifications/preferences", prefs);
      } catch (err) {
        console.error("[useNotifications] updatePreferences failed:", err);
      }
    },
    [setPreferences]
  );

  // ─── Request desktop notification permission ──────────────────────────────

  const requestDesktopPermission = useCallback(async (): Promise<boolean> => {
    if (!("Notification" in window)) {
      console.warn("[useNotifications] Desktop notifications not supported");
      return false;
    }

    if (Notification.permission === "granted") {
      setPermissionGranted(true);
      return true;
    }

    if (Notification.permission === "denied") {
      setPermissionGranted(false);
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      const granted = permission === "granted";
      setPermissionGranted(granted);
      return granted;
    } catch (err) {
      console.error("[useNotifications] requestDesktopPermission failed:", err);
      return false;
    }
  }, [setPermissionGranted]);

  // ─── Register FCM push token ──────────────────────────────────────────────

  const registerPushToken = useCallback(async () => {
    if (!user || fcmTokenRef.current) return;

    try {
      const messaging = await getFirebaseMessaging();
      if (!messaging) return;

      const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY as string;
      if (!vapidKey) return;

      const token = await getToken(messaging, { vapidKey });
      if (!token) return;

      fcmTokenRef.current = token;

      // Register token with backend
      await apiClient.post("/api/v1/notifications/push-token", {
        token,
        platform: "web",
      });
    } catch (err) {
      console.error("[useNotifications] registerPushToken failed:", err);
    }
  }, [user]);

  // ─── Initialize on mount ──────────────────────────────────────────────────

  useEffect(() => {
    if (!user || !workspaceAccess?.workspaceId) return;

    fetchNotifications();
    subscribeToNotifications();

    // Check existing desktop permission
    if ("Notification" in window) {
      setPermissionGranted(Notification.permission === "granted");
    }

    return () => {
      if (snapshotUnsubRef.current) {
        snapshotUnsubRef.current();
        snapshotUnsubRef.current = null;
      }
    };
  }, [user?.uid, workspaceAccess?.workspaceId]);

  // ─── Register push token when permission granted ───────────────────────────

  useEffect(() => {
    if (isPermissionGranted && user) {
      registerPushToken();
    }
  }, [isPermissionGranted, user?.uid]);

  // ─── Get notifications by type ────────────────────────────────────────────

  const getByType = useCallback(
    (type: AppNotification["type"]) =>
      notifications.filter((n) => n.type === type),
    [notifications]
  );

  // ─── Get high priority notifications ─────────────────────────────────────

  const highPriorityNotifications = notifications.filter(
    (n) => n.priority === "high" && !n.isRead
  );

  return {
    // State
    notifications,
    unreadCount,
    hasMentions,
    preferences,
    isPermissionGranted,
    isLoading,
    highPriorityNotifications,

    // Actions
    markRead,
    markAllRead,
    deleteNotification,
    clearAllNotifications,
    updatePreferences,
    requestDesktopPermission,
    registerPushToken,
    getByType,
  };
}

// ─── Desktop notification helper ─────────────────────────────────────────────

function showDesktopNotification(notification: AppNotification): void {
  try {
    const n = new Notification(notification.title, {
      body: notification.body,
      icon: notification.actorAvatarUrl ?? "/icons/icon-192.png",
      badge: "/icons/badge-72.png",
      tag: notification.notificationId,
      silent: true, // We handle sound ourselves
    });

    // Auto-close after 5 seconds
    setTimeout(() => n.close(), 5000);

    // Navigate on click
    n.onclick = () => {
      window.focus();
      if (notification.actionUrl) {
        window.location.href = notification.actionUrl;
      }
      n.close();
    };
  } catch (err) {
    console.error("[useNotifications] showDesktopNotification failed:", err);
  }
}
