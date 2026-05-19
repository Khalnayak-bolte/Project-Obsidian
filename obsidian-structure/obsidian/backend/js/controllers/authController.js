'use strict';
// js/controllers/authController.js

const { createLogger } = require('../utils/logger');
const { successResponse, HTTP_STATUS, ERROR_CODES } = require('../utils/helpers');
const { AppError }     = require('../middleware/errorMiddleware');
const { db, auth, COLLECTIONS, FieldValue } = require('../config/firebase');
const { generateWorkspaceId } = require('../utils/helpers');

const logger = createLogger('authController');

function clientMeta(req) {
  const xff = req.headers['x-forwarded-for'];
  return {
    ipAddress: xff ? xff.split(',')[0].trim() : (req.socket && req.socket.remoteAddress) || 'unknown',
    userAgent: req.headers['user-agent'] || 'unknown',
  };
}

// ─── POST /api/v1/auth/register ───────────────────────────────────────────────

async function register(req, res, next) {
  try {
    const { email, password, displayName, workspaceName } = req.body;
    if (!email || !password || !displayName) {
      throw new AppError(ERROR_CODES.INVALID_INPUT, 'email, password, and displayName are required.');
    }

    // Create Firebase user
    const userRecord = await auth.createUser({ email, password, displayName });
    const uid        = userRecord.uid;
    const wsId       = generateWorkspaceId();
    const { ipAddress, userAgent } = clientMeta(req);

    // Create Firestore workspace
    await db.collection(COLLECTIONS.WORKSPACES).doc(wsId).set({
      id: wsId, name: workspaceName || `${displayName}'s Workspace`,
      ownerId: uid, members: [uid], tier: 'free',
      createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(),
    });

    // Create Firestore user doc
    await db.collection(COLLECTIONS.USERS).doc(uid).set({
      uid, email, displayName, workspaceId: wsId,
      roleId: 'role_owner', permissions: {},
      createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(),
      lastLoginIp: ipAddress, lastLoginAgent: userAgent,
    });

    logger.info('Register success', { uid, workspaceId: wsId });

    return res.status(HTTP_STATUS.CREATED).json(
      successResponse({ uid, email, displayName, workspaceId: wsId }, 'Account created successfully.')
    );
  } catch (err) {
    // Firebase "email already exists" → map to conflict
    if (err.code === 'auth/email-already-exists') {
      return next(new AppError(ERROR_CODES.ALREADY_EXISTS, 'An account with this email already exists.'));
    }
    logger.error('register failed', err);
    next(err);
  }
}

// ─── POST /api/v1/auth/login/oauth ───────────────────────────────────────────

async function oauthLogin(req, res, next) {
  try {
    const { idToken, provider, deviceId } = req.body;
    if (!idToken) throw new AppError(ERROR_CODES.INVALID_INPUT, 'idToken is required.');

    const decoded   = await auth.verifyIdToken(idToken);
    const uid       = decoded.uid;

    // Ensure user doc exists
    const userSnap  = await db.collection(COLLECTIONS.USERS).doc(uid).get();
    let workspaceId = '';

    if (!userSnap.exists) {
      // First OAuth login — create workspace + user doc
      workspaceId   = generateWorkspaceId();
      await db.collection(COLLECTIONS.WORKSPACES).doc(workspaceId).set({
        id: workspaceId, name: `${decoded.name || decoded.email}'s Workspace`,
        ownerId: uid, members: [uid], tier: 'free',
        createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(),
      });
      await db.collection(COLLECTIONS.USERS).doc(uid).set({
        uid, email: decoded.email, displayName: decoded.name || '',
        avatarUrl: decoded.picture || '', workspaceId,
        roleId: 'role_owner', permissions: {}, provider: provider || 'google',
        createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(),
      });
    } else {
      workspaceId = userSnap.data().workspaceId || '';
    }

    logger.info('OAuth login success', { uid, provider });

    return res.status(HTTP_STATUS.OK).json(
      successResponse({ uid, email: decoded.email, displayName: decoded.name, workspaceId }, 'Logged in successfully.')
    );
  } catch (err) {
    logger.error('oauthLogin failed', err);
    next(err);
  }
}

// ─── POST /api/v1/auth/logout ─────────────────────────────────────────────────

async function logout(req, res, next) {
  try {
    const uid         = req.user.uid;
    const { allDevices } = req.body;
    if (allDevices) await auth.revokeRefreshTokens(uid);
    logger.info('Logout', { uid, allDevices });
    return res.status(HTTP_STATUS.OK).json(successResponse(null, 'Logged out successfully.'));
  } catch (err) {
    logger.error('logout failed', err);
    next(err);
  }
}

// ─── POST /api/v1/auth/password/reset ────────────────────────────────────────

async function requestPasswordReset(req, res, next) {
  try {
    const { email } = req.body;
    // Firebase handles sending — we never confirm existence to caller (anti-enum)
    try {
      await auth.generatePasswordResetLink(email);
    } catch (e) {
      logger.warn('Password reset generation failed silently', { email, err: e.message });
    }
    return res.status(HTTP_STATUS.OK).json(
      successResponse(null, 'If an account exists for this email, a reset link has been sent.')
    );
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/v1/auth/me ──────────────────────────────────────────────────────

async function getMe(req, res, next) {
  try {
    const uid      = req.user.uid;
    const userSnap = await db.collection(COLLECTIONS.USERS).doc(uid).get();
    if (!userSnap.exists) throw new AppError(ERROR_CODES.NOT_FOUND, 'User profile not found.');
    return res.status(HTTP_STATUS.OK).json(successResponse(userSnap.data()));
  } catch (err) {
    logger.error('getMe failed', err);
    next(err);
  }
}

// ─── PATCH /api/v1/auth/me ────────────────────────────────────────────────────

async function updateProfile(req, res, next) {
  try {
    const uid   = req.user.uid;
    const { displayName, avatarUrl } = req.body;
    const update = { updatedAt: FieldValue.serverTimestamp() };
    if (displayName) update.displayName = displayName;
    if (avatarUrl !== undefined) update.avatarUrl = avatarUrl;

    await db.collection(COLLECTIONS.USERS).doc(uid).update(update);

    const snap = await db.collection(COLLECTIONS.USERS).doc(uid).get();
    logger.info('Profile updated', { uid });
    return res.status(HTTP_STATUS.OK).json(successResponse(snap.data(), 'Profile updated successfully.'));
  } catch (err) {
    logger.error('updateProfile failed', err);
    next(err);
  }
}

// ─── POST /api/v1/auth/verify-token ──────────────────────────────────────────

async function verifyToken(req, res, next) {
  try {
    const { token } = req.body;
    if (!token) throw new AppError(ERROR_CODES.INVALID_INPUT, 'token is required.');

    const decoded  = await auth.verifyIdToken(token);
    const userSnap = await db.collection(COLLECTIONS.USERS).doc(decoded.uid).get();
    if (!userSnap.exists) throw new AppError(ERROR_CODES.NOT_FOUND, 'User profile not found.');

    return res.status(HTTP_STATUS.OK).json(
      successResponse({ valid: true, uid: decoded.uid, email: decoded.email, workspaceId: userSnap.data().workspaceId })
    );
  } catch (err) {
    logger.error('verifyToken failed', err);
    next(err);
  }
}

// ─── GET /api/v1/auth/sessions ───────────────────────────────────────────────

async function listSessions(req, res, next) {
  try {
    const uid  = req.user.uid;
    const snap = await db.collection(COLLECTIONS.USERS).doc(uid).collection('sessions').get();
    const sessions = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    return res.status(HTTP_STATUS.OK).json(successResponse(sessions));
  } catch (err) {
    next(err);
  }
}

// ─── DELETE /api/v1/auth/sessions/:deviceId ───────────────────────────────────

async function revokeSession(req, res, next) {
  try {
    const uid      = req.user.uid;
    const deviceId = req.params.deviceId;
    if (!deviceId) throw new AppError(ERROR_CODES.INVALID_INPUT, 'Device ID is required.');

    await db.collection(COLLECTIONS.USERS).doc(uid).collection('sessions').doc(deviceId).delete();
    logger.info('Session revoked', { uid, deviceId });

    return res.status(HTTP_STATUS.OK).json(successResponse(null, 'Session revoked successfully.'));
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/v1/auth/check-email ─────────────────────────────────────────────

async function checkEmail(req, res, next) {
  try {
    const email = (req.query.email || '').toLowerCase().trim();
    if (!email) throw new AppError(ERROR_CODES.INVALID_INPUT, 'Email query param is required.');

    let exists = false;
    try {
      await auth.getUserByEmail(email);
      exists = true;
    } catch (e) {
      if (e.code !== 'auth/user-not-found') throw e;
    }

    return res.status(HTTP_STATUS.OK).json(successResponse({ available: !exists }));
  } catch (err) {
    next(err);
  }
}

module.exports = {
  register, oauthLogin, logout, requestPasswordReset,
  getMe, updateProfile, verifyToken,
  listSessions, revokeSession, checkEmail,
};
