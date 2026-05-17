/**
 * backend/middleware/loggingMiddleware.ts
 * Project: Obsidian
 *
 * HTTP request/response logging middleware.
 * Attaches a unique requestId to every request, logs inbound metadata,
 * then logs the outbound result (status, latency) once the response finishes.
 * Structured JSON in production (CloudWatch-friendly); coloured dev output otherwise.
 */

import type { Request, Response, NextFunction } from "express";
import { randomUUID } from "crypto";
import { createLogger } from "../utils/logger";
import { HEADERS } from "../utils/constants";

const logger = createLogger("http");

// ─── Paths that should never be logged (health / metrics) ────────────────────

const SILENT_PATHS = new Set(["/health", "/ping", "/favicon.ico"]);

// ─── Sanitise sensitive header values before logging ─────────────────────────

const REDACTED = "[REDACTED]";
const SENSITIVE_HEADERS = new Set([
  "authorization",
  "cookie",
  "set-cookie",
  "x-api-key",
  "x-razorpay-signature",
]);

function sanitiseHeaders(
  raw: Record<string, string | string[] | undefined>
): Record<string, string | string[] | undefined> {
  const out: Record<string, string | string[] | undefined> = {};
  for (const [key, value] of Object.entries(raw)) {
    out[key] = SENSITIVE_HEADERS.has(key.toLowerCase()) ? REDACTED : value;
  }
  return out;
}

// ─── Derive a short, readable route label from the URL ───────────────────────
// Strips query-strings and replaces UUIDs / Firebase IDs with ":id" so that
// high-cardinality URLs collapse into a single log category.

const ID_PATTERN =
  /\/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}|\/[a-zA-Z0-9_-]{20,}/g;

function routeLabel(url: string): string {
  return url.split("?")[0].replace(ID_PATTERN, "/:id");
}

// ─── Attach request-id early so downstream code can tag its own logs ─────────

export function attachRequestId(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  const incomingId =
    (req.headers[HEADERS.REQUEST_ID] as string | undefined) ?? randomUUID();

  // Expose on both the request object and the response headers
  (req as any).requestId = incomingId;
  _res.setHeader(HEADERS.REQUEST_ID, incomingId);

  next();
}

// ─── Main logging middleware ──────────────────────────────────────────────────

export function loggingMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const path = req.path ?? req.url ?? "/";

  // Skip noisy internal endpoints
  if (SILENT_PATHS.has(path)) {
    return next();
  }

  const requestId: string = (req as any).requestId ?? randomUUID();
  const startAt = process.hrtime.bigint();

  // ── Inbound log ────────────────────────────────────────────────────────────
  logger.info("→ incoming request", {
    requestId,
    method: req.method,
    route: routeLabel(req.originalUrl ?? req.url),
    path,
    query: Object.keys(req.query).length ? req.query : undefined,
    headers: sanitiseHeaders(req.headers as Record<string, string | string[] | undefined>),
    ip:
      (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0].trim() ??
      req.socket?.remoteAddress ??
      "unknown",
    uid: (req as any).user?.uid,
    workspaceId: (req as any).user?.workspaceId,
    contentLength: req.headers["content-length"]
      ? Number(req.headers["content-length"])
      : undefined,
    userAgent: req.headers["user-agent"],
  });

  // ── Outbound log (fires after response is sent) ───────────────────────────
  res.on("finish", () => {
    const elapsedMs = Number(process.hrtime.bigint() - startAt) / 1_000_000;
    const status = res.statusCode;

    const level =
      status >= 500 ? "error" : status >= 400 ? "warn" : "info";

    logger[level]("← outgoing response", {
      requestId,
      method: req.method,
      route: routeLabel(req.originalUrl ?? req.url),
      status,
      elapsedMs: parseFloat(elapsedMs.toFixed(2)),
      contentLength: res.getHeader("content-length")
        ? Number(res.getHeader("content-length"))
        : undefined,
      uid: (req as any).user?.uid,
      workspaceId: (req as any).user?.workspaceId,
    });
  });

  // ── Error path: socket closed before finish ────────────────────────────────
  res.on("close", () => {
    if (!res.writableEnded) {
      const elapsedMs = Number(process.hrtime.bigint() - startAt) / 1_000_000;
      logger.warn("← connection closed before response finished", {
        requestId,
        method: req.method,
        route: routeLabel(req.originalUrl ?? req.url),
        elapsedMs: parseFloat(elapsedMs.toFixed(2)),
        uid: (req as any).user?.uid,
      });
    }
  });

  next();
}

// ─── Convenience: combined attach + log (single-use registration) ─────────────

export function httpLogger(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  attachRequestId(req, res, () => loggingMiddleware(req, res, next));
}
