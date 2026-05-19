'use strict';
// js/routes/voice.routes.js

const { Router } = require('express');
const { requirePermission } = require('../middleware/rbacMiddleware');
const { RATE_LIMITS }       = require('../middleware/rateLimitMiddleware');
const { joinVoiceChannel, leaveVoiceChannel, getVoiceParticipants } = require('../controllers/voiceController');

const voiceRouter = Router();

voiceRouter.post  ('/:channelId/join',         RATE_LIMITS.VOICE_JOIN, requirePermission('join_voice'), joinVoiceChannel);
voiceRouter.post  ('/:channelId/leave',                                requirePermission('join_voice'), leaveVoiceChannel);
voiceRouter.get   ('/:channelId/participants',                          getVoiceParticipants);

module.exports = { voiceRouter };
