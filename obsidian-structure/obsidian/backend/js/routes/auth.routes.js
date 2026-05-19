'use strict';
// js/routes/auth.routes.js

const { Router }   = require('express');
const { RATE_LIMITS } = require('../middleware/rateLimitMiddleware');
const { authenticate } = require('../middleware/authMiddleware');
const {
  register, oauthLogin, logout, requestPasswordReset,
  getMe, updateProfile, verifyToken,
  listSessions, revokeSession, checkEmail,
} = require('../controllers/authController');

const authRouter = Router();

// ── Public ────────────────────────────────────────────────────────────────────
authRouter.post('/register',        RATE_LIMITS.REGISTER,        register);
authRouter.post('/login/oauth',     RATE_LIMITS.LOGIN,           oauthLogin);
authRouter.post('/verify-token',    RATE_LIMITS.LOGIN,           verifyToken);
authRouter.post('/password/reset',  RATE_LIMITS.PASSWORD_RESET,  requestPasswordReset);
authRouter.get ('/check-email',                                   checkEmail);

// ── Protected ─────────────────────────────────────────────────────────────────
authRouter.post  ('/logout',               authenticate, logout);
authRouter.get   ('/me',                   authenticate, getMe);
authRouter.patch ('/me',                   authenticate, updateProfile);
authRouter.get   ('/sessions',             authenticate, listSessions);
authRouter.delete('/sessions/:deviceId',   authenticate, revokeSession);

module.exports = { authRouter };
