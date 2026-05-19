'use strict';
// js/controllers/fileController.js

const { createLogger } = require('../utils/logger');
const { successResponse, HTTP_STATUS, ERROR_CODES } = require('../utils/helpers');
const { AppError }     = require('../middleware/errorMiddleware');

const logger = createLogger('fileController');

// File upload in this backend uses S3 presigned URLs — stubs below

async function getUploadUrl(req, res, next) {
  try {
    // AWS S3 presigned URL generation requires AWS SDK configured with real credentials.
    // For now return a 503 with a clear message so the terminal shows what needs configuring.
    logger.warn('getUploadUrl: AWS S3 not configured for JS server. Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY.');
    return res.status(HTTP_STATUS.SERVICE_UNAVAILABLE).json({
      success: false,
      error: { code: ERROR_CODES.SERVICE_UNAVAILABLE, message: 'File upload requires AWS S3 configuration.' },
    });
  } catch (err) { logger.error('getUploadUrl', err); next(err); }
}

async function listFiles(req, res, next) {
  try {
    return res.status(HTTP_STATUS.OK).json(successResponse([], 'File listing not yet implemented.'));
  } catch (err) { next(err); }
}

async function deleteFile(req, res, next) {
  try {
    return res.status(HTTP_STATUS.OK).json(successResponse(null, 'File delete not yet implemented.'));
  } catch (err) { next(err); }
}

module.exports = { getUploadUrl, listFiles, deleteFile };
