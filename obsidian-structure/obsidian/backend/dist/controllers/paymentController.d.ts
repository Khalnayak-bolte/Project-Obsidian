/**
 * backend/controllers/paymentController.ts
 * Project: Obsidian
 *
 * HTTP request handlers for all billing and payment routes.
 * Validates input via Zod schemas, delegates business logic to billingService,
 * and returns consistent ApiSuccess / ApiError responses.
 *
 * Route map (wired in routes/payment.routes.ts):
 *  POST   /api/v1/payments/orders                        → createOrder
 *  POST   /api/v1/payments/verify                        → verifyPayment
 *  GET    /api/v1/payments/billing                       → getBillingDashboard
 *  GET    /api/v1/payments/invoices                      → listInvoices
 *  POST   /api/v1/payments/cancel                        → cancelSubscription
 *  POST   /api/v1/payments/reactivate                    → reactivateSubscription
 *  POST   /api/v1/payments/change-plan                   → changePlan
 *  POST   /api/v1/payments/coupon                        → applyCoupon
 *  POST   /api/v1/payments/refund                        → requestRefund
 *  POST   /api/v1/payments/webhook                       → handleWebhook
 */
import type { Request, Response, NextFunction } from "express";
export declare function createOrder(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function verifyPayment(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function getBillingDashboard(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function listInvoices(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function cancelSubscription(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function reactivateSubscription(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function changePlan(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function applyCoupon(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function requestRefund(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function handleWebhook(req: Request, res: Response, next: NextFunction): Promise<void>;
//# sourceMappingURL=paymentController.d.ts.map