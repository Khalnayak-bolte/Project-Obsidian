/**
 * backend/utils/constants.ts
 * Project: Obsidian
 */

// ─── Subscription Tiers ───────────────────────────────────────────────────────

export const TIERS = {
  GOLD: "gold",
  PREMIUM: "premium",
  DELUXE: "deluxe",
} as const;

export type Tier = (typeof TIERS)[keyof typeof TIERS];

// ─── Tier Limits ──────────────────────────────────────────────────────────────

export const TIER_LIMITS: Record<
  Tier,
  {
    maxMembers: number;
    maxStorageBytes: number;
    maxFileSizeBytes: number;
    maxChannels: number;
    maxRoles: number;
    guestAccess: boolean;
    voiceQuality: "standard" | "high-fi" | "spatial";
    customRoles: "limited" | "full" | "advanced";
    retentionDays: number;
  }
> = {
  gold: {
    maxMembers: 15,
    maxStorageBytes: 5 * 1024 * 1024 * 1024,       // 5 GB
    maxFileSizeBytes: 25 * 1024 * 1024,              // 25 MB
    maxChannels: 30,
    maxRoles: 5,
    guestAccess: false,
    voiceQuality: "standard",
    customRoles: "limited",
    retentionDays: 30,
  },
  premium: {
    maxMembers: 50,
    maxStorageBytes: 25 * 1024 * 1024 * 1024,       // 25 GB
    maxFileSizeBytes: 100 * 1024 * 1024,             // 100 MB
    maxChannels: 100,
    maxRoles: 15,
    guestAccess: false,
    voiceQuality: "high-fi",
    customRoles: "full",
    retentionDays: 90,
  },
  deluxe: {
    maxMembers: 150,
    maxStorageBytes: 100 * 1024 * 1024 * 1024,      // 100 GB
    maxFileSizeBytes: 500 * 1024 * 1024,             // 500 MB
    maxChannels: 500,
    maxRoles: 50,
    guestAccess: true,
    voiceQuality: "spatial",
    customRoles: "advanced",
    retentionDays: 365,
  },
};

// ─── Role IDs ─────────────────────────────────────────────────────────────────

export const SYSTEM_ROLES = {
  OWNER: "role_owner",
  ADMIN: "role_admin",
  MANAGER: "role_manager",
  DEVELOPER: "role_developer",
  HR: "role_hr",
  DESIGNER: "role_designer",
  MODERATOR: "role_moderator",
  MEMBER: "role_member",
  GUEST: "role_guest",
} as const;

export type SystemRole = (typeof SYSTEM_ROLES)[keyof typeof SYSTEM_ROLES];

// ─── Default Permissions per Role ─────────────────────────────────────────────

export const DEFAULT_ROLE_PERMISSIONS: Record<SystemRole, Record<string, boolean>> = {
  role_owner: {
    manage_workspace: true,
    manage_roles: true,
    manage_channels: true,
    manage_members: true,
    manage_billing: true,
    create_channels: true,
    delete_channels: true,
    send_messages: true,
    delete_messages: true,
    pin_messages: true,
    mention_everyone: true,
    join_voice: true,
    mute_members: true,
    kick_members: true,
    deafen_members: true,
    upload_files: true,
    download_files: true,
    delete_files: true,
    ban_members: true,
    view_audit_log: true,
    manage_invites: true,
  },
  role_admin: {
    manage_workspace: true,
    manage_roles: true,
    manage_channels: true,
    manage_members: true,
    manage_billing: false,
    create_channels: true,
    delete_channels: true,
    send_messages: true,
    delete_messages: true,
    pin_messages: true,
    mention_everyone: true,
    join_voice: true,
    mute_members: true,
    kick_members: true,
    deafen_members: true,
    upload_files: true,
    download_files: true,
    delete_files: true,
    ban_members: true,
    view_audit_log: true,
    manage_invites: true,
  },
  role_manager: {
    manage_workspace: false,
    manage_roles: false,
    manage_channels: true,
    manage_members: true,
    manage_billing: false,
    create_channels: true,
    delete_channels: false,
    send_messages: true,
    delete_messages: true,
    pin_messages: true,
    mention_everyone: true,
    join_voice: true,
    mute_members: true,
    kick_members: false,
    deafen_members: false,
    upload_files: true,
    download_files: true,
    delete_files: false,
    ban_members: false,
    view_audit_log: true,
    manage_invites: true,
  },
  role_developer: {
    manage_workspace: false,
    manage_roles: false,
    manage_channels: false,
    manage_members: false,
    manage_billing: false,
    create_channels: false,
    delete_channels: false,
    send_messages: true,
    delete_messages: false,
    pin_messages: false,
    mention_everyone: false,
    join_voice: true,
    mute_members: false,
    kick_members: false,
    deafen_members: false,
    upload_files: true,
    download_files: true,
    delete_files: false,
    ban_members: false,
    view_audit_log: false,
    manage_invites: false,
  },
  role_hr: {
    manage_workspace: false,
    manage_roles: false,
    manage_channels: false,
    manage_members: true,
    manage_billing: false,
    create_channels: false,
    delete_channels: false,
    send_messages: true,
    delete_messages: false,
    pin_messages: false,
    mention_everyone: false,
    join_voice: true,
    mute_members: false,
    kick_members: false,
    deafen_members: false,
    upload_files: true,
    download_files: true,
    delete_files: false,
    ban_members: false,
    view_audit_log: false,
    manage_invites: true,
  },
  role_designer: {
    manage_workspace: false,
    manage_roles: false,
    manage_channels: false,
    manage_members: false,
    manage_billing: false,
    create_channels: false,
    delete_channels: false,
    send_messages: true,
    delete_messages: false,
    pin_messages: false,
    mention_everyone: false,
    join_voice: true,
    mute_members: false,
    kick_members: false,
    deafen_members: false,
    upload_files: true,
    download_files: true,
    delete_files: false,
    ban_members: false,
    view_audit_log: false,
    manage_invites: false,
  },
  role_moderator: {
    manage_workspace: false,
    manage_roles: false,
    manage_channels: false,
    manage_members: false,
    manage_billing: false,
    create_channels: false,
    delete_channels: false,
    send_messages: true,
    delete_messages: true,
    pin_messages: true,
    mention_everyone: false,
    join_voice: true,
    mute_members: true,
    kick_members: true,
    deafen_members: true,
    upload_files: true,
    download_files: true,
    delete_files: false,
    ban_members: true,
    view_audit_log: true,
    manage_invites: false,
  },
  role_member: {
    manage_workspace: false,
    manage_roles: false,
    manage_channels: false,
    manage_members: false,
    manage_billing: false,
    create_channels: false,
    delete_channels: false,
    send_messages: true,
    delete_messages: false,
    pin_messages: false,
    mention_everyone: false,
    join_voice: true,
    mute_members: false,
    kick_members: false,
    deafen_members: false,
    upload_files: true,
    download_files: true,
    delete_files: false,
    ban_members: false,
    view_audit_log: false,
    manage_invites: false,
  },
  role_guest: {
    manage_workspace: false,
    manage_roles: false,
    manage_channels: false,
    manage_members: false,
    manage_billing: false,
    create_channels: false,
    delete_channels: false,
    send_messages: true,
    delete_messages: false,
    pin_messages: false,
    mention_everyone: false,
    join_voice: false,
    mute_members: false,
    kick_members: false,
    deafen_members: false,
    upload_files: false,
    download_files: true,
    delete_files: false,
    ban_members: false,
    view_audit_log: false,
    manage_invites: false,
  },
};

// ─── Channel Types ────────────────────────────────────────────────────────────

export const CHANNEL_TYPES = {
  TEXT: "text",
  VOICE: "voice",
  ANNOUNCEMENT: "announcement",
  FORUM: "forum",
} as const;

export type ChannelType = (typeof CHANNEL_TYPES)[keyof typeof CHANNEL_TYPES];

export const CHANNEL_VISIBILITY = {
  PUBLIC: "public",
  PRIVATE: "private",
  SECRET: "secret",
} as const;

export type ChannelVisibility =
  (typeof CHANNEL_VISIBILITY)[keyof typeof CHANNEL_VISIBILITY];

// ─── Default Channels ─────────────────────────────────────────────────────────

export const DEFAULT_CHANNELS = [
  {
    name: "general",
    type: CHANNEL_TYPES.TEXT,
    visibility: CHANNEL_VISIBILITY.PUBLIC,
    description: "General workspace discussion",
    isDefault: true,
    position: 0,
  },
  {
    name: "announcements",
    type: CHANNEL_TYPES.ANNOUNCEMENT,
    visibility: CHANNEL_VISIBILITY.PUBLIC,
    description: "Important workspace announcements",
    isDefault: false,
    position: 1,
  },
  {
    name: "voice-lounge",
    type: CHANNEL_TYPES.VOICE,
    visibility: CHANNEL_VISIBILITY.PUBLIC,
    description: "Drop in for a quick chat",
    isDefault: false,
    position: 2,
  },
] as const;

// ─── Presence ─────────────────────────────────────────────────────────────────

export const PRESENCE_STATUS = {
  ONLINE: "online",
  AWAY: "away",
  BUSY: "busy",
  OFFLINE: "offline",
  INVISIBLE: "invisible",
} as const;

export type PresenceStatus =
  (typeof PRESENCE_STATUS)[keyof typeof PRESENCE_STATUS];

/** Heartbeat interval in milliseconds. */
export const PRESENCE_HEARTBEAT_MS = 30_000;

/** Mark user away after this many ms of inactivity. */
export const PRESENCE_AWAY_AFTER_MS = 10 * 60 * 1000;

/** Mark user offline after this many ms without a heartbeat. */
export const PRESENCE_OFFLINE_AFTER_MS = 5 * 60 * 1000;

// ─── Voice ────────────────────────────────────────────────────────────────────

export const VOICE_REGIONS = {
  MUMBAI: "ap-south-1",
  SINGAPORE: "ap-southeast-1",
  FRANKFURT: "eu-central-1",
} as const;

export type VoiceRegion = (typeof VOICE_REGIONS)[keyof typeof VOICE_REGIONS];

/** Default voice region for Indian startups. */
export const DEFAULT_VOICE_REGION = VOICE_REGIONS.MUMBAI;

/** Idle voice session cleanup timeout in seconds. */
export const VOICE_IDLE_TIMEOUT_SECONDS = 10 * 60;

// ─── File Storage ─────────────────────────────────────────────────────────────

export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
] as const;

export const ALLOWED_DOCUMENT_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "text/csv",
  "text/markdown",
] as const;

export const ALLOWED_ARCHIVE_TYPES = [
  "application/zip",
  "application/x-tar",
  "application/gzip",
] as const;

export const ALLOWED_CODE_TYPES = [
  "application/json",
  "application/javascript",
  "text/javascript",
  "text/typescript",
  "text/html",
  "text/css",
  "text/xml",
  "application/xml",
] as const;

export const BLOCKED_MIME_TYPES = [
  "application/x-msdownload",
  "application/x-executable",
  "application/x-dosexec",
  "application/x-sh",
  "application/bat",
  "application/x-msdos-program",
] as const;

/** Signed S3 URL expiry in seconds. */
export const S3_SIGNED_URL_EXPIRY_SECONDS = 600; // 10 minutes

// ─── Notification Types ───────────────────────────────────────────────────────

export const NOTIFICATION_TYPES = {
  MENTION: "mention",
  REPLY: "reply",
  REACTION: "reaction",
  VOICE_INVITE: "voice_invite",
  WORKSPACE_INVITE: "workspace_invite",
  ROLE_UPDATE: "role_update",
  BILLING_ALERT: "billing_alert",
  SYSTEM_UPDATE: "system_update",
  FILE_UPLOAD: "file_upload",
  MEMBER_JOIN: "member_join",
  MEMBER_LEAVE: "member_leave",
} as const;

export type NotificationType =
  (typeof NOTIFICATION_TYPES)[keyof typeof NOTIFICATION_TYPES];

// ─── Event Bridge Event Types ─────────────────────────────────────────────────

export const EVENTBRIDGE_EVENTS = {
  WORKSPACE_CREATED: "workspace.created",
  WORKSPACE_DELETED: "workspace.deleted",
  MEMBER_JOINED: "member.joined",
  MEMBER_LEFT: "member.left",
  MEMBER_BANNED: "member.banned",
  SUBSCRIPTION_UPDATED: "subscription.updated",
  SUBSCRIPTION_CANCELLED: "subscription.cancelled",
  PAYMENT_CAPTURED: "payment.captured",
  PAYMENT_FAILED: "payment.failed",
  VOICE_SESSION_STARTED: "voice.session.started",
  VOICE_SESSION_ENDED: "voice.session.ended",
  FILE_UPLOADED: "file.uploaded",
  FILE_DELETED: "file.deleted",
  MESSAGE_FLAGGED: "message.flagged",
} as const;

export type EventBridgeEvent =
  (typeof EVENTBRIDGE_EVENTS)[keyof typeof EVENTBRIDGE_EVENTS];

// ─── Razorpay ─────────────────────────────────────────────────────────────────

export const RAZORPAY_EVENTS = {
  PAYMENT_CAPTURED: "payment.captured",
  PAYMENT_FAILED: "payment.failed",
  SUBSCRIPTION_ACTIVATED: "subscription.activated",
  SUBSCRIPTION_CHARGED: "subscription.charged",
  SUBSCRIPTION_CANCELLED: "subscription.cancelled",
  SUBSCRIPTION_PAUSED: "subscription.paused",
  SUBSCRIPTION_RESUMED: "subscription.resumed",
  REFUND_CREATED: "refund.created",
} as const;

export type RazorpayEvent =
  (typeof RAZORPAY_EVENTS)[keyof typeof RAZORPAY_EVENTS];

// ─── Billing Cycles ───────────────────────────────────────────────────────────

export const BILLING_CYCLES = {
  MONTHLY: "monthly",
  ANNUAL: "annual",
} as const;

export type BillingCycle =
  (typeof BILLING_CYCLES)[keyof typeof BILLING_CYCLES];

/** Annual discount percentage applied to monthly price. */
export const ANNUAL_DISCOUNT_PERCENT = 20;

// ─── Pagination ───────────────────────────────────────────────────────────────

export const PAGINATION = {
  DEFAULT_LIMIT: 25,
  MAX_LIMIT: 100,
  MESSAGE_DEFAULT_LIMIT: 50,
  MESSAGE_MAX_LIMIT: 100,
} as const;

// ─── Rate Limits ──────────────────────────────────────────────────────────────

export const RATE_LIMIT_WINDOWS = {
  LOGIN: { limit: 10, windowSeconds: 60 },
  REGISTER: { limit: 5, windowSeconds: 3600 },
  MESSAGES: { limit: 60, windowSeconds: 60 },
  VOICE_JOIN: { limit: 20, windowSeconds: 60 },
  UPLOADS: { limit: 15, windowSeconds: 60 },
  SEARCH: { limit: 20, windowSeconds: 60 },
  INVITE: { limit: 10, windowSeconds: 3600 },
  WEBHOOK: { limit: 5, windowSeconds: 60 },
} as const;

// ─── Token TTLs (seconds) ─────────────────────────────────────────────────────

export const TOKEN_TTL = {
  VOICE_JOIN: 300,           // 5 minutes
  SIGNED_UPLOAD: 600,        // 10 minutes
  WORKSPACE_INVITE: 604800,  // 7 days
  PASSWORD_RESET: 3600,      // 1 hour
  EMAIL_VERIFY: 86400,       // 24 hours
  REFRESH_TOKEN: 2592000,    // 30 days
} as const;

// ─── Message Constraints ──────────────────────────────────────────────────────

export const MESSAGE_LIMITS = {
  MAX_LENGTH: 4000,
  MAX_ATTACHMENTS: 10,
  MAX_REACTIONS_PER_MESSAGE: 20,
  MAX_MENTIONS: 50,
  EDIT_WINDOW_MS: 15 * 60 * 1000, // 15 minutes
  BULK_DELETE_MAX: 100,
} as const;

// ─── Audit Log Actions ────────────────────────────────────────────────────────

export const AUDIT_ACTIONS = {
  // Auth
  USER_LOGIN: "user.login",
  USER_LOGOUT: "user.logout",
  PASSWORD_CHANGED: "user.password_changed",
  // Workspace
  WORKSPACE_CREATED: "workspace.created",
  WORKSPACE_UPDATED: "workspace.updated",
  WORKSPACE_DELETED: "workspace.deleted",
  // Members
  MEMBER_INVITED: "member.invited",
  MEMBER_JOINED: "member.joined",
  MEMBER_REMOVED: "member.removed",
  MEMBER_BANNED: "member.banned",
  MEMBER_UNBANNED: "member.unbanned",
  OWNERSHIP_TRANSFERRED: "workspace.ownership_transferred",
  // Roles
  ROLE_CREATED: "role.created",
  ROLE_UPDATED: "role.updated",
  ROLE_DELETED: "role.deleted",
  ROLE_ASSIGNED: "role.assigned",
  // Channels
  CHANNEL_CREATED: "channel.created",
  CHANNEL_UPDATED: "channel.updated",
  CHANNEL_DELETED: "channel.deleted",
  // Messages
  MESSAGE_DELETED: "message.deleted",
  MESSAGE_PINNED: "message.pinned",
  MESSAGES_BULK_DELETED: "message.bulk_deleted",
  // Files
  FILE_DELETED: "file.deleted",
  // Billing
  PLAN_CHANGED: "billing.plan_changed",
  PAYMENT_CAPTURED: "billing.payment_captured",
  PAYMENT_FAILED: "billing.payment_failed",
} as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];

// ─── HTTP Headers ─────────────────────────────────────────────────────────────

export const HEADERS = {
  AUTH: "authorization",
  DEVICE_ID: "x-device-id",
  OBS_TOKEN: "x-obs-token",
  OBS_HMAC: "x-obs-hmac",
  OBS_TIMESTAMP: "x-obs-timestamp",
  RAZORPAY_SIGNATURE: "x-razorpay-signature",
  REQUEST_ID: "x-request-id",
  RATE_LIMIT: "x-ratelimit-limit",
  RATE_REMAINING: "x-ratelimit-remaining",
  RATE_RESET: "x-ratelimit-reset",
} as const;

// ─── Environment ──────────────────────────────────────────────────────────────

export const ENV = {
  PRODUCTION: "production",
  STAGING: "staging",
  DEVELOPMENT: "development",
  TEST: "test",
} as const;

export const IS_PRODUCTION = process.env.NODE_ENV === ENV.PRODUCTION;
export const IS_DEVELOPMENT = process.env.NODE_ENV === ENV.DEVELOPMENT;
