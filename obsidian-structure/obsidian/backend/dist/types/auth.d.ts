import { FirestoreTimestamps } from "./common";
export type AuthProvider = "email" | "google" | "github" | "magic_link";
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
export interface DeviceSession extends FirestoreTimestamps {
    deviceId: string;
    uid: string;
    userAgent: string;
    ipAddress: string;
    lastActiveAt: FirebaseFirestore.Timestamp;
    isActive: boolean;
}
export interface LoginAttempt {
    uid: string;
    email: string;
    ipAddress: string;
    userAgent: string;
    success: boolean;
    provider: AuthProvider;
    attemptedAt: FirebaseFirestore.Timestamp;
}
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
    expiresAt: number;
}
export interface VerifyTokenResponseDto {
    valid: boolean;
    uid: string;
    email: string;
    workspaceId: string;
}
export interface RequestPasswordResetDto {
    email: string;
}
export interface ResetPasswordDto {
    oobCode: string;
    newPassword: string;
}
export interface JwtPayload {
    uid: string;
    email: string;
    workspaceId: string;
    roleId: string;
    type: "access" | "refresh";
    iat?: number;
    exp?: number;
}
//# sourceMappingURL=auth.d.ts.map