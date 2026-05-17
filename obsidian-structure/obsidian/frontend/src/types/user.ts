/**
 * frontend/src/types/user.ts
 * Project: Obsidian
 */

import type { PresenceStatus } from "./workspace";

// ─── User profile ─────────────────────────────────────────────────────────────

export interface User {
  uid: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  emailVerified: boolean;
  workspaceId: string;
  roleId: string;
  status: PresenceStatus;
  customStatus?: string;
  lastSeen?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Device session ───────────────────────────────────────────────────────────

export interface DeviceSession {
  deviceId: string;
  userAgent: string;
  ipAddress: string;
  lastActiveAt: string;
  isActive: boolean;
  revokedAt?: string;
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

// ─── DTOs ─────────────────────────────────────────────────────────────────────

export interface UpdateProfilePayload {
  displayName?: string;
  avatarUrl?: string;
  customStatus?: string;
}

export interface UpdatePresencePayload {
  status: PresenceStatus;
  customStatus?: string;
  clearAfter?: string;
}

export interface UserSearchResult {
  uid: string;
  displayName: string;
  email: string;
  avatarUrl?: string;
  roleId: string;
  status: PresenceStatus;
}
