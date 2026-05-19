'use strict';
// js/controllers/channelController.js

const { createLogger } = require('../utils/logger');
const { successResponse, HTTP_STATUS, ERROR_CODES, generateChannelId } = require('../utils/helpers');
const { AppError }     = require('../middleware/errorMiddleware');
const { db, COLLECTIONS, FieldValue } = require('../config/firebase');

const logger = createLogger('channelController');

async function listChannels(req, res, next) {
  try {
    const workspaceId = req.user.workspaceId;
    const snap = await db.collection(COLLECTIONS.CHANNELS).where('workspaceId', '==', workspaceId).get();
    const channels = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    return res.status(HTTP_STATUS.OK).json(successResponse(channels));
  } catch (err) { logger.error('listChannels', err); next(err); }
}

async function createChannel(req, res, next) {
  try {
    const uid         = req.user.uid;
    const workspaceId = req.user.workspaceId;
    const { name, type = 'text', description = '' } = req.body;
    if (!name) throw new AppError(ERROR_CODES.INVALID_INPUT, 'Channel name is required.');
    const id = generateChannelId();
    await db.collection(COLLECTIONS.CHANNELS).doc(id).set({ id, name, type, description, workspaceId, createdBy: uid, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
    return res.status(HTTP_STATUS.CREATED).json(successResponse({ id, name, type }, 'Channel created.'));
  } catch (err) { logger.error('createChannel', err); next(err); }
}

async function getChannel(req, res, next) {
  try {
    const snap = await db.collection(COLLECTIONS.CHANNELS).doc(req.params.channelId).get();
    if (!snap.exists) throw new AppError(ERROR_CODES.NOT_FOUND, 'Channel not found.');
    return res.status(HTTP_STATUS.OK).json(successResponse(snap.data()));
  } catch (err) { logger.error('getChannel', err); next(err); }
}

async function updateChannel(req, res, next) {
  try {
    const { channelId } = req.params;
    const { name, description } = req.body;
    const update = { updatedAt: FieldValue.serverTimestamp() };
    if (name)        update.name        = name;
    if (description) update.description = description;
    await db.collection(COLLECTIONS.CHANNELS).doc(channelId).update(update);
    const snap = await db.collection(COLLECTIONS.CHANNELS).doc(channelId).get();
    return res.status(HTTP_STATUS.OK).json(successResponse(snap.data(), 'Channel updated.'));
  } catch (err) { logger.error('updateChannel', err); next(err); }
}

async function deleteChannel(req, res, next) {
  try {
    await db.collection(COLLECTIONS.CHANNELS).doc(req.params.channelId).delete();
    return res.status(HTTP_STATUS.OK).json(successResponse(null, 'Channel deleted.'));
  } catch (err) { logger.error('deleteChannel', err); next(err); }
}

module.exports = { listChannels, createChannel, getChannel, updateChannel, deleteChannel };
