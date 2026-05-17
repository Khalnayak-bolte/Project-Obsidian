// ─── System Message Templates ─────────────────────────────────────────────────
export const SYSTEM_MESSAGE_TEMPLATES = {
    MEMBER_JOINED: (name) => `**${name}** joined the workspace`,
    MEMBER_LEFT: (name) => `**${name}** left the workspace`,
    MEMBER_KICKED: (name, by) => `**${name}** was removed by **${by}**`,
    CHANNEL_CREATED: (name, by) => `**${by}** created channel **#${name}**`,
    CHANNEL_ARCHIVED: (name) => `Channel **#${name}** was archived`,
    VOICE_STARTED: (by) => `**${by}** started a voice session`,
    VOICE_ENDED: () => `Voice session ended`,
    ROLE_UPDATED: (name, role) => `**${name}** is now a **${role}**`,
};
//# sourceMappingURL=message.js.map