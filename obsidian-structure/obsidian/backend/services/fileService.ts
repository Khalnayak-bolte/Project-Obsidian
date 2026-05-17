/**
 * backend/services/fileService.ts
 * Project: Obsidian
 */

import { createLogger } from "../utils/logger";
import { s3Client, S3_CONFIG } from "../config/aws";
import { TIER_LIMITS, AUDIT_ACTIONS, S3_SIGNED_URL_EXPIRY_SECONDS, BLOCKED_MIME_TYPES } from "../utils/constants";
import * as fileRepo from "../repositories/fileRepository";
import * as workspaceRepo from "../repositories/workspaceRepository";
import { AppError } from "../middleware/errorMiddleware";
import { ERROR_CODES, HTTP_STATUS } from "../types/common";
import {
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { generateId } from "../utils/helpers";
import type {
  RequestUploadUrlInput,
  ConfirmUploadInput,
  DeleteFileInput,
  BulkDeleteFilesInput,
  ListFilesQueryInput,
} from "../schemas/file.schema";

const logger = createLogger("fileService");

// ─── Request signed upload URL ────────────────────────────────────────────────

export async function requestUploadUrl(
  workspaceId: string,
  uid: string,
  input: RequestUploadUrlInput
): Promise<{
  uploadUrl: string;
  fileId: string;
  s3Key: string;
  expiresIn: number;
}> {
  const workspace = await workspaceRepo.getWorkspaceById(workspaceId);
  if (!workspace) {
    throw new AppError("Workspace not found", HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);
  }

  // Blocked MIME types
  if ((BLOCKED_MIME_TYPES as readonly string[]).includes(input.mimeType)) {
    throw new AppError("This file type is not permitted", HTTP_STATUS.BAD_REQUEST, ERROR_CODES.BAD_REQUEST);
  }

  // Tier file size limit
  const limits = TIER_LIMITS[workspace.tier as keyof typeof TIER_LIMITS];
  if (input.sizeBytes > limits.maxFileSizeBytes) {
    const maxMb = limits.maxFileSizeBytes / (1024 * 1024);
    throw new AppError(
      `File size exceeds the ${maxMb}MB limit for your plan`,
      HTTP_STATUS.FORBIDDEN,
      ERROR_CODES.FORBIDDEN
    );
  }

  // Storage capacity check
  const storageUsed = await fileRepo.getTotalStorageUsed(workspaceId);
  if (storageUsed + input.sizeBytes > limits.maxStorageBytes) {
    throw new AppError(
      "Workspace storage limit reached. Please upgrade your plan or delete unused files.",
      HTTP_STATUS.FORBIDDEN,
      ERROR_CODES.FORBIDDEN
    );
  }

  const fileId = generateId("file");
  const s3Key = S3_CONFIG.fileKey(workspaceId, fileId, input.fileName);

  const command = new PutObjectCommand({
    Bucket: S3_CONFIG.bucket,
    Key: s3Key,
    ContentType: input.mimeType,
    ContentLength: input.sizeBytes,
    Metadata: {
      workspaceId,
      uploadedBy: uid,
      fileId,
      channelId: input.channelId ?? "",
    },
    ServerSideEncryption: "AES256",
  });

  const uploadUrl = await getSignedUrl(s3Client, command, {
    expiresIn: S3_SIGNED_URL_EXPIRY_SECONDS,
  });

  logger.info("Upload URL generated", { fileId, workspaceId, uid, sizeBytes: input.sizeBytes });

  return {
    uploadUrl,
    fileId,
    s3Key,
    expiresIn: S3_SIGNED_URL_EXPIRY_SECONDS,
  };
}

// ─── Confirm upload (store metadata after S3 upload completes) ────────────────

export async function confirmUpload(
  workspaceId: string,
  uid: string,
  input: ConfirmUploadInput
): Promise<any> {
  const workspace = await workspaceRepo.getWorkspaceById(workspaceId);
  if (!workspace) {
    throw new AppError("Workspace not found", HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);
  }

  // Verify key belongs to this workspace
  if (!input.s3Key.startsWith(`workspaces/${workspaceId}/`)) {
    throw new AppError("Invalid file key for this workspace", HTTP_STATUS.FORBIDDEN, ERROR_CODES.FORBIDDEN);
  }

  // Check file actually exists in S3
  const alreadyExists = await fileRepo.fileExistsByS3Key(input.s3Key);
  if (alreadyExists) {
    throw new AppError("This file has already been confirmed", HTTP_STATUS.CONFLICT, ERROR_CODES.CONFLICT);
  }

  const cdnUrl = S3_CONFIG.cdnBaseUrl
    ? `${S3_CONFIG.cdnBaseUrl}/${input.s3Key}`
    : undefined;

  const fileRecord = await fileRepo.createFileRecord({
    fileId: input.fileId,
    workspaceId,
    uploadedBy: uid,
    channelId: input.channelId,
    s3Key: input.s3Key,
    fileName: input.fileName,
    mimeType: input.mimeType,
    sizeBytes: input.sizeBytes,
    cdnUrl,
  });

  // Update workspace storage counter
  await fileRepo.incrementWorkspaceStorage(workspaceId, input.sizeBytes);

  logger.info("Upload confirmed", { fileId: input.fileId, workspaceId });
  return fileRecord;
}

// ─── Get signed download URL ──────────────────────────────────────────────────

export async function getDownloadUrl(
  workspaceId: string,
  fileId: string
): Promise<{ downloadUrl: string; expiresIn: number }> {
  const file = await fileRepo.getFileById(fileId);
  if (!file || file.workspaceId !== workspaceId) {
    throw new AppError("File not found", HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);
  }

  if (file.isDeleted) {
    throw new AppError("File has been deleted", HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);
  }

  // If CDN URL available, return it directly (no expiry)
  if (file.cdnUrl) {
    return { downloadUrl: file.cdnUrl, expiresIn: 0 };
  }

  const command = new GetObjectCommand({
    Bucket: S3_CONFIG.bucket,
    Key: file.s3Key,
    ResponseContentDisposition: `attachment; filename="${file.fileName}"`,
  });

  const downloadUrl = await getSignedUrl(s3Client, command, {
    expiresIn: S3_CONFIG.signedUrlExpirySeconds,
  });

  return { downloadUrl, expiresIn: S3_CONFIG.signedUrlExpirySeconds };
}

// ─── Delete file ──────────────────────────────────────────────────────────────

export async function deleteFile(
  workspaceId: string,
  actorId: string,
  fileId: string,
  actorPermissions: Record<string, boolean>
): Promise<void> {
  const file = await fileRepo.getFileById(fileId);
  if (!file || file.workspaceId !== workspaceId) {
    throw new AppError("File not found", HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);
  }

  const isOwn = file.uploadedBy === actorId;
  const canDelete = actorPermissions["delete_files"];

  if (!isOwn && !canDelete) {
    throw new AppError("You do not have permission to delete this file", HTTP_STATUS.FORBIDDEN, ERROR_CODES.FORBIDDEN);
  }

  // Soft delete in Firestore
  await fileRepo.softDeleteFile(fileId);

  // Decrement workspace storage
  await fileRepo.decrementWorkspaceStorage(workspaceId, file.sizeBytes);

  // Delete from S3
  try {
    await s3Client.send(
      new DeleteObjectCommand({ Bucket: S3_CONFIG.bucket, Key: file.s3Key })
    );
  } catch (err) {
    logger.error("S3 delete failed — Firestore record soft-deleted", { fileId, s3Key: file.s3Key, error: err });
  }

  await workspaceRepo.writeAuditLog({
    workspaceId,
    actorId,
    action: AUDIT_ACTIONS.FILE_DELETED,
    metadata: { fileId, fileName: file.fileName, sizeBytes: file.sizeBytes },
  });

  logger.info("File deleted", { fileId, actorId, workspaceId });
}

// ─── Bulk delete files ────────────────────────────────────────────────────────

export async function bulkDeleteFiles(
  workspaceId: string,
  actorId: string,
  input: BulkDeleteFilesInput,
  actorPermissions: Record<string, boolean>
): Promise<{ deleted: number; failed: number }> {
  let deleted = 0;
  let failed = 0;

  for (const fileId of input.fileIds) {
    try {
      await deleteFile(workspaceId, actorId, fileId, actorPermissions);
      deleted++;
    } catch {
      failed++;
    }
  }

  logger.info("Bulk file delete complete", { workspaceId, deleted, failed });
  return { deleted, failed };
}

// ─── List files ───────────────────────────────────────────────────────────────

export async function listFiles(
  workspaceId: string,
  query: ListFilesQueryInput
): Promise<{ files: any[]; nextCursor: string | null }> {
  const workspace = await workspaceRepo.getWorkspaceById(workspaceId);
  if (!workspace) {
    throw new AppError("Workspace not found", HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);
  }

  return fileRepo.getFilesByWorkspace(workspaceId, {
    limit: query.limit ?? 20,
    cursor: query.cursor,
    mimeType: query.mimeType,
    channelId: query.channelId,
    uploadedBy: query.uploadedBy,
  });
}

// ─── Get storage usage ────────────────────────────────────────────────────────

export async function getStorageUsage(workspaceId: string): Promise<{
  usedBytes: number;
  capacityBytes: number;
  usedPercent: number;
  tier: string;
}> {
  const workspace = await workspaceRepo.getWorkspaceById(workspaceId);
  if (!workspace) {
    throw new AppError("Workspace not found", HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);
  }

  const limits = TIER_LIMITS[workspace.tier as keyof typeof TIER_LIMITS];
  const usedBytes = await fileRepo.getTotalStorageUsed(workspaceId);
  const capacityBytes = limits.maxStorageBytes;

  return {
    usedBytes,
    capacityBytes,
    usedPercent: Math.round((usedBytes / capacityBytes) * 100),
    tier: workspace.tier,
  };
}

// ─── Cleanup orphaned files ───────────────────────────────────────────────────

export async function cleanupOrphanedFiles(workspaceId: string): Promise<number> {
  const files = await fileRepo.getFilesForCleanup(workspaceId);
  let cleaned = 0;

  for (const file of files) {
    try {
      await s3Client.send(
        new DeleteObjectCommand({ Bucket: S3_CONFIG.bucket, Key: file.s3Key })
      );
      await fileRepo.hardDeleteFile(file.fileId);
      cleaned++;
    } catch (err) {
      logger.error("Failed to cleanup orphaned file", { fileId: file.fileId, error: err });
    }
  }

  if (cleaned > 0) {
    logger.info("Orphaned files cleaned up", { workspaceId, count: cleaned });
  }

  return cleaned;
}
