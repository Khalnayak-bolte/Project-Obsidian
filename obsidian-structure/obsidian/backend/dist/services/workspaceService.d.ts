/**
 * backend/services/workspaceService.ts
 * Project: Obsidian
 */
import type { Workspace, WorkspaceMember } from "../types/workspace";
import type { CreateWorkspaceInput, UpdateWorkspaceInput, InviteMemberInput, BulkInviteMembersInput, AcceptInviteInput, TransferOwnershipInput, DeleteWorkspaceInput, UpdatePresenceInput } from "../schemas/workspace.schema";
export declare function createWorkspace(ownerId: string, input: CreateWorkspaceInput): Promise<Workspace>;
export declare function getWorkspace(workspaceId: string): Promise<Workspace>;
export declare function updateWorkspace(workspaceId: string, actorId: string, input: UpdateWorkspaceInput): Promise<Workspace>;
export declare function deleteWorkspace(workspaceId: string, ownerId: string, input: DeleteWorkspaceInput): Promise<void>;
export declare function inviteMember(workspaceId: string, invitedByUid: string, input: InviteMemberInput): Promise<{
    inviteToken: string;
}>;
export declare function bulkInviteMembers(workspaceId: string, invitedByUid: string, input: BulkInviteMembersInput): Promise<{
    sent: string[];
    skipped: string[];
}>;
export declare function acceptInvite(workspaceId: string, uid: string, input: AcceptInviteInput): Promise<void>;
export declare function removeMember(workspaceId: string, actorId: string, targetUid: string): Promise<void>;
export declare function updateMemberRole(workspaceId: string, actorId: string, targetUid: string, roleId: string): Promise<void>;
export declare function transferOwnership(workspaceId: string, currentOwnerId: string, input: TransferOwnershipInput): Promise<void>;
export declare function listMembers(workspaceId: string, query: {
    limit?: number;
    cursor?: string;
    roleId?: string;
    search?: string;
}): Promise<{
    members: WorkspaceMember[];
    nextCursor: string | null;
}>;
export declare function updatePresence(workspaceId: string, uid: string, input: UpdatePresenceInput): Promise<void>;
export declare function expireStaleInvites(workspaceId: string): Promise<number>;
export declare function getWorkspaceStats(workspaceId: string): Promise<{
    memberCount: number;
    storageUsedBytes: number;
    storageCapacityBytes: number;
    tier: string;
    storagePercent: number;
}>;
//# sourceMappingURL=workspaceService.d.ts.map