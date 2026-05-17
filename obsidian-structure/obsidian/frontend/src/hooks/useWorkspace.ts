import { useCallback } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useWorkspaceStore, type Workspace, type Channel } from "../stores/workspaceStore";
import { useAuthStore, selectWorkspaceId } from "../stores/authStore";
import { useUIStore } from "../stores/uiStore";
import { apiGet, apiPost, apiPatch, apiDelete } from "../lib/axios";
import { queryClient, queryKeys, invalidateWorkspace, invalidateChannels } from "../lib/queryClient";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CreateChannelPayload {
  name: string;
  type: "text" | "voice" | "announcement";
  visibility: "public" | "private";
  description?: string;
  allowedRoles?: string[];
}

interface UpdateChannelPayload {
  name?: string;
  description?: string;
  visibility?: "public" | "private";
  allowedRoles?: string[];
  position?: number;
}

interface UpdateWorkspacePayload {
  name?: string;
  avatarUrl?: string;
  industry?: string;
  settings?: Partial<Workspace["settings"]>;
}

interface InviteMemberPayload {
  email: string;
  roleId: string;
}

interface UpdateMemberRolePayload {
  roleId: string;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export const useWorkspace = () => {
  const workspaceId = useAuthStore(selectWorkspaceId);
  const currentWorkspace = useWorkspaceStore((s) => s.currentWorkspace);
  const channels = useWorkspaceStore((s) => s.channels);
  const members = useWorkspaceStore((s) => s.members);
  const roles = useWorkspaceStore((s) => s.roles);
  const activeChannelId = useWorkspaceStore((s) => s.activeChannelId);
  const isLoadingWorkspace = useWorkspaceStore((s) => s.isLoadingWorkspace);
  const isLoadingChannels = useWorkspaceStore((s) => s.isLoadingChannels);
  const isLoadingMembers = useWorkspaceStore((s) => s.isLoadingMembers);
  const setActiveChannelId = useWorkspaceStore((s) => s.setActiveChannelId);
  const openModal = useUIStore((s) => s.openModal);
  const closeModal = useUIStore((s) => s.closeModal);

  // ── Workspace list (user's workspaces) ────────────────────────────────────

  const { data: workspaces = [], isLoading: isLoadingWorkspaces } = useQuery({
    queryKey: queryKeys.workspaces.all(),
    queryFn: () => apiGet<Workspace[]>("/api/v1/workspaces"),
    enabled: !!workspaceId,
    staleTime: 5 * 60 * 1000,
  });

  // ── Update workspace ──────────────────────────────────────────────────────

  const updateWorkspaceMutation = useMutation({
    mutationFn: (payload: UpdateWorkspacePayload) =>
      apiPatch<Workspace>(`/api/v1/workspaces/${workspaceId}`, payload),
    onSuccess: () => {
      if (workspaceId) void invalidateWorkspace(workspaceId);
    },
    onError: (error) => {
      console.error("[useWorkspace] Update workspace failed:", error);
    },
  });

  // ── Create channel ────────────────────────────────────────────────────────

  const createChannelMutation = useMutation({
    mutationFn: (payload: CreateChannelPayload) =>
      apiPost<Channel>(`/api/v1/channels`, {
        ...payload,
        workspaceId,
      }),
    onSuccess: (channel) => {
      if (workspaceId) void invalidateChannels(workspaceId);
      setActiveChannelId(channel.channelId);
      closeModal();
    },
    onError: (error) => {
      console.error("[useWorkspace] Create channel failed:", error);
    },
  });

  // ── Update channel ────────────────────────────────────────────────────────

  const updateChannelMutation = useMutation({
    mutationFn: ({
      channelId,
      payload,
    }: {
      channelId: string;
      payload: UpdateChannelPayload;
    }) => apiPatch<Channel>(`/api/v1/channels/${channelId}`, payload),
    onSuccess: () => {
      if (workspaceId) void invalidateChannels(workspaceId);
      closeModal();
    },
    onError: (error) => {
      console.error("[useWorkspace] Update channel failed:", error);
    },
  });

  // ── Delete channel ────────────────────────────────────────────────────────

  const deleteChannelMutation = useMutation({
    mutationFn: (channelId: string) =>
      apiDelete(`/api/v1/channels/${channelId}`),
    onSuccess: (_, channelId) => {
      if (workspaceId) void invalidateChannels(workspaceId);
      if (activeChannelId === channelId) setActiveChannelId(null);
      closeModal();
    },
    onError: (error) => {
      console.error("[useWorkspace] Delete channel failed:", error);
    },
  });

  // ── Invite member ─────────────────────────────────────────────────────────

  const inviteMemberMutation = useMutation({
    mutationFn: (payload: InviteMemberPayload) =>
      apiPost(`/api/v1/workspaces/${workspaceId}/invite`, payload),
    onSuccess: () => {
      if (workspaceId) {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.workspaces.invites(workspaceId),
        });
      }
      closeModal();
    },
    onError: (error) => {
      console.error("[useWorkspace] Invite member failed:", error);
    },
  });

  // ── Update member role ────────────────────────────────────────────────────

  const updateMemberRoleMutation = useMutation({
    mutationFn: ({
      uid,
      payload,
    }: {
      uid: string;
      payload: UpdateMemberRolePayload;
    }) =>
      apiPatch(`/api/v1/workspaces/${workspaceId}/members/${uid}/role`, payload),
    onSuccess: () => {
      if (workspaceId) {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.workspaces.members(workspaceId),
        });
      }
      closeModal();
    },
    onError: (error) => {
      console.error("[useWorkspace] Update member role failed:", error);
    },
  });

  // ── Remove member ─────────────────────────────────────────────────────────

  const removeMemberMutation = useMutation({
    mutationFn: (uid: string) =>
      apiDelete(`/api/v1/workspaces/${workspaceId}/members/${uid}`),
    onSuccess: () => {
      if (workspaceId) {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.workspaces.members(workspaceId),
        });
      }
      closeModal();
    },
    onError: (error) => {
      console.error("[useWorkspace] Remove member failed:", error);
    },
  });

  // ── Navigation helpers ────────────────────────────────────────────────────

  const navigateToChannel = useCallback(
    (channelId: string) => {
      setActiveChannelId(channelId);
    },
    [setActiveChannelId]
  );

  const openCreateChannelModal = useCallback(() => {
    openModal("create-channel", { workspaceId: workspaceId ?? undefined });
  }, [openModal, workspaceId]);

  const openInviteMemberModal = useCallback(() => {
    openModal("invite-member", { workspaceId: workspaceId ?? undefined });
  }, [openModal, workspaceId]);

  return {
    // State
    currentWorkspace,
    workspaces,
    channels,
    members,
    roles,
    activeChannelId,

    // Loading
    isLoadingWorkspace,
    isLoadingChannels,
    isLoadingMembers,
    isLoadingWorkspaces,

    // Workspace mutations
    updateWorkspace: updateWorkspaceMutation.mutateAsync,
    isUpdatingWorkspace: updateWorkspaceMutation.isPending,

    // Channel mutations
    createChannel: createChannelMutation.mutateAsync,
    isCreatingChannel: createChannelMutation.isPending,
    updateChannel: updateChannelMutation.mutateAsync,
    isUpdatingChannel: updateChannelMutation.isPending,
    deleteChannel: deleteChannelMutation.mutateAsync,
    isDeletingChannel: deleteChannelMutation.isPending,

    // Member mutations
    inviteMember: inviteMemberMutation.mutateAsync,
    isInvitingMember: inviteMemberMutation.isPending,
    updateMemberRole: updateMemberRoleMutation.mutateAsync,
    isUpdatingMemberRole: updateMemberRoleMutation.isPending,
    removeMember: removeMemberMutation.mutateAsync,
    isRemovingMember: removeMemberMutation.isPending,

    // Navigation
    navigateToChannel,
    openCreateChannelModal,
    openInviteMemberModal,
  };
};
