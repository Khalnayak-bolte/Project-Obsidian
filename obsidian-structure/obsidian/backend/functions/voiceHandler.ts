/**
 * backend/functions/voiceHandler.ts
 * Project: Obsidian
 *
 * AWS Lambda entry point for all /api/v1/voice/* routes.
 * Voice is isolated in its own Lambda to allow independent scaling —
 * voice join/leave events are high-frequency and latency-sensitive.
 *
 * Deployed as: obsidian-voice-{stage}
 * Trigger:      API Gateway ANY /api/v1/voice/{proxy+}
 * Region:       ap-south-1 (Mumbai) — closest to target user base
 */

import express from "express";
import cors from "cors";
import serverless from "serverless-http";
import appConfig from "../config/appConfig";
import { attachRequestId, httpLogger } from "../middleware/loggingMiddleware";
import { notFoundHandler, errorHandler } from "../middleware/errorMiddleware";
import { voiceRouter } from "../routes/voice.routes";
import { createLogger } from "../utils/logger";

const logger = createLogger("voiceHandler");

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
// Voice payloads are small — keep limit tight
app.use(express.json({ limit: "256kb" }));
app.use(express.urlencoded({ extended: true, limit: "256kb" }));

// ── Request lifecycle ─────────────────────────────────────────────────────────
app.use(attachRequestId);
app.use(httpLogger);

// ── Health check ──────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok", service: "voice" });
});

// ── Routes ────────────────────────────────────────────────────────────────────
app.use(`${appConfig.apiPrefix}/voice`, voiceRouter);

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

logger.info("voiceHandler initialised", {
  prefix: `${appConfig.apiPrefix}/voice`,
  mediaRegion: appConfig.voice.mediaRegion,
  env: appConfig.env,
});
