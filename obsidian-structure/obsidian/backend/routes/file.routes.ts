/**
 * backend/routes/file.routes.ts
 * Project: Obsidian
 *
 * Express router for all file storage endpoints.
 * All routes require a valid Firebase JWT via authenticate middleware.
 * Uploads use signed S3 URLs — no multipart data passes through the backend.
 *
 *  POST   /api/v1/files/upload-url                              → requestUploadUrl
 *  POST   /api/v1/files/confirm                                 → confirmUpload
 *  GET    /api/v1/files                                         → listFiles
 *  GET    /api/v1/files/search                                  → searchFiles
 *  GET    /api/v1/files/storage                                 → getStorageUsage
 *  GET    /api/v1/files/:fileId                                 → getFile
 *  GET    /api/v1/files/:fileId/download                        → getDownloadUrl
 *  DELETE /api/v1/files/:fileId                                 → deleteFile
 *  POST   /api/v1/files/bulk-delete                             → bulkDeleteFiles
 */

import { Router } from "express";
import { authenticate } from "../middleware/authMiddleware";
import { requirePermission } from "../middleware/rbacMiddleware";
import { RATE_LIMITS } from "../middleware/rateLimitMiddleware";
import {
  requestUploadUrl,
  confirmUpload,
  listFiles,
  searchFiles,
  getStorageUsage,
  getFile,
  getDownloadUrl,
  deleteFile,
  bulkDeleteFiles,
} from "../controllers/fileController";

export const fileRouter = Router();

// All file routes require authentication
fileRouter.use(authenticate);

// ─── Upload pipeline ──────────────────────────────────────────────────────────

// POST /api/v1/files/upload-url  — request a signed S3 URL for direct client upload
fileRouter.post(
  "/upload-url",
  requirePermission("upload_files"),
  RATE_LIMITS.UPLOADS,
  requestUploadUrl
);

// POST /api/v1/files/confirm  — notify backend that S3 upload completed
fileRouter.post(
  "/confirm",
  requirePermission("upload_files"),
  confirmUpload
);

// ─── Listing & search ─────────────────────────────────────────────────────────

// GET /api/v1/files  (?channelId=&limit=&cursor=&mimeType=)
fileRouter.get("/", requirePermission("download_files"), listFiles);

// GET /api/v1/files/search  (?q=&channelId=)  — before /:fileId
fileRouter.get(
  "/search",
  requirePermission("download_files"),
  RATE_LIMITS.SEARCH,
  searchFiles
);

// GET /api/v1/files/storage  — workspace storage usage summary
fileRouter.get("/storage", getStorageUsage);

// ─── Single file operations ───────────────────────────────────────────────────

// GET /api/v1/files/:fileId
fileRouter.get("/:fileId", requirePermission("download_files"), getFile);

// GET /api/v1/files/:fileId/download  — returns a short-lived signed download URL
fileRouter.get(
  "/:fileId/download",
  requirePermission("download_files"),
  getDownloadUrl
);

// DELETE /api/v1/files/:fileId
fileRouter.delete("/:fileId", deleteFile);

// ─── Bulk operations ──────────────────────────────────────────────────────────

// POST /api/v1/files/bulk-delete
fileRouter.post(
  "/bulk-delete",
  requirePermission("delete_files"),
  bulkDeleteFiles
);
