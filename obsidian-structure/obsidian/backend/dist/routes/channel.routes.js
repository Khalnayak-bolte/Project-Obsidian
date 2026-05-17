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
import { Router } from "express";
import { authenticate } from "../middleware/authMiddleware";
import { requirePermission } from "../middleware/rbacMiddleware";
import { RATE_LIMITS } from "../middleware/rateLimitMiddleware";
import { createChannel, listChannels, getVoiceChannels, getChannel, updateChannel, deleteChannel, archiveChannel, reorderChannels, markChannelRead, updateChannelPermissions, addChannelMembers, } from "../controllers/channelController";
export const channelRouter = Router();
// All channel routes require authentication
channelRouter.use(authenticate);
// ─── Channel listing ──────────────────────────────────────────────────────────
// GET /api/v1/channels
channelRouter.get("/", listChannels);
// GET /api/v1/channels/voice  — must be before /:channelId to avoid param clash
channelRouter.get("/voice", getVoiceChannels);
// ─── Channel CRUD ─────────────────────────────────────────────────────────────
// POST /api/v1/channels
channelRouter.post("/", requirePermission("create_channels"), RATE_LIMITS.CHANNEL_CREATE, createChannel);
// GET /api/v1/channels/:channelId
channelRouter.get("/:channelId", getChannel);
// PATCH /api/v1/channels/:channelId
channelRouter.patch("/:channelId", requirePermission("manage_channels"), updateChannel);
// DELETE /api/v1/channels/:channelId
channelRouter.delete("/:channelId", requirePermission("delete_channels"), deleteChannel);
// ─── Channel actions ──────────────────────────────────────────────────────────
// POST /api/v1/channels/:channelId/archive
channelRouter.post("/:channelId/archive", requirePermission("manage_channels"), archiveChannel);
// POST /api/v1/channels/reorder
channelRouter.post("/reorder", requirePermission("manage_channels"), reorderChannels);
// POST /api/v1/channels/:channelId/read
channelRouter.post("/:channelId/read", markChannelRead);
// ─── Channel permissions & membership ────────────────────────────────────────
// PATCH /api/v1/channels/:channelId/permissions
channelRouter.patch("/:channelId/permissions", requirePermission("manage_channels"), updateChannelPermissions);
// POST /api/v1/channels/:channelId/members
channelRouter.post("/:channelId/members", requirePermission("manage_channels"), addChannelMembers);
//# sourceMappingURL=channel.routes.js.map