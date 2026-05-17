import { FirestoreTimestamps } from "./common";
export type VoiceSessionStatus = "active" | "idle" | "ended";
export interface VoiceSession extends FirestoreTimestamps {
    sessionId: string;
    channelId: string;
    workspaceId: string;
    status: VoiceSessionStatus;
    chimeMeetingId: string;
    externalMeetingId: string;
    mediaRegion: string;
    mediaPlacement: ChimeMediaPlacement;
    participants: VoiceParticipant[];
    maxParticipants: number;
    startedAt: FirebaseFirestore.Timestamp;
    endedAt?: FirebaseFirestore.Timestamp;
    lastActivityAt: FirebaseFirestore.Timestamp;
    idleTimeoutAt?: FirebaseFirestore.Timestamp;
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
export type ParticipantStatus = "connected" | "connecting" | "disconnected" | "kicked";
export interface VoiceParticipant {
    uid: string;
    displayName: string;
    avatarUrl?: string;
    roleId: string;
    chimeAttendeeId: string;
    externalUserId: string;
    joinToken: string;
    status: ParticipantStatus;
    isMuted: boolean;
    isDeafened: boolean;
    isSpeaking: boolean;
    isScreenSharing: boolean;
    joinedAt: FirebaseFirestore.Timestamp;
    leftAt?: FirebaseFirestore.Timestamp;
}
export interface VoicePresence {
    channelId: string;
    workspaceId: string;
    activeParticipantUids: string[];
    participantCount: number;
    updatedAt: FirebaseFirestore.Timestamp;
}
export interface ScreenShareSession {
    sessionId: string;
    channelId: string;
    workspaceId: string;
    sharerUid: string;
    sharerName: string;
    startedAt: FirebaseFirestore.Timestamp;
    endedAt?: FirebaseFirestore.Timestamp;
}
export type VoiceQuality = "standard" | "high-fi" | "spatial";
export interface VoiceQualityStats {
    uid: string;
    sessionId: string;
    audioPacketLoss: number;
    audioLatencyMs: number;
    connectionQuality: "good" | "fair" | "poor";
    timestamp: FirebaseFirestore.Timestamp;
}
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
    targetUid: string;
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
    participants: Omit<VoiceParticipant, "joinToken">[];
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
//# sourceMappingURL=voice.d.ts.map