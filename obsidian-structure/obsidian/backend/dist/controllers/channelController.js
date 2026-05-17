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
import { createLogger } from "../utils/logger";
import { successResponse } from "../utils/helpers";
import { HTTP_STATUS } from "../types/common";
import { CreateChannelSchema, UpdateChannelSchema, ReorderChannelsSchema, MarkChannelReadSchema, UpdateChannelPermissionsSchema, AddChannelMembersSchema, ListChannelsQuerySchema, } from "../schemas/channel.schema";
import { createChannel as createChannelService, getChannel as getChannelService, listChannels as listChannelsService, updateChannel as updateChannelService, deleteChannel as deleteChannelService, archiveChannel as archiveChannelService, reorderChannels as reorderChannelsService, markChannelRead as markChannelReadService, updateChannelPermissions as updateChannelPermissionsService, addChannelMembers as addChannelMembersService, getVoiceChannels as getVoiceChannelsService, } from "../services/channelService";
const logger = createLogger("channelController");
// ─── POST /api/v1/channels ───────────────────────────────────────────────────
export async function createChannel(req, res, next) {
    try {
        const authedReq = req;
        const uid = authedReq.user.uid;
        const workspaceId = authedReq.user.workspaceId;
        const body = CreateChannelSchema.parse(req.body);
        const channel = await createChannelService(workspaceId, uid, body);
        logger.info("Channel created", { channelId: channel.channelId, workspaceId });
        res.status(HTTP_STATUS.CREATED).json(successResponse(channel, "Channel created successfully."));
    }
    catch (err) {
        next(err);
    }
}
// ─── GET /api/v1/channels ────────────────────────────────────────────────────
export async function listChannels(req, res, next) {
    try {
        const authedReq = req;
        const workspaceId = authedReq.user.workspaceId;
        const roleId = authedReq.user.roleId;
        const query = ListChannelsQuerySchema.parse(req.query);
        const channels = await listChannelsService(workspaceId, roleId, {
            includeArchived: query.isArchived === true,
            type: query.type,
        });
        res.status(HTTP_STATUS.OK).json(successResponse(channels, undefined, {
            limit: query.limit,
            hasMore: false,
        }));
    }
    catch (err) {
        next(err);
    }
}
// ─── GET /api/v1/channels/voice ──────────────────────────────────────────────
export async function getVoiceChannels(req, res, next) {
    try {
        const authedReq = req;
        const workspaceId = authedReq.user.workspaceId;
        const channels = await getVoiceChannelsService(workspaceId);
        res.status(HTTP_STATUS.OK).json(successResponse(channels));
    }
    catch (err) {
        next(err);
    }
}
// ─── GET /api/v1/channels/:channelId ────────────────────────────────────────
export async function getChannel(req, res, next) {
    try {
        const authedReq = req;
        const workspaceId = authedReq.user.workspaceId;
        const { channelId } = req.params;
        const channel = await getChannelService(channelId, workspaceId);
        res.status(HTTP_STATUS.OK).json(successResponse(channel));
    }
    catch (err) {
        next(err);
    }
}
// ─── PATCH /api/v1/channels/:channelId ──────────────────────────────────────
export async function updateChannel(req, res, next) {
    try {
        const authedReq = req;
        const uid = authedReq.user.uid;
        const workspaceId = authedReq.user.workspaceId;
        const { channelId } = req.params;
        const body = UpdateChannelSchema.parse(req.body);
        const channel = await updateChannelService(channelId, workspaceId, uid, body);
        logger.info("Channel updated", { channelId, workspaceId });
        res.status(HTTP_STATUS.OK).json(successResponse(channel, "Channel updated successfully."));
    }
    catch (err) {
        next(err);
    }
}
// ─── DELETE /api/v1/channels/:channelId ─────────────────────────────────────
export async function deleteChannel(req, res, next) {
    try {
        const authedReq = req;
        const uid = authedReq.user.uid;
        const workspaceId = authedReq.user.workspaceId;
        const { channelId } = req.params;
        await deleteChannelService(channelId, workspaceId, uid);
        logger.info("Channel deleted", { channelId, workspaceId });
        res.status(HTTP_STATUS.OK).json(successResponse(null, "Channel deleted successfully."));
    }
    catch (err) {
        next(err);
    }
}
// ─── POST /api/v1/channels/:channelId/archive ────────────────────────────────
export async function archiveChannel(req, res, next) {
    try {
        const authedReq = req;
        const uid = authedReq.user.uid;
        const workspaceId = authedReq.user.workspaceId;
        const { channelId } = req.params;
        // Optional body: { archived: boolean } — defaults to true (archive)
        const isArchived = req.body?.archived !== false;
        await archiveChannelService(channelId, workspaceId, uid, isArchived);
        logger.info("Channel archive status toggled", { channelId, isArchived });
        res.status(HTTP_STATUS.OK).json(successResponse({ isArchived }, isArchived ? "Channel archived." : "Channel unarchived."));
    }
    catch (err) {
        next(err);
    }
}
// ─── POST /api/v1/channels/reorder ──────────────────────────────────────────
export async function reorderChannels(req, res, next) {
    try {
        const authedReq = req;
        const uid = authedReq.user.uid;
        const workspaceId = authedReq.user.workspaceId;
        const body = ReorderChannelsSchema.parse(req.body);
        await reorderChannelsService(workspaceId, uid, body);
        logger.info("Channels reordered", { workspaceId, count: body.order.length });
        res.status(HTTP_STATUS.OK).json(successResponse(null, "Channels reordered successfully."));
    }
    catch (err) {
        next(err);
    }
}
// ─── POST /api/v1/channels/:channelId/read ──────────────────────────────────
export async function markChannelRead(req, res, next) {
    try {
        const authedReq = req;
        const uid = authedReq.user.uid;
        const workspaceId = authedReq.user.workspaceId;
        const { channelId } = req.params;
        const body = MarkChannelReadSchema.parse(req.body);
        await markChannelReadService(channelId, workspaceId, uid, body);
        res.status(HTTP_STATUS.OK).json(successResponse(null, "Channel marked as read."));
    }
    catch (err) {
        next(err);
    }
}
// ─── PATCH /api/v1/channels/:channelId/permissions ──────────────────────────
export async function updateChannelPermissions(req, res, next) {
    try {
        const authedReq = req;
        const uid = authedReq.user.uid;
        const workspaceId = authedReq.user.workspaceId;
        const { channelId } = req.params;
        const body = UpdateChannelPermissionsSchema.parse(req.body);
        await updateChannelPermissionsService(channelId, workspaceId, uid, body);
        logger.info("Channel permissions updated", {
            channelId,
            roleId: body.roleId,
        });
        res.status(HTTP_STATUS.OK).json(successResponse(null, "Channel permissions updated."));
    }
    catch (err) {
        next(err);
    }
}
// ─── POST /api/v1/channels/:channelId/members ───────────────────────────────
export async function addChannelMembers(req, res, next) {
    try {
        const authedReq = req;
        const uid = authedReq.user.uid;
        const workspaceId = authedReq.user.workspaceId;
        const { channelId } = req.params;
        const body = AddChannelMembersSchema.parse(req.body);
        await addChannelMembersService(channelId, workspaceId, uid, body);
        logger.info("Members added to channel", {
            channelId,
            count: body.uids.length,
        });
        res.status(HTTP_STATUS.OK).json(successResponse({ added: body.uids.length }, `${body.uids.length} member(s) added to channel.`));
    }
    catch (err) {
        next(err);
    }
}
//# sourceMappingURL=channelController.js.map