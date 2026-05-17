/**
 * backend/repositories/voiceRepository.ts
 * Project: Obsidian
 *
 * All Firestore read/write operations for the voiceSessions collection.
 * Covers session lifecycle, participant management, and presence tracking.
 * No business logic lives here — only data access.
 */

import { db, COLLECTIONS, FieldValue, Timestamp } from "../config/firebase";
import { createLogger } from "../utils/logger";
import { generateSessionId } from "../utils/helpers";
import type {
  VoiceSession,
  VoiceSessionStatus,
  VoiceParticipant,
  VoicePresence,
  ParticipantStatus,
  ChimeMediaPlacement,
} from "../types/voice";

const logger = createLogger("voiceRepository");

// ─── Get session by ID ────────────────────────────────────────────────────────

export async function getVoiceSessionById(
  sessionId: string
): Promise<VoiceSession | null> {
  try {
    const snap = await db
      .collection(COLLECTIONS.VOICE_SESSIONS)
      .doc(sessionId)
      .get();

    if (!snap.exists) return null;
    return { sessionId: snap.id, ...snap.data() } as VoiceSession;
  } catch (err) {
    logger.error("getVoiceSessionById failed", { sessionId, error: err });
    throw err;
  }
}

// ─── Get active session by channel ───────────────────────────────────────────

export async function getActiveSessionByChannel(
  channelId: string,
  workspaceId: string
): Promise<VoiceSession | null> {
  try {
    const snap = await db
      .collection(COLLECTIONS.VOICE_SESSIONS)
      .where("channelId", "==", channelId)
      .where("workspaceId", "==", workspaceId)
      .where("status", "==", "active")
      .orderBy("startedAt", "desc")
      .limit(1)
      .get();

    if (snap.empty) return null;
    return { sessionId: snap.docs[0].id, ...snap.docs[0].data() } as VoiceSession;
  } catch (err) {
    logger.error("getActiveSessionByChannel failed", { channelId, error: err });
    throw err;
  }
}

// ─── Get session by Chime meeting ID ─────────────────────────────────────────

export async function getSessionByChimeMeetingId(
  chimeMeetingId: string
): Promise<VoiceSession | null> {
  try {
    const snap = await db
      .collection(COLLECTIONS.VOICE_SESSIONS)
      .where("chimeMeetingId", "==", chimeMeetingId)
      .limit(1)
      .get();

    if (snap.empty) return null;
    return { sessionId: snap.docs[0].id, ...snap.docs[0].data() } as VoiceSession;
  } catch (err) {
    logger.error("getSessionByChimeMeetingId failed", { chimeMeetingId, error: err });
    throw err;
  }
}

// ─── Get all active sessions for a workspace ──────────────────────────────────

export async function getActiveSessionsByWorkspace(
  workspaceId: string
): Promise<VoiceSession[]> {
  try {
    const snap = await db
      .collection(COLLECTIONS.VOICE_SESSIONS)
      .where("workspaceId", "==", workspaceId)
      .where("status", "==", "active")
      .get();

    return snap.docs.map((doc) => ({
      sessionId: doc.id,
      ...doc.data(),
    })) as VoiceSession[];
  } catch (err) {
    logger.error("getActiveSessionsByWorkspace failed", { workspaceId, error: err });
    throw err;
  }
}

// ─── Create voice session ─────────────────────────────────────────────────────

export async function createVoiceSession(params: {
  channelId: string;
  workspaceId: string;
  chimeMeetingId: string;
  externalMeetingId: string;
  mediaRegion: string;
  mediaPlacement: ChimeMediaPlacement;
  maxParticipants: number;
}): Promise<VoiceSession> {
  try {
    const sessionId = generateSessionId();
    const now = Timestamp.now();

    const session: VoiceSession = {
      sessionId,
      channelId: params.channelId,
      workspaceId: params.workspaceId,
      status: "active",
      chimeMeetingId: params.chimeMeetingId,
      externalMeetingId: params.externalMeetingId,
      mediaRegion: params.mediaRegion,
      mediaPlacement: params.mediaPlacement,
      participants: [],
      maxParticipants: params.maxParticipants,
      startedAt: now,
      lastActivityAt: now,
      createdAt: now,
      updatedAt: now,
    };

    await db
      .collection(COLLECTIONS.VOICE_SESSIONS)
      .doc(sessionId)
      .set(session);

    logger.info("Voice session created", {
      sessionId,
      channelId: params.channelId,
      chimeMeetingId: params.chimeMeetingId,
    });

    return session;
  } catch (err) {
    logger.error("createVoiceSession failed", { ...params, error: err });
    throw err;
  }
}

// ─── Add participant to session ───────────────────────────────────────────────

export async function addParticipant(
  sessionId: string,
  participant: VoiceParticipant
): Promise<void> {
  try {
    await db
      .collection(COLLECTIONS.VOICE_SESSIONS)
      .doc(sessionId)
      .update({
        participants: FieldValue.arrayUnion(participant),
        lastActivityAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

    logger.info("Participant added to voice session", {
      sessionId,
      uid: participant.uid,
    });
  } catch (err) {
    logger.error("addParticipant failed", { sessionId, uid: participant.uid, error: err });
    throw err;
  }
}

// ─── Remove participant from session ─────────────────────────────────────────

export async function removeParticipant(
  sessionId: string,
  uid: string
): Promise<void> {
  try {
    const ref = db.collection(COLLECTIONS.VOICE_SESSIONS).doc(sessionId);

    await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) throw new Error("Voice session not found");

      const session = snap.data() as VoiceSession;
      const participants = session.participants.map((p) =>
        p.uid === uid
          ? { ...p, status: "disconnected" as ParticipantStatus, leftAt: Timestamp.now() }
          : p
      );

      tx.update(ref, {
        participants,
        lastActivityAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
    });

    logger.info("Participant removed from voice session", { sessionId, uid });
  } catch (err) {
    logger.error("removeParticipant failed", { sessionId, uid, error: err });
    throw err;
  }
}

// ─── Update participant state ─────────────────────────────────────────────────

export async function updateParticipantState(
  sessionId: string,
  uid: string,
  updates: Partial<
    Pick<VoiceParticipant, "isMuted" | "isDeafened" | "isSpeaking" | "isScreenSharing" | "status">
  >
): Promise<void> {
  try {
    const ref = db.collection(COLLECTIONS.VOICE_SESSIONS).doc(sessionId);

    await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) throw new Error("Voice session not found");

      const session = snap.data() as VoiceSession;
      const participants = session.participants.map((p) =>
        p.uid === uid ? { ...p, ...updates } : p
      );

      tx.update(ref, {
        participants,
        lastActivityAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
    });
  } catch (err) {
    logger.error("updateParticipantState failed", { sessionId, uid, updates, error: err });
    throw err;
  }
}

// ─── Update session status ────────────────────────────────────────────────────

export async function updateSessionStatus(
  sessionId: string,
  status: VoiceSessionStatus
): Promise<void> {
  try {
    const updates: Record<string, unknown> = {
      status,
      updatedAt: Timestamp.now(),
    };

    if (status === "ended") {
      updates.endedAt = Timestamp.now();
    }

    await db
      .collection(COLLECTIONS.VOICE_SESSIONS)
      .doc(sessionId)
      .update(updates);

    logger.info("Voice session status updated", { sessionId, status });
  } catch (err) {
    logger.error("updateSessionStatus failed", { sessionId, status, error: err });
    throw err;
  }
}

// ─── Touch last activity ──────────────────────────────────────────────────────

export async function touchSessionActivity(sessionId: string): Promise<void> {
  try {
    await db
      .collection(COLLECTIONS.VOICE_SESSIONS)
      .doc(sessionId)
      .update({
        lastActivityAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
  } catch (err) {
    logger.error("touchSessionActivity failed", { sessionId, error: err });
    throw err;
  }
}

// ─── Get idle sessions (for cleanup job) ─────────────────────────────────────

export async function getIdleSessions(
  idleThresholdMs: number
): Promise<VoiceSession[]> {
  try {
    const thresholdTime = Timestamp.fromMillis(Date.now() - idleThresholdMs);

    const snap = await db
      .collection(COLLECTIONS.VOICE_SESSIONS)
      .where("status", "==", "active")
      .where("lastActivityAt", "<=", thresholdTime)
      .get();

    return snap.docs.map((doc) => ({
      sessionId: doc.id,
      ...doc.data(),
    })) as VoiceSession[];
  } catch (err) {
    logger.error("getIdleSessions failed", { idleThresholdMs, error: err });
    throw err;
  }
}

// ─── Voice presence (lightweight realtime doc) ────────────────────────────────

export async function upsertVoicePresence(
  channelId: string,
  workspaceId: string,
  activeUids: string[]
): Promise<void> {
  try {
    const presence: VoicePresence = {
      channelId,
      workspaceId,
      activeParticipantUids: activeUids,
      participantCount: activeUids.length,
      updatedAt: Timestamp.now(),
    };

    await db
      .collection(COLLECTIONS.CHANNELS)
      .doc(channelId)
      .collection("voicePresence")
      .doc("current")
      .set(presence);
  } catch (err) {
    logger.error("upsertVoicePresence failed", { channelId, error: err });
    throw err;
  }
}

export async function clearVoicePresence(channelId: string): Promise<void> {
  try {
    await db
      .collection(COLLECTIONS.CHANNELS)
      .doc(channelId)
      .collection("voicePresence")
      .doc("current")
      .delete();
  } catch (err) {
    logger.error("clearVoicePresence failed", { channelId, error: err });
    throw err;
  }
}

export async function getVoicePresence(
  channelId: string
): Promise<VoicePresence | null> {
  try {
    const snap = await db
      .collection(COLLECTIONS.CHANNELS)
      .doc(channelId)
      .collection("voicePresence")
      .doc("current")
      .get();

    if (!snap.exists) return null;
    return snap.data() as VoicePresence;
  } catch (err) {
    logger.error("getVoicePresence failed", { channelId, error: err });
    throw err;
  }
}

// ─── Get recent sessions for a channel ───────────────────────────────────────

export async function getRecentSessionsByChannel(
  channelId: string,
  limit = 10
): Promise<VoiceSession[]> {
  try {
    const snap = await db
      .collection(COLLECTIONS.VOICE_SESSIONS)
      .where("channelId", "==", channelId)
      .orderBy("startedAt", "desc")
      .limit(limit)
      .get();

    return snap.docs.map((doc) => ({
      sessionId: doc.id,
      ...doc.data(),
    })) as VoiceSession[];
  } catch (err) {
    logger.error("getRecentSessionsByChannel failed", { channelId, error: err });
    throw err;
  }
}
