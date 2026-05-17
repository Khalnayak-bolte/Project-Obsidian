/**
 * backend/functions/paymentHandler.ts
 * Project: Obsidian
 *
 * AWS Lambda entry point for all /api/v1/payments/* routes.
 * Payment operations are isolated in their own Lambda for:
 *  - Independent scaling during billing spikes
 *  - Tighter IAM permissions (Secrets Manager access for Razorpay keys)
 *  - Separate CloudWatch alarm thresholds for payment failures
 *
 * The /webhook sub-route uses express.raw() (wired in payment.routes.ts)
 * to preserve the raw body bytes required for HMAC signature verification.
 *
 * Deployed as: obsidian-payment-{stage}
 * Trigger:      API Gateway ANY /api/v1/payments/{proxy+}
 */

import express from "express";
import cors from "cors";
import serverless from "serverless-http";
import appConfig from "../config/appConfig";
import { attachRequestId, httpLogger } from "../middleware/loggingMiddleware";
import { notFoundHandler, errorHandler } from "../middleware/errorMiddleware";
import { paymentRouter } from "../routes/payment.routes";
import { createLogger } from "../utils/logger";

const logger = createLogger("paymentHandler");

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
// express.json() for all routes except /webhook which uses express.raw()
// (express.raw() is applied per-route inside payment.routes.ts before
//  the global json parser can consume the stream).
app.use(
  (req, _res, next) => {
    // Skip JSON parsing for the webhook route — it uses raw() in the router
    if (req.path === "/webhook" || req.path.endsWith("/payments/webhook")) {
      return next();
    }
    express.json({ limit: "1mb" })(req, _res, next);
  }
);
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

// ── Request lifecycle ─────────────────────────────────────────────────────────
app.use(attachRequestId);
app.use(httpLogger);

// ── Health check ──────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok", service: "payment" });
});

// ── Routes ────────────────────────────────────────────────────────────────────
app.use(`${appConfig.apiPrefix}/payments`, paymentRouter);

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

logger.info("paymentHandler initialised", {
  prefix: `${appConfig.apiPrefix}/payments`,
  env: appConfig.env,
});
