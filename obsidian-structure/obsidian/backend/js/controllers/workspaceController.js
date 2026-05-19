'use strict';
// js/controllers/workspaceController.js

const { createLogger } = require('../utils/logger');
const { successResponse, HTTP_STATUS, ERROR_CODES } = require('../utils/helpers');
const { AppError }     = require('../middleware/errorMiddleware');
const { db, COLLECTIONS, FieldValue } = require('../config/firebase');

const logger = createLogger('workspaceController');

async function getWorkspace(req, res, next) {
  try {
    const workspaceId = req.user.workspaceId;
    const snap = await db.collection(COLLECTIONS.WORKSPACES).doc(workspaceId).get();
    if (!snap.exists) throw new AppError(ERROR_CODES.NOT_FOUND, 'Workspace not found.');
    return res.status(HTTP_STATUS.OK).json(successResponse(snap.data()));
  } catch (err) { logger.error('getWorkspace', err); next(err); }
}

async function updateWorkspace(req, res, next) {
  try {
    const workspaceId = req.user.workspaceId;
    const { name, description, avatarUrl } = req.body;
    const update = { updatedAt: FieldValue.serverTimestamp() };
    if (name)        update.name        = name;
    if (description) update.description = description;
    if (avatarUrl)   update.avatarUrl   = avatarUrl;
    await db.collection(COLLECTIONS.WORKSPACES).doc(workspaceId).update(update);
    const snap = await db.collection(COLLECTIONS.WORKSPACES).doc(workspaceId).get();
    return res.status(HTTP_STATUS.OK).json(successResponse(snap.data(), 'Workspace updated.'));
  } catch (err) { logger.error('updateWorkspace', err); next(err); }
}

async function getMembers(req, res, next) {
  try {
    const workspaceId = req.user.workspaceId;
    const snap = await db.collection(COLLECTIONS.USERS).where('workspaceId', '==', workspaceId).get();
    const members = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    return res.status(HTTP_STATUS.OK).json(successResponse(members));
  } catch (err) { logger.error('getMembers', err); next(err); }
}

async function removeMember(req, res, next) {
  try {
    const workspaceId = req.user.workspaceId;
    const { userId }  = req.params;
    await db.collection(COLLECTIONS.USERS).doc(userId).update({ workspaceId: null, updatedAt: FieldValue.serverTimestamp() });
    logger.info('Member removed', { workspaceId, userId });
    return res.status(HTTP_STATUS.OK).json(successResponse(null, 'Member removed.'));
  } catch (err) { logger.error('removeMember', err); next(err); }
}

async function generateInvite(req, res, next) {
  try {
    const workspaceId = req.user.workspaceId;
    const token       = require('crypto').randomBytes(16).toString('hex');
    await db.collection(COLLECTIONS.WORKSPACES).doc(workspaceId).update({
      inviteToken: token, inviteExpiry: new Date(Date.now() + 7 * 24 * 3600_000),
    });
    return res.status(HTTP_STATUS.OK).json(successResponse({ inviteToken: token }, 'Invite generated.'));
  } catch (err) { logger.error('generateInvite', err); next(err); }
}

async function joinWorkspace(req, res, next) {
  try {
    const uid   = req.user.uid;
    const { inviteToken } = req.body;
    if (!inviteToken) throw new AppError(ERROR_CODES.INVALID_INPUT, 'inviteToken is required.');

    const snap = await db.collection(COLLECTIONS.WORKSPACES).where('inviteToken', '==', inviteToken).limit(1).get();
    if (snap.empty) throw new AppError(ERROR_CODES.NOT_FOUND, 'Invalid or expired invite.');

    const wsDoc = snap.docs[0];
    const wsId  = wsDoc.id;
    await db.collection(COLLECTIONS.USERS).doc(uid).update({ workspaceId: wsId, updatedAt: FieldValue.serverTimestamp() });
    return res.status(HTTP_STATUS.OK).json(successResponse({ workspaceId: wsId }, 'Joined workspace.'));
  } catch (err) { logger.error('joinWorkspace', err); next(err); }
}

module.exports = { getWorkspace, updateWorkspace, getMembers, removeMember, generateInvite, joinWorkspace };
