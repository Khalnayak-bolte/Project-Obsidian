/**
 * backend/services/notificationService.ts
 * Project: Obsidian
 */
import type { NotificationType } from "../utils/constants";
export interface NotificationPayload {
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
interface StoredNotification {
    notificationId: string;
    type: NotificationType;
    recipientUid: string;
    workspaceId: string;
    title: string;
    body: string;
    data: Record<string, string>;
    isRead: boolean;
    createdAt: FirebaseFirestore.Timestamp;
}
export declare function registerFcmToken(uid: string, token: string, deviceId: string): Promise<void>;
export declare function removeFcmToken(uid: string, deviceId: string): Promise<void>;
export declare function sendNotification(payload: NotificationPayload): Promise<void>;
export declare function notifyMention(params: {
    recipientUid: string;
    actorName: string;
    workspaceId: string;
    channelId: string;
    messageId: string;
    channelName: string;
    preview: string;
}): Promise<void>;
export declare function notifyVoiceInvite(params: {
    recipientUid: string;
    actorName: string;
    workspaceId: string;
    channelId: string;
    channelName: string;
}): Promise<void>;
export declare function notifyWorkspaceInvite(params: {
    email: string;
    inviterName: string;
    workspaceName: string;
    inviteToken: string;
}): Promise<void>;
export declare function notifyBillingAlert(params: {
    recipientUid: string;
    workspaceId: string;
    message: string;
}): Promise<void>;
export declare function notifyMemberJoined(params: {
    ownerUid: string;
    workspaceId: string;
    newMemberName: string;
}): Promise<void>;
export declare function notifyRoleUpdate(params: {
    recipientUid: string;
    workspaceId: string;
    newRoleName: string;
}): Promise<void>;
export declare function markNotificationRead(notificationId: string, uid: string): Promise<void>;
export declare function markAllNotificationsRead(uid: string, workspaceId: string): Promise<void>;
export declare function getNotifications(uid: string, workspaceId: string, limit?: number): Promise<StoredNotification[]>;
export declare function getUnreadCount(uid: string, workspaceId: string): Promise<number>;
export {};
//# sourceMappingURL=notificationService.d.ts.map