'use strict';
// js/routes/admin.routes.js

const { Router } = require('express');
const { requirePermission } = require('../middleware/rbacMiddleware');
const { listUsers, getUser, updateUserRole, deleteUser, getActivityLogs } = require('../controllers/adminController');

const adminRouter = Router();

adminRouter.get   ('/users',            requirePermission('manage_members'), listUsers);
adminRouter.get   ('/users/:userId',    requirePermission('manage_members'), getUser);
adminRouter.patch ('/users/:userId/role', requirePermission('manage_roles'), updateUserRole);
adminRouter.delete('/users/:userId',    requirePermission('manage_members'), deleteUser);
adminRouter.get   ('/logs',             requirePermission('view_audit_log'), getActivityLogs);

module.exports = { adminRouter };
