/**
 * backend/schemas/voice.schema.ts
 * Project: Obsidian
 *
 * Zod validation schemas for all voice-related request bodies.
 * Covers session join/leave, participant mute/kick, screen sharing,
 * quality stats reporting, and session query parameters.
 */
import { z } from "zod";
export declare const VoiceSessionStatusEnum: z.ZodEnum<["active", "idle", "ended"]>;
export declare const ParticipantStatusEnum: z.ZodEnum<["connected", "connecting", "disconnected", "kicked"]>;
export declare const VoiceQualityEnum: z.ZodEnum<["standard", "high-fi", "spatial"]>;
export declare const ConnectionQualityEnum: z.ZodEnum<["good", "fair", "poor"]>;
export declare const JoinVoiceSchema: z.ZodObject<{
    workspaceId: z.ZodString;
    channelId: z.ZodString;
    userId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    workspaceId: string;
    channelId: string;
    userId: string;
}, {
    workspaceId: string;
    channelId: string;
    userId: string;
}>;
export type JoinVoiceInput = z.infer<typeof JoinVoiceSchema>;
export declare const LeaveVoiceSchema: z.ZodObject<{
    workspaceId: z.ZodString;
    channelId: z.ZodString;
    userId: z.ZodString;
    sessionId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    workspaceId: string;
    channelId: string;
    userId: string;
    sessionId: string;
}, {
    workspaceId: string;
    channelId: string;
    userId: string;
    sessionId: string;
}>;
export type LeaveVoiceInput = z.infer<typeof LeaveVoiceSchema>;
export declare const MuteParticipantSchema: z.ZodObject<{
    targetUid: z.ZodString;
    channelId: z.ZodString;
    workspaceId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    workspaceId: string;
    channelId: string;
    targetUid: string;
}, {
    workspaceId: string;
    channelId: string;
    targetUid: string;
}>;
export type MuteParticipantInput = z.infer<typeof MuteParticipantSchema>;
export declare const KickParticipantSchema: z.ZodObject<{
    targetUid: z.ZodString;
    channelId: z.ZodString;
    workspaceId: z.ZodString;
    reason: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    workspaceId: string;
    channelId: string;
    targetUid: string;
    reason?: string | undefined;
}, {
    workspaceId: string;
    channelId: string;
    targetUid: string;
    reason?: string | undefined;
}>;
export type KickParticipantInput = z.infer<typeof KickParticipantSchema>;
export declare const UpdateParticipantStateSchema: z.ZodEffects<z.ZodObject<{
    isMuted: z.ZodOptional<z.ZodBoolean>;
    isDeafened: z.ZodOptional<z.ZodBoolean>;
    isScreenSharing: z.ZodOptional<z.ZodBoolean>;
    isSpeaking: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    isMuted?: boolean | undefined;
    isDeafened?: boolean | undefined;
    isScreenSharing?: boolean | undefined;
    isSpeaking?: boolean | undefined;
}, {
    isMuted?: boolean | undefined;
    isDeafened?: boolean | undefined;
    isScreenSharing?: boolean | undefined;
    isSpeaking?: boolean | undefined;
}>, {
    isMuted?: boolean | undefined;
    isDeafened?: boolean | undefined;
    isScreenSharing?: boolean | undefined;
    isSpeaking?: boolean | undefined;
}, {
    isMuted?: boolean | undefined;
    isDeafened?: boolean | undefined;
    isScreenSharing?: boolean | undefined;
    isSpeaking?: boolean | undefined;
}>;
export type UpdateParticipantStateInput = z.infer<typeof UpdateParticipantStateSchema>;
export declare const StartScreenShareSchema: z.ZodObject<{
    channelId: z.ZodString;
    workspaceId: z.ZodString;
    sessionId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    workspaceId: string;
    channelId: string;
    sessionId: string;
}, {
    workspaceId: string;
    channelId: string;
    sessionId: string;
}>;
export type StartScreenShareInput = z.infer<typeof StartScreenShareSchema>;
export declare const EndScreenShareSchema: z.ZodObject<{
    channelId: z.ZodString;
    workspaceId: z.ZodString;
    sessionId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    workspaceId: string;
    channelId: string;
    sessionId: string;
}, {
    workspaceId: string;
    channelId: string;
    sessionId: string;
}>;
export type EndScreenShareInput = z.infer<typeof EndScreenShareSchema>;
export declare const VoiceQualityStatsSchema: z.ZodObject<{
    sessionId: z.ZodString;
    audioPacketLoss: z.ZodNumber;
    audioLatencyMs: z.ZodNumber;
    connectionQuality: z.ZodEnum<["good", "fair", "poor"]>;
}, "strip", z.ZodTypeAny, {
    sessionId: string;
    audioPacketLoss: number;
    audioLatencyMs: number;
    connectionQuality: "good" | "fair" | "poor";
}, {
    sessionId: string;
    audioPacketLoss: number;
    audioLatencyMs: number;
    connectionQuality: "good" | "fair" | "poor";
}>;
export type VoiceQualityStatsInput = z.infer<typeof VoiceQualityStatsSchema>;
export declare const EndVoiceSessionSchema: z.ZodObject<{
    sessionId: z.ZodString;
    channelId: z.ZodString;
    workspaceId: z.ZodString;
    reason: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    workspaceId: string;
    channelId: string;
    sessionId: string;
    reason?: string | undefined;
}, {
    workspaceId: string;
    channelId: string;
    sessionId: string;
    reason?: string | undefined;
}>;
export type EndVoiceSessionInput = z.infer<typeof EndVoiceSessionSchema>;
export declare const GetVoiceSessionQuerySchema: z.ZodObject<{
    includeEnded: z.ZodEffects<z.ZodOptional<z.ZodString>, boolean, string | undefined>;
}, "strip", z.ZodTypeAny, {
    includeEnded: boolean;
}, {
    includeEnded?: string | undefined;
}>;
export type GetVoiceSessionQueryInput = z.infer<typeof GetVoiceSessionQuerySchema>;
export declare const ListVoiceSessionsQuerySchema: z.ZodObject<{
    status: z.ZodOptional<z.ZodEnum<["active", "idle", "ended"]>>;
    limit: z.ZodPipeline<z.ZodEffects<z.ZodOptional<z.ZodString>, number, string | undefined>, z.ZodNumber>;
    cursor: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    cursor?: string | undefined;
    status?: "active" | "idle" | "ended" | undefined;
}, {
    limit?: string | undefined;
    cursor?: string | undefined;
    status?: "active" | "idle" | "ended" | undefined;
}>;
export type ListVoiceSessionsQueryInput = z.infer<typeof ListVoiceSessionsQuerySchema>;
export declare const VoiceHeartbeatSchema: z.ZodObject<{
    sessionId: z.ZodString;
    channelId: z.ZodString;
    workspaceId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    workspaceId: string;
    channelId: string;
    sessionId: string;
}, {
    workspaceId: string;
    channelId: string;
    sessionId: string;
}>;
export type VoiceHeartbeatInput = z.infer<typeof VoiceHeartbeatSchema>;
//# sourceMappingURL=voice.schema.d.ts.map