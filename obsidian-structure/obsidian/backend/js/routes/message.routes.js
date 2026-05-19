'use strict';
// js/routes/message.routes.js

const { Router } = require('express');
const { requirePermission } = require('../middleware/rbacMiddleware');
const { RATE_LIMITS }       = require('../middleware/rateLimitMiddleware');
const { listMessages, sendMessage, deleteMessage, editMessage } = require('../controllers/messageController');

const messageRouter = Router();

messageRouter.get   ('/:channelId/messages',             listMessages);
messageRouter.post  ('/:channelId/messages', RATE_LIMITS.MESSAGES, requirePermission('send_messages'),   sendMessage);
messageRouter.patch ('/:channelId/messages/:messageId',  requirePermission('send_messages'),   editMessage);
messageRouter.delete('/:channelId/messages/:messageId',  requirePermission('delete_messages'), deleteMessage);

module.exports = { messageRouter };
