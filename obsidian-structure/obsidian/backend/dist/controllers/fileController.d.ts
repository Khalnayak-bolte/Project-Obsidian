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
export declare function requestUploadUrl(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function confirmUpload(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function listFiles(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function searchFiles(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function getStorageUsage(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function getFile(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function getDownloadUrl(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function deleteFile(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function bulkDeleteFiles(req: Request, res: Response, next: NextFunction): Promise<void>;
//# sourceMappingURL=fileController.d.ts.map