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
export declare const paymentRouter: import("express-serve-static-core").Router;
//# sourceMappingURL=payment.routes.d.ts.map