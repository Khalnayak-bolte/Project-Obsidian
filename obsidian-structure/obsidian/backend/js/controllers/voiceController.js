'use strict';
// js/controllers/voiceController.js

const { createLogger } = require('../utils/logger');
const { successResponse, HTTP_STATUS, ERROR_CODES } = require('../utils/helpers');
const { AppError }     = require('../middleware/errorMiddleware');
const { db, COLLECTIONS, FieldValue } = require('../config/firebase');
const { generateSessionId } = require('../utils/helpers');

const logger = createLogger('voiceController');

async function joinVoiceChannel(req, res, next) {
  try {
    const uid         = req.user.uid;
    const workspaceId = req.user.workspaceId;
    const { channelId } = req.params;
    const sessionId   = generateSessionId();

    // AWS Chime meeting creation requires real AWS credentials. Log clearly.
    logger.warn('joinVoiceChannel: AWS Chime not configured. Returning session placeholder.');

    await db.collection(COLLECTIONS.VOICE_SESSIONS).doc(sessionId).set({
      id: sessionId, channelId, workspaceId, uid,
      status: 'active', createdAt: FieldValue.serverTimestamp(),
    });

    return res.status(HTTP_STATUS.OK).json(
      successResponse({ sessionId, channelId, status: 'active' }, 'Voice session created (Chime not configured).')
    );
  } catch (err) { logger.error('joinVoiceChannel', err); next(err); }
}

async function leaveVoiceChannel(req, res, next) {
  try {
    const { channelId } = req.params;
    const uid           = req.user.uid;
    const snap = await db.collection(COLLECTIONS.VOICE_SESSIONS)
      .where('channelId', '==', channelId).where('uid', '==', uid).where('status', '==', 'active').limit(1).get();
    if (!snap.empty) {
      await snap.docs[0].ref.update({ status: 'ended', endedAt: FieldValue.serverTimestamp() });
    }
    return res.status(HTTP_STATUS.OK).json(successResponse(null, 'Left voice channel.'));
  } catch (err) { logger.error('leaveVoiceChannel', err); next(err); }
}

async function getVoiceParticipants(req, res, next) {
  try {
    const { channelId } = req.params;
    const snap = await db.collection(COLLECTIONS.VOICE_SESSIONS)
      .where('channelId', '==', channelId).where('status', '==', 'active').get();
    const participants = snap.docs.map(d => ({ uid: d.data().uid, sessionId: d.id }));
    return res.status(HTTP_STATUS.OK).json(successResponse(participants));
  } catch (err) { logger.error('getVoiceParticipants', err); next(err); }
}

module.exports = { joinVoiceChannel, leaveVoiceChannel, getVoiceParticipants };
