'use strict';
// js/routes/workspace.routes.js

const { Router } = require('express');
const { requirePermission } = require('../middleware/rbacMiddleware');
const { getWorkspace, updateWorkspace, getMembers, removeMember, generateInvite, joinWorkspace } = require('../controllers/workspaceController');

const workspaceRouter = Router();

workspaceRouter.get   ('/',                   getWorkspace);
workspaceRouter.patch ('/',                   requirePermission('manage_workspace'), updateWorkspace);
workspaceRouter.get   ('/members',            getMembers);
workspaceRouter.delete('/members/:userId',    requirePermission('manage_members'),   removeMember);
workspaceRouter.post  ('/invite',             requirePermission('manage_invites'),   generateInvite);
workspaceRouter.post  ('/join',               joinWorkspace);

module.exports = { workspaceRouter };
