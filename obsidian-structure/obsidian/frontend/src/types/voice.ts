/**
 * frontend/src/types/voice.ts
 * Project: Obsidian
 */

// ─── Enums ────────────────────────────────────────────────────────────────────

export type VoiceConnectionStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "disconnected"
  | "failed";

export type VoiceSessionStatus = "active" | "idle" | "ended";

export type ConnectionQuality = "excellent" | "good" | "fair" | "poor" | "unknown";

// ─── Participant ──────────────────────────────────────────────────────────────

export interface VoiceParticipant {
  uid: string;
  displayName: string;
  avatarUrl?: string;
  attendeeId: string;
  isMuted: boolean;
  isSpeaking: boolean;
  isDeafened: boolean;
  isScreenSharing: boolean;
  volume?: number;
  joinedAt: string;
}

// ─── Session ──────────────────────────────────────────────────────────────────

export interface VoiceSessionInfo {
  sessionId: string;
  channelId: string;
  workspaceId: string;
  chimeMeetingId: string;
  meetingId: string;
  attendeeId: string;
  joinToken: string;
  mediaRegion: string;
  mediaPlacement: ChimeMediaPlacement;
}

export interface ChimeMediaPlacement {
  AudioHostUrl: string;
  AudioFallbackUrl: string;
  ScreenDataUrl: string;
  ScreenSharingUrl: string;
  ScreenViewingUrl: string;
  SignalingUrl: string;
  TurnControlUrl: string;
  EventIngestionUrl: string;
}

// ─── Quality stats ────────────────────────────────────────────────────────────

export interface VoiceQualityStats {
  packetLossPercent: number;
  jitterMs: number;
  roundTripTimeMs: number;
  audioLevel: number;
  quality: ConnectionQuality;
}

// ─── Audio devices ────────────────────────────────────────────────────────────

export interface AudioDevice {
  deviceId: string;
  label: string;
  kind: "audioinput" | "audiooutput";
}

// ─── Voice settings ───────────────────────────────────────────────────────────

export interface VoiceSettings {
  inputDeviceId?: string;
  outputDeviceId?: string;
  noiseSuppressionEnabled: boolean;
  echoCancellation: boolean;
  gainControl: boolean;
  pushToTalkEnabled: boolean;
  pushToTalkKey?: string;
  outputVolume: number;
  inputGain: number;
}

// ─── DTOs ─────────────────────────────────────────────────────────────────────

export interface JoinVoicePayload {
  channelId: string;
  workspaceId: string;
  audioInputDeviceId?: string;
  videoEnabled?: boolean;
  noiseSuppressionEnabled?: boolean;
}

export interface JoinVoiceResponse {
  meetingId: string;
  attendeeId: string;
  joinToken: string;
  mediaRegion: string;
  mediaPlacement: ChimeMediaPlacement;
}

export interface LeaveVoicePayload {
  meetingId: string;
  attendeeId: string;
}

export interface MuteParticipantPayload {
  channelId: string;
  targetUid: string;
  isMuted: boolean;
}

export interface KickParticipantPayload {
  channelId: string;
  targetUid: string;
  reason?: string;
}

export interface UpdateParticipantStatePayload {
  isMuted?: boolean;
  isDeafened?: boolean;
  isSpeaking?: boolean;
}
