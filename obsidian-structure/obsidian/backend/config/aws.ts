import { S3Client } from "@aws-sdk/client-s3";
import { SecretsManagerClient } from "@aws-sdk/client-secrets-manager";
import { EventBridgeClient } from "@aws-sdk/client-eventbridge";
import { SQSClient } from "@aws-sdk/client-sqs";
import { SESClient } from "@aws-sdk/client-ses";
import appConfig from "./appConfig";

const baseConfig = {
  region: appConfig.aws.region,
  ...(appConfig.isDev && {
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
    },
  }),
};

// S3 client — file storage
export const s3Client = new S3Client(baseConfig);

// Secrets Manager client — API keys & secrets
export const secretsClient = new SecretsManagerClient(baseConfig);

// EventBridge client — event orchestration
export const eventBridgeClient = new EventBridgeClient(baseConfig);

// SQS client — queue management
export const sqsClient = new SQSClient(baseConfig);

// SES client — email delivery
export const sesClient = new SESClient(baseConfig);

// S3 bucket config
export const S3_CONFIG = {
  bucket: process.env.AWS_S3_BUCKET || "obsidian-files",
  cdnBaseUrl: process.env.AWS_CLOUDFRONT_URL || "",
  signedUrlExpirySeconds: 3600, // 1 hour
  workspacePrefix: (workspaceId: string) => `workspaces/${workspaceId}`,
  fileKey: (workspaceId: string, fileId: string, filename: string) =>
    `workspaces/${workspaceId}/files/${fileId}/${filename}`,
  avatarKey: (userId: string) => `avatars/${userId}`,
};

// EventBridge config
export const EVENTBRIDGE_CONFIG = {
  eventBusName: process.env.AWS_EVENTBRIDGE_BUS || "obsidian-events",
  source: "obsidian.backend",
  detailTypes: {
    WORKSPACE_CREATED: "workspace.created",
    WORKSPACE_UPDATED: "workspace.updated",
    SUBSCRIPTION_UPDATED: "subscription.updated",
    VOICE_SESSION_ENDED: "voice.session.ended",
    FILE_UPLOADED: "file.uploaded",
    MEMBER_JOINED: "member.joined",
    MEMBER_REMOVED: "member.removed",
  },
} as const;

// SQS queue config
export const SQS_CONFIG = {
  notificationQueue: process.env.AWS_SQS_NOTIFICATION_QUEUE || "",
  emailQueue: process.env.AWS_SQS_EMAIL_QUEUE || "",
  cleanupQueue: process.env.AWS_SQS_CLEANUP_QUEUE || "",
};

// SES config
export const SES_CONFIG = {
  fromEmail: process.env.AWS_SES_FROM_EMAIL || "noreply@obsidian.app",
  fromName: "Obsidian",
};
