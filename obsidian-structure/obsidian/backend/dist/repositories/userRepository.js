/**
 * backend/repositories/userRepository.ts
 * Project: Obsidian
 *
 * All Firestore read/write operations for the users collection.
 * Covers user profiles, workspace membership, presence, and device sessions.
 * No business logic lives here — only data access.
 */
import { db, COLLECTIONS, FieldValue, Timestamp } from "../config/firebase";
import { createLogger } from "../utils/logger";
const logger = createLogger("userRepository");
// ─── Sub-collection names ─────────────────────────────────────────────────────
const SUB = {
    DEVICE_SESSIONS: "deviceSessions",
    PRESENCE: "presence",
};
// ─── Get user by UID ──────────────────────────────────────────────────────────
export async function getUserById(uid) {
    try {
        const snap = await db.collection(COLLECTIONS.USERS).doc(uid).get();
        if (!snap.exists)
            return null;
        return { uid: snap.id, ...snap.data() };
    }
    catch (err) {
        logger.error("getUserById failed", { uid, error: err });
        throw err;
    }
}
// ─── Get user by email ────────────────────────────────────────────────────────
export async function getUserByEmail(email, workspaceId) {
    try {
        const snap = await db
            .collection(COLLECTIONS.USERS)
            .where("email", "==", email.toLowerCase().trim())
            .where("workspaceId", "==", workspaceId)
            .limit(1)
            .get();
        if (snap.empty)
            return null;
        const doc = snap.docs[0];
        return { uid: doc.id, ...doc.data() };
    }
    catch (err) {
        logger.error("getUserByEmail failed", { email, workspaceId, error: err });
        throw err;
    }
}
export async function createUserProfile(params) {
    const now = Timestamp.now();
    const profile = {
        uid: params.uid,
        email: params.email.toLowerCase().trim(),
        displayName: params.displayName.trim(),
        avatarUrl: params.avatarUrl ?? null,
        workspaceId: params.workspaceId,
        roleId: params.roleId,
        status: "online",
        lastSeen: now,
        createdAt: now,
        updatedAt: now,
    };
    try {
        await db.collection(COLLECTIONS.USERS).doc(params.uid).set(profile);
        logger.info("User profile created", { uid: params.uid, workspaceId: params.workspaceId });
        return profile;
    }
    catch (err) {
        logger.error("createUserProfile failed", { uid: params.uid, error: err });
        throw err;
    }
}
export async function updateUserProfile(uid, params) {
    const updates = {
        updatedAt: FieldValue.serverTimestamp(),
    };
    if (params.displayName !== undefined)
        updates.displayName = params.displayName.trim();
    if (params.avatarUrl !== undefined)
        updates.avatarUrl = params.avatarUrl;
    if (params.roleId !== undefined)
        updates.roleId = params.roleId;
    if (params.status !== undefined)
        updates.status = params.status;
    try {
        await db.collection(COLLECTIONS.USERS).doc(uid).update(updates);
        logger.info("User profile updated", { uid });
    }
    catch (err) {
        logger.error("updateUserProfile failed", { uid, error: err });
        throw err;
    }
}
// ─── Delete user profile ──────────────────────────────────────────────────────
export async function deleteUserProfile(uid) {
    try {
        await db.collection(COLLECTIONS.USERS).doc(uid).delete();
        logger.info("User profile deleted", { uid });
    }
    catch (err) {
        logger.error("deleteUserProfile failed", { uid, error: err });
        throw err;
    }
}
export async function listWorkspaceMembers(params) {
    const { workspaceId, status, roleId, limit = 50, cursor } = params;
    try {
        let query = db
            .collection(COLLECTIONS.USERS)
            .where("workspaceId", "==", workspaceId)
            .orderBy("displayName")
            .limit(limit + 1); // fetch one extra to detect hasMore
        if (status)
            query = query.where("status", "==", status);
        if (roleId)
            query = query.where("roleId", "==", roleId);
        if (cursor) {
            const cursorSnap = await db.collection(COLLECTIONS.USERS).doc(cursor).get();
            if (cursorSnap.exists) {
                query = query.startAfter(cursorSnap);
            }
        }
        const snap = await query.get();
        const docs = snap.docs;
        const hasMore = docs.length > limit;
        const sliced = hasMore ? docs.slice(0, limit) : docs;
        const members = sliced.map((doc) => ({ uid: doc.id, ...doc.data() }));
        return {
            members,
            meta: {
                limit,
                hasMore,
                nextCursor: hasMore ? sliced[sliced.length - 1].id : undefined,
            },
        };
    }
    catch (err) {
        logger.error("listWorkspaceMembers failed", { workspaceId, error: err });
        throw err;
    }
}
// ─── Get multiple users by UID ────────────────────────────────────────────────
export async function getUsersByIds(uids) {
    if (uids.length === 0)
        return [];
    // Firestore `in` operator supports max 30 values — chunk if needed
    const chunks = [];
    for (let i = 0; i < uids.length; i += 30) {
        chunks.push(uids.slice(i, i + 30));
    }
    try {
        const results = [];
        for (const chunk of chunks) {
            const snap = await db
                .collection(COLLECTIONS.USERS)
                .where("__name__", "in", chunk)
                .get();
            snap.docs.forEach((doc) => results.push({ uid: doc.id, ...doc.data() }));
        }
        return results;
    }
    catch (err) {
        logger.error("getUsersByIds failed", { uids, error: err });
        throw err;
    }
}
// ─── Presence ─────────────────────────────────────────────────────────────────
export async function updatePresence(uid, workspaceId, status) {
    const now = Timestamp.now();
    const update = {
        status,
        lastSeen: now,
        updatedAt: now,
    };
    try {
        await db.collection(COLLECTIONS.USERS).doc(uid).update(update);
        // Also write a lightweight presence document for real-time listeners
        const presenceRef = db
            .collection(COLLECTIONS.USERS)
            .doc(uid)
            .collection(SUB.PRESENCE)
            .doc(workspaceId);
        const presenceUpdate = {
            uid,
            workspaceId,
            status,
            lastActiveAt: now,
        };
        await presenceRef.set(presenceUpdate, { merge: true });
    }
    catch (err) {
        logger.error("updatePresence failed", { uid, status, error: err });
        throw err;
    }
}
export async function getPresence(uid, workspaceId) {
    try {
        const snap = await db
            .collection(COLLECTIONS.USERS)
            .doc(uid)
            .collection(SUB.PRESENCE)
            .doc(workspaceId)
            .get();
        if (!snap.exists)
            return null;
        return snap.data();
    }
    catch (err) {
        logger.error("getPresence failed", { uid, workspaceId, error: err });
        throw err;
    }
}
// ─── Device Sessions ──────────────────────────────────────────────────────────
export async function upsertDeviceSession(uid, params) {
    const now = Timestamp.now();
    const session = {
        ...params,
        createdAt: now,
        updatedAt: now,
    };
    try {
        await db
            .collection(COLLECTIONS.USERS)
            .doc(uid)
            .collection(SUB.DEVICE_SESSIONS)
            .doc(params.deviceId)
            .set(session, { merge: true });
        return session;
    }
    catch (err) {
        logger.error("upsertDeviceSession failed", { uid, deviceId: params.deviceId, error: err });
        throw err;
    }
}
export async function getDeviceSession(uid, deviceId) {
    try {
        const snap = await db
            .collection(COLLECTIONS.USERS)
            .doc(uid)
            .collection(SUB.DEVICE_SESSIONS)
            .doc(deviceId)
            .get();
        if (!snap.exists)
            return null;
        return snap.data();
    }
    catch (err) {
        logger.error("getDeviceSession failed", { uid, deviceId, error: err });
        throw err;
    }
}
export async function listDeviceSessions(uid) {
    try {
        const snap = await db
            .collection(COLLECTIONS.USERS)
            .doc(uid)
            .collection(SUB.DEVICE_SESSIONS)
            .where("isActive", "==", true)
            .orderBy("lastActiveAt", "desc")
            .get();
        return snap.docs.map((doc) => doc.data());
    }
    catch (err) {
        logger.error("listDeviceSessions failed", { uid, error: err });
        throw err;
    }
}
export async function revokeDeviceSession(uid, deviceId) {
    try {
        await db
            .collection(COLLECTIONS.USERS)
            .doc(uid)
            .collection(SUB.DEVICE_SESSIONS)
            .doc(deviceId)
            .update({
            isActive: false,
            updatedAt: FieldValue.serverTimestamp(),
        });
    }
    catch (err) {
        logger.error("revokeDeviceSession failed", { uid, deviceId, error: err });
        throw err;
    }
}
export async function revokeAllDeviceSessions(uid) {
    try {
        const snap = await db
            .collection(COLLECTIONS.USERS)
            .doc(uid)
            .collection(SUB.DEVICE_SESSIONS)
            .where("isActive", "==", true)
            .get();
        if (snap.empty)
            return;
        const batch = db.batch();
        snap.docs.forEach((doc) => batch.update(doc.ref, {
            isActive: false,
            updatedAt: FieldValue.serverTimestamp(),
        }));
        await batch.commit();
        logger.info("All device sessions revoked", { uid, count: snap.size });
    }
    catch (err) {
        logger.error("revokeAllDeviceSessions failed", { uid, error: err });
        throw err;
    }
}
// ─── Last seen heartbeat ──────────────────────────────────────────────────────
export async function touchLastSeen(uid) {
    try {
        await db.collection(COLLECTIONS.USERS).doc(uid).update({
            lastSeen: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        });
    }
    catch (err) {
        // Non-critical — swallow and log only
        logger.warn("touchLastSeen failed", { uid, error: err });
    }
}
// ─── Member count helper ──────────────────────────────────────────────────────
export async function countWorkspaceMembers(workspaceId) {
    try {
        const snap = await db
            .collection(COLLECTIONS.USERS)
            .where("workspaceId", "==", workspaceId)
            .where("status", "!=", "left")
            .count()
            .get();
        return snap.data().count;
    }
    catch (err) {
        logger.error("countWorkspaceMembers failed", { workspaceId, error: err });
        throw err;
    }
}
//# sourceMappingURL=userRepository.js.map