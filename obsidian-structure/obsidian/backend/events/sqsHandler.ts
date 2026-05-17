/**
 * backend/events/sqsHandler.ts
 * Project: Obsidian
 *
 * SQS Lambda consumer — processes notification, email, and cleanup queues.
 * Handles batch records with per-message error isolation so one bad message
 * doesn't poison the entire batch.
 */

import {
  DeleteMessageCommand,
  ChangeMessageVisibilityCommand,
} from "@aws-sdk/client-sqs";
import { sqsClient, SQS_CONFIG, SES_CONFIG, sesClient } from "../config/aws";
import { db, COLLECTIONS, Timestamp } from "../config/firebase";
import { createLogger } from "../utils/logger";
import { NOTIFICATION_TYPES } from "../utils/constants";
import type { NotificationType } from "../utils/constants";
import {
  sendNotification,
  notifyBillingAlert,
  notifyMemberJoined,
  notifyRoleUpdate,
} from "../services/notificationService";
import { SendEmailCommand } from "@aws-sdk/client-ses";

const logger = createLogger("sqsHandler");

// ─── SQS Lambda Event Types ───────────────────────────────────────────────────

export interface SQSRecord {
  messageId: string;
  receiptHandle: string;
  body: string;
  attributes: {
    ApproximateReceiveCount: string;
    SentTimestamp: string;
    SenderId: string;
    ApproximateFirstReceiveTimestamp: string;
  };
  messageAttributes: Record<string, { stringValue?: string; dataType: string }>;
  eventSource: string;
  eventSourceARN: string;
  awsRegion: string;
}

export interface SQSEvent {
  Records: SQSRecord[];
}

export interface SQSBatchResponse {
  batchItemFailures: Array<{ itemIdentifier: string }>;
}

// ─── Queue Message Schemas ────────────────────────────────────────────────────

export interface NotificationQueueMessage {
  type: NotificationType;
  recipientUid: string;
  workspaceId: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  channelId?: string;
  messageId?: string;
  actorId?: string;
  actorName?: string;
}

export interface EmailQueueMessage {
  to: string;
  subject: string;
  htmlBody: string;
  textBody?: string;
  replyTo?: string;
  workspaceId?: string;
  emailType:
    | "workspace_invite"
    | "billing_receipt"
    | "billing_alert"
    | "password_reset"
    | "system";
}

export interface CleanupQueueMessage {
  task:
    | "purge_voice_session"
    | "delete_expired_invites"
    | "cleanup_stale_presence"
    | "archive_old_notifications"
    | "delete_orphan_files";
  workspaceId?: string;
  payload: Record<string, string | number | boolean>;
}

type QueueMessage =
  | NotificationQueueMessage
  | EmailQueueMessage
  | CleanupQueueMessage;

// ─── Per-Message Processors ───────────────────────────────────────────────────

const processNotificationMessage = async (
  msg: NotificationQueueMessage
): Promise<void> => {
  logger.info("Processing notification message", {
    type: msg.type,
    recipientUid: msg.recipientUid,
    workspaceId: msg.workspaceId,
  });

  await sendNotification({
    type: msg.type,
    recipientUid: msg.recipientUid,
    workspaceId: msg.workspaceId,
    title: msg.title,
    body: msg.body,
    data: msg.data,
    channelId: msg.channelId,
    messageId: msg.messageId,
    actorId: msg.actorId,
    actorName: msg.actorName,
  });
};

const processEmailMessage = async (
  msg: EmailQueueMessage
): Promise<void> => {
  logger.info("Processing email message", {
    to: msg.to,
    emailType: msg.emailType,
    subject: msg.subject,
  });

  await sesClient.send(
    new SendEmailCommand({
      Source: `${SES_CONFIG.fromName} <${SES_CONFIG.fromEmail}>`,
      Destination: { ToAddresses: [msg.to] },
      ReplyToAddresses: msg.replyTo ? [msg.replyTo] : undefined,
      Message: {
        Subject: { Data: msg.subject, Charset: "UTF-8" },
        Body: {
          Html: { Data: msg.htmlBody, Charset: "UTF-8" },
          ...(msg.textBody && {
            Text: { Data: msg.textBody, Charset: "UTF-8" },
          }),
        },
      },
    })
  );

  logger.info("Email sent via SES", { to: msg.to, emailType: msg.emailType });
};

const processCleanupMessage = async (
  msg: CleanupQueueMessage
): Promise<void> => {
  logger.info("Processing cleanup task", {
    task: msg.task,
    workspaceId: msg.workspaceId,
  });

  switch (msg.task) {
    case "purge_voice_session": {
      const { chimeMeetingId, channelId } = msg.payload as {
        chimeMeetingId: string;
        channelId: string;
      };

      if (!chimeMeetingId || !channelId) break;

      // Mark voice session as ended in Firestore
      const sessionSnap = await db
        .collection(COLLECTIONS.VOICE_SESSIONS)
        .where("chimeMeetingId", "==", chimeMeetingId)
        .limit(1)
        .get();

      if (!sessionSnap.empty) {
        await sessionSnap.docs[0].ref.update({
          status: "ended",
          endedAt: Timestamp.now(),
        });
      }

      // Clear chimeMeetingId from channel
      await db
        .collection(COLLECTIONS.CHANNELS)
        .doc(channelId)
        .update({ chimeMeetingId: null });

      logger.info("Voice session purged", { chimeMeetingId, channelId });
      break;
    }

    case "delete_expired_invites": {
      const workspaceId = msg.workspaceId;
      if (!workspaceId) break;

      const now = Timestamp.now();
      const expiredSnap = await db
        .collection(COLLECTIONS.USERS) // invites sub-collection lives here conceptually
        .where("workspaceId", "==", workspaceId)
        .where("status", "==", "pending")
        .where("expiresAt", "<=", now)
        .limit(100)
        .get();

      if (!expiredSnap.empty) {
        const batch = db.batch();
        expiredSnap.docs.forEach((d) =>
          batch.update(d.ref, { status: "expired" })
        );
        await batch.commit();
        logger.info("Expired invites marked", {
          count: expiredSnap.size,
          workspaceId,
        });
      }
      break;
    }

    case "cleanup_stale_presence": {
      const workspaceId = msg.workspaceId;
      if (!workspaceId) break;

      const staleThreshold = Timestamp.fromMillis(
        Date.now() - 2 * 60 * 1000 // 2 minutes without heartbeat = stale
      );

      const staleSnap = await db
        .collection(COLLECTIONS.USERS)
        .where("workspaceId", "==", workspaceId)
        .where("presenceStatus", "!=", "offline")
        .where("lastSeen", "<", staleThreshold)
        .limit(50)
        .get();

      if (!staleSnap.empty) {
        const batch = db.batch();
        staleSnap.docs.forEach((d) =>
          batch.update(d.ref, { presenceStatus: "offline" })
        );
        await batch.commit();
        logger.info("Stale presence cleaned up", {
          count: staleSnap.size,
          workspaceId,
        });
      }
      break;
    }

    case "archive_old_notifications": {
      const uid = msg.payload.uid as string;
      if (!uid) break;

      const cutoff = Timestamp.fromMillis(
        Date.now() - 30 * 24 * 60 * 60 * 1000 // 30 days
      );

      const oldSnap = await db
        .collection(COLLECTIONS.NOTIFICATIONS)
        .where("recipientUid", "==", uid)
        .where("isRead", "==", true)
        .where("createdAt", "<", cutoff)
        .limit(100)
        .get();

      if (!oldSnap.empty) {
        const batch = db.batch();
        oldSnap.docs.forEach((d) => batch.delete(d.ref));
        await batch.commit();
        logger.info("Old notifications archived", { count: oldSnap.size, uid });
      }
      break;
    }

    case "delete_orphan_files": {
      const workspaceId = msg.workspaceId;
      if (!workspaceId) break;

      // Files with no associated message or channel (orphaned after channel delete)
      const orphanSnap = await db
        .collection(COLLECTIONS.FILES)
        .where("workspaceId", "==", workspaceId)
        .where("orphaned", "==", true)
        .limit(50)
        .get();

      if (!orphanSnap.empty) {
        const batch = db.batch();
        orphanSnap.docs.forEach((d) => batch.delete(d.ref));
        await batch.commit();
        logger.info("Orphan file records deleted", {
          count: orphanSnap.size,
          workspaceId,
        });
      }
      break;
    }

    default:
      logger.warn("Unknown cleanup task", { task: msg.task });
  }
};

// ─── Message Type Guard ───────────────────────────────────────────────────────

const isNotificationMessage = (
  msg: QueueMessage
): msg is NotificationQueueMessage => {
  return "recipientUid" in msg && "type" in msg;
};

const isEmailMessage = (msg: QueueMessage): msg is EmailQueueMessage => {
  return "emailType" in msg && "to" in msg;
};

const isCleanupMessage = (msg: QueueMessage): msg is CleanupQueueMessage => {
  return "task" in msg;
};

// ─── Delete message from queue after successful processing ────────────────────

const deleteMessage = async (
  queueUrl: string,
  receiptHandle: string
): Promise<void> => {
  try {
    await sqsClient.send(
      new DeleteMessageCommand({ QueueUrl: queueUrl, ReceiptHandle: receiptHandle })
    );
  } catch (err) {
    logger.error("Failed to delete SQS message", err, { receiptHandle });
  }
};

// ─── Extend visibility timeout for slow tasks ─────────────────────────────────

const extendVisibility = async (
  queueUrl: string,
  receiptHandle: string,
  seconds: number
): Promise<void> => {
  try {
    await sqsClient.send(
      new ChangeMessageVisibilityCommand({
        QueueUrl: queueUrl,
        ReceiptHandle: receiptHandle,
        VisibilityTimeout: seconds,
      })
    );
  } catch (err) {
    logger.error("Failed to extend SQS visibility", err);
  }
};

// ─── Resolve queue URL from event source ARN ──────────────────────────────────

const resolveQueueUrl = (eventSourceARN: string): string => {
  // ARN format: arn:aws:sqs:region:account:queue-name
  const parts = eventSourceARN.split(":");
  const region = parts[3];
  const accountId = parts[4];
  const queueName = parts[5];
  return `https://sqs.${region}.amazonaws.com/${accountId}/${queueName}`;
};

// ─── Notification Queue Handler ───────────────────────────────────────────────

export const handleNotificationQueue = async (
  event: SQSEvent
): Promise<SQSBatchResponse> => {
  const batchItemFailures: Array<{ itemIdentifier: string }> = [];

  for (const record of event.Records) {
    try {
      const msg = JSON.parse(record.body) as NotificationQueueMessage;
      await processNotificationMessage(msg);
      logger.info("Notification record processed", { messageId: record.messageId });
    } catch (err) {
      logger.error("Failed to process notification record", err, {
        messageId: record.messageId,
        receiveCount: record.attributes.ApproximateReceiveCount,
      });
      batchItemFailures.push({ itemIdentifier: record.messageId });
    }
  }

  return { batchItemFailures };
};

// ─── Email Queue Handler ──────────────────────────────────────────────────────

export const handleEmailQueue = async (
  event: SQSEvent
): Promise<SQSBatchResponse> => {
  const batchItemFailures: Array<{ itemIdentifier: string }> = [];

  for (const record of event.Records) {
    try {
      const msg = JSON.parse(record.body) as EmailQueueMessage;
      await processEmailMessage(msg);
      logger.info("Email record processed", {
        messageId: record.messageId,
        emailType: msg.emailType,
      });
    } catch (err) {
      logger.error("Failed to process email record", err, {
        messageId: record.messageId,
        receiveCount: record.attributes.ApproximateReceiveCount,
      });
      batchItemFailures.push({ itemIdentifier: record.messageId });
    }
  }

  return { batchItemFailures };
};

// ─── Cleanup Queue Handler ────────────────────────────────────────────────────

export const handleCleanupQueue = async (
  event: SQSEvent
): Promise<SQSBatchResponse> => {
  const batchItemFailures: Array<{ itemIdentifier: string }> = [];

  for (const record of event.Records) {
    try {
      const msg = JSON.parse(record.body) as CleanupQueueMessage;
      await processCleanupMessage(msg);
      logger.info("Cleanup record processed", {
        messageId: record.messageId,
        task: msg.task,
      });
    } catch (err) {
      logger.error("Failed to process cleanup record", err, {
        messageId: record.messageId,
        receiveCount: record.attributes.ApproximateReceiveCount,
      });
      batchItemFailures.push({ itemIdentifier: record.messageId });
    }
  }

  return { batchItemFailures };
};

// ─── Unified SQS Handler (routes by queue name) ───────────────────────────────

export const handleSQSEvent = async (
  event: SQSEvent
): Promise<SQSBatchResponse> => {
  if (event.Records.length === 0) {
    return { batchItemFailures: [] };
  }

  const firstRecord = event.Records[0];
  const queueArn = firstRecord.eventSourceARN;
  const queueName = queueArn.split(":").pop() ?? "";

  logger.info("SQS batch received", {
    queueName,
    recordCount: event.Records.length,
  });

  if (queueName.includes("notification")) {
    return handleNotificationQueue(event);
  }

  if (queueName.includes("email")) {
    return handleEmailQueue(event);
  }

  if (queueName.includes("cleanup")) {
    return handleCleanupQueue(event);
  }

  // Generic fallback — try to detect message type from body
  const batchItemFailures: Array<{ itemIdentifier: string }> = [];

  for (const record of event.Records) {
    try {
      const msg = JSON.parse(record.body) as QueueMessage;

      if (isNotificationMessage(msg)) {
        await processNotificationMessage(msg);
      } else if (isEmailMessage(msg)) {
        await processEmailMessage(msg);
      } else if (isCleanupMessage(msg)) {
        await processCleanupMessage(msg);
      } else {
        logger.warn("Unrecognized SQS message format", {
          messageId: record.messageId,
        });
      }
    } catch (err) {
      logger.error("Failed to process SQS record in fallback handler", err, {
        messageId: record.messageId,
      });
      batchItemFailures.push({ itemIdentifier: record.messageId });
    }
  }

  return { batchItemFailures };
};
