/**
 * backend/services/presenceService.ts
 * Project: Obsidian
 *
 * Manages real-time user presence across workspaces.
 * Handles heartbeats, status transitions (online → away → offline),
 * bulk workspace presence reads, and stale-session cleanup.
 *
 * Presence data lives in two places:
 *  1. users/{uid}               → presenceStatus + lastSeen (fast reads)
 *  2. users/{uid}/presence/{workspaceId} → fine-grained PresenceUpdate doc
 *     (drives Firestore listeners on the frontend)
 */

import { db, COLLECTIONS, FieldValue, Timestamp } from "../config/firebase";
import { createLogger } from "../utils/logger";
import {
  PRESENCE_HEARTBEAT_MS,
  PRESENCE_AWAY_AFTER_MS,
  PRESENCE_OFFLINE_AFTER_MS,
} from "../utils/constants";
import { AppError } from "../middleware/errorMiddleware";
import { ERROR_CODES } from "../types/common";
import type { PresenceStatus, PresenceUpdate, WorkspaceMember } from "../types/workspace";

const logger = createLogger("presenceService");

// ─── Sub-collection name ──────────────────────────────────────────────────────

const PRESENCE_SUB = "presence";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PresenceRecord {
  uid: string;
  workspaceId: string;
  status: PresenceStatus;
  lastActiveAt: FirebaseFirestore.Timestamp;
  lastHeartbeatAt: FirebaseFirestore.Timestamp;
}

export interface WorkspacePresenceMap {
  [uid: string]: {
    status: PresenceStatus;
    lastActiveAt: FirebaseFirestore.Timestamp;
  };
}

export interface SetPresenceParams {
  uid: string;
  workspaceId: string;
  status: PresenceStatus;
}

// ─── Set presence ─────────────────────────────────────────────────────────────

export async function setPresence(params: SetPresenceParams): Promise<PresenceRecord> {
  const { uid, workspaceId, status } = params;
  const now = Timestamp.now();

  const record: PresenceRecord = {
    uid,
    workspaceId,
    status,
    lastActiveAt: now,
    lastHeartbeatAt: now,
  };

  try {
    const batch = db.batch();

    // 1. Update top-level user doc — drives sidebar member list
    const userRef = db.collection(COLLECTIONS.USERS).doc(uid);
    batch.update(userRef, {
      presenceStatus: status,
      lastSeen: now,
      updatedAt: now,
    });

    // 2. Write per-workspace presence sub-doc — drives Firestore listeners
    const presenceRef = userRef.collection(PRESENCE_SUB).doc(workspaceId);
    batch.set(presenceRef, record, { merge: true });

    await batch.commit();

    logger.info("Presence set", { uid, workspaceId, status });
    return record;
  } catch (err) {
    logger.error("setPresence failed", err, { uid, workspaceId, status });
    throw err;
  }
}

// ─── Heartbeat ────────────────────────────────────────────────────────────────
// Called every PRESENCE_HEARTBEAT_MS (30 s) from the client.
// Keeps the user marked as "online" and resets the stale-session timer.

export async function heartbeat(uid: string, workspaceId: string): Promise<void> {
  const now = Timestamp.now();

  try {
    const batch = db.batch();

    const userRef = db.collection(COLLECTIONS.USERS).doc(uid);
    batch.update(userRef, {
      presenceStatus: "online" as PresenceStatus,
      lastSeen: now,
      updatedAt: now,
    });

    const presenceRef = userRef.collection(PRESENCE_SUB).doc(workspaceId);
    batch.update(presenceRef, {
      status: "online" as PresenceStatus,
      lastActiveAt: now,
      lastHeartbeatAt: now,
    });

    await batch.commit();
    logger.debug("Heartbeat received", { uid, workspaceId });
  } catch (err) {
    // Non-fatal — heartbeat misses are recovered by the stale-session sweep
    logger.warn("heartbeat update failed", { uid, workspaceId, err });
  }
}

// ─── Get presence for one user in a workspace ─────────────────────────────────

export async function getPresence(
  uid: string,
  workspaceId: string
): Promise<PresenceRecord | null> {
  try {
    const snap = await db
      .collection(COLLECTIONS.USERS)
      .doc(uid)
      .collection(PRESENCE_SUB)
      .doc(workspaceId)
      .get();

    if (!snap.exists) return null;
    return snap.data() as PresenceRecord;
  } catch (err) {
    logger.error("getPresence failed", err, { uid, workspaceId });
    throw err;
  }
}

// ─── Get bulk presence for all workspace members ──────────────────────────────
// Used by the sidebar to show who is online right now.

export async function getWorkspacePresence(
  workspaceId: string
): Promise<WorkspacePresenceMap> {
  try {
    // Fetch all active members
    const membersSnap = await db
      .collection(COLLECTIONS.USERS)
      .where("workspaceId", "==", workspaceId)
      .where("status", "!=", "left")
      .select("presenceStatus", "lastSeen")
      .get();

    const presenceMap: WorkspacePresenceMap = {};

    membersSnap.docs.forEach((doc) => {
      const data = doc.data() as Pick<WorkspaceMember, "presenceStatus" | "lastSeen">;
      presenceMap[doc.id] = {
        status: data.presenceStatus ?? "offline",
        lastActiveAt: data.lastSeen,
      };
    });

    return presenceMap;
  } catch (err) {
    logger.error("getWorkspacePresence failed", err, { workspaceId });
    throw err;
  }
}

// ─── Mark user offline (on disconnect / logout) ───────────────────────────────

export async function markOffline(uid: string, workspaceId: string): Promise<void> {
  try {
    await setPresence({ uid, workspaceId, status: "offline" });
    logger.info("User marked offline", { uid, workspaceId });
  } catch (err) {
    logger.error("markOffline failed", err, { uid, workspaceId });
    throw err;
  }
}

// ─── Mark user away ───────────────────────────────────────────────────────────

export async function markAway(uid: string, workspaceId: string): Promise<void> {
  try {
    await setPresence({ uid, workspaceId, status: "away" });
    logger.info("User marked away", { uid, workspaceId });
  } catch (err) {
    logger.error("markAway failed", err, { uid, workspaceId });
    throw err;
  }
}

// ─── Stale presence sweep ─────────────────────────────────────────────────────
// Called by a scheduled Lambda / EventBridge rule.
// Users whose lastHeartbeatAt is stale get demoted: online→away, away→offline.

export interface SweepResult {
  markedAway: number;
  markedOffline: number;
}

export async function sweepStalePresence(): Promise<SweepResult> {
  const now = Date.now();
  const awayThreshold = Timestamp.fromMillis(now - PRESENCE_AWAY_AFTER_MS);
  const offlineThreshold = Timestamp.fromMillis(now - PRESENCE_OFFLINE_AFTER_MS);

  let markedAway = 0;
  let markedOffline = 0;

  try {
    // Find online users whose heartbeat has gone stale → mark away
    const onlineStaleSnap = await db
      .collection(COLLECTIONS.USERS)
      .where("presenceStatus", "==", "online")
      .where("lastSeen", "<=", awayThreshold)
      .get();

    // Find away users whose heartbeat has gone very stale → mark offline
    const awayStaleSnap = await db
      .collection(COLLECTIONS.USERS)
      .where("presenceStatus", "==", "away")
      .where("lastSeen", "<=", offlineThreshold)
      .get();

    // Process in batches of 400 (Firestore batch limit is 500)
    const BATCH_SIZE = 400;

    const onlineDocs = onlineStaleSnap.docs;
    for (let i = 0; i < onlineDocs.length; i += BATCH_SIZE) {
      const batch = db.batch();
      const chunk = onlineDocs.slice(i, i + BATCH_SIZE);
      chunk.forEach((doc) => {
        batch.update(doc.ref, {
          presenceStatus: "away" as PresenceStatus,
          updatedAt: FieldValue.serverTimestamp(),
        });
      });
      await batch.commit();
      markedAway += chunk.length;
    }

    const awayDocs = awayStaleSnap.docs;
    for (let i = 0; i < awayDocs.length; i += BATCH_SIZE) {
      const batch = db.batch();
      const chunk = awayDocs.slice(i, i + BATCH_SIZE);
      chunk.forEach((doc) => {
        batch.update(doc.ref, {
          presenceStatus: "offline" as PresenceStatus,
          updatedAt: FieldValue.serverTimestamp(),
        });
      });
      await batch.commit();
      markedOffline += chunk.length;
    }

    logger.info("Stale presence sweep complete", { markedAway, markedOffline });
    return { markedAway, markedOffline };
  } catch (err) {
    logger.error("sweepStalePresence failed", err);
    throw err;
  }
}

// ─── Validate user belongs to workspace ───────────────────────────────────────

export async function assertMemberOfWorkspace(
  uid: string,
  workspaceId: string
): Promise<void> {
  try {
    const snap = await db.collection(COLLECTIONS.USERS).doc(uid).get();
    if (!snap.exists) {
      throw new AppError(ERROR_CODES.NOT_FOUND, "User not found.");
    }
    const data = snap.data() as { workspaceId: string };
    if (data.workspaceId !== workspaceId) {
      throw new AppError(
        ERROR_CODES.FORBIDDEN,
        "User does not belong to this workspace."
      );
    }
  } catch (err) {
    if (err instanceof AppError) throw err;
    logger.error("assertMemberOfWorkspace failed", err, { uid, workspaceId });
    throw err;
  }
}

// ─── Get online member count ──────────────────────────────────────────────────

export async function getOnlineMemberCount(workspaceId: string): Promise<number> {
  try {
    const snap = await db
      .collection(COLLECTIONS.USERS)
      .where("workspaceId", "==", workspaceId)
      .where("presenceStatus", "in", ["online", "away", "busy"])
      .count()
      .get();

    return snap.data().count;
  } catch (err) {
    logger.error("getOnlineMemberCount failed", err, { workspaceId });
    throw err;
  }
}

// ─── Clear all presence on workspace deletion ─────────────────────────────────

export async function clearWorkspacePresence(workspaceId: string): Promise<void> {
  try {
    const membersSnap = await db
      .collection(COLLECTIONS.USERS)
      .where("workspaceId", "==", workspaceId)
      .get();

    if (membersSnap.empty) return;

    const BATCH_SIZE = 400;
    const docs = membersSnap.docs;

    for (let i = 0; i < docs.length; i += BATCH_SIZE) {
      const batch = db.batch();
      const chunk = docs.slice(i, i + BATCH_SIZE);

      chunk.forEach((doc) => {
        batch.update(doc.ref, {
          presenceStatus: "offline" as PresenceStatus,
          updatedAt: FieldValue.serverTimestamp(),
        });

        // Delete the per-workspace presence sub-doc
        const presenceRef = doc.ref.collection(PRESENCE_SUB).doc(workspaceId);
        batch.delete(presenceRef);
      });

      await batch.commit();
    }

    logger.info("Workspace presence cleared", { workspaceId, count: docs.length });
  } catch (err) {
    logger.error("clearWorkspacePresence failed", err, { workspaceId });
    throw err;
  }
}
