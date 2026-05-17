/**
 * backend/controllers/fileController.ts
 * Project: Obsidian
 *
 * HTTP request handlers for all file management routes.
 * Validates input via Zod schemas, delegates to fileService,
 * and returns consistent ApiSuccess / ApiError responses.
 *
 * Route map (wired in routes/file.routes.ts):
 *  POST   /api/v1/files/upload-url           → requestUploadUrl
 *  POST   /api/v1/files/confirm              → confirmUpload
 *  GET    /api/v1/files                      → listFiles
 *  GET    /api/v1/files/search               → searchFiles
 *  GET    /api/v1/files/storage              → getStorageUsage
 *  GET    /api/v1/files/:fileId              → getFile
 *  GET    /api/v1/files/:fileId/download     → getDownloadUrl
 *  DELETE /api/v1/files/:fileId              → deleteFile
 *  DELETE /api/v1/files/bulk                 → bulkDeleteFiles
 */

import type { Request, Response, NextFunction } from "express";
import { createLogger } from "../utils/logger";
import { successResponse } from "../utils/helpers";
import { HTTP_STATUS } from "../types/common";
import type { AuthenticatedRequest } from "../types/common";
import {
  RequestUploadUrlSchema,
  ConfirmUploadSchema,
  BulkDeleteFilesSchema,
  ListFilesQuerySchema,
  SearchFilesQuerySchema,
} from "../schemas/file.schema";
import {
  requestUploadUrl as requestUploadUrlService,
  confirmUpload as confirmUploadService,
  getDownloadUrl as getDownloadUrlService,
  deleteFile as deleteFileService,
  bulkDeleteFiles as bulkDeleteFilesService,
  listFiles as listFilesService,
  getStorageUsage as getStorageUsageService,
} from "../services/fileService";
import { getFileById } from "../repositories/fileRepository";
import { AppError } from "../middleware/errorMiddleware";
import { ERROR_CODES } from "../types/common";

const logger = createLogger("fileController");

// ─── POST /api/v1/files/upload-url ───────────────────────────────────────────

export async function requestUploadUrl(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authedReq = req as AuthenticatedRequest;
    const uid = authedReq.user.uid;
    const workspaceId = authedReq.user.workspaceId;
    const body = RequestUploadUrlSchema.parse(req.body);

    const result = await requestUploadUrlService(workspaceId, uid, body);

    logger.info("Upload URL requested", {
      uid,
      workspaceId,
      fileId: result.fileId,
      sizeBytes: body.sizeBytes,
    });

    res.status(HTTP_STATUS.OK).json(
      successResponse(result, "Upload URL generated. Use it to PUT your file directly to S3.")
    );
  } catch (err) {
    next(err);
  }
}

// ─── POST /api/v1/files/confirm ──────────────────────────────────────────────

export async function confirmUpload(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authedReq = req as AuthenticatedRequest;
    const uid = authedReq.user.uid;
    const workspaceId = authedReq.user.workspaceId;
    const body = ConfirmUploadSchema.parse(req.body);

    const file = await confirmUploadService(workspaceId, uid, body);

    logger.info("Upload confirmed", { uid, workspaceId, fileId: body.fileId });

    res.status(HTTP_STATUS.CREATED).json(
      successResponse(file, "File upload confirmed and stored.")
    );
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/v1/files ───────────────────────────────────────────────────────

export async function listFiles(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authedReq = req as AuthenticatedRequest;
    const workspaceId = authedReq.user.workspaceId;
    const query = ListFilesQuerySchema.parse(req.query);

    const result = await listFilesService(workspaceId, query);

    res.status(HTTP_STATUS.OK).json(
      successResponse(result.files, undefined, {
        limit: query.limit,
        hasMore: !!result.nextCursor,
        nextCursor: result.nextCursor ?? undefined,
      })
    );
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/v1/files/search ────────────────────────────────────────────────

export async function searchFiles(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authedReq = req as AuthenticatedRequest;
    const workspaceId = authedReq.user.workspaceId;
    const query = SearchFilesQuerySchema.parse(req.query);

    // Delegate to listFiles with a search filter — service handles name matching
    const result = await listFilesService(workspaceId, {
      ...query,
      limit: query.limit,
      sortBy: "createdAt",
      sortOrder: "desc",
    } as any);

    res.status(HTTP_STATUS.OK).json(
      successResponse(result.files, undefined, {
        limit: query.limit,
        hasMore: !!result.nextCursor,
        nextCursor: result.nextCursor ?? undefined,
      })
    );
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/v1/files/storage ───────────────────────────────────────────────

export async function getStorageUsage(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authedReq = req as AuthenticatedRequest;
    const workspaceId = authedReq.user.workspaceId;

    const usage = await getStorageUsageService(workspaceId);

    res.status(HTTP_STATUS.OK).json(successResponse(usage));
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/v1/files/:fileId ───────────────────────────────────────────────

export async function getFile(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authedReq = req as AuthenticatedRequest;
    const workspaceId = authedReq.user.workspaceId;
    const { fileId } = req.params;

    const file = await getFileById(fileId);

    if (!file || file.workspaceId !== workspaceId) {
      throw new AppError(ERROR_CODES.NOT_FOUND, "File not found.");
    }

    if (file.isDeleted) {
      throw new AppError(ERROR_CODES.NOT_FOUND, "File has been deleted.");
    }

    res.status(HTTP_STATUS.OK).json(successResponse(file));
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/v1/files/:fileId/download ──────────────────────────────────────

export async function getDownloadUrl(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authedReq = req as AuthenticatedRequest;
    const workspaceId = authedReq.user.workspaceId;
    const { fileId } = req.params;

    const result = await getDownloadUrlService(workspaceId, fileId);

    logger.info("Download URL generated", { fileId, workspaceId });

    res.status(HTTP_STATUS.OK).json(
      successResponse(result, "Download URL generated.")
    );
  } catch (err) {
    next(err);
  }
}

// ─── DELETE /api/v1/files/:fileId ────────────────────────────────────────────

export async function deleteFile(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authedReq = req as AuthenticatedRequest;
    const uid = authedReq.user.uid;
    const workspaceId = authedReq.user.workspaceId;
    const { fileId } = req.params;

    await deleteFileService(
      workspaceId,
      uid,
      fileId,
      authedReq.user.permissions
    );

    logger.info("File deleted", { fileId, uid, workspaceId });

    res.status(HTTP_STATUS.OK).json(
      successResponse(null, "File deleted successfully.")
    );
  } catch (err) {
    next(err);
  }
}

// ─── DELETE /api/v1/files/bulk ───────────────────────────────────────────────

export async function bulkDeleteFiles(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authedReq = req as AuthenticatedRequest;
    const uid = authedReq.user.uid;
    const workspaceId = authedReq.user.workspaceId;
    const body = BulkDeleteFilesSchema.parse(req.body);

    const result = await bulkDeleteFilesService(
      workspaceId,
      uid,
      body,
      authedReq.user.permissions
    );

    logger.info("Bulk file delete complete", {
      workspaceId,
      deleted: result.deleted,
      failed: result.failed,
    });

    res.status(HTTP_STATUS.OK).json(
      successResponse(
        result,
        `${result.deleted} file(s) deleted${result.failed ? `, ${result.failed} failed` : ""}.`
      )
    );
  } catch (err) {
    next(err);
  }
}
