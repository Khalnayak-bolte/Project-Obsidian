/**
 * backend/services/authService.ts
 * Project: Obsidian
 *
 * Business logic for authentication — registration, login, session
 * management, device tracking, and suspicious login detection.
 * Delegates Firestore reads/writes to userRepository and workspaceRepository.
 */

import { auth } from "../config/firebase";
import { createLogger } from "../utils/logger";
import {
  generateSecureToken,
  hashToken,
  sanitizeDisplayName,
  isValidEmail,
} from "../utils/helpers";
import {
  getUserById,
  getUserByEmail,
  createUserProfile,
  updateUserProfile,
  upsertDeviceSession,
  getDeviceSession,
  revokeDeviceSession,
  revokeAllDeviceSessions,
  logLoginAttempt,
} from "../repositories/userRepository";
import {
  getWorkspaceById,
  createWorkspace,
} from "../repositories/workspaceRepository";
import { seedDefaultChannels } from "../repositories/channelRepository";
import { createLogger as makeLogger } from "../utils/logger";
import type {
  AuthProvider,
  AuthResponseDto,
  LoginWithEmailDto,
  RegisterWithEmailDto,
  JwtPayload,
} from "../types/auth";
import type { UserProfile } from "../repositories/userRepository";
import { Timestamp } from "../config/firebase";
import appConfig from "../config/appConfig";

const logger = createLogger("authService");

// ─── Verify Firebase ID token ─────────────────────────────────────────────────

export async function verifyFirebaseToken(idToken: string): Promise<{
  uid: string;
  email: string;
  name?: string;
  picture?: string;
  provider: AuthProvider;
}> {
  try {
    const decoded = await auth.verifyIdToken(idToken, true); // checkRevoked = true

    const provider = decoded.firebase.sign_in_provider as AuthProvider;

    return {
      uid: decoded.uid,
      email: decoded.email ?? "",
      name: decoded.name,
      picture: decoded.picture,
      provider,
    };
  } catch (err: any) {
    logger.warn("Firebase token verification failed", { error: err.message });
    throw err;
  }
}

// ─── Register with email ──────────────────────────────────────────────────────

export async function registerWithEmail(
  dto: RegisterWithEmailDto,
  ipAddress: string,
  userAgent: string
): Promise<AuthResponseDto> {
  const { email, password, displayName, workspaceName } = dto;

  if (!isValidEmail(email)) {
    throw Object.assign(new Error("Invalid email address."), { code: "INVALID_INPUT" });
  }

  // Create Firebase Auth user
  let firebaseUser: { uid: string };
  try {
    firebaseUser = await auth.createUser({
      email,
      password,
      displayName: sanitizeDisplayName(displayName),
      emailVerified: false,
    });
  } catch (err: any) {
    if (err.code === "auth/email-already-exists") {
      throw Object.assign(new Error("An account with this email already exists."), {
        code: "ALREADY_EXISTS",
      });
    }
    throw err;
  }

  const { uid } = firebaseUser;

  // Create workspace if name provided
  let workspaceId = "";
  let roleId = "role_owner";

  if (workspaceName) {
    const workspace = await createWorkspace({
      name: workspaceName,
      ownerId: uid,
    });
    workspaceId = workspace.workspaceId;

    // Seed default channels
    await seedDefaultChannels(workspaceId, uid);
  }

  // Create Firestore user profile
  const profile = await createUserProfile({
    uid,
    email,
    displayName: sanitizeDisplayName(displayName),
    workspaceId,
    roleId,
  });

  // Set custom claims on Firebase token
  await auth.setCustomUserClaims(uid, {
    workspaceId,
    roleId,
  });

  // Log device session
  const deviceId = generateSecureToken(16);
  await upsertDeviceSession({
    deviceId,
    uid,
    userAgent,
    ipAddress,
    lastActiveAt: Timestamp.now(),
    isActive: true,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });

  // Log successful registration
  await logLoginAttempt({
    uid,
    email,
    ipAddress,
    userAgent,
    success: true,
    provider: "email",
    attemptedAt: Timestamp.now(),
  });

  logger.info("User registered", { uid, email, workspaceId });

  // Generate a custom Firebase token so client can sign in immediately
  const customToken = await auth.createCustomToken(uid, { workspaceId, roleId });

  return buildAuthResponse(profile, customToken, deviceId);
}

// ─── Handle post-OAuth login ──────────────────────────────────────────────────
// Called after client authenticates via Google/GitHub OAuth on Firebase.
// We receive the verified Firebase ID token and sync the user profile.

export async function handleOAuthLogin(params: {
  uid: string;
  email: string;
  displayName?: string;
  avatarUrl?: string;
  provider: AuthProvider;
  ipAddress: string;
  userAgent: string;
  deviceId?: string;
}): Promise<AuthResponseDto> {
  const { uid, email, displayName, avatarUrl, provider, ipAddress, userAgent } = params;

  let profile = await getUserById(uid);

  if (!profile) {
    // First OAuth login — create profile (workspace created separately via onboarding)
    profile = await createUserProfile({
      uid,
      email,
      displayName: sanitizeDisplayName(displayName ?? email.split("@")[0]),
      avatarUrl: avatarUrl ?? null,
      workspaceId: "",
      roleId: "role_member",
    });

    logger.info("New OAuth user profile created", { uid, provider });
  } else {
    // Sync display name / avatar from OAuth provider
    await updateUserProfile(uid, {
      ...(displayName && { displayName: sanitizeDisplayName(displayName) }),
      ...(avatarUrl && { avatarUrl }),
    });
    profile = { ...profile, displayName: displayName ?? profile.displayName };
  }

  // Upsert device session
  const deviceId = params.deviceId ?? generateSecureToken(16);
  await upsertDeviceSession({
    deviceId,
    uid,
    userAgent,
    ipAddress,
    lastActiveAt: Timestamp.now(),
    isActive: true,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });

  // Log attempt
  await logLoginAttempt({
    uid,
    email,
    ipAddress,
    userAgent,
    success: true,
    provider,
    attemptedAt: Timestamp.now(),
  });

  logger.info("OAuth login handled", { uid, provider });

  const customToken = await auth.createCustomToken(uid, {
    workspaceId: profile.workspaceId,
    roleId: profile.roleId,
  });

  return buildAuthResponse(profile, customToken, deviceId);
}

// ─── Get user session from token ──────────────────────────────────────────────

export async function getUserSession(uid: string): Promise<UserProfile | null> {
  return getUserById(uid);
}

// ─── Link user to workspace ───────────────────────────────────────────────────

export async function linkUserToWorkspace(
  uid: string,
  workspaceId: string,
  roleId: string
): Promise<void> {
  const workspace = await getWorkspaceById(workspaceId);
  if (!workspace) {
    throw Object.assign(new Error("Workspace not found."), { code: "NOT_FOUND" });
  }

  await updateUserProfile(uid, { workspaceId, roleId });

  // Update Firebase custom claims
  await auth.setCustomUserClaims(uid, { workspaceId, roleId });

  logger.info("User linked to workspace", { uid, workspaceId, roleId });
}

// ─── Revoke device session ────────────────────────────────────────────────────

export async function revokeDeviceSession(
  uid: string,
  deviceId: string
): Promise<void> {
  await revokeDeviceSession(uid, deviceId);
  logger.info("Device session revoked", { uid, deviceId });
}

// ─── Revoke all sessions (logout everywhere) ──────────────────────────────────

export async function revokeAllSessions(uid: string): Promise<void> {
  await Promise.all([
    auth.revokeRefreshTokens(uid),
    revokeAllDeviceSessions(uid),
  ]);
  logger.info("All sessions revoked", { uid });
}

// ─── Delete Firebase Auth user ────────────────────────────────────────────────

export async function deleteAuthUser(uid: string): Promise<void> {
  await auth.deleteUser(uid);
  logger.info("Firebase auth user deleted", { uid });
}

// ─── Send email verification ──────────────────────────────────────────────────

export async function sendEmailVerification(email: string): Promise<void> {
  try {
    const link = await auth.generateEmailVerificationLink(email);
    // Email delivery handled by notificationService via SES
    logger.info("Email verification link generated", { email });
    // TODO: pass link to notificationService.sendVerificationEmail(email, link)
  } catch (err) {
    logger.error("sendEmailVerification failed", err);
    throw err;
  }
}

// ─── Send password reset ──────────────────────────────────────────────────────

export async function sendPasswordReset(email: string): Promise<void> {
  try {
    const link = await auth.generatePasswordResetLink(email);
    logger.info("Password reset link generated", { email });
    // TODO: pass link to notificationService.sendPasswordResetEmail(email, link)
  } catch (err: any) {
    // Don't leak whether email exists — silently succeed
    if (err.code === "auth/user-not-found") {
      logger.warn("Password reset requested for unknown email", { email });
      return;
    }
    throw err;
  }
}

// ─── Update Firebase custom claims ───────────────────────────────────────────

export async function updateUserClaims(
  uid: string,
  claims: Record<string, unknown>
): Promise<void> {
  await auth.setCustomUserClaims(uid, claims);
  logger.info("Custom claims updated", { uid, claims });
}

// ─── Check if email is already registered ────────────────────────────────────

export async function isEmailRegistered(email: string): Promise<boolean> {
  try {
    await auth.getUserByEmail(email);
    return true;
  } catch {
    return false;
  }
}

// ─── Build auth response DTO ──────────────────────────────────────────────────

function buildAuthResponse(
  profile: UserProfile,
  token: string,
  deviceId: string
): AuthResponseDto {
  return {
    uid: profile.uid,
    email: profile.email,
    displayName: profile.displayName,
    avatarUrl: profile.avatarUrl ?? null,
    workspaceId: profile.workspaceId,
    roleId: profile.roleId,
    permissions: {},                  // populated by RBAC middleware on subsequent requests
    provider: "email",
    accessToken: token,
    refreshToken: deviceId,           // deviceId acts as refresh session identifier
    expiresIn: appConfig.jwt.expiresIn,
  };
}
