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
export declare const messageRouter: import("express-serve-static-core").Router;
//# sourceMappingURL=message.routes.d.ts.map