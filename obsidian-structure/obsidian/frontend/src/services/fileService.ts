/**
 * frontend/src/services/fileService.ts
 * Project: Obsidian
 */

import { apiGet, apiPost, apiDelete } from "../lib/axios";
import apiClient from "../lib/axios";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FileRecord {
  fileId: string;
  workspaceId: string;
  channelId?: string;
  uploadedBy: string;
  uploaderName?: string;
  s3Key: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  cdnUrl?: string;
  isDeleted: boolean;
  createdAt: string;
}

export interface RequestUploadUrlPayload {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  channelId?: string;
  isPublic?: boolean;
}

export interface RequestUploadUrlResponse {
  uploadUrl: string;
  fileId: string;
  s3Key: string;
  expiresIn: number;
}

export interface ConfirmUploadPayload {
  fileId: string;
  s3Key: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  channelId?: string;
}

export interface DownloadUrlResponse {
  downloadUrl: string;
  expiresIn: number;
}

export interface StorageUsageResponse {
  usedBytes: number;
  capacityBytes: number;
  usedPercent: number;
  tier: string;
}

export interface ListFilesParams {
  limit?: number;
  cursor?: string;
  mimeType?: string;
  channelId?: string;
  uploadedBy?: string;
}

export interface ListFilesResponse {
  files: FileRecord[];
  nextCursor: string | null;
}

export interface UploadProgressCallback {
  (progress: number): void;
}

// ─── Upload flow ──────────────────────────────────────────────────────────────

export async function requestUploadUrl(
  workspaceId: string,
  payload: RequestUploadUrlPayload
): Promise<RequestUploadUrlResponse> {
  return apiPost<RequestUploadUrlResponse>(
    `/api/v1/workspaces/${workspaceId}/files/upload-url`,
    payload
  );
}

export async function uploadToS3(
  uploadUrl: string,
  file: File,
  onProgress?: UploadProgressCallback
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    });

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`S3 upload failed with status ${xhr.status}`));
      }
    });

    xhr.addEventListener("error", () => reject(new Error("S3 upload network error")));
    xhr.addEventListener("abort", () => reject(new Error("S3 upload aborted")));

    xhr.open("PUT", uploadUrl);
    xhr.setRequestHeader("Content-Type", file.type);
    xhr.send(file);
  });
}

export async function confirmUpload(
  workspaceId: string,
  payload: ConfirmUploadPayload
): Promise<FileRecord> {
  return apiPost<FileRecord>(
    `/api/v1/workspaces/${workspaceId}/files/confirm`,
    payload
  );
}

/**
 * Full upload pipeline: request URL → upload to S3 → confirm metadata.
 */
export async function uploadFile(
  workspaceId: string,
  file: File,
  opts: { channelId?: string; onProgress?: UploadProgressCallback } = {}
): Promise<FileRecord> {
  const { uploadUrl, fileId, s3Key } = await requestUploadUrl(workspaceId, {
    fileName: file.name,
    mimeType: file.type,
    sizeBytes: file.size,
    channelId: opts.channelId,
  });

  await uploadToS3(uploadUrl, file, opts.onProgress);

  return confirmUpload(workspaceId, {
    fileId,
    s3Key,
    fileName: file.name,
    mimeType: file.type,
    sizeBytes: file.size,
    channelId: opts.channelId,
  });
}

// ─── File operations ──────────────────────────────────────────────────────────

export async function getDownloadUrl(
  workspaceId: string,
  fileId: string
): Promise<DownloadUrlResponse> {
  return apiGet<DownloadUrlResponse>(
    `/api/v1/workspaces/${workspaceId}/files/${fileId}/download-url`
  );
}

export async function deleteFile(
  workspaceId: string,
  fileId: string
): Promise<void> {
  return apiDelete<void>(
    `/api/v1/workspaces/${workspaceId}/files/${fileId}`
  );
}

export async function bulkDeleteFiles(
  workspaceId: string,
  fileIds: string[]
): Promise<{ deleted: number; failed: number }> {
  return apiPost<{ deleted: number; failed: number }>(
    `/api/v1/workspaces/${workspaceId}/files/bulk-delete`,
    { fileIds }
  );
}

// ─── List & search ────────────────────────────────────────────────────────────

export async function listFiles(
  workspaceId: string,
  params: ListFilesParams = {}
): Promise<ListFilesResponse> {
  return apiGet<ListFilesResponse>(
    `/api/v1/workspaces/${workspaceId}/files`,
    { params }
  );
}

export async function getStorageUsage(
  workspaceId: string
): Promise<StorageUsageResponse> {
  return apiGet<StorageUsageResponse>(
    `/api/v1/workspaces/${workspaceId}/files/storage`
  );
}
