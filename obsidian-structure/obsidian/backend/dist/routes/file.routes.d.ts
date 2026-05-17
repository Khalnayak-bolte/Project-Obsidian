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
export declare const fileRouter: import("express-serve-static-core").Router;
//# sourceMappingURL=file.routes.d.ts.map