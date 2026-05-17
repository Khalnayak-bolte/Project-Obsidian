/**
 * backend/services/notificationService.ts
 * Project: Obsidian
 */
import { createLogger } from "../utils/logger";
import { messaging, db, COLLECTIONS, Timestamp } from "../config/firebase";
import { sesClient, SES_CONFIG, sqsClient, SQS_CONFIG } from "../config/aws";
import { SendEmailCommand } from "@aws-sdk/client-ses";
import { SendMessageCommand } from "@aws-sdk/client-sqs";
import { generateId } from "../utils/helpers";
import { NOTIFICATION_TYPES } from "../utils/constants";
const logger = createLogger("notificationService");
// ─── FCM token management ─────────────────────────────────────────────────────
export async function registerFcmToken(uid, token, deviceId) {
    try {
        await db
            .collection(COLLECTIONS.USERS)
            .doc(uid)
            .collection("fcmTokens")
            .doc(deviceId)
            .set({ token, deviceId, registeredAt: Timestamp.now() }, { merge: true });
        logger.info("FCM token registered", { uid, deviceId });
    }
    catch (err) {
        logger.error("registerFcmToken failed", { uid, error: err });
    }
}
export async function removeFcmToken(uid, deviceId) {
    try {
        await db
            .collection(COLLECTIONS.USERS)
            .doc(uid)
            .collection("fcmTokens")
            .doc(deviceId)
            .delete();
    }
    catch (err) {
        logger.error("removeFcmToken failed", { uid, deviceId, error: err });
    }
}
async function getFcmTokens(uid) {
    try {
        const snap = await db
            .collection(COLLECTIONS.USERS)
            .doc(uid)
            .collection("fcmTokens")
            .get();
        return snap.docs.map((d) => d.data().token).filter(Boolean);
    }
    catch {
        return [];
    }
}
// ─── Store in-app notification ────────────────────────────────────────────────
async function storeNotification(payload) {
    try {
        const notificationId = generateId("ntf");
        const notification = {
            notificationId,
            type: payload.type,
            recipientUid: payload.recipientUid,
            workspaceId: payload.workspaceId,
            title: payload.title,
            body: payload.body,
            data: payload.data ?? {},
            isRead: false,
            createdAt: Timestamp.now(),
        };
        await db
            .collection(COLLECTIONS.NOTIFICATIONS)
            .doc(notificationId)
            .set(notification);
    }
    catch (err) {
        logger.error("storeNotification failed", { recipientUid: payload.recipientUid, error: err });
    }
}
// ─── Send FCM push notification ───────────────────────────────────────────────
async function sendPush(payload) {
    const tokens = await getFcmTokens(payload.recipientUid);
    if (tokens.length === 0)
        return;
    try {
        const response = await messaging.sendEachForMulticast({
            tokens,
            notification: { title: payload.title, body: payload.body },
            data: payload.data ?? {},
            android: { priority: "high" },
            apns: { payload: { aps: { sound: "default", badge: 1 } } },
        });
        // Remove stale tokens
        const staleTokens = [];
        response.responses.forEach((r, i) => {
            if (!r.success && r.error?.code === "messaging/registration-token-not-registered") {
                staleTokens.push(tokens[i]);
            }
        });
        if (staleTokens.length > 0) {
            const snap = await db
                .collection(COLLECTIONS.USERS)
                .doc(payload.recipientUid)
                .collection("fcmTokens")
                .where("token", "in", staleTokens)
                .get();
            const batch = db.batch();
            snap.docs.forEach((d) => batch.delete(d.ref));
            await batch.commit();
        }
    }
    catch (err) {
        logger.error("sendPush failed", { recipientUid: payload.recipientUid, error: err });
    }
}
// ─── Send email via SES ───────────────────────────────────────────────────────
async function sendEmail(to, subject, htmlBody) {
    try {
        await sesClient.send(new SendEmailCommand({
            Source: `${SES_CONFIG.fromName} <${SES_CONFIG.fromEmail}>`,
            Destination: { ToAddresses: [to] },
            Message: {
                Subject: { Data: subject, Charset: "UTF-8" },
                Body: {
                    Html: { Data: htmlBody, Charset: "UTF-8" },
                },
            },
        }));
    }
    catch (err) {
        logger.error("sendEmail failed", { to, subject, error: err });
    }
}
// ─── Queue notification via SQS ──────────────────────────────────────────────
async function queueNotification(payload) {
    if (!SQS_CONFIG.notificationQueue)
        return;
    try {
        await sqsClient.send(new SendMessageCommand({
            QueueUrl: SQS_CONFIG.notificationQueue,
            MessageBody: JSON.stringify(payload),
            MessageGroupId: payload.recipientUid,
            MessageDeduplicationId: `${payload.type}-${payload.recipientUid}-${Date.now()}`,
        }));
    }
    catch (err) {
        logger.error("queueNotification failed", { error: err });
    }
}
// ─── Core send notification ───────────────────────────────────────────────────
export async function sendNotification(payload) {
    await Promise.allSettled([
        storeNotification(payload),
        sendPush(payload),
    ]);
}
// ─── Notify mention ───────────────────────────────────────────────────────────
export async function notifyMention(params) {
    await sendNotification({
        type: NOTIFICATION_TYPES.MENTION,
        recipientUid: params.recipientUid,
        workspaceId: params.workspaceId,
        title: `${params.actorName} mentioned you in #${params.channelName}`,
        body: params.preview.slice(0, 100),
        channelId: params.channelId,
        messageId: params.messageId,
        actorName: params.actorName,
        data: {
            type: NOTIFICATION_TYPES.MENTION,
            channelId: params.channelId,
            messageId: params.messageId,
            workspaceId: params.workspaceId,
        },
    });
}
// ─── Notify voice invite ──────────────────────────────────────────────────────
export async function notifyVoiceInvite(params) {
    await sendNotification({
        type: NOTIFICATION_TYPES.VOICE_INVITE,
        recipientUid: params.recipientUid,
        workspaceId: params.workspaceId,
        title: `${params.actorName} is in #${params.channelName}`,
        body: "Click to join the voice channel",
        channelId: params.channelId,
        actorName: params.actorName,
        data: {
            type: NOTIFICATION_TYPES.VOICE_INVITE,
            channelId: params.channelId,
            workspaceId: params.workspaceId,
        },
    });
}
// ─── Notify workspace invite (email) ─────────────────────────────────────────
export async function notifyWorkspaceInvite(params) {
    const inviteUrl = `${process.env.FRONTEND_URL ?? "https://app.obsidian.work"}/invite/${params.inviteToken}`;
    const html = `
    <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; background: #0B0F19; color: #fff; padding: 40px; border-radius: 12px;">
      <h1 style="color: #6D5EF5; margin-bottom: 8px;">You're invited to Obsidian</h1>
      <p style="color: #9CA3AF;">${params.inviterName} has invited you to join <strong style="color:#fff">${params.workspaceName}</strong> on Obsidian.</p>
      <a href="${inviteUrl}" style="display:inline-block;margin-top:24px;padding:12px 28px;background:#6D5EF5;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;">
        Accept Invitation
      </a>
      <p style="color:#6B7280;font-size:12px;margin-top:32px;">This invite expires in 7 days. If you didn't expect this email, you can ignore it.</p>
    </div>
  `;
    await sendEmail(params.email, `${params.inviterName} invited you to ${params.workspaceName}`, html);
    logger.info("Workspace invite email sent", { email: params.email, workspaceName: params.workspaceName });
}
// ─── Notify billing alert ─────────────────────────────────────────────────────
export async function notifyBillingAlert(params) {
    await sendNotification({
        type: NOTIFICATION_TYPES.BILLING_ALERT,
        recipientUid: params.recipientUid,
        workspaceId: params.workspaceId,
        title: "Billing Alert",
        body: params.message,
        data: {
            type: NOTIFICATION_TYPES.BILLING_ALERT,
            workspaceId: params.workspaceId,
        },
    });
}
// ─── Notify member joined ─────────────────────────────────────────────────────
export async function notifyMemberJoined(params) {
    await sendNotification({
        type: NOTIFICATION_TYPES.MEMBER_JOIN,
        recipientUid: params.ownerUid,
        workspaceId: params.workspaceId,
        title: "New member joined",
        body: `${params.newMemberName} has joined your workspace`,
        data: {
            type: NOTIFICATION_TYPES.MEMBER_JOIN,
            workspaceId: params.workspaceId,
        },
    });
}
// ─── Notify role update ───────────────────────────────────────────────────────
export async function notifyRoleUpdate(params) {
    await sendNotification({
        type: NOTIFICATION_TYPES.ROLE_UPDATE,
        recipientUid: params.recipientUid,
        workspaceId: params.workspaceId,
        title: "Your role was updated",
        body: `You have been assigned the role: ${params.newRoleName}`,
        data: {
            type: NOTIFICATION_TYPES.ROLE_UPDATE,
            workspaceId: params.workspaceId,
        },
    });
}
// ─── Mark notification read ───────────────────────────────────────────────────
export async function markNotificationRead(notificationId, uid) {
    try {
        const ref = db.collection(COLLECTIONS.NOTIFICATIONS).doc(notificationId);
        const snap = await ref.get();
        if (!snap.exists || snap.data()?.recipientUid !== uid)
            return;
        await ref.update({ isRead: true, readAt: Timestamp.now() });
    }
    catch (err) {
        logger.error("markNotificationRead failed", { notificationId, uid, error: err });
    }
}
// ─── Mark all notifications read ─────────────────────────────────────────────
export async function markAllNotificationsRead(uid, workspaceId) {
    try {
        const snap = await db
            .collection(COLLECTIONS.NOTIFICATIONS)
            .where("recipientUid", "==", uid)
            .where("workspaceId", "==", workspaceId)
            .where("isRead", "==", false)
            .get();
        if (snap.empty)
            return;
        const batch = db.batch();
        snap.docs.forEach((d) => batch.update(d.ref, { isRead: true, readAt: Timestamp.now() }));
        await batch.commit();
    }
    catch (err) {
        logger.error("markAllNotificationsRead failed", { uid, error: err });
    }
}
// ─── Get notifications ────────────────────────────────────────────────────────
export async function getNotifications(uid, workspaceId, limit = 20) {
    try {
        const snap = await db
            .collection(COLLECTIONS.NOTIFICATIONS)
            .where("recipientUid", "==", uid)
            .where("workspaceId", "==", workspaceId)
            .orderBy("createdAt", "desc")
            .limit(limit)
            .get();
        return snap.docs.map((d) => d.data());
    }
    catch (err) {
        logger.error("getNotifications failed", { uid, error: err });
        return [];
    }
}
// ─── Get unread count ─────────────────────────────────────────────────────────
export async function getUnreadCount(uid, workspaceId) {
    try {
        const snap = await db
            .collection(COLLECTIONS.NOTIFICATIONS)
            .where("recipientUid", "==", uid)
            .where("workspaceId", "==", workspaceId)
            .where("isRead", "==", false)
            .count()
            .get();
        return snap.data().count;
    }
    catch {
        return 0;
    }
}
//# sourceMappingURL=notificationService.js.map