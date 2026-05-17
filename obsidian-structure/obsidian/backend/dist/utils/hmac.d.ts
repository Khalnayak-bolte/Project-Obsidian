/**
 * backend/utils/hmac.ts
 * Project: Obsidian
 */
/**
 * Generates a hex HMAC-SHA256 digest of the given payload using the secret.
 */
export declare function generateHmac(payload: string, secret: string): string;
/**
 * Constant-time comparison of two HMAC strings.
 * Returns true only when both are equal in length and content.
 */
export declare function compareHmac(a: string, b: string): boolean;
/**
 * Verifies a raw payload against an expected HMAC signature.
 */
export declare function verifyHmac(payload: string, secret: string, expectedSignature: string): boolean;
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
export declare function verifyRazorpayWebhook(rawBody: string, signature: string, secret: string): boolean;
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
export declare function verifyRazorpayPaymentSignature(orderId: string, paymentId: string, signature: string, secret: string): boolean;
/**
 * Validates that a webhook timestamp is within the acceptable replay window.
 *
 * @param createdAt  Unix epoch seconds from the webhook payload's `created_at` field.
 */
export declare function isWebhookTimestampFresh(createdAt: number): boolean;
/**
 * Builds a deterministic deduplication key for a webhook event.
 * Stored in Firestore `_webhookLogs` to prevent processing the same event twice.
 *
 * @param eventId    Razorpay `event` field (e.g. "payment.captured").
 * @param entityId   ID of the primary entity in the payload (e.g. payment ID).
 */
export declare function buildWebhookDedupeKey(eventId: string, entityId: string): string;
/**
 * Signs an internal service-to-service request payload.
 * Lambda functions calling each other include this in the `x-obs-hmac` header.
 *
 * @param payload   JSON string of the request body.
 * @param secret    Shared internal secret from AWS Secrets Manager.
 * @param timestamp Unix epoch ms — included to prevent replay attacks.
 */
export declare function signInternalRequest(payload: string, secret: string, timestamp?: number): {
    signature: string;
    timestamp: number;
};
/**
 * Verifies an internal service-to-service request signature.
 *
 * @param payload    Raw request body string.
 * @param signature  Value of `x-obs-hmac` header.
 * @param timestamp  Value of `x-obs-timestamp` header (epoch ms).
 * @param secret     Shared internal secret.
 */
export declare function verifyInternalRequest(payload: string, signature: string, timestamp: number, secret: string): boolean;
/**
 * Generates a cryptographically random hex string of the given byte length.
 * Used for nonces, idempotency keys, and webhook secrets.
 */
export declare function generateSecureToken(byteLength?: number): string;
/**
 * SHA-256 hashes a string and returns the hex digest.
 * Used for storing refresh tokens and invite tokens safely.
 */
export declare function sha256(input: string): string;
//# sourceMappingURL=hmac.d.ts.map