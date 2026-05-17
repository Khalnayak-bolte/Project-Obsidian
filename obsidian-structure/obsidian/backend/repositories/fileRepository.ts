/**
 * backend/repositories/fileRepository.ts
 * Project: Obsidian
 *
 * All Firestore read/write operations for the files collection.
 * Covers file metadata CRUD, workspace storage tracking, and file queries.
 * Actual S3 operations live in fileService.ts — this is metadata only.
 */

import { db, COLLECTIONS, FieldValue, Timestamp } from "../config/firebase";
import { createLogger } from "../utils/logger";
import { generateFileId } from "../utils/helpers";
import type { AttachmentType } from "../types/message";
import type { PaginationMeta } from "../types/common";

const logger = createLogger("fileRepository");

// ─── File document shape ──────────────────────────────────────────────────────

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
  messageId?: string;              // linked message if sent in chat
  deletedAt?: FirebaseFirestore.Timestamp;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
}

// ─── Get file by ID ───────────────────────────────────────────────────────────

export async function getFileById(
  fileId: string
): Promise<FileRecord | null> {
  try {
    const snap = await db
      .collection(COLLECTIONS.FILES)
      .doc(fileId)
      .get();

    if (!snap.exists) return null;
    return { fileId: snap.id, ...snap.data() } as FileRecord;
  } catch (err) {
    logger.error("getFileById failed", { fileId, error: err });
    throw err;
  }
}

// ─── Get files by workspace ───────────────────────────────────────────────────

export async function getFilesByWorkspace(
  workspaceId: string,
  limit = 50,
  cursor?: string,
  type?: AttachmentType
): Promise<{ files: FileRecord[]; meta: PaginationMeta }> {
  try {
    let query = db
      .collection(COLLECTIONS.FILES)
      .where("workspaceId", "==", workspaceId)
      .where("deletedAt", "==", null)
      .orderBy("createdAt", "desc")
      .limit(limit + 1);

    if (type) {
      query = query.where("type", "==", type) as typeof query;
    }

    if (cursor) {
      const cursorDoc = await db.collection(COLLECTIONS.FILES).doc(cursor).get();
      if (cursorDoc.exists) {
        query = query.startAfter(cursorDoc) as typeof query;
      }
    }

    const snap = await query.get();
    const hasMore = snap.docs.length > limit;
    const docs = hasMore ? snap.docs.slice(0, limit) : snap.docs;

    return {
      files: docs.map((doc) => ({ fileId: doc.id, ...doc.data() })) as FileRecord[],
      meta: {
        limit,
        hasMore,
        nextCursor: hasMore ? docs[docs.length - 1].id : undefined,
      },
    };
  } catch (err) {
    logger.error("getFilesByWorkspace failed", { workspaceId, error: err });
    throw err;
  }
}

// ─── Get files by channel ─────────────────────────────────────────────────────

export async function getFilesByChannel(
  channelId: string,
  workspaceId: string,
  limit = 50,
  cursor?: string
): Promise<{ files: FileRecord[]; meta: PaginationMeta }> {
  try {
    let query = db
      .collection(COLLECTIONS.FILES)
      .where("channelId", "==", channelId)
      .where("workspaceId", "==", workspaceId)
      .where("deletedAt", "==", null)
      .orderBy("createdAt", "desc")
      .limit(limit + 1);

    if (cursor) {
      const cursorDoc = await db.collection(COLLECTIONS.FILES).doc(cursor).get();
      if (cursorDoc.exists) {
        query = query.startAfter(cursorDoc) as typeof query;
      }
    }

    const snap = await query.get();
    const hasMore = snap.docs.length > limit;
    const docs = hasMore ? snap.docs.slice(0, limit) : snap.docs;

    return {
      files: docs.map((doc) => ({ fileId: doc.id, ...doc.data() })) as FileRecord[],
      meta: {
        limit,
        hasMore,
        nextCursor: hasMore ? docs[docs.length - 1].id : undefined,
      },
    };
  } catch (err) {
    logger.error("getFilesByChannel failed", { channelId, error: err });
    throw err;
  }
}

// ─── Get files uploaded by user ───────────────────────────────────────────────

export async function getFilesByUser(
  workspaceId: string,
  uid: string,
  limit = 50
): Promise<FileRecord[]> {
  try {
    const snap = await db
      .collection(COLLECTIONS.FILES)
      .where("workspaceId", "==", workspaceId)
      .where("uploadedBy", "==", uid)
      .where("deletedAt", "==", null)
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get();

    return snap.docs.map((doc) => ({
      fileId: doc.id,
      ...doc.data(),
    })) as FileRecord[];
  } catch (err) {
    logger.error("getFilesByUser failed", { workspaceId, uid, error: err });
    throw err;
  }
}

// ─── Create file record ───────────────────────────────────────────────────────

export async function createFileRecord(params: {
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
}): Promise<FileRecord> {
  try {
    const fileId = generateFileId();
    const now = Timestamp.now();

    const file: FileRecord = {
      fileId,
      workspaceId: params.workspaceId,
      uploadedBy: params.uploadedBy,
      name: params.name,
      originalName: params.originalName,
      type: params.type,
      mimeType: params.mimeType,
      sizeBytes: params.sizeBytes,
      s3Key: params.s3Key,
      cdnUrl: params.cdnUrl,
      channelId: params.channelId,
      messageId: params.messageId,
      thumbnailKey: params.thumbnailKey,
      thumbnailUrl: params.thumbnailUrl,
      width: params.width,
      height: params.height,
      durationSeconds: params.durationSeconds,
      isPublic: params.isPublic ?? false,
      deletedAt: undefined,
      createdAt: now,
      updatedAt: now,
    };

    await db.collection(COLLECTIONS.FILES).doc(fileId).set(file);

    logger.info("File record created", {
      fileId,
      workspaceId: params.workspaceId,
      sizeBytes: params.sizeBytes,
    });

    return file;
  } catch (err) {
    logger.error("createFileRecord failed", { workspaceId: params.workspaceId, error: err });
    throw err;
  }
}

// ─── Link file to message ─────────────────────────────────────────────────────

export async function linkFileToMessage(
  fileId: string,
  messageId: string
): Promise<void> {
  try {
    await db.collection(COLLECTIONS.FILES).doc(fileId).update({
      messageId,
      updatedAt: Timestamp.now(),
    });
  } catch (err) {
    logger.error("linkFileToMessage failed", { fileId, messageId, error: err });
    throw err;
  }
}

// ─── Soft delete file ─────────────────────────────────────────────────────────

export async function softDeleteFile(fileId: string): Promise<void> {
  try {
    await db.collection(COLLECTIONS.FILES).doc(fileId).update({
      deletedAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    logger.info("File soft deleted", { fileId });
  } catch (err) {
    logger.error("softDeleteFile failed", { fileId, error: err });
    throw err;
  }
}

// ─── Hard delete file ─────────────────────────────────────────────────────────

export async function hardDeleteFile(fileId: string): Promise<void> {
  try {
    await db.collection(COLLECTIONS.FILES).doc(fileId).delete();
    logger.info("File hard deleted", { fileId });
  } catch (err) {
    logger.error("hardDeleteFile failed", { fileId, error: err });
    throw err;
  }
}

// ─── Storage tracking ─────────────────────────────────────────────────────────

export async function incrementWorkspaceStorage(
  workspaceId: string,
  bytes: number
): Promise<void> {
  try {
    await db.collection(COLLECTIONS.WORKSPACES).doc(workspaceId).update({
      storageUsed: FieldValue.increment(bytes),
      updatedAt: Timestamp.now(),
    });
  } catch (err) {
    logger.error("incrementWorkspaceStorage failed", { workspaceId, bytes, error: err });
    throw err;
  }
}

export async function decrementWorkspaceStorage(
  workspaceId: string,
  bytes: number
): Promise<void> {
  try {
    await db.collection(COLLECTIONS.WORKSPACES).doc(workspaceId).update({
      storageUsed: FieldValue.increment(-bytes),
      updatedAt: Timestamp.now(),
    });
  } catch (err) {
    logger.error("decrementWorkspaceStorage failed", { workspaceId, bytes, error: err });
    throw err;
  }
}

// ─── Get total storage used by workspace ─────────────────────────────────────

export async function getTotalStorageUsed(
  workspaceId: string
): Promise<number> {
  try {
    const snap = await db
      .collection(COLLECTIONS.FILES)
      .where("workspaceId", "==", workspaceId)
      .where("deletedAt", "==", null)
      .select("sizeBytes")
      .get();

    return snap.docs.reduce(
      (total, doc) => total + (doc.data().sizeBytes ?? 0),
      0
    );
  } catch (err) {
    logger.error("getTotalStorageUsed failed", { workspaceId, error: err });
    throw err;
  }
}

// ─── Get files pending cleanup (deleted but S3 not yet removed) ───────────────

export async function getFilesForCleanup(
  limit = 100
): Promise<FileRecord[]> {
  try {
    const snap = await db
      .collection(COLLECTIONS.FILES)
      .where("deletedAt", "!=", null)
      .orderBy("deletedAt", "asc")
      .limit(limit)
      .get();

    return snap.docs.map((doc) => ({
      fileId: doc.id,
      ...doc.data(),
    })) as FileRecord[];
  } catch (err) {
    logger.error("getFilesForCleanup failed", { error: err });
    throw err;
  }
}

// ─── Bulk delete files by workspace ──────────────────────────────────────────

export async function deleteFilesByWorkspace(
  workspaceId: string
): Promise<number> {
  try {
    const snap = await db
      .collection(COLLECTIONS.FILES)
      .where("workspaceId", "==", workspaceId)
      .get();

    if (snap.empty) return 0;

    const chunks: FirebaseFirestore.QueryDocumentSnapshot[][] = [];
    for (let i = 0; i < snap.docs.length; i += 500) {
      chunks.push(snap.docs.slice(i, i + 500));
    }

    for (const chunk of chunks) {
      const batch = db.batch();
      chunk.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
    }

    logger.info("Files deleted by workspace", {
      workspaceId,
      count: snap.docs.length,
    });

    return snap.docs.length;
  } catch (err) {
    logger.error("deleteFilesByWorkspace failed", { workspaceId, error: err });
    throw err;
  }
}

// ─── Check if S3 key already exists ──────────────────────────────────────────

export async function fileExistsByS3Key(s3Key: string): Promise<boolean> {
  try {
    const snap = await db
      .collection(COLLECTIONS.FILES)
      .where("s3Key", "==", s3Key)
      .limit(1)
      .get();

    return !snap.empty;
  } catch (err) {
    logger.error("fileExistsByS3Key failed", { s3Key, error: err });
    throw err;
  }
}
