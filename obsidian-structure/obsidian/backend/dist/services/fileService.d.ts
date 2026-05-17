/**
 * backend/services/fileService.ts
 * Project: Obsidian
 */
import type { RequestUploadUrlInput, ConfirmUploadInput, BulkDeleteFilesInput, ListFilesQueryInput } from "../schemas/file.schema";
export declare function requestUploadUrl(workspaceId: string, uid: string, input: RequestUploadUrlInput): Promise<{
    uploadUrl: string;
    fileId: string;
    s3Key: string;
    expiresIn: number;
}>;
export declare function confirmUpload(workspaceId: string, uid: string, input: ConfirmUploadInput): Promise<any>;
export declare function getDownloadUrl(workspaceId: string, fileId: string): Promise<{
    downloadUrl: string;
    expiresIn: number;
}>;
export declare function deleteFile(workspaceId: string, actorId: string, fileId: string, actorPermissions: Record<string, boolean>): Promise<void>;
export declare function bulkDeleteFiles(workspaceId: string, actorId: string, input: BulkDeleteFilesInput, actorPermissions: Record<string, boolean>): Promise<{
    deleted: number;
    failed: number;
}>;
export declare function listFiles(workspaceId: string, query: ListFilesQueryInput): Promise<{
    files: any[];
    nextCursor: string | null;
}>;
export declare function getStorageUsage(workspaceId: string): Promise<{
    usedBytes: number;
    capacityBytes: number;
    usedPercent: number;
    tier: string;
}>;
export declare function cleanupOrphanedFiles(workspaceId: string): Promise<number>;
//# sourceMappingURL=fileService.d.ts.map