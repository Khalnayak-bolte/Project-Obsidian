/**
 * backend/repositories/channelRepository.ts
 * Project: Obsidian
 *
 * All Firestore read/write operations for the channels collection.
 * Covers channel lifecycle, membership, categories, and voice session linking.
 * No business logic lives here — only data access.
 */
import { db, COLLECTIONS, FieldValue, Timestamp } from "../config/firebase";
import { createLogger } from "../utils/logger";
import { generateChannelId } from "../utils/helpers";
const logger = createLogger("channelRepository");
// ─── Get channel by ID ────────────────────────────────────────────────────────
export async function getChannelById(channelId) {
    try {
        const snap = await db.collection(COLLECTIONS.CHANNELS).doc(channelId).get();
        if (!snap.exists)
            return null;
        return { channelId: snap.id, ...snap.data() };
    }
    catch (err) {
        logger.error("getChannelById failed", { channelId, error: err });
        throw err;
    }
}
// ─── Get all channels for a workspace ────────────────────────────────────────
export async function getChannelsByWorkspace(workspaceId, includeArchived = false) {
    try {
        let query = db
            .collection(COLLECTIONS.CHANNELS)
            .where("workspaceId", "==", workspaceId)
            .orderBy("position", "asc");
        if (!includeArchived) {
            query = query.where("isArchived", "==", false);
        }
        const snap = await query.get();
        return snap.docs.map((doc) => ({
            channelId: doc.id,
            ...doc.data(),
        }));
    }
    catch (err) {
        logger.error("getChannelsByWorkspace failed", { workspaceId, error: err });
        throw err;
    }
}
// ─── Get channels by type ─────────────────────────────────────────────────────
export async function getChannelsByType(workspaceId, type) {
    try {
        const snap = await db
            .collection(COLLECTIONS.CHANNELS)
            .where("workspaceId", "==", workspaceId)
            .where("type", "==", type)
            .where("isArchived", "==", false)
            .orderBy("position", "asc")
            .get();
        return snap.docs.map((doc) => ({
            channelId: doc.id,
            ...doc.data(),
        }));
    }
    catch (err) {
        logger.error("getChannelsByType failed", { workspaceId, type, error: err });
        throw err;
    }
}
// ─── Get channels accessible by role ─────────────────────────────────────────
export async function getAccessibleChannels(workspaceId, roleId) {
    try {
        // Public channels + channels where role is in allowedRoles
        const [publicSnap, privateSnap] = await Promise.all([
            db
                .collection(COLLECTIONS.CHANNELS)
                .where("workspaceId", "==", workspaceId)
                .where("visibility", "==", "public")
                .where("isArchived", "==", false)
                .orderBy("position", "asc")
                .get(),
            db
                .collection(COLLECTIONS.CHANNELS)
                .where("workspaceId", "==", workspaceId)
                .where("visibility", "==", "private")
                .where("allowedRoles", "array-contains", roleId)
                .where("isArchived", "==", false)
                .orderBy("position", "asc")
                .get(),
        ]);
        const channels = [
            ...publicSnap.docs.map((doc) => ({ channelId: doc.id, ...doc.data() })),
            ...privateSnap.docs.map((doc) => ({ channelId: doc.id, ...doc.data() })),
        ];
        // Sort by position after merging
        return channels.sort((a, b) => a.position - b.position);
    }
    catch (err) {
        logger.error("getAccessibleChannels failed", { workspaceId, roleId, error: err });
        throw err;
    }
}
// ─── Create channel ───────────────────────────────────────────────────────────
export async function createChannel(params) {
    try {
        const channelId = generateChannelId();
        const now = Timestamp.now();
        const channel = {
            channelId,
            workspaceId: params.workspaceId,
            name: params.name.toLowerCase().replace(/\s+/g, "-"),
            type: params.type,
            visibility: params.visibility,
            description: params.description,
            allowedRoles: params.allowedRoles ?? [],
            position: params.position ?? 999,
            isArchived: false,
            isDefault: params.isDefault ?? false,
            createdBy: params.createdBy,
            messageCount: 0,
            activeParticipantCount: 0,
            createdAt: now,
            updatedAt: now,
        };
        await db.collection(COLLECTIONS.CHANNELS).doc(channelId).set(channel);
        logger.info("Channel created", { channelId, workspaceId: params.workspaceId, name: params.name });
        return channel;
    }
    catch (err) {
        logger.error("createChannel failed", { ...params, error: err });
        throw err;
    }
}
// ─── Update channel ───────────────────────────────────────────────────────────
export async function updateChannel(channelId, updates) {
    try {
        await db
            .collection(COLLECTIONS.CHANNELS)
            .doc(channelId)
            .update({
            ...updates,
            updatedAt: Timestamp.now(),
        });
    }
    catch (err) {
        logger.error("updateChannel failed", { channelId, updates, error: err });
        throw err;
    }
}
// ─── Delete channel ───────────────────────────────────────────────────────────
export async function deleteChannel(channelId) {
    try {
        await db.collection(COLLECTIONS.CHANNELS).doc(channelId).delete();
        logger.info("Channel deleted", { channelId });
    }
    catch (err) {
        logger.error("deleteChannel failed", { channelId, error: err });
        throw err;
    }
}
// ─── Archive / unarchive channel ──────────────────────────────────────────────
export async function setChannelArchived(channelId, isArchived) {
    try {
        await db.collection(COLLECTIONS.CHANNELS).doc(channelId).update({
            isArchived,
            updatedAt: Timestamp.now(),
        });
    }
    catch (err) {
        logger.error("setChannelArchived failed", { channelId, isArchived, error: err });
        throw err;
    }
}
// ─── Reorder channels ─────────────────────────────────────────────────────────
export async function reorderChannels(updates) {
    try {
        const batch = db.batch();
        const now = Timestamp.now();
        for (const { channelId, position } of updates) {
            const ref = db.collection(COLLECTIONS.CHANNELS).doc(channelId);
            batch.update(ref, { position, updatedAt: now });
        }
        await batch.commit();
    }
    catch (err) {
        logger.error("reorderChannels failed", { updates, error: err });
        throw err;
    }
}
// ─── Update last message ──────────────────────────────────────────────────────
export async function updateChannelLastMessage(channelId, preview) {
    try {
        await db.collection(COLLECTIONS.CHANNELS).doc(channelId).update({
            lastMessageAt: Timestamp.now(),
            lastMessagePreview: preview.slice(0, 100),
            messageCount: FieldValue.increment(1),
            updatedAt: Timestamp.now(),
        });
    }
    catch (err) {
        logger.error("updateChannelLastMessage failed", { channelId, error: err });
        throw err;
    }
}
// ─── Link / unlink Chime meeting ──────────────────────────────────────────────
export async function setChimeMeetingId(channelId, chimeMeetingId) {
    try {
        await db.collection(COLLECTIONS.CHANNELS).doc(channelId).update({
            chimeMeetingId: chimeMeetingId ?? FieldValue.delete(),
            activeParticipantCount: chimeMeetingId ? 0 : FieldValue.delete(),
            updatedAt: Timestamp.now(),
        });
    }
    catch (err) {
        logger.error("setChimeMeetingId failed", { channelId, chimeMeetingId, error: err });
        throw err;
    }
}
// ─── Update active participant count ──────────────────────────────────────────
export async function updateActiveParticipantCount(channelId, delta) {
    try {
        await db.collection(COLLECTIONS.CHANNELS).doc(channelId).update({
            activeParticipantCount: FieldValue.increment(delta),
            updatedAt: Timestamp.now(),
        });
    }
    catch (err) {
        logger.error("updateActiveParticipantCount failed", { channelId, delta, error: err });
        throw err;
    }
}
// ─── Channel member read state ────────────────────────────────────────────────
export async function getChannelMember(channelId, uid) {
    try {
        const snap = await db
            .collection(COLLECTIONS.CHANNELS)
            .doc(channelId)
            .collection("members")
            .doc(uid)
            .get();
        if (!snap.exists)
            return null;
        return snap.data();
    }
    catch (err) {
        logger.error("getChannelMember failed", { channelId, uid, error: err });
        throw err;
    }
}
export async function upsertChannelMember(member) {
    try {
        const ref = db
            .collection(COLLECTIONS.CHANNELS)
            .doc(member.channelId)
            .collection("members")
            .doc(member.uid);
        await ref.set({
            ...member,
            joinedAt: member.joinedAt ?? Timestamp.now(),
        }, { merge: true });
    }
    catch (err) {
        logger.error("upsertChannelMember failed", { member, error: err });
        throw err;
    }
}
export async function markChannelRead(channelId, uid) {
    try {
        await db
            .collection(COLLECTIONS.CHANNELS)
            .doc(channelId)
            .collection("members")
            .doc(uid)
            .set({
            lastReadAt: Timestamp.now(),
            unreadCount: 0,
        }, { merge: true });
    }
    catch (err) {
        logger.error("markChannelRead failed", { channelId, uid, error: err });
        throw err;
    }
}
export async function incrementUnreadCount(channelId, excludeUid, workspaceId) {
    try {
        // Get all members except the sender
        const membersSnap = await db
            .collection(COLLECTIONS.CHANNELS)
            .doc(channelId)
            .collection("members")
            .where("uid", "!=", excludeUid)
            .get();
        if (membersSnap.empty)
            return;
        const batch = db.batch();
        for (const doc of membersSnap.docs) {
            batch.update(doc.ref, {
                unreadCount: FieldValue.increment(1),
            });
        }
        await batch.commit();
    }
    catch (err) {
        logger.error("incrementUnreadCount failed", { channelId, excludeUid, error: err });
        throw err;
    }
}
// ─── Seed default channels ────────────────────────────────────────────────────
export async function seedDefaultChannels(workspaceId, createdBy) {
    try {
        const { DEFAULT_CHANNELS } = await import("../types/channel");
        const batch = db.batch();
        const channels = [];
        const now = Timestamp.now();
        for (const template of DEFAULT_CHANNELS) {
            const channelId = generateChannelId();
            const channel = {
                ...template,
                channelId,
                workspaceId,
                createdBy,
                messageCount: 0,
                activeParticipantCount: 0,
                createdAt: now,
                updatedAt: now,
            };
            const ref = db.collection(COLLECTIONS.CHANNELS).doc(channelId);
            batch.set(ref, channel);
            channels.push(channel);
        }
        await batch.commit();
        logger.info("Default channels seeded", { workspaceId, count: channels.length });
        return channels;
    }
    catch (err) {
        logger.error("seedDefaultChannels failed", { workspaceId, error: err });
        throw err;
    }
}
// ─── Channel exists check ─────────────────────────────────────────────────────
export async function channelExists(workspaceId, name, type) {
    try {
        const snap = await db
            .collection(COLLECTIONS.CHANNELS)
            .where("workspaceId", "==", workspaceId)
            .where("name", "==", name.toLowerCase().replace(/\s+/g, "-"))
            .where("type", "==", type)
            .limit(1)
            .get();
        return !snap.empty;
    }
    catch (err) {
        logger.error("channelExists failed", { workspaceId, name, error: err });
        throw err;
    }
}
//# sourceMappingURL=channelRepository.js.map