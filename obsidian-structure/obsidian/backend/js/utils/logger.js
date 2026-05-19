'use strict';
// js/utils/logger.js
// Terminal-only logger — errors are NEVER sent to clients, only printed here.

const appConfig = require('../config/appConfig');

const COLORS = {
  reset: '\x1b[0m',
  debug: '\x1b[36m',  // cyan
  info:  '\x1b[32m',  // green
  warn:  '\x1b[33m',  // yellow
  error: '\x1b[31m',  // red
  dim:   '\x1b[2m',
  bold:  '\x1b[1m',
};

const LOG_LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };
const CURRENT_LEVEL = appConfig.isProd ? 'info' : 'debug';

function shouldLog(level) {
  return LOG_LEVELS[level] >= LOG_LEVELS[CURRENT_LEVEL];
}

function formatDev(level, context, message, data, err) {
  const color   = COLORS[level] || '';
  const label   = level.toUpperCase().padEnd(5);
  const ctx     = context ? `${COLORS.dim}[${context}]${COLORS.reset} ` : '';
  const ts      = `${COLORS.dim}${new Date().toISOString()}${COLORS.reset}`;
  const dataStr = data ? `\n${COLORS.dim}${JSON.stringify(data, null, 2)}${COLORS.reset}` : '';
  let errStr    = '';
  if (err instanceof Error) {
    errStr = `\n${COLORS.error}${err.message}`;
    if (err.stack && appConfig.isDev) errStr += `\n${err.stack}`;
    errStr += COLORS.reset;
  } else if (err) {
    errStr = `\n${COLORS.error}${String(err)}${COLORS.reset}`;
  }
  return `${ts} ${color}${COLORS.bold}${label}${COLORS.reset} ${ctx}${message}${dataStr}${errStr}`;
}

function formatProd(level, context, message, data, err) {
  const entry = {
    level,
    context,
    message,
    timestamp: new Date().toISOString(),
    data: data || undefined,
  };
  if (err instanceof Error) {
    entry.error = { message: err.message, stack: err.stack };
  }
  return JSON.stringify(entry);
}

function emit(level, context, message, data, err) {
  if (!shouldLog(level)) return;
  const formatted = appConfig.isProd
    ? formatProd(level, context, message, data, err)
    : formatDev(level, context, message, data, err);

  if (level === 'error') console.error(formatted);
  else if (level === 'warn')  console.warn(formatted);
  else                        console.log(formatted);
}

class Logger {
  constructor(context) {
    this._ctx = context;
  }
  debug(msg, data)       { emit('debug', this._ctx, msg, data); }
  info(msg, data)        { emit('info',  this._ctx, msg, data); }
  warn(msg, data)        { emit('warn',  this._ctx, msg, data); }
  error(msg, err, data)  { emit('error', this._ctx, msg, data, err); }
  child(sub)             { return new Logger(this._ctx ? `${this._ctx}:${sub}` : sub); }
}

function createLogger(context) {
  return new Logger(context);
}

module.exports = { createLogger, logger: new Logger() };
