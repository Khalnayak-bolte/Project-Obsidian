/**
 * backend/controllers/voiceController.ts
 * Project: Obsidian
 *
 * HTTP request handlers for all voice routes.
 * Validates input via Zod schemas, delegates to voiceService,
 * and returns consistent ApiSuccess / ApiError responses.
 *
 * Route map (wired in routes/voice.routes.ts):
 *  POST   /api/v1/voice/join                              → joinVoice
 *  POST   /api/v1/voice/leave                             → leaveVoice
 *  GET    /api/v1/voice/:channelId/session                → getActiveSession
 *  GET    /api/v1/voice/:channelId/presence               → getVoicePresence
 *  PATCH  /api/v1/voice/:channelId/state                  → updateParticipantState
 *  POST   /api/v1/voice/:channelId/mute                   → muteParticipant
 *  POST   /api/v1/voice/:channelId/kick                   → kickParticipant
 *  POST   /api/v1/voice/:sessionId/end                    → endVoiceSession
 *  POST   /api/v1/voice/heartbeat                         → heartbeat
 *  POST   /api/v1/voice/stats                             → reportQualityStats
 */
import { createLogger } from "../utils/logger";
import { successResponse } from "../utils/helpers";
import { HTTP_STATUS } from "../types/common";
import { JoinVoiceSchema, LeaveVoiceSchema, MuteParticipantSchema, KickParticipantSchema, UpdateParticipantStateSchema, VoiceHeartbeatSchema, VoiceQualityStatsSchema, EndVoiceSessionSchema, } from "../schemas/voice.schema";
import { joinVoice as joinVoiceService, leaveVoice as leaveVoiceService, getActiveSession as getActiveSessionService, getVoicePresence as getVoicePresenceService, updateParticipantState as updateParticipantStateService, muteParticipant as muteParticipantService, kickParticipant as kickParticipantService, endVoiceSession as endVoiceSessionService, voiceHeartbeat as voiceHeartbeatService, } from "../services/voiceService";
import { getUserById } from "../repositories/userRepository";
const logger = createLogger("voiceController");
// ─── POST /api/v1/voice/join ──────────────────────────────────────────────────
export async function joinVoice(req, res, next) {
    try {
        const authedReq = req;
        const uid = authedReq.user.uid;
        const workspaceId = authedReq.user.workspaceId;
        const body = JoinVoiceSchema.parse({
            ...req.body,
            workspaceId,
            userId: uid,
        });
        // Fetch display name for Chime attendee label
        const profile = await getUserById(uid);
        const displayName = profile?.displayName ?? uid;
        const result = await joinVoiceService(workspaceId, uid, displayName, body);
        logger.info("Voice join success", {
            uid,
            channelId: body.channelId,
            meetingId: result.meetingId,
        });
        res.status(HTTP_STATUS.OK).json(successResponse(result, "Joined voice channel."));
    }
    catch (err) {
        next(err);
    }
}
// ─── POST /api/v1/voice/leave ─────────────────────────────────────────────────
export async function leaveVoice(req, res, next) {
    try {
        const authedReq = req;
        const uid = authedReq.user.uid;
        const workspaceId = authedReq.user.workspaceId;
        const body = LeaveVoiceSchema.parse({
            ...req.body,
            workspaceId,
            userId: uid,
        });
        await leaveVoiceService(workspaceId, uid, body);
        logger.info("Voice leave success", { uid, channelId: body.channelId });
        res.status(HTTP_STATUS.OK).json(successResponse(null, "Left voice channel."));
    }
    catch (err) {
        next(err);
    }
}
// ─── GET /api/v1/voice/:channelId/session ────────────────────────────────────
export async function getActiveSession(req, res, next) {
    try {
        const authedReq = req;
        const workspaceId = authedReq.user.workspaceId;
        const { channelId } = req.params;
        const session = await getActiveSessionService(workspaceId, channelId);
        res.status(HTTP_STATUS.OK).json(successResponse(session));
    }
    catch (err) {
        next(err);
    }
}
// ─── GET /api/v1/voice/:channelId/presence ───────────────────────────────────
export async function getVoicePresence(req, res, next) {
    try {
        const authedReq = req;
        const workspaceId = authedReq.user.workspaceId;
        const { channelId } = req.params;
        const participants = await getVoicePresenceService(workspaceId, channelId);
        res.status(HTTP_STATUS.OK).json(successResponse(participants));
    }
    catch (err) {
        next(err);
    }
}
// ─── PATCH /api/v1/voice/:channelId/state ────────────────────────────────────
export async function updateParticipantState(req, res, next) {
    try {
        const authedReq = req;
        const uid = authedReq.user.uid;
        const workspaceId = authedReq.user.workspaceId;
        const { sessionId } = req.body;
        const body = UpdateParticipantStateSchema.parse(req.body);
        if (!sessionId) {
            res.status(HTTP_STATUS.BAD_REQUEST).json(successResponse(null, "sessionId is required in the request body."));
            return;
        }
        await updateParticipantStateService(workspaceId, uid, sessionId, body);
        res.status(HTTP_STATUS.OK).json(successResponse(body, "Participant state updated."));
    }
    catch (err) {
        next(err);
    }
}
// ─── POST /api/v1/voice/:channelId/mute ──────────────────────────────────────
export async function muteParticipant(req, res, next) {
    try {
        const authedReq = req;
        const actorId = authedReq.user.uid;
        const workspaceId = authedReq.user.workspaceId;
        const { channelId } = req.params;
        const body = MuteParticipantSchema.parse({
            ...req.body,
            channelId,
            workspaceId,
        });
        await muteParticipantService(workspaceId, actorId, body);
        logger.info("Participant muted", {
            actorId,
            targetUid: body.targetUid,
            channelId,
        });
        res.status(HTTP_STATUS.OK).json(successResponse(null, "Participant muted."));
    }
    catch (err) {
        next(err);
    }
}
// ─── POST /api/v1/voice/:channelId/kick ──────────────────────────────────────
export async function kickParticipant(req, res, next) {
    try {
        const authedReq = req;
        const actorId = authedReq.user.uid;
        const workspaceId = authedReq.user.workspaceId;
        const { channelId } = req.params;
        const body = KickParticipantSchema.parse({
            ...req.body,
            channelId,
            workspaceId,
        });
        await kickParticipantService(workspaceId, actorId, body);
        logger.info("Participant kicked", {
            actorId,
            targetUid: body.targetUid,
            channelId,
        });
        res.status(HTTP_STATUS.OK).json(successResponse(null, "Participant removed from voice channel."));
    }
    catch (err) {
        next(err);
    }
}
// ─── POST /api/v1/voice/:sessionId/end ───────────────────────────────────────
export async function endVoiceSession(req, res, next) {
    try {
        const authedReq = req;
        const workspaceId = authedReq.user.workspaceId;
        const { sessionId } = req.params;
        const body = EndVoiceSessionSchema.parse({
            ...req.body,
            sessionId,
            workspaceId,
        });
        await endVoiceSessionService(body.sessionId, workspaceId);
        logger.info("Voice session ended by admin", {
            sessionId,
            uid: authedReq.user.uid,
        });
        res.status(HTTP_STATUS.OK).json(successResponse(null, "Voice session ended."));
    }
    catch (err) {
        next(err);
    }
}
// ─── POST /api/v1/voice/heartbeat ────────────────────────────────────────────
export async function heartbeat(req, res, next) {
    try {
        const authedReq = req;
        const uid = authedReq.user.uid;
        const workspaceId = authedReq.user.workspaceId;
        const body = VoiceHeartbeatSchema.parse({
            ...req.body,
            workspaceId,
        });
        await voiceHeartbeatService(workspaceId, uid, body);
        // 204 No Content — keep response tiny for high-frequency heartbeats
        res.status(HTTP_STATUS.NO_CONTENT).send();
    }
    catch (err) {
        next(err);
    }
}
// ─── POST /api/v1/voice/stats ────────────────────────────────────────────────
export async function reportQualityStats(req, res, next) {
    try {
        const authedReq = req;
        const uid = authedReq.user.uid;
        const body = VoiceQualityStatsSchema.parse(req.body);
        // Stats are informational — log and acknowledge, no write needed for now
        logger.info("Voice quality stats received", {
            uid,
            sessionId: body.sessionId,
            connectionQuality: body.connectionQuality,
            audioLatencyMs: body.audioLatencyMs,
            audioPacketLoss: body.audioPacketLoss,
        });
        res.status(HTTP_STATUS.NO_CONTENT).send();
    }
    catch (err) {
        next(err);
    }
}
//# sourceMappingURL=voiceController.js.map