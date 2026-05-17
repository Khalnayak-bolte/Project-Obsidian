/**
 * frontend/src/services/voiceService.ts
 * Project: Obsidian
 */

import { apiPost, apiDelete, apiGet, apiPatch } from "../lib/axios";

// ─── Types ────────────────────────────────────────────────────────────────────

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
  mediaPlacement: {
    AudioHostUrl: string;
    AudioFallbackUrl: string;
    ScreenDataUrl: string;
    ScreenSharingUrl: string;
    ScreenViewingUrl: string;
    SignalingUrl: string;
    TurnControlUrl: string;
    EventIngestionUrl: string;
  };
}

export interface LeaveVoicePayload {
  meetingId: string;
  attendeeId: string;
}

export interface VoiceParticipant {
  uid: string;
  displayName: string;
  avatarUrl?: string;
  attendeeId: string;
  isMuted: boolean;
  isSpeaking: boolean;
  isDeafened: boolean;
  isScreenSharing: boolean;
  joinedAt: string;
}

export interface VoiceSession {
  sessionId: string;
  channelId: string;
  workspaceId: string;
  chimeMeetingId: string;
  mediaRegion: string;
  status: "active" | "idle" | "ended";
  participants: VoiceParticipant[];
  startedAt: string;
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

export interface StartScreenSharePayload {
  meetingId: string;
  sourceType?: "screen" | "window" | "tab";
}

// ─── Join / Leave ─────────────────────────────────────────────────────────────

export async function joinVoice(
  workspaceId: string,
  payload: JoinVoicePayload
): Promise<JoinVoiceResponse> {
  return apiPost<JoinVoiceResponse>(
    `/api/v1/workspaces/${workspaceId}/voice/join`,
    payload
  );
}

export async function leaveVoice(
  workspaceId: string,
  payload: LeaveVoicePayload
): Promise<void> {
  return apiPost<void>(
    `/api/v1/workspaces/${workspaceId}/voice/leave`,
    payload
  );
}

// ─── Session info ─────────────────────────────────────────────────────────────

export async function getActiveSession(
  workspaceId: string,
  channelId: string
): Promise<VoiceSession | null> {
  return apiGet<VoiceSession | null>(
    `/api/v1/workspaces/${workspaceId}/voice/channels/${channelId}/session`
  );
}

export async function getVoicePresence(
  workspaceId: string,
  channelId: string
): Promise<VoiceParticipant[]> {
  return apiGet<VoiceParticipant[]>(
    `/api/v1/workspaces/${workspaceId}/voice/channels/${channelId}/presence`
  );
}

// ─── Participant state ────────────────────────────────────────────────────────

export async function updateParticipantState(
  workspaceId: string,
  sessionId: string,
  payload: UpdateParticipantStatePayload
): Promise<void> {
  return apiPatch<void>(
    `/api/v1/workspaces/${workspaceId}/voice/sessions/${sessionId}/state`,
    payload
  );
}

export async function muteParticipant(
  workspaceId: string,
  payload: MuteParticipantPayload
): Promise<void> {
  return apiPost<void>(
    `/api/v1/workspaces/${workspaceId}/voice/mute`,
    payload
  );
}

export async function kickParticipant(
  workspaceId: string,
  payload: KickParticipantPayload
): Promise<void> {
  return apiPost<void>(
    `/api/v1/workspaces/${workspaceId}/voice/kick`,
    payload
  );
}

// ─── Screen share ─────────────────────────────────────────────────────────────

export async function startScreenShare(
  workspaceId: string,
  payload: StartScreenSharePayload
): Promise<void> {
  return apiPost<void>(
    `/api/v1/workspaces/${workspaceId}/voice/screen-share/start`,
    payload
  );
}

export async function stopScreenShare(
  workspaceId: string,
  meetingId: string
): Promise<void> {
  return apiPost<void>(
    `/api/v1/workspaces/${workspaceId}/voice/screen-share/stop`,
    { meetingId }
  );
}

// ─── Heartbeat ────────────────────────────────────────────────────────────────

export async function sendVoiceHeartbeat(
  workspaceId: string,
  sessionId: string
): Promise<void> {
  return apiPost<void>(
    `/api/v1/workspaces/${workspaceId}/voice/heartbeat`,
    { sessionId }
  );
}
