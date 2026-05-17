/**
 * backend/routes/voice.routes.ts
 * Project: Obsidian
 *
 * Express router for all voice channel endpoints.
 * All routes require a valid Firebase JWT via authenticate middleware.
 *
 *  POST   /api/v1/voice/join                                    → joinVoice
 *  POST   /api/v1/voice/leave                                   → leaveVoice
 *  GET    /api/v1/voice/session                                 → getActiveSession
 *  GET    /api/v1/voice/presence                                → getVoicePresence
 *  PATCH  /api/v1/voice/participant                             → updateParticipantState
 *  POST   /api/v1/voice/mute/:uid                               → muteParticipant
 *  POST   /api/v1/voice/kick/:uid                               → kickParticipant
 *  POST   /api/v1/voice/end                                     → endVoiceSession
 *  POST   /api/v1/voice/heartbeat                               → heartbeat
 *  POST   /api/v1/voice/quality                                 → reportQualityStats
 */

import { Router } from "express";
import { authenticate } from "../middleware/authMiddleware";
import { requirePermission } from "../middleware/rbacMiddleware";
import { RATE_LIMITS } from "../middleware/rateLimitMiddleware";
import {
  joinVoice,
  leaveVoice,
  getActiveSession,
  getVoicePresence,
  updateParticipantState,
  muteParticipant,
  kickParticipant,
  endVoiceSession,
  heartbeat,
  reportQualityStats,
} from "../controllers/voiceController";

export const voiceRouter = Router();

// All voice routes require authentication
voiceRouter.use(authenticate);

// ─── Join / Leave ─────────────────────────────────────────────────────────────

// POST /api/v1/voice/join
voiceRouter.post(
  "/join",
  requirePermission("join_voice"),
  RATE_LIMITS.VOICE_JOIN,
  joinVoice
);

// POST /api/v1/voice/leave
voiceRouter.post("/leave", leaveVoice);

// ─── Session & Presence ───────────────────────────────────────────────────────

// GET /api/v1/voice/session  (?channelId=)
voiceRouter.get("/session", getActiveSession);

// GET /api/v1/voice/presence  (?channelId=)
voiceRouter.get("/presence", getVoicePresence);

// ─── Participant controls ─────────────────────────────────────────────────────

// PATCH /api/v1/voice/participant  (self: mute/deafen toggle)
voiceRouter.patch("/participant", updateParticipantState);

// POST /api/v1/voice/mute/:uid  (moderator: mute another participant)
voiceRouter.post(
  "/mute/:uid",
  requirePermission("mute_members"),
  muteParticipant
);

// POST /api/v1/voice/kick/:uid  (moderator: kick participant from voice)
voiceRouter.post(
  "/kick/:uid",
  requirePermission("kick_members"),
  kickParticipant
);

// ─── Session management ───────────────────────────────────────────────────────

// POST /api/v1/voice/end  (admin: forcefully end a voice session)
voiceRouter.post(
  "/end",
  requirePermission("manage_channels"),
  endVoiceSession
);

// ─── Heartbeat & Quality ──────────────────────────────────────────────────────

// POST /api/v1/voice/heartbeat
voiceRouter.post("/heartbeat", heartbeat);

// POST /api/v1/voice/quality
voiceRouter.post("/quality", reportQualityStats);
