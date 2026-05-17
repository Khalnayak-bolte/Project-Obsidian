/**
 * backend/schemas/voice.schema.ts
 * Project: Obsidian
 *
 * Zod validation schemas for all voice-related request bodies.
 * Covers session join/leave, participant mute/kick, screen sharing,
 * quality stats reporting, and session query parameters.
 */

import { z } from "zod";

// ─── Shared enums ─────────────────────────────────────────────────────────────

export const VoiceSessionStatusEnum = z.enum(["active", "idle", "ended"], {
  errorMap: () => ({
    message: "Session status must be one of: active, idle, ended.",
  }),
});

export const ParticipantStatusEnum = z.enum(
  ["connected", "connecting", "disconnected", "kicked"],
  {
    errorMap: () => ({
      message:
        "Participant status must be one of: connected, connecting, disconnected, kicked.",
    }),
  }
);

export const VoiceQualityEnum = z.enum(["standard", "high-fi", "spatial"], {
  errorMap: () => ({
    message: "Voice quality must be one of: standard, high-fi, spatial.",
  }),
});

export const ConnectionQualityEnum = z.enum(["good", "fair", "poor"], {
  errorMap: () => ({
    message: "Connection quality must be one of: good, fair, poor.",
  }),
});

// ─── Shared field definitions ─────────────────────────────────────────────────

const workspaceIdField = z
  .string({ required_error: "Workspace ID is required." })
  .trim()
  .min(1, "Workspace ID must not be empty.")
  .max(64, "Workspace ID must not exceed 64 characters.");

const channelIdField = z
  .string({ required_error: "Channel ID is required." })
  .trim()
  .min(1, "Channel ID must not be empty.")
  .max(64, "Channel ID must not exceed 64 characters.");

const sessionIdField = z
  .string({ required_error: "Session ID is required." })
  .trim()
  .min(1, "Session ID must not be empty.")
  .max(128, "Session ID must not exceed 128 characters.");

const targetUidField = z
  .string({ required_error: "Target user ID is required." })
  .trim()
  .min(1, "Target user ID must not be empty.")
  .max(128, "Target user ID must not exceed 128 characters.");

// ─── Join Voice ───────────────────────────────────────────────────────────────

export const JoinVoiceSchema = z.object({
  workspaceId: workspaceIdField,
  channelId: channelIdField,
  userId: z
    .string({ required_error: "User ID is required." })
    .trim()
    .min(1, "User ID must not be empty.")
    .max(128, "User ID must not exceed 128 characters."),
});

export type JoinVoiceInput = z.infer<typeof JoinVoiceSchema>;

// ─── Leave Voice ──────────────────────────────────────────────────────────────

export const LeaveVoiceSchema = z.object({
  workspaceId: workspaceIdField,
  channelId: channelIdField,
  userId: z
    .string({ required_error: "User ID is required." })
    .trim()
    .min(1, "User ID must not be empty.")
    .max(128, "User ID must not exceed 128 characters."),
  sessionId: sessionIdField,
});

export type LeaveVoiceInput = z.infer<typeof LeaveVoiceSchema>;

// ─── Mute Participant ─────────────────────────────────────────────────────────

export const MuteParticipantSchema = z.object({
  targetUid: targetUidField,
  channelId: channelIdField,
  workspaceId: workspaceIdField,
});

export type MuteParticipantInput = z.infer<typeof MuteParticipantSchema>;

// ─── Kick Participant ─────────────────────────────────────────────────────────

export const KickParticipantSchema = z.object({
  targetUid: targetUidField,
  channelId: channelIdField,
  workspaceId: workspaceIdField,
  reason: z
    .string()
    .trim()
    .max(256, "Reason must not exceed 256 characters.")
    .optional(),
});

export type KickParticipantInput = z.infer<typeof KickParticipantSchema>;

// ─── Update Own Participant State ─────────────────────────────────────────────
// Client-driven state updates (mute, deafen, screen share toggle)

export const UpdateParticipantStateSchema = z
  .object({
    isMuted: z.boolean().optional(),
    isDeafened: z.boolean().optional(),
    isScreenSharing: z.boolean().optional(),
    isSpeaking: z.boolean().optional(),
  })
  .refine(
    (data) =>
      data.isMuted !== undefined ||
      data.isDeafened !== undefined ||
      data.isScreenSharing !== undefined ||
      data.isSpeaking !== undefined,
    { message: "At least one participant state field must be provided." }
  );

export type UpdateParticipantStateInput = z.infer<
  typeof UpdateParticipantStateSchema
>;

// ─── Start Screen Share ───────────────────────────────────────────────────────

export const StartScreenShareSchema = z.object({
  channelId: channelIdField,
  workspaceId: workspaceIdField,
  sessionId: sessionIdField,
});

export type StartScreenShareInput = z.infer<typeof StartScreenShareSchema>;

// ─── End Screen Share ─────────────────────────────────────────────────────────

export const EndScreenShareSchema = z.object({
  channelId: channelIdField,
  workspaceId: workspaceIdField,
  sessionId: sessionIdField,
});

export type EndScreenShareInput = z.infer<typeof EndScreenShareSchema>;

// ─── Report Voice Quality Stats ───────────────────────────────────────────────

export const VoiceQualityStatsSchema = z.object({
  sessionId: sessionIdField,
  audioPacketLoss: z
    .number({ required_error: "Audio packet loss is required." })
    .min(0, "Packet loss must be at least 0%.")
    .max(100, "Packet loss must not exceed 100%."),
  audioLatencyMs: z
    .number({ required_error: "Audio latency is required." })
    .int("Audio latency must be a whole number.")
    .min(0, "Audio latency must be a non-negative value.")
    .max(30000, "Audio latency must not exceed 30,000 ms."),
  connectionQuality: ConnectionQualityEnum,
});

export type VoiceQualityStatsInput = z.infer<typeof VoiceQualityStatsSchema>;

// ─── End Voice Session (admin / owner) ───────────────────────────────────────

export const EndVoiceSessionSchema = z.object({
  sessionId: sessionIdField,
  channelId: channelIdField,
  workspaceId: workspaceIdField,
  reason: z
    .string()
    .trim()
    .max(256, "Reason must not exceed 256 characters.")
    .optional(),
});

export type EndVoiceSessionInput = z.infer<typeof EndVoiceSessionSchema>;

// ─── Get Voice Session Query ──────────────────────────────────────────────────

export const GetVoiceSessionQuerySchema = z.object({
  includeEnded: z
    .string()
    .optional()
    .transform((v) => v === "true"),
});

export type GetVoiceSessionQueryInput = z.infer<typeof GetVoiceSessionQuerySchema>;

// ─── List Voice Sessions Query ────────────────────────────────────────────────

export const ListVoiceSessionsQuerySchema = z.object({
  status: VoiceSessionStatusEnum.optional(),
  limit: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 20))
    .pipe(
      z
        .number()
        .int()
        .min(1, "Limit must be at least 1.")
        .max(100, "Limit must not exceed 100.")
    ),
  cursor: z.string().trim().optional(),
});

export type ListVoiceSessionsQueryInput = z.infer<
  typeof ListVoiceSessionsQuerySchema
>;

// ─── Heartbeat (keep session alive) ──────────────────────────────────────────

export const VoiceHeartbeatSchema = z.object({
  sessionId: sessionIdField,
  channelId: channelIdField,
  workspaceId: workspaceIdField,
});

export type VoiceHeartbeatInput = z.infer<typeof VoiceHeartbeatSchema>;
