/**
 * backend/schemas/workspace.schema.ts
 * Project: Obsidian
 *
 * Zod validation schemas for all workspace-related request bodies.
 */
import { z } from "zod";
export declare const CreateWorkspaceSchema: z.ZodObject<{
    name: z.ZodString;
    industry: z.ZodOptional<z.ZodEnum<["technology", "design", "marketing", "finance", "healthcare", "education", "ecommerce", "gaming", "media", "other"]>>;
    teamSize: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    name: string;
    industry?: "technology" | "design" | "marketing" | "finance" | "healthcare" | "education" | "ecommerce" | "gaming" | "media" | "other" | undefined;
    teamSize?: number | undefined;
}, {
    name: string;
    industry?: "technology" | "design" | "marketing" | "finance" | "healthcare" | "education" | "ecommerce" | "gaming" | "media" | "other" | undefined;
    teamSize?: number | undefined;
}>;
export type CreateWorkspaceInput = z.infer<typeof CreateWorkspaceSchema>;
export declare const UpdateWorkspaceSchema: z.ZodEffects<z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    avatarUrl: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    industry: z.ZodOptional<z.ZodEnum<["technology", "design", "marketing", "finance", "healthcare", "education", "ecommerce", "gaming", "media", "other"]>>;
    settings: z.ZodOptional<z.ZodObject<{
        allowGuestAccess: z.ZodOptional<z.ZodBoolean>;
        requireEmailVerification: z.ZodOptional<z.ZodBoolean>;
        defaultRoleId: z.ZodOptional<z.ZodString>;
        notificationsEnabled: z.ZodOptional<z.ZodBoolean>;
        allowMemberInvites: z.ZodOptional<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        allowGuestAccess?: boolean | undefined;
        requireEmailVerification?: boolean | undefined;
        defaultRoleId?: string | undefined;
        notificationsEnabled?: boolean | undefined;
        allowMemberInvites?: boolean | undefined;
    }, {
        allowGuestAccess?: boolean | undefined;
        requireEmailVerification?: boolean | undefined;
        defaultRoleId?: string | undefined;
        notificationsEnabled?: boolean | undefined;
        allowMemberInvites?: boolean | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    avatarUrl?: string | null | undefined;
    name?: string | undefined;
    industry?: "technology" | "design" | "marketing" | "finance" | "healthcare" | "education" | "ecommerce" | "gaming" | "media" | "other" | undefined;
    settings?: {
        allowGuestAccess?: boolean | undefined;
        requireEmailVerification?: boolean | undefined;
        defaultRoleId?: string | undefined;
        notificationsEnabled?: boolean | undefined;
        allowMemberInvites?: boolean | undefined;
    } | undefined;
}, {
    avatarUrl?: string | null | undefined;
    name?: string | undefined;
    industry?: "technology" | "design" | "marketing" | "finance" | "healthcare" | "education" | "ecommerce" | "gaming" | "media" | "other" | undefined;
    settings?: {
        allowGuestAccess?: boolean | undefined;
        requireEmailVerification?: boolean | undefined;
        defaultRoleId?: string | undefined;
        notificationsEnabled?: boolean | undefined;
        allowMemberInvites?: boolean | undefined;
    } | undefined;
}>, {
    avatarUrl?: string | null | undefined;
    name?: string | undefined;
    industry?: "technology" | "design" | "marketing" | "finance" | "healthcare" | "education" | "ecommerce" | "gaming" | "media" | "other" | undefined;
    settings?: {
        allowGuestAccess?: boolean | undefined;
        requireEmailVerification?: boolean | undefined;
        defaultRoleId?: string | undefined;
        notificationsEnabled?: boolean | undefined;
        allowMemberInvites?: boolean | undefined;
    } | undefined;
}, {
    avatarUrl?: string | null | undefined;
    name?: string | undefined;
    industry?: "technology" | "design" | "marketing" | "finance" | "healthcare" | "education" | "ecommerce" | "gaming" | "media" | "other" | undefined;
    settings?: {
        allowGuestAccess?: boolean | undefined;
        requireEmailVerification?: boolean | undefined;
        defaultRoleId?: string | undefined;
        notificationsEnabled?: boolean | undefined;
        allowMemberInvites?: boolean | undefined;
    } | undefined;
}>;
export type UpdateWorkspaceInput = z.infer<typeof UpdateWorkspaceSchema>;
export declare const InviteMemberSchema: z.ZodObject<{
    email: z.ZodString;
    roleId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
    roleId: string;
}, {
    email: string;
    roleId: string;
}>;
export type InviteMemberInput = z.infer<typeof InviteMemberSchema>;
export declare const BulkInviteMembersSchema: z.ZodObject<{
    invites: z.ZodArray<z.ZodObject<{
        email: z.ZodString;
        roleId: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        email: string;
        roleId: string;
    }, {
        email: string;
        roleId: string;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    invites: {
        email: string;
        roleId: string;
    }[];
}, {
    invites: {
        email: string;
        roleId: string;
    }[];
}>;
export type BulkInviteMembersInput = z.infer<typeof BulkInviteMembersSchema>;
export declare const UpdateMemberRoleSchema: z.ZodObject<{
    roleId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    roleId: string;
}, {
    roleId: string;
}>;
export type UpdateMemberRoleInput = z.infer<typeof UpdateMemberRoleSchema>;
export declare const AcceptInviteSchema: z.ZodObject<{
    token: z.ZodString;
}, "strip", z.ZodTypeAny, {
    token: string;
}, {
    token: string;
}>;
export type AcceptInviteInput = z.infer<typeof AcceptInviteSchema>;
export declare const UpdatePresenceSchema: z.ZodObject<{
    status: z.ZodEnum<["online", "away", "busy", "offline"]>;
}, "strip", z.ZodTypeAny, {
    status: "online" | "away" | "busy" | "offline";
}, {
    status: "online" | "away" | "busy" | "offline";
}>;
export type UpdatePresenceInput = z.infer<typeof UpdatePresenceSchema>;
export declare const TransferOwnershipSchema: z.ZodObject<{
    newOwnerUid: z.ZodString;
    confirmName: z.ZodString;
}, "strip", z.ZodTypeAny, {
    newOwnerUid: string;
    confirmName: string;
}, {
    newOwnerUid: string;
    confirmName: string;
}>;
export type TransferOwnershipInput = z.infer<typeof TransferOwnershipSchema>;
export declare const DeleteWorkspaceSchema: z.ZodObject<{
    confirmName: z.ZodString;
}, "strip", z.ZodTypeAny, {
    confirmName: string;
}, {
    confirmName: string;
}>;
export type DeleteWorkspaceInput = z.infer<typeof DeleteWorkspaceSchema>;
export declare const WorkspaceMembersQuerySchema: z.ZodObject<{
    limit: z.ZodPipeline<z.ZodEffects<z.ZodOptional<z.ZodString>, number, string | undefined>, z.ZodNumber>;
    cursor: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodEnum<["active", "suspended"]>>;
    roleId: z.ZodOptional<z.ZodString>;
    search: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    cursor?: string | undefined;
    search?: string | undefined;
    roleId?: string | undefined;
    status?: "active" | "suspended" | undefined;
}, {
    limit?: string | undefined;
    cursor?: string | undefined;
    search?: string | undefined;
    roleId?: string | undefined;
    status?: "active" | "suspended" | undefined;
}>;
export type WorkspaceMembersQueryInput = z.infer<typeof WorkspaceMembersQuerySchema>;
//# sourceMappingURL=workspace.schema.d.ts.map