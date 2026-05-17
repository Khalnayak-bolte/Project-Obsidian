import { FirestoreTimestamps } from "./common";

// ─── Login Methods ────────────────────────────────────────────────────────────

export type AuthProvider = "email" | "google" | "github" | "magic_link";

// ─── Firebase Decoded Token ───────────────────────────────────────────────────

export interface DecodedFirebaseToken {
  uid: string;
  email: string;
  email_verified: boolean;
  name?: string;
  picture?: string;
  firebase: {
    sign_in_provider: string;
    identities: Record<string, string[]>;
  };
  iat: number;
  exp: number;
}

// ─── Session ──────────────────────────────────────────────────────────────────

export interface UserSession {
  uid: string;
  email: string;
  workspaceId: string;
  roleId: string;
  permissions: Record<string, boolean>;
  provider: AuthProvider;
  deviceId?: string;
  ipAddress?: string;
  userAgent?: string;
  lastActiveAt: FirebaseFirestore.Timestamp;
}

// ─── Device Tracking ──────────────────────────────────────────────────────────

export interface DeviceSession extends FirestoreTimestamps {
  deviceId: string;
  uid: string;
  userAgent: string;
  ipAddress: string;
  lastActiveAt: FirebaseFirestore.Timestamp;
  isActive: boolean;
}

// ─── Suspicious Login ─────────────────────────────────────────────────────────

export interface LoginAttempt {
  uid: string;
  email: string;
  ipAddress: string;
  userAgent: string;
  success: boolean;
  provider: AuthProvider;
  attemptedAt: FirebaseFirestore.Timestamp;
}

// ─── Request / Response DTOs ──────────────────────────────────────────────────

export interface LoginWithEmailDto {
  email: string;
  password: string;
  deviceId?: string;
}

export interface RegisterWithEmailDto {
  email: string;
  password: string;
  displayName: string;
  workspaceName?: string;
}

export interface RefreshTokenDto {
  refreshToken: string;
  deviceId?: string;
}

export interface AuthResponseDto {
  uid: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  workspaceId: string;
  roleId: string;
  permissions: Record<string, boolean>;
  provider: AuthProvider;
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // Unix timestamp
}

export interface VerifyTokenResponseDto {
  valid: boolean;
  uid: string;
  email: string;
  workspaceId: string;
}

// ─── Password Reset ───────────────────────────────────────────────────────────

export interface RequestPasswordResetDto {
  email: string;
}

export interface ResetPasswordDto {
  oobCode: string; // Firebase out-of-band code
  newPassword: string;
}

// ─── Token Payload ────────────────────────────────────────────────────────────

export interface JwtPayload {
  uid: string;
  email: string;
  workspaceId: string;
  roleId: string;
  type: "access" | "refresh";
  iat?: number;
  exp?: number;
}
