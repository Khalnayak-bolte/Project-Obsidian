/**
 * backend/services/voiceService.ts
 * Project: Obsidian
 */
import type { VoiceSession } from "../types/voice";
import type { JoinVoiceInput, LeaveVoiceInput, MuteParticipantInput, KickParticipantInput, UpdateParticipantStateInput, VoiceHeartbeatInput } from "../schemas/voice.schema";
export declare function joinVoice(workspaceId: string, uid: string, displayName: string, input: JoinVoiceInput): Promise<{
    meetingId: string;
    attendeeId: string;
    joinToken: string;
    mediaPlacement: any;
    mediaRegion: string;
}>;
export declare function leaveVoice(workspaceId: string, uid: string, input: LeaveVoiceInput): Promise<void>;
export declare function endVoiceSession(sessionId: string, workspaceId: string): Promise<void>;
export declare function updateParticipantState(workspaceId: string, uid: string, sessionId: string, input: UpdateParticipantStateInput): Promise<void>;
export declare function muteParticipant(workspaceId: string, actorId: string, input: MuteParticipantInput): Promise<void>;
export declare function kickParticipant(workspaceId: string, actorId: string, input: KickParticipantInput): Promise<void>;
export declare function voiceHeartbeat(workspaceId: string, uid: string, input: VoiceHeartbeatInput): Promise<void>;
export declare function getActiveSession(workspaceId: string, channelId: string): Promise<VoiceSession | null>;
export declare function getVoicePresence(workspaceId: string, channelId: string): Promise<any[]>;
export declare function cleanupIdleSessions(): Promise<number>;
//# sourceMappingURL=voiceService.d.ts.map