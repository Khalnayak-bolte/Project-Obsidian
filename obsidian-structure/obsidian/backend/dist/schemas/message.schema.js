/**
 * backend/schemas/message.schema.ts
 * Project: Obsidian
 *
 * Zod validation schemas for all message-related request bodies.
 * Covers sending, editing, reactions, mentions, attachments,
 * pinning, and message list query parameters.
 */
import { z } from "zod";
// ─── Shared enums ─────────────────────────────────────────────────────────────
export const MessageTypeEnum = z.enum(["text", "system", "file", "voice_started", "voice_ended"], {
    errorMap: () => ({
        message: "Message type must be one of: text, system, file, voice_started, voice_ended.",
    }),
});
export const AttachmentTypeEnum = z.enum(["image", "video", "audio", "document", "other"], {
    errorMap: () => ({
        message: "Attachment type must be one of: image, video, audio, document, other.",
    }),
});
export const MentionTypeEnum = z.enum(["user", "role", "channel", "everyone"], {
    errorMap: () => ({
        message: "Mention type must be one of: user, role, channel, everyone.",
    }),
});
// ─── Attachment schema ────────────────────────────────────────────────────────
export const MessageAttachmentSchema = z.object({
    fileId: z
        .string({ required_error: "File ID is required." })
        .trim()
        .min(1, "File ID must not be empty.")
        .max(64, "File ID must not exceed 64 characters."),
    name: z
        .string({ required_error: "Attachment name is required." })
        .trim()
        .min(1, "Attachment name must not be empty.")
        .max(255, "Attachment name must not exceed 255 characters."),
    type: AttachmentTypeEnum,
    mimeType: z
        .string({ required_error: "MIME type is required." })
        .trim()
        .min(1, "MIME type must not be empty.")
        .max(128, "MIME type must not exceed 128 characters.")
        .regex(/^[a-zA-Z0-9!#$&\-^_]+\/[a-zA-Z0-9!#$&\-^_.+]+$/, "MIME type format is invalid."),
    sizeBytes: z
        .number({ required_error: "File size is required." })
        .int("File size must be a whole number.")
        .min(1, "File size must be at least 1 byte.")
        .max(524_288_000, "File size must not exceed 500 MB."),
    url: z
        .string({ required_error: "File URL is required." })
        .trim()
        .url("File URL must be a valid URL.")
        .max(2048, "File URL must not exceed 2048 characters."),
    thumbnailUrl: z
        .string()
        .trim()
        .url("Thumbnail URL must be a valid URL.")
        .max(2048, "Thumbnail URL must not exceed 2048 characters.")
        .optional(),
    width: z
        .number()
        .int("Width must be a whole number.")
        .min(1)
        .max(20000)
        .optional(),
    height: z
        .number()
        .int("Height must be a whole number.")
        .min(1)
        .max(20000)
        .optional(),
    durationSeconds: z
        .number()
        .min(0, "Duration must be non-negative.")
        .max(86400, "Duration must not exceed 24 hours.")
        .optional(),
});
// ─── Mention schema ───────────────────────────────────────────────────────────
export const MessageMentionSchema = z.object({
    type: MentionTypeEnum,
    targetId: z
        .string({ required_error: "Mention target ID is required." })
        .trim()
        .min(1, "Mention target ID must not be empty.")
        .max(128, "Mention target ID must not exceed 128 characters."),
    displayName: z
        .string({ required_error: "Mention display name is required." })
        .trim()
        .min(1, "Mention display name must not be empty.")
        .max(64, "Mention display name must not exceed 64 characters."),
});
// ─── Send Message ─────────────────────────────────────────────────────────────
export const SendMessageSchema = z.object({
    content: z
        .string({ required_error: "Message content is required." })
        .min(1, "Message content must not be empty.")
        .max(4000, "Message content must not exceed 4,000 characters."),
    type: MessageTypeEnum.optional().default("text"),
    attachments: z
        .array(MessageAttachmentSchema)
        .max(10, "Cannot attach more than 10 files per message.")
        .optional()
        .default([]),
    replyToMessageId: z
        .string()
        .trim()
        .min(1, "Reply message ID must not be empty.")
        .max(64, "Reply message ID must not exceed 64 characters.")
        .optional(),
    mentions: z
        .array(MessageMentionSchema)
        .max(50, "Cannot have more than 50 mentions in a single message.")
        .optional()
        .default([]),
});
// ─── Edit Message ─────────────────────────────────────────────────────────────
export const EditMessageSchema = z.object({
    content: z
        .string({ required_error: "Message content is required." })
        .min(1, "Edited content must not be empty.")
        .max(4000, "Message content must not exceed 4,000 characters."),
});
// ─── Add Reaction ─────────────────────────────────────────────────────────────
// Validates a single unicode emoji (standard emoji or ZWJ sequence)
const emojiRegex = /^(\p{Emoji_Presentation}|\p{Extended_Pictographic})(\u200D(\p{Emoji_Presentation}|\p{Extended_Pictographic})|\uFE0F|\u20E3)*$/u;
export const AddReactionSchema = z.object({
    emoji: z
        .string({ required_error: "Emoji is required." })
        .trim()
        .min(1, "Emoji must not be empty.")
        .max(16, "Emoji must not exceed 16 characters.")
        .regex(emojiRegex, "Only valid unicode emoji are allowed."),
});
// ─── Remove Reaction ──────────────────────────────────────────────────────────
export const RemoveReactionSchema = AddReactionSchema;
// ─── Pin / Unpin Message ──────────────────────────────────────────────────────
// No body needed — messageId comes from the route param.
// Schema kept as an empty object for middleware consistency.
export const PinMessageSchema = z.object({});
// ─── Delete Message ───────────────────────────────────────────────────────────
export const DeleteMessageSchema = z.object({
    reason: z
        .string()
        .trim()
        .max(256, "Reason must not exceed 256 characters.")
        .optional(),
});
// ─── Get Messages Query ───────────────────────────────────────────────────────
export const GetMessagesQuerySchema = z
    .object({
    limit: z
        .string()
        .optional()
        .transform((v) => (v ? parseInt(v, 10) : 50))
        .pipe(z
        .number()
        .int()
        .min(1, "Limit must be at least 1.")
        .max(100, "Limit must not exceed 100.")),
    cursor: z.string().trim().optional(),
    before: z
        .string()
        .datetime({ message: "before must be a valid ISO 8601 timestamp." })
        .optional(),
    after: z
        .string()
        .datetime({ message: "after must be a valid ISO 8601 timestamp." })
        .optional(),
})
    .refine((data) => !(data.before && data.after), { message: "Cannot use both 'before' and 'after' simultaneously." });
// ─── Search Messages Query ────────────────────────────────────────────────────
export const SearchMessagesQuerySchema = z.object({
    q: z
        .string({ required_error: "Search query is required." })
        .trim()
        .min(1, "Search query must not be empty.")
        .max(256, "Search query must not exceed 256 characters."),
    channelId: z.string().trim().optional(),
    senderId: z.string().trim().optional(),
    limit: z
        .string()
        .optional()
        .transform((v) => (v ? parseInt(v, 10) : 25))
        .pipe(z
        .number()
        .int()
        .min(1, "Limit must be at least 1.")
        .max(50, "Limit must not exceed 50.")),
    cursor: z.string().trim().optional(),
});
// ─── Bulk Delete Messages (admin) ─────────────────────────────────────────────
export const BulkDeleteMessagesSchema = z.object({
    messageIds: z
        .array(z
        .string({ required_error: "Message ID is required." })
        .trim()
        .min(1, "Message ID must not be empty.")
        .max(64, "Message ID must not exceed 64 characters."))
        .min(1, "At least one message ID must be provided.")
        .max(100, "Cannot delete more than 100 messages at once."),
    reason: z
        .string()
        .trim()
        .max(256, "Reason must not exceed 256 characters.")
        .optional(),
});
//# sourceMappingURL=message.schema.js.map