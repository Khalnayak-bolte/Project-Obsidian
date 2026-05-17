/**
 * backend/services/messageService.ts
 * Project: Obsidian
 */
import { createLogger } from "../utils/logger";
import { AUDIT_ACTIONS, MESSAGE_LIMITS } from "../utils/constants";
import * as messageRepo from "../repositories/messageRepository";
import * as channelRepo from "../repositories/channelRepository";
import * as workspaceRepo from "../repositories/workspaceRepository";
import { AppError } from "../middleware/errorMiddleware";
import { ERROR_CODES, HTTP_STATUS } from "../types/common";
const logger = createLogger("messageService");
// ─── Send message ─────────────────────────────────────────────────────────────
export async function sendMessage(workspaceId, channelId, senderId, input) {
    const channel = await channelRepo.getChannelById(channelId);
    if (!channel || channel.workspaceId !== workspaceId) {
        throw new AppError("Channel not found", HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);
    }
    if (channel.isArchived) {
        throw new AppError("Cannot send messages to an archived channel", HTTP_STATUS.FORBIDDEN, ERROR_CODES.FORBIDDEN);
    }
    const message = await messageRepo.createMessage({
        channelId,
        workspaceId,
        senderId,
        content: input.content ?? "",
        attachments: input.attachments ?? [],
        mentions: input.mentions ?? [],
        replyTo: input.replyTo,
        type: "text",
    });
    // Update channel last message preview
    await channelRepo.updateChannelLastMessage(channelId, input.content?.slice(0, 100) ?? "[attachment]");
    // Increment unread for other members
    await channelRepo.incrementUnreadCount(channelId, senderId, workspaceId);
    logger.info("Message sent", { messageId: message.messageId, channelId, workspaceId });
    return message;
}
// ─── Get messages ─────────────────────────────────────────────────────────────
export async function getMessages(workspaceId, channelId, query) {
    const channel = await channelRepo.getChannelById(channelId);
    if (!channel || channel.workspaceId !== workspaceId) {
        throw new AppError("Channel not found", HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);
    }
    return messageRepo.getMessagesByChannel(channelId, workspaceId, query.limit ?? 50, query.cursor);
}
// ─── Get messages around anchor ───────────────────────────────────────────────
export async function getMessagesAround(workspaceId, channelId, messageId) {
    const channel = await channelRepo.getChannelById(channelId);
    if (!channel || channel.workspaceId !== workspaceId) {
        throw new AppError("Channel not found", HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);
    }
    return messageRepo.getMessagesAround(channelId, workspaceId, messageId);
}
// ─── Edit message ─────────────────────────────────────────────────────────────
export async function editMessage(workspaceId, messageId, editorId, input) {
    const message = await messageRepo.getMessageById(messageId);
    if (!message || message.workspaceId !== workspaceId) {
        throw new AppError("Message not found", HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);
    }
    if (message.senderId !== editorId) {
        throw new AppError("You can only edit your own messages", HTTP_STATUS.FORBIDDEN, ERROR_CODES.FORBIDDEN);
    }
    if (message.status === "deleted") {
        throw new AppError("Cannot edit a deleted message", HTTP_STATUS.BAD_REQUEST, ERROR_CODES.BAD_REQUEST);
    }
    // Edit window check
    const ageMs = Date.now() - message.createdAt.toMillis();
    if (ageMs > MESSAGE_LIMITS.EDIT_WINDOW_MS) {
        throw new AppError("Messages can only be edited within 15 minutes of sending", HTTP_STATUS.FORBIDDEN, ERROR_CODES.FORBIDDEN);
    }
    await messageRepo.editMessage(messageId, input.content);
    const updated = await messageRepo.getMessageById(messageId);
    logger.info("Message edited", { messageId, workspaceId });
    return updated;
}
// ─── Delete message ───────────────────────────────────────────────────────────
export async function deleteMessage(workspaceId, messageId, actorId, actorPermissions) {
    const message = await messageRepo.getMessageById(messageId);
    if (!message || message.workspaceId !== workspaceId) {
        throw new AppError("Message not found", HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);
    }
    const isOwn = message.senderId === actorId;
    const canDelete = actorPermissions["delete_messages"];
    if (!isOwn && !canDelete) {
        throw new AppError("You do not have permission to delete this message", HTTP_STATUS.FORBIDDEN, ERROR_CODES.FORBIDDEN);
    }
    await messageRepo.softDeleteMessage(messageId);
    if (!isOwn) {
        await workspaceRepo.writeAuditLog({
            workspaceId,
            actorId,
            action: AUDIT_ACTIONS.MESSAGE_DELETED,
            metadata: { messageId, originalSenderId: message.senderId },
        });
    }
    logger.info("Message deleted", { messageId, actorId });
}
// ─── Bulk delete ──────────────────────────────────────────────────────────────
export async function bulkDeleteMessages(workspaceId, channelId, actorId, input) {
    const channel = await channelRepo.getChannelById(channelId);
    if (!channel || channel.workspaceId !== workspaceId) {
        throw new AppError("Channel not found", HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);
    }
    let deleted = 0;
    for (const messageId of input.messageIds) {
        try {
            await messageRepo.softDeleteMessage(messageId);
            deleted++;
        }
        catch {
            // Skip failures on individual messages
        }
    }
    await workspaceRepo.writeAuditLog({
        workspaceId,
        actorId,
        action: AUDIT_ACTIONS.MESSAGES_BULK_DELETED,
        metadata: { channelId, count: deleted },
    });
    logger.info("Bulk delete complete", { channelId, deleted });
    return { deleted };
}
// ─── Add reaction ─────────────────────────────────────────────────────────────
export async function addReaction(workspaceId, messageId, uid, input) {
    const message = await messageRepo.getMessageById(messageId);
    if (!message || message.workspaceId !== workspaceId) {
        throw new AppError("Message not found", HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);
    }
    if (message.status === "deleted") {
        throw new AppError("Cannot react to a deleted message", HTTP_STATUS.BAD_REQUEST, ERROR_CODES.BAD_REQUEST);
    }
    const totalReactions = Object.values(message.reactions ?? {}).reduce((sum, r) => sum + (r.count ?? 0), 0);
    if (totalReactions >= MESSAGE_LIMITS.MAX_REACTIONS_PER_MESSAGE) {
        throw new AppError(`Maximum of ${MESSAGE_LIMITS.MAX_REACTIONS_PER_MESSAGE} reactions per message`, HTTP_STATUS.BAD_REQUEST, ERROR_CODES.BAD_REQUEST);
    }
    await messageRepo.addReaction(messageId, uid, input.emoji);
    logger.info("Reaction added", { messageId, uid, emoji: input.emoji });
}
// ─── Remove reaction ──────────────────────────────────────────────────────────
export async function removeReaction(workspaceId, messageId, uid, emoji) {
    const message = await messageRepo.getMessageById(messageId);
    if (!message || message.workspaceId !== workspaceId) {
        throw new AppError("Message not found", HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);
    }
    await messageRepo.removeReaction(messageId, uid, emoji);
    logger.info("Reaction removed", { messageId, uid, emoji });
}
// ─── Pin message ──────────────────────────────────────────────────────────────
export async function pinMessage(workspaceId, messageId, actorId) {
    const message = await messageRepo.getMessageById(messageId);
    if (!message || message.workspaceId !== workspaceId) {
        throw new AppError("Message not found", HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);
    }
    if (message.status === "deleted") {
        throw new AppError("Cannot pin a deleted message", HTTP_STATUS.BAD_REQUEST, ERROR_CODES.BAD_REQUEST);
    }
    await messageRepo.pinMessage(messageId, actorId);
    await workspaceRepo.writeAuditLog({
        workspaceId,
        actorId,
        action: AUDIT_ACTIONS.MESSAGE_PINNED,
        metadata: { messageId, channelId: message.channelId },
    });
    logger.info("Message pinned", { messageId, actorId });
}
// ─── Unpin message ────────────────────────────────────────────────────────────
export async function unpinMessage(workspaceId, messageId, actorId) {
    const message = await messageRepo.getMessageById(messageId);
    if (!message || message.workspaceId !== workspaceId) {
        throw new AppError("Message not found", HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);
    }
    await messageRepo.unpinMessage(messageId);
    logger.info("Message unpinned", { messageId, actorId });
}
// ─── Get pinned messages ──────────────────────────────────────────────────────
export async function getPinnedMessages(workspaceId, channelId) {
    const channel = await channelRepo.getChannelById(channelId);
    if (!channel || channel.workspaceId !== workspaceId) {
        throw new AppError("Channel not found", HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);
    }
    return messageRepo.getPinnedMessages(channelId);
}
// ─── Search messages ──────────────────────────────────────────────────────────
export async function searchMessages(workspaceId, query) {
    return messageRepo.searchMessages({
        workspaceId,
        query: query.query,
        channelId: query.channelId,
        senderId: query.senderId,
        limit: query.limit ?? 25,
        cursor: query.cursor,
    });
}
//# sourceMappingURL=messageService.js.map