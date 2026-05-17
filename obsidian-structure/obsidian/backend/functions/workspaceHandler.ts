/**
 * backend/functions/workspaceHandler.ts
 * Project: Obsidian
 *
 * AWS Lambda entry point for workspace, channel, message, and admin routes.
 * Groups these four routers into a single Lambda function to reduce cold-start
 * overhead and keep inter-related resources co-located.
 *
 * Deployed as: obsidian-workspace-{stage}
 * Trigger:      API Gateway ANY /api/v1/{workspaces,channels,messages,admin}/{proxy+}
 */

import express from "express";
import cors from "cors";
import serverless from "serverless-http";
import appConfig from "../config/appConfig";
import { attachRequestId, httpLogger } from "../middleware/loggingMiddleware";
import { notFoundHandler, errorHandler } from "../middleware/errorMiddleware";
import { workspaceRouter } from "../routes/workspace.routes";
import { channelRouter } from "../routes/channel.routes";
import { messageRouter } from "../routes/message.routes";
import { adminRouter } from "../routes/admin.routes";
import { createLogger } from "../utils/logger";

const logger = createLogger("workspaceHandler");

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
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));

// ── Request lifecycle ─────────────────────────────────────────────────────────
app.use(attachRequestId);
app.use(httpLogger);

// ── Health check ──────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok", service: "workspace" });
});

// ── Routes ────────────────────────────────────────────────────────────────────
app.use(`${appConfig.apiPrefix}/workspaces`, workspaceRouter);
app.use(`${appConfig.apiPrefix}/channels`, channelRouter);
app.use(`${appConfig.apiPrefix}/messages`, messageRouter);
app.use(`${appConfig.apiPrefix}/admin`, adminRouter);

// ── Error handling ────────────────────────────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

// ─── Lambda handler ───────────────────────────────────────────────────────────

export const handler = serverless(app, {
  binary: false,
  request(request: express.Request, event: Record<string, unknown>) {
    (request as express.Request & { lambdaEvent: unknown }).lambdaEvent = event;
  },
});

logger.info("workspaceHandler initialised", {
  prefixes: ["workspaces", "channels", "messages", "admin"].map(
    (r) => `${appConfig.apiPrefix}/${r}`
  ),
  env: appConfig.env,
});
