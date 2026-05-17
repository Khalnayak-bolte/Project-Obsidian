/**
 * backend/services/authService.ts
 * Project: Obsidian
 *
 * Business logic for authentication — registration, login, session
 * management, device tracking, and suspicious login detection.
 * Delegates Firestore reads/writes to userRepository and workspaceRepository.
 */
import type { AuthProvider, AuthResponseDto, RegisterWithEmailDto } from "../types/auth";
import type { UserProfile } from "../repositories/userRepository";
export declare function verifyFirebaseToken(idToken: string): Promise<{
    uid: string;
    email: string;
    name?: string;
    picture?: string;
    provider: AuthProvider;
}>;
export declare function registerWithEmail(dto: RegisterWithEmailDto, ipAddress: string, userAgent: string): Promise<AuthResponseDto>;
export declare function handleOAuthLogin(params: {
    uid: string;
    email: string;
    displayName?: string;
    avatarUrl?: string;
    provider: AuthProvider;
    ipAddress: string;
    userAgent: string;
    deviceId?: string;
}): Promise<AuthResponseDto>;
export declare function getUserSession(uid: string): Promise<UserProfile | null>;
export declare function linkUserToWorkspace(uid: string, workspaceId: string, roleId: string): Promise<void>;
export declare function revokeDeviceSession(uid: string, deviceId: string): Promise<void>;
export declare function revokeAllSessions(uid: string): Promise<void>;
export declare function deleteAuthUser(uid: string): Promise<void>;
export declare function sendEmailVerification(email: string): Promise<void>;
export declare function sendPasswordReset(email: string): Promise<void>;
export declare function updateUserClaims(uid: string, claims: Record<string, unknown>): Promise<void>;
export declare function isEmailRegistered(email: string): Promise<boolean>;
//# sourceMappingURL=authService.d.ts.map