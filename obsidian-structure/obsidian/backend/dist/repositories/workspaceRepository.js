/**
 * backend/repositories/workspaceRepository.ts
 * Project: Obsidian
 *
 * All Firestore read/write operations for the workspaces collection.
 * Covers workspace lifecycle, invite management, storage tracking,
 * and subscription status updates.
 * No business logic lives here — only data access.
 */
import { db, COLLECTIONS, FieldValue, Timestamp } from "../config/firebase";
import { createLogger } from "../utils/logger";
import { generateWorkspaceId, generateSlug, generateUniqueSlug, generateInviteId } from "../utils/helpers";
const logger = createLogger("workspaceRepository");
// ─── Default workspace settings ───────────────────────────────────────────────
const DEFAULT_SETTINGS = {
    allowGuestAccess: false,
    requireEmailVerification: true,
    defaultRoleId: "role_member",
    notificationsEnabled: true,
    allowMemberInvites: false,
};
// ─── Get workspace by ID ──────────────────────────────────────────────────────
export async function getWorkspaceById(workspaceId) {
    try {
        const snap = await db
            .collection(COLLECTIONS.WORKSPACES)
            .doc(workspaceId)
            .get();
        if (!snap.exists)
            return null;
        return { workspaceId: snap.id, ...snap.data() };
    }
    catch (err) {
        logger.error("getWorkspaceById failed", { workspaceId, error: err });
        throw err;
    }
}
// ─── Get workspace by slug ────────────────────────────────────────────────────
export async function getWorkspaceBySlug(slug) {
    try {
        const snap = await db
            .collection(COLLECTIONS.WORKSPACES)
            .where("slug", "==", slug)
            .where("status", "!=", "deleted")
            .limit(1)
            .get();
        if (snap.empty)
            return null;
        const doc = snap.docs[0];
        return { workspaceId: doc.id, ...doc.data() };
    }
    catch (err) {
        logger.error("getWorkspaceBySlug failed", { slug, error: err });
        throw err;
    }
}
// ─── Get workspaces by owner ──────────────────────────────────────────────────
export async function getWorkspacesByOwner(ownerId) {
    try {
        const snap = await db
            .collection(COLLECTIONS.WORKSPACES)
            .where("ownerId", "==", ownerId)
            .where("status", "!=", "deleted")
            .orderBy("createdAt", "desc")
            .get();
        return snap.docs.map((doc) => ({ workspaceId: doc.id, ...doc.data() }));
    }
    catch (err) {
        logger.error("getWorkspacesByOwner failed", { ownerId, error: err });
        throw err;
    }
}
// ─── Check slug availability ──────────────────────────────────────────────────
export async function isSlugAvailable(slug) {
    try {
        const snap = await db
            .collection(COLLECTIONS.WORKSPACES)
            .where("slug", "==", slug)
            .limit(1)
            .get();
        return snap.empty;
    }
    catch (err) {
        logger.error("isSlugAvailable failed", { slug, error: err });
        throw err;
    }
}
// ─── Generate unique slug ─────────────────────────────────────────────────────
export async function generateAvailableSlug(name) {
    const base = generateSlug(name);
    // Try the clean slug first
    if (await isSlugAvailable(base))
        return base;
    // Append random suffix until unique (max 5 attempts)
    for (let i = 0; i < 5; i++) {
        const candidate = generateUniqueSlug(name);
        if (await isSlugAvailable(candidate))
            return candidate;
    }
    // Fallback — timestamp-based suffix
    return `${base}-${Date.now().toString(36)}`;
}
export async function createWorkspace(params) {
    const workspaceId = generateWorkspaceId();
    const slug = await generateAvailableSlug(params.name);
    const now = Timestamp.now();
    const workspace = {
        workspaceId,
        name: params.name.trim(),
        slug,
        ownerId: params.ownerId,
        tier: params.tier ?? "gold",
        subscriptionStatus: "trialing",
        memberCount: 1,
        storageUsed: 0,
        avatarUrl: params.avatarUrl,
        industry: params.industry,
        status: "active",
        settings: { ...DEFAULT_SETTINGS },
        createdAt: now,
        updatedAt: now,
    };
    try {
        await db
            .collection(COLLECTIONS.WORKSPACES)
            .doc(workspaceId)
            .set(workspace);
        logger.info("Workspace created", { workspaceId, slug, ownerId: params.ownerId });
        return workspace;
    }
    catch (err) {
        logger.error("createWorkspace failed", { params, error: err });
        throw err;
    }
}
export async function updateWorkspace(workspaceId, params) {
    const updates = {
        updatedAt: FieldValue.serverTimestamp(),
    };
    if (params.name !== undefined) {
        updates.name = params.name.trim();
        updates.slug = await generateAvailableSlug(params.name);
    }
    if (params.avatarUrl !== undefined)
        updates.avatarUrl = params.avatarUrl;
    if (params.industry !== undefined)
        updates.industry = params.industry;
    if (params.status !== undefined)
        updates.status = params.status;
    if (params.ownerId !== undefined)
        updates.ownerId = params.ownerId;
    // Merge settings fields individually to avoid overwriting unrelated keys
    if (params.settings) {
        for (const [key, value] of Object.entries(params.settings)) {
            updates[`settings.${key}`] = value;
        }
    }
    try {
        await db
            .collection(COLLECTIONS.WORKSPACES)
            .doc(workspaceId)
            .update(updates);
        logger.info("Workspace updated", { workspaceId });
    }
    catch (err) {
        logger.error("updateWorkspace failed", { workspaceId, error: err });
        throw err;
    }
}
// ─── Soft-delete workspace ────────────────────────────────────────────────────
export async function softDeleteWorkspace(workspaceId) {
    try {
        await db
            .collection(COLLECTIONS.WORKSPACES)
            .doc(workspaceId)
            .update({
            status: "deleted",
            updatedAt: FieldValue.serverTimestamp(),
        });
        logger.info("Workspace soft-deleted", { workspaceId });
    }
    catch (err) {
        logger.error("softDeleteWorkspace failed", { workspaceId, error: err });
        throw err;
    }
}
// ─── Subscription / tier updates ─────────────────────────────────────────────
export async function updateWorkspaceTier(workspaceId, tier, subscriptionStatus, subscriptionId) {
    try {
        const updates = {
            tier,
            subscriptionStatus,
            updatedAt: FieldValue.serverTimestamp(),
        };
        if (subscriptionId !== undefined)
            updates.subscriptionId = subscriptionId;
        await db
            .collection(COLLECTIONS.WORKSPACES)
            .doc(workspaceId)
            .update(updates);
        logger.info("Workspace tier updated", { workspaceId, tier, subscriptionStatus });
    }
    catch (err) {
        logger.error("updateWorkspaceTier failed", { workspaceId, tier, error: err });
        throw err;
    }
}
export async function updateSubscriptionStatus(workspaceId, subscriptionStatus) {
    try {
        await db
            .collection(COLLECTIONS.WORKSPACES)
            .doc(workspaceId)
            .update({
            subscriptionStatus,
            updatedAt: FieldValue.serverTimestamp(),
        });
    }
    catch (err) {
        logger.error("updateSubscriptionStatus failed", { workspaceId, subscriptionStatus, error: err });
        throw err;
    }
}
// ─── Member count ─────────────────────────────────────────────────────────────
export async function incrementMemberCount(workspaceId, delta) {
    try {
        await db
            .collection(COLLECTIONS.WORKSPACES)
            .doc(workspaceId)
            .update({
            memberCount: FieldValue.increment(delta),
            updatedAt: FieldValue.serverTimestamp(),
        });
    }
    catch (err) {
        logger.error("incrementMemberCount failed", { workspaceId, delta, error: err });
        throw err;
    }
}
// ─── Storage tracking ─────────────────────────────────────────────────────────
export async function incrementStorageUsed(workspaceId, bytes) {
    try {
        await db
            .collection(COLLECTIONS.WORKSPACES)
            .doc(workspaceId)
            .update({
            storageUsed: FieldValue.increment(bytes),
            updatedAt: FieldValue.serverTimestamp(),
        });
    }
    catch (err) {
        logger.error("incrementStorageUsed failed", { workspaceId, bytes, error: err });
        throw err;
    }
}
// ─── Invites ──────────────────────────────────────────────────────────────────
const INVITES_COLLECTION = "invites"; // sub-collection under workspaces
export async function createInvite(params) {
    const inviteId = generateInviteId();
    const now = Timestamp.now();
    const invite = {
        inviteId,
        workspaceId: params.workspaceId,
        invitedByUid: params.invitedByUid,
        email: params.email.toLowerCase().trim(),
        roleId: params.roleId,
        status: "pending",
        token: params.hashedToken,
        expiresAt: params.expiresAt,
        createdAt: now,
        updatedAt: now,
    };
    try {
        await db
            .collection(COLLECTIONS.WORKSPACES)
            .doc(params.workspaceId)
            .collection(INVITES_COLLECTION)
            .doc(inviteId)
            .set(invite);
        logger.info("Invite created", { inviteId, workspaceId: params.workspaceId, email: params.email });
        return invite;
    }
    catch (err) {
        logger.error("createInvite failed", { params, error: err });
        throw err;
    }
}
export async function getInviteByToken(workspaceId, hashedToken) {
    try {
        const snap = await db
            .collection(COLLECTIONS.WORKSPACES)
            .doc(workspaceId)
            .collection(INVITES_COLLECTION)
            .where("token", "==", hashedToken)
            .where("status", "==", "pending")
            .limit(1)
            .get();
        if (snap.empty)
            return null;
        return snap.docs[0].data();
    }
    catch (err) {
        logger.error("getInviteByToken failed", { workspaceId, error: err });
        throw err;
    }
}
export async function getInviteByEmail(workspaceId, email) {
    try {
        const snap = await db
            .collection(COLLECTIONS.WORKSPACES)
            .doc(workspaceId)
            .collection(INVITES_COLLECTION)
            .where("email", "==", email.toLowerCase().trim())
            .where("status", "==", "pending")
            .limit(1)
            .get();
        if (snap.empty)
            return null;
        return snap.docs[0].data();
    }
    catch (err) {
        logger.error("getInviteByEmail failed", { workspaceId, email, error: err });
        throw err;
    }
}
export async function updateInviteStatus(workspaceId, inviteId, status) {
    try {
        await db
            .collection(COLLECTIONS.WORKSPACES)
            .doc(workspaceId)
            .collection(INVITES_COLLECTION)
            .doc(inviteId)
            .update({
            status,
            updatedAt: FieldValue.serverTimestamp(),
        });
    }
    catch (err) {
        logger.error("updateInviteStatus failed", { workspaceId, inviteId, status, error: err });
        throw err;
    }
}
export async function listPendingInvites(workspaceId) {
    try {
        const snap = await db
            .collection(COLLECTIONS.WORKSPACES)
            .doc(workspaceId)
            .collection(INVITES_COLLECTION)
            .where("status", "==", "pending")
            .orderBy("createdAt", "desc")
            .get();
        return snap.docs.map((doc) => doc.data());
    }
    catch (err) {
        logger.error("listPendingInvites failed", { workspaceId, error: err });
        throw err;
    }
}
export async function expireStaleInvites(workspaceId) {
    const now = Timestamp.now();
    try {
        const snap = await db
            .collection(COLLECTIONS.WORKSPACES)
            .doc(workspaceId)
            .collection(INVITES_COLLECTION)
            .where("status", "==", "pending")
            .where("expiresAt", "<=", now)
            .get();
        if (snap.empty)
            return 0;
        const batch = db.batch();
        snap.docs.forEach((doc) => batch.update(doc.ref, {
            status: "expired",
            updatedAt: FieldValue.serverTimestamp(),
        }));
        await batch.commit();
        logger.info("Stale invites expired", { workspaceId, count: snap.size });
        return snap.size;
    }
    catch (err) {
        logger.error("expireStaleInvites failed", { workspaceId, error: err });
        throw err;
    }
}
//# sourceMappingURL=workspaceRepository.js.map