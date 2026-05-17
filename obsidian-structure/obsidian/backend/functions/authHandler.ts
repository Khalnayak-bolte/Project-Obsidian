/**
 * backend/functions/authHandler.ts
 * Project: Obsidian
 *
 * AWS Lambda entry point for all /api/v1/auth/* routes.
 * Wraps the Express authRouter with serverless-http so the same
 * Express middleware stack (rate limiting, error handling, logging)
 * runs unchanged inside Lambda.
 *
 * Deployed as: obsidian-auth-{stage}
 * Trigger:      API Gateway ANY /api/v1/auth/{proxy+}
 */

import express from "express";
import cors from "cors";
import serverless from "serverless-http";
import appConfig from "../config/appConfig";
import { attachRequestId, httpLogger } from "../middleware/loggingMiddleware";
import { notFoundHandler, errorHandler } from "../middleware/errorMiddleware";
import { authRouter } from "../routes/auth.routes";
import { createLogger } from "../utils/logger";

const logger = createLogger("authHandler");

// ─── Express app ──────────────────────────────────────────────────────────────

const app = express();

// ── CORS ──────────────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: appConfig.cors.allowedOrigins,
    methods: appConfig.cors.allowedMethods,
    allowedHeaders: appConfig.cors.allowedHeaders,
    credentials: true,
  })
);

// ── Body parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

// ── Request lifecycle ─────────────────────────────────────────────────────────
app.use(attachRequestId);
app.use(httpLogger);

// ── Health check ──────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok", service: "auth" });
});

// ── Routes ────────────────────────────────────────────────────────────────────
app.use(`${appConfig.apiPrefix}/auth`, authRouter);

// ── Error handling ────────────────────────────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

// ─── Lambda handler ───────────────────────────────────────────────────────────

export const handler = serverless(app, {
  binary: false,
  request(request: express.Request, event: Record<string, unknown>) {
    // Propagate Lambda request context for logging / tracing
    (request as express.Request & { lambdaEvent: unknown }).lambdaEvent = event;
  },
});

logger.info("authHandler initialised", {
  prefix: `${appConfig.apiPrefix}/auth`,
  env: appConfig.env,
});
