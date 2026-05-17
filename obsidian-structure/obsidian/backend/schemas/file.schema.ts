/**
 * backend/schemas/file.schema.ts
 * Project: Obsidian
 *
 * Zod validation schemas for all file-related request bodies.
 * Covers signed URL requests, upload confirmation, file metadata
 * updates, deletion, and query parameters.
 *
 * Max file sizes are enforced per subscription tier at the service layer;
 * these schemas apply the absolute ceiling (Deluxe: 500 MB).
 */

import { z } from "zod";

// ─── Allowed MIME types ───────────────────────────────────────────────────────
// Whitelist keeps the platform safe — unknown types are rejected at schema level.

export const ALLOWED_MIME_TYPES = [
  // Images
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  "image/avif",
  // Video
  "video/mp4",
  "video/webm",
  "video/quicktime",
  // Audio
  "audio/mpeg",
  "audio/ogg",
  "audio/wav",
  "audio/webm",
  "audio/mp4",
  // Documents
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  // Text / Code
  "text/plain",
  "text/markdown",
  "text/csv",
  "application/json",
  "application/zip",
  "application/x-zip-compressed",
] as const;

export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

export const MimeTypeEnum = z.enum(ALLOWED_MIME_TYPES, {
  errorMap: () => ({ message: "File type is not supported." }),
});

// ─── Attachment type enum (mirrors message schema) ────────────────────────────

export const AttachmentTypeEnum = z.enum(
  ["image", "video", "audio", "document", "other"],
  {
    errorMap: () => ({
      message:
        "Attachment type must be one of: image, video, audio, document, other.",
    }),
  }
);

// ─── Shared field definitions ─────────────────────────────────────────────────

const MAX_FILE_SIZE_BYTES = 500 * 1024 * 1024; // 500 MB — Deluxe ceiling

const fileNameField = z
  .string({ required_error: "File name is required." })
  .trim()
  .min(1, "File name must not be empty.")
  .max(255, "File name must not exceed 255 characters.")
  .refine(
    (name) => !/[<>:"/\\|?*\x00-\x1f]/.test(name),
    "File name contains invalid characters."
  );

const fileSizeField = z
  .number({ required_error: "File size is required." })
  .int("File size must be a whole number.")
  .min(1, "File size must be at least 1 byte.")
  .max(MAX_FILE_SIZE_BYTES, "File size must not exceed 500 MB.");

const channelIdField = z
  .string()
  .trim()
  .min(1, "Channel ID must not be empty.")
  .max(64, "Channel ID must not exceed 64 characters.")
  .optional();

// ─── Request Signed Upload URL ────────────────────────────────────────────────
// Client calls this before uploading directly to S3.

export const RequestUploadUrlSchema = z.object({
  fileName: fileNameField,
  mimeType: MimeTypeEnum,
  sizeBytes: fileSizeField,
  channelId: channelIdField,
  // Optional message context — file will be linked to this message
  messageId: z
    .string()
    .trim()
    .min(1, "Message ID must not be empty.")
    .max(64, "Message ID must not exceed 64 characters.")
    .optional(),
});

export type RequestUploadUrlInput = z.infer<typeof RequestUploadUrlSchema>;

// ─── Confirm Upload Complete ──────────────────────────────────────────────────
// Called after the client successfully PUT to the signed S3 URL.

export const ConfirmUploadSchema = z.object({
  fileId: z
    .string({ required_error: "File ID is required." })
    .trim()
    .min(1, "File ID must not be empty.")
    .max(64, "File ID must not exceed 64 characters."),
  // S3 ETag returned by the upload response, used for integrity verification
  etag: z
    .string({ required_error: "ETag is required." })
    .trim()
    .min(1, "ETag must not be empty.")
    .max(64, "ETag must not exceed 64 characters.")
    .optional(),
});

export type ConfirmUploadInput = z.infer<typeof ConfirmUploadSchema>;

// ─── Update File Metadata ─────────────────────────────────────────────────────

export const UpdateFileMetadataSchema = z
  .object({
    name: fileNameField.optional(),
    description: z
      .string()
      .trim()
      .max(512, "Description must not exceed 512 characters.")
      .optional(),
  })
  .refine(
    (data) => data.name !== undefined || data.description !== undefined,
    { message: "At least one field must be provided to update." }
  );

export type UpdateFileMetadataInput = z.infer<typeof UpdateFileMetadataSchema>;

// ─── Delete File ──────────────────────────────────────────────────────────────

export const DeleteFileSchema = z.object({
  reason: z
    .string()
    .trim()
    .max(256, "Reason must not exceed 256 characters.")
    .optional(),
});

export type DeleteFileInput = z.infer<typeof DeleteFileSchema>;

// ─── Bulk Delete Files ────────────────────────────────────────────────────────

export const BulkDeleteFilesSchema = z.object({
  fileIds: z
    .array(
      z
        .string({ required_error: "File ID is required." })
        .trim()
        .min(1, "File ID must not be empty.")
        .max(64, "File ID must not exceed 64 characters.")
    )
    .min(1, "At least one file ID must be provided.")
    .max(50, "Cannot delete more than 50 files at once."),
  reason: z
    .string()
    .trim()
    .max(256, "Reason must not exceed 256 characters.")
    .optional(),
});

export type BulkDeleteFilesInput = z.infer<typeof BulkDeleteFilesSchema>;

// ─── List Files Query ─────────────────────────────────────────────────────────

export const ListFilesQuerySchema = z.object({
  channelId: z.string().trim().optional(),
  type: AttachmentTypeEnum.optional(),
  uploadedBy: z.string().trim().optional(),
  limit: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 50))
    .pipe(
      z
        .number()
        .int()
        .min(1, "Limit must be at least 1.")
        .max(100, "Limit must not exceed 100.")
    ),
  cursor: z.string().trim().optional(),
  sortBy: z
    .enum(["createdAt", "name", "sizeBytes"], {
      errorMap: () => ({
        message: "sortBy must be one of: createdAt, name, sizeBytes.",
      }),
    })
    .optional()
    .default("createdAt"),
  sortOrder: z
    .enum(["asc", "desc"], {
      errorMap: () => ({
        message: "sortOrder must be either 'asc' or 'desc'.",
      }),
    })
    .optional()
    .default("desc"),
});

export type ListFilesQueryInput = z.infer<typeof ListFilesQuerySchema>;

// ─── Search Files Query ───────────────────────────────────────────────────────

export const SearchFilesQuerySchema = z.object({
  q: z
    .string({ required_error: "Search query is required." })
    .trim()
    .min(1, "Search query must not be empty.")
    .max(128, "Search query must not exceed 128 characters."),
  channelId: z.string().trim().optional(),
  type: AttachmentTypeEnum.optional(),
  limit: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 25))
    .pipe(
      z
        .number()
        .int()
        .min(1, "Limit must be at least 1.")
        .max(50, "Limit must not exceed 50.")
    ),
});

export type SearchFilesQueryInput = z.infer<typeof SearchFilesQuerySchema>;

// ─── Get Download URL ─────────────────────────────────────────────────────────
// Generates a time-limited signed CloudFront / S3 URL for secure download.

export const GetDownloadUrlSchema = z.object({
  expiresInSeconds: z
    .number()
    .int("Expiry must be a whole number of seconds.")
    .min(60, "Expiry must be at least 60 seconds.")
    .max(3600, "Expiry must not exceed 3,600 seconds (1 hour).")
    .optional()
    .default(900), // 15 minutes default
});

export type GetDownloadUrlInput = z.infer<typeof GetDownloadUrlSchema>;

// ─── Move File (to another channel) ──────────────────────────────────────────

export const MoveFileSchema = z.object({
  targetChannelId: z
    .string({ required_error: "Target channel ID is required." })
    .trim()
    .min(1, "Target channel ID must not be empty.")
    .max(64, "Target channel ID must not exceed 64 characters."),
});

export type MoveFileInput = z.infer<typeof MoveFileSchema>;
