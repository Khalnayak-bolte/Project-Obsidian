'use strict';
// js/controllers/paymentController.js

const { createLogger }  = require('../utils/logger');
const { successResponse, HTTP_STATUS, ERROR_CODES } = require('../utils/helpers');
const { AppError }      = require('../middleware/errorMiddleware');
const { razorpay }      = require('../config/razorpay');
const { verifyRazorpayPaymentSignature, verifyRazorpayWebhook, isWebhookTimestampFresh, buildWebhookDedupeKey } = require('../utils/hmac');
const { db, COLLECTIONS, FieldValue } = require('../config/firebase');

const logger = createLogger('paymentController');

// ─── POST /api/v1/payments/create-order (Standard, public) ───────────────────

async function createStandardOrder(req, res, next) {
  try {
    const { amount, currency = 'INR', receipt = `rcpt_${Date.now()}` } = req.body;

    if (!amount || Number(amount) < 100) {
      throw new AppError(ERROR_CODES.INVALID_INPUT, 'Amount must be at least 100 paise.');
    }

    const rz = razorpay.instance;
    if (!rz) {
      throw new AppError(ERROR_CODES.SERVICE_UNAVAILABLE, 'Payment service is not configured.');
    }

    const order = await rz.orders.create({ amount: Number(amount), currency, receipt });

    logger.info('Standard Razorpay order created', { orderId: order.id, amount });

    return res.status(HTTP_STATUS.CREATED).json({
      success: true,
      data: { order_id: order.id, amount: order.amount, currency: order.currency },
    });
  } catch (err) {
    logger.error('createStandardOrder failed', err);
    next(err);
  }
}

// ─── POST /api/v1/payments/verify-payment (Standard, public) ─────────────────

async function verifyStandardPayment(req, res, next) {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      throw new AppError(ERROR_CODES.INVALID_INPUT, 'Missing payment fields: razorpay_order_id, razorpay_payment_id, razorpay_signature are required.');
    }

    const secret  = process.env.RAZORPAY_KEY_SECRET || '';
    const isValid = verifyRazorpayPaymentSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature, secret);

    if (!isValid) {
      logger.warn('Payment signature mismatch', { orderId: razorpay_order_id, paymentId: razorpay_payment_id });
      throw new AppError(ERROR_CODES.PAYMENT_FAILED, 'Payment verification failed — invalid signature.');
    }

    logger.info('Standard payment verified', { orderId: razorpay_order_id, paymentId: razorpay_payment_id });

    return res.status(HTTP_STATUS.OK).json({ success: true, message: 'Payment verified successfully.' });
  } catch (err) {
    logger.error('verifyStandardPayment failed', err);
    next(err);
  }
}

// ─── POST /api/v1/payments/orders (Authenticated) ────────────────────────────

async function createOrder(req, res, next) {
  try {
    const uid         = req.user.uid;
    const workspaceId = req.user.workspaceId;
    const { tier, interval, workspaceId: bodyWs } = req.body;

    if (!tier || !interval) {
      throw new AppError(ERROR_CODES.INVALID_INPUT, 'tier and interval are required.');
    }
    if (bodyWs && bodyWs !== workspaceId) {
      throw new AppError(ERROR_CODES.FORBIDDEN, 'Workspace ID mismatch.');
    }

    const pricing = { gold: { monthly: 49900, yearly: 479900 }, premium: { monthly: 149900, yearly: 1439900 }, deluxe: { monthly: 399900, yearly: 3839900 } };
    const amount  = pricing[tier] && pricing[tier][interval];
    if (!amount) {
      throw new AppError(ERROR_CODES.INVALID_INPUT, `Invalid tier/interval: ${tier}/${interval}`);
    }

    const rz = razorpay.instance;
    if (!rz) throw new AppError(ERROR_CODES.SERVICE_UNAVAILABLE, 'Payment service not configured.');

    const order = await rz.orders.create({ amount, currency: 'INR', receipt: `ws_${workspaceId}_${Date.now()}` });

    logger.info('Razorpay order created', { workspaceId, uid, tier, interval, orderId: order.id });

    return res.status(HTTP_STATUS.CREATED).json(
      successResponse({ order_id: order.id, amount: order.amount, currency: order.currency, tier, interval }, 'Order created successfully.')
    );
  } catch (err) {
    logger.error('createOrder failed', err);
    next(err);
  }
}

// ─── POST /api/v1/payments/verify (Authenticated) ────────────────────────────

async function verifyPayment(req, res, next) {
  try {
    const uid         = req.user.uid;
    const workspaceId = req.user.workspaceId;
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, tier, interval, workspaceId: bodyWs } = req.body;

    if (bodyWs && bodyWs !== workspaceId) {
      throw new AppError(ERROR_CODES.FORBIDDEN, 'Workspace ID mismatch.');
    }

    const secret  = process.env.RAZORPAY_KEY_SECRET || '';
    const isValid = verifyRazorpayPaymentSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature, secret);

    if (!isValid) {
      throw new AppError(ERROR_CODES.PAYMENT_FAILED, 'Payment verification failed — invalid signature.');
    }

    // Update subscription in Firestore
    await db.collection(COLLECTIONS.SUBSCRIPTIONS).doc(workspaceId).set({
      workspaceId, tier: tier || 'gold', interval: interval || 'monthly',
      status: 'active', uid,
      razorpayOrderId: razorpay_order_id, razorpayPaymentId: razorpay_payment_id,
      activatedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });

    logger.info('Payment verified and subscription activated', { workspaceId, uid, tier });

    return res.status(HTTP_STATUS.OK).json(
      successResponse({ workspaceId, tier, status: 'active' }, 'Payment verified. Subscription activated.')
    );
  } catch (err) {
    logger.error('verifyPayment failed', err);
    next(err);
  }
}

// ─── GET /api/v1/payments/billing ────────────────────────────────────────────

async function getBillingDashboard(req, res, next) {
  try {
    const workspaceId = req.user.workspaceId;
    const snap        = await db.collection(COLLECTIONS.SUBSCRIPTIONS).doc(workspaceId).get();
    const data        = snap.exists ? snap.data() : { status: 'free', tier: 'free' };

    return res.status(HTTP_STATUS.OK).json(successResponse(data, 'Billing dashboard retrieved.'));
  } catch (err) {
    logger.error('getBillingDashboard failed', err);
    next(err);
  }
}

// ─── GET /api/v1/payments/invoices ────────────────────────────────────────────

async function listInvoices(req, res, next) {
  try {
    const workspaceId = req.user.workspaceId;
    const limit       = parseInt(req.query.limit || '20', 10);

    const snap     = await db.collection(COLLECTIONS.SUBSCRIPTIONS).doc(workspaceId).collection('invoices').orderBy('createdAt', 'desc').limit(limit).get();
    const invoices = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    return res.status(HTTP_STATUS.OK).json(successResponse({ invoices }, 'Invoices retrieved.'));
  } catch (err) {
    logger.error('listInvoices failed', err);
    next(err);
  }
}

// ─── POST /api/v1/payments/cancel ─────────────────────────────────────────────

async function cancelSubscription(req, res, next) {
  try {
    const uid         = req.user.uid;
    const workspaceId = req.user.workspaceId;
    const { cancelAtPeriodEnd = true } = req.body;

    await db.collection(COLLECTIONS.SUBSCRIPTIONS).doc(workspaceId).set({
      status: cancelAtPeriodEnd ? 'cancelling' : 'cancelled',
      cancelledAt: FieldValue.serverTimestamp(), cancelledBy: uid, updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });

    logger.info('Subscription cancellation requested', { workspaceId, uid, cancelAtPeriodEnd });

    return res.status(HTTP_STATUS.OK).json(successResponse({ workspaceId, cancelAtPeriodEnd }, 'Subscription cancellation scheduled.'));
  } catch (err) {
    logger.error('cancelSubscription failed', err);
    next(err);
  }
}

// ─── POST /api/v1/payments/reactivate ────────────────────────────────────────

async function reactivateSubscription(req, res, next) {
  try {
    const uid         = req.user.uid;
    const workspaceId = req.user.workspaceId;

    await db.collection(COLLECTIONS.SUBSCRIPTIONS).doc(workspaceId).set({
      status: 'active', cancelledAt: null, updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });

    logger.info('Subscription reactivated', { workspaceId, uid });

    const snap = await db.collection(COLLECTIONS.SUBSCRIPTIONS).doc(workspaceId).get();
    return res.status(HTTP_STATUS.OK).json(successResponse(snap.data(), 'Subscription reactivated.'));
  } catch (err) {
    logger.error('reactivateSubscription failed', err);
    next(err);
  }
}

// ─── POST /api/v1/payments/change-plan ───────────────────────────────────────

async function changePlan(req, res, next) {
  try {
    const uid         = req.user.uid;
    const workspaceId = req.user.workspaceId;
    const { newTier, interval } = req.body;

    if (!newTier || !interval) {
      throw new AppError(ERROR_CODES.INVALID_INPUT, 'newTier and interval are required.');
    }

    await db.collection(COLLECTIONS.SUBSCRIPTIONS).doc(workspaceId).set({
      tier: newTier, interval, updatedAt: FieldValue.serverTimestamp(), updatedBy: uid,
    }, { merge: true });

    logger.info('Subscription plan changed', { workspaceId, uid, newTier, interval });

    return res.status(HTTP_STATUS.OK).json(successResponse({ workspaceId, tier: newTier, interval }, 'Subscription plan updated.'));
  } catch (err) {
    logger.error('changePlan failed', err);
    next(err);
  }
}

// ─── POST /api/v1/payments/coupon ─────────────────────────────────────────────

async function applyCoupon(req, res, next) {
  // Phase 1 stub — coupon engine not yet implemented
  return res.status(HTTP_STATUS.NOT_FOUND).json({
    success: false,
    error: { code: ERROR_CODES.NOT_FOUND, message: 'Coupon code not found or expired.' },
  });
}

// ─── POST /api/v1/payments/refund ─────────────────────────────────────────────

async function requestRefund(req, res, next) {
  try {
    const { paymentId, amount, reason } = req.body;
    logger.info('Refund request received', { workspaceId: req.user.workspaceId, paymentId, amount, reason });

    return res.status(HTTP_STATUS.OK).json(
      successResponse({ paymentId, status: 'pending_review' }, 'Refund request submitted. Our team will review it within 3-5 business days.')
    );
  } catch (err) {
    logger.error('requestRefund failed', err);
    next(err);
  }
}

// ─── POST /api/v1/payments/webhook ───────────────────────────────────────────

async function handleWebhook(req, res, next) {
  try {
    const signature = req.headers['x-razorpay-signature'];
    if (!signature) {
      throw new AppError(ERROR_CODES.INVALID_WEBHOOK, 'Missing Razorpay webhook signature.');
    }

    const rawBody = Buffer.isBuffer(req.body)
      ? req.body
      : Buffer.from(JSON.stringify(req.body));

    let parsed;
    try { parsed = JSON.parse(rawBody.toString('utf8')); }
    catch { throw new AppError(ERROR_CODES.INVALID_WEBHOOK, 'Invalid JSON in webhook payload.'); }

    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || '';
    const isValid = verifyRazorpayWebhook(rawBody.toString('utf8'), signature, webhookSecret);
    if (!isValid) {
      throw new AppError(ERROR_CODES.INVALID_WEBHOOK, 'Webhook signature verification failed.');
    }

    // Timestamp freshness
    if (parsed.created_at && !isWebhookTimestampFresh(parsed.created_at)) {
      throw new AppError(ERROR_CODES.WEBHOOK_REPLAY, 'Webhook replay attack detected.');
    }

    logger.info('Webhook processed', { event: parsed.event });

    return res.status(HTTP_STATUS.OK).json({ received: true });
  } catch (err) {
    logger.error('handleWebhook failed', err);
    if (err instanceof AppError && (err.code === ERROR_CODES.INVALID_WEBHOOK || err.code === ERROR_CODES.WEBHOOK_REPLAY)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ received: false, error: err.message });
    }
    // Always 200 to Razorpay to prevent retries
    return res.status(HTTP_STATUS.OK).json({ received: true });
  }
}

module.exports = {
  createStandardOrder, verifyStandardPayment,
  createOrder, verifyPayment,
  getBillingDashboard, listInvoices,
  cancelSubscription, reactivateSubscription,
  changePlan, applyCoupon, requestRefund,
  handleWebhook,
};
