/**
 * backend/schemas/channel.schema.ts
 * Project: Obsidian
 *
 * Zod validation schemas for all channel-related request bodies.
 * Covers channel creation/update, categories, member management,
 * permissions, and query parameters.
 */
import { z } from "zod";
export declare const ChannelTypeEnum: z.ZodEnum<["text", "voice", "announcement"]>;
export declare const ChannelVisibilityEnum: z.ZodEnum<["public", "private"]>;
export declare const CreateChannelSchema: z.ZodObject<{
    name: z.ZodString;
    type: z.ZodEnum<["text", "voice", "announcement"]>;
    visibility: z.ZodEnum<["public", "private"]>;
    description: z.ZodOptional<z.ZodString>;
    allowedRoles: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodString, "many">>>;
    categoryId: z.ZodOptional<z.ZodString>;
    position: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    type: "text" | "voice" | "announcement";
    name: string;
    visibility: "public" | "private";
    allowedRoles: string[];
    description?: string | undefined;
    position?: number | undefined;
    categoryId?: string | undefined;
}, {
    type: "text" | "voice" | "announcement";
    name: string;
    visibility: "public" | "private";
    description?: string | undefined;
    allowedRoles?: string[] | undefined;
    position?: number | undefined;
    categoryId?: string | undefined;
}>;
export type CreateChannelInput = z.infer<typeof CreateChannelSchema>;
export declare const UpdateChannelSchema: z.ZodEffects<z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    visibility: z.ZodOptional<z.ZodEnum<["public", "private"]>>;
    allowedRoles: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodString, "many">>>;
    position: z.ZodOptional<z.ZodNumber>;
    isArchived: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    allowedRoles: string[];
    description?: string | undefined;
    name?: string | undefined;
    visibility?: "public" | "private" | undefined;
    position?: number | undefined;
    isArchived?: boolean | undefined;
}, {
    description?: string | undefined;
    name?: string | undefined;
    visibility?: "public" | "private" | undefined;
    allowedRoles?: string[] | undefined;
    position?: number | undefined;
    isArchived?: boolean | undefined;
}>, {
    allowedRoles: string[];
    description?: string | undefined;
    name?: string | undefined;
    visibility?: "public" | "private" | undefined;
    position?: number | undefined;
    isArchived?: boolean | undefined;
}, {
    description?: string | undefined;
    name?: string | undefined;
    visibility?: "public" | "private" | undefined;
    allowedRoles?: string[] | undefined;
    position?: number | undefined;
    isArchived?: boolean | undefined;
}>;
export type UpdateChannelInput = z.infer<typeof UpdateChannelSchema>;
export declare const ReorderChannelsSchema: z.ZodObject<{
    order: z.ZodArray<z.ZodObject<{
        channelId: z.ZodString;
        position: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        channelId: string;
        position: number;
    }, {
        channelId: string;
        position: number;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    order: {
        channelId: string;
        position: number;
    }[];
}, {
    order: {
        channelId: string;
        position: number;
    }[];
}>;
export type ReorderChannelsInput = z.infer<typeof ReorderChannelsSchema>;
export declare const CreateCategorySchema: z.ZodObject<{
    name: z.ZodString;
    position: z.ZodOptional<z.ZodNumber>;
    channelIds: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodString, "many">>>;
}, "strip", z.ZodTypeAny, {
    name: string;
    channelIds: string[];
    position?: number | undefined;
}, {
    name: string;
    position?: number | undefined;
    channelIds?: string[] | undefined;
}>;
export type CreateCategoryInput = z.infer<typeof CreateCategorySchema>;
export declare const UpdateCategorySchema: z.ZodEffects<z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    position: z.ZodOptional<z.ZodNumber>;
    isCollapsed: z.ZodOptional<z.ZodBoolean>;
    channelIds: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    name?: string | undefined;
    position?: number | undefined;
    channelIds?: string[] | undefined;
    isCollapsed?: boolean | undefined;
}, {
    name?: string | undefined;
    position?: number | undefined;
    channelIds?: string[] | undefined;
    isCollapsed?: boolean | undefined;
}>, {
    name?: string | undefined;
    position?: number | undefined;
    channelIds?: string[] | undefined;
    isCollapsed?: boolean | undefined;
}, {
    name?: string | undefined;
    position?: number | undefined;
    channelIds?: string[] | undefined;
    isCollapsed?: boolean | undefined;
}>;
export type UpdateCategoryInput = z.infer<typeof UpdateCategorySchema>;
export declare const UpdateChannelMemberSchema: z.ZodEffects<z.ZodObject<{
    isMuted: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    isMuted?: boolean | undefined;
}, {
    isMuted?: boolean | undefined;
}>, {
    isMuted?: boolean | undefined;
}, {
    isMuted?: boolean | undefined;
}>;
export type UpdateChannelMemberInput = z.infer<typeof UpdateChannelMemberSchema>;
export declare const MarkChannelReadSchema: z.ZodObject<{
    lastReadMessageId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    lastReadMessageId: string;
}, {
    lastReadMessageId: string;
}>;
export type MarkChannelReadInput = z.infer<typeof MarkChannelReadSchema>;
export declare const UpdateChannelPermissionsSchema: z.ZodObject<{
    roleId: z.ZodString;
    permissions: z.ZodObject<{
        canSendMessages: z.ZodOptional<z.ZodBoolean>;
        canDeleteMessages: z.ZodOptional<z.ZodBoolean>;
        canPinMessages: z.ZodOptional<z.ZodBoolean>;
        canUploadFiles: z.ZodOptional<z.ZodBoolean>;
        canManageChannel: z.ZodOptional<z.ZodBoolean>;
        canJoinVoice: z.ZodOptional<z.ZodBoolean>;
        canMuteMembers: z.ZodOptional<z.ZodBoolean>;
        canKickMembers: z.ZodOptional<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        canSendMessages?: boolean | undefined;
        canDeleteMessages?: boolean | undefined;
        canPinMessages?: boolean | undefined;
        canUploadFiles?: boolean | undefined;
        canManageChannel?: boolean | undefined;
        canJoinVoice?: boolean | undefined;
        canMuteMembers?: boolean | undefined;
        canKickMembers?: boolean | undefined;
    }, {
        canSendMessages?: boolean | undefined;
        canDeleteMessages?: boolean | undefined;
        canPinMessages?: boolean | undefined;
        canUploadFiles?: boolean | undefined;
        canManageChannel?: boolean | undefined;
        canJoinVoice?: boolean | undefined;
        canMuteMembers?: boolean | undefined;
        canKickMembers?: boolean | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    roleId: string;
    permissions: {
        canSendMessages?: boolean | undefined;
        canDeleteMessages?: boolean | undefined;
        canPinMessages?: boolean | undefined;
        canUploadFiles?: boolean | undefined;
        canManageChannel?: boolean | undefined;
        canJoinVoice?: boolean | undefined;
        canMuteMembers?: boolean | undefined;
        canKickMembers?: boolean | undefined;
    };
}, {
    roleId: string;
    permissions: {
        canSendMessages?: boolean | undefined;
        canDeleteMessages?: boolean | undefined;
        canPinMessages?: boolean | undefined;
        canUploadFiles?: boolean | undefined;
        canManageChannel?: boolean | undefined;
        canJoinVoice?: boolean | undefined;
        canMuteMembers?: boolean | undefined;
        canKickMembers?: boolean | undefined;
    };
}>;
export type UpdateChannelPermissionsInput = z.infer<typeof UpdateChannelPermissionsSchema>;
export declare const ListChannelsQuerySchema: z.ZodObject<{
    type: z.ZodOptional<z.ZodEnum<["text", "voice", "announcement"]>>;
    visibility: z.ZodOptional<z.ZodEnum<["public", "private"]>>;
    isArchived: z.ZodEffects<z.ZodOptional<z.ZodString>, boolean | undefined, string | undefined>;
    categoryId: z.ZodOptional<z.ZodString>;
    limit: z.ZodPipeline<z.ZodEffects<z.ZodOptional<z.ZodString>, number, string | undefined>, z.ZodNumber>;
    cursor: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    cursor?: string | undefined;
    type?: "text" | "voice" | "announcement" | undefined;
    visibility?: "public" | "private" | undefined;
    isArchived?: boolean | undefined;
    categoryId?: string | undefined;
}, {
    limit?: string | undefined;
    cursor?: string | undefined;
    type?: "text" | "voice" | "announcement" | undefined;
    visibility?: "public" | "private" | undefined;
    isArchived?: string | undefined;
    categoryId?: string | undefined;
}>;
export type ListChannelsQueryInput = z.infer<typeof ListChannelsQuerySchema>;
export declare const AddChannelMembersSchema: z.ZodObject<{
    uids: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    uids: string[];
}, {
    uids: string[];
}>;
export type AddChannelMembersInput = z.infer<typeof AddChannelMembersSchema>;
//# sourceMappingURL=channel.schema.d.ts.map