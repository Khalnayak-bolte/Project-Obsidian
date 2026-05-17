/**
 * backend/repositories/voiceRepository.ts
 * Project: Obsidian
 *
 * All Firestore read/write operations for the voiceSessions collection.
 * Covers session lifecycle, participant management, and presence tracking.
 * No business logic lives here — only data access.
 */
import type { VoiceSession, VoiceSessionStatus, VoiceParticipant, VoicePresence, ChimeMediaPlacement } from "../types/voice";
export declare function getVoiceSessionById(sessionId: string): Promise<VoiceSession | null>;
export declare function getActiveSessionByChannel(channelId: string, workspaceId: string): Promise<VoiceSession | null>;
export declare function getSessionByChimeMeetingId(chimeMeetingId: string): Promise<VoiceSession | null>;
export declare function getActiveSessionsByWorkspace(workspaceId: string): Promise<VoiceSession[]>;
export declare function createVoiceSession(params: {
    channelId: string;
    workspaceId: string;
    chimeMeetingId: string;
    externalMeetingId: string;
    mediaRegion: string;
    mediaPlacement: ChimeMediaPlacement;
    maxParticipants: number;
}): Promise<VoiceSession>;
export declare function addParticipant(sessionId: string, participant: VoiceParticipant): Promise<void>;
export declare function removeParticipant(sessionId: string, uid: string): Promise<void>;
export declare function updateParticipantState(sessionId: string, uid: string, updates: Partial<Pick<VoiceParticipant, "isMuted" | "isDeafened" | "isSpeaking" | "isScreenSharing" | "status">>): Promise<void>;
export declare function updateSessionStatus(sessionId: string, status: VoiceSessionStatus): Promise<void>;
export declare function touchSessionActivity(sessionId: string): Promise<void>;
export declare function getIdleSessions(idleThresholdMs: number): Promise<VoiceSession[]>;
export declare function upsertVoicePresence(channelId: string, workspaceId: string, activeUids: string[]): Promise<void>;
export declare function clearVoicePresence(channelId: string): Promise<void>;
export declare function getVoicePresence(channelId: string): Promise<VoicePresence | null>;
export declare function getRecentSessionsByChannel(channelId: string, limit?: number): Promise<VoiceSession[]>;
//# sourceMappingURL=voiceRepository.d.ts.map