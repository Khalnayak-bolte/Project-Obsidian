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
export declare function sendMessage(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function getMessages(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function getPinnedMessages(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function getMessagesAround(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function searchMessages(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function editMessage(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function deleteMessage(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function bulkDeleteMessages(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function addReaction(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function removeReaction(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function pinMessage(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function unpinMessage(req: Request, res: Response, next: NextFunction): Promise<void>;
//# sourceMappingURL=messageController.d.ts.map