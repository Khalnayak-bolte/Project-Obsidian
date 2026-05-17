/**
 * frontend/src/hooks/useFileUpload.ts
 * Project: Obsidian
 *
 * Handles file uploads via the S3 signed URL flow:
 * 1. Request a signed upload URL from the backend
 * 2. PUT the file directly to S3
 * 3. Confirm the upload with the backend (returns CDN URL + fileId)
 *
 * Supports multiple concurrent uploads, progress tracking,
 * file type/size validation, and drag-and-drop.
 */

import { useState, useCallback, useRef } from "react";
import { apiClient } from "../lib/axios";
import { useAuthStore } from "../stores/authStore";
import { useWorkspaceStore } from "../stores/workspaceStore";

// ─── Types ────────────────────────────────────────────────────────────────────

export type UploadStatus = "idle" | "uploading" | "processing" | "done" | "failed";

export interface UploadItem {
  id: string;
  file: File;
  status: UploadStatus;
  progress: number;              // 0–100
  cdnUrl?: string;
  fileId?: string;
  error?: string;
  mimeType: string;
  sizeBytes: number;
  previewUrl?: string;           // local object URL for images
}

export interface UploadResult {
  fileId: string;
  cdnUrl: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  thumbnailUrl?: string;
  width?: number;
  height?: number;
}

interface SignedUrlResponse {
  uploadUrl: string;
  fileId: string;
  s3Key: string;
  expiresAt: string;
}

interface ConfirmUploadResponse {
  fileId: string;
  cdnUrl: string;
  thumbnailUrl?: string;
  width?: number;
  height?: number;
}

// ─── Allowed file types ───────────────────────────────────────────────────────

const ALLOWED_MIME_TYPES = new Set([
  // Images
  "image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml",
  // Video
  "video/mp4", "video/webm", "video/quicktime",
  // Audio
  "audio/mpeg", "audio/wav", "audio/ogg", "audio/webm",
  // Documents
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain", "text/csv", "text/markdown",
  // Archives
  "application/zip", "application/x-tar", "application/x-7z-compressed",
]);

const IMAGE_MIME_TYPES = new Set([
  "image/jpeg", "image/png", "image/gif", "image/webp",
]);

// ─── Helpers ──────────────────────────────────────────────────────────────────

const generateUploadId = () =>
  `upload_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const getFileSizeLimit = (tier: string): number => {
  const limits: Record<string, number> = {
    gold: 25 * 1024 * 1024,       // 25 MB
    premium: 100 * 1024 * 1024,   // 100 MB
    deluxe: 500 * 1024 * 1024,    // 500 MB
  };
  return limits[tier] ?? limits.gold;
};

const createPreviewUrl = (file: File): string | undefined => {
  if (IMAGE_MIME_TYPES.has(file.type)) {
    return URL.createObjectURL(file);
  }
  return undefined;
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useFileUpload(channelId?: string) {
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const abortControllersRef = useRef<Map<string, AbortController>>(new Map());

  const { workspaceAccess } = useAuthStore();
  const { currentWorkspace } = useWorkspaceStore();

  const workspaceId = workspaceAccess?.workspaceId;
  const tier = currentWorkspace?.tier ?? "gold";
  const maxFileSize = getFileSizeLimit(tier);

  // ─── Update a single upload item ─────────────────────────────────────────

  const updateUpload = useCallback((id: string, patch: Partial<UploadItem>) => {
    setUploads((prev) =>
      prev.map((u) => (u.id === id ? { ...u, ...patch } : u))
    );
  }, []);

  // ─── Validate file ────────────────────────────────────────────────────────

  const validateFile = useCallback(
    (file: File): string | null => {
      if (!ALLOWED_MIME_TYPES.has(file.type)) {
        return `File type "${file.type}" is not supported.`;
      }
      if (file.size > maxFileSize) {
        const limitMB = Math.round(maxFileSize / (1024 * 1024));
        return `File exceeds the ${limitMB} MB limit for your plan.`;
      }
      if (file.size === 0) {
        return "File is empty.";
      }
      return null;
    },
    [maxFileSize]
  );

  // ─── Upload a single file ─────────────────────────────────────────────────

  const uploadFile = useCallback(
    async (file: File): Promise<UploadResult | null> => {
      if (!workspaceId) {
        console.error("[useFileUpload] No workspace ID");
        return null;
      }

      const validationError = validateFile(file);
      if (validationError) {
        console.error("[useFileUpload] Validation failed:", validationError);
        return null;
      }

      const id = generateUploadId();
      const previewUrl = createPreviewUrl(file);

      const uploadItem: UploadItem = {
        id,
        file,
        status: "uploading",
        progress: 0,
        mimeType: file.type,
        sizeBytes: file.size,
        previewUrl,
      };

      setUploads((prev) => [...prev, uploadItem]);

      const abortController = new AbortController();
      abortControllersRef.current.set(id, abortController);

      try {
        // Step 1 — Get signed S3 upload URL from backend
        const { data: signedData } = await apiClient.post<SignedUrlResponse>(
          "/api/v1/files/signed-url",
          {
            workspaceId,
            channelId,
            fileName: file.name,
            mimeType: file.type,
            sizeBytes: file.size,
          }
        );

        updateUpload(id, { progress: 10 });

        // Step 2 — PUT directly to S3 with progress tracking
        await uploadToS3({
          url: signedData.uploadUrl,
          file,
          signal: abortController.signal,
          onProgress: (progress) => {
            updateUpload(id, { progress: 10 + Math.round(progress * 0.80) }); // 10→90
          },
        });

        updateUpload(id, { status: "processing", progress: 90 });

        // Step 3 — Confirm upload with backend (triggers metadata creation)
        const { data: confirmData } = await apiClient.post<ConfirmUploadResponse>(
          "/api/v1/files/confirm",
          {
            fileId: signedData.fileId,
            s3Key: signedData.s3Key,
            workspaceId,
            channelId,
            originalName: file.name,
            mimeType: file.type,
            sizeBytes: file.size,
          }
        );

        updateUpload(id, {
          status: "done",
          progress: 100,
          cdnUrl: confirmData.cdnUrl,
          fileId: confirmData.fileId,
        });

        // Revoke preview URL if created
        if (previewUrl) URL.revokeObjectURL(previewUrl);

        return {
          fileId: confirmData.fileId,
          cdnUrl: confirmData.cdnUrl,
          name: file.name,
          mimeType: file.type,
          sizeBytes: file.size,
          thumbnailUrl: confirmData.thumbnailUrl,
          width: confirmData.width,
          height: confirmData.height,
        };
      } catch (err: unknown) {
        if ((err as { name?: string }).name === "AbortError") {
          updateUpload(id, { status: "failed", error: "Upload cancelled." });
          return null;
        }

        console.error("[useFileUpload] Upload failed:", err);
        updateUpload(id, {
          status: "failed",
          error: "Upload failed. Please try again.",
        });
        return null;
      } finally {
        abortControllersRef.current.delete(id);
      }
    },
    [workspaceId, channelId, validateFile, updateUpload]
  );

  // ─── Upload multiple files ────────────────────────────────────────────────

  const uploadFiles = useCallback(
    async (files: File[]): Promise<UploadResult[]> => {
      const results = await Promise.allSettled(files.map(uploadFile));
      return results
        .filter((r): r is PromiseFulfilledResult<UploadResult | null> => r.status === "fulfilled")
        .map((r) => r.value)
        .filter((r): r is UploadResult => r !== null);
    },
    [uploadFile]
  );

  // ─── Cancel upload ────────────────────────────────────────────────────────

  const cancelUpload = useCallback((id: string) => {
    const controller = abortControllersRef.current.get(id);
    if (controller) {
      controller.abort();
      abortControllersRef.current.delete(id);
    }
    setUploads((prev) => prev.filter((u) => u.id !== id));
  }, []);

  // ─── Remove completed upload from list ───────────────────────────────────

  const removeUpload = useCallback((id: string) => {
    setUploads((prev) => {
      const upload = prev.find((u) => u.id === id);
      if (upload?.previewUrl) URL.revokeObjectURL(upload.previewUrl);
      return prev.filter((u) => u.id !== id);
    });
  }, []);

  // ─── Clear all uploads ────────────────────────────────────────────────────

  const clearUploads = useCallback(() => {
    setUploads((prev) => {
      prev.forEach((u) => {
        if (u.previewUrl) URL.revokeObjectURL(u.previewUrl);
      });
      return [];
    });
    abortControllersRef.current.forEach((c) => c.abort());
    abortControllersRef.current.clear();
  }, []);

  // ─── Drag and drop handlers ───────────────────────────────────────────────

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const onDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);

      const files = Array.from(e.dataTransfer.files);
      if (files.length === 0) return;

      await uploadFiles(files);
    },
    [uploadFiles]
  );

  // ─── File input handler ───────────────────────────────────────────────────

  const onFileInputChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []);
      if (files.length === 0) return;

      // Reset input so same file can be re-selected
      e.target.value = "";

      await uploadFiles(files);
    },
    [uploadFiles]
  );

  // ─── Derived state ────────────────────────────────────────────────────────

  const isUploading = uploads.some((u) => u.status === "uploading" || u.status === "processing");
  const completedUploads = uploads.filter((u) => u.status === "done");
  const failedUploads = uploads.filter((u) => u.status === "failed");
  const totalProgress =
    uploads.length === 0
      ? 0
      : Math.round(uploads.reduce((sum, u) => sum + u.progress, 0) / uploads.length);

  return {
    // State
    uploads,
    isDragOver,
    isUploading,
    completedUploads,
    failedUploads,
    totalProgress,
    maxFileSize,

    // Actions
    uploadFile,
    uploadFiles,
    cancelUpload,
    removeUpload,
    clearUploads,
    validateFile,

    // Drag & drop
    onDragOver,
    onDragLeave,
    onDrop,
    onFileInputChange,
  };
}

// ─── S3 upload with progress ──────────────────────────────────────────────────

async function uploadToS3(params: {
  url: string;
  file: File;
  signal: AbortSignal;
  onProgress: (progress: number) => void;
}): Promise<void> {
  const { url, file, signal, onProgress } = params;

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) {
        onProgress(e.loaded / e.total);
      }
    });

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress(1);
        resolve();
      } else {
        reject(new Error(`S3 upload failed with status ${xhr.status}`));
      }
    });

    xhr.addEventListener("error", () => reject(new Error("S3 upload network error")));
    xhr.addEventListener("abort", () => {
      const err = new Error("Upload aborted");
      err.name = "AbortError";
      reject(err);
    });

    signal.addEventListener("abort", () => xhr.abort());

    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", file.type);
    xhr.send(file);
  });
}
