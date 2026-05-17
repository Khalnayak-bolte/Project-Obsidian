/**
 * backend/controllers/channelController.ts
 * Project: Obsidian
 *
 * HTTP request handlers for all channel routes.
 * Validates input via Zod schemas, delegates to channelService,
 * and returns consistent ApiSuccess / ApiError responses.
 *
 * Route map (wired in routes/channel.routes.ts):
 *  POST   /api/v1/channels                                      → createChannel
 *  GET    /api/v1/channels                                      → listChannels
 *  GET    /api/v1/channels/:channelId                           → getChannel
 *  PATCH  /api/v1/channels/:channelId                           → updateChannel
 *  DELETE /api/v1/channels/:channelId                           → deleteChannel
 *  POST   /api/v1/channels/:channelId/archive                   → archiveChannel
 *  POST   /api/v1/channels/reorder                              → reorderChannels
 *  POST   /api/v1/channels/:channelId/read                      → markChannelRead
 *  PATCH  /api/v1/channels/:channelId/permissions               → updateChannelPermissions
 *  POST   /api/v1/channels/:channelId/members                   → addChannelMembers
 *  GET    /api/v1/channels/voice                                 → getVoiceChannels
 */
import type { Request, Response, NextFunction } from "express";
export declare function createChannel(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function listChannels(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function getVoiceChannels(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function getChannel(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function updateChannel(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function deleteChannel(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function archiveChannel(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function reorderChannels(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function markChannelRead(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function updateChannelPermissions(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function addChannelMembers(req: Request, res: Response, next: NextFunction): Promise<void>;
//# sourceMappingURL=channelController.d.ts.map