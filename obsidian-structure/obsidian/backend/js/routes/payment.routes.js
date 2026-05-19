'use strict';
// js/routes/payment.routes.js

const { Router, raw } = require('express');
const { authenticate }   = require('../middleware/authMiddleware');
const { requirePermission } = require('../middleware/rbacMiddleware');
const { RATE_LIMITS }    = require('../middleware/rateLimitMiddleware');
const {
  createStandardOrder, verifyStandardPayment,
  createOrder, verifyPayment,
  getBillingDashboard, listInvoices,
  cancelSubscription, reactivateSubscription,
  changePlan, applyCoupon, requestRefund,
  handleWebhook,
} = require('../controllers/paymentController');

const paymentRouter = Router();

// ── Public (no auth required) ─────────────────────────────────────────────────
paymentRouter.post('/create-order',   createStandardOrder);
paymentRouter.post('/verify-payment', verifyStandardPayment);

// ── Webhook (HMAC secured, no JWT) ────────────────────────────────────────────
paymentRouter.post('/webhook', raw({ type: 'application/json' }), RATE_LIMITS.WEBHOOK, handleWebhook);

// ── Authenticated billing routes ──────────────────────────────────────────────
paymentRouter.use(authenticate);

paymentRouter.post('/orders',      requirePermission('manage_billing'), createOrder);
paymentRouter.post('/verify',      requirePermission('manage_billing'), verifyPayment);
paymentRouter.get ('/billing',     requirePermission('manage_billing'), getBillingDashboard);
paymentRouter.get ('/invoices',    requirePermission('manage_billing'), listInvoices);
paymentRouter.post('/cancel',      requirePermission('manage_billing'), cancelSubscription);
paymentRouter.post('/reactivate',  requirePermission('manage_billing'), reactivateSubscription);
paymentRouter.post('/change-plan', requirePermission('manage_billing'), changePlan);
paymentRouter.post('/coupon',      requirePermission('manage_billing'), applyCoupon);
paymentRouter.post('/refund',      requirePermission('manage_billing'), requestRefund);

module.exports = { paymentRouter };
