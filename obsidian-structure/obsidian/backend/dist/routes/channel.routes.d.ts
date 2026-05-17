/**
 * backend/routes/channel.routes.ts
 * Project: Obsidian
 *
 * Express router for all channel management endpoints.
 * All routes require a valid Firebase JWT via authenticate middleware.
 *
 *  POST   /api/v1/channels                              → createChannel
 *  GET    /api/v1/channels                              → listChannels
 *  GET    /api/v1/channels/voice                        → getVoiceChannels
 *  GET    /api/v1/channels/:channelId                   → getChannel
 *  PATCH  /api/v1/channels/:channelId                   → updateChannel
 *  DELETE /api/v1/channels/:channelId                   → deleteChannel
 *  POST   /api/v1/channels/:channelId/archive           → archiveChannel
 *  POST   /api/v1/channels/reorder                      → reorderChannels
 *  POST   /api/v1/channels/:channelId/read              → markChannelRead
 *  PATCH  /api/v1/channels/:channelId/permissions       → updateChannelPermissions
 *  POST   /api/v1/channels/:channelId/members           → addChannelMembers
 */
export declare const channelRouter: import("express-serve-static-core").Router;
//# sourceMappingURL=channel.routes.d.ts.map