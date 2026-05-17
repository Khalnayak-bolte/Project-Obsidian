/**
 * backend/repositories/userRepository.ts
 * Project: Obsidian
 *
 * All Firestore read/write operations for the users collection.
 * Covers user profiles, workspace membership, presence, and device sessions.
 * No business logic lives here — only data access.
 */
import type { WorkspaceMember, PresenceStatus, PresenceUpdate } from "../types/workspace";
import type { DeviceSession } from "../types/auth";
import type { PaginationParams, PaginationMeta } from "../types/common";
export interface UserProfile {
    uid: string;
    email: string;
    displayName: string;
    avatarUrl: string | null;
    workspaceId: string;
    roleId: string;
    status: PresenceStatus;
    lastSeen: FirebaseFirestore.Timestamp;
    createdAt: FirebaseFirestore.Timestamp;
    updatedAt: FirebaseFirestore.Timestamp;
}
export declare function getUserById(uid: string): Promise<UserProfile | null>;
export declare function getUserByEmail(email: string, workspaceId: string): Promise<UserProfile | null>;
export interface CreateUserProfileParams {
    uid: string;
    email: string;
    displayName: string;
    avatarUrl?: string | null;
    workspaceId: string;
    roleId: string;
}
export declare function createUserProfile(params: CreateUserProfileParams): Promise<UserProfile>;
export interface UpdateUserProfileParams {
    displayName?: string;
    avatarUrl?: string | null;
    roleId?: string;
    status?: PresenceStatus;
}
export declare function updateUserProfile(uid: string, params: UpdateUserProfileParams): Promise<void>;
export declare function deleteUserProfile(uid: string): Promise<void>;
export interface ListMembersParams extends PaginationParams {
    workspaceId: string;
    status?: WorkspaceMember["status"];
    roleId?: string;
}
export interface ListMembersResult {
    members: WorkspaceMember[];
    meta: PaginationMeta;
}
export declare function listWorkspaceMembers(params: ListMembersParams): Promise<ListMembersResult>;
export declare function getUsersByIds(uids: string[]): Promise<UserProfile[]>;
export declare function updatePresence(uid: string, workspaceId: string, status: PresenceStatus): Promise<void>;
export declare function getPresence(uid: string, workspaceId: string): Promise<PresenceUpdate | null>;
export declare function upsertDeviceSession(uid: string, params: Omit<DeviceSession, "createdAt" | "updatedAt">): Promise<DeviceSession>;
export declare function getDeviceSession(uid: string, deviceId: string): Promise<DeviceSession | null>;
export declare function listDeviceSessions(uid: string): Promise<DeviceSession[]>;
export declare function revokeDeviceSession(uid: string, deviceId: string): Promise<void>;
export declare function revokeAllDeviceSessions(uid: string): Promise<void>;
export declare function touchLastSeen(uid: string): Promise<void>;
export declare function countWorkspaceMembers(workspaceId: string): Promise<number>;
//# sourceMappingURL=userRepository.d.ts.map