/**
 * backend/routes/message.routes.ts
 * Project: Obsidian
 *
 * Express router for all messaging endpoints.
 * All routes require a valid Firebase JWT via authenticate middleware.
 *
 *  POST   /api/v1/messages                                      → sendMessage
 *  GET    /api/v1/messages                                      → getMessages
 *  GET    /api/v1/messages/pinned                               → getPinnedMessages
 *  GET    /api/v1/messages/around/:messageId                    → getMessagesAround
 *  GET    /api/v1/messages/search                               → searchMessages
 *  PATCH  /api/v1/messages/:messageId                           → editMessage
 *  DELETE /api/v1/messages/:messageId                           → deleteMessage
 *  POST   /api/v1/messages/bulk-delete                          → bulkDeleteMessages
 *  POST   /api/v1/messages/:messageId/reactions                 → addReaction
 *  DELETE /api/v1/messages/:messageId/reactions/:emoji          → removeReaction
 *  POST   /api/v1/messages/:messageId/pin                       → pinMessage
 *  DELETE /api/v1/messages/:messageId/pin                       → unpinMessage
 */
import { Router } from "express";
import { authenticate } from "../middleware/authMiddleware";
import { requirePermission } from "../middleware/rbacMiddleware";
import { RATE_LIMITS } from "../middleware/rateLimitMiddleware";
import { sendMessage, getMessages, getPinnedMessages, getMessagesAround, searchMessages, editMessage, deleteMessage, bulkDeleteMessages, addReaction, removeReaction, pinMessage, unpinMessage, } from "../controllers/messageController";
export const messageRouter = Router();
// All message routes require authentication
messageRouter.use(authenticate);
// ─── Fetch messages ───────────────────────────────────────────────────────────
// GET /api/v1/messages  (?channelId=&limit=&cursor=)
messageRouter.get("/", getMessages);
// GET /api/v1/messages/pinned  (?channelId=)  — before /:messageId
messageRouter.get("/pinned", getPinnedMessages);
// GET /api/v1/messages/search  (?channelId=&q=)
messageRouter.get("/search", RATE_LIMITS.SEARCH, searchMessages);
// GET /api/v1/messages/around/:messageId  (?channelId=&limit=)
messageRouter.get("/around/:messageId", getMessagesAround);
// ─── Send & edit ──────────────────────────────────────────────────────────────
// POST /api/v1/messages
messageRouter.post("/", requirePermission("send_messages"), RATE_LIMITS.MESSAGES, sendMessage);
// PATCH /api/v1/messages/:messageId
messageRouter.patch("/:messageId", requirePermission("send_messages"), editMessage);
// ─── Delete ───────────────────────────────────────────────────────────────────
// DELETE /api/v1/messages/:messageId
// Owners of the message can delete their own; delete_messages permission allows deleting others'
messageRouter.delete("/:messageId", deleteMessage);
// POST /api/v1/messages/bulk-delete
messageRouter.post("/bulk-delete", requirePermission("delete_messages"), bulkDeleteMessages);
// ─── Reactions ────────────────────────────────────────────────────────────────
// POST /api/v1/messages/:messageId/reactions
messageRouter.post("/:messageId/reactions", addReaction);
// DELETE /api/v1/messages/:messageId/reactions/:emoji
messageRouter.delete("/:messageId/reactions/:emoji", removeReaction);
// ─── Pinning ──────────────────────────────────────────────────────────────────
// POST /api/v1/messages/:messageId/pin
messageRouter.post("/:messageId/pin", requirePermission("pin_messages"), pinMessage);
// DELETE /api/v1/messages/:messageId/pin
messageRouter.delete("/:messageId/pin", requirePermission("pin_messages"), unpinMessage);
//# sourceMappingURL=message.routes.js.map