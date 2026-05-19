'use strict';
// js/controllers/adminController.js

const { createLogger } = require('../utils/logger');
const { successResponse, HTTP_STATUS, ERROR_CODES } = require('../utils/helpers');
const { AppError }     = require('../middleware/errorMiddleware');
const { db, auth, COLLECTIONS, FieldValue } = require('../config/firebase');

const logger = createLogger('adminController');

async function listUsers(req, res, next) {
  try {
    const { workspaceId } = req.user;
    const limit = parseInt(req.query.limit || '50', 10);
    const snap  = await db.collection(COLLECTIONS.USERS).where('workspaceId', '==', workspaceId).limit(limit).get();
    const users = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    return res.status(HTTP_STATUS.OK).json(successResponse(users));
  } catch (err) { logger.error('listUsers', err); next(err); }
}

async function getUser(req, res, next) {
  try {
    const snap = await db.collection(COLLECTIONS.USERS).doc(req.params.userId).get();
    if (!snap.exists) throw new AppError(ERROR_CODES.NOT_FOUND, 'User not found.');
    return res.status(HTTP_STATUS.OK).json(successResponse(snap.data()));
  } catch (err) { logger.error('getUser', err); next(err); }
}

async function updateUserRole(req, res, next) {
  try {
    const { userId }  = req.params;
    const { roleId }  = req.body;
    if (!roleId) throw new AppError(ERROR_CODES.INVALID_INPUT, 'roleId is required.');
    await db.collection(COLLECTIONS.USERS).doc(userId).update({ roleId, updatedAt: FieldValue.serverTimestamp() });
    logger.info('User role updated', { userId, roleId, by: req.user.uid });
    return res.status(HTTP_STATUS.OK).json(successResponse(null, 'User role updated.'));
  } catch (err) { logger.error('updateUserRole', err); next(err); }
}

async function deleteUser(req, res, next) {
  try {
    const { userId } = req.params;
    if (userId === req.user.uid) throw new AppError(ERROR_CODES.FORBIDDEN, 'Cannot delete your own account.');
    await auth.deleteUser(userId);
    await db.collection(COLLECTIONS.USERS).doc(userId).delete();
    logger.info('User deleted', { userId, by: req.user.uid });
    return res.status(HTTP_STATUS.OK).json(successResponse(null, 'User deleted.'));
  } catch (err) { logger.error('deleteUser', err); next(err); }
}

async function getActivityLogs(req, res, next) {
  try {
    const { workspaceId } = req.user;
    const limit = parseInt(req.query.limit || '50', 10);
    const snap  = await db.collection(COLLECTIONS.ACTIVITY_LOGS)
      .where('workspaceId', '==', workspaceId)
      .orderBy('createdAt', 'desc').limit(limit).get();
    const logs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    return res.status(HTTP_STATUS.OK).json(successResponse(logs));
  } catch (err) { logger.error('getActivityLogs', err); next(err); }
}

module.exports = { listUsers, getUser, updateUserRole, deleteUser, getActivityLogs };
