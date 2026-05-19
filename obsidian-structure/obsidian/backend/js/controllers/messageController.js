'use strict';
// js/controllers/messageController.js

const { createLogger } = require('../utils/logger');
const { successResponse, HTTP_STATUS, ERROR_CODES, generateMessageId } = require('../utils/helpers');
const { AppError }     = require('../middleware/errorMiddleware');
const { db, COLLECTIONS, FieldValue } = require('../config/firebase');

const logger = createLogger('messageController');

async function listMessages(req, res, next) {
  try {
    const { channelId } = req.params;
    const limit = parseInt(req.query.limit || '50', 10);
    const snap  = await db.collection(COLLECTIONS.MESSAGES)
      .where('channelId', '==', channelId)
      .orderBy('createdAt', 'desc').limit(limit).get();
    const messages = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    return res.status(HTTP_STATUS.OK).json(successResponse(messages));
  } catch (err) { logger.error('listMessages', err); next(err); }
}

async function sendMessage(req, res, next) {
  try {
    const uid       = req.user.uid;
    const { channelId } = req.params;
    const { content, type = 'text' } = req.body;
    if (!content) throw new AppError(ERROR_CODES.INVALID_INPUT, 'Message content is required.');
    const id = generateMessageId();
    await db.collection(COLLECTIONS.MESSAGES).doc(id).set({ id, channelId, uid, content, type, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
    return res.status(HTTP_STATUS.CREATED).json(successResponse({ id, channelId, content, type }, 'Message sent.'));
  } catch (err) { logger.error('sendMessage', err); next(err); }
}

async function deleteMessage(req, res, next) {
  try {
    await db.collection(COLLECTIONS.MESSAGES).doc(req.params.messageId).delete();
    return res.status(HTTP_STATUS.OK).json(successResponse(null, 'Message deleted.'));
  } catch (err) { logger.error('deleteMessage', err); next(err); }
}

async function editMessage(req, res, next) {
  try {
    const { messageId } = req.params;
    const { content }   = req.body;
    if (!content) throw new AppError(ERROR_CODES.INVALID_INPUT, 'Content is required.');
    await db.collection(COLLECTIONS.MESSAGES).doc(messageId).update({ content, edited: true, updatedAt: FieldValue.serverTimestamp() });
    return res.status(HTTP_STATUS.OK).json(successResponse(null, 'Message edited.'));
  } catch (err) { logger.error('editMessage', err); next(err); }
}

module.exports = { listMessages, sendMessage, deleteMessage, editMessage };
