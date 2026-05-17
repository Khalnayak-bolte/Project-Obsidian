/**
 * backend/utils/constants.ts
 * Project: Obsidian
 */
export declare const TIERS: {
    readonly GOLD: "gold";
    readonly PREMIUM: "premium";
    readonly DELUXE: "deluxe";
};
export type Tier = (typeof TIERS)[keyof typeof TIERS];
export declare const TIER_LIMITS: Record<Tier, {
    maxMembers: number;
    maxStorageBytes: number;
    maxFileSizeBytes: number;
    maxChannels: number;
    maxRoles: number;
    guestAccess: boolean;
    voiceQuality: "standard" | "high-fi" | "spatial";
    customRoles: "limited" | "full" | "advanced";
    retentionDays: number;
}>;
export declare const SYSTEM_ROLES: {
    readonly OWNER: "role_owner";
    readonly ADMIN: "role_admin";
    readonly MANAGER: "role_manager";
    readonly DEVELOPER: "role_developer";
    readonly HR: "role_hr";
    readonly DESIGNER: "role_designer";
    readonly MODERATOR: "role_moderator";
    readonly MEMBER: "role_member";
    readonly GUEST: "role_guest";
};
export type SystemRole = (typeof SYSTEM_ROLES)[keyof typeof SYSTEM_ROLES];
export declare const DEFAULT_ROLE_PERMISSIONS: Record<SystemRole, Record<string, boolean>>;
export declare const CHANNEL_TYPES: {
    readonly TEXT: "text";
    readonly VOICE: "voice";
    readonly ANNOUNCEMENT: "announcement";
    readonly FORUM: "forum";
};
export type ChannelType = (typeof CHANNEL_TYPES)[keyof typeof CHANNEL_TYPES];
export declare const CHANNEL_VISIBILITY: {
    readonly PUBLIC: "public";
    readonly PRIVATE: "private";
    readonly SECRET: "secret";
};
export type ChannelVisibility = (typeof CHANNEL_VISIBILITY)[keyof typeof CHANNEL_VISIBILITY];
export declare const DEFAULT_CHANNELS: readonly [{
    readonly name: "general";
    readonly type: "text";
    readonly visibility: "public";
    readonly description: "General workspace discussion";
    readonly isDefault: true;
    readonly position: 0;
}, {
    readonly name: "announcements";
    readonly type: "announcement";
    readonly visibility: "public";
    readonly description: "Important workspace announcements";
    readonly isDefault: false;
    readonly position: 1;
}, {
    readonly name: "voice-lounge";
    readonly type: "voice";
    readonly visibility: "public";
    readonly description: "Drop in for a quick chat";
    readonly isDefault: false;
    readonly position: 2;
}];
export declare const PRESENCE_STATUS: {
    readonly ONLINE: "online";
    readonly AWAY: "away";
    readonly BUSY: "busy";
    readonly OFFLINE: "offline";
    readonly INVISIBLE: "invisible";
};
export type PresenceStatus = (typeof PRESENCE_STATUS)[keyof typeof PRESENCE_STATUS];
/** Heartbeat interval in milliseconds. */
export declare const PRESENCE_HEARTBEAT_MS = 30000;
/** Mark user away after this many ms of inactivity. */
export declare const PRESENCE_AWAY_AFTER_MS: number;
/** Mark user offline after this many ms without a heartbeat. */
export declare const PRESENCE_OFFLINE_AFTER_MS: number;
export declare const VOICE_REGIONS: {
    readonly MUMBAI: "ap-south-1";
    readonly SINGAPORE: "ap-southeast-1";
    readonly FRANKFURT: "eu-central-1";
};
export type VoiceRegion = (typeof VOICE_REGIONS)[keyof typeof VOICE_REGIONS];
/** Default voice region for Indian startups. */
export declare const DEFAULT_VOICE_REGION: "ap-south-1";
/** Idle voice session cleanup timeout in seconds. */
export declare const VOICE_IDLE_TIMEOUT_SECONDS: number;
export declare const ALLOWED_IMAGE_TYPES: readonly ["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"];
export declare const ALLOWED_DOCUMENT_TYPES: readonly ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/vnd.ms-powerpoint", "application/vnd.openxmlformats-officedocument.presentationml.presentation", "text/plain", "text/csv", "text/markdown"];
export declare const ALLOWED_ARCHIVE_TYPES: readonly ["application/zip", "application/x-tar", "application/gzip"];
export declare const ALLOWED_CODE_TYPES: readonly ["application/json", "application/javascript", "text/javascript", "text/typescript", "text/html", "text/css", "text/xml", "application/xml"];
export declare const BLOCKED_MIME_TYPES: readonly ["application/x-msdownload", "application/x-executable", "application/x-dosexec", "application/x-sh", "application/bat", "application/x-msdos-program"];
/** Signed S3 URL expiry in seconds. */
export declare const S3_SIGNED_URL_EXPIRY_SECONDS = 600;
export declare const NOTIFICATION_TYPES: {
    readonly MENTION: "mention";
    readonly REPLY: "reply";
    readonly REACTION: "reaction";
    readonly VOICE_INVITE: "voice_invite";
    readonly WORKSPACE_INVITE: "workspace_invite";
    readonly ROLE_UPDATE: "role_update";
    readonly BILLING_ALERT: "billing_alert";
    readonly SYSTEM_UPDATE: "system_update";
    readonly FILE_UPLOAD: "file_upload";
    readonly MEMBER_JOIN: "member_join";
    readonly MEMBER_LEAVE: "member_leave";
};
export type NotificationType = (typeof NOTIFICATION_TYPES)[keyof typeof NOTIFICATION_TYPES];
export declare const EVENTBRIDGE_EVENTS: {
    readonly WORKSPACE_CREATED: "workspace.created";
    readonly WORKSPACE_DELETED: "workspace.deleted";
    readonly MEMBER_JOINED: "member.joined";
    readonly MEMBER_LEFT: "member.left";
    readonly MEMBER_BANNED: "member.banned";
    readonly SUBSCRIPTION_UPDATED: "subscription.updated";
    readonly SUBSCRIPTION_CANCELLED: "subscription.cancelled";
    readonly PAYMENT_CAPTURED: "payment.captured";
    readonly PAYMENT_FAILED: "payment.failed";
    readonly VOICE_SESSION_STARTED: "voice.session.started";
    readonly VOICE_SESSION_ENDED: "voice.session.ended";
    readonly FILE_UPLOADED: "file.uploaded";
    readonly FILE_DELETED: "file.deleted";
    readonly MESSAGE_FLAGGED: "message.flagged";
};
export type EventBridgeEvent = (typeof EVENTBRIDGE_EVENTS)[keyof typeof EVENTBRIDGE_EVENTS];
export declare const RAZORPAY_EVENTS: {
    readonly PAYMENT_CAPTURED: "payment.captured";
    readonly PAYMENT_FAILED: "payment.failed";
    readonly SUBSCRIPTION_ACTIVATED: "subscription.activated";
    readonly SUBSCRIPTION_CHARGED: "subscription.charged";
    readonly SUBSCRIPTION_CANCELLED: "subscription.cancelled";
    readonly SUBSCRIPTION_PAUSED: "subscription.paused";
    readonly SUBSCRIPTION_RESUMED: "subscription.resumed";
    readonly REFUND_CREATED: "refund.created";
};
export type RazorpayEvent = (typeof RAZORPAY_EVENTS)[keyof typeof RAZORPAY_EVENTS];
export declare const BILLING_CYCLES: {
    readonly MONTHLY: "monthly";
    readonly ANNUAL: "annual";
};
export type BillingCycle = (typeof BILLING_CYCLES)[keyof typeof BILLING_CYCLES];
/** Annual discount percentage applied to monthly price. */
export declare const ANNUAL_DISCOUNT_PERCENT = 20;
export declare const PAGINATION: {
    readonly DEFAULT_LIMIT: 25;
    readonly MAX_LIMIT: 100;
    readonly MESSAGE_DEFAULT_LIMIT: 50;
    readonly MESSAGE_MAX_LIMIT: 100;
};
export declare const RATE_LIMIT_WINDOWS: {
    readonly LOGIN: {
        readonly limit: 10;
        readonly windowSeconds: 60;
    };
    readonly REGISTER: {
        readonly limit: 5;
        readonly windowSeconds: 3600;
    };
    readonly MESSAGES: {
        readonly limit: 60;
        readonly windowSeconds: 60;
    };
    readonly VOICE_JOIN: {
        readonly limit: 20;
        readonly windowSeconds: 60;
    };
    readonly UPLOADS: {
        readonly limit: 15;
        readonly windowSeconds: 60;
    };
    readonly SEARCH: {
        readonly limit: 20;
        readonly windowSeconds: 60;
    };
    readonly INVITE: {
        readonly limit: 10;
        readonly windowSeconds: 3600;
    };
    readonly WEBHOOK: {
        readonly limit: 5;
        readonly windowSeconds: 60;
    };
};
export declare const TOKEN_TTL: {
    readonly VOICE_JOIN: 300;
    readonly SIGNED_UPLOAD: 600;
    readonly WORKSPACE_INVITE: 604800;
    readonly PASSWORD_RESET: 3600;
    readonly EMAIL_VERIFY: 86400;
    readonly REFRESH_TOKEN: 2592000;
};
export declare const MESSAGE_LIMITS: {
    readonly MAX_LENGTH: 4000;
    readonly MAX_ATTACHMENTS: 10;
    readonly MAX_REACTIONS_PER_MESSAGE: 20;
    readonly MAX_MENTIONS: 50;
    readonly EDIT_WINDOW_MS: number;
    readonly BULK_DELETE_MAX: 100;
};
export declare const AUDIT_ACTIONS: {
    readonly USER_LOGIN: "user.login";
    readonly USER_LOGOUT: "user.logout";
    readonly PASSWORD_CHANGED: "user.password_changed";
    readonly WORKSPACE_CREATED: "workspace.created";
    readonly WORKSPACE_UPDATED: "workspace.updated";
    readonly WORKSPACE_DELETED: "workspace.deleted";
    readonly MEMBER_INVITED: "member.invited";
    readonly MEMBER_JOINED: "member.joined";
    readonly MEMBER_REMOVED: "member.removed";
    readonly MEMBER_BANNED: "member.banned";
    readonly MEMBER_UNBANNED: "member.unbanned";
    readonly OWNERSHIP_TRANSFERRED: "workspace.ownership_transferred";
    readonly ROLE_CREATED: "role.created";
    readonly ROLE_UPDATED: "role.updated";
    readonly ROLE_DELETED: "role.deleted";
    readonly ROLE_ASSIGNED: "role.assigned";
    readonly CHANNEL_CREATED: "channel.created";
    readonly CHANNEL_UPDATED: "channel.updated";
    readonly CHANNEL_DELETED: "channel.deleted";
    readonly MESSAGE_DELETED: "message.deleted";
    readonly MESSAGE_PINNED: "message.pinned";
    readonly MESSAGES_BULK_DELETED: "message.bulk_deleted";
    readonly FILE_DELETED: "file.deleted";
    readonly PLAN_CHANGED: "billing.plan_changed";
    readonly PAYMENT_CAPTURED: "billing.payment_captured";
    readonly PAYMENT_FAILED: "billing.payment_failed";
};
export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];
export declare const HEADERS: {
    readonly AUTH: "authorization";
    readonly DEVICE_ID: "x-device-id";
    readonly OBS_TOKEN: "x-obs-token";
    readonly OBS_HMAC: "x-obs-hmac";
    readonly OBS_TIMESTAMP: "x-obs-timestamp";
    readonly RAZORPAY_SIGNATURE: "x-razorpay-signature";
    readonly REQUEST_ID: "x-request-id";
    readonly RATE_LIMIT: "x-ratelimit-limit";
    readonly RATE_REMAINING: "x-ratelimit-remaining";
    readonly RATE_RESET: "x-ratelimit-reset";
};
export declare const ENV: {
    readonly PRODUCTION: "production";
    readonly STAGING: "staging";
    readonly DEVELOPMENT: "development";
    readonly TEST: "test";
};
export declare const IS_PRODUCTION: boolean;
export declare const IS_DEVELOPMENT: boolean;
//# sourceMappingURL=constants.d.ts.map