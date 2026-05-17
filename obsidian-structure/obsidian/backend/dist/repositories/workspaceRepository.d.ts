/**
 * backend/repositories/workspaceRepository.ts
 * Project: Obsidian
 *
 * All Firestore read/write operations for the workspaces collection.
 * Covers workspace lifecycle, invite management, storage tracking,
 * and subscription status updates.
 * No business logic lives here — only data access.
 */
import type { Workspace, WorkspaceSettings, WorkspaceIndustry, WorkspaceStatus, WorkspaceInvite, InviteStatus, SubscriptionStatus } from "../types/workspace";
import type { SubscriptionTier } from "../config/appConfig";
export declare function getWorkspaceById(workspaceId: string): Promise<Workspace | null>;
export declare function getWorkspaceBySlug(slug: string): Promise<Workspace | null>;
export declare function getWorkspacesByOwner(ownerId: string): Promise<Workspace[]>;
export declare function isSlugAvailable(slug: string): Promise<boolean>;
export declare function generateAvailableSlug(name: string): Promise<string>;
export interface CreateWorkspaceParams {
    name: string;
    ownerId: string;
    industry?: WorkspaceIndustry;
    avatarUrl?: string;
    tier?: SubscriptionTier;
}
export declare function createWorkspace(params: CreateWorkspaceParams): Promise<Workspace>;
export interface UpdateWorkspaceParams {
    name?: string;
    avatarUrl?: string | null;
    industry?: WorkspaceIndustry;
    settings?: Partial<WorkspaceSettings>;
    status?: WorkspaceStatus;
    ownerId?: string;
}
export declare function updateWorkspace(workspaceId: string, params: UpdateWorkspaceParams): Promise<void>;
export declare function softDeleteWorkspace(workspaceId: string): Promise<void>;
export declare function updateWorkspaceTier(workspaceId: string, tier: SubscriptionTier, subscriptionStatus: SubscriptionStatus, subscriptionId?: string): Promise<void>;
export declare function updateSubscriptionStatus(workspaceId: string, subscriptionStatus: SubscriptionStatus): Promise<void>;
export declare function incrementMemberCount(workspaceId: string, delta: 1 | -1): Promise<void>;
export declare function incrementStorageUsed(workspaceId: string, bytes: number): Promise<void>;
export interface CreateInviteParams {
    workspaceId: string;
    invitedByUid: string;
    email: string;
    roleId: string;
    hashedToken: string;
    expiresAt: FirebaseFirestore.Timestamp;
}
export declare function createInvite(params: CreateInviteParams): Promise<WorkspaceInvite>;
export declare function getInviteByToken(workspaceId: string, hashedToken: string): Promise<WorkspaceInvite | null>;
export declare function getInviteByEmail(workspaceId: string, email: string): Promise<WorkspaceInvite | null>;
export declare function updateInviteStatus(workspaceId: string, inviteId: string, status: InviteStatus): Promise<void>;
export declare function listPendingInvites(workspaceId: string): Promise<WorkspaceInvite[]>;
export declare function expireStaleInvites(workspaceId: string): Promise<number>;
//# sourceMappingURL=workspaceRepository.d.ts.map