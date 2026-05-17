/**
 * backend/events/firestoreTriggers.ts
 * Project: Obsidian
 *
 * Firebase Functions Firestore triggers — reacts to document writes in
 * Firestore to enforce denormalisation, run side-effects, and fan-out events.
 *
 * Each trigger is exported as a named Cloud Function.  Import these in your
 * Firebase Functions entry-point (functions/index.ts when deploying to
 * Firebase Functions v2).
 *
 * Trigger map:
 *   workspaces/{workspaceId}               onWorkspaceWrite
 *   users/{uid}                            onUserWrite
 *   messages/{messageId}                   onMessageCreate
 *   voiceSessions/{sessionId}              onVoiceSessionWrite
 *   subscriptions/{subscriptionId}         onSubscriptionWrite
 *   notifications/{notificationId}         onNotificationCreate
 */

import * as functions from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import { db, COLLECTIONS, Timestamp, FieldValue } from "../config/firebase";
import { createLogger } from "../utils/logger";
import {
  publishWorkspaceCreated,
  publishWorkspaceUpdated,
  publishSubscriptionUpdated,
  publishVoiceSessionEnded,
  publishMemberJoined,
} from "./eventBridge";
import {
  notifyMemberJoined,
  notifyBillingAlert,
  notifyRoleUpdate,
} from "../services/notificationService";
import { sweepStalePresence } from "../services/presenceService";

const logger = createLogger("firestoreTriggers");

// ─── Helpers ──────────────────────────────────────────────────────────────────

const safeParse = <T>(data: FirebaseFirestore.DocumentData | undefined): T =>
  (data ?? {}) as T;

const getDiff = (
  before: Record<string, unknown>,
  after: Record<string, unknown>
): string[] =>
  Object.keys(after).filter(
    (k) => JSON.stringify(before[k]) !== JSON.stringify(after[k])
  );

// ─── 1. Workspace trigger ─────────────────────────────────────────────────────

export const onWorkspaceWrite = functions.onDocumentWritten(
  `${COLLECTIONS.WORKSPACES}/{workspaceId}`,
  async (event) => {
    const { workspaceId } = event.params;
    const before = event.data?.before?.data() as Record<string, unknown> | undefined;
    const after = event.data?.after?.data() as Record<string, unknown> | undefined;

    try {
      // ── Created ──
      if (!before && after) {
        logger.info("Workspace created", { workspaceId });

        await publishWorkspaceCreated({
          workspaceId,
          ownerId: after.ownerId as string,
          tier: after.tier as string,
          name: after.name as string,
        });

        // Seed default role docs so the workspace is immediately usable
        const defaultRoles = [
          {
            roleId: `role_owner_${workspaceId}`,
            workspaceId,
            name: "Owner",
            color: "#6D5EF5",
            isDefault: false,
            isSystem: true,
            permissions: {
              manage_workspace: true,
              manage_roles: true,
              manage_billing: true,
              create_channels: true,
              delete_channels: true,
              join_voice: true,
              mute_members: true,
              kick_members: true,
              upload_files: true,
              delete_messages: true,
              ban_members: true,
            },
            position: 0,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
          },
          {
            roleId: `role_member_${workspaceId}`,
            workspaceId,
            name: "Member",
            color: "#9CA3AF",
            isDefault: true,
            isSystem: true,
            permissions: {
              manage_workspace: false,
              manage_roles: false,
              manage_billing: false,
              create_channels: false,
              delete_channels: false,
              join_voice: true,
              mute_members: false,
              kick_members: false,
              upload_files: true,
              delete_messages: false,
              ban_members: false,
            },
            position: 99,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
          },
        ];

        const batch = db.batch();
        for (const role of defaultRoles) {
          const ref = db.collection(COLLECTIONS.ROLES).doc(role.roleId);
          batch.set(ref, role);
        }
        await batch.commit();

        logger.info("Default roles seeded", { workspaceId });
        return;
      }

      // ── Updated ──
      if (before && after) {
        const changedFields = getDiff(before, after);
        if (changedFields.length === 0) return;

        logger.info("Workspace updated", { workspaceId, changedFields });

        await publishWorkspaceUpdated({
          workspaceId,
          updatedFields: changedFields,
          updatedBy: (after.updatedBy as string) ?? "system",
        });

        // If workspace was suspended, mark all members offline
        if (
          before.status !== "suspended" &&
          after.status === "suspended"
        ) {
          const membersSnap = await db
            .collection(COLLECTIONS.USERS)
            .where("workspaceId", "==", workspaceId)
            .where("presenceStatus", "!=", "offline")
            .get();

          if (!membersSnap.empty) {
            const batch = db.batch();
            membersSnap.docs.forEach((d) =>
              batch.update(d.ref, { presenceStatus: "offline" })
            );
            await batch.commit();
            logger.info("Members marked offline after suspension", {
              count: membersSnap.size,
              workspaceId,
            });
          }
        }
        return;
      }

      // ── Deleted ──
      if (before && !after) {
        logger.info("Workspace deleted", { workspaceId });
        // Cascade cleanup handled by cleanup queue messages
      }
    } catch (err) {
      logger.error("onWorkspaceWrite failed", err, { workspaceId });
    }
  }
);

// ─── 2. User / member trigger ─────────────────────────────────────────────────

export const onUserWrite = functions.onDocumentWritten(
  `${COLLECTIONS.USERS}/{uid}`,
  async (event) => {
    const { uid } = event.params;
    const before = event.data?.before?.data() as Record<string, unknown> | undefined;
    const after = event.data?.after?.data() as Record<string, unknown> | undefined;

    try {
      // ── Member joined workspace for the first time ──
      if (!before && after) {
        const workspaceId = after.workspaceId as string;
        const displayName = after.displayName as string;

        logger.info("User document created", { uid, workspaceId });

        // Fetch workspace owner to notify
        const wsSnap = await db
          .collection(COLLECTIONS.WORKSPACES)
          .doc(workspaceId)
          .get();

        if (wsSnap.exists) {
          const ownerId = wsSnap.data()?.ownerId as string;

          // Don't notify owner joining their own workspace
          if (ownerId && ownerId !== uid) {
            await notifyMemberJoined({
              ownerUid: ownerId,
              workspaceId,
              newMemberName: displayName,
            });
          }

          await publishMemberJoined({
            workspaceId,
            uid,
            email: after.email as string,
            roleId: after.roleId as string,
          });
        }

        // Increment workspace memberCount
        await db
          .collection(COLLECTIONS.WORKSPACES)
          .doc(workspaceId)
          .update({ memberCount: FieldValue.increment(1) });

        return;
      }

      // ── Role changed ──
      if (before && after) {
        const prevRole = before.roleId as string;
        const newRole = after.roleId as string;
        const workspaceId = after.workspaceId as string;

        if (prevRole && newRole && prevRole !== newRole) {
          logger.info("Member role changed", { uid, prevRole, newRole });

          // Resolve role name for notification
          const roleSnap = await db
            .collection(COLLECTIONS.ROLES)
            .doc(newRole)
            .get();
          const roleName = (roleSnap.data()?.name as string) ?? newRole;

          await notifyRoleUpdate({
            recipientUid: uid,
            workspaceId,
            newRoleName: roleName,
          });
        }
        return;
      }

      // ── User left / removed ──
      if (before && !after) {
        const workspaceId = before.workspaceId as string;
        logger.info("User document deleted", { uid, workspaceId });

        await db
          .collection(COLLECTIONS.WORKSPACES)
          .doc(workspaceId)
          .update({ memberCount: FieldValue.increment(-1) });
      }
    } catch (err) {
      logger.error("onUserWrite failed", err, { uid });
    }
  }
);

// ─── 3. Message create trigger ────────────────────────────────────────────────

export const onMessageCreate = functions.onDocumentCreated(
  `${COLLECTIONS.MESSAGES}/{messageId}`,
  async (event) => {
    const { messageId } = event.params;
    const data = event.data?.data() as Record<string, unknown> | undefined;
    if (!data) return;

    const channelId = data.channelId as string;
    const workspaceId = data.workspaceId as string;
    const senderId = data.senderId as string;

    try {
      logger.info("Message created trigger", { messageId, channelId });

      // Update channel's lastMessageAt and lastMessagePreview for sidebar
      await db
        .collection(COLLECTIONS.CHANNELS)
        .doc(channelId)
        .update({
          lastMessageAt: Timestamp.now(),
          lastMessagePreview: ((data.content as string) ?? "").slice(0, 80),
          lastMessageSenderId: senderId,
          messageCount: FieldValue.increment(1),
        });

      // Parse @mentions from message content
      const content = (data.content as string) ?? "";
      const mentionPattern = /@\[([^\]]+)\]\(([^)]+)\)/g; // @[DisplayName](uid)
      const mentions: Array<{ uid: string; name: string }> = [];
      let match: RegExpExecArray | null;

      while ((match = mentionPattern.exec(content)) !== null) {
        mentions.push({ name: match[1], uid: match[2] });
      }

      // Deduplicate and exclude sender from their own mention notifications
      const uniqueMentions = mentions.filter(
        (m, i, arr) =>
          m.uid !== senderId && arr.findIndex((x) => x.uid === m.uid) === i
      );

      if (uniqueMentions.length > 0) {
        // Fetch sender display name
        const senderSnap = await db
          .collection(COLLECTIONS.USERS)
          .doc(senderId)
          .get();
        const senderName = (senderSnap.data()?.displayName as string) ?? "Someone";

        // Fetch channel name
        const channelSnap = await db
          .collection(COLLECTIONS.CHANNELS)
          .doc(channelId)
          .get();
        const channelName = (channelSnap.data()?.name as string) ?? "a channel";

        const preview = content.replace(/@\[[^\]]+\]\([^)]+\)/g, (m) =>
          m.replace(/\[([^\]]+)\].*/, "@$1")
        );

        // Fan-out mention notifications concurrently
        await Promise.allSettled(
          uniqueMentions.map(({ uid }) =>
            db.collection(COLLECTIONS.NOTIFICATIONS).add({
              notificationId: db.collection(COLLECTIONS.NOTIFICATIONS).doc().id,
              type: "mention",
              recipientUid: uid,
              workspaceId,
              title: `${senderName} mentioned you in #${channelName}`,
              body: preview.slice(0, 100),
              data: {
                type: "mention",
                channelId,
                messageId,
                workspaceId,
              },
              isRead: false,
              createdAt: Timestamp.now(),
            })
          )
        );

        logger.info("Mention notifications queued", {
          count: uniqueMentions.length,
          messageId,
        });
      }
    } catch (err) {
      logger.error("onMessageCreate failed", err, { messageId, channelId });
    }
  }
);

// ─── 4. Voice session trigger ─────────────────────────────────────────────────

export const onVoiceSessionWrite = functions.onDocumentWritten(
  `${COLLECTIONS.VOICE_SESSIONS}/{sessionId}`,
  async (event) => {
    const { sessionId } = event.params;
    const before = event.data?.before?.data() as Record<string, unknown> | undefined;
    const after = event.data?.after?.data() as Record<string, unknown> | undefined;

    try {
      // ── Session ended ──
      const wasActive =
        before?.status === "active" || before?.status === "connecting";
      const isEnded = after?.status === "ended" || (!after && before);

      if (wasActive && isEnded) {
        const sessionData = before!;
        const startedAt = (sessionData.startedAt as admin.firestore.Timestamp)
          ?.toMillis() ?? Date.now();
        const durationSeconds = Math.floor((Date.now() - startedAt) / 1000);

        logger.info("Voice session ended", {
          sessionId,
          channelId: sessionData.channelId,
          durationSeconds,
        });

        await publishVoiceSessionEnded({
          workspaceId: sessionData.workspaceId as string,
          channelId: sessionData.channelId as string,
          chimeMeetingId: sessionData.chimeMeetingId as string,
          durationSeconds,
          peakParticipants: (sessionData.peakParticipants as number) ?? 0,
          endedAt: new Date().toISOString(),
        });

        // Clear the Chime meeting ID from the channel so it's joinable again
        if (sessionData.channelId) {
          await db
            .collection(COLLECTIONS.CHANNELS)
            .doc(sessionData.channelId as string)
            .update({ chimeMeetingId: null, activeVoiceCount: 0 });
        }
      }

      // ── Participant count changed ──
      if (before && after && before.participantCount !== after.participantCount) {
        const current = (after.participantCount as number) ?? 0;
        const peak = (after.peakParticipants as number) ?? 0;

        if (current > peak) {
          await event.data!.after!.ref.update({
            peakParticipants: current,
          });
        }
      }
    } catch (err) {
      logger.error("onVoiceSessionWrite failed", err, { sessionId });
    }
  }
);

// ─── 5. Subscription trigger ──────────────────────────────────────────────────

export const onSubscriptionWrite = functions.onDocumentWritten(
  `${COLLECTIONS.SUBSCRIPTIONS}/{subscriptionId}`,
  async (event) => {
    const { subscriptionId } = event.params;
    const before = event.data?.before?.data() as Record<string, unknown> | undefined;
    const after = event.data?.after?.data() as Record<string, unknown> | undefined;

    try {
      if (!after) return; // deletion — nothing to do

      const workspaceId = after.workspaceId as string;
      const newTier = after.tier as string;
      const newStatus = after.status as string;
      const prevTier = (before?.tier as string) ?? newTier;
      const prevStatus = (before?.status as string) ?? newStatus;

      const tierChanged = prevTier !== newTier;
      const statusChanged = prevStatus !== newStatus;

      if (!tierChanged && !statusChanged) return;

      logger.info("Subscription changed", {
        subscriptionId,
        workspaceId,
        prevTier,
        newTier,
        prevStatus,
        newStatus,
      });

      // Keep workspace.tier in sync
      await db
        .collection(COLLECTIONS.WORKSPACES)
        .doc(workspaceId)
        .update({
          tier: newTier,
          subscriptionStatus: newStatus,
          updatedAt: Timestamp.now(),
        });

      await publishSubscriptionUpdated({
        workspaceId,
        previousTier: prevTier,
        newTier,
        subscriptionStatus: newStatus,
        razorpaySubscriptionId: (after.razorpaySubscriptionId as string) ?? "",
      });

      // Notify workspace owner of billing status changes
      if (statusChanged) {
        const wsSnap = await db
          .collection(COLLECTIONS.WORKSPACES)
          .doc(workspaceId)
          .get();

        const ownerId = wsSnap.data()?.ownerId as string;
        if (!ownerId) return;

        let alertMessage = "";

        if (newStatus === "past_due") {
          alertMessage =
            "Your payment is past due. Please update your payment method to avoid service interruption.";
        } else if (newStatus === "cancelled") {
          alertMessage =
            "Your subscription has been cancelled. Your workspace will be downgraded at the end of the billing period.";
        } else if (newStatus === "active" && prevStatus === "past_due") {
          alertMessage = "Your payment was successful. Service has been restored.";
        } else if (newStatus === "paused") {
          alertMessage =
            "Your subscription has been paused. Voice rooms and file uploads are temporarily unavailable.";
        }

        if (alertMessage) {
          await notifyBillingAlert({
            recipientUid: ownerId,
            workspaceId,
            message: alertMessage,
          });
        }
      }
    } catch (err) {
      logger.error("onSubscriptionWrite failed", err, { subscriptionId });
    }
  }
);

// ─── 6. Notification create trigger ──────────────────────────────────────────

export const onNotificationCreate = functions.onDocumentCreated(
  `${COLLECTIONS.NOTIFICATIONS}/{notificationId}`,
  async (event) => {
    const { notificationId } = event.params;
    const data = event.data?.data() as Record<string, unknown> | undefined;
    if (!data) return;

    const recipientUid = data.recipientUid as string;
    const workspaceId = data.workspaceId as string;

    try {
      logger.info("Notification created", { notificationId, recipientUid });

      // Increment unread badge count on the user document
      await db
        .collection(COLLECTIONS.USERS)
        .doc(recipientUid)
        .update({
          [`unreadCounts.${workspaceId}`]: FieldValue.increment(1),
        });
    } catch (err) {
      logger.error("onNotificationCreate failed", err, {
        notificationId,
        recipientUid,
      });
    }
  }
);

// ─── 7. Scheduled: Sweep stale presence ──────────────────────────────────────
// Exported as a scheduled function — runs every 2 minutes in Firebase Functions.
// Wire this in your functions/index.ts:
//   export { scheduledPresenceSweep } from "../events/firestoreTriggers";

export const scheduledPresenceSweep = functions.onDocumentUpdated(
  // Triggered by a sentinel document that a Cloud Scheduler job touches
  // every 2 minutes: schedulers/presence_sweep
  "schedulers/presence_sweep",
  async (_event) => {
    try {
      logger.info("Scheduled presence sweep started");
      const result = await sweepStalePresence();
      logger.info("Presence sweep completed", result);
    } catch (err) {
      logger.error("scheduledPresenceSweep failed", err);
    }
  }
);
