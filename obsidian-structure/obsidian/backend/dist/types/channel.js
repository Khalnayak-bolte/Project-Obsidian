// ─── Default Channels ─────────────────────────────────────────────────────────
// Created automatically when a workspace is initialized
export const DEFAULT_CHANNELS = [
    {
        name: "general",
        type: "text",
        visibility: "public",
        allowedRoles: [],
        position: 0,
        isArchived: false,
        isDefault: true,
        description: "General discussion for the whole team",
    },
    {
        name: "announcements",
        type: "announcement",
        visibility: "public",
        allowedRoles: [],
        position: 1,
        isArchived: false,
        isDefault: true,
        description: "Important announcements from the team",
    },
    {
        name: "general-voice",
        type: "voice",
        visibility: "public",
        allowedRoles: [],
        position: 2,
        isArchived: false,
        isDefault: true,
        description: "General voice room",
    },
];
//# sourceMappingURL=channel.js.map