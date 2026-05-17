/**
 * backend/controllers/authController.ts
 * Project: Obsidian
 *
 * HTTP request handlers for all authentication routes.
 * Validates input via Zod schemas, delegates business logic to authService,
 * and returns consistent ApiSuccess / ApiError responses.
 *
 * Route map (wired in routes/auth.routes.ts):
 *  POST   /api/v1/auth/register          → register
 *  POST   /api/v1/auth/login/oauth       → oauthLogin
 *  POST   /api/v1/auth/logout            → logout
 *  POST   /api/v1/auth/password/reset    → requestPasswordReset
 *  GET    /api/v1/auth/me                → getMe
 *  PATCH  /api/v1/auth/me                → updateProfile
 *  POST   /api/v1/auth/verify-token      → verifyToken
 *  GET    /api/v1/auth/sessions          → listSessions
 *  DELETE /api/v1/auth/sessions/:deviceId → revokeSession
 */

import type { Request, Response, NextFunction } from "express";
import { createLogger } from "../utils/logger";
import { successResponse } from "../utils/helpers";
import { HTTP_STATUS, ERROR_CODES } from "../types/common";
import type { AuthenticatedRequest } from "../types/common";
import { AppError } from "../middleware/errorMiddleware";
import {
  RegisterWithEmailSchema,
  OAuthLoginSchema,
  LogoutSchema,
  RequestPasswordResetSchema,
  UpdateProfileSchema,
  VerifyTokenSchema,
} from "../schemas/auth.schema";
import {
  registerWithEmail,
  handleOAuthLogin,
  verifyFirebaseToken,
  getUserSession,
  revokeDeviceSession,
  revokeAllSessions,
  sendPasswordReset,
  updateUserClaims,
  isEmailRegistered,
} from "../services/authService";
import { updateUserProfile, listDeviceSessions } from "../repositories/userRepository";
import { setPresence } from "../services/presenceService";

const logger = createLogger("authController");

// ─── Helper: extract client metadata ─────────────────────────────────────────

function clientMeta(req: Request): { ipAddress: string; userAgent: string } {
  return {
    ipAddress:
      (req.headers["x-forwarded-for"] as string | undefined)
        ?.split(",")[0]
        .trim() ?? req.socket?.remoteAddress ?? "unknown",
    userAgent: req.headers["user-agent"] ?? "unknown",
  };
}

// ─── POST /api/v1/auth/register ───────────────────────────────────────────────

export async function register(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const body = RegisterWithEmailSchema.parse(req.body);
    const { ipAddress, userAgent } = clientMeta(req);

    const result = await registerWithEmail(
      {
        email: body.email,
        password: body.password,
        displayName: body.displayName,
        workspaceName: body.workspaceName,
      },
      ipAddress,
      userAgent
    );

    logger.info("Register success", { uid: result.uid });

    res.status(HTTP_STATUS.CREATED).json(
      successResponse(result, "Account created successfully.")
    );
  } catch (err) {
    next(err);
  }
}

// ─── POST /api/v1/auth/login/oauth ───────────────────────────────────────────

export async function oauthLogin(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const body = OAuthLoginSchema.parse(req.body);
    const { ipAddress, userAgent } = clientMeta(req);

    // Verify Firebase ID token
    const decoded = await verifyFirebaseToken(body.idToken);

    const result = await handleOAuthLogin({
      uid: decoded.uid,
      email: decoded.email,
      displayName: decoded.name,
      avatarUrl: decoded.picture,
      provider: body.provider,
      ipAddress,
      userAgent,
      deviceId: body.deviceId,
    });

    logger.info("OAuth login success", { uid: result.uid, provider: body.provider });

    res.status(HTTP_STATUS.OK).json(
      successResponse(result, "Logged in successfully.")
    );
  } catch (err) {
    next(err);
  }
}

// ─── POST /api/v1/auth/logout ─────────────────────────────────────────────────

export async function logout(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authedReq = req as AuthenticatedRequest;
    const uid = authedReq.user.uid;
    const workspaceId = authedReq.user.workspaceId;
    const body = LogoutSchema.parse(req.body);

    if (body.allDevices) {
      await revokeAllSessions(uid);
      logger.info("All sessions revoked", { uid });
    } else if (body.deviceId) {
      await revokeDeviceSession(uid, body.deviceId);
      logger.info("Session revoked", { uid, deviceId: body.deviceId });
    }

    // Mark user offline in workspace presence
    if (workspaceId) {
      await setPresence({ uid, workspaceId, status: "offline" }).catch((err) =>
        logger.warn("Failed to set presence on logout", { uid, err })
      );
    }

    res.status(HTTP_STATUS.OK).json(
      successResponse(null, "Logged out successfully.")
    );
  } catch (err) {
    next(err);
  }
}

// ─── POST /api/v1/auth/password/reset ────────────────────────────────────────

export async function requestPasswordReset(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { email } = RequestPasswordResetSchema.parse(req.body);

    // Always respond with 200 to prevent email enumeration
    await sendPasswordReset(email).catch((err) =>
      logger.warn("Password reset generation failed silently", { email, err })
    );

    res.status(HTTP_STATUS.OK).json(
      successResponse(
        null,
        "If an account exists for this email, a reset link has been sent."
      )
    );
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/v1/auth/me ──────────────────────────────────────────────────────

export async function getMe(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authedReq = req as AuthenticatedRequest;
    const uid = authedReq.user.uid;

    const profile = await getUserSession(uid);
    if (!profile) {
      throw new AppError(ERROR_CODES.NOT_FOUND, "User profile not found.");
    }

    res.status(HTTP_STATUS.OK).json(successResponse(profile));
  } catch (err) {
    next(err);
  }
}

// ─── PATCH /api/v1/auth/me ────────────────────────────────────────────────────

export async function updateProfile(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authedReq = req as AuthenticatedRequest;
    const uid = authedReq.user.uid;
    const workspaceId = authedReq.user.workspaceId;
    const body = UpdateProfileSchema.parse(req.body);

    await updateUserProfile(uid, {
      ...(body.displayName && { displayName: body.displayName }),
      ...(body.avatarUrl !== undefined && { avatarUrl: body.avatarUrl }),
    });

    // Sync presence status if provided
    if (body.status && workspaceId) {
      await setPresence({ uid, workspaceId, status: body.status });
    }

    const updated = await getUserSession(uid);

    logger.info("Profile updated", { uid });

    res.status(HTTP_STATUS.OK).json(
      successResponse(updated, "Profile updated successfully.")
    );
  } catch (err) {
    next(err);
  }
}

// ─── POST /api/v1/auth/verify-token ──────────────────────────────────────────

export async function verifyToken(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { token } = VerifyTokenSchema.parse(req.body);

    const decoded = await verifyFirebaseToken(token);
    const profile = await getUserSession(decoded.uid);

    if (!profile) {
      throw new AppError(ERROR_CODES.NOT_FOUND, "User profile not found.");
    }

    res.status(HTTP_STATUS.OK).json(
      successResponse({
        valid: true,
        uid: decoded.uid,
        email: decoded.email,
        workspaceId: profile.workspaceId,
      })
    );
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/v1/auth/sessions ───────────────────────────────────────────────

export async function listSessions(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authedReq = req as AuthenticatedRequest;
    const uid = authedReq.user.uid;

    const sessions = await listDeviceSessions(uid);

    res.status(HTTP_STATUS.OK).json(successResponse(sessions));
  } catch (err) {
    next(err);
  }
}

// ─── DELETE /api/v1/auth/sessions/:deviceId ───────────────────────────────────

export async function revokeSession(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authedReq = req as AuthenticatedRequest;
    const uid = authedReq.user.uid;
    const { deviceId } = req.params;

    if (!deviceId) {
      throw new AppError(ERROR_CODES.INVALID_INPUT, "Device ID is required.");
    }

    await revokeDeviceSession(uid, deviceId);

    logger.info("Session revoked via controller", { uid, deviceId });

    res.status(HTTP_STATUS.OK).json(
      successResponse(null, "Session revoked successfully.")
    );
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/v1/auth/check-email ─────────────────────────────────────────────
// Used on the registration form to check email availability in real-time.

export async function checkEmail(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const email = (req.query.email as string | undefined)?.toLowerCase().trim();

    if (!email) {
      throw new AppError(ERROR_CODES.INVALID_INPUT, "Email query param is required.");
    }

    const exists = await isEmailRegistered(email);

    res.status(HTTP_STATUS.OK).json(
      successResponse({ available: !exists })
    );
  } catch (err) {
    next(err);
  }
}
