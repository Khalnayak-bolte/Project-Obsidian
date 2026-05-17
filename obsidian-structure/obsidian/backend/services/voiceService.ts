/**
 * backend/services/voiceService.ts
 * Project: Obsidian
 */

import { createLogger } from "../utils/logger";
import { TIER_LIMITS, VOICE_REGIONS, DEFAULT_VOICE_REGION } from "../utils/constants";
import {
  chimeClient,
  CHIME_CONFIG,
  buildExternalMeetingId,
  buildExternalUserId,
  CreateMeetingCommand,
  CreateAttendeeCommand,
  DeleteMeetingCommand,
  GetMeetingCommand,
} from "../config/chime";
import * as voiceRepo from "../repositories/voiceRepository";
import * as channelRepo from "../repositories/channelRepository";
import * as workspaceRepo from "../repositories/workspaceRepository";
import { AppError } from "../middleware/errorMiddleware";
import { ERROR_CODES, HTTP_STATUS } from "../types/common";
import type { VoiceSession, VoiceParticipant } from "../types/voice";
import type {
  JoinVoiceInput,
  LeaveVoiceInput,
  MuteParticipantInput,
  KickParticipantInput,
  UpdateParticipantStateInput,
  VoiceHeartbeatInput,
} from "../schemas/voice.schema";

const logger = createLogger("voiceService");

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getOrCreateChimeMeeting(
  workspaceId: string,
  channelId: string,
  voiceQuality: string
): Promise<{ meetingId: string; externalMeetingId: string; mediaPlacement: any }> {
  const externalMeetingId = buildExternalMeetingId(workspaceId, channelId);

  // Check if active session already exists
  const existing = await voiceRepo.getActiveSessionByChannel(channelId);
  if (existing?.chimeMeetingId) {
    try {
      const res = await chimeClient.send(
        new GetMeetingCommand({ MeetingId: existing.chimeMeetingId })
      );
      if (res.Meeting) {
        return {
          meetingId: res.Meeting.MeetingId!,
          externalMeetingId,
          mediaPlacement: res.Meeting.MediaPlacement,
        };
      }
    } catch {
      // Meeting no longer exists in Chime — create a new one
    }
  }

  const preset = CHIME_CONFIG.qualityPresets[voiceQuality as keyof typeof CHIME_CONFIG.qualityPresets]
    ?? CHIME_CONFIG.qualityPresets.standard;

  const res = await chimeClient.send(
    new CreateMeetingCommand({
      ClientRequestToken: externalMeetingId,
      ExternalMeetingId: externalMeetingId,
      MediaRegion: CHIME_CONFIG.mediaRegion,
      MeetingFeatures: (preset as any).echoReduction
        ? CHIME_CONFIG.meetingFeatures
        : undefined,
      Tags: CHIME_CONFIG.tags,
    })
  );

  if (!res.Meeting) {
    throw new AppError("Failed to create Chime meeting", HTTP_STATUS.INTERNAL_SERVER_ERROR, ERROR_CODES.INTERNAL_ERROR);
  }

  return {
    meetingId: res.Meeting.MeetingId!,
    externalMeetingId,
    mediaPlacement: res.Meeting.MediaPlacement,
  };
}

// ─── Join voice channel ───────────────────────────────────────────────────────

export async function joinVoice(
  workspaceId: string,
  uid: string,
  displayName: string,
  input: JoinVoiceInput
): Promise<{
  meetingId: string;
  attendeeId: string;
  joinToken: string;
  mediaPlacement: any;
  mediaRegion: string;
}> {
  const channel = await channelRepo.getChannelById(input.channelId);
  if (!channel || channel.workspaceId !== workspaceId) {
    throw new AppError("Channel not found", HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);
  }

  if (channel.type !== "voice") {
    throw new AppError("This channel is not a voice channel", HTTP_STATUS.BAD_REQUEST, ERROR_CODES.BAD_REQUEST);
  }

  if (channel.isArchived) {
    throw new AppError("Cannot join an archived voice channel", HTTP_STATUS.FORBIDDEN, ERROR_CODES.FORBIDDEN);
  }

  // Get workspace to determine voice quality tier
  const workspace = await workspaceRepo.getWorkspaceById(workspaceId);
  if (!workspace) {
    throw new AppError("Workspace not found", HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);
  }

  const limits = TIER_LIMITS[workspace.tier as keyof typeof TIER_LIMITS];
  const voiceQuality = limits.voiceQuality;

  // Get or create Chime meeting
  const { meetingId, mediaPlacement } = await getOrCreateChimeMeeting(
    workspaceId,
    input.channelId,
    voiceQuality
  );

  // Create Chime attendee
  const externalUserId = buildExternalUserId(workspaceId, uid);
  const attendeeRes = await chimeClient.send(
    new CreateAttendeeCommand({
      MeetingId: meetingId,
      ExternalUserId: externalUserId,
    })
  );

  if (!attendeeRes.Attendee) {
    throw new AppError("Failed to create Chime attendee", HTTP_STATUS.INTERNAL_SERVER_ERROR, ERROR_CODES.INTERNAL_ERROR);
  }

  const attendeeId = attendeeRes.Attendee.AttendeeId!;
  const joinToken = attendeeRes.Attendee.JoinToken!;

  // Upsert voice session in Firestore
  const existingSession = await voiceRepo.getActiveSessionByChannel(input.channelId);
  let session: VoiceSession;

  if (existingSession) {
    session = existingSession;
    await voiceRepo.touchSessionActivity(session.sessionId);
  } else {
    session = await voiceRepo.createVoiceSession({
      channelId: input.channelId,
      workspaceId,
      chimeMeetingId: meetingId,
      mediaRegion: CHIME_CONFIG.mediaRegion,
      voiceQuality,
    });

    // Link meeting ID to channel
    await channelRepo.setChimeMeetingId(input.channelId, meetingId);
  }

  // Add participant to session
  await voiceRepo.addParticipant({
    sessionId: session.sessionId,
    uid,
    displayName,
    attendeeId,
    channelId: input.channelId,
    workspaceId,
  });

  // Update channel participant count
  await channelRepo.updateActiveParticipantCount(input.channelId, 1);

  // Update voice presence
  await voiceRepo.upsertVoicePresence(input.channelId, uid, {
    uid,
    displayName,
    channelId: input.channelId,
    workspaceId,
    isMuted: false,
    isSpeaking: false,
    isDeafened: false,
    attendeeId,
    joinedAt: new Date(),
  });

  logger.info("User joined voice", { uid, channelId: input.channelId, meetingId });

  return {
    meetingId,
    attendeeId,
    joinToken,
    mediaPlacement,
    mediaRegion: CHIME_CONFIG.mediaRegion,
  };
}

// ─── Leave voice channel ──────────────────────────────────────────────────────

export async function leaveVoice(
  workspaceId: string,
  uid: string,
  input: LeaveVoiceInput
): Promise<void> {
  const session = await voiceRepo.getSessionByChimeMeetingId(input.meetingId);
  if (!session || session.workspaceId !== workspaceId) {
    throw new AppError("Voice session not found", HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);
  }

  await voiceRepo.removeParticipant(session.sessionId, uid);
  await channelRepo.updateActiveParticipantCount(session.channelId, -1);

  // Clear presence entry for this user
  const presence = await voiceRepo.getVoicePresence(session.channelId);
  const remaining = presence.filter((p) => p.uid !== uid);

  if (remaining.length === 0) {
    // No participants left — end the meeting after idle timeout
    // The idle cleanup job handles actual deletion; just mark session idle
    await voiceRepo.updateSessionStatus(session.sessionId, "idle");
  }

  logger.info("User left voice", { uid, channelId: session.channelId });
}

// ─── End voice session (admin / idle cleanup) ─────────────────────────────────

export async function endVoiceSession(
  sessionId: string,
  workspaceId: string
): Promise<void> {
  const session = await voiceRepo.getVoiceSessionById(sessionId);
  if (!session || session.workspaceId !== workspaceId) {
    throw new AppError("Voice session not found", HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);
  }

  // Delete Chime meeting
  try {
    await chimeClient.send(
      new DeleteMeetingCommand({ MeetingId: session.chimeMeetingId })
    );
  } catch (err) {
    logger.warn("Chime DeleteMeeting failed (may already be ended)", {
      chimeMeetingId: session.chimeMeetingId,
      error: err,
    });
  }

  await voiceRepo.updateSessionStatus(session.sessionId, "ended");
  await channelRepo.setChimeMeetingId(session.channelId, null);
  await channelRepo.updateChannel(session.channelId, { activeParticipantCount: 0 });
  await voiceRepo.clearVoicePresence(session.channelId);

  logger.info("Voice session ended", { sessionId, channelId: session.channelId });
}

// ─── Update participant state (mute/deafen/speaking) ─────────────────────────

export async function updateParticipantState(
  workspaceId: string,
  uid: string,
  sessionId: string,
  input: UpdateParticipantStateInput
): Promise<void> {
  const session = await voiceRepo.getVoiceSessionById(sessionId);
  if (!session || session.workspaceId !== workspaceId) {
    throw new AppError("Voice session not found", HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);
  }

  await voiceRepo.updateParticipantState(sessionId, uid, input);
  logger.info("Participant state updated", { uid, sessionId, input });
}

// ─── Mute participant (moderator action) ──────────────────────────────────────

export async function muteParticipant(
  workspaceId: string,
  actorId: string,
  input: MuteParticipantInput
): Promise<void> {
  const session = await voiceRepo.getActiveSessionByChannel(input.channelId);
  if (!session || session.workspaceId !== workspaceId) {
    throw new AppError("No active voice session in this channel", HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);
  }

  await voiceRepo.updateParticipantState(session.sessionId, input.targetUid, {
    isMuted: input.isMuted,
  });

  logger.info("Participant muted by moderator", {
    actorId,
    targetUid: input.targetUid,
    isMuted: input.isMuted,
  });
}

// ─── Kick participant ─────────────────────────────────────────────────────────

export async function kickParticipant(
  workspaceId: string,
  actorId: string,
  input: KickParticipantInput
): Promise<void> {
  const session = await voiceRepo.getActiveSessionByChannel(input.channelId);
  if (!session || session.workspaceId !== workspaceId) {
    throw new AppError("No active voice session in this channel", HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);
  }

  await voiceRepo.removeParticipant(session.sessionId, input.targetUid);
  await channelRepo.updateActiveParticipantCount(input.channelId, -1);

  logger.info("Participant kicked from voice", {
    actorId,
    targetUid: input.targetUid,
    channelId: input.channelId,
  });
}

// ─── Voice heartbeat ──────────────────────────────────────────────────────────

export async function voiceHeartbeat(
  workspaceId: string,
  uid: string,
  input: VoiceHeartbeatInput
): Promise<void> {
  const session = await voiceRepo.getVoiceSessionById(input.sessionId);
  if (!session || session.workspaceId !== workspaceId) return;

  await voiceRepo.touchSessionActivity(session.sessionId);
}

// ─── Get active session for channel ──────────────────────────────────────────

export async function getActiveSession(
  workspaceId: string,
  channelId: string
): Promise<VoiceSession | null> {
  const channel = await channelRepo.getChannelById(channelId);
  if (!channel || channel.workspaceId !== workspaceId) {
    throw new AppError("Channel not found", HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);
  }

  return voiceRepo.getActiveSessionByChannel(channelId);
}

// ─── Get voice presence for channel ──────────────────────────────────────────

export async function getVoicePresence(
  workspaceId: string,
  channelId: string
): Promise<any[]> {
  const channel = await channelRepo.getChannelById(channelId);
  if (!channel || channel.workspaceId !== workspaceId) {
    throw new AppError("Channel not found", HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);
  }

  return voiceRepo.getVoicePresence(channelId);
}

// ─── Cleanup idle sessions ────────────────────────────────────────────────────

export async function cleanupIdleSessions(): Promise<number> {
  const idleSessions = await voiceRepo.getIdleSessions(10 * 60); // 10 min timeout
  let cleaned = 0;

  for (const session of idleSessions) {
    try {
      await endVoiceSession(session.sessionId, session.workspaceId);
      cleaned++;
    } catch (err) {
      logger.error("Failed to cleanup idle session", { sessionId: session.sessionId, error: err });
    }
  }

  if (cleaned > 0) {
    logger.info("Idle voice sessions cleaned up", { count: cleaned });
  }

  return cleaned;
}
