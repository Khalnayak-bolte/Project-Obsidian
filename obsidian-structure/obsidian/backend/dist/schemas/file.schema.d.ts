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
export declare const ALLOWED_MIME_TYPES: readonly ["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml", "image/avif", "video/mp4", "video/webm", "video/quicktime", "audio/mpeg", "audio/ogg", "audio/wav", "audio/webm", "audio/mp4", "application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/vnd.ms-powerpoint", "application/vnd.openxmlformats-officedocument.presentationml.presentation", "text/plain", "text/markdown", "text/csv", "application/json", "application/zip", "application/x-zip-compressed"];
export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];
export declare const MimeTypeEnum: z.ZodEnum<["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml", "image/avif", "video/mp4", "video/webm", "video/quicktime", "audio/mpeg", "audio/ogg", "audio/wav", "audio/webm", "audio/mp4", "application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/vnd.ms-powerpoint", "application/vnd.openxmlformats-officedocument.presentationml.presentation", "text/plain", "text/markdown", "text/csv", "application/json", "application/zip", "application/x-zip-compressed"]>;
export declare const AttachmentTypeEnum: z.ZodEnum<["image", "video", "audio", "document", "other"]>;
export declare const RequestUploadUrlSchema: z.ZodObject<{
    fileName: z.ZodEffects<z.ZodString, string, string>;
    mimeType: z.ZodEnum<["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml", "image/avif", "video/mp4", "video/webm", "video/quicktime", "audio/mpeg", "audio/ogg", "audio/wav", "audio/webm", "audio/mp4", "application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/vnd.ms-powerpoint", "application/vnd.openxmlformats-officedocument.presentationml.presentation", "text/plain", "text/markdown", "text/csv", "application/json", "application/zip", "application/x-zip-compressed"]>;
    sizeBytes: z.ZodNumber;
    channelId: z.ZodOptional<z.ZodString>;
    messageId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    mimeType: "image/jpeg" | "image/png" | "image/gif" | "image/webp" | "image/svg+xml" | "application/pdf" | "application/msword" | "application/vnd.openxmlformats-officedocument.wordprocessingml.document" | "application/vnd.ms-excel" | "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" | "application/vnd.ms-powerpoint" | "application/vnd.openxmlformats-officedocument.presentationml.presentation" | "text/plain" | "text/csv" | "text/markdown" | "application/zip" | "application/json" | "image/avif" | "video/mp4" | "video/webm" | "video/quicktime" | "audio/mpeg" | "audio/ogg" | "audio/wav" | "audio/webm" | "audio/mp4" | "application/x-zip-compressed";
    sizeBytes: number;
    fileName: string;
    channelId?: string | undefined;
    messageId?: string | undefined;
}, {
    mimeType: "image/jpeg" | "image/png" | "image/gif" | "image/webp" | "image/svg+xml" | "application/pdf" | "application/msword" | "application/vnd.openxmlformats-officedocument.wordprocessingml.document" | "application/vnd.ms-excel" | "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" | "application/vnd.ms-powerpoint" | "application/vnd.openxmlformats-officedocument.presentationml.presentation" | "text/plain" | "text/csv" | "text/markdown" | "application/zip" | "application/json" | "image/avif" | "video/mp4" | "video/webm" | "video/quicktime" | "audio/mpeg" | "audio/ogg" | "audio/wav" | "audio/webm" | "audio/mp4" | "application/x-zip-compressed";
    sizeBytes: number;
    fileName: string;
    channelId?: string | undefined;
    messageId?: string | undefined;
}>;
export type RequestUploadUrlInput = z.infer<typeof RequestUploadUrlSchema>;
export declare const ConfirmUploadSchema: z.ZodObject<{
    fileId: z.ZodString;
    etag: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    fileId: string;
    etag?: string | undefined;
}, {
    fileId: string;
    etag?: string | undefined;
}>;
export type ConfirmUploadInput = z.infer<typeof ConfirmUploadSchema>;
export declare const UpdateFileMetadataSchema: z.ZodEffects<z.ZodObject<{
    name: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
    description: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    description?: string | undefined;
    name?: string | undefined;
}, {
    description?: string | undefined;
    name?: string | undefined;
}>, {
    description?: string | undefined;
    name?: string | undefined;
}, {
    description?: string | undefined;
    name?: string | undefined;
}>;
export type UpdateFileMetadataInput = z.infer<typeof UpdateFileMetadataSchema>;
export declare const DeleteFileSchema: z.ZodObject<{
    reason: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    reason?: string | undefined;
}, {
    reason?: string | undefined;
}>;
export type DeleteFileInput = z.infer<typeof DeleteFileSchema>;
export declare const BulkDeleteFilesSchema: z.ZodObject<{
    fileIds: z.ZodArray<z.ZodString, "many">;
    reason: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    fileIds: string[];
    reason?: string | undefined;
}, {
    fileIds: string[];
    reason?: string | undefined;
}>;
export type BulkDeleteFilesInput = z.infer<typeof BulkDeleteFilesSchema>;
export declare const ListFilesQuerySchema: z.ZodObject<{
    channelId: z.ZodOptional<z.ZodString>;
    type: z.ZodOptional<z.ZodEnum<["image", "video", "audio", "document", "other"]>>;
    uploadedBy: z.ZodOptional<z.ZodString>;
    limit: z.ZodPipeline<z.ZodEffects<z.ZodOptional<z.ZodString>, number, string | undefined>, z.ZodNumber>;
    cursor: z.ZodOptional<z.ZodString>;
    sortBy: z.ZodDefault<z.ZodOptional<z.ZodEnum<["createdAt", "name", "sizeBytes"]>>>;
    sortOrder: z.ZodDefault<z.ZodOptional<z.ZodEnum<["asc", "desc"]>>>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    sortBy: "createdAt" | "name" | "sizeBytes";
    sortOrder: "desc" | "asc";
    cursor?: string | undefined;
    type?: "other" | "image" | "video" | "audio" | "document" | undefined;
    channelId?: string | undefined;
    uploadedBy?: string | undefined;
}, {
    limit?: string | undefined;
    cursor?: string | undefined;
    type?: "other" | "image" | "video" | "audio" | "document" | undefined;
    channelId?: string | undefined;
    uploadedBy?: string | undefined;
    sortBy?: "createdAt" | "name" | "sizeBytes" | undefined;
    sortOrder?: "desc" | "asc" | undefined;
}>;
export type ListFilesQueryInput = z.infer<typeof ListFilesQuerySchema>;
export declare const SearchFilesQuerySchema: z.ZodObject<{
    q: z.ZodString;
    channelId: z.ZodOptional<z.ZodString>;
    type: z.ZodOptional<z.ZodEnum<["image", "video", "audio", "document", "other"]>>;
    limit: z.ZodPipeline<z.ZodEffects<z.ZodOptional<z.ZodString>, number, string | undefined>, z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    q: string;
    type?: "other" | "image" | "video" | "audio" | "document" | undefined;
    channelId?: string | undefined;
}, {
    q: string;
    limit?: string | undefined;
    type?: "other" | "image" | "video" | "audio" | "document" | undefined;
    channelId?: string | undefined;
}>;
export type SearchFilesQueryInput = z.infer<typeof SearchFilesQuerySchema>;
export declare const GetDownloadUrlSchema: z.ZodObject<{
    expiresInSeconds: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    expiresInSeconds: number;
}, {
    expiresInSeconds?: number | undefined;
}>;
export type GetDownloadUrlInput = z.infer<typeof GetDownloadUrlSchema>;
export declare const MoveFileSchema: z.ZodObject<{
    targetChannelId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    targetChannelId: string;
}, {
    targetChannelId: string;
}>;
export type MoveFileInput = z.infer<typeof MoveFileSchema>;
//# sourceMappingURL=file.schema.d.ts.map