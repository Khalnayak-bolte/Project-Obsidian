/**
 * backend/controllers/messageController.ts
 * Project: Obsidian
 *
 * HTTP request handlers for all message routes.
 * Validates input via Zod schemas, delegates to messageService,
 * and returns consistent ApiSuccess / ApiError responses.
 *
 * Route map (wired in routes/message.routes.ts):
 *  POST   /api/v1/messages/:channelId                      → sendMessage
 *  GET    /api/v1/messages/:channelId                      → getMessages
 *  GET    /api/v1/messages/:channelId/pinned               → getPinnedMessages
 *  GET    /api/v1/messages/:channelId/around/:messageId    → getMessagesAround
 *  GET    /api/v1/messages/search                          → searchMessages
 *  PATCH  /api/v1/messages/:channelId/:messageId           → editMessage
 *  DELETE /api/v1/messages/:channelId/:messageId           → deleteMessage
 *  DELETE /api/v1/messages/:channelId/bulk                 → bulkDeleteMessages
 *  POST   /api/v1/messages/:channelId/:messageId/reactions → addReaction
 *  DELETE /api/v1/messages/:channelId/:messageId/reactions → removeReaction
 *  POST   /api/v1/messages/:channelId/:messageId/pin       → pinMessage
 *  DELETE /api/v1/messages/:channelId/:messageId/pin       → unpinMessage
 */

import type { Request, Response, NextFunction } from "express";
import { createLogger } from "../utils/logger";
import { successResponse } from "../utils/helpers";
import { HTTP_STATUS } from "../types/common";
import type { AuthenticatedRequest } from "../types/common";
import {
  SendMessageSchema,
  EditMessageSchema,
  AddReactionSchema,
  BulkDeleteMessagesSchema,
  GetMessagesQuerySchema,
  SearchMessagesQuerySchema,
} from "../schemas/message.schema";
import {
  sendMessage as sendMessageService,
  getMessages as getMessagesService,
  getMessagesAround as getMessagesAroundService,
  editMessage as editMessageService,
  deleteMessage as deleteMessageService,
  bulkDeleteMessages as bulkDeleteMessagesService,
  addReaction as addReactionService,
  removeReaction as removeReactionService,
  pinMessage as pinMessageService,
  unpinMessage as unpinMessageService,
  getPinnedMessages as getPinnedMessagesService,
  searchMessages as searchMessagesService,
} from "../services/messageService";

const logger = createLogger("messageController");

// ─── POST /api/v1/messages/:channelId ────────────────────────────────────────

export async function sendMessage(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authedReq = req as AuthenticatedRequest;
    const uid = authedReq.user.uid;
    const workspaceId = authedReq.user.workspaceId;
    const { channelId } = req.params;
    const body = SendMessageSchema.parse(req.body);

    const message = await sendMessageService(workspaceId, channelId, uid, body);

    logger.info("Message sent", { messageId: message.messageId, channelId });

    res.status(HTTP_STATUS.CREATED).json(
      successResponse(message, "Message sent.")
    );
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/v1/messages/:channelId ─────────────────────────────────────────

export async function getMessages(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authedReq = req as AuthenticatedRequest;
    const workspaceId = authedReq.user.workspaceId;
    const { channelId } = req.params;
    const query = GetMessagesQuerySchema.parse(req.query);

    const result = await getMessagesService(workspaceId, channelId, query);

    res.status(HTTP_STATUS.OK).json(
      successResponse(result.messages, undefined, result.meta)
    );
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/v1/messages/:channelId/pinned ──────────────────────────────────

export async function getPinnedMessages(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authedReq = req as AuthenticatedRequest;
    const workspaceId = authedReq.user.workspaceId;
    const { channelId } = req.params;

    const messages = await getPinnedMessagesService(workspaceId, channelId);

    res.status(HTTP_STATUS.OK).json(successResponse(messages));
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/v1/messages/:channelId/around/:messageId ───────────────────────

export async function getMessagesAround(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authedReq = req as AuthenticatedRequest;
    const workspaceId = authedReq.user.workspaceId;
    const { channelId, messageId } = req.params;

    const messages = await getMessagesAroundService(
      workspaceId,
      channelId,
      messageId
    );

    res.status(HTTP_STATUS.OK).json(successResponse(messages));
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/v1/messages/search ─────────────────────────────────────────────

export async function searchMessages(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authedReq = req as AuthenticatedRequest;
    const workspaceId = authedReq.user.workspaceId;

    // Map q → query field expected by the service
    const rawQuery = { ...req.query, query: req.query.q };
    const query = SearchMessagesQuerySchema.parse(rawQuery);

    const result = await searchMessagesService(workspaceId, query);

    res.status(HTTP_STATUS.OK).json(
      successResponse(result.messages, undefined, {
        limit: query.limit,
        hasMore: false,
        total: result.total,
      })
    );
  } catch (err) {
    next(err);
  }
}

// ─── PATCH /api/v1/messages/:channelId/:messageId ────────────────────────────

export async function editMessage(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authedReq = req as AuthenticatedRequest;
    const uid = authedReq.user.uid;
    const workspaceId = authedReq.user.workspaceId;
    const { messageId } = req.params;
    const body = EditMessageSchema.parse(req.body);

    const updated = await editMessageService(workspaceId, messageId, uid, body);

    logger.info("Message edited", { messageId });

    res.status(HTTP_STATUS.OK).json(
      successResponse(updated, "Message updated.")
    );
  } catch (err) {
    next(err);
  }
}

// ─── DELETE /api/v1/messages/:channelId/:messageId ───────────────────────────

export async function deleteMessage(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authedReq = req as AuthenticatedRequest;
    const uid = authedReq.user.uid;
    const workspaceId = authedReq.user.workspaceId;
    const { messageId } = req.params;

    await deleteMessageService(
      workspaceId,
      messageId,
      uid,
      authedReq.user.permissions
    );

    logger.info("Message deleted", { messageId, uid });

    res.status(HTTP_STATUS.OK).json(
      successResponse(null, "Message deleted.")
    );
  } catch (err) {
    next(err);
  }
}

// ─── DELETE /api/v1/messages/:channelId/bulk ─────────────────────────────────

export async function bulkDeleteMessages(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authedReq = req as AuthenticatedRequest;
    const uid = authedReq.user.uid;
    const workspaceId = authedReq.user.workspaceId;
    const { channelId } = req.params;
    const body = BulkDeleteMessagesSchema.parse(req.body);

    const result = await bulkDeleteMessagesService(
      workspaceId,
      channelId,
      uid,
      body
    );

    logger.info("Bulk delete complete", { channelId, deleted: result.deleted });

    res.status(HTTP_STATUS.OK).json(
      successResponse(result, `${result.deleted} message(s) deleted.`)
    );
  } catch (err) {
    next(err);
  }
}

// ─── POST /api/v1/messages/:channelId/:messageId/reactions ───────────────────

export async function addReaction(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authedReq = req as AuthenticatedRequest;
    const uid = authedReq.user.uid;
    const workspaceId = authedReq.user.workspaceId;
    const { messageId } = req.params;
    const body = AddReactionSchema.parse(req.body);

    await addReactionService(workspaceId, messageId, uid, body);

    res.status(HTTP_STATUS.OK).json(
      successResponse({ emoji: body.emoji }, "Reaction added.")
    );
  } catch (err) {
    next(err);
  }
}

// ─── DELETE /api/v1/messages/:channelId/:messageId/reactions ─────────────────

export async function removeReaction(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authedReq = req as AuthenticatedRequest;
    const uid = authedReq.user.uid;
    const workspaceId = authedReq.user.workspaceId;
    const { messageId } = req.params;

    // emoji comes as a query param for DELETE
    const emoji = req.query.emoji as string | undefined;
    if (!emoji) {
      res.status(HTTP_STATUS.BAD_REQUEST).json(
        successResponse(null, "emoji query param is required.")
      );
      return;
    }

    await removeReactionService(workspaceId, messageId, uid, emoji);

    res.status(HTTP_STATUS.OK).json(
      successResponse({ emoji }, "Reaction removed.")
    );
  } catch (err) {
    next(err);
  }
}

// ─── POST /api/v1/messages/:channelId/:messageId/pin ─────────────────────────

export async function pinMessage(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authedReq = req as AuthenticatedRequest;
    const uid = authedReq.user.uid;
    const workspaceId = authedReq.user.workspaceId;
    const { messageId } = req.params;

    await pinMessageService(workspaceId, messageId, uid);

    logger.info("Message pinned", { messageId, uid });

    res.status(HTTP_STATUS.OK).json(
      successResponse(null, "Message pinned.")
    );
  } catch (err) {
    next(err);
  }
}

// ─── DELETE /api/v1/messages/:channelId/:messageId/pin ───────────────────────

export async function unpinMessage(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authedReq = req as AuthenticatedRequest;
    const uid = authedReq.user.uid;
    const workspaceId = authedReq.user.workspaceId;
    const { messageId } = req.params;

    await unpinMessageService(workspaceId, messageId, uid);

    logger.info("Message unpinned", { messageId, uid });

    res.status(HTTP_STATUS.OK).json(
      successResponse(null, "Message unpinned.")
    );
  } catch (err) {
    next(err);
  }
}
