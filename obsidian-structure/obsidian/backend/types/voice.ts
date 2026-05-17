import { FirestoreTimestamps } from "./common";

// ─── Voice Session ────────────────────────────────────────────────────────────

export type VoiceSessionStatus = "active" | "idle" | "ended";

export interface VoiceSession extends FirestoreTimestamps {
  sessionId: string;
  channelId: string;
  workspaceId: string;
  status: VoiceSessionStatus;

  // Amazon Chime meeting details
  chimeMeetingId: string;
  externalMeetingId: string;
  mediaRegion: string;
  mediaPlacement: ChimeMediaPlacement;

  // Participants
  participants: VoiceParticipant[];
  maxParticipants: number;

  // Lifecycle
  startedAt: FirebaseFirestore.Timestamp;
  endedAt?: FirebaseFirestore.Timestamp;
  lastActivityAt: FirebaseFirestore.Timestamp;
  idleTimeoutAt?: FirebaseFirestore.Timestamp;
}

// ─── Chime Media Placement ────────────────────────────────────────────────────

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

// ─── Voice Participant ────────────────────────────────────────────────────────

export type ParticipantStatus = "connected" | "connecting" | "disconnected" | "kicked";

export interface VoiceParticipant {
  uid: string;
  displayName: string;
  avatarUrl?: string;
  roleId: string;

  // Chime attendee details
  chimeAttendeeId: string;
  externalUserId: string;
  joinToken: string;                    // used by client to connect to Chime

  // State
  status: ParticipantStatus;
  isMuted: boolean;
  isDeafened: boolean;
  isSpeaking: boolean;
  isScreenSharing: boolean;

  // Timestamps
  joinedAt: FirebaseFirestore.Timestamp;
  leftAt?: FirebaseFirestore.Timestamp;
}

// ─── Voice Presence ───────────────────────────────────────────────────────────

// Lightweight doc updated in realtime for UI indicators
export interface VoicePresence {
  channelId: string;
  workspaceId: string;
  activeParticipantUids: string[];
  participantCount: number;
  updatedAt: FirebaseFirestore.Timestamp;
}

// ─── Screen Share ─────────────────────────────────────────────────────────────

export interface ScreenShareSession {
  sessionId: string;
  channelId: string;
  workspaceId: string;
  sharerUid: string;
  sharerName: string;
  startedAt: FirebaseFirestore.Timestamp;
  endedAt?: FirebaseFirestore.Timestamp;
}

// ─── Voice Quality ────────────────────────────────────────────────────────────

export type VoiceQuality = "standard" | "high-fi" | "spatial";

export interface VoiceQualityStats {
  uid: string;
  sessionId: string;
  audioPacketLoss: number;             // percentage
  audioLatencyMs: number;
  connectionQuality: "good" | "fair" | "poor";
  timestamp: FirebaseFirestore.Timestamp;
}

// ─── Request / Response DTOs ──────────────────────────────────────────────────

export interface JoinVoiceDto {
  workspaceId: string;
  channelId: string;
  userId: string;
}

export interface LeaveVoiceDto {
  workspaceId: string;
  channelId: string;
  userId: string;
  sessionId: string;
}

export interface MuteParticipantDto {
  targetUid: string;                   // uid of participant to mute
  channelId: string;
  workspaceId: string;
}

export interface KickParticipantDto {
  targetUid: string;
  channelId: string;
  workspaceId: string;
  reason?: string;
}

export interface JoinVoiceResponseDto {
  sessionId: string;
  meetingId: string;
  attendeeId: string;
  joinToken: string;
  mediaRegion: string;
  mediaPlacement: ChimeMediaPlacement;
  participants: Omit<VoiceParticipant, "joinToken">[];  // never expose others' tokens
}

export interface VoiceSessionSummaryDto {
  sessionId: string;
  channelId: string;
  workspaceId: string;
  status: VoiceSessionStatus;
  participantCount: number;
  participants: Omit<VoiceParticipant, "joinToken" | "chimeAttendeeId" | "externalUserId">[];
  startedAt: FirebaseFirestore.Timestamp;
  mediaRegion: string;
}
