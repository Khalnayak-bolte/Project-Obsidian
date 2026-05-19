'use strict';
/**
 * server.js — Obsidian Backend (Plain Node.js)
 *
 * Run with:  npx nodemon server.js
 *            node server.js
 *
 * All server-side errors print to the terminal only.
 * Clients receive sanitized JSON — never raw stack traces in production.
 */

// ─── 1. Load environment variables FIRST ─────────────────────────────────────
require('dotenv').config();

const express = require('express');
const cors    = require('cors');

// ─── 2. Configs (must be required AFTER dotenv loads) ────────────────────────
const appConfig = require('./js/config/appConfig');

// ─── 3. Logger ────────────────────────────────────────────────────────────────
const { createLogger } = require('./js/utils/logger');
const logger = createLogger('server');

// ─── 4. Error middleware ──────────────────────────────────────────────────────
const { notFoundHandler, errorHandler } = require('./js/middleware/errorMiddleware');

// ─── 5. Auth middleware ───────────────────────────────────────────────────────
const { authenticate } = require('./js/middleware/authMiddleware');

// ─── 6. Routes ────────────────────────────────────────────────────────────────
const { authRouter }      = require('./js/routes/auth.routes');
const { workspaceRouter } = require('./js/routes/workspace.routes');
const { channelRouter }   = require('./js/routes/channel.routes');
const { messageRouter }   = require('./js/routes/message.routes');
const { fileRouter }      = require('./js/routes/file.routes');
const { voiceRouter }     = require('./js/routes/voice.routes');
const { paymentRouter }   = require('./js/routes/payment.routes');
const { adminRouter }     = require('./js/routes/admin.routes');

// ─── 7. Express App ───────────────────────────────────────────────────────────

const app  = express();
const PORT = appConfig.port || parseInt(process.env.PORT || '4000', 10);

// ─── 8. CORS ──────────────────────────────────────────────────────────────────

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (curl, mobile, server-to-server)
    if (!origin) return callback(null, true);
    if (appConfig.cors.allowedOrigins.includes(origin)) return callback(null, true);
    logger.warn(`CORS blocked origin: ${origin}`);
    callback(new Error(`Origin ${origin} not allowed by CORS`));
  },
  credentials: true,
  methods: appConfig.cors.allowedMethods,
  allowedHeaders: appConfig.cors.allowedHeaders,
}));

// ─── 9. Body parsers ──────────────────────────────────────────────────────────

// NOTE: express.raw() for webhook is registered ON the payment router's webhook route.
// All other routes use JSON.
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── 10. Request logger ───────────────────────────────────────────────────────

app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const ms     = Date.now() - start;
    const status = res.statusCode;
    // Color-code by status in terminal
    const color  = status >= 500 ? '\x1b[31m' : status >= 400 ? '\x1b[33m' : '\x1b[32m';
    const reset  = '\x1b[0m';
    const uid    = req.user ? req.user.uid : '-';
    logger.info(`${color}${req.method} ${req.path} ${status}${reset} — ${ms}ms  uid:${uid}`);
  });
  next();
});

// ─── 11. Health / Root ────────────────────────────────────────────────────────

app.get('/health', (_req, res) => {
  res.status(200).json({
    status:      'healthy',
    timestamp:   new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version:     '1.0.0',
  });
});

app.get('/', (_req, res) => {
  res.status(200).json({ name: 'Obsidian Backend API', version: '1.0.0', documentation: '/api/v1' });
});

// ─── 12. API Routes ───────────────────────────────────────────────────────────

// Public
app.use('/api/v1/auth',       authRouter);

// paymentRouter handles its own auth internally (public + authenticated split)
app.use('/api/v1/payments',   paymentRouter);

// Protected — authenticate applied here at the top level
app.use('/api/v1/workspaces', authenticate, workspaceRouter);
app.use('/api/v1/channels',   authenticate, channelRouter);
app.use('/api/v1/messages',   authenticate, messageRouter);
app.use('/api/v1/files',      authenticate, fileRouter);
app.use('/api/v1/voice',      authenticate, voiceRouter);
app.use('/api/v1/admin',      authenticate, adminRouter);

// ─── 13. 404 + Global Error Handler ──────────────────────────────────────────

app.use(notFoundHandler);   // must come before errorHandler
app.use(errorHandler);      // 4-argument function — Express detects it as error handler

// ─── 14. Process-level error catchers (terminal only) ─────────────────────────

process.on('uncaughtException', (err) => {
  // Print full stack to terminal — never reaches the client
  console.error('\x1b[31m[FATAL] Uncaught Exception:\x1b[0m');
  console.error(err);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('\x1b[31m[FATAL] Unhandled Promise Rejection:\x1b[0m');
  console.error(reason);
  process.exit(1);
});

// ─── 15. Start ────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  const green  = '\x1b[32m';
  const cyan   = '\x1b[36m';
  const yellow = '\x1b[33m';
  const reset  = '\x1b[0m';
  const bold   = '\x1b[1m';

  console.log('');
  console.log(`${bold}${green}  🚀  Obsidian API is running${reset}`);
  console.log(`${cyan}  ►  http://localhost:${PORT}${reset}`);
  console.log(`${cyan}  ►  Health: http://localhost:${PORT}/health${reset}`);
  console.log(`${yellow}  ►  Environment: ${process.env.NODE_ENV || 'development'}${reset}`);
  console.log(`${yellow}  ►  Start cmd: npx nodemon server.js${reset}`);
  console.log('');

  logger.info(`Server listening on port ${PORT}`);
});

module.exports = app; // for testing
