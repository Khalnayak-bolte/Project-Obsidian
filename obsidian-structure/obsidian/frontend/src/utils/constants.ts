/**
 * frontend/src/utils/constants.ts
 * Project: Obsidian
 */

// ─── App ──────────────────────────────────────────────────────────────────────

export const APP_NAME = "Obsidian";
export const APP_VERSION = "1.0.0";
export const APP_URL = import.meta.env.VITE_APP_URL as string ?? "https://app.obsidian.work";

// ─── Design tokens ────────────────────────────────────────────────────────────

export const COLORS = {
  BACKGROUND: "#0B0F19",
  SURFACE: "#111827",
  SURFACE_ELEVATED: "#1F2937",
  ACCENT: "#6D5EF5",
  ACCENT_HOVER: "#5B4ED4",
  SUCCESS: "#10B981",
  ERROR: "#EF4444",
  WARNING: "#F59E0B",
  TEXT_PRIMARY: "#F9FAFB",
  TEXT_SECONDARY: "#9CA3AF",
  TEXT_MUTED: "#6B7280",
  BORDER: "#1F2937",
} as const;

export const PRESENCE_COLORS = {
  online: "#10B981",
  away: "#F59E0B",
  busy: "#EF4444",
  offline: "#6B7280",
  invisible: "#6B7280",
} as const;

// ─── Subscription tiers ───────────────────────────────────────────────────────

export const TIERS = {
  GOLD: "gold",
  PREMIUM: "premium",
  DELUXE: "deluxe",
} as const;

export const TIER_LABELS: Record<string, string> = {
  gold: "Gold",
  premium: "Premium",
  deluxe: "Deluxe",
};

export const TIER_COLORS: Record<string, string> = {
  gold: "#F59E0B",
  premium: "#6D5EF5",
  deluxe: "#10B981",
};

// ─── Pagination ───────────────────────────────────────────────────────────────

export const PAGINATION = {
  MESSAGES_LIMIT: 50,
  FILES_LIMIT: 20,
  MEMBERS_LIMIT: 50,
  NOTIFICATIONS_LIMIT: 20,
  INVOICES_LIMIT: 10,
} as const;

// ─── Message limits ───────────────────────────────────────────────────────────

export const MESSAGE = {
  MAX_LENGTH: 4000,
  MAX_ATTACHMENTS: 10,
  EDIT_WINDOW_MS: 15 * 60 * 1000,
} as const;

// ─── File limits ──────────────────────────────────────────────────────────────

export const FILE = {
  ACCEPTED_IMAGE_TYPES: ["image/jpeg", "image/png", "image/gif", "image/webp"],
  ACCEPTED_DOCUMENT_TYPES: [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/plain",
    "text/csv",
  ],
  BLOCKED_TYPES: ["application/x-msdownload", "application/x-executable"],
  PREVIEW_IMAGE_TYPES: ["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"],
  PREVIEW_MAX_BYTES: 10 * 1024 * 1024, // 10 MB for inline preview
} as const;

// ─── Voice ────────────────────────────────────────────────────────────────────

export const VOICE = {
  HEARTBEAT_INTERVAL_MS: 30_000,
  RECONNECT_DELAY_MS: 2_000,
  MAX_RECONNECT_ATTEMPTS: 5,
  SPEAKING_THRESHOLD_DB: -50,
} as const;

// ─── Presence ─────────────────────────────────────────────────────────────────

export const PRESENCE = {
  HEARTBEAT_MS: 30_000,
  AWAY_AFTER_MS: 10 * 60 * 1000,
  OFFLINE_AFTER_MS: 5 * 60 * 1000,
} as const;

// ─── Notification types ───────────────────────────────────────────────────────

export const NOTIFICATION_TYPE_LABELS: Record<string, string> = {
  mention: "Mentions",
  reply: "Replies",
  reaction: "Reactions",
  voice_invite: "Voice Invites",
  workspace_invite: "Workspace Invites",
  role_update: "Role Updates",
  billing_alert: "Billing Alerts",
  system_update: "System Updates",
  file_upload: "File Uploads",
  member_join: "Member Joins",
  member_leave: "Member Leaves",
};

// ─── Routes ───────────────────────────────────────────────────────────────────

export const ROUTES = {
  HOME: "/",
  LOGIN: "/auth/login",
  REGISTER: "/auth/register",
  FORGOT_PASSWORD: "/auth/forgot-password",
  DASHBOARD: "/dashboard",
  ONBOARDING: "/onboarding",
  WORKSPACE: "/workspace",
  WORKSPACE_SETUP: "/workspace/setup",
  SETTINGS: "/settings",
  SETTINGS_PROFILE: "/settings/profile",
  SETTINGS_NOTIFICATIONS: "/settings/notifications",
  BILLING: "/billing",
} as const;

// ─── API ──────────────────────────────────────────────────────────────────────

export const API = {
  BASE_URL: import.meta.env.VITE_API_BASE_URL as string,
  VERSION: "v1",
  TIMEOUT_MS: 30_000,
} as const;

// ─── Local storage keys ───────────────────────────────────────────────────────

export const STORAGE_KEYS = {
  DEVICE_ID: "obs_device_id",
  LAST_WORKSPACE: "obs_last_workspace",
  THEME: "obs_theme",
  VOICE_INPUT_DEVICE: "obs_voice_input",
  VOICE_OUTPUT_DEVICE: "obs_voice_output",
  SIDEBAR_COLLAPSED: "obs_sidebar_collapsed",
} as const;

// ─── Channel types ────────────────────────────────────────────────────────────

export const CHANNEL_TYPE_ICONS: Record<string, string> = {
  text: "#",
  voice: "🔊",
  announcement: "📢",
  forum: "💬",
};

export const CHANNEL_TYPE_LABELS: Record<string, string> = {
  text: "Text Channel",
  voice: "Voice Channel",
  announcement: "Announcement Channel",
  forum: "Forum Channel",
};

// ─── Role colors ──────────────────────────────────────────────────────────────

export const DEFAULT_ROLE_COLOR = "#99AAB5";

export const SYSTEM_ROLE_COLORS: Record<string, string> = {
  role_owner: "#F59E0B",
  role_admin: "#EF4444",
  role_manager: "#8B5CF6",
  role_developer: "#3B82F6",
  role_hr: "#10B981",
  role_designer: "#EC4899",
  role_moderator: "#F97316",
  role_member: "#6B7280",
  role_guest: "#4B5563",
};

// ─── Animation durations ──────────────────────────────────────────────────────

export const ANIMATION = {
  FAST_MS: 150,
  DEFAULT_MS: 200,
  SLOW_MS: 300,
  VERY_SLOW_MS: 500,
} as const;

// ─── Keyboard shortcuts ───────────────────────────────────────────────────────

export const SHORTCUTS = {
  TOGGLE_MUTE: "m",
  TOGGLE_DEAFEN: "d",
  LEAVE_VOICE: "Escape",
  OPEN_SEARCH: "/",
  NEXT_CHANNEL: "Alt+ArrowDown",
  PREV_CHANNEL: "Alt+ArrowUp",
} as const;
