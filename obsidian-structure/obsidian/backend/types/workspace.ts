import { FirestoreTimestamps } from "./common";
import { SubscriptionTier } from "../config/appConfig";

// ─── Workspace ────────────────────────────────────────────────────────────────

export type WorkspaceStatus = "active" | "suspended" | "deleted";

export interface Workspace extends FirestoreTimestamps {
  workspaceId: string;
  name: string;
  slug: string;                        // URL-friendly unique identifier
  ownerId: string;
  tier: SubscriptionTier;
  subscriptionStatus: SubscriptionStatus;
  subscriptionId?: string;             // Razorpay subscription ID
  memberCount: number;
  storageUsed: number;                 // bytes
  avatarUrl?: string;
  industry?: WorkspaceIndustry;
  status: WorkspaceStatus;
  settings: WorkspaceSettings;
}

// ─── Workspace Settings ───────────────────────────────────────────────────────

export interface WorkspaceSettings {
  allowGuestAccess: boolean;
  requireEmailVerification: boolean;
  defaultRoleId: string;
  notificationsEnabled: boolean;
  allowMemberInvites: boolean;         // can non-admins invite?
}

// ─── Industry ─────────────────────────────────────────────────────────────────

export type WorkspaceIndustry =
  | "technology"
  | "design"
  | "marketing"
  | "finance"
  | "healthcare"
  | "education"
  | "ecommerce"
  | "gaming"
  | "media"
  | "other";

// ─── Subscription ─────────────────────────────────────────────────────────────

export type SubscriptionStatus =
  | "active"
  | "inactive"
  | "past_due"
  | "cancelled"
  | "paused"
  | "trialing";

export interface Subscription extends FirestoreTimestamps {
  subscriptionId: string;
  workspaceId: string;
  razorpaySubscriptionId: string;
  razorpayPlanId: string;
  tier: SubscriptionTier;
  interval: "monthly" | "yearly";
  status: SubscriptionStatus;
  currentPeriodStart: FirebaseFirestore.Timestamp;
  currentPeriodEnd: FirebaseFirestore.Timestamp;
  cancelAtPeriodEnd: boolean;
  lastPaymentAt?: FirebaseFirestore.Timestamp;
  lastPaymentAmount?: number;          // paise
}

// ─── Member ───────────────────────────────────────────────────────────────────

export type MemberStatus = "active" | "suspended" | "left";

export interface WorkspaceMember extends FirestoreTimestamps {
  uid: string;
  workspaceId: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  roleId: string;
  status: MemberStatus;
  joinedAt: FirebaseFirestore.Timestamp;
  lastSeen: FirebaseFirestore.Timestamp;
  presenceStatus: PresenceStatus;
}

// ─── Presence ─────────────────────────────────────────────────────────────────

export type PresenceStatus = "online" | "away" | "busy" | "offline";

export interface PresenceUpdate {
  uid: string;
  workspaceId: string;
  status: PresenceStatus;
  lastActiveAt: FirebaseFirestore.Timestamp;
}

// ─── Invite ───────────────────────────────────────────────────────────────────

export type InviteStatus = "pending" | "accepted" | "expired" | "revoked";

export interface WorkspaceInvite extends FirestoreTimestamps {
  inviteId: string;
  workspaceId: string;
  invitedByUid: string;
  email: string;
  roleId: string;
  status: InviteStatus;
  token: string;                        // hashed invite token
  expiresAt: FirebaseFirestore.Timestamp;
}

// ─── Request / Response DTOs ──────────────────────────────────────────────────

export interface CreateWorkspaceDto {
  name: string;
  industry?: WorkspaceIndustry;
  teamSize?: number;
}

export interface UpdateWorkspaceDto {
  name?: string;
  avatarUrl?: string;
  industry?: WorkspaceIndustry;
  settings?: Partial<WorkspaceSettings>;
}

export interface InviteMemberDto {
  email: string;
  roleId: string;
}

export interface UpdateMemberRoleDto {
  roleId: string;
}

export interface WorkspaceSummaryDto {
  workspaceId: string;
  name: string;
  slug: string;
  avatarUrl?: string;
  tier: SubscriptionTier;
  memberCount: number;
  storageUsed: number;
  subscriptionStatus: SubscriptionStatus;
  ownerId: string;
}
