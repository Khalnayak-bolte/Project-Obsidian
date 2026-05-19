'use strict';
// js/utils/helpers.js

const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

// ─── ID Generation ────────────────────────────────────────────────────────────

function generateId(prefix) {
  const id = uuidv4().replace(/-/g, '').slice(0, 16);
  return prefix ? `${prefix}_${id}` : id;
}

const generateWorkspaceId = () => generateId('ws');
const generateChannelId   = () => generateId('chn');
const generateMessageId   = () => generateId('msg');
const generateFileId      = () => generateId('file');
const generateInviteId    = () => generateId('inv');
const generateSessionId   = () => generateId('sess');
const generatePaymentId   = () => generateId('pay');
const generateInvoiceId   = () => generateId('inv');
const generateWebhookId   = () => generateId('whk');
const generateRoleId      = () => generateId('role');

// ─── Slug Generation ──────────────────────────────────────────────────────────

function generateSlug(name) {
  return name.toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 48);
}

function generateUniqueSlug(name, suffix) {
  const base = generateSlug(name);
  const tag  = suffix || crypto.randomBytes(3).toString('hex');
  return `${base}-${tag}`;
}

// ─── Token Generation ─────────────────────────────────────────────────────────

function generateSecureToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function generateInviteToken() {
  const raw    = generateSecureToken(24);
  const hashed = hashToken(raw);
  return { raw, hashed };
}

// ─── API Response Builders ────────────────────────────────────────────────────

function successResponse(data, message, meta) {
  const res = { success: true, data };
  if (message) res.message = message;
  if (meta)    res.meta    = meta;
  return res;
}

function errorResponse(code, message, details) {
  const res = { success: false, error: { code, message } };
  if (details !== undefined) res.error.details = details;
  return res;
}

// ─── HTTP Status Codes ────────────────────────────────────────────────────────

const HTTP_STATUS = {
  OK:                200,
  CREATED:           201,
  NO_CONTENT:        204,
  BAD_REQUEST:       400,
  UNAUTHORIZED:      401,
  FORBIDDEN:         403,
  NOT_FOUND:         404,
  CONFLICT:          409,
  UNPROCESSABLE:     422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_ERROR:    500,
  SERVICE_UNAVAILABLE: 503,
};

// ─── Error Codes ──────────────────────────────────────────────────────────────

const ERROR_CODES = {
  UNAUTHORIZED:         'UNAUTHORIZED',
  FORBIDDEN:            'FORBIDDEN',
  TOKEN_EXPIRED:        'TOKEN_EXPIRED',
  INVALID_TOKEN:        'INVALID_TOKEN',
  NOT_FOUND:            'NOT_FOUND',
  ALREADY_EXISTS:       'ALREADY_EXISTS',
  CONFLICT:             'CONFLICT',
  VALIDATION_ERROR:     'VALIDATION_ERROR',
  INVALID_INPUT:        'INVALID_INPUT',
  SUBSCRIPTION_REQUIRED:'SUBSCRIPTION_REQUIRED',
  TIER_LIMIT_EXCEEDED:  'TIER_LIMIT_EXCEEDED',
  STORAGE_LIMIT_EXCEEDED:'STORAGE_LIMIT_EXCEEDED',
  MEMBER_LIMIT_EXCEEDED:'MEMBER_LIMIT_EXCEEDED',
  VOICE_SESSION_NOT_FOUND:'VOICE_SESSION_NOT_FOUND',
  VOICE_JOIN_FAILED:    'VOICE_JOIN_FAILED',
  FILE_TOO_LARGE:       'FILE_TOO_LARGE',
  INVALID_FILE_TYPE:    'INVALID_FILE_TYPE',
  UPLOAD_FAILED:        'UPLOAD_FAILED',
  PAYMENT_FAILED:       'PAYMENT_FAILED',
  INVALID_WEBHOOK:      'INVALID_WEBHOOK',
  WEBHOOK_REPLAY:       'WEBHOOK_REPLAY',
  INTERNAL_ERROR:       'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE:  'SERVICE_UNAVAILABLE',
  RATE_LIMITED:         'RATE_LIMITED',
};

function errorCodeToStatus(code) {
  const map = {
    UNAUTHORIZED:          HTTP_STATUS.UNAUTHORIZED,
    FORBIDDEN:             HTTP_STATUS.FORBIDDEN,
    TOKEN_EXPIRED:         HTTP_STATUS.UNAUTHORIZED,
    INVALID_TOKEN:         HTTP_STATUS.UNAUTHORIZED,
    NOT_FOUND:             HTTP_STATUS.NOT_FOUND,
    ALREADY_EXISTS:        HTTP_STATUS.CONFLICT,
    CONFLICT:              HTTP_STATUS.CONFLICT,
    VALIDATION_ERROR:      HTTP_STATUS.BAD_REQUEST,
    INVALID_INPUT:         HTTP_STATUS.BAD_REQUEST,
    SUBSCRIPTION_REQUIRED: HTTP_STATUS.FORBIDDEN,
    TIER_LIMIT_EXCEEDED:   HTTP_STATUS.FORBIDDEN,
    STORAGE_LIMIT_EXCEEDED:HTTP_STATUS.FORBIDDEN,
    MEMBER_LIMIT_EXCEEDED: HTTP_STATUS.FORBIDDEN,
    VOICE_SESSION_NOT_FOUND:HTTP_STATUS.NOT_FOUND,
    VOICE_JOIN_FAILED:     HTTP_STATUS.INTERNAL_ERROR,
    FILE_TOO_LARGE:        HTTP_STATUS.BAD_REQUEST,
    INVALID_FILE_TYPE:     HTTP_STATUS.BAD_REQUEST,
    UPLOAD_FAILED:         HTTP_STATUS.INTERNAL_ERROR,
    PAYMENT_FAILED:        HTTP_STATUS.BAD_REQUEST,
    INVALID_WEBHOOK:       HTTP_STATUS.BAD_REQUEST,
    WEBHOOK_REPLAY:        HTTP_STATUS.BAD_REQUEST,
    INTERNAL_ERROR:        HTTP_STATUS.INTERNAL_ERROR,
    SERVICE_UNAVAILABLE:   HTTP_STATUS.SERVICE_UNAVAILABLE,
    RATE_LIMITED:          HTTP_STATUS.TOO_MANY_REQUESTS,
  };
  return map[code] || HTTP_STATUS.INTERNAL_ERROR;
}

// ─── Pagination ───────────────────────────────────────────────────────────────

function parsePaginationParams(query, defaultLimit = 50, maxLimit = 100) {
  const limit  = Math.min(parseInt(String(query.limit || defaultLimit), 10), maxLimit);
  const cursor = query.cursor ? String(query.cursor) : undefined;
  return { limit, cursor };
}

// ─── String Utils ─────────────────────────────────────────────────────────────

function truncate(str, maxLength) {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + '...';
}

function sanitizeDisplayName(name) {
  return name.trim().replace(/\s+/g, ' ').slice(0, 64);
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${units[i]}`;
}

// ─── Date Utils ───────────────────────────────────────────────────────────────

function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function addMonths(date, months) {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

function isExpired(expiresAt) {
  return new Date() > expiresAt;
}

// ─── Object Utils ─────────────────────────────────────────────────────────────

function omitUndefined(obj) {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
}

function pick(obj, keys) {
  return keys.reduce((acc, key) => {
    if (key in obj) acc[key] = obj[key];
    return acc;
  }, {});
}

function omit(obj, keys) {
  const result = { ...obj };
  keys.forEach(key => delete result[key]);
  return result;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function safeJsonParse(str, fallback) {
  try { return JSON.parse(str); } catch { return fallback; }
}

module.exports = {
  generateId, generateWorkspaceId, generateChannelId, generateMessageId,
  generateFileId, generateInviteId, generateSessionId, generatePaymentId,
  generateInvoiceId, generateWebhookId, generateRoleId,
  generateSlug, generateUniqueSlug,
  generateSecureToken, hashToken, generateInviteToken,
  successResponse, errorResponse,
  HTTP_STATUS, ERROR_CODES, errorCodeToStatus,
  parsePaginationParams, truncate, sanitizeDisplayName, isValidEmail, formatBytes,
  addDays, addMonths, isExpired,
  omitUndefined, pick, omit, sleep, safeJsonParse,
};
