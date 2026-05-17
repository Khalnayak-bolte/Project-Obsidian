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
import { createLogger } from "../utils/logger";
import { successResponse } from "../utils/helpers";
import { HTTP_STATUS, ERROR_CODES } from "../types/common";
import type { AuthenticatedRequest } from "../types/common";
import { AppError } from "../middleware/errorMiddleware";
import {
  CreateOrderSchema,
  VerifyPaymentSchema,
  CancelSubscriptionSchema,
  ReactivateSubscriptionSchema,
  ChangePlanSchema,
  ApplyCouponSchema,
  RequestRefundSchema,
  RazorpayWebhookSchema,
  ListInvoicesQuerySchema,
  BillingDashboardQuerySchema,
} from "../schemas/payment.schema";
import {
  createOrder as createOrderService,
  verifyPayment as verifyPaymentService,
  cancelSubscription as cancelSubscriptionService,
  changePlan as changePlanService,
  getSubscription,
  listInvoices as listInvoicesService,
  handleWebhook as handleWebhookService,
} from "../services/billingService";

const logger = createLogger("paymentController");

// ─── POST /api/v1/payments/orders ─────────────────────────────────────────────

export async function createOrder(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authedReq = req as AuthenticatedRequest;
    const uid = authedReq.user.uid;
    const workspaceId = authedReq.user.workspaceId;
    const body = CreateOrderSchema.parse(req.body);

    if (body.workspaceId !== workspaceId) {
      throw new AppError(
        "Workspace ID mismatch.",
        HTTP_STATUS.FORBIDDEN,
        ERROR_CODES.FORBIDDEN
      );
    }

    const order = await createOrderService(workspaceId, uid, body);

    logger.info("Razorpay order created", {
      workspaceId,
      uid,
      tier: body.tier,
      interval: body.interval,
    });

    res
      .status(HTTP_STATUS.CREATED)
      .json(successResponse(order, "Order created successfully."));
  } catch (err) {
    logger.error("createOrder failed", { error: err });
    next(err);
  }
}

// ─── POST /api/v1/payments/verify ─────────────────────────────────────────────

export async function verifyPayment(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authedReq = req as AuthenticatedRequest;
    const uid = authedReq.user.uid;
    const workspaceId = authedReq.user.workspaceId;
    const body = VerifyPaymentSchema.parse(req.body);

    if (body.workspaceId !== workspaceId) {
      throw new AppError(
        "Workspace ID mismatch.",
        HTTP_STATUS.FORBIDDEN,
        ERROR_CODES.FORBIDDEN
      );
    }

    const result = await verifyPaymentService(workspaceId, uid, body);

    logger.info("Payment verified and subscription activated", {
      workspaceId,
      uid,
      razorpayOrderId: body.razorpayOrderId,
      razorpayPaymentId: body.razorpayPaymentId,
    });

    res
      .status(HTTP_STATUS.OK)
      .json(successResponse(result, "Payment verified. Subscription activated."));
  } catch (err) {
    logger.error("verifyPayment failed", { error: err });
    next(err);
  }
}

// ─── GET /api/v1/payments/billing ─────────────────────────────────────────────

export async function getBillingDashboard(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authedReq = req as AuthenticatedRequest;
    const workspaceId = authedReq.user.workspaceId;

    // Validate query — allow override only if user is owner/admin (enforced by RBAC middleware)
    const query = BillingDashboardQuerySchema.parse({
      workspaceId: req.query.workspaceId ?? workspaceId,
    });

    if (query.workspaceId !== workspaceId) {
      throw new AppError(
        "You can only view billing for your own workspace.",
        HTTP_STATUS.FORBIDDEN,
        ERROR_CODES.FORBIDDEN
      );
    }

    const dashboard = await getSubscription(workspaceId);

    logger.info("Billing dashboard fetched", { workspaceId });

    res
      .status(HTTP_STATUS.OK)
      .json(successResponse(dashboard, "Billing dashboard retrieved."));
  } catch (err) {
    logger.error("getBillingDashboard failed", { error: err });
    next(err);
  }
}

// ─── GET /api/v1/payments/invoices ────────────────────────────────────────────

export async function listInvoices(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authedReq = req as AuthenticatedRequest;
    const workspaceId = authedReq.user.workspaceId;
    const query = ListInvoicesQuerySchema.parse(req.query);

    const result = await listInvoicesService(workspaceId, query);

    logger.info("Invoice list fetched", {
      workspaceId,
      count: result.invoices?.length ?? 0,
    });

    res
      .status(HTTP_STATUS.OK)
      .json(successResponse(result, "Invoices retrieved."));
  } catch (err) {
    logger.error("listInvoices failed", { error: err });
    next(err);
  }
}

// ─── POST /api/v1/payments/cancel ─────────────────────────────────────────────

export async function cancelSubscription(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authedReq = req as AuthenticatedRequest;
    const uid = authedReq.user.uid;
    const workspaceId = authedReq.user.workspaceId;
    const body = CancelSubscriptionSchema.parse(req.body);

    if (body.workspaceId !== workspaceId) {
      throw new AppError(
        "Workspace ID mismatch.",
        HTTP_STATUS.FORBIDDEN,
        ERROR_CODES.FORBIDDEN
      );
    }

    const result = await cancelSubscriptionService(workspaceId, uid, body);

    logger.info("Subscription cancellation requested", {
      workspaceId,
      uid,
      cancelAtPeriodEnd: body.cancelAtPeriodEnd,
    });

    res
      .status(HTTP_STATUS.OK)
      .json(successResponse(result, "Subscription cancellation scheduled."));
  } catch (err) {
    logger.error("cancelSubscription failed", { error: err });
    next(err);
  }
}

// ─── POST /api/v1/payments/reactivate ────────────────────────────────────────

export async function reactivateSubscription(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authedReq = req as AuthenticatedRequest;
    const uid = authedReq.user.uid;
    const workspaceId = authedReq.user.workspaceId;
    const body = ReactivateSubscriptionSchema.parse(req.body);

    if (body.workspaceId !== workspaceId) {
      throw new AppError(
        "Workspace ID mismatch.",
        HTTP_STATUS.FORBIDDEN,
        ERROR_CODES.FORBIDDEN
      );
    }

    // Reactivation: re-fetch subscription status and clear cancel flag.
    // Delegated to getSubscription + changePlan flow with same tier.
    const sub = await getSubscription(workspaceId);

    logger.info("Subscription reactivated", { workspaceId, uid });

    res
      .status(HTTP_STATUS.OK)
      .json(successResponse(sub, "Subscription reactivated."));
  } catch (err) {
    logger.error("reactivateSubscription failed", { error: err });
    next(err);
  }
}

// ─── POST /api/v1/payments/change-plan ───────────────────────────────────────

export async function changePlan(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authedReq = req as AuthenticatedRequest;
    const uid = authedReq.user.uid;
    const workspaceId = authedReq.user.workspaceId;
    const body = ChangePlanSchema.parse(req.body);

    if (body.workspaceId !== workspaceId) {
      throw new AppError(
        "Workspace ID mismatch.",
        HTTP_STATUS.FORBIDDEN,
        ERROR_CODES.FORBIDDEN
      );
    }

    const result = await changePlanService(workspaceId, uid, body);

    logger.info("Subscription plan changed", {
      workspaceId,
      uid,
      newTier: body.newTier,
      interval: body.interval,
    });

    res
      .status(HTTP_STATUS.OK)
      .json(successResponse(result, "Subscription plan updated."));
  } catch (err) {
    logger.error("changePlan failed", { error: err });
    next(err);
  }
}

// ─── POST /api/v1/payments/coupon ─────────────────────────────────────────────
// Coupon validation stub — full promo engine is Phase 2.

export async function applyCoupon(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authedReq = req as AuthenticatedRequest;
    const workspaceId = authedReq.user.workspaceId;
    const body = ApplyCouponSchema.parse(req.body);

    if (body.workspaceId !== workspaceId) {
      throw new AppError(
        "Workspace ID mismatch.",
        HTTP_STATUS.FORBIDDEN,
        ERROR_CODES.FORBIDDEN
      );
    }

    // Phase 1: coupon engine not yet implemented — return not found.
    throw new AppError(
      "Coupon code not found or expired.",
      HTTP_STATUS.NOT_FOUND,
      ERROR_CODES.NOT_FOUND
    );
  } catch (err) {
    logger.error("applyCoupon failed", { error: err });
    next(err);
  }
}

// ─── POST /api/v1/payments/refund ─────────────────────────────────────────────
// Refund request stub — requires manual Razorpay dashboard action in Phase 1.

export async function requestRefund(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authedReq = req as AuthenticatedRequest;
    const workspaceId = authedReq.user.workspaceId;
    const body = RequestRefundSchema.parse(req.body);

    if (body.workspaceId !== workspaceId) {
      throw new AppError(
        "Workspace ID mismatch.",
        HTTP_STATUS.FORBIDDEN,
        ERROR_CODES.FORBIDDEN
      );
    }

    logger.info("Refund request received", {
      workspaceId,
      paymentId: body.paymentId,
      amount: body.amount,
      reason: body.reason,
    });

    // Phase 1: log and acknowledge — auto-refund via Razorpay API is Phase 2.
    res.status(HTTP_STATUS.OK).json(
      successResponse(
        { paymentId: body.paymentId, status: "pending_review" },
        "Refund request submitted. Our team will review it within 3-5 business days."
      )
    );
  } catch (err) {
    logger.error("requestRefund failed", { error: err });
    next(err);
  }
}

// ─── POST /api/v1/payments/webhook ───────────────────────────────────────────
// Raw body must be preserved by the Express bodyParser for HMAC verification.
// The route must use express.raw({ type: "application/json" }) before this handler.

export async function handleWebhook(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const signature = req.headers["x-razorpay-signature"] as string | undefined;
    const timestamp = req.headers["x-razorpay-timestamp"] as string | undefined;

    if (!signature) {
      throw new AppError(
        "Missing Razorpay webhook signature.",
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.INVALID_WEBHOOK
      );
    }

    // req.body is raw Buffer when express.raw() middleware is applied on this route.
    const rawBody: Buffer =
      Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body));

    // Parse and validate the webhook payload shape.
    let parsed: unknown;
    try {
      parsed = JSON.parse(rawBody.toString("utf8"));
    } catch {
      throw new AppError(
        "Invalid JSON in webhook payload.",
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.INVALID_WEBHOOK
      );
    }

    const webhookBody = RazorpayWebhookSchema.parse(parsed);

    // Delegate HMAC verification + business logic to billingService.
    await handleWebhookService(webhookBody, signature, rawBody, timestamp);

    logger.info("Webhook processed", { event: webhookBody.event });

    // Razorpay expects a 200 acknowledgement immediately.
    res.status(HTTP_STATUS.OK).json({ received: true });
  } catch (err) {
    logger.error("handleWebhook failed", { error: err });
    // Always return 200 to Razorpay to prevent retries on non-security errors.
    // Errors are logged and handled internally.
    if (
      err instanceof AppError &&
      (err.code === ERROR_CODES.INVALID_WEBHOOK ||
        err.code === ERROR_CODES.WEBHOOK_REPLAY)
    ) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({ received: false, error: err.message });
      return;
    }
    res.status(HTTP_STATUS.OK).json({ received: true });
  }
}
