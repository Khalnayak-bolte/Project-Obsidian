/**
 * backend/utils/validators.ts
 * Project: Obsidian
 *
 * Centralised Zod schemas for every inbound request payload, plus a
 * reusable `validate()` Express middleware factory that:
 *   - Parses body / params / query against the supplied schema
 *   - Attaches the typed, sanitised result to the request object
 *   - Returns a structured 422 response on failure
 *
 * Schema groups:
 *   AUTH       — login, register, password, magic-link
 *   WORKSPACE  — create, update, invite, member management
 *   CHANNEL    — create, update, reorder, permissions
 *   MESSAGE    — send, edit, react, pin, search
 *   VOICE      — join, leave, mute, kick, screen-share
 *   FILE       — request upload URL, delete, search
 *   BILLING    — select plan, webhook payload
 *   ADMIN      — role CRUD, ban, moderation actions
 *   COMMON     — pagination, ID params, search query
 */
import { z, ZodSchema, ZodError } from "zod";
import type { Request, Response, NextFunction } from "express";
export declare const PaginationSchema: z.ZodObject<{
    limit: z.ZodPipeline<z.ZodEffects<z.ZodOptional<z.ZodString>, any, string | undefined>, z.ZodNumber>;
    cursor: z.ZodOptional<z.ZodString>;
    direction: z.ZodDefault<z.ZodOptional<z.ZodEnum<["asc", "desc"]>>>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    direction: "desc" | "asc";
    cursor?: string | undefined;
}, {
    limit?: string | undefined;
    cursor?: string | undefined;
    direction?: "desc" | "asc" | undefined;
}>;
export declare const SearchQuerySchema: z.ZodObject<{
    q: z.ZodString;
    limit: z.ZodPipeline<z.ZodEffects<z.ZodOptional<z.ZodString>, number, string | undefined>, z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    q: string;
}, {
    q: string;
    limit?: string | undefined;
}>;
export declare const WorkspaceIdParamSchema: z.ZodObject<{
    workspaceId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    workspaceId: string;
}, {
    workspaceId: string;
}>;
export declare const ChannelIdParamSchema: z.ZodObject<{
    channelId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    channelId: string;
}, {
    channelId: string;
}>;
export declare const MessageIdParamSchema: z.ZodObject<{
    messageId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    messageId: string;
}, {
    messageId: string;
}>;
export declare const UserIdParamSchema: z.ZodObject<{
    userId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    userId: string;
}, {
    userId: string;
}>;
export declare const RoleIdParamSchema: z.ZodObject<{
    roleId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    roleId: string;
}, {
    roleId: string;
}>;
export declare const RegisterSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
    displayName: z.ZodString;
    workspaceName: z.ZodString;
    industryType: z.ZodDefault<z.ZodOptional<z.ZodEnum<["technology", "fintech", "edtech", "healthtech", "ecommerce", "saas", "agency", "other"]>>>;
    teamSize: z.ZodDefault<z.ZodOptional<z.ZodEnum<["1-5", "6-15", "16-50", "51-150", "150+"]>>>;
}, "strip", z.ZodTypeAny, {
    email: string;
    displayName: string;
    password: string;
    workspaceName: string;
    teamSize: "1-5" | "6-15" | "16-50" | "51-150" | "150+";
    industryType: "technology" | "ecommerce" | "other" | "fintech" | "edtech" | "healthtech" | "saas" | "agency";
}, {
    email: string;
    displayName: string;
    password: string;
    workspaceName: string;
    teamSize?: "1-5" | "6-15" | "16-50" | "51-150" | "150+" | undefined;
    industryType?: "technology" | "ecommerce" | "other" | "fintech" | "edtech" | "healthtech" | "saas" | "agency" | undefined;
}>;
export declare const LoginSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
    deviceId: z.ZodOptional<z.ZodString>;
    rememberMe: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
    rememberMe: boolean;
    deviceId?: string | undefined;
}, {
    email: string;
    password: string;
    deviceId?: string | undefined;
    rememberMe?: boolean | undefined;
}>;
export declare const ChangePasswordSchema: z.ZodEffects<z.ZodObject<{
    currentPassword: z.ZodString;
    newPassword: z.ZodString;
    confirmPassword: z.ZodString;
}, "strip", z.ZodTypeAny, {
    newPassword: string;
    confirmPassword: string;
    currentPassword: string;
}, {
    newPassword: string;
    confirmPassword: string;
    currentPassword: string;
}>, {
    newPassword: string;
    confirmPassword: string;
    currentPassword: string;
}, {
    newPassword: string;
    confirmPassword: string;
    currentPassword: string;
}>;
export declare const ForgotPasswordSchema: z.ZodObject<{
    email: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
}, {
    email: string;
}>;
export declare const ResetPasswordSchema: z.ZodEffects<z.ZodObject<{
    token: z.ZodString;
    newPassword: z.ZodString;
    confirmPassword: z.ZodString;
}, "strip", z.ZodTypeAny, {
    newPassword: string;
    confirmPassword: string;
    token: string;
}, {
    newPassword: string;
    confirmPassword: string;
    token: string;
}>, {
    newPassword: string;
    confirmPassword: string;
    token: string;
}, {
    newPassword: string;
    confirmPassword: string;
    token: string;
}>;
export declare const MagicLinkSchema: z.ZodObject<{
    email: z.ZodString;
    redirectUrl: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
}, "strip", z.ZodTypeAny, {
    email: string;
    redirectUrl?: string | undefined;
}, {
    email: string;
    redirectUrl?: string | undefined;
}>;
export declare const RefreshTokenSchema: z.ZodObject<{
    refreshToken: z.ZodString;
    deviceId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    refreshToken: string;
    deviceId?: string | undefined;
}, {
    refreshToken: string;
    deviceId?: string | undefined;
}>;
export declare const RevokeSessionSchema: z.ZodObject<{
    deviceId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    deviceId: string;
}, {
    deviceId: string;
}>;
export declare const CreateWorkspaceSchema: z.ZodObject<{
    name: z.ZodString;
    slug: z.ZodOptional<z.ZodString>;
    industryType: z.ZodDefault<z.ZodOptional<z.ZodEnum<["technology", "fintech", "edtech", "healthtech", "ecommerce", "saas", "agency", "other"]>>>;
    logoUrl: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
    description: z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, string | undefined>;
    tier: z.ZodDefault<z.ZodOptional<z.ZodEnum<["gold", "premium", "deluxe"]>>>;
}, "strip", z.ZodTypeAny, {
    name: string;
    tier: "gold" | "premium" | "deluxe";
    industryType: "technology" | "ecommerce" | "other" | "fintech" | "edtech" | "healthtech" | "saas" | "agency";
    description?: string | undefined;
    slug?: string | undefined;
    logoUrl?: string | undefined;
}, {
    name: string;
    description?: string | undefined;
    slug?: string | undefined;
    tier?: "gold" | "premium" | "deluxe" | undefined;
    industryType?: "technology" | "ecommerce" | "other" | "fintech" | "edtech" | "healthtech" | "saas" | "agency" | undefined;
    logoUrl?: string | undefined;
}>;
export declare const UpdateWorkspaceSchema: z.ZodEffects<z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    description: z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, string | undefined>;
    logoUrl: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
    settings: z.ZodOptional<z.ZodObject<{
        defaultChannelId: z.ZodOptional<z.ZodString>;
        allowGuestAccess: z.ZodOptional<z.ZodBoolean>;
        requireEmailVerification: z.ZodOptional<z.ZodBoolean>;
        maxFileUploadSizeMb: z.ZodOptional<z.ZodNumber>;
        allowedFileTypes: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        voiceRegion: z.ZodOptional<z.ZodEnum<["ap-south-1", "ap-southeast-1", "eu-central-1"]>>;
        enableNotifications: z.ZodOptional<z.ZodBoolean>;
        retentionDays: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        allowGuestAccess?: boolean | undefined;
        requireEmailVerification?: boolean | undefined;
        defaultChannelId?: string | undefined;
        maxFileUploadSizeMb?: number | undefined;
        allowedFileTypes?: string[] | undefined;
        voiceRegion?: "ap-south-1" | "ap-southeast-1" | "eu-central-1" | undefined;
        enableNotifications?: boolean | undefined;
        retentionDays?: number | undefined;
    }, {
        allowGuestAccess?: boolean | undefined;
        requireEmailVerification?: boolean | undefined;
        defaultChannelId?: string | undefined;
        maxFileUploadSizeMb?: number | undefined;
        allowedFileTypes?: string[] | undefined;
        voiceRegion?: "ap-south-1" | "ap-southeast-1" | "eu-central-1" | undefined;
        enableNotifications?: boolean | undefined;
        retentionDays?: number | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    description?: string | undefined;
    name?: string | undefined;
    settings?: {
        allowGuestAccess?: boolean | undefined;
        requireEmailVerification?: boolean | undefined;
        defaultChannelId?: string | undefined;
        maxFileUploadSizeMb?: number | undefined;
        allowedFileTypes?: string[] | undefined;
        voiceRegion?: "ap-south-1" | "ap-southeast-1" | "eu-central-1" | undefined;
        enableNotifications?: boolean | undefined;
        retentionDays?: number | undefined;
    } | undefined;
    logoUrl?: string | undefined;
}, {
    description?: string | undefined;
    name?: string | undefined;
    settings?: {
        allowGuestAccess?: boolean | undefined;
        requireEmailVerification?: boolean | undefined;
        defaultChannelId?: string | undefined;
        maxFileUploadSizeMb?: number | undefined;
        allowedFileTypes?: string[] | undefined;
        voiceRegion?: "ap-south-1" | "ap-southeast-1" | "eu-central-1" | undefined;
        enableNotifications?: boolean | undefined;
        retentionDays?: number | undefined;
    } | undefined;
    logoUrl?: string | undefined;
}>, {
    description?: string | undefined;
    name?: string | undefined;
    settings?: {
        allowGuestAccess?: boolean | undefined;
        requireEmailVerification?: boolean | undefined;
        defaultChannelId?: string | undefined;
        maxFileUploadSizeMb?: number | undefined;
        allowedFileTypes?: string[] | undefined;
        voiceRegion?: "ap-south-1" | "ap-southeast-1" | "eu-central-1" | undefined;
        enableNotifications?: boolean | undefined;
        retentionDays?: number | undefined;
    } | undefined;
    logoUrl?: string | undefined;
}, {
    description?: string | undefined;
    name?: string | undefined;
    settings?: {
        allowGuestAccess?: boolean | undefined;
        requireEmailVerification?: boolean | undefined;
        defaultChannelId?: string | undefined;
        maxFileUploadSizeMb?: number | undefined;
        allowedFileTypes?: string[] | undefined;
        voiceRegion?: "ap-south-1" | "ap-southeast-1" | "eu-central-1" | undefined;
        enableNotifications?: boolean | undefined;
        retentionDays?: number | undefined;
    } | undefined;
    logoUrl?: string | undefined;
}>;
export declare const InviteMembersSchema: z.ZodObject<{
    emails: z.ZodArray<z.ZodString, "many">;
    roleId: z.ZodString;
    message: z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, string | undefined>;
    expiresInDays: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    roleId: string;
    emails: string[];
    expiresInDays: number;
    message?: string | undefined;
}, {
    roleId: string;
    emails: string[];
    message?: string | undefined;
    expiresInDays?: number | undefined;
}>;
export declare const AcceptInviteSchema: z.ZodObject<{
    inviteToken: z.ZodString;
}, "strip", z.ZodTypeAny, {
    inviteToken: string;
}, {
    inviteToken: string;
}>;
export declare const UpdateMemberRoleSchema: z.ZodObject<{
    roleId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    roleId: string;
}, {
    roleId: string;
}>;
export declare const RemoveMemberSchema: z.ZodObject<{
    reason: z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, string | undefined>;
    transferOwnershipTo: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    reason?: string | undefined;
    transferOwnershipTo?: string | undefined;
}, {
    reason?: string | undefined;
    transferOwnershipTo?: string | undefined;
}>;
export declare const TransferOwnershipSchema: z.ZodObject<{
    newOwnerId: z.ZodString;
    confirmationPassword: z.ZodString;
}, "strip", z.ZodTypeAny, {
    newOwnerId: string;
    confirmationPassword: string;
}, {
    newOwnerId: string;
    confirmationPassword: string;
}>;
export declare const CreateChannelSchema: z.ZodObject<{
    name: z.ZodString;
    type: z.ZodDefault<z.ZodOptional<z.ZodEnum<["text", "voice", "announcement", "forum"]>>>;
    visibility: z.ZodDefault<z.ZodOptional<z.ZodEnum<["public", "private", "secret"]>>>;
    description: z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, string | undefined>;
    categoryId: z.ZodOptional<z.ZodString>;
    allowedRoles: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodString, "many">>>;
    slowMode: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    topic: z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, string | undefined>;
    isDefault: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}, "strip", z.ZodTypeAny, {
    type: "text" | "voice" | "announcement" | "forum";
    name: string;
    visibility: "public" | "private" | "secret";
    allowedRoles: string[];
    isDefault: boolean;
    slowMode: number;
    description?: string | undefined;
    categoryId?: string | undefined;
    topic?: string | undefined;
}, {
    name: string;
    type?: "text" | "voice" | "announcement" | "forum" | undefined;
    description?: string | undefined;
    visibility?: "public" | "private" | "secret" | undefined;
    allowedRoles?: string[] | undefined;
    isDefault?: boolean | undefined;
    categoryId?: string | undefined;
    slowMode?: number | undefined;
    topic?: string | undefined;
}>;
export declare const UpdateChannelSchema: z.ZodEffects<z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    description: z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, string | undefined>;
    visibility: z.ZodOptional<z.ZodEnum<["public", "private", "secret"]>>;
    allowedRoles: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    slowMode: z.ZodOptional<z.ZodNumber>;
    topic: z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, string | undefined>;
    isArchived: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    description?: string | undefined;
    name?: string | undefined;
    visibility?: "public" | "private" | "secret" | undefined;
    allowedRoles?: string[] | undefined;
    isArchived?: boolean | undefined;
    slowMode?: number | undefined;
    topic?: string | undefined;
}, {
    description?: string | undefined;
    name?: string | undefined;
    visibility?: "public" | "private" | "secret" | undefined;
    allowedRoles?: string[] | undefined;
    isArchived?: boolean | undefined;
    slowMode?: number | undefined;
    topic?: string | undefined;
}>, {
    description?: string | undefined;
    name?: string | undefined;
    visibility?: "public" | "private" | "secret" | undefined;
    allowedRoles?: string[] | undefined;
    isArchived?: boolean | undefined;
    slowMode?: number | undefined;
    topic?: string | undefined;
}, {
    description?: string | undefined;
    name?: string | undefined;
    visibility?: "public" | "private" | "secret" | undefined;
    allowedRoles?: string[] | undefined;
    isArchived?: boolean | undefined;
    slowMode?: number | undefined;
    topic?: string | undefined;
}>;
export declare const ReorderChannelsSchema: z.ZodObject<{
    orderedIds: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    orderedIds: string[];
}, {
    orderedIds: string[];
}>;
export declare const CreateCategorySchema: z.ZodObject<{
    name: z.ZodString;
    position: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    name: string;
    position: number;
}, {
    name: string;
    position?: number | undefined;
}>;
export declare const UpdateChannelPermissionsSchema: z.ZodObject<{
    roleId: z.ZodString;
    permissions: z.ZodObject<{
        viewChannel: z.ZodOptional<z.ZodBoolean>;
        sendMessages: z.ZodOptional<z.ZodBoolean>;
        manageMessages: z.ZodOptional<z.ZodBoolean>;
        manageChannel: z.ZodOptional<z.ZodBoolean>;
        joinVoice: z.ZodOptional<z.ZodBoolean>;
        muteMembers: z.ZodOptional<z.ZodBoolean>;
        moveMembers: z.ZodOptional<z.ZodBoolean>;
        useSlashCommands: z.ZodOptional<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        viewChannel?: boolean | undefined;
        sendMessages?: boolean | undefined;
        manageMessages?: boolean | undefined;
        manageChannel?: boolean | undefined;
        joinVoice?: boolean | undefined;
        muteMembers?: boolean | undefined;
        moveMembers?: boolean | undefined;
        useSlashCommands?: boolean | undefined;
    }, {
        viewChannel?: boolean | undefined;
        sendMessages?: boolean | undefined;
        manageMessages?: boolean | undefined;
        manageChannel?: boolean | undefined;
        joinVoice?: boolean | undefined;
        muteMembers?: boolean | undefined;
        moveMembers?: boolean | undefined;
        useSlashCommands?: boolean | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    roleId: string;
    permissions: {
        viewChannel?: boolean | undefined;
        sendMessages?: boolean | undefined;
        manageMessages?: boolean | undefined;
        manageChannel?: boolean | undefined;
        joinVoice?: boolean | undefined;
        muteMembers?: boolean | undefined;
        moveMembers?: boolean | undefined;
        useSlashCommands?: boolean | undefined;
    };
}, {
    roleId: string;
    permissions: {
        viewChannel?: boolean | undefined;
        sendMessages?: boolean | undefined;
        manageMessages?: boolean | undefined;
        manageChannel?: boolean | undefined;
        joinVoice?: boolean | undefined;
        muteMembers?: boolean | undefined;
        moveMembers?: boolean | undefined;
        useSlashCommands?: boolean | undefined;
    };
}>;
export declare const SendMessageSchema: z.ZodEffects<z.ZodObject<{
    content: z.ZodOptional<z.ZodString>;
    attachments: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodObject<{
        fileKey: z.ZodString;
        fileName: z.ZodString;
        mimeType: z.ZodString;
        sizeBytes: z.ZodNumber;
        width: z.ZodOptional<z.ZodNumber>;
        height: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        mimeType: string;
        sizeBytes: number;
        fileName: string;
        fileKey: string;
        width?: number | undefined;
        height?: number | undefined;
    }, {
        mimeType: string;
        sizeBytes: number;
        fileName: string;
        fileKey: string;
        width?: number | undefined;
        height?: number | undefined;
    }>, "many">>>;
    mentions: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodObject<{
        type: z.ZodEnum<["user", "role", "channel", "everyone", "here"]>;
        targetId: z.ZodString;
        displayName: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        displayName: string;
        type: "role" | "user" | "channel" | "everyone" | "here";
        targetId: string;
    }, {
        displayName: string;
        type: "role" | "user" | "channel" | "everyone" | "here";
        targetId: string;
    }>, "many">>>;
    replyToId: z.ZodOptional<z.ZodString>;
    nonce: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    attachments: {
        mimeType: string;
        sizeBytes: number;
        fileName: string;
        fileKey: string;
        width?: number | undefined;
        height?: number | undefined;
    }[];
    mentions: {
        displayName: string;
        type: "role" | "user" | "channel" | "everyone" | "here";
        targetId: string;
    }[];
    content?: string | undefined;
    replyToId?: string | undefined;
    nonce?: string | undefined;
}, {
    content?: string | undefined;
    attachments?: {
        mimeType: string;
        sizeBytes: number;
        fileName: string;
        fileKey: string;
        width?: number | undefined;
        height?: number | undefined;
    }[] | undefined;
    mentions?: {
        displayName: string;
        type: "role" | "user" | "channel" | "everyone" | "here";
        targetId: string;
    }[] | undefined;
    replyToId?: string | undefined;
    nonce?: string | undefined;
}>, {
    attachments: {
        mimeType: string;
        sizeBytes: number;
        fileName: string;
        fileKey: string;
        width?: number | undefined;
        height?: number | undefined;
    }[];
    mentions: {
        displayName: string;
        type: "role" | "user" | "channel" | "everyone" | "here";
        targetId: string;
    }[];
    content?: string | undefined;
    replyToId?: string | undefined;
    nonce?: string | undefined;
}, {
    content?: string | undefined;
    attachments?: {
        mimeType: string;
        sizeBytes: number;
        fileName: string;
        fileKey: string;
        width?: number | undefined;
        height?: number | undefined;
    }[] | undefined;
    mentions?: {
        displayName: string;
        type: "role" | "user" | "channel" | "everyone" | "here";
        targetId: string;
    }[] | undefined;
    replyToId?: string | undefined;
    nonce?: string | undefined;
}>;
export declare const EditMessageSchema: z.ZodObject<{
    content: z.ZodString;
}, "strip", z.ZodTypeAny, {
    content: string;
}, {
    content: string;
}>;
export declare const AddReactionSchema: z.ZodObject<{
    emoji: z.ZodString;
}, "strip", z.ZodTypeAny, {
    emoji: string;
}, {
    emoji: string;
}>;
export declare const PinMessageSchema: z.ZodObject<{
    reason: z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, string | undefined>;
}, "strip", z.ZodTypeAny, {
    reason?: string | undefined;
}, {
    reason?: string | undefined;
}>;
export declare const BulkDeleteMessagesSchema: z.ZodObject<{
    messageIds: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    messageIds: string[];
}, {
    messageIds: string[];
}>;
export declare const MessageSearchSchema: z.ZodObject<{
    q: z.ZodString;
    channelId: z.ZodOptional<z.ZodString>;
    fromUserId: z.ZodOptional<z.ZodString>;
    hasAttachments: z.ZodEffects<z.ZodOptional<z.ZodString>, boolean, string | undefined>;
    before: z.ZodOptional<z.ZodString>;
    after: z.ZodOptional<z.ZodString>;
    limit: z.ZodPipeline<z.ZodEffects<z.ZodOptional<z.ZodString>, number, string | undefined>, z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    q: string;
    hasAttachments: boolean;
    channelId?: string | undefined;
    before?: string | undefined;
    after?: string | undefined;
    fromUserId?: string | undefined;
}, {
    q: string;
    limit?: string | undefined;
    channelId?: string | undefined;
    before?: string | undefined;
    after?: string | undefined;
    fromUserId?: string | undefined;
    hasAttachments?: string | undefined;
}>;
export declare const JoinVoiceSchema: z.ZodObject<{
    channelId: z.ZodString;
    workspaceId: z.ZodString;
    audioInputDeviceId: z.ZodOptional<z.ZodString>;
    videoEnabled: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    noiseSuppressionEnabled: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}, "strip", z.ZodTypeAny, {
    workspaceId: string;
    channelId: string;
    videoEnabled: boolean;
    noiseSuppressionEnabled: boolean;
    audioInputDeviceId?: string | undefined;
}, {
    workspaceId: string;
    channelId: string;
    audioInputDeviceId?: string | undefined;
    videoEnabled?: boolean | undefined;
    noiseSuppressionEnabled?: boolean | undefined;
}>;
export declare const LeaveVoiceSchema: z.ZodObject<{
    meetingId: z.ZodString;
    attendeeId: z.ZodString;
    reason: z.ZodDefault<z.ZodOptional<z.ZodEnum<["user_left", "kicked", "disconnected", "timeout"]>>>;
}, "strip", z.ZodTypeAny, {
    reason: "disconnected" | "kicked" | "user_left" | "timeout";
    meetingId: string;
    attendeeId: string;
}, {
    meetingId: string;
    attendeeId: string;
    reason?: "disconnected" | "kicked" | "user_left" | "timeout" | undefined;
}>;
export declare const MuteParticipantSchema: z.ZodObject<{
    targetUserId: z.ZodString;
    muted: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    targetUserId: string;
    muted: boolean;
}, {
    targetUserId: string;
    muted: boolean;
}>;
export declare const KickParticipantSchema: z.ZodObject<{
    targetUserId: z.ZodString;
    reason: z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, string | undefined>;
    banFromChannel: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}, "strip", z.ZodTypeAny, {
    targetUserId: string;
    banFromChannel: boolean;
    reason?: string | undefined;
}, {
    targetUserId: string;
    reason?: string | undefined;
    banFromChannel?: boolean | undefined;
}>;
export declare const StartScreenShareSchema: z.ZodObject<{
    meetingId: z.ZodString;
    sourceType: z.ZodDefault<z.ZodOptional<z.ZodEnum<["screen", "window", "tab"]>>>;
}, "strip", z.ZodTypeAny, {
    meetingId: string;
    sourceType: "screen" | "window" | "tab";
}, {
    meetingId: string;
    sourceType?: "screen" | "window" | "tab" | undefined;
}>;
export declare const UpdateVoiceSettingsSchema: z.ZodObject<{
    noiseSuppressionEnabled: z.ZodOptional<z.ZodBoolean>;
    echoCancel: z.ZodOptional<z.ZodBoolean>;
    gainControl: z.ZodOptional<z.ZodBoolean>;
    pushToTalkEnabled: z.ZodOptional<z.ZodBoolean>;
    pushToTalkKey: z.ZodOptional<z.ZodString>;
    outputVolume: z.ZodOptional<z.ZodNumber>;
    inputGain: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    noiseSuppressionEnabled?: boolean | undefined;
    echoCancel?: boolean | undefined;
    gainControl?: boolean | undefined;
    pushToTalkEnabled?: boolean | undefined;
    pushToTalkKey?: string | undefined;
    outputVolume?: number | undefined;
    inputGain?: number | undefined;
}, {
    noiseSuppressionEnabled?: boolean | undefined;
    echoCancel?: boolean | undefined;
    gainControl?: boolean | undefined;
    pushToTalkEnabled?: boolean | undefined;
    pushToTalkKey?: string | undefined;
    outputVolume?: number | undefined;
    inputGain?: number | undefined;
}>;
export declare const RequestUploadUrlSchema: z.ZodObject<{
    fileName: z.ZodString;
    mimeType: z.ZodEffects<z.ZodString, string, string>;
    sizeBytes: z.ZodNumber;
    channelId: z.ZodOptional<z.ZodString>;
    isPublic: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}, "strip", z.ZodTypeAny, {
    mimeType: string;
    sizeBytes: number;
    fileName: string;
    isPublic: boolean;
    channelId?: string | undefined;
}, {
    mimeType: string;
    sizeBytes: number;
    fileName: string;
    channelId?: string | undefined;
    isPublic?: boolean | undefined;
}>;
export declare const DeleteFileSchema: z.ZodObject<{
    fileKey: z.ZodString;
    reason: z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, string | undefined>;
}, "strip", z.ZodTypeAny, {
    fileKey: string;
    reason?: string | undefined;
}, {
    fileKey: string;
    reason?: string | undefined;
}>;
export declare const FileSearchSchema: z.ZodObject<{
    q: z.ZodOptional<z.ZodString>;
    mimeType: z.ZodOptional<z.ZodString>;
    channelId: z.ZodOptional<z.ZodString>;
    uploadedBy: z.ZodOptional<z.ZodString>;
    after: z.ZodOptional<z.ZodString>;
    before: z.ZodOptional<z.ZodString>;
    limit: z.ZodPipeline<z.ZodEffects<z.ZodOptional<z.ZodString>, number, string | undefined>, z.ZodNumber>;
    cursor: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    cursor?: string | undefined;
    channelId?: string | undefined;
    mimeType?: string | undefined;
    before?: string | undefined;
    after?: string | undefined;
    q?: string | undefined;
    uploadedBy?: string | undefined;
}, {
    limit?: string | undefined;
    cursor?: string | undefined;
    channelId?: string | undefined;
    mimeType?: string | undefined;
    before?: string | undefined;
    after?: string | undefined;
    q?: string | undefined;
    uploadedBy?: string | undefined;
}>;
export declare const SelectPlanSchema: z.ZodObject<{
    tier: z.ZodEnum<["gold", "premium", "deluxe"]>;
    billingCycle: z.ZodDefault<z.ZodOptional<z.ZodEnum<["monthly", "annual"]>>>;
    couponCode: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    tier: "gold" | "premium" | "deluxe";
    billingCycle: "monthly" | "annual";
    couponCode?: string | undefined;
}, {
    tier: "gold" | "premium" | "deluxe";
    couponCode?: string | undefined;
    billingCycle?: "monthly" | "annual" | undefined;
}>;
export declare const RazorpayWebhookSchema: z.ZodObject<{
    entity: z.ZodString;
    account_id: z.ZodOptional<z.ZodString>;
    event: z.ZodString;
    contains: z.ZodArray<z.ZodString, "many">;
    payload: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    created_at: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    event: string;
    entity: string;
    created_at: number;
    contains: string[];
    payload: Record<string, unknown>;
    account_id?: string | undefined;
}, {
    event: string;
    entity: string;
    created_at: number;
    contains: string[];
    payload: Record<string, unknown>;
    account_id?: string | undefined;
}>;
export declare const ApplyCouponSchema: z.ZodObject<{
    code: z.ZodString;
    tier: z.ZodEnum<["gold", "premium", "deluxe"]>;
}, "strip", z.ZodTypeAny, {
    code: string;
    tier: "gold" | "premium" | "deluxe";
}, {
    code: string;
    tier: "gold" | "premium" | "deluxe";
}>;
export declare const CreateRoleSchema: z.ZodObject<{
    name: z.ZodString;
    color: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    permissions: z.ZodDefault<z.ZodOptional<z.ZodObject<{
        manage_workspace: z.ZodOptional<z.ZodBoolean>;
        manage_roles: z.ZodOptional<z.ZodBoolean>;
        manage_channels: z.ZodOptional<z.ZodBoolean>;
        manage_members: z.ZodOptional<z.ZodBoolean>;
        manage_billing: z.ZodOptional<z.ZodBoolean>;
        create_channels: z.ZodOptional<z.ZodBoolean>;
        delete_channels: z.ZodOptional<z.ZodBoolean>;
        send_messages: z.ZodOptional<z.ZodBoolean>;
        delete_messages: z.ZodOptional<z.ZodBoolean>;
        pin_messages: z.ZodOptional<z.ZodBoolean>;
        mention_everyone: z.ZodOptional<z.ZodBoolean>;
        join_voice: z.ZodOptional<z.ZodBoolean>;
        mute_members: z.ZodOptional<z.ZodBoolean>;
        kick_members: z.ZodOptional<z.ZodBoolean>;
        deafen_members: z.ZodOptional<z.ZodBoolean>;
        upload_files: z.ZodOptional<z.ZodBoolean>;
        download_files: z.ZodOptional<z.ZodBoolean>;
        delete_files: z.ZodOptional<z.ZodBoolean>;
        ban_members: z.ZodOptional<z.ZodBoolean>;
        view_audit_log: z.ZodOptional<z.ZodBoolean>;
        manage_invites: z.ZodOptional<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        manage_workspace?: boolean | undefined;
        manage_roles?: boolean | undefined;
        manage_channels?: boolean | undefined;
        manage_members?: boolean | undefined;
        manage_billing?: boolean | undefined;
        create_channels?: boolean | undefined;
        delete_channels?: boolean | undefined;
        send_messages?: boolean | undefined;
        delete_messages?: boolean | undefined;
        pin_messages?: boolean | undefined;
        mention_everyone?: boolean | undefined;
        join_voice?: boolean | undefined;
        mute_members?: boolean | undefined;
        kick_members?: boolean | undefined;
        deafen_members?: boolean | undefined;
        upload_files?: boolean | undefined;
        download_files?: boolean | undefined;
        delete_files?: boolean | undefined;
        ban_members?: boolean | undefined;
        view_audit_log?: boolean | undefined;
        manage_invites?: boolean | undefined;
    }, {
        manage_workspace?: boolean | undefined;
        manage_roles?: boolean | undefined;
        manage_channels?: boolean | undefined;
        manage_members?: boolean | undefined;
        manage_billing?: boolean | undefined;
        create_channels?: boolean | undefined;
        delete_channels?: boolean | undefined;
        send_messages?: boolean | undefined;
        delete_messages?: boolean | undefined;
        pin_messages?: boolean | undefined;
        mention_everyone?: boolean | undefined;
        join_voice?: boolean | undefined;
        mute_members?: boolean | undefined;
        kick_members?: boolean | undefined;
        deafen_members?: boolean | undefined;
        upload_files?: boolean | undefined;
        download_files?: boolean | undefined;
        delete_files?: boolean | undefined;
        ban_members?: boolean | undefined;
        view_audit_log?: boolean | undefined;
        manage_invites?: boolean | undefined;
    }>>>;
    isHoisted: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    isMentionable: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    position: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    permissions: {
        manage_workspace?: boolean | undefined;
        manage_roles?: boolean | undefined;
        manage_channels?: boolean | undefined;
        manage_members?: boolean | undefined;
        manage_billing?: boolean | undefined;
        create_channels?: boolean | undefined;
        delete_channels?: boolean | undefined;
        send_messages?: boolean | undefined;
        delete_messages?: boolean | undefined;
        pin_messages?: boolean | undefined;
        mention_everyone?: boolean | undefined;
        join_voice?: boolean | undefined;
        mute_members?: boolean | undefined;
        kick_members?: boolean | undefined;
        deafen_members?: boolean | undefined;
        upload_files?: boolean | undefined;
        download_files?: boolean | undefined;
        delete_files?: boolean | undefined;
        ban_members?: boolean | undefined;
        view_audit_log?: boolean | undefined;
        manage_invites?: boolean | undefined;
    };
    name: string;
    color: string;
    isHoisted: boolean;
    isMentionable: boolean;
    position?: number | undefined;
}, {
    name: string;
    permissions?: {
        manage_workspace?: boolean | undefined;
        manage_roles?: boolean | undefined;
        manage_channels?: boolean | undefined;
        manage_members?: boolean | undefined;
        manage_billing?: boolean | undefined;
        create_channels?: boolean | undefined;
        delete_channels?: boolean | undefined;
        send_messages?: boolean | undefined;
        delete_messages?: boolean | undefined;
        pin_messages?: boolean | undefined;
        mention_everyone?: boolean | undefined;
        join_voice?: boolean | undefined;
        mute_members?: boolean | undefined;
        kick_members?: boolean | undefined;
        deafen_members?: boolean | undefined;
        upload_files?: boolean | undefined;
        download_files?: boolean | undefined;
        delete_files?: boolean | undefined;
        ban_members?: boolean | undefined;
        view_audit_log?: boolean | undefined;
        manage_invites?: boolean | undefined;
    } | undefined;
    position?: number | undefined;
    color?: string | undefined;
    isHoisted?: boolean | undefined;
    isMentionable?: boolean | undefined;
}>;
export declare const UpdateRoleSchema: z.ZodEffects<z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    color: z.ZodOptional<z.ZodString>;
    permissions: z.ZodOptional<z.ZodObject<{
        manage_workspace: z.ZodOptional<z.ZodBoolean>;
        manage_roles: z.ZodOptional<z.ZodBoolean>;
        manage_channels: z.ZodOptional<z.ZodBoolean>;
        manage_members: z.ZodOptional<z.ZodBoolean>;
        manage_billing: z.ZodOptional<z.ZodBoolean>;
        create_channels: z.ZodOptional<z.ZodBoolean>;
        delete_channels: z.ZodOptional<z.ZodBoolean>;
        send_messages: z.ZodOptional<z.ZodBoolean>;
        delete_messages: z.ZodOptional<z.ZodBoolean>;
        pin_messages: z.ZodOptional<z.ZodBoolean>;
        mention_everyone: z.ZodOptional<z.ZodBoolean>;
        join_voice: z.ZodOptional<z.ZodBoolean>;
        mute_members: z.ZodOptional<z.ZodBoolean>;
        kick_members: z.ZodOptional<z.ZodBoolean>;
        deafen_members: z.ZodOptional<z.ZodBoolean>;
        upload_files: z.ZodOptional<z.ZodBoolean>;
        download_files: z.ZodOptional<z.ZodBoolean>;
        delete_files: z.ZodOptional<z.ZodBoolean>;
        ban_members: z.ZodOptional<z.ZodBoolean>;
        view_audit_log: z.ZodOptional<z.ZodBoolean>;
        manage_invites: z.ZodOptional<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        manage_workspace?: boolean | undefined;
        manage_roles?: boolean | undefined;
        manage_channels?: boolean | undefined;
        manage_members?: boolean | undefined;
        manage_billing?: boolean | undefined;
        create_channels?: boolean | undefined;
        delete_channels?: boolean | undefined;
        send_messages?: boolean | undefined;
        delete_messages?: boolean | undefined;
        pin_messages?: boolean | undefined;
        mention_everyone?: boolean | undefined;
        join_voice?: boolean | undefined;
        mute_members?: boolean | undefined;
        kick_members?: boolean | undefined;
        deafen_members?: boolean | undefined;
        upload_files?: boolean | undefined;
        download_files?: boolean | undefined;
        delete_files?: boolean | undefined;
        ban_members?: boolean | undefined;
        view_audit_log?: boolean | undefined;
        manage_invites?: boolean | undefined;
    }, {
        manage_workspace?: boolean | undefined;
        manage_roles?: boolean | undefined;
        manage_channels?: boolean | undefined;
        manage_members?: boolean | undefined;
        manage_billing?: boolean | undefined;
        create_channels?: boolean | undefined;
        delete_channels?: boolean | undefined;
        send_messages?: boolean | undefined;
        delete_messages?: boolean | undefined;
        pin_messages?: boolean | undefined;
        mention_everyone?: boolean | undefined;
        join_voice?: boolean | undefined;
        mute_members?: boolean | undefined;
        kick_members?: boolean | undefined;
        deafen_members?: boolean | undefined;
        upload_files?: boolean | undefined;
        download_files?: boolean | undefined;
        delete_files?: boolean | undefined;
        ban_members?: boolean | undefined;
        view_audit_log?: boolean | undefined;
        manage_invites?: boolean | undefined;
    }>>;
    isHoisted: z.ZodOptional<z.ZodBoolean>;
    isMentionable: z.ZodOptional<z.ZodBoolean>;
    position: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    permissions?: {
        manage_workspace?: boolean | undefined;
        manage_roles?: boolean | undefined;
        manage_channels?: boolean | undefined;
        manage_members?: boolean | undefined;
        manage_billing?: boolean | undefined;
        create_channels?: boolean | undefined;
        delete_channels?: boolean | undefined;
        send_messages?: boolean | undefined;
        delete_messages?: boolean | undefined;
        pin_messages?: boolean | undefined;
        mention_everyone?: boolean | undefined;
        join_voice?: boolean | undefined;
        mute_members?: boolean | undefined;
        kick_members?: boolean | undefined;
        deafen_members?: boolean | undefined;
        upload_files?: boolean | undefined;
        download_files?: boolean | undefined;
        delete_files?: boolean | undefined;
        ban_members?: boolean | undefined;
        view_audit_log?: boolean | undefined;
        manage_invites?: boolean | undefined;
    } | undefined;
    name?: string | undefined;
    position?: number | undefined;
    color?: string | undefined;
    isHoisted?: boolean | undefined;
    isMentionable?: boolean | undefined;
}, {
    permissions?: {
        manage_workspace?: boolean | undefined;
        manage_roles?: boolean | undefined;
        manage_channels?: boolean | undefined;
        manage_members?: boolean | undefined;
        manage_billing?: boolean | undefined;
        create_channels?: boolean | undefined;
        delete_channels?: boolean | undefined;
        send_messages?: boolean | undefined;
        delete_messages?: boolean | undefined;
        pin_messages?: boolean | undefined;
        mention_everyone?: boolean | undefined;
        join_voice?: boolean | undefined;
        mute_members?: boolean | undefined;
        kick_members?: boolean | undefined;
        deafen_members?: boolean | undefined;
        upload_files?: boolean | undefined;
        download_files?: boolean | undefined;
        delete_files?: boolean | undefined;
        ban_members?: boolean | undefined;
        view_audit_log?: boolean | undefined;
        manage_invites?: boolean | undefined;
    } | undefined;
    name?: string | undefined;
    position?: number | undefined;
    color?: string | undefined;
    isHoisted?: boolean | undefined;
    isMentionable?: boolean | undefined;
}>, {
    permissions?: {
        manage_workspace?: boolean | undefined;
        manage_roles?: boolean | undefined;
        manage_channels?: boolean | undefined;
        manage_members?: boolean | undefined;
        manage_billing?: boolean | undefined;
        create_channels?: boolean | undefined;
        delete_channels?: boolean | undefined;
        send_messages?: boolean | undefined;
        delete_messages?: boolean | undefined;
        pin_messages?: boolean | undefined;
        mention_everyone?: boolean | undefined;
        join_voice?: boolean | undefined;
        mute_members?: boolean | undefined;
        kick_members?: boolean | undefined;
        deafen_members?: boolean | undefined;
        upload_files?: boolean | undefined;
        download_files?: boolean | undefined;
        delete_files?: boolean | undefined;
        ban_members?: boolean | undefined;
        view_audit_log?: boolean | undefined;
        manage_invites?: boolean | undefined;
    } | undefined;
    name?: string | undefined;
    position?: number | undefined;
    color?: string | undefined;
    isHoisted?: boolean | undefined;
    isMentionable?: boolean | undefined;
}, {
    permissions?: {
        manage_workspace?: boolean | undefined;
        manage_roles?: boolean | undefined;
        manage_channels?: boolean | undefined;
        manage_members?: boolean | undefined;
        manage_billing?: boolean | undefined;
        create_channels?: boolean | undefined;
        delete_channels?: boolean | undefined;
        send_messages?: boolean | undefined;
        delete_messages?: boolean | undefined;
        pin_messages?: boolean | undefined;
        mention_everyone?: boolean | undefined;
        join_voice?: boolean | undefined;
        mute_members?: boolean | undefined;
        kick_members?: boolean | undefined;
        deafen_members?: boolean | undefined;
        upload_files?: boolean | undefined;
        download_files?: boolean | undefined;
        delete_files?: boolean | undefined;
        ban_members?: boolean | undefined;
        view_audit_log?: boolean | undefined;
        manage_invites?: boolean | undefined;
    } | undefined;
    name?: string | undefined;
    position?: number | undefined;
    color?: string | undefined;
    isHoisted?: boolean | undefined;
    isMentionable?: boolean | undefined;
}>;
export declare const AssignRoleSchema: z.ZodObject<{
    userId: z.ZodString;
    roleId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    roleId: string;
    userId: string;
}, {
    roleId: string;
    userId: string;
}>;
export declare const BanMemberSchema: z.ZodObject<{
    userId: z.ZodString;
    reason: z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, string | undefined>;
    deleteMessagesDays: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    isPermanent: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    expiresAt: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    userId: string;
    deleteMessagesDays: number;
    isPermanent: boolean;
    expiresAt?: string | undefined;
    reason?: string | undefined;
}, {
    userId: string;
    expiresAt?: string | undefined;
    reason?: string | undefined;
    deleteMessagesDays?: number | undefined;
    isPermanent?: boolean | undefined;
}>;
export declare const UnbanMemberSchema: z.ZodObject<{
    userId: z.ZodString;
    reason: z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, string | undefined>;
}, "strip", z.ZodTypeAny, {
    userId: string;
    reason?: string | undefined;
}, {
    userId: string;
    reason?: string | undefined;
}>;
export declare const UpdatePresenceSchema: z.ZodObject<{
    status: z.ZodEnum<["online", "away", "busy", "offline", "invisible"]>;
    customStatus: z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, string | undefined>;
    clearAfter: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    status: "online" | "away" | "busy" | "offline" | "invisible";
    customStatus?: string | undefined;
    clearAfter?: string | undefined;
}, {
    status: "online" | "away" | "busy" | "offline" | "invisible";
    customStatus?: string | undefined;
    clearAfter?: string | undefined;
}>;
export type RegisterInput = z.infer<typeof RegisterSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type ChangePasswordInput = z.infer<typeof ChangePasswordSchema>;
export type CreateWorkspaceInput = z.infer<typeof CreateWorkspaceSchema>;
export type UpdateWorkspaceInput = z.infer<typeof UpdateWorkspaceSchema>;
export type InviteMembersInput = z.infer<typeof InviteMembersSchema>;
export type CreateChannelInput = z.infer<typeof CreateChannelSchema>;
export type UpdateChannelInput = z.infer<typeof UpdateChannelSchema>;
export type SendMessageInput = z.infer<typeof SendMessageSchema>;
export type EditMessageInput = z.infer<typeof EditMessageSchema>;
export type JoinVoiceInput = z.infer<typeof JoinVoiceSchema>;
export type LeaveVoiceInput = z.infer<typeof LeaveVoiceSchema>;
export type RequestUploadUrlInput = z.infer<typeof RequestUploadUrlSchema>;
export type SelectPlanInput = z.infer<typeof SelectPlanSchema>;
export type CreateRoleInput = z.infer<typeof CreateRoleSchema>;
export type UpdateRoleInput = z.infer<typeof UpdateRoleSchema>;
export type UpdatePresenceInput = z.infer<typeof UpdatePresenceSchema>;
type RequestPart = "body" | "params" | "query";
interface ValidateOptions {
    /** Which part of the request to validate. Defaults to "body". */
    part?: RequestPart;
    /**
     * If true, strip unknown keys from the parsed result (default: true).
     * Set to false only when you need to pass-through unknown fields.
     */
    stripUnknown?: boolean;
}
/**
 * Creates an Express middleware that validates the specified part of the
 * request against the given Zod schema.
 *
 * On success  → attaches `req.validated` (typed) and calls `next()`.
 * On failure  → responds with HTTP 422 and a structured error payload.
 *
 * @example
 * router.post("/join", requireAuth(), validate(JoinVoiceSchema), voiceController.join);
 */
export declare function validate<T extends ZodSchema>(schema: T, options?: ValidateOptions): (req: Request, res: Response, next: NextFunction) => void;
/**
 * Validates multiple parts of the request in one middleware call.
 *
 * @example
 * router.get(
 *   "/:workspaceId/messages",
 *   requireAuth(),
 *   validateAll({ params: WorkspaceIdParamSchema, query: PaginationSchema }),
 *   messageController.list
 * );
 */
export declare function validateAll(schemas: Partial<Record<RequestPart, ZodSchema>>): (req: Request, res: Response, next: NextFunction) => void;
/**
 * Converts a ZodError into a flat `{ fieldPath: [messages] }` map
 * suitable for client-side form error rendering.
 */
export declare function formatZodErrors(error: ZodError): Record<string, string[]>;
/**
 * Standalone parse helper — throws a formatted error string if invalid.
 * Useful in service/repository layers where middleware isn't available.
 *
 * @returns Typed, parsed data.
 * @throws Error with a human-readable message listing all field errors.
 */
export declare function parseOrThrow<T extends ZodSchema>(schema: T, data: unknown): z.infer<T>;
export {};
//# sourceMappingURL=validators.d.ts.map