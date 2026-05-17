/**
 * backend/schemas/channel.schema.ts
 * Project: Obsidian
 *
 * Zod validation schemas for all channel-related request bodies.
 * Covers channel creation/update, categories, member management,
 * permissions, and query parameters.
 */

import { z } from "zod";

// ─── Shared enums ─────────────────────────────────────────────────────────────

export const ChannelTypeEnum = z.enum(["text", "voice", "announcement"], {
  errorMap: () => ({
    message: "Channel type must be one of: text, voice, announcement.",
  }),
});

export const ChannelVisibilityEnum = z.enum(["public", "private"], {
  errorMap: () => ({
    message: "Visibility must be either 'public' or 'private'.",
  }),
});

// ─── Shared field definitions ─────────────────────────────────────────────────

const channelNameField = z
  .string({ required_error: "Channel name is required." })
  .trim()
  .toLowerCase()
  .min(1, "Channel name must be at least 1 character.")
  .max(64, "Channel name must not exceed 64 characters.")
  .regex(
    /^[a-z0-9-_]+$/,
    "Channel name may only contain lowercase letters, numbers, hyphens, and underscores."
  );

const channelDescriptionField = z
  .string()
  .trim()
  .max(256, "Description must not exceed 256 characters.")
  .optional();

const allowedRolesField = z
  .array(
    z
      .string()
      .trim()
      .min(1, "Role ID must not be empty.")
      .max(64, "Role ID must not exceed 64 characters.")
  )
  .max(20, "Cannot assign more than 20 roles to a channel.")
  .optional()
  .default([]);

const positionField = z
  .number()
  .int("Position must be a whole number.")
  .min(0, "Position must be a non-negative number.")
  .max(500, "Position must not exceed 500.")
  .optional();

// ─── Create Channel ───────────────────────────────────────────────────────────

export const CreateChannelSchema = z.object({
  name: channelNameField,
  type: ChannelTypeEnum,
  visibility: ChannelVisibilityEnum,
  description: channelDescriptionField,
  allowedRoles: allowedRolesField,
  categoryId: z
    .string()
    .trim()
    .min(1, "Category ID must not be empty.")
    .max(64, "Category ID must not exceed 64 characters.")
    .optional(),
  position: positionField,
});

export type CreateChannelInput = z.infer<typeof CreateChannelSchema>;

// ─── Update Channel ───────────────────────────────────────────────────────────

export const UpdateChannelSchema = z
  .object({
    name: channelNameField.optional(),
    description: channelDescriptionField,
    visibility: ChannelVisibilityEnum.optional(),
    allowedRoles: allowedRolesField,
    position: positionField,
    isArchived: z.boolean().optional(),
  })
  .refine(
    (data) =>
      data.name !== undefined ||
      data.description !== undefined ||
      data.visibility !== undefined ||
      data.allowedRoles !== undefined ||
      data.position !== undefined ||
      data.isArchived !== undefined,
    { message: "At least one field must be provided to update." }
  );

export type UpdateChannelInput = z.infer<typeof UpdateChannelSchema>;

// ─── Reorder Channels ─────────────────────────────────────────────────────────

export const ReorderChannelsSchema = z.object({
  order: z
    .array(
      z.object({
        channelId: z
          .string({ required_error: "Channel ID is required." })
          .trim()
          .min(1, "Channel ID must not be empty."),
        position: z
          .number()
          .int("Position must be a whole number.")
          .min(0, "Position must be a non-negative number."),
      })
    )
    .min(1, "At least one channel must be provided.")
    .max(200, "Cannot reorder more than 200 channels at once."),
});

export type ReorderChannelsInput = z.infer<typeof ReorderChannelsSchema>;

// ─── Create Category ──────────────────────────────────────────────────────────

export const CreateCategorySchema = z.object({
  name: z
    .string({ required_error: "Category name is required." })
    .trim()
    .min(1, "Category name must be at least 1 character.")
    .max(48, "Category name must not exceed 48 characters."),
  position: positionField,
  channelIds: z
    .array(z.string().trim().min(1))
    .max(50, "A category cannot contain more than 50 channels.")
    .optional()
    .default([]),
});

export type CreateCategoryInput = z.infer<typeof CreateCategorySchema>;

// ─── Update Category ──────────────────────────────────────────────────────────

export const UpdateCategorySchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Category name must be at least 1 character.")
      .max(48, "Category name must not exceed 48 characters.")
      .optional(),
    position: positionField,
    isCollapsed: z.boolean().optional(),
    channelIds: z
      .array(z.string().trim().min(1))
      .max(50, "A category cannot contain more than 50 channels.")
      .optional(),
  })
  .refine(
    (data) =>
      data.name !== undefined ||
      data.position !== undefined ||
      data.isCollapsed !== undefined ||
      data.channelIds !== undefined,
    { message: "At least one field must be provided to update." }
  );

export type UpdateCategoryInput = z.infer<typeof UpdateCategorySchema>;

// ─── Update Channel Member Settings ──────────────────────────────────────────

export const UpdateChannelMemberSchema = z
  .object({
    isMuted: z.boolean().optional(),
  })
  .refine((data) => data.isMuted !== undefined, {
    message: "At least one member setting must be provided.",
  });

export type UpdateChannelMemberInput = z.infer<typeof UpdateChannelMemberSchema>;

// ─── Mark Channel Read ────────────────────────────────────────────────────────

export const MarkChannelReadSchema = z.object({
  lastReadMessageId: z
    .string({ required_error: "Last read message ID is required." })
    .trim()
    .min(1, "Last read message ID must not be empty."),
});

export type MarkChannelReadInput = z.infer<typeof MarkChannelReadSchema>;

// ─── Update Channel Permissions (per role override) ───────────────────────────

export const UpdateChannelPermissionsSchema = z.object({
  roleId: z
    .string({ required_error: "Role ID is required." })
    .trim()
    .min(1, "Role ID must not be empty."),
  permissions: z.object({
    canSendMessages: z.boolean().optional(),
    canDeleteMessages: z.boolean().optional(),
    canPinMessages: z.boolean().optional(),
    canUploadFiles: z.boolean().optional(),
    canManageChannel: z.boolean().optional(),
    canJoinVoice: z.boolean().optional(),
    canMuteMembers: z.boolean().optional(),
    canKickMembers: z.boolean().optional(),
  }),
});

export type UpdateChannelPermissionsInput = z.infer<
  typeof UpdateChannelPermissionsSchema
>;

// ─── List Channels Query ──────────────────────────────────────────────────────

export const ListChannelsQuerySchema = z.object({
  type: ChannelTypeEnum.optional(),
  visibility: ChannelVisibilityEnum.optional(),
  isArchived: z
    .string()
    .optional()
    .transform((v) => {
      if (v === "true") return true;
      if (v === "false") return false;
      return undefined;
    }),
  categoryId: z.string().trim().optional(),
  limit: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 100))
    .pipe(
      z
        .number()
        .int()
        .min(1, "Limit must be at least 1.")
        .max(200, "Limit must not exceed 200.")
    ),
  cursor: z.string().trim().optional(),
});

export type ListChannelsQueryInput = z.infer<typeof ListChannelsQuerySchema>;

// ─── Add Channel Members (for private channels) ───────────────────────────────

export const AddChannelMembersSchema = z.object({
  uids: z
    .array(
      z
        .string({ required_error: "UID is required." })
        .trim()
        .min(1, "UID must not be empty.")
        .max(128, "UID must not exceed 128 characters.")
    )
    .min(1, "At least one member must be provided.")
    .max(50, "Cannot add more than 50 members at once."),
});

export type AddChannelMembersInput = z.infer<typeof AddChannelMembersSchema>;
