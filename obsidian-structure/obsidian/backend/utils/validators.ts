/**
 * backend/utils/validators.ts
 * Project: Obsidian
 *
 * Centralised Zod schemas for every inbound request payload, plus a
 * reusable `validate()` Express middleware factory that:
 *   - Parses body / params / query against the supplied schema
 *   - Attaches the typed, sanitised result to the request object
 *   - Returns a structured 422 response on failure
 *
 * Schema groups:
 *   AUTH       — login, register, password, magic-link
 *   WORKSPACE  — create, update, invite, member management
 *   CHANNEL    — create, update, reorder, permissions
 *   MESSAGE    — send, edit, react, pin, search
 *   VOICE      — join, leave, mute, kick, screen-share
 *   FILE       — request upload URL, delete, search
 *   BILLING    — select plan, webhook payload
 *   ADMIN      — role CRUD, ban, moderation actions
 *   COMMON     — pagination, ID params, search query
 */

import { z, ZodSchema, ZodError } from "zod";
import type { Request, Response, NextFunction } from "express";
import { HTTP_STATUS, ERROR_CODES } from "../types/common";
import { errorResponse } from "./helpers";
import { APP_CONFIG } from "../config/appConfig";

// ─── Primitive helpers ────────────────────────────────────────────────────────

/** Non-empty trimmed string. */
const requiredString = (label: string, max = 1000) =>
  z
    .string({ required_error: `${label} is required` })
    .trim()
    .min(1, `${label} cannot be empty`)
    .max(max, `${label} must be at most ${max} characters`);

/** Optional trimmed string — strips empty strings to undefined. */
const optionalString = (max = 1000) =>
  z.string().trim().max(max).optional().transform((v) => v || undefined);

/** Firebase UID: 28-character alphanumeric. */
const firebaseUid = z
  .string()
  .regex(/^[A-Za-z0-9]{20,128}$/, "Invalid Firebase UID format");

/** Obsidian prefixed ID (e.g. ws_abc123). */
const obsidianId = (prefix: string) =>
  z
    .string()
    .regex(
      new RegExp(`^${prefix}_[A-Za-z0-9]{6,32}$`),
      `Invalid ${prefix} ID format`
    );

/** Email address. */
const email = z.string().email("Invalid email address").toLowerCase().trim();

/** Strong password: min 8 chars, at least one uppercase, one digit. */
const strongPassword = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password is too long")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[0-9]/, "Password must contain at least one digit");

/** URL — must be https in production. */
const httpsUrl = z
  .string()
  .url("Must be a valid URL")
  .refine(
    (url) =>
      process.env.NODE_ENV !== "production" || url.startsWith("https://"),
    "URL must use HTTPS"
  );

/** ISO 8601 datetime string → Date. */
const isoDate = z.string().datetime({ message: "Must be a valid ISO 8601 datetime" });

/** Positive integer. */
const positiveInt = z.number().int().positive();

/** Pagination cursor (opaque base64url string). */
const cursor = z.string().base64url("Invalid pagination cursor").optional();

// ─── Common / pagination ──────────────────────────────────────────────────────

export const PaginationSchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : APP_CONFIG.PAGINATION.DEFAULT_LIMIT))
    .pipe(z.number().int().min(1).max(APP_CONFIG.PAGINATION.MAX_LIMIT)),
  cursor: cursor,
  direction: z.enum(["asc", "desc"]).optional().default("desc"),
});

export const SearchQuerySchema = z.object({
  q: requiredString("Search query", 200),
  limit: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 20))
    .pipe(z.number().int().min(1).max(50)),
});

export const WorkspaceIdParamSchema = z.object({
  workspaceId: requiredString("workspaceId", 64),
});

export const ChannelIdParamSchema = z.object({
  channelId: requiredString("channelId", 64),
});

export const MessageIdParamSchema = z.object({
  messageId: requiredString("messageId", 64),
});

export const UserIdParamSchema = z.object({
  userId: firebaseUid,
});

export const RoleIdParamSchema = z.object({
  roleId: requiredString("roleId", 64),
});

// ─── AUTH schemas ─────────────────────────────────────────────────────────────

export const RegisterSchema = z.object({
  email,
  password: strongPassword,
  displayName: requiredString("Display name", 64),
  workspaceName: requiredString("Workspace name", 80),
  industryType: z
    .enum([
      "technology",
      "fintech",
      "edtech",
      "healthtech",
      "ecommerce",
      "saas",
      "agency",
      "other",
    ])
    .optional()
    .default("other"),
  teamSize: z
    .enum(["1-5", "6-15", "16-50", "51-150", "150+"])
    .optional()
    .default("1-5"),
});

export const LoginSchema = z.object({
  email,
  password: z.string().min(1, "Password is required"),
  deviceId: z.string().max(128).optional(),
  rememberMe: z.boolean().optional().default(false),
});

export const ChangePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: strongPassword,
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const ForgotPasswordSchema = z.object({
  email,
});

export const ResetPasswordSchema = z
  .object({
    token: requiredString("Reset token", 256),
    newPassword: strongPassword,
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const MagicLinkSchema = z.object({
  email,
  redirectUrl: httpsUrl.optional(),
});

export const RefreshTokenSchema = z.object({
  refreshToken: requiredString("Refresh token", 512),
  deviceId: z.string().max(128).optional(),
});

export const RevokeSessionSchema = z.object({
  deviceId: requiredString("Device ID", 128),
});

// ─── WORKSPACE schemas ────────────────────────────────────────────────────────

export const CreateWorkspaceSchema = z.object({
  name: requiredString("Workspace name", 80),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9-]{3,40}$/, "Slug must be 3-40 lowercase alphanumeric characters or hyphens")
    .optional(),
  industryType: z
    .enum([
      "technology",
      "fintech",
      "edtech",
      "healthtech",
      "ecommerce",
      "saas",
      "agency",
      "other",
    ])
    .optional()
    .default("technology"),
  logoUrl: httpsUrl.optional(),
  description: optionalString(500),
  tier: z.enum(["gold", "premium", "deluxe"]).optional().default("gold"),
});

export const UpdateWorkspaceSchema = z
  .object({
    name: requiredString("Workspace name", 80).optional(),
    description: optionalString(500),
    logoUrl: httpsUrl.optional(),
    settings: z
      .object({
        defaultChannelId: z.string().optional(),
        allowGuestAccess: z.boolean().optional(),
        requireEmailVerification: z.boolean().optional(),
        maxFileUploadSizeMb: z.number().int().min(1).max(500).optional(),
        allowedFileTypes: z.array(z.string().max(20)).max(30).optional(),
        voiceRegion: z
          .enum(["ap-south-1", "ap-southeast-1", "eu-central-1"])
          .optional(),
        enableNotifications: z.boolean().optional(),
        retentionDays: z.number().int().min(30).max(365).optional(),
      })
      .optional(),
  })
  .refine((d) => Object.keys(d).length > 0, {
    message: "At least one field must be provided for update",
  });

export const InviteMembersSchema = z.object({
  emails: z
    .array(email)
    .min(1, "At least one email is required")
    .max(50, "Cannot invite more than 50 members at once"),
  roleId: requiredString("Role ID", 64),
  message: optionalString(300),
  expiresInDays: z.number().int().min(1).max(30).optional().default(7),
});

export const AcceptInviteSchema = z.object({
  inviteToken: requiredString("Invite token", 512),
});

export const UpdateMemberRoleSchema = z.object({
  roleId: requiredString("Role ID", 64),
});

export const RemoveMemberSchema = z.object({
  reason: optionalString(300),
  transferOwnershipTo: firebaseUid.optional(),
});

export const TransferOwnershipSchema = z.object({
  newOwnerId: firebaseUid,
  confirmationPassword: z.string().min(1, "Password confirmation is required"),
});

// ─── CHANNEL schemas ──────────────────────────────────────────────────────────

const ChannelType = z.enum(["text", "voice", "announcement", "forum"]);
const ChannelVisibility = z.enum(["public", "private", "secret"]);

export const CreateChannelSchema = z.object({
  name: z
    .string()
    .trim()
    .toLowerCase()
    .regex(
      /^[a-z0-9-_]{1,80}$/,
      "Channel name must be lowercase alphanumeric with hyphens/underscores"
    ),
  type: ChannelType.optional().default("text"),
  visibility: ChannelVisibility.optional().default("public"),
  description: optionalString(300),
  categoryId: z.string().max(64).optional(),
  allowedRoles: z.array(z.string().max(64)).max(20).optional().default([]),
  slowMode: z.number().int().min(0).max(21600).optional().default(0), // seconds
  topic: optionalString(200),
  isDefault: z.boolean().optional().default(false),
});

export const UpdateChannelSchema = z
  .object({
    name: z
      .string()
      .trim()
      .toLowerCase()
      .regex(/^[a-z0-9-_]{1,80}$/)
      .optional(),
    description: optionalString(300),
    visibility: ChannelVisibility.optional(),
    allowedRoles: z.array(z.string().max(64)).max(20).optional(),
    slowMode: z.number().int().min(0).max(21600).optional(),
    topic: optionalString(200),
    isArchived: z.boolean().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, {
    message: "At least one field must be provided for update",
  });

export const ReorderChannelsSchema = z.object({
  orderedIds: z
    .array(z.string().max(64))
    .min(1, "At least one channel ID is required")
    .max(200),
});

export const CreateCategorySchema = z.object({
  name: requiredString("Category name", 80),
  position: z.number().int().min(0).optional().default(0),
});

export const UpdateChannelPermissionsSchema = z.object({
  roleId: requiredString("Role ID", 64),
  permissions: z.object({
    viewChannel: z.boolean().optional(),
    sendMessages: z.boolean().optional(),
    manageMessages: z.boolean().optional(),
    manageChannel: z.boolean().optional(),
    joinVoice: z.boolean().optional(),
    muteMembers: z.boolean().optional(),
    moveMembers: z.boolean().optional(),
    useSlashCommands: z.boolean().optional(),
  }),
});

// ─── MESSAGE schemas ──────────────────────────────────────────────────────────

/** Mention item inside a message. */
const MentionSchema = z.object({
  type: z.enum(["user", "role", "channel", "everyone", "here"]),
  targetId: z.string().max(128),
  displayName: z.string().max(100),
});

/** Single attachment reference (after S3 upload completes). */
const AttachmentSchema = z.object({
  fileKey: requiredString("File key", 512),
  fileName: requiredString("File name", 255),
  mimeType: requiredString("MIME type", 100),
  sizeBytes: positiveInt,
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
});

export const SendMessageSchema = z.object({
  content: z
    .string()
    .trim()
    .max(APP_CONFIG.LIMITS.MESSAGE_MAX_LENGTH, "Message is too long")
    .optional(),
  attachments: z.array(AttachmentSchema).max(10).optional().default([]),
  mentions: z.array(MentionSchema).max(50).optional().default([]),
  replyToId: z.string().max(64).optional(),
  nonce: z.string().max(64).optional(), // Client dedup key
}).refine(
  (d) => (d.content && d.content.length > 0) || (d.attachments && d.attachments.length > 0),
  { message: "Message must have content or at least one attachment" }
);

export const EditMessageSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, "Edited content cannot be empty")
    .max(APP_CONFIG.LIMITS.MESSAGE_MAX_LENGTH, "Message is too long"),
});

export const AddReactionSchema = z.object({
  emoji: z
    .string()
    .trim()
    .min(1, "Emoji is required")
    .max(8, "Emoji string is too long"),
});

export const PinMessageSchema = z.object({
  reason: optionalString(200),
});

export const BulkDeleteMessagesSchema = z.object({
  messageIds: z
    .array(z.string().max(64))
    .min(1, "At least one message ID is required")
    .max(100, "Cannot bulk delete more than 100 messages at once"),
});

export const MessageSearchSchema = z.object({
  q: requiredString("Search query", 200),
  channelId: z.string().max(64).optional(),
  fromUserId: firebaseUid.optional(),
  hasAttachments: z
    .string()
    .optional()
    .transform((v) => v === "true"),
  before: isoDate.optional(),
  after: isoDate.optional(),
  limit: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 25))
    .pipe(z.number().int().min(1).max(50)),
});

// ─── VOICE schemas ────────────────────────────────────────────────────────────

export const JoinVoiceSchema = z.object({
  channelId: requiredString("Channel ID", 64),
  workspaceId: requiredString("Workspace ID", 64),
  audioInputDeviceId: z.string().max(128).optional(),
  videoEnabled: z.boolean().optional().default(false),
  noiseSuppressionEnabled: z.boolean().optional().default(true),
});

export const LeaveVoiceSchema = z.object({
  meetingId: requiredString("Meeting ID", 128),
  attendeeId: requiredString("Attendee ID", 128),
  reason: z.enum(["user_left", "kicked", "disconnected", "timeout"]).optional().default("user_left"),
});

export const MuteParticipantSchema = z.object({
  targetUserId: firebaseUid,
  muted: z.boolean(),
});

export const KickParticipantSchema = z.object({
  targetUserId: firebaseUid,
  reason: optionalString(200),
  banFromChannel: z.boolean().optional().default(false),
});

export const StartScreenShareSchema = z.object({
  meetingId: requiredString("Meeting ID", 128),
  sourceType: z.enum(["screen", "window", "tab"]).optional().default("screen"),
});

export const UpdateVoiceSettingsSchema = z.object({
  noiseSuppressionEnabled: z.boolean().optional(),
  echoCancel: z.boolean().optional(),
  gainControl: z.boolean().optional(),
  pushToTalkEnabled: z.boolean().optional(),
  pushToTalkKey: z.string().max(20).optional(),
  outputVolume: z.number().min(0).max(200).optional(),
  inputGain: z.number().min(0).max(200).optional(),
});

// ─── FILE schemas ─────────────────────────────────────────────────────────────

const AllowedMimeTypes = z.string().refine(
  (mime) => {
    const blocked = ["application/x-msdownload", "application/x-executable"];
    return !blocked.includes(mime);
  },
  { message: "This file type is not permitted" }
);

export const RequestUploadUrlSchema = z.object({
  fileName: requiredString("File name", 255),
  mimeType: AllowedMimeTypes,
  sizeBytes: positiveInt.max(
    500 * 1024 * 1024, // 500 MB hard cap; tier limits enforced server-side
    "File size exceeds maximum allowed"
  ),
  channelId: z.string().max(64).optional(),
  isPublic: z.boolean().optional().default(false),
});

export const DeleteFileSchema = z.object({
  fileKey: requiredString("File key", 512),
  reason: optionalString(200),
});

export const FileSearchSchema = z.object({
  q: z.string().trim().max(200).optional(),
  mimeType: z.string().max(100).optional(),
  channelId: z.string().max(64).optional(),
  uploadedBy: firebaseUid.optional(),
  after: isoDate.optional(),
  before: isoDate.optional(),
  limit: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 20))
    .pipe(z.number().int().min(1).max(50)),
  cursor,
});

// ─── BILLING schemas ──────────────────────────────────────────────────────────

export const SelectPlanSchema = z.object({
  tier: z.enum(["gold", "premium", "deluxe"]),
  billingCycle: z.enum(["monthly", "annual"]).optional().default("monthly"),
  couponCode: z.string().trim().max(50).optional(),
});

export const RazorpayWebhookSchema = z.object({
  entity: z.string(),
  account_id: z.string().optional(),
  event: z.string().min(1),
  contains: z.array(z.string()),
  payload: z.record(z.unknown()),
  created_at: z.number(),
});

export const ApplyCouponSchema = z.object({
  code: requiredString("Coupon code", 50),
  tier: z.enum(["gold", "premium", "deluxe"]),
});

// ─── ADMIN / ROLE schemas ─────────────────────────────────────────────────────

const PermissionsObject = z.object({
  manage_workspace: z.boolean().optional(),
  manage_roles: z.boolean().optional(),
  manage_channels: z.boolean().optional(),
  manage_members: z.boolean().optional(),
  manage_billing: z.boolean().optional(),
  create_channels: z.boolean().optional(),
  delete_channels: z.boolean().optional(),
  send_messages: z.boolean().optional(),
  delete_messages: z.boolean().optional(),
  pin_messages: z.boolean().optional(),
  mention_everyone: z.boolean().optional(),
  join_voice: z.boolean().optional(),
  mute_members: z.boolean().optional(),
  kick_members: z.boolean().optional(),
  deafen_members: z.boolean().optional(),
  upload_files: z.boolean().optional(),
  download_files: z.boolean().optional(),
  delete_files: z.boolean().optional(),
  ban_members: z.boolean().optional(),
  view_audit_log: z.boolean().optional(),
  manage_invites: z.boolean().optional(),
});

export const CreateRoleSchema = z.object({
  name: requiredString("Role name", 64),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Color must be a valid hex code")
    .optional()
    .default("#99AAB5"),
  permissions: PermissionsObject.optional().default({}),
  isHoisted: z.boolean().optional().default(false), // Show separately in member list
  isMentionable: z.boolean().optional().default(true),
  position: z.number().int().min(0).optional(),
});

export const UpdateRoleSchema = z
  .object({
    name: requiredString("Role name", 64).optional(),
    color: z
      .string()
      .regex(/^#[0-9A-Fa-f]{6}$/)
      .optional(),
    permissions: PermissionsObject.optional(),
    isHoisted: z.boolean().optional(),
    isMentionable: z.boolean().optional(),
    position: z.number().int().min(0).optional(),
  })
  .refine((d) => Object.keys(d).length > 0, {
    message: "At least one field must be provided for update",
  });

export const AssignRoleSchema = z.object({
  userId: firebaseUid,
  roleId: requiredString("Role ID", 64),
});

export const BanMemberSchema = z.object({
  userId: firebaseUid,
  reason: optionalString(300),
  deleteMessagesDays: z.number().int().min(0).max(7).optional().default(0),
  isPermanent: z.boolean().optional().default(true),
  expiresAt: isoDate.optional(),
});

export const UnbanMemberSchema = z.object({
  userId: firebaseUid,
  reason: optionalString(200),
});

export const UpdatePresenceSchema = z.object({
  status: z.enum(["online", "away", "busy", "offline", "invisible"]),
  customStatus: optionalString(128),
  clearAfter: isoDate.optional(),
});

// ─── Exported type helpers ────────────────────────────────────────────────────

export type RegisterInput = z.infer<typeof RegisterSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type ChangePasswordInput = z.infer<typeof ChangePasswordSchema>;
export type CreateWorkspaceInput = z.infer<typeof CreateWorkspaceSchema>;
export type UpdateWorkspaceInput = z.infer<typeof UpdateWorkspaceSchema>;
export type InviteMembersInput = z.infer<typeof InviteMembersSchema>;
export type CreateChannelInput = z.infer<typeof CreateChannelSchema>;
export type UpdateChannelInput = z.infer<typeof UpdateChannelSchema>;
export type SendMessageInput = z.infer<typeof SendMessageSchema>;
export type EditMessageInput = z.infer<typeof EditMessageSchema>;
export type JoinVoiceInput = z.infer<typeof JoinVoiceSchema>;
export type LeaveVoiceInput = z.infer<typeof LeaveVoiceSchema>;
export type RequestUploadUrlInput = z.infer<typeof RequestUploadUrlSchema>;
export type SelectPlanInput = z.infer<typeof SelectPlanSchema>;
export type CreateRoleInput = z.infer<typeof CreateRoleSchema>;
export type UpdateRoleInput = z.infer<typeof UpdateRoleSchema>;
export type UpdatePresenceInput = z.infer<typeof UpdatePresenceSchema>;

// ─── Validation middleware factory ────────────────────────────────────────────

type RequestPart = "body" | "params" | "query";

interface ValidateOptions {
  /** Which part of the request to validate. Defaults to "body". */
  part?: RequestPart;
  /**
   * If true, strip unknown keys from the parsed result (default: true).
   * Set to false only when you need to pass-through unknown fields.
   */
  stripUnknown?: boolean;
}

/**
 * Creates an Express middleware that validates the specified part of the
 * request against the given Zod schema.
 *
 * On success  → attaches `req.validated` (typed) and calls `next()`.
 * On failure  → responds with HTTP 422 and a structured error payload.
 *
 * @example
 * router.post("/join", requireAuth(), validate(JoinVoiceSchema), voiceController.join);
 */
export function validate<T extends ZodSchema>(
  schema: T,
  options: ValidateOptions = {}
) {
  const { part = "body", stripUnknown = true } = options;

  return (req: Request, res: Response, next: NextFunction): void => {
    const raw = req[part];

    const parseResult = schema.safeParse(raw);

    if (!parseResult.success) {
      const errors = formatZodErrors(parseResult.error);

      res.status(HTTP_STATUS.UNPROCESSABLE_ENTITY).json(
        errorResponse("Validation failed", ERROR_CODES.VALIDATION_ERROR, {
          fields: errors,
        })
      );
      return;
    }

    // Attach typed result; strip unknown keys when requested
    const data = stripUnknown
      ? (schema as ZodSchema).parse(raw) // parse() always strips with z.object()
      : parseResult.data;

    (req as any).validated = data;

    next();
  };
}

/**
 * Validates multiple parts of the request in one middleware call.
 *
 * @example
 * router.get(
 *   "/:workspaceId/messages",
 *   requireAuth(),
 *   validateAll({ params: WorkspaceIdParamSchema, query: PaginationSchema }),
 *   messageController.list
 * );
 */
export function validateAll(schemas: Partial<Record<RequestPart, ZodSchema>>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const allErrors: Record<string, string[]> = {};

    for (const [part, schema] of Object.entries(schemas) as [
      RequestPart,
      ZodSchema
    ][]) {
      const result = schema.safeParse(req[part]);
      if (!result.success) {
        const fieldErrors = formatZodErrors(result.error);
        Object.assign(allErrors, fieldErrors);
      } else {
        // Attach validated data under req.validated[part]
        if (!(req as any).validated) (req as any).validated = {};
        (req as any).validated[part] = result.data;
      }
    }

    if (Object.keys(allErrors).length > 0) {
      res.status(HTTP_STATUS.UNPROCESSABLE_ENTITY).json(
        errorResponse("Validation failed", ERROR_CODES.VALIDATION_ERROR, {
          fields: allErrors,
        })
      );
      return;
    }

    next();
  };
}

// ─── Zod error formatter ──────────────────────────────────────────────────────

/**
 * Converts a ZodError into a flat `{ fieldPath: [messages] }` map
 * suitable for client-side form error rendering.
 */
export function formatZodErrors(
  error: ZodError
): Record<string, string[]> {
  const result: Record<string, string[]> = {};

  for (const issue of error.issues) {
    const path = issue.path.length > 0 ? issue.path.join(".") : "_root";
    if (!result[path]) result[path] = [];
    result[path].push(issue.message);
  }

  return result;
}

/**
 * Standalone parse helper — throws a formatted error string if invalid.
 * Useful in service/repository layers where middleware isn't available.
 *
 * @returns Typed, parsed data.
 * @throws Error with a human-readable message listing all field errors.
 */
export function parseOrThrow<T extends ZodSchema>(
  schema: T,
  data: unknown
): z.infer<T> {
  const result = schema.safeParse(data);
  if (!result.success) {
    const errors = formatZodErrors(result.error);
    const summary = Object.entries(errors)
      .map(([field, msgs]) => `${field}: ${msgs.join(", ")}`)
      .join("; ");
    throw new Error(`Validation error — ${summary}`);
  }
  return result.data;
}
