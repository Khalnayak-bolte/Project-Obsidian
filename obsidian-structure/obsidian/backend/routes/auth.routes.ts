/**
 * backend/routes/auth.routes.ts
 * Project: Obsidian
 *
 * Express router for all authentication endpoints.
 * Public routes use rate limiting only.
 * Protected routes additionally require a valid Firebase JWT via authenticate middleware.
 *
 *  POST   /api/v1/auth/register              → register
 *  POST   /api/v1/auth/login/oauth           → oauthLogin
 *  POST   /api/v1/auth/logout                → logout
 *  POST   /api/v1/auth/password/reset        → requestPasswordReset
 *  GET    /api/v1/auth/me                    → getMe
 *  PATCH  /api/v1/auth/me                    → updateProfile
 *  POST   /api/v1/auth/verify-token          → verifyToken
 *  GET    /api/v1/auth/sessions              → listSessions
 *  DELETE /api/v1/auth/sessions/:deviceId    → revokeSession
 *  GET    /api/v1/auth/check-email           → checkEmail
 */

import { Router } from "express";
import { authenticate } from "../middleware/authMiddleware";
import { RATE_LIMITS } from "../middleware/rateLimitMiddleware";
import {
  register,
  oauthLogin,
  logout,
  requestPasswordReset,
  getMe,
  updateProfile,
  verifyToken,
  listSessions,
  revokeSession,
  checkEmail,
} from "../controllers/authController";

export const authRouter = Router();

// ─── Public routes ────────────────────────────────────────────────────────────

// POST /api/v1/auth/register
authRouter.post("/register", RATE_LIMITS.REGISTER, register);

// POST /api/v1/auth/login/oauth
authRouter.post("/login/oauth", RATE_LIMITS.LOGIN, oauthLogin);

// POST /api/v1/auth/verify-token
authRouter.post("/verify-token", RATE_LIMITS.LOGIN, verifyToken);

// POST /api/v1/auth/password/reset
authRouter.post("/password/reset", RATE_LIMITS.PASSWORD_RESET, requestPasswordReset);

// GET /api/v1/auth/check-email
authRouter.get("/check-email", checkEmail);

// ─── Protected routes ─────────────────────────────────────────────────────────

// POST /api/v1/auth/logout
authRouter.post("/logout", authenticate, logout);

// GET /api/v1/auth/me
authRouter.get("/me", authenticate, getMe);

// PATCH /api/v1/auth/me
authRouter.patch("/me", authenticate, updateProfile);

// GET /api/v1/auth/sessions
authRouter.get("/sessions", authenticate, listSessions);

// DELETE /api/v1/auth/sessions/:deviceId
authRouter.delete("/sessions/:deviceId", authenticate, revokeSession);
