/**
 * frontend/src/types/workspace.ts
 * Project: Obsidian
 */

// ─── Enums ────────────────────────────────────────────────────────────────────

export type SubscriptionTier = "gold" | "premium" | "deluxe";

export type SubscriptionStatus =
  | "active"
  | "inactive"
  | "past_due"
  | "cancelled"
  | "paused"
  | "trialing";

export type WorkspaceStatus = "active" | "suspended" | "deleted";

export type WorkspaceIndustry =
  | "technology"
  | "fintech"
  | "edtech"
  | "healthtech"
  | "ecommerce"
  | "saas"
  | "agency"
  | "design"
  | "marketing"
  | "finance"
  | "gaming"
  | "media"
  | "other";

export type TeamSize = "1-5" | "6-15" | "16-50" | "51-150" | "150+";

// ─── Workspace ────────────────────────────────────────────────────────────────

export interface WorkspaceSettings {
  allowGuestAccess: boolean;
  requireEmailVerification: boolean;
  defaultRoleId: string;
  notificationsEnabled: boolean;
  allowMemberInvites: boolean;
  maxFileSizeBytes?: number;
  retentionDays?: number;
  voiceRegion?: string;
}

export interface Workspace {
  workspaceId: string;
  name: string;
  slug: string;
  ownerId: string;
  tier: SubscriptionTier;
  subscriptionStatus: SubscriptionStatus;
  subscriptionId?: string;
  memberCount: number;
  storageUsed: number;
  avatarUrl?: string;
  description?: string;
  industry?: WorkspaceIndustry;
  teamSize?: TeamSize;
  status: WorkspaceStatus;
  settings: WorkspaceSettings;
  createdAt: string;
  updatedAt: string;
}

// ─── Members ──────────────────────────────────────────────────────────────────

export type PresenceStatus = "online" | "away" | "busy" | "offline" | "invisible";
export type MemberStatus = "active" | "suspended" | "left" | "banned";

export interface WorkspaceMember {
  uid: string;
  workspaceId: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  roleId: string;
  status: MemberStatus;
  presenceStatus: PresenceStatus;
  customStatus?: string;
  lastSeen: string;
  joinedAt: string;
}

// ─── Roles ────────────────────────────────────────────────────────────────────

export interface Role {
  roleId: string;
  workspaceId: string;
  name: string;
  color: string;
  permissions: Record<string, boolean>;
  isHoisted: boolean;
  isMentionable: boolean;
  position: number;
  isSystem: boolean;
  createdAt: string;
}

// ─── Invites ──────────────────────────────────────────────────────────────────

export type InviteStatus = "pending" | "accepted" | "expired" | "revoked";

export interface WorkspaceInvite {
  inviteId: string;
  workspaceId: string;
  invitedByUid: string;
  invitedByName: string;
  email: string;
  roleId: string;
  status: InviteStatus;
  expiresAt: string;
  createdAt: string;
}

// ─── DTOs ─────────────────────────────────────────────────────────────────────

export interface CreateWorkspacePayload {
  name: string;
  slug?: string;
  industryType?: WorkspaceIndustry;
  teamSize?: TeamSize;
  logoUrl?: string;
  description?: string;
  tier?: SubscriptionTier;
}

export interface UpdateWorkspacePayload {
  name?: string;
  description?: string;
  logoUrl?: string;
  settings?: Partial<WorkspaceSettings>;
}

export interface InviteMemberPayload {
  email: string;
  roleId: string;
  message?: string;
}

export interface BulkInvitePayload {
  invites: InviteMemberPayload[];
}

export interface BulkInviteResponse {
  sent: string[];
  skipped: string[];
}

export interface UpdateMemberRolePayload {
  roleId: string;
}

export interface TransferOwnershipPayload {
  newOwnerUid: string;
  confirmName: string;
}

export interface DeleteWorkspacePayload {
  confirmName: string;
}

export interface WorkspaceStats {
  memberCount: number;
  storageUsedBytes: number;
  storageCapacityBytes: number;
  tier: SubscriptionTier;
  storagePercent: number;
}

export interface MembersResponse {
  members: WorkspaceMember[];
  nextCursor: string | null;
}
