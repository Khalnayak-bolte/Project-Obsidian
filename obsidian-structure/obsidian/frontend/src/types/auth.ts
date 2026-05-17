/**
 * frontend/src/types/auth.ts
 * Project: Obsidian
 */

// ─── Auth providers ───────────────────────────────────────────────────────────

export type AuthProvider = "email" | "google" | "github" | "magic_link";

// ─── User ─────────────────────────────────────────────────────────────────────

export interface AuthUser {
  uid: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  emailVerified: boolean;
  provider: AuthProvider;
}

export interface UserProfile extends AuthUser {
  workspaceId: string;
  roleId: string;
  status: PresenceStatus;
  customStatus?: string;
  lastSeen?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Presence ─────────────────────────────────────────────────────────────────

export type PresenceStatus = "online" | "away" | "busy" | "offline" | "invisible";

// ─── Workspace access ─────────────────────────────────────────────────────────

export interface WorkspaceAccess {
  workspaceId: string;
  roleId: string;
  permissions: Record<string, boolean>;
}

// ─── Auth status ──────────────────────────────────────────────────────────────

export type AuthStatus =
  | "idle"
  | "loading"
  | "authenticated"
  | "unauthenticated"
  | "suspended";

// ─── Device session ───────────────────────────────────────────────────────────

export interface DeviceSession {
  deviceId: string;
  userAgent: string;
  ipAddress: string;
  lastActiveAt: string;
  isActive: boolean;
  revokedAt?: string;
}

// ─── Auth DTOs ────────────────────────────────────────────────────────────────

export interface RegisterPayload {
  email: string;
  password: string;
  displayName: string;
  workspaceName: string;
  industryType?: string;
  teamSize?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
  deviceId?: string;
  rememberMe?: boolean;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface ForgotPasswordPayload {
  email: string;
}

export interface ResetPasswordPayload {
  token: string;
  newPassword: string;
  confirmPassword: string;
}

// ─── Auth responses ───────────────────────────────────────────────────────────

export interface AuthResponse {
  user: AuthUser;
  workspaceAccess: WorkspaceAccess;
  idToken: string;
}

export interface TokenRefreshResponse {
  idToken: string;
  expiresAt: string;
}
