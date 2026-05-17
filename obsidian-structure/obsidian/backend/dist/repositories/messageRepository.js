/**
 * backend/repositories/messageRepository.ts
 * Project: Obsidian
 *
 * All Firestore read/write operations for the messages collection.
 * Covers message CRUD, reactions, pinning, pagination, and soft deletes.
 * No business logic lives here — only data access.
 */
import { db, COLLECTIONS, Timestamp } from "../config/firebase";
import { createLogger } from "../utils/logger";
import { generateMessageId } from "../utils/helpers";
const logger = createLogger("messageRepository");
// ─── Get message by ID ────────────────────────────────────────────────────────
export async function getMessageById(messageId) {
    try {
        const snap = await db
            .collection(COLLECTIONS.MESSAGES)
            .doc(messageId)
            .get();
        if (!snap.exists)
            return null;
        return { messageId: snap.id, ...snap.data() };
    }
    catch (err) {
        logger.error("getMessageById failed", { messageId, error: err });
        throw err;
    }
}
// ─── Get paginated messages for a channel ────────────────────────────────────
export async function getMessagesByChannel(channelId, workspaceId, limit = 50, cursor) {
    try {
        let query = db
            .collection(COLLECTIONS.MESSAGES)
            .where("channelId", "==", channelId)
            .where("workspaceId", "==", workspaceId)
            .where("status", "!=", "deleted")
            .orderBy("status")
            .orderBy("createdAt", "desc")
            .limit(limit + 1);
        if (cursor) {
            const cursorDoc = await db
                .collection(COLLECTIONS.MESSAGES)
                .doc(cursor)
                .get();
            if (cursorDoc.exists) {
                query = query.startAfter(cursorDoc);
            }
        }
        const snap = await query.get();
        const hasMore = snap.docs.length > limit;
        const docs = hasMore ? snap.docs.slice(0, limit) : snap.docs;
        const messages = docs.map((doc) => ({
            messageId: doc.id,
            ...doc.data(),
        }));
        return {
            messages,
            meta: {
                limit,
                hasMore,
                nextCursor: hasMore ? docs[docs.length - 1].id : undefined,
            },
        };
    }
    catch (err) {
        logger.error("getMessagesByChannel failed", { channelId, error: err });
        throw err;
    }
}
// ─── Get messages around a specific message (for jump-to) ────────────────────
export async function getMessagesAround(channelId, workspaceId, messageId, limit = 25) {
    try {
        const anchorDoc = await db
            .collection(COLLECTIONS.MESSAGES)
            .doc(messageId)
            .get();
        if (!anchorDoc.exists)
            return [];
        const [beforeSnap, afterSnap] = await Promise.all([
            db
                .collection(COLLECTIONS.MESSAGES)
                .where("channelId", "==", channelId)
                .where("workspaceId", "==", workspaceId)
                .orderBy("createdAt", "desc")
                .endBefore(anchorDoc)
                .limit(limit)
                .get(),
            db
                .collection(COLLECTIONS.MESSAGES)
                .where("channelId", "==", channelId)
                .where("workspaceId", "==", workspaceId)
                .orderBy("createdAt", "asc")
                .startAt(anchorDoc)
                .limit(limit + 1)
                .get(),
        ]);
        const before = beforeSnap.docs
            .reverse()
            .map((doc) => ({ messageId: doc.id, ...doc.data() }));
        const after = afterSnap.docs.map((doc) => ({
            messageId: doc.id,
            ...doc.data(),
        }));
        return [...before, ...after];
    }
    catch (err) {
        logger.error("getMessagesAround failed", { channelId, messageId, error: err });
        throw err;
    }
}
// ─── Create message ───────────────────────────────────────────────────────────
export async function createMessage(params) {
    try {
        const messageId = generateMessageId();
        const now = Timestamp.now();
        const message = {
            messageId,
            channelId: params.channelId,
            workspaceId: params.workspaceId,
            senderId: params.senderId,
            senderName: params.senderName,
            senderAvatarUrl: params.senderAvatarUrl,
            type: params.type,
            content: params.content,
            status: "sent",
            attachments: params.attachments ?? [],
            reactions: [],
            mentions: params.mentions ?? [],
            replyTo: params.replyTo,
            isPinned: false,
            isEdited: false,
            metadata: params.metadata,
            createdAt: now,
            updatedAt: now,
        };
        await db.collection(COLLECTIONS.MESSAGES).doc(messageId).set(message);
        logger.info("Message created", {
            messageId,
            channelId: params.channelId,
            senderId: params.senderId,
        });
        return message;
    }
    catch (err) {
        logger.error("createMessage failed", { ...params, error: err });
        throw err;
    }
}
// ─── Edit message ─────────────────────────────────────────────────────────────
export async function editMessage(messageId, content) {
    try {
        await db.collection(COLLECTIONS.MESSAGES).doc(messageId).update({
            content,
            isEdited: true,
            editedAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
        });
    }
    catch (err) {
        logger.error("editMessage failed", { messageId, error: err });
        throw err;
    }
}
// ─── Soft delete message ──────────────────────────────────────────────────────
export async function softDeleteMessage(messageId) {
    try {
        await db.collection(COLLECTIONS.MESSAGES).doc(messageId).update({
            status: "deleted",
            content: "",
            attachments: [],
            deletedAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
        });
    }
    catch (err) {
        logger.error("softDeleteMessage failed", { messageId, error: err });
        throw err;
    }
}
// ─── Hard delete message ──────────────────────────────────────────────────────
export async function hardDeleteMessage(messageId) {
    try {
        await db.collection(COLLECTIONS.MESSAGES).doc(messageId).delete();
        logger.info("Message hard deleted", { messageId });
    }
    catch (err) {
        logger.error("hardDeleteMessage failed", { messageId, error: err });
        throw err;
    }
}
// ─── Reactions ────────────────────────────────────────────────────────────────
export async function addReaction(messageId, emoji, uid) {
    try {
        const ref = db.collection(COLLECTIONS.MESSAGES).doc(messageId);
        await db.runTransaction(async (tx) => {
            const snap = await tx.get(ref);
            if (!snap.exists)
                throw new Error("Message not found");
            const data = snap.data();
            const reactions = data.reactions ?? [];
            const existing = reactions.find((r) => r.emoji === emoji);
            if (existing) {
                if (existing.reactedBy.includes(uid))
                    return; // already reacted
                existing.reactedBy.push(uid);
                existing.count += 1;
            }
            else {
                reactions.push({ emoji, count: 1, reactedBy: [uid] });
            }
            tx.update(ref, { reactions, updatedAt: Timestamp.now() });
        });
    }
    catch (err) {
        logger.error("addReaction failed", { messageId, emoji, uid, error: err });
        throw err;
    }
}
export async function removeReaction(messageId, emoji, uid) {
    try {
        const ref = db.collection(COLLECTIONS.MESSAGES).doc(messageId);
        await db.runTransaction(async (tx) => {
            const snap = await tx.get(ref);
            if (!snap.exists)
                throw new Error("Message not found");
            const data = snap.data();
            let reactions = data.reactions ?? [];
            reactions = reactions
                .map((r) => {
                if (r.emoji !== emoji)
                    return r;
                return {
                    ...r,
                    reactedBy: r.reactedBy.filter((id) => id !== uid),
                    count: r.count - 1,
                };
            })
                .filter((r) => r.count > 0);
            tx.update(ref, { reactions, updatedAt: Timestamp.now() });
        });
    }
    catch (err) {
        logger.error("removeReaction failed", { messageId, emoji, uid, error: err });
        throw err;
    }
}
// ─── Pin / unpin message ──────────────────────────────────────────────────────
export async function pinMessage(messageId, channelId, workspaceId, pinnedBy) {
    try {
        const messageSnap = await db
            .collection(COLLECTIONS.MESSAGES)
            .doc(messageId)
            .get();
        if (!messageSnap.exists)
            throw new Error("Message not found");
        const message = { messageId, ...messageSnap.data() };
        const now = Timestamp.now();
        const pinned = {
            messageId,
            channelId,
            workspaceId,
            pinnedBy,
            pinnedAt: now,
            message: {
                messageId: message.messageId,
                senderId: message.senderId,
                senderName: message.senderName,
                content: message.content.slice(0, 200),
                createdAt: message.createdAt,
            },
        };
        const batch = db.batch();
        // Mark message as pinned
        batch.update(db.collection(COLLECTIONS.MESSAGES).doc(messageId), {
            isPinned: true,
            updatedAt: now,
        });
        // Store in pinned subcollection on channel
        batch.set(db
            .collection(COLLECTIONS.CHANNELS)
            .doc(channelId)
            .collection("pinned")
            .doc(messageId), pinned);
        await batch.commit();
        return pinned;
    }
    catch (err) {
        logger.error("pinMessage failed", { messageId, error: err });
        throw err;
    }
}
export async function unpinMessage(messageId, channelId) {
    try {
        const batch = db.batch();
        batch.update(db.collection(COLLECTIONS.MESSAGES).doc(messageId), {
            isPinned: false,
            updatedAt: Timestamp.now(),
        });
        batch.delete(db
            .collection(COLLECTIONS.CHANNELS)
            .doc(channelId)
            .collection("pinned")
            .doc(messageId));
        await batch.commit();
    }
    catch (err) {
        logger.error("unpinMessage failed", { messageId, channelId, error: err });
        throw err;
    }
}
export async function getPinnedMessages(channelId) {
    try {
        const snap = await db
            .collection(COLLECTIONS.CHANNELS)
            .doc(channelId)
            .collection("pinned")
            .orderBy("pinnedAt", "desc")
            .get();
        return snap.docs.map((doc) => doc.data());
    }
    catch (err) {
        logger.error("getPinnedMessages failed", { channelId, error: err });
        throw err;
    }
}
// ─── Search messages ──────────────────────────────────────────────────────────
export async function searchMessages(workspaceId, channelId, query, limit = 20) {
    try {
        // Firestore doesn't support full-text search natively.
        // This is a basic prefix match — replace with Meilisearch/Algolia in Phase 3.
        const snap = await db
            .collection(COLLECTIONS.MESSAGES)
            .where("workspaceId", "==", workspaceId)
            .where("channelId", "==", channelId)
            .where("status", "!=", "deleted")
            .orderBy("status")
            .orderBy("createdAt", "desc")
            .limit(200) // fetch a batch and filter in memory
            .get();
        const lowerQuery = query.toLowerCase();
        const results = snap.docs
            .map((doc) => ({ messageId: doc.id, ...doc.data() }))
            .filter((msg) => msg.content.toLowerCase().includes(lowerQuery))
            .slice(0, limit);
        return results;
    }
    catch (err) {
        logger.error("searchMessages failed", { workspaceId, channelId, query, error: err });
        throw err;
    }
}
// ─── Bulk delete messages by channel ─────────────────────────────────────────
export async function deleteMessagesByChannel(channelId) {
    try {
        const snap = await db
            .collection(COLLECTIONS.MESSAGES)
            .where("channelId", "==", channelId)
            .get();
        if (snap.empty)
            return;
        // Firestore batch limit is 500
        const chunks = [];
        for (let i = 0; i < snap.docs.length; i += 500) {
            chunks.push(snap.docs.slice(i, i + 500));
        }
        for (const chunk of chunks) {
            const batch = db.batch();
            chunk.forEach((doc) => batch.delete(doc.ref));
            await batch.commit();
        }
        logger.info("Messages deleted by channel", {
            channelId,
            count: snap.docs.length,
        });
    }
    catch (err) {
        logger.error("deleteMessagesByChannel failed", { channelId, error: err });
        throw err;
    }
}
//# sourceMappingURL=messageRepository.js.map