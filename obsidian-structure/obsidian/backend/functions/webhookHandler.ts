/**
 * backend/functions/webhookHandler.ts
 * Project: Obsidian
 *
 * Dedicated AWS Lambda entry point for Razorpay webhook events.
 *
 * This handler is intentionally separate from paymentHandler so that:
 *  - Webhook retries from Razorpay never compete with user-facing API traffic
 *  - IAM permissions can be scoped to billing secrets only
 *  - Failures trigger independent CloudWatch alarms
 *
 * Security model:
 *  - API Gateway passes the raw body as a string (no JSON parsing at gateway level)
 *  - HMAC-SHA256 signature is verified before any business logic runs
 *  - Replay attacks are prevented via timestamp tolerance + Firestore deduplication
 *
 * Deployed as: obsidian-webhook-{stage}
 * Trigger:      API Gateway POST /api/v1/payments/webhook
 *               (separate from the paymentHandler route — direct Lambda integration)
 */

import type {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context,
} from "aws-lambda";
import { createLogger } from "../utils/logger";
import { verifyRazorpayWebhook, isWebhookTimestampFresh } from "../utils/hmac";
import { RAZORPAY_WEBHOOK } from "../config/razorpay";
import { RazorpayWebhookSchema } from "../schemas/payment.schema";
import { handleWebhook } from "../services/billingService";
import { notifyBillingAlert } from "../services/notificationService";
import { db, COLLECTIONS, Timestamp } from "../config/firebase";
import { generateWebhookId } from "../utils/helpers";
import { ERROR_CODES } from "../types/common";

const logger = createLogger("webhookHandler");

// ─── Response helpers ─────────────────────────────────────────────────────────

function ok(body: Record<string, unknown> = { received: true }): APIGatewayProxyResult {
  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

function reject(message: string, statusCode = 400): APIGatewayProxyResult {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ received: false, error: message }),
  };
}

// ─── Lambda handler ───────────────────────────────────────────────────────────

export async function handler(
  event: APIGatewayProxyEvent,
  _context: Context
): Promise<APIGatewayProxyResult> {
  const requestId =
    event.requestContext?.requestId ?? `whk_${Date.now()}`;

  logger.info("Webhook event received", {
    requestId,
    source: event.headers["x-razorpay-signature"] ? "razorpay" : "unknown",
  });

  // ── 1. Extract raw body ────────────────────────────────────────────────────
  const rawBody = event.isBase64Encoded
    ? Buffer.from(event.body ?? "", "base64").toString("utf8")
    : (event.body ?? "");

  if (!rawBody) {
    logger.warn("Empty webhook body", { requestId });
    return reject("Empty request body.");
  }

  // ── 2. Extract & validate signature header ────────────────────────────────
  const signature =
    event.headers["x-razorpay-signature"] ??
    event.headers["X-Razorpay-Signature"];

  if (!signature) {
    logger.warn("Missing Razorpay signature header", { requestId });
    return reject("Missing x-razorpay-signature header.", 400);
  }

  // ── 3. Verify HMAC signature ──────────────────────────────────────────────
  const isValidSignature = verifyRazorpayWebhook(
    rawBody,
    signature,
    RAZORPAY_WEBHOOK.secret
  );

  if (!isValidSignature) {
    logger.error("Invalid webhook signature — possible forgery", {
      requestId,
      signaturePrefix: signature.slice(0, 8),
    });
    return reject("Invalid webhook signature.", 400);
  }

  // ── 4. Parse payload ──────────────────────────────────────────────────────
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    logger.error("Webhook body is not valid JSON", { requestId });
    return reject("Invalid JSON payload.");
  }

  const parseResult = RazorpayWebhookSchema.safeParse(parsed);
  if (!parseResult.success) {
    logger.error("Webhook schema validation failed", {
      requestId,
      errors: parseResult.error.flatten(),
    });
    return reject("Webhook payload failed schema validation.");
  }

  const webhookBody = parseResult.data;

  // ── 5. Timestamp freshness check ──────────────────────────────────────────
  if (!isWebhookTimestampFresh(webhookBody.created_at)) {
    logger.warn("Stale webhook timestamp rejected", {
      requestId,
      created_at: webhookBody.created_at,
      now: Math.floor(Date.now() / 1000),
    });
    return reject("Webhook timestamp outside acceptable window.");
  }

  // ── 6. Idempotency — check for duplicate delivery ────────────────────────
  const entityId =
    webhookBody.payload.payment?.entity.id ??
    webhookBody.payload.subscription?.entity.id ??
    webhookBody.payload.refund?.entity.id ??
    String(webhookBody.created_at);

  const dedupeKey = `${webhookBody.event}:${entityId}`;
  const dedupeRef = db.collection("webhookLogs").doc(dedupeKey);

  const existing = await dedupeRef.get();
  if (existing.exists) {
    logger.info("Duplicate webhook ignored", { requestId, dedupeKey });
    return ok({ received: true, duplicate: true });
  }

  // Write dedupe record immediately before processing
  const webhookId = generateWebhookId();
  await dedupeRef.set({
    webhookId,
    event: webhookBody.event,
    razorpayEventId: dedupeKey,
    processed: false,
    receivedAt: Timestamp.now(),
  });

  // ── 7. Delegate to billing service ────────────────────────────────────────
  try {
    await handleWebhook(
      webhookBody,
      signature,
      Buffer.from(rawBody),
      String(webhookBody.created_at)
    );

    // Mark as processed
    await dedupeRef.update({
      processed: true,
      processedAt: Timestamp.now(),
    });

    logger.info("Webhook processed successfully", {
      requestId,
      webhookId,
      event: webhookBody.event,
    });

    return ok({ received: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";

    logger.error("Webhook processing failed", {
      requestId,
      webhookId,
      event: webhookBody.event,
      error: message,
    });

    // Record processing error in dedupe doc for audit / retry visibility
    await dedupeRef.update({
      processed: false,
      processingError: message,
    }).catch(() => {/* best-effort */});

    // Notify workspace owner of billing failure if payment-related
    if (
      webhookBody.event === "payment.failed" &&
      webhookBody.payload.payment?.entity
    ) {
      const notes = (webhookBody.payload.payment.entity as Record<string, unknown>);
      const workspaceId = (notes as Record<string, unknown>)?.notes as string | undefined;
      if (workspaceId) {
        await notifyBillingAlert({
          workspaceId,
          title: "Payment Failed",
          body: "Your recent payment could not be processed. Please update your payment details.",
          type: "payment_failed",
        }).catch(() => {/* best-effort */});
      }
    }

    // Return 200 to prevent Razorpay from retrying non-security errors.
    // The error is logged and stored; manual recovery is via admin dashboard.
    return ok({ received: true, processingError: true });
  }
}
