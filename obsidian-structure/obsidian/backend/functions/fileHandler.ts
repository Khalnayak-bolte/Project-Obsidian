/**
 * backend/functions/fileHandler.ts
 * Project: Obsidian
 *
 * AWS Lambda entry point for all /api/v1/files/* routes.
 * File operations (signed URL generation, metadata confirmation, listing)
 * are isolated in their own Lambda so upload-heavy workloads don't
 * affect voice or messaging latency.
 *
 * Note: actual file bytes are transferred directly between the client and S3
 * via pre-signed URLs — they never pass through this Lambda.
 *
 * Deployed as: obsidian-file-{stage}
 * Trigger:      API Gateway ANY /api/v1/files/{proxy+}
 */

import express from "express";
import cors from "cors";
import serverless from "serverless-http";
import appConfig from "../config/appConfig";
import { attachRequestId, httpLogger } from "../middleware/loggingMiddleware";
import { notFoundHandler, errorHandler } from "../middleware/errorMiddleware";
import { fileRouter } from "../routes/file.routes";
import { createLogger } from "../utils/logger";

const logger = createLogger("fileHandler");

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
// File metadata payloads are small; actual bytes go direct to S3
app.use(express.json({ limit: "512kb" }));
app.use(express.urlencoded({ extended: true, limit: "512kb" }));

// ── Request lifecycle ─────────────────────────────────────────────────────────
app.use(attachRequestId);
app.use(httpLogger);

// ── Health check ──────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok", service: "file" });
});

// ── Routes ────────────────────────────────────────────────────────────────────
app.use(`${appConfig.apiPrefix}/files`, fileRouter);

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

logger.info("fileHandler initialised", {
  prefix: `${appConfig.apiPrefix}/files`,
  env: appConfig.env,
});
