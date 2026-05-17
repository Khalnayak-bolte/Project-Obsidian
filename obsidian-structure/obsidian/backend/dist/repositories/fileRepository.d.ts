/**
 * backend/repositories/fileRepository.ts
 * Project: Obsidian
 *
 * All Firestore read/write operations for the files collection.
 * Covers file metadata CRUD, workspace storage tracking, and file queries.
 * Actual S3 operations live in fileService.ts — this is metadata only.
 */
import type { AttachmentType } from "../types/message";
import type { PaginationMeta } from "../types/common";
export interface FileRecord {
    fileId: string;
    workspaceId: string;
    channelId?: string;
    uploadedBy: string;
    name: string;
    originalName: string;
    type: AttachmentType;
    mimeType: string;
    sizeBytes: number;
    s3Key: string;
    cdnUrl: string;
    thumbnailKey?: string;
    thumbnailUrl?: string;
    width?: number;
    height?: number;
    durationSeconds?: number;
    isPublic: boolean;
    messageId?: string;
    deletedAt?: FirebaseFirestore.Timestamp;
    createdAt: FirebaseFirestore.Timestamp;
    updatedAt: FirebaseFirestore.Timestamp;
}
export declare function getFileById(fileId: string): Promise<FileRecord | null>;
export declare function getFilesByWorkspace(workspaceId: string, limit?: number, cursor?: string, type?: AttachmentType): Promise<{
    files: FileRecord[];
    meta: PaginationMeta;
}>;
export declare function getFilesByChannel(channelId: string, workspaceId: string, limit?: number, cursor?: string): Promise<{
    files: FileRecord[];
    meta: PaginationMeta;
}>;
export declare function getFilesByUser(workspaceId: string, uid: string, limit?: number): Promise<FileRecord[]>;
export declare function createFileRecord(params: {
    workspaceId: string;
    uploadedBy: string;
    name: string;
    originalName: string;
    type: AttachmentType;
    mimeType: string;
    sizeBytes: number;
    s3Key: string;
    cdnUrl: string;
    channelId?: string;
    messageId?: string;
    thumbnailKey?: string;
    thumbnailUrl?: string;
    width?: number;
    height?: number;
    durationSeconds?: number;
    isPublic?: boolean;
}): Promise<FileRecord>;
export declare function linkFileToMessage(fileId: string, messageId: string): Promise<void>;
export declare function softDeleteFile(fileId: string): Promise<void>;
export declare function hardDeleteFile(fileId: string): Promise<void>;
export declare function incrementWorkspaceStorage(workspaceId: string, bytes: number): Promise<void>;
export declare function decrementWorkspaceStorage(workspaceId: string, bytes: number): Promise<void>;
export declare function getTotalStorageUsed(workspaceId: string): Promise<number>;
export declare function getFilesForCleanup(limit?: number): Promise<FileRecord[]>;
export declare function deleteFilesByWorkspace(workspaceId: string): Promise<number>;
export declare function fileExistsByS3Key(s3Key: string): Promise<boolean>;
//# sourceMappingURL=fileRepository.d.ts.map