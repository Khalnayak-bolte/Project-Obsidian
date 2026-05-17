/**
 * backend/schemas/message.schema.ts
 * Project: Obsidian
 *
 * Zod validation schemas for all message-related request bodies.
 * Covers sending, editing, reactions, mentions, attachments,
 * pinning, and message list query parameters.
 */
import { z } from "zod";
export declare const MessageTypeEnum: z.ZodEnum<["text", "system", "file", "voice_started", "voice_ended"]>;
export declare const AttachmentTypeEnum: z.ZodEnum<["image", "video", "audio", "document", "other"]>;
export declare const MentionTypeEnum: z.ZodEnum<["user", "role", "channel", "everyone"]>;
export declare const MessageAttachmentSchema: z.ZodObject<{
    fileId: z.ZodString;
    name: z.ZodString;
    type: z.ZodEnum<["image", "video", "audio", "document", "other"]>;
    mimeType: z.ZodString;
    sizeBytes: z.ZodNumber;
    url: z.ZodString;
    thumbnailUrl: z.ZodOptional<z.ZodString>;
    width: z.ZodOptional<z.ZodNumber>;
    height: z.ZodOptional<z.ZodNumber>;
    durationSeconds: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    type: "other" | "image" | "video" | "audio" | "document";
    name: string;
    fileId: string;
    mimeType: string;
    sizeBytes: number;
    url: string;
    thumbnailUrl?: string | undefined;
    width?: number | undefined;
    height?: number | undefined;
    durationSeconds?: number | undefined;
}, {
    type: "other" | "image" | "video" | "audio" | "document";
    name: string;
    fileId: string;
    mimeType: string;
    sizeBytes: number;
    url: string;
    thumbnailUrl?: string | undefined;
    width?: number | undefined;
    height?: number | undefined;
    durationSeconds?: number | undefined;
}>;
export type MessageAttachmentInput = z.infer<typeof MessageAttachmentSchema>;
export declare const MessageMentionSchema: z.ZodObject<{
    type: z.ZodEnum<["user", "role", "channel", "everyone"]>;
    targetId: z.ZodString;
    displayName: z.ZodString;
}, "strip", z.ZodTypeAny, {
    displayName: string;
    type: "role" | "user" | "channel" | "everyone";
    targetId: string;
}, {
    displayName: string;
    type: "role" | "user" | "channel" | "everyone";
    targetId: string;
}>;
export type MessageMentionInput = z.infer<typeof MessageMentionSchema>;
export declare const SendMessageSchema: z.ZodObject<{
    content: z.ZodString;
    type: z.ZodDefault<z.ZodOptional<z.ZodEnum<["text", "system", "file", "voice_started", "voice_ended"]>>>;
    attachments: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodObject<{
        fileId: z.ZodString;
        name: z.ZodString;
        type: z.ZodEnum<["image", "video", "audio", "document", "other"]>;
        mimeType: z.ZodString;
        sizeBytes: z.ZodNumber;
        url: z.ZodString;
        thumbnailUrl: z.ZodOptional<z.ZodString>;
        width: z.ZodOptional<z.ZodNumber>;
        height: z.ZodOptional<z.ZodNumber>;
        durationSeconds: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        type: "other" | "image" | "video" | "audio" | "document";
        name: string;
        fileId: string;
        mimeType: string;
        sizeBytes: number;
        url: string;
        thumbnailUrl?: string | undefined;
        width?: number | undefined;
        height?: number | undefined;
        durationSeconds?: number | undefined;
    }, {
        type: "other" | "image" | "video" | "audio" | "document";
        name: string;
        fileId: string;
        mimeType: string;
        sizeBytes: number;
        url: string;
        thumbnailUrl?: string | undefined;
        width?: number | undefined;
        height?: number | undefined;
        durationSeconds?: number | undefined;
    }>, "many">>>;
    replyToMessageId: z.ZodOptional<z.ZodString>;
    mentions: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodObject<{
        type: z.ZodEnum<["user", "role", "channel", "everyone"]>;
        targetId: z.ZodString;
        displayName: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        displayName: string;
        type: "role" | "user" | "channel" | "everyone";
        targetId: string;
    }, {
        displayName: string;
        type: "role" | "user" | "channel" | "everyone";
        targetId: string;
    }>, "many">>>;
}, "strip", z.ZodTypeAny, {
    type: "file" | "text" | "system" | "voice_started" | "voice_ended";
    content: string;
    attachments: {
        type: "other" | "image" | "video" | "audio" | "document";
        name: string;
        fileId: string;
        mimeType: string;
        sizeBytes: number;
        url: string;
        thumbnailUrl?: string | undefined;
        width?: number | undefined;
        height?: number | undefined;
        durationSeconds?: number | undefined;
    }[];
    mentions: {
        displayName: string;
        type: "role" | "user" | "channel" | "everyone";
        targetId: string;
    }[];
    replyToMessageId?: string | undefined;
}, {
    content: string;
    type?: "file" | "text" | "system" | "voice_started" | "voice_ended" | undefined;
    attachments?: {
        type: "other" | "image" | "video" | "audio" | "document";
        name: string;
        fileId: string;
        mimeType: string;
        sizeBytes: number;
        url: string;
        thumbnailUrl?: string | undefined;
        width?: number | undefined;
        height?: number | undefined;
        durationSeconds?: number | undefined;
    }[] | undefined;
    replyToMessageId?: string | undefined;
    mentions?: {
        displayName: string;
        type: "role" | "user" | "channel" | "everyone";
        targetId: string;
    }[] | undefined;
}>;
export type SendMessageInput = z.infer<typeof SendMessageSchema>;
export declare const EditMessageSchema: z.ZodObject<{
    content: z.ZodString;
}, "strip", z.ZodTypeAny, {
    content: string;
}, {
    content: string;
}>;
export type EditMessageInput = z.infer<typeof EditMessageSchema>;
export declare const AddReactionSchema: z.ZodObject<{
    emoji: z.ZodString;
}, "strip", z.ZodTypeAny, {
    emoji: string;
}, {
    emoji: string;
}>;
export type AddReactionInput = z.infer<typeof AddReactionSchema>;
export declare const RemoveReactionSchema: z.ZodObject<{
    emoji: z.ZodString;
}, "strip", z.ZodTypeAny, {
    emoji: string;
}, {
    emoji: string;
}>;
export type RemoveReactionInput = AddReactionInput;
export declare const PinMessageSchema: z.ZodObject<{}, "strip", z.ZodTypeAny, {}, {}>;
export type PinMessageInput = z.infer<typeof PinMessageSchema>;
export declare const DeleteMessageSchema: z.ZodObject<{
    reason: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    reason?: string | undefined;
}, {
    reason?: string | undefined;
}>;
export type DeleteMessageInput = z.infer<typeof DeleteMessageSchema>;
export declare const GetMessagesQuerySchema: z.ZodEffects<z.ZodObject<{
    limit: z.ZodPipeline<z.ZodEffects<z.ZodOptional<z.ZodString>, number, string | undefined>, z.ZodNumber>;
    cursor: z.ZodOptional<z.ZodString>;
    before: z.ZodOptional<z.ZodString>;
    after: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    cursor?: string | undefined;
    before?: string | undefined;
    after?: string | undefined;
}, {
    limit?: string | undefined;
    cursor?: string | undefined;
    before?: string | undefined;
    after?: string | undefined;
}>, {
    limit: number;
    cursor?: string | undefined;
    before?: string | undefined;
    after?: string | undefined;
}, {
    limit?: string | undefined;
    cursor?: string | undefined;
    before?: string | undefined;
    after?: string | undefined;
}>;
export type GetMessagesQueryInput = z.infer<typeof GetMessagesQuerySchema>;
export declare const SearchMessagesQuerySchema: z.ZodObject<{
    q: z.ZodString;
    channelId: z.ZodOptional<z.ZodString>;
    senderId: z.ZodOptional<z.ZodString>;
    limit: z.ZodPipeline<z.ZodEffects<z.ZodOptional<z.ZodString>, number, string | undefined>, z.ZodNumber>;
    cursor: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    q: string;
    cursor?: string | undefined;
    channelId?: string | undefined;
    senderId?: string | undefined;
}, {
    q: string;
    limit?: string | undefined;
    cursor?: string | undefined;
    channelId?: string | undefined;
    senderId?: string | undefined;
}>;
export type SearchMessagesQueryInput = z.infer<typeof SearchMessagesQuerySchema>;
export declare const BulkDeleteMessagesSchema: z.ZodObject<{
    messageIds: z.ZodArray<z.ZodString, "many">;
    reason: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    messageIds: string[];
    reason?: string | undefined;
}, {
    messageIds: string[];
    reason?: string | undefined;
}>;
export type BulkDeleteMessagesInput = z.infer<typeof BulkDeleteMessagesSchema>;
//# sourceMappingURL=message.schema.d.ts.map