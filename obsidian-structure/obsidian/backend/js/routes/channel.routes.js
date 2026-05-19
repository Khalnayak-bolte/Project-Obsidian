'use strict';
// js/routes/channel.routes.js

const { Router } = require('express');
const { requirePermission } = require('../middleware/rbacMiddleware');
const { listChannels, createChannel, getChannel, updateChannel, deleteChannel } = require('../controllers/channelController');

const channelRouter = Router();

channelRouter.get   ('/',              listChannels);
channelRouter.post  ('/',              requirePermission('create_channels'), createChannel);
channelRouter.get   ('/:channelId',    getChannel);
channelRouter.patch ('/:channelId',    requirePermission('manage_channels'), updateChannel);
channelRouter.delete('/:channelId',    requirePermission('delete_channels'), deleteChannel);

module.exports = { channelRouter };
