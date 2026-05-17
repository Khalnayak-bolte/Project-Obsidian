import { S3Client } from "@aws-sdk/client-s3";
import { SecretsManagerClient } from "@aws-sdk/client-secrets-manager";
import { EventBridgeClient } from "@aws-sdk/client-eventbridge";
import { SQSClient } from "@aws-sdk/client-sqs";
import { SESClient } from "@aws-sdk/client-ses";
export declare const s3Client: S3Client;
export declare const secretsClient: SecretsManagerClient;
export declare const eventBridgeClient: EventBridgeClient;
export declare const sqsClient: SQSClient;
export declare const sesClient: SESClient;
export declare const S3_CONFIG: {
    bucket: string;
    cdnBaseUrl: string;
    signedUrlExpirySeconds: number;
    workspacePrefix: (workspaceId: string) => string;
    fileKey: (workspaceId: string, fileId: string, filename: string) => string;
    avatarKey: (userId: string) => string;
};
export declare const EVENTBRIDGE_CONFIG: {
    readonly eventBusName: string;
    readonly source: "obsidian.backend";
    readonly detailTypes: {
        readonly WORKSPACE_CREATED: "workspace.created";
        readonly WORKSPACE_UPDATED: "workspace.updated";
        readonly SUBSCRIPTION_UPDATED: "subscription.updated";
        readonly VOICE_SESSION_ENDED: "voice.session.ended";
        readonly FILE_UPLOADED: "file.uploaded";
        readonly MEMBER_JOINED: "member.joined";
        readonly MEMBER_REMOVED: "member.removed";
    };
};
export declare const SQS_CONFIG: {
    notificationQueue: string;
    emailQueue: string;
    cleanupQueue: string;
};
export declare const SES_CONFIG: {
    fromEmail: string;
    fromName: string;
};
//# sourceMappingURL=aws.d.ts.map