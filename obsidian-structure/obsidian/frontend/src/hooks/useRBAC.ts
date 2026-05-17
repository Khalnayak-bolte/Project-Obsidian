/**
 * frontend/src/hooks/useRBAC.ts
 * Project: Obsidian
 *
 * Role-Based Access Control hook.
 * Reads permissions from authStore (set by backend JWT claims) and
 * workspace roles from workspaceStore, then exposes helpers for:
 * - Checking individual permissions
 * - Checking role hierarchy
 * - Checking channel access
 * - Checking workspace ownership
 * - Guarding UI elements
 */

import { useCallback, useMemo } from "react";
import { useAuthStore, selectPermissions } from "../stores/authStore";
import { useWorkspaceStore } from "../stores/workspaceStore";
import type { Channel } from "../stores/workspaceStore";

// ─── Permission keys ───────────────────────────────────────────────────────────
// Must match backend RBAC permission names exactly

export const PERMISSIONS = {
  // Workspace
  MANAGE_WORKSPACE: "manage_workspace",
  MANAGE_BILLING: "manage_billing",

  // Roles
  MANAGE_ROLES: "manage_roles",

  // Channels
  CREATE_CHANNELS: "create_channels",
  DELETE_CHANNELS: "delete_channels",
  EDIT_CHANNELS: "edit_channels",

  // Messaging
  SEND_MESSAGES: "send_messages",
  DELETE_MESSAGES: "delete_messages",
  PIN_MESSAGES: "pin_messages",

  // Voice
  JOIN_VOICE: "join_voice",
  MUTE_MEMBERS: "mute_members",
  KICK_FROM_VOICE: "kick_from_voice",

  // Files
  UPLOAD_FILES: "upload_files",
  DELETE_FILES: "delete_files",

  // Members
  INVITE_MEMBERS: "invite_members",
  REMOVE_MEMBERS: "remove_members",
  BAN_MEMBERS: "ban_members",

  // Admin
  VIEW_AUDIT_LOGS: "view_audit_logs",
  MANAGE_INVITES: "manage_invites",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

// ─── Role hierarchy levels ────────────────────────────────────────────────────
// Higher = more privileges

const ROLE_HIERARCHY: Record<string, number> = {
  owner: 100,
  admin: 80,
  manager: 60,
  moderator: 50,
  developer: 40,
  hr: 40,
  designer: 40,
  member: 20,
  guest: 10,
};

const getRoleLevel = (roleName: string): number =>
  ROLE_HIERARCHY[roleName.toLowerCase()] ?? 20;

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useRBAC() {
  const { user, workspaceAccess } = useAuthStore();
  const permissions = useAuthStore(selectPermissions);
  const { currentWorkspace, roles, members } = useWorkspaceStore();

  // ─── Current user's role ────────────────────────────────────────────────

  const currentRole = useMemo(() => {
    if (!workspaceAccess?.roleId) return null;
    return roles.find((r) => r.roleId === workspaceAccess.roleId) ?? null;
  }, [workspaceAccess?.roleId, roles]);

  const currentRoleLevel = useMemo(
    () => (currentRole ? getRoleLevel(currentRole.name) : 0),
    [currentRole]
  );

  // ─── Is workspace owner ─────────────────────────────────────────────────

  const isOwner = useMemo(
    () =>
      !!user &&
      !!currentWorkspace &&
      currentWorkspace.ownerId === user.uid,
    [user, currentWorkspace]
  );

  // ─── Is admin or above ──────────────────────────────────────────────────

  const isAdmin = useMemo(
    () => isOwner || currentRoleLevel >= ROLE_HIERARCHY.admin,
    [isOwner, currentRoleLevel]
  );

  // ─── Check single permission ────────────────────────────────────────────

  const can = useCallback(
    (permission: Permission): boolean => {
      // Owners can do everything
      if (isOwner) return true;

      // Check JWT-injected permissions from backend
      return permissions[permission] === true;
    },
    [isOwner, permissions]
  );

  // ─── Check multiple permissions (AND) ──────────────────────────────────

  const canAll = useCallback(
    (...perms: Permission[]): boolean => perms.every((p) => can(p)),
    [can]
  );

  // ─── Check multiple permissions (OR) ───────────────────────────────────

  const canAny = useCallback(
    (...perms: Permission[]): boolean => perms.some((p) => can(p)),
    [can]
  );

  // ─── Check role level is at least X ────────────────────────────────────

  const hasRoleLevel = useCallback(
    (minLevel: number): boolean => isOwner || currentRoleLevel >= minLevel,
    [isOwner, currentRoleLevel]
  );

  // ─── Check if user outranks another member ──────────────────────────────

  const outranks = useCallback(
    (targetUid: string): boolean => {
      if (!user) return false;
      if (isOwner) return true;
      if (targetUid === user.uid) return false;

      const targetMember = members.find((m) => m.uid === targetUid);
      if (!targetMember) return false;

      // Workspace owner cannot be outranked by anyone
      if (currentWorkspace?.ownerId === targetUid) return false;

      const targetRole = roles.find((r) => r.roleId === targetMember.roleId);
      const targetLevel = targetRole ? getRoleLevel(targetRole.name) : 0;

      return currentRoleLevel > targetLevel;
    },
    [user, isOwner, currentWorkspace, members, roles, currentRoleLevel]
  );

  // ─── Check channel access ───────────────────────────────────────────────

  const canAccessChannel = useCallback(
    (channel: Channel): boolean => {
      // Admins and owners can access everything
      if (isAdmin) return true;

      // Public channels — always accessible
      if (channel.visibility === "public") return true;

      // Private channels — check if user's role is in allowedRoles
      if (!workspaceAccess?.roleId) return false;
      return channel.allowedRoles.includes(workspaceAccess.roleId);
    },
    [isAdmin, workspaceAccess?.roleId]
  );

  // ─── Check if user can manage a specific channel ────────────────────────

  const canManageChannel = useCallback(
    (channel: Channel): boolean => {
      if (isAdmin) return true;
      return can(PERMISSIONS.EDIT_CHANNELS);
    },
    [isAdmin, can]
  );

  // ─── Check if user can delete a specific message ────────────────────────

  const canDeleteMessage = useCallback(
    (messageSenderId: string): boolean => {
      if (!user) return false;

      // Can always delete own messages
      if (messageSenderId === user.uid) return true;

      // Admins / moderators can delete anyone's messages
      return can(PERMISSIONS.DELETE_MESSAGES);
    },
    [user, can]
  );

  // ─── Check if user can kick a voice participant ─────────────────────────

  const canKickFromVoice = useCallback(
    (targetUid: string): boolean => {
      if (!can(PERMISSIONS.KICK_FROM_VOICE)) return false;
      return outranks(targetUid);
    },
    [can, outranks]
  );

  // ─── Check if user can remove a workspace member ────────────────────────

  const canRemoveMember = useCallback(
    (targetUid: string): boolean => {
      if (!user || targetUid === user.uid) return false;
      if (!can(PERMISSIONS.REMOVE_MEMBERS)) return false;
      return outranks(targetUid);
    },
    [user, can, outranks]
  );

  // ─── Check if user can update a member's role ───────────────────────────

  const canUpdateMemberRole = useCallback(
    (targetUid: string, newRoleName: string): boolean => {
      if (!can(PERMISSIONS.MANAGE_ROLES)) return false;
      if (!outranks(targetUid)) return false;

      // Cannot assign a role equal to or higher than own level
      const newLevel = getRoleLevel(newRoleName);
      return newLevel < currentRoleLevel || isOwner;
    },
    [can, outranks, currentRoleLevel, isOwner]
  );

  // ─── Get role display info ──────────────────────────────────────────────

  const getRoleById = useCallback(
    (roleId: string) => roles.find((r) => r.roleId === roleId) ?? null,
    [roles]
  );

  const getRoleName = useCallback(
    (roleId: string): string => {
      const role = getRoleById(roleId);
      return role?.name ?? "Member";
    },
    [getRoleById]
  );

  const getRoleColor = useCallback(
    (roleId: string): string => {
      const role = getRoleById(roleId);
      return role?.color ?? "#6D5EF5";
    },
    [getRoleById]
  );

  // ─── Subscription tier checks ───────────────────────────────────────────

  const tier = currentWorkspace?.tier ?? "gold";

  const canAccessGuestFeatures = useMemo(
    () => tier === "deluxe",
    [tier]
  );

  const canAccessSpatialAudio = useMemo(
    () => tier === "deluxe",
    [tier]
  );

  const canAccessAdvancedRoles = useMemo(
    () => tier === "premium" || tier === "deluxe",
    [tier]
  );

  return {
    // Identity
    isOwner,
    isAdmin,
    currentRole,
    currentRoleLevel,

    // Core checks
    can,
    canAll,
    canAny,
    hasRoleLevel,
    outranks,

    // Domain-specific checks
    canAccessChannel,
    canManageChannel,
    canDeleteMessage,
    canKickFromVoice,
    canRemoveMember,
    canUpdateMemberRole,

    // Role helpers
    getRoleById,
    getRoleName,
    getRoleColor,

    // Tier checks
    canAccessGuestFeatures,
    canAccessSpatialAudio,
    canAccessAdvancedRoles,

    // Raw permissions map (for advanced use)
    permissions,

    // Constants
    PERMISSIONS,
  };
}
