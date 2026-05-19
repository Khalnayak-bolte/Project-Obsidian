'use strict';
// js/routes/file.routes.js

const { Router } = require('express');
const { requirePermission } = require('../middleware/rbacMiddleware');
const { RATE_LIMITS }       = require('../middleware/rateLimitMiddleware');
const { getUploadUrl, listFiles, deleteFile } = require('../controllers/fileController');

const fileRouter = Router();

fileRouter.get   ('/upload-url', RATE_LIMITS.UPLOADS, requirePermission('upload_files'),   getUploadUrl);
fileRouter.get   ('/',                                 requirePermission('download_files'),  listFiles);
fileRouter.delete('/:fileId',                          requirePermission('delete_files'),    deleteFile);

module.exports = { fileRouter };
