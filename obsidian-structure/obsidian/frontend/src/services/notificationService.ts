/**
 * frontend/src/services/notificationService.ts
 * Project: Obsidian
 */

import { apiGet, apiPost, apiPatch, apiDelete } from "../lib/axios";
import { messaging } from "../lib/firebase";
import { getToken, onMessage, type MessagePayload } from "firebase/messaging";

// ─── Types ────────────────────────────────────────────────────────────────────

export type NotificationType =
  | "mention"
  | "reply"
  | "reaction"
  | "voice_invite"
  | "workspace_invite"
  | "role_update"
  | "billing_alert"
  | "system_update"
  | "file_upload"
  | "member_join"
  | "member_leave";

export interface AppNotification {
  notificationId: string;
  type: NotificationType;
  recipientUid: string;
  workspaceId: string;
  title: string;
  body: string;
  data: Record<string, string>;
  isRead: boolean;
  createdAt: string;
  readAt?: string;
}

export interface NotificationsResponse {
  notifications: AppNotification[];
  unreadCount: number;
}

export interface RegisterTokenPayload {
  token: string;
  deviceId: string;
}

export type NotificationHandler = (notification: AppNotification) => void;

// ─── FCM token registration ───────────────────────────────────────────────────

export async function requestPushPermission(): Promise<string | null> {
  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return null;

    const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY as string;
    const token = await getToken(messaging, { vapidKey });
    return token ?? null;
  } catch (err) {
    console.error("[notificationService] requestPushPermission failed:", err);
    return null;
  }
}

export async function registerFcmToken(
  workspaceId: string,
  payload: RegisterTokenPayload
): Promise<void> {
  return apiPost<void>(
    `/api/v1/workspaces/${workspaceId}/notifications/fcm-token`,
    payload
  );
}

export async function removeFcmToken(
  workspaceId: string,
  deviceId: string
): Promise<void> {
  return apiDelete<void>(
    `/api/v1/workspaces/${workspaceId}/notifications/fcm-token/${deviceId}`
  );
}

// ─── Foreground push listener ─────────────────────────────────────────────────

export function onForegroundMessage(
  handler: (payload: MessagePayload) => void
): () => void {
  return onMessage(messaging, handler);
}

// ─── In-app notifications ─────────────────────────────────────────────────────

export async function getNotifications(
  workspaceId: string,
  limit = 20
): Promise<NotificationsResponse> {
  return apiGet<NotificationsResponse>(
    `/api/v1/workspaces/${workspaceId}/notifications`,
    { params: { limit } }
  );
}

export async function getUnreadCount(workspaceId: string): Promise<number> {
  const res = await apiGet<{ count: number }>(
    `/api/v1/workspaces/${workspaceId}/notifications/unread-count`
  );
  return res.count;
}

export async function markNotificationRead(
  workspaceId: string,
  notificationId: string
): Promise<void> {
  return apiPatch<void>(
    `/api/v1/workspaces/${workspaceId}/notifications/${notificationId}/read`,
    {}
  );
}

export async function markAllNotificationsRead(
  workspaceId: string
): Promise<void> {
  return apiPost<void>(
    `/api/v1/workspaces/${workspaceId}/notifications/mark-all-read`,
    {}
  );
}

export async function deleteNotification(
  workspaceId: string,
  notificationId: string
): Promise<void> {
  return apiDelete<void>(
    `/api/v1/workspaces/${workspaceId}/notifications/${notificationId}`
  );
}

// ─── Notification preferences ─────────────────────────────────────────────────

export interface NotificationPreferences {
  mentions: boolean;
  replies: boolean;
  reactions: boolean;
  voiceInvites: boolean;
  billingAlerts: boolean;
  systemUpdates: boolean;
  memberJoins: boolean;
  emailEnabled: boolean;
  pushEnabled: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
}

export async function getNotificationPreferences(
  workspaceId: string
): Promise<NotificationPreferences> {
  return apiGet<NotificationPreferences>(
    `/api/v1/workspaces/${workspaceId}/notifications/preferences`
  );
}

export async function updateNotificationPreferences(
  workspaceId: string,
  prefs: Partial<NotificationPreferences>
): Promise<NotificationPreferences> {
  return apiPatch<NotificationPreferences>(
    `/api/v1/workspaces/${workspaceId}/notifications/preferences`,
    prefs
  );
}
