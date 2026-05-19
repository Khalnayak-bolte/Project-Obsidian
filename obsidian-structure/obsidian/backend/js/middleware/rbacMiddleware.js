'use strict';
// js/middleware/rbacMiddleware.js

const { db, COLLECTIONS } = require('../config/firebase');
const { createLogger }    = require('../utils/logger');
const { errorResponse, HTTP_STATUS, ERROR_CODES } = require('../utils/helpers');

const logger = createLogger('rbacMiddleware');

// Simple owner role constant
const SYSTEM_ROLE_OWNER = 'role_owner';

// ─── Permission cache (in-memory, 1 min TTL) ──────────────────────────────────

const permCache   = new Map();
const CACHE_TTL   = 60_000;

function getCacheKey(uid, workspaceId) { return `${uid}:${workspaceId}`; }

function getFromCache(uid, workspaceId) {
  const entry = permCache.get(getCacheKey(uid, workspaceId));
  if (!entry) return null;
  if (Date.now() - entry.cachedAt > CACHE_TTL) {
    permCache.delete(getCacheKey(uid, workspaceId));
    return null;
  }
  return entry.permissions;
}

function setCache(uid, workspaceId, permissions) {
  permCache.set(getCacheKey(uid, workspaceId), { permissions, cachedAt: Date.now() });
}

function invalidatePermissionCache(uid, workspaceId) {
  permCache.delete(getCacheKey(uid, workspaceId));
}

// ─── Permission resolver ──────────────────────────────────────────────────────

const ALL_PERMS = {
  manage_workspace: true, manage_roles: true, manage_channels: true,
  manage_members: true,   manage_billing: true, create_channels: true,
  delete_channels: true,  send_messages: true,  delete_messages: true,
  pin_messages: true,     mention_everyone: true, join_voice: true,
  mute_members: true,     kick_members: true,   deafen_members: true,
  upload_files: true,     download_files: true, delete_files: true,
  ban_members: true,      view_audit_log: true, manage_invites: true,
};

async function resolvePermissions(uid, workspaceId) {
  const cached = getFromCache(uid, workspaceId);
  if (cached) return cached;

  const userSnap = await db.collection(COLLECTIONS.USERS).doc(uid).get();
  if (!userSnap.exists) return {};

  const userData = userSnap.data();
  const roleId   = userData.roleId || 'role_guest';

  if (roleId === SYSTEM_ROLE_OWNER) {
    setCache(uid, workspaceId, ALL_PERMS);
    return ALL_PERMS;
  }

  const roleSnap = await db
    .collection(COLLECTIONS.WORKSPACES).doc(workspaceId)
    .collection('roles').doc(roleId).get();

  const permissions = roleSnap.exists ? (roleSnap.data().permissions || {}) : {};
  setCache(uid, workspaceId, permissions);
  return permissions;
}

// ─── requirePermission ────────────────────────────────────────────────────────

function requirePermission(permission) {
  return async (req, res, next) => {
    const session = req.user;
    if (!session) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json(
        errorResponse(ERROR_CODES.UNAUTHORIZED, 'Not authenticated')
      );
    }
    try {
      // Fast path: check session object
      if (session.permissions && permission in session.permissions) {
        if (!session.permissions[permission]) {
          return res.status(HTTP_STATUS.FORBIDDEN).json(
            errorResponse(ERROR_CODES.FORBIDDEN, `Missing required permission: ${permission}`)
          );
        }
        return next();
      }
      // Slow path: Firestore
      const perms = await resolvePermissions(session.uid, session.workspaceId);
      if (!perms[permission]) {
        logger.warn('Permission denied', { uid: session.uid, permission });
        return res.status(HTTP_STATUS.FORBIDDEN).json(
          errorResponse(ERROR_CODES.FORBIDDEN, `Missing required permission: ${permission}`)
        );
      }
      next();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Permission check failed';
      logger.error('requirePermission error', err, { uid: session.uid });
      return res.status(HTTP_STATUS.INTERNAL_ERROR).json(
        errorResponse(ERROR_CODES.INTERNAL_ERROR, 'Failed to verify permissions')
      );
    }
  };
}

// ─── requireRole ─────────────────────────────────────────────────────────────

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    const session = req.user;
    if (!session) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json(
        errorResponse(ERROR_CODES.UNAUTHORIZED, 'Not authenticated')
      );
    }
    if (!allowedRoles.includes(session.roleId)) {
      return res.status(HTTP_STATUS.FORBIDDEN).json(
        errorResponse(ERROR_CODES.FORBIDDEN, `Requires role: ${allowedRoles.join(', ')}`)
      );
    }
    next();
  };
}

module.exports = {
  requirePermission, requireRole,
  invalidatePermissionCache, resolvePermissions,
};
