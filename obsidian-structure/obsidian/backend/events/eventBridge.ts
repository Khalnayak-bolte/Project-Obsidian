import {
  PutEventsCommand,
  PutEventsRequestEntry,
} from "@aws-sdk/client-eventbridge";
import { eventBridgeClient, EVENTBRIDGE_CONFIG } from "../config/aws";
import { createLogger } from "../utils/logger";

const logger = createLogger("eventBridge");

// ─── Event Detail Types ───────────────────────────────────────────────────────

export interface WorkspaceCreatedDetail {
  workspaceId: string;
  ownerId: string;
  tier: string;
  name: string;
}

export interface WorkspaceUpdatedDetail {
  workspaceId: string;
  updatedFields: string[];
  updatedBy: string;
}

export interface SubscriptionUpdatedDetail {
  workspaceId: string;
  previousTier: string;
  newTier: string;
  subscriptionStatus: string;
  razorpaySubscriptionId: string;
}

export interface VoiceSessionEndedDetail {
  workspaceId: string;
  channelId: string;
  chimeMeetingId: string;
  durationSeconds: number;
  peakParticipants: number;
  endedAt: string;
}

export interface FileUploadedDetail {
  workspaceId: string;
  channelId: string;
  fileId: string;
  uploadedBy: string;
  fileName: string;
  fileSizeBytes: number;
  mimeType: string;
  s3Key: string;
}

export interface MemberJoinedDetail {
  workspaceId: string;
  uid: string;
  email: string;
  roleId: string;
  invitedBy?: string;
}

export interface MemberRemovedDetail {
  workspaceId: string;
  uid: string;
  removedBy: string;
  reason: "kicked" | "left" | "banned";
}

export type EventDetail =
  | WorkspaceCreatedDetail
  | WorkspaceUpdatedDetail
  | SubscriptionUpdatedDetail
  | VoiceSessionEndedDetail
  | FileUploadedDetail
  | MemberJoinedDetail
  | MemberRemovedDetail;

// ─── Core Publisher ───────────────────────────────────────────────────────────

export interface PublishEventInput {
  detailType: (typeof EVENTBRIDGE_CONFIG.detailTypes)[keyof typeof EVENTBRIDGE_CONFIG.detailTypes];
  detail: EventDetail;
  workspaceId?: string;
  correlationId?: string;
}

export const publishEvent = async (input: PublishEventInput): Promise<void> => {
  try {
    const entry: PutEventsRequestEntry = {
      EventBusName: EVENTBRIDGE_CONFIG.eventBusName,
      Source: EVENTBRIDGE_CONFIG.source,
      DetailType: input.detailType,
      Detail: JSON.stringify({
        ...input.detail,
        _meta: {
          correlationId: input.correlationId ?? crypto.randomUUID(),
          publishedAt: new Date().toISOString(),
          source: EVENTBRIDGE_CONFIG.source,
        },
      }),
      Time: new Date(),
    };

    const command = new PutEventsCommand({ Entries: [entry] });
    const response = await eventBridgeClient.send(command);

    if (response.FailedEntryCount && response.FailedEntryCount > 0) {
      const failedEntry = response.Entries?.[0];
      logger.error("EventBridge put failed", undefined, {
        detailType: input.detailType,
        errorCode: failedEntry?.ErrorCode,
        errorMessage: failedEntry?.ErrorMessage,
      });
      throw new Error(
        `EventBridge publish failed: ${failedEntry?.ErrorMessage ?? "Unknown error"}`
      );
    }

    logger.info("Event published", {
      detailType: input.detailType,
      eventId: response.Entries?.[0]?.EventId,
      workspaceId: input.workspaceId,
    });
  } catch (err) {
    logger.error("Failed to publish event to EventBridge", err, {
      detailType: input.detailType,
      workspaceId: input.workspaceId,
    });
    throw err;
  }
};

// ─── Batch Publisher ──────────────────────────────────────────────────────────

export const publishEvents = async (
  inputs: PublishEventInput[]
): Promise<void> => {
  if (inputs.length === 0) return;

  const BATCH_SIZE = 10;

  try {
    for (let i = 0; i < inputs.length; i += BATCH_SIZE) {
      const batch = inputs.slice(i, i + BATCH_SIZE);

      const entries: PutEventsRequestEntry[] = batch.map((input) => ({
        EventBusName: EVENTBRIDGE_CONFIG.eventBusName,
        Source: EVENTBRIDGE_CONFIG.source,
        DetailType: input.detailType,
        Detail: JSON.stringify({
          ...input.detail,
          _meta: {
            correlationId: input.correlationId ?? crypto.randomUUID(),
            publishedAt: new Date().toISOString(),
            source: EVENTBRIDGE_CONFIG.source,
          },
        }),
        Time: new Date(),
      }));

      const command = new PutEventsCommand({ Entries: entries });
      const response = await eventBridgeClient.send(command);

      if (response.FailedEntryCount && response.FailedEntryCount > 0) {
        logger.error("Batch EventBridge publish had failures", undefined, {
          failedCount: response.FailedEntryCount,
          totalCount: entries.length,
          batchIndex: i / BATCH_SIZE,
        });
      }

      logger.info("Batch events published", {
        successCount: entries.length - (response.FailedEntryCount ?? 0),
        batchIndex: i / BATCH_SIZE,
      });
    }
  } catch (err) {
    logger.error("Failed to publish batch events to EventBridge", err, {
      count: inputs.length,
    });
    throw err;
  }
};

// ─── Domain-Specific Publishers ───────────────────────────────────────────────

export const publishWorkspaceCreated = async (
  detail: WorkspaceCreatedDetail,
  correlationId?: string
): Promise<void> => {
  await publishEvent({
    detailType: EVENTBRIDGE_CONFIG.detailTypes.WORKSPACE_CREATED,
    detail,
    workspaceId: detail.workspaceId,
    correlationId,
  });
};

export const publishWorkspaceUpdated = async (
  detail: WorkspaceUpdatedDetail,
  correlationId?: string
): Promise<void> => {
  await publishEvent({
    detailType: EVENTBRIDGE_CONFIG.detailTypes.WORKSPACE_UPDATED,
    detail,
    workspaceId: detail.workspaceId,
    correlationId,
  });
};

export const publishSubscriptionUpdated = async (
  detail: SubscriptionUpdatedDetail,
  correlationId?: string
): Promise<void> => {
  await publishEvent({
    detailType: EVENTBRIDGE_CONFIG.detailTypes.SUBSCRIPTION_UPDATED,
    detail,
    workspaceId: detail.workspaceId,
    correlationId,
  });
};

export const publishVoiceSessionEnded = async (
  detail: VoiceSessionEndedDetail,
  correlationId?: string
): Promise<void> => {
  await publishEvent({
    detailType: EVENTBRIDGE_CONFIG.detailTypes.VOICE_SESSION_ENDED,
    detail,
    workspaceId: detail.workspaceId,
    correlationId,
  });
};

export const publishFileUploaded = async (
  detail: FileUploadedDetail,
  correlationId?: string
): Promise<void> => {
  await publishEvent({
    detailType: EVENTBRIDGE_CONFIG.detailTypes.FILE_UPLOADED,
    detail,
    workspaceId: detail.workspaceId,
    correlationId,
  });
};

export const publishMemberJoined = async (
  detail: MemberJoinedDetail,
  correlationId?: string
): Promise<void> => {
  await publishEvent({
    detailType: EVENTBRIDGE_CONFIG.detailTypes.MEMBER_JOINED,
    detail,
    workspaceId: detail.workspaceId,
    correlationId,
  });
};

export const publishMemberRemoved = async (
  detail: MemberRemovedDetail,
  correlationId?: string
): Promise<void> => {
  await publishEvent({
    detailType: EVENTBRIDGE_CONFIG.detailTypes.MEMBER_REMOVED,
    detail,
    workspaceId: detail.workspaceId,
    correlationId,
  });
};

// ─── EventBridge Lambda Event Shape ──────────────────────────────────────────

export interface EventBridgeEvent<T extends EventDetail = EventDetail> {
  version: string;
  id: string;
  source: string;
  account: string;
  time: string;
  region: string;
  "detail-type": string;
  detail: T & {
    _meta: {
      correlationId: string;
      publishedAt: string;
      source: string;
    };
  };
}

// ─── Router for EventBridge Lambda Consumer ───────────────────────────────────

type EventHandler<T extends EventDetail> = (
  event: EventBridgeEvent<T>
) => Promise<void>;

type HandlerMap = {
  [K in keyof typeof EVENTBRIDGE_CONFIG.detailTypes]?: EventHandler<EventDetail>;
};

export const createEventBridgeRouter = (handlers: HandlerMap) => {
  return async (event: EventBridgeEvent): Promise<void> => {
    const detailType = event["detail-type"];

    logger.info("EventBridge event received", {
      detailType,
      eventId: event.id,
      correlationId: event.detail._meta?.correlationId,
    });

    const handlerKey = (
      Object.keys(EVENTBRIDGE_CONFIG.detailTypes) as Array<
        keyof typeof EVENTBRIDGE_CONFIG.detailTypes
      >
    ).find(
      (key) => EVENTBRIDGE_CONFIG.detailTypes[key] === detailType
    );

    if (!handlerKey || !handlers[handlerKey]) {
      logger.warn("No handler registered for event type", { detailType });
      return;
    }

    try {
      await handlers[handlerKey]!(event);
      logger.info("EventBridge event processed", {
        detailType,
        eventId: event.id,
      });
    } catch (err) {
      logger.error("EventBridge event handler failed", err, {
        detailType,
        eventId: event.id,
      });
      throw err;
    }
  };
};
