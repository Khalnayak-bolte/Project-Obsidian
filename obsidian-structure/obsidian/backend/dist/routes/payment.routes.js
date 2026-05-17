/**
 * backend/routes/payment.routes.ts
 * Project: Obsidian
 *
 * Express router for all billing and payment endpoints.
 * Most routes require authentication + manage_billing permission.
 * The webhook endpoint uses raw body parsing for HMAC verification and
 * does NOT go through authenticate — Razorpay calls it server-to-server.
 *
 *  POST   /api/v1/payments/webhook          → handleWebhook  (no auth — HMAC secured)
 *  POST   /api/v1/payments/orders           → createOrder
 *  POST   /api/v1/payments/verify           → verifyPayment
 *  GET    /api/v1/payments/billing          → getBillingDashboard
 *  GET    /api/v1/payments/invoices         → listInvoices
 *  POST   /api/v1/payments/cancel           → cancelSubscription
 *  POST   /api/v1/payments/reactivate       → reactivateSubscription
 *  POST   /api/v1/payments/change-plan      → changePlan
 *  POST   /api/v1/payments/coupon           → applyCoupon
 *  POST   /api/v1/payments/refund           → requestRefund
 */
import { Router, raw } from "express";
import { authenticate } from "../middleware/authMiddleware";
import { requirePermission } from "../middleware/rbacMiddleware";
import { RATE_LIMITS } from "../middleware/rateLimitMiddleware";
import { createOrder, verifyPayment, getBillingDashboard, listInvoices, cancelSubscription, reactivateSubscription, changePlan, applyCoupon, requestRefund, handleWebhook, } from "../controllers/paymentController";
export const paymentRouter = Router();
// ─── Webhook — no JWT auth; secured by Razorpay HMAC signature ───────────────
// Must use raw body so HMAC can be verified against the original bytes.
paymentRouter.post("/webhook", raw({ type: "application/json" }), RATE_LIMITS.WEBHOOK, handleWebhook);
// ─── Authenticated billing routes ─────────────────────────────────────────────
paymentRouter.use(authenticate);
// POST /api/v1/payments/orders
paymentRouter.post("/orders", requirePermission("manage_billing"), createOrder);
// POST /api/v1/payments/verify
paymentRouter.post("/verify", requirePermission("manage_billing"), verifyPayment);
// GET /api/v1/payments/billing
paymentRouter.get("/billing", requirePermission("manage_billing"), getBillingDashboard);
// GET /api/v1/payments/invoices
paymentRouter.get("/invoices", requirePermission("manage_billing"), listInvoices);
// POST /api/v1/payments/cancel
paymentRouter.post("/cancel", requirePermission("manage_billing"), cancelSubscription);
// POST /api/v1/payments/reactivate
paymentRouter.post("/reactivate", requirePermission("manage_billing"), reactivateSubscription);
// POST /api/v1/payments/change-plan
paymentRouter.post("/change-plan", requirePermission("manage_billing"), changePlan);
// POST /api/v1/payments/coupon
paymentRouter.post("/coupon", requirePermission("manage_billing"), applyCoupon);
// POST /api/v1/payments/refund
paymentRouter.post("/refund", requirePermission("manage_billing"), requestRefund);
//# sourceMappingURL=payment.routes.js.map