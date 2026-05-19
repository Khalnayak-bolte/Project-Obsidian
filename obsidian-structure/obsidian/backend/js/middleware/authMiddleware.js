'use strict';
// js/middleware/authMiddleware.js

const { db, COLLECTIONS, auth } = require('../config/firebase');
const { createLogger }          = require('../utils/logger');
const { errorResponse, HTTP_STATUS, ERROR_CODES } = require('../utils/helpers');

const logger = createLogger('authMiddleware');

// ─── Token extractor ──────────────────────────────────────────────────────────

function extractToken(req) {
  const header = req.headers['authorization'];
  if (!header || !header.startsWith('Bearer ')) return null;
  const token = header.slice(7).trim();
  return token.length > 0 ? token : null;
}

// ─── Build session from Firestore ─────────────────────────────────────────────

async function buildSession(uid, decoded) {
  const userSnap = await db.collection(COLLECTIONS.USERS).doc(uid).get();
  if (!userSnap.exists) throw new Error(`User record not found: ${uid}`);
  const u = userSnap.data();
  return {
    uid,
    email:        decoded.email        || u.email        || '',
    displayName:  decoded.name         || u.displayName  || '',
    workspaceId:  u.workspaceId        || '',
    roleId:       u.roleId             || 'role_guest',
    permissions:  u.permissions        || {},
    emailVerified:decoded.email_verified || false,
    avatarUrl:    u.avatarUrl          || decoded.picture || '',
    issuedAt:     new Date(decoded.iat * 1000),
    expiresAt:    new Date(decoded.exp * 1000),
  };
}

// ─── authenticate ─────────────────────────────────────────────────────────────

async function authenticate(req, res, next) {
  const token = extractToken(req);
  if (!token) {
    return res.status(HTTP_STATUS.UNAUTHORIZED).json(
      errorResponse(ERROR_CODES.UNAUTHORIZED, 'Authorization token is missing')
    );
  }
  try {
    const decoded = await auth.verifyIdToken(token, false);
    req.user      = await buildSession(decoded.uid, decoded);
    next();
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Authentication failed';
    logger.warn('authenticate failed', { ip: req.ip, error: message });
    return res.status(HTTP_STATUS.UNAUTHORIZED).json(
      errorResponse(ERROR_CODES.UNAUTHORIZED, message)
    );
  }
}

// ─── authenticateStrict ───────────────────────────────────────────────────────

async function authenticateStrict(req, res, next) {
  const token = extractToken(req);
  if (!token) {
    return res.status(HTTP_STATUS.UNAUTHORIZED).json(
      errorResponse(ERROR_CODES.UNAUTHORIZED, 'Authorization token is missing')
    );
  }
  try {
    const decoded = await auth.verifyIdToken(token, true); // checkRevoked = true
    req.user      = await buildSession(decoded.uid, decoded);
    next();
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Authentication failed';
    logger.warn('authenticateStrict failed', { ip: req.ip, error: message });
    return res.status(HTTP_STATUS.UNAUTHORIZED).json(
      errorResponse(ERROR_CODES.UNAUTHORIZED, message)
    );
  }
}

// ─── optionalAuth ─────────────────────────────────────────────────────────────

async function optionalAuth(req, _res, next) {
  const token = extractToken(req);
  if (!token) return next();
  try {
    const decoded = await auth.verifyIdToken(token, false);
    req.user      = await buildSession(decoded.uid, decoded);
  } catch { /* silently ignore */ }
  next();
}

// ─── requireEmailVerified ─────────────────────────────────────────────────────

function requireEmailVerified(req, res, next) {
  if (!req.user || !req.user.emailVerified) {
    return res.status(HTTP_STATUS.FORBIDDEN).json(
      errorResponse(ERROR_CODES.FORBIDDEN, 'Email verification is required.')
    );
  }
  next();
}

module.exports = { authenticate, authenticateStrict, optionalAuth, requireEmailVerified };
