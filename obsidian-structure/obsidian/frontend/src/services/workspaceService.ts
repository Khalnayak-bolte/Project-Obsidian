/**
 * frontend/src/services/workspaceService.ts
 * Project: Obsidian
 *
 * All workspace-related API calls:
 * workspace CRUD, member management, channel operations,
 * invites, roles, and presence updates.
 * Never touches Zustand — returns data, callers update stores.
 */

import { apiGet, apiPost, apiPatch, apiPut, apiDelete } from "../lib/axios";
import type {
  Workspace,
  WorkspaceMember,
  Channel,
  Role,
  PresenceStatus,
} from "../stores/workspaceStore";

// ─── Response types ───────────────────────────────────────────────────────────

export interface WorkspaceBootstrapResponse {
  workspace: Workspace;
  channels: Channel[];
  members: WorkspaceMember[];
  roles: Role[];
  presenceMap: Record<string, PresenceStatus>;
}

export interface InviteResponse {
  inviteId: string;
  email: string;
  roleId: string;
  expiresAt: string;
  token: string;
}

export interface CreateChannelPayload {
  name: string;
  type: "text" | "voice" | "announcement";
  visibility: "public" | "private";
  description?: string;
  allowedRoles?: string[];
}

export interface UpdateChannelPayload {
  name?: string;
  description?: string;
  visibility?: "public" | "private";
  allowedRoles?: string[];
  position?: number;
  isArchived?: boolean;
}

export interface CreateWorkspacePayload {
  name: string;
  industry?: string;
  teamSize?: number;
}

export interface UpdateWorkspacePayload {
  name?: string;
  avatarUrl?: string | null;
  industry?: string;
  settings?: Partial<Workspace["settings"]>;
}

// ─── Workspace ────────────────────────────────────────────────────────────────

export async function fetchWorkspaceBootstrap(
  workspaceId: string
): Promise<WorkspaceBootstrapResponse> {
  try {
    return await apiGet<WorkspaceBootstrapResponse>(
      `/api/v1/workspaces/${workspaceId}/bootstrap`
    );
  } catch (err) {
    console.error("[workspaceService] fetchWorkspaceBootstrap failed:", err);
    throw err;
  }
}

export async function fetchMyWorkspaces(): Promise<Workspace[]> {
  try {
    const data = await apiGet<{ workspaces: Workspace[] }>(
      "/api/v1/workspaces"
    );
    return data.workspaces;
  } catch (err) {
    console.error("[workspaceService] fetchMyWorkspaces failed:", err);
    throw err;
  }
}

export async function createWorkspace(
  payload: CreateWorkspacePayload
): Promise<Workspace> {
  try {
    const data = await apiPost<{ workspace: Workspace }>(
      "/api/v1/workspaces",
      payload
    );
    return data.workspace;
  } catch (err) {
    console.error("[workspaceService] createWorkspace failed:", err);
    throw err;
  }
}

export async function updateWorkspace(
  workspaceId: string,
  payload: UpdateWorkspacePayload
): Promise<Workspace> {
  try {
    const data = await apiPatch<{ workspace: Workspace }>(
      `/api/v1/workspaces/${workspaceId}`,
      payload
    );
    return data.workspace;
  } catch (err) {
    console.error("[workspaceService] updateWorkspace failed:", err);
    throw err;
  }
}

export async function deleteWorkspace(
  workspaceId: string,
  confirmName: string
): Promise<void> {
  try {
    await apiDelete(`/api/v1/workspaces/${workspaceId}`, {
      data: { confirmName },
    });
  } catch (err) {
    console.error("[workspaceService] deleteWorkspace failed:", err);
    throw err;
  }
}

export async function transferOwnership(
  workspaceId: string,
  newOwnerUid: string,
  confirmName: string
): Promise<void> {
  try {
    await apiPost(`/api/v1/workspaces/${workspaceId}/transfer-ownership`, {
      newOwnerUid,
      confirmName,
    });
  } catch (err) {
    console.error("[workspaceService] transferOwnership failed:", err);
    throw err;
  }
}

// ─── Members ──────────────────────────────────────────────────────────────────

export async function fetchMembers(
  workspaceId: string,
  params?: { limit?: number; cursor?: string; search?: string; roleId?: string }
): Promise<{ members: WorkspaceMember[]; hasMore: boolean; nextCursor?: string }> {
  try {
    return await apiGet(`/api/v1/workspaces/${workspaceId}/members`, {
      params,
    });
  } catch (err) {
    console.error("[workspaceService] fetchMembers failed:", err);
    throw err;
  }
}

export async function updateMemberRole(
  workspaceId: string,
  uid: string,
  roleId: string
): Promise<WorkspaceMember> {
  try {
    const data = await apiPatch<{ member: WorkspaceMember }>(
      `/api/v1/workspaces/${workspaceId}/members/${uid}/role`,
      { roleId }
    );
    return data.member;
  } catch (err) {
    console.error("[workspaceService] updateMemberRole failed:", err);
    throw err;
  }
}

export async function removeMember(
  workspaceId: string,
  uid: string
): Promise<void> {
  try {
    await apiDelete(`/api/v1/workspaces/${workspaceId}/members/${uid}`);
  } catch (err) {
    console.error("[workspaceService] removeMember failed:", err);
    throw err;
  }
}

export async function banMember(
  workspaceId: string,
  uid: string,
  reason?: string
): Promise<void> {
  try {
    await apiPost(`/api/v1/workspaces/${workspaceId}/members/${uid}/ban`, {
      reason,
    });
  } catch (err) {
    console.error("[workspaceService] banMember failed:", err);
    throw err;
  }
}

// ─── Invites ──────────────────────────────────────────────────────────────────

export async function inviteMember(
  workspaceId: string,
  email: string,
  roleId: string
): Promise<InviteResponse> {
  try {
    const data = await apiPost<{ invite: InviteResponse }>(
      `/api/v1/workspaces/${workspaceId}/invites`,
      { email, roleId }
    );
    return data.invite;
  } catch (err) {
    console.error("[workspaceService] inviteMember failed:", err);
    throw err;
  }
}

export async function bulkInviteMembers(
  workspaceId: string,
  invites: { email: string; roleId: string }[]
): Promise<{ sent: number; failed: string[] }> {
  try {
    return await apiPost(
      `/api/v1/workspaces/${workspaceId}/invites/bulk`,
      { invites }
    );
  } catch (err) {
    console.error("[workspaceService] bulkInviteMembers failed:", err);
    throw err;
  }
}

export async function revokeInvite(
  workspaceId: string,
  inviteId: string
): Promise<void> {
  try {
    await apiDelete(`/api/v1/workspaces/${workspaceId}/invites/${inviteId}`);
  } catch (err) {
    console.error("[workspaceService] revokeInvite failed:", err);
    throw err;
  }
}

export async function acceptInvite(token: string): Promise<{
  workspaceId: string;
  workspaceName: string;
}> {
  try {
    return await apiPost("/api/v1/workspaces/invites/accept", { token });
  } catch (err) {
    console.error("[workspaceService] acceptInvite failed:", err);
    throw err;
  }
}

export async function fetchPendingInvites(
  workspaceId: string
): Promise<InviteResponse[]> {
  try {
    const data = await apiGet<{ invites: InviteResponse[] }>(
      `/api/v1/workspaces/${workspaceId}/invites`
    );
    return data.invites;
  } catch (err) {
    console.error("[workspaceService] fetchPendingInvites failed:", err);
    throw err;
  }
}

// ─── Channels ─────────────────────────────────────────────────────────────────

export async function fetchChannels(workspaceId: string): Promise<Channel[]> {
  try {
    const data = await apiGet<{ channels: Channel[] }>(
      `/api/v1/channels?workspaceId=${workspaceId}`
    );
    return data.channels;
  } catch (err) {
    console.error("[workspaceService] fetchChannels failed:", err);
    throw err;
  }
}

export async function createChannel(
  workspaceId: string,
  payload: CreateChannelPayload
): Promise<Channel> {
  try {
    const data = await apiPost<{ channel: Channel }>(
      "/api/v1/channels",
      { ...payload, workspaceId }
    );
    return data.channel;
  } catch (err) {
    console.error("[workspaceService] createChannel failed:", err);
    throw err;
  }
}

export async function updateChannel(
  channelId: string,
  payload: UpdateChannelPayload
): Promise<Channel> {
  try {
    const data = await apiPatch<{ channel: Channel }>(
      `/api/v1/channels/${channelId}`,
      payload
    );
    return data.channel;
  } catch (err) {
    console.error("[workspaceService] updateChannel failed:", err);
    throw err;
  }
}

export async function deleteChannel(channelId: string): Promise<void> {
  try {
    await apiDelete(`/api/v1/channels/${channelId}`);
  } catch (err) {
    console.error("[workspaceService] deleteChannel failed:", err);
    throw err;
  }
}

export async function reorderChannels(
  updates: { channelId: string; position: number }[]
): Promise<void> {
  try {
    await apiPut("/api/v1/channels/reorder", { updates });
  } catch (err) {
    console.error("[workspaceService] reorderChannels failed:", err);
    throw err;
  }
}

export async function markChannelRead(channelId: string): Promise<void> {
  try {
    await apiPost(`/api/v1/channels/${channelId}/read`);
  } catch (err) {
    console.error("[workspaceService] markChannelRead failed:", err);
    throw err;
  }
}

// ─── Roles ────────────────────────────────────────────────────────────────────

export async function fetchRoles(workspaceId: string): Promise<Role[]> {
  try {
    const data = await apiGet<{ roles: Role[] }>(
      `/api/v1/workspaces/${workspaceId}/roles`
    );
    return data.roles;
  } catch (err) {
    console.error("[workspaceService] fetchRoles failed:", err);
    throw err;
  }
}

export async function createRole(
  workspaceId: string,
  payload: {
    name: string;
    color?: string;
    permissions: Record<string, boolean>;
    position?: number;
  }
): Promise<Role> {
  try {
    const data = await apiPost<{ role: Role }>(
      `/api/v1/workspaces/${workspaceId}/roles`,
      payload
    );
    return data.role;
  } catch (err) {
    console.error("[workspaceService] createRole failed:", err);
    throw err;
  }
}

export async function updateRole(
  workspaceId: string,
  roleId: string,
  payload: {
    name?: string;
    color?: string;
    permissions?: Record<string, boolean>;
    position?: number;
  }
): Promise<Role> {
  try {
    const data = await apiPatch<{ role: Role }>(
      `/api/v1/workspaces/${workspaceId}/roles/${roleId}`,
      payload
    );
    return data.role;
  } catch (err) {
    console.error("[workspaceService] updateRole failed:", err);
    throw err;
  }
}

export async function deleteRole(
  workspaceId: string,
  roleId: string
): Promise<void> {
  try {
    await apiDelete(`/api/v1/workspaces/${workspaceId}/roles/${roleId}`);
  } catch (err) {
    console.error("[workspaceService] deleteRole failed:", err);
    throw err;
  }
}

// ─── Presence ─────────────────────────────────────────────────────────────────

export async function updatePresence(status: PresenceStatus): Promise<void> {
  try {
    await apiPatch("/api/v1/workspaces/presence", { status });
  } catch (err) {
    console.error("[workspaceService] updatePresence failed:", err);
    throw err;
  }
}

// ─── Workspace analytics ──────────────────────────────────────────────────────

export async function fetchWorkspaceInsights(workspaceId: string): Promise<{
  dailyActiveUsers: number;
  totalMessages: number;
  voiceMinutes: number;
  storageUsed: number;
  topChannels: { channelId: string; name: string; messageCount: number }[];
}> {
  try {
    return await apiGet(`/api/v1/workspaces/${workspaceId}/insights`);
  } catch (err) {
    console.error("[workspaceService] fetchWorkspaceInsights failed:", err);
    throw err;
  }
}

// ─── Leave workspace ──────────────────────────────────────────────────────────

export async function leaveWorkspace(workspaceId: string): Promise<void> {
  try {
    await apiPost(`/api/v1/workspaces/${workspaceId}/leave`);
  } catch (err) {
    console.error("[workspaceService] leaveWorkspace failed:", err);
    throw err;
  }
}
