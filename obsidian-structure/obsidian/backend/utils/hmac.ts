/**
 * backend/utils/hmac.ts
 * Project: Obsidian
 */

import * as crypto from "crypto";
import { createLogger } from "./logger";

const logger = createLogger("hmac");

// ─── Constants ────────────────────────────────────────────────────────────────

const ALGORITHM = "sha256";
const ENCODING = "hex";

/** Replay-attack window: reject webhooks older than 5 minutes. */
const WEBHOOK_TIMESTAMP_TOLERANCE_MS = 5 * 60 * 1000;

// ─── Core HMAC ────────────────────────────────────────────────────────────────

/**
 * Generates a hex HMAC-SHA256 digest of the given payload using the secret.
 */
export function generateHmac(payload: string, secret: string): string {
  return crypto
    .createHmac(ALGORITHM, secret)
    .update(payload, "utf8")
    .digest(ENCODING);
}

/**
 * Constant-time comparison of two HMAC strings.
 * Returns true only when both are equal in length and content.
 */
export function compareHmac(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(a, ENCODING);
    const bufB = Buffer.from(b, ENCODING);
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

/**
 * Verifies a raw payload against an expected HMAC signature.
 */
export function verifyHmac(
  payload: string,
  secret: string,
  expectedSignature: string
): boolean {
  const computed = generateHmac(payload, secret);
  return compareHmac(computed, expectedSignature);
}

// ─── Razorpay webhook verification ───────────────────────────────────────────

/**
 * Verifies a Razorpay webhook signature.
 *
 * Razorpay signs the raw request body with HMAC-SHA256 using the
 * webhook secret and sends the result in the `x-razorpay-signature` header.
 *
 * @param rawBody      Raw request body string (before JSON.parse).
 * @param signature    Value of `x-razorpay-signature` header.
 * @param secret       Razorpay webhook secret from Secrets Manager.
 */
export function verifyRazorpayWebhook(
  rawBody: string,
  signature: string,
  secret: string
): boolean {
  if (!rawBody || !signature || !secret) {
    logger.warn("Razorpay webhook verification called with missing parameters");
    return false;
  }

  const valid = verifyHmac(rawBody, secret, signature);

  if (!valid) {
    logger.warn("Razorpay webhook signature mismatch", {
      signatureReceived: signature.slice(0, 8) + "...",
    });
  }

  return valid;
}

/**
 * Verifies a Razorpay payment signature (order + payment ID pair).
 *
 * Used after Razorpay checkout completes on the frontend to confirm
 * the payment is genuine before updating the workspace tier.
 *
 * Signing input: `${orderId}|${paymentId}`
 *
 * @param orderId    Razorpay order ID.
 * @param paymentId  Razorpay payment ID returned after checkout.
 * @param signature  `razorpay_signature` field from checkout response.
 * @param secret     Razorpay key secret from Secrets Manager.
 */
export function verifyRazorpayPaymentSignature(
  orderId: string,
  paymentId: string,
  signature: string,
  secret: string
): boolean {
  if (!orderId || !paymentId || !signature || !secret) {
    logger.warn("Razorpay payment verification called with missing parameters");
    return false;
  }

  const payload = `${orderId}|${paymentId}`;
  const valid = verifyHmac(payload, secret, signature);

  if (!valid) {
    logger.warn("Razorpay payment signature mismatch", {
      orderId,
      paymentId,
    });
  }

  return valid;
}

// ─── Webhook timestamp validation ────────────────────────────────────────────

/**
 * Validates that a webhook timestamp is within the acceptable replay window.
 *
 * @param createdAt  Unix epoch seconds from the webhook payload's `created_at` field.
 */
export function isWebhookTimestampFresh(createdAt: number): boolean {
  const now = Date.now();
  const eventTime = createdAt * 1000; // convert to ms
  const age = now - eventTime;

  if (age < 0) {
    // Future-dated event — clock skew or replay attempt
    logger.warn("Webhook timestamp is in the future", { createdAt, now });
    return false;
  }

  if (age > WEBHOOK_TIMESTAMP_TOLERANCE_MS) {
    logger.warn("Webhook timestamp too old — possible replay attack", {
      createdAt,
      ageSeconds: Math.floor(age / 1000),
      toleranceSeconds: WEBHOOK_TIMESTAMP_TOLERANCE_MS / 1000,
    });
    return false;
  }

  return true;
}

// ─── Event deduplication ──────────────────────────────────────────────────────

/**
 * Builds a deterministic deduplication key for a webhook event.
 * Stored in Firestore `_webhookLogs` to prevent processing the same event twice.
 *
 * @param eventId    Razorpay `event` field (e.g. "payment.captured").
 * @param entityId   ID of the primary entity in the payload (e.g. payment ID).
 */
export function buildWebhookDedupeKey(
  eventId: string,
  entityId: string
): string {
  return crypto
    .createHash(ALGORITHM)
    .update(`${eventId}:${entityId}`)
    .digest(ENCODING)
    .slice(0, 32);
}

// ─── Internal request signing ─────────────────────────────────────────────────

/**
 * Signs an internal service-to-service request payload.
 * Lambda functions calling each other include this in the `x-obs-hmac` header.
 *
 * @param payload   JSON string of the request body.
 * @param secret    Shared internal secret from AWS Secrets Manager.
 * @param timestamp Unix epoch ms — included to prevent replay attacks.
 */
export function signInternalRequest(
  payload: string,
  secret: string,
  timestamp: number = Date.now()
): { signature: string; timestamp: number } {
  const signingInput = `${timestamp}.${payload}`;
  const signature = generateHmac(signingInput, secret);
  return { signature, timestamp };
}

/**
 * Verifies an internal service-to-service request signature.
 *
 * @param payload    Raw request body string.
 * @param signature  Value of `x-obs-hmac` header.
 * @param timestamp  Value of `x-obs-timestamp` header (epoch ms).
 * @param secret     Shared internal secret.
 */
export function verifyInternalRequest(
  payload: string,
  signature: string,
  timestamp: number,
  secret: string
): boolean {
  // Timestamp freshness check (reuse webhook tolerance)
  const age = Date.now() - timestamp;
  if (age < 0 || age > WEBHOOK_TIMESTAMP_TOLERANCE_MS) {
    logger.warn("Internal request timestamp out of window", {
      timestamp,
      ageMs: age,
    });
    return false;
  }

  const signingInput = `${timestamp}.${payload}`;
  return verifyHmac(signingInput, secret, signature);
}

// ─── Utility ──────────────────────────────────────────────────────────────────

/**
 * Generates a cryptographically random hex string of the given byte length.
 * Used for nonces, idempotency keys, and webhook secrets.
 */
export function generateSecureToken(byteLength = 32): string {
  return crypto.randomBytes(byteLength).toString(ENCODING);
}

/**
 * SHA-256 hashes a string and returns the hex digest.
 * Used for storing refresh tokens and invite tokens safely.
 */
export function sha256(input: string): string {
  return crypto.createHash(ALGORITHM).update(input, "utf8").digest(ENCODING);
}
