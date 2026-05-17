/**
 * backend/schemas/workspace.schema.ts
 * Project: Obsidian
 *
 * Zod validation schemas for all workspace-related request bodies.
 */
import { z } from "zod";
// ─── Shared field definitions ─────────────────────────────────────────────────
const workspaceNameField = z
    .string({ required_error: "Workspace name is required." })
    .trim()
    .min(2, "Workspace name must be at least 2 characters.")
    .max(64, "Workspace name must not exceed 64 characters.")
    .regex(/^[a-zA-Z0-9\s\-_.]+$/, "Workspace name contains invalid characters.");
const industryField = z.enum([
    "technology",
    "design",
    "marketing",
    "finance",
    "healthcare",
    "education",
    "ecommerce",
    "gaming",
    "media",
    "other",
], { errorMap: () => ({ message: "Invalid industry selected." }) });
const roleIdField = z
    .string({ required_error: "Role ID is required." })
    .trim()
    .min(1, "Role ID cannot be empty.");
// ─── Create Workspace ─────────────────────────────────────────────────────────
export const CreateWorkspaceSchema = z.object({
    name: workspaceNameField,
    industry: industryField.optional(),
    teamSize: z
        .number()
        .int("Team size must be a whole number.")
        .min(1, "Team size must be at least 1.")
        .max(10000, "Team size must not exceed 10,000.")
        .optional(),
});
// ─── Update Workspace ─────────────────────────────────────────────────────────
export const UpdateWorkspaceSchema = z.object({
    name: workspaceNameField.optional(),
    avatarUrl: z
        .string()
        .url("Avatar URL must be a valid URL.")
        .max(512, "Avatar URL too long.")
        .optional()
        .nullable(),
    industry: industryField.optional(),
    settings: z
        .object({
        allowGuestAccess: z.boolean().optional(),
        requireEmailVerification: z.boolean().optional(),
        defaultRoleId: roleIdField.optional(),
        notificationsEnabled: z.boolean().optional(),
        allowMemberInvites: z.boolean().optional(),
    })
        .optional(),
}).refine((data) => Object.keys(data).length > 0, { message: "At least one field must be provided to update." });
// ─── Invite Member ────────────────────────────────────────────────────────────
export const InviteMemberSchema = z.object({
    email: z
        .string({ required_error: "Email is required." })
        .trim()
        .toLowerCase()
        .email("Please provide a valid email address.")
        .max(254, "Email must not exceed 254 characters."),
    roleId: roleIdField,
});
// ─── Bulk Invite Members ──────────────────────────────────────────────────────
export const BulkInviteMembersSchema = z.object({
    invites: z
        .array(InviteMemberSchema)
        .min(1, "At least one invite is required.")
        .max(50, "Cannot send more than 50 invites at once."),
});
// ─── Update Member Role ───────────────────────────────────────────────────────
export const UpdateMemberRoleSchema = z.object({
    roleId: roleIdField,
});
// ─── Accept Invite ────────────────────────────────────────────────────────────
export const AcceptInviteSchema = z.object({
    token: z
        .string({ required_error: "Invite token is required." })
        .trim()
        .min(16, "Invalid invite token.")
        .max(128, "Invalid invite token."),
});
// ─── Update Presence ──────────────────────────────────────────────────────────
export const UpdatePresenceSchema = z.object({
    status: z.enum(["online", "away", "busy", "offline"], {
        errorMap: () => ({ message: "Invalid presence status." }),
    }),
});
// ─── Transfer Ownership ───────────────────────────────────────────────────────
export const TransferOwnershipSchema = z.object({
    newOwnerUid: z
        .string({ required_error: "New owner UID is required." })
        .trim()
        .min(1, "New owner UID cannot be empty."),
    confirmName: z
        .string({ required_error: "Please confirm the workspace name." })
        .trim(),
});
// ─── Delete Workspace ─────────────────────────────────────────────────────────
export const DeleteWorkspaceSchema = z.object({
    confirmName: z
        .string({ required_error: "Please type the workspace name to confirm." })
        .trim()
        .min(1, "Confirmation name cannot be empty."),
});
// ─── Workspace Query Params ───────────────────────────────────────────────────
export const WorkspaceMembersQuerySchema = z.object({
    limit: z
        .string()
        .optional()
        .transform((v) => (v ? parseInt(v, 10) : 50))
        .pipe(z.number().min(1).max(100)),
    cursor: z.string().optional(),
    status: z.enum(["active", "suspended"]).optional(),
    roleId: z.string().optional(),
    search: z.string().max(64).optional(),
});
//# sourceMappingURL=workspace.schema.js.map