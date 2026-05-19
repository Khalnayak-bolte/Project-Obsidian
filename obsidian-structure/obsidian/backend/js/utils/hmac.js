'use strict';
// js/utils/hmac.js

const crypto = require('crypto');
const { createLogger } = require('./logger');

const logger = createLogger('hmac');
const ALGORITHM = 'sha256';
const ENCODING  = 'hex';
const WEBHOOK_TIMESTAMP_TOLERANCE_MS = 5 * 60 * 1000;

function generateHmac(payload, secret) {
  return crypto.createHmac(ALGORITHM, secret).update(payload, 'utf8').digest(ENCODING);
}

function compareHmac(a, b) {
  try {
    const bufA = Buffer.from(a, ENCODING);
    const bufB = Buffer.from(b, ENCODING);
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

function verifyHmac(payload, secret, expectedSignature) {
  return compareHmac(generateHmac(payload, secret), expectedSignature);
}

function verifyRazorpayWebhook(rawBody, signature, secret) {
  if (!rawBody || !signature || !secret) {
    logger.warn('Razorpay webhook verification called with missing parameters');
    return false;
  }
  const valid = verifyHmac(rawBody, secret, signature);
  if (!valid) logger.warn('Razorpay webhook signature mismatch');
  return valid;
}

function verifyRazorpayPaymentSignature(orderId, paymentId, signature, secret) {
  if (!orderId || !paymentId || !signature || !secret) {
    logger.warn('Razorpay payment verification called with missing parameters');
    return false;
  }
  const payload = `${orderId}|${paymentId}`;
  const valid   = verifyHmac(payload, secret, signature);
  if (!valid) logger.warn('Razorpay payment signature mismatch', { orderId, paymentId });
  return valid;
}

function isWebhookTimestampFresh(createdAt) {
  const now       = Date.now();
  const eventTime = createdAt * 1000;
  const age       = now - eventTime;
  if (age < 0) {
    logger.warn('Webhook timestamp is in the future', { createdAt });
    return false;
  }
  if (age > WEBHOOK_TIMESTAMP_TOLERANCE_MS) {
    logger.warn('Webhook timestamp too old — possible replay attack', { createdAt });
    return false;
  }
  return true;
}

function buildWebhookDedupeKey(eventId, entityId) {
  return crypto.createHash(ALGORITHM)
    .update(`${eventId}:${entityId}`)
    .digest(ENCODING)
    .slice(0, 32);
}

function generateSecureToken(byteLength = 32) {
  return crypto.randomBytes(byteLength).toString(ENCODING);
}

function sha256(input) {
  return crypto.createHash(ALGORITHM).update(input, 'utf8').digest(ENCODING);
}

module.exports = {
  generateHmac, compareHmac, verifyHmac,
  verifyRazorpayWebhook, verifyRazorpayPaymentSignature,
  isWebhookTimestampFresh, buildWebhookDedupeKey,
  generateSecureToken, sha256,
};
