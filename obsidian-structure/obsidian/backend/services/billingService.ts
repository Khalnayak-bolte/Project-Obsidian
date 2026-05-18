/**
 * backend/services/billingService.ts
 * Project: Obsidian
 */

import { createLogger } from "../utils/logger";
import {
  razorpay,
  RAZORPAY_PLANS,
  RAZORPAY_PRICING,
  RAZORPAY_WEBHOOK,
  RAZORPAY_CURRENCY,
  getPlanId,
  getPrice,
  getTierFromPlanId,
  isValidTier,
} from "../config/razorpay";
import { verifyRazorpayWebhook, verifyRazorpayPaymentSignature, isWebhookTimestampFresh, buildWebhookDedupeKey } from "../utils/hmac";
import * as subscriptionRepo from "../repositories/subscriptionRepository";
import * as workspaceRepo from "../repositories/workspaceRepository";
import { AppError } from "../middleware/errorMiddleware";
import { ERROR_CODES, HTTP_STATUS } from "../types/common";
import { AUDIT_ACTIONS } from "../utils/constants";
import type {
  CreateOrderInput,
  VerifyPaymentInput,
  CancelSubscriptionInput,
  ChangePlanInput,
  RazorpayWebhookInput,
  ListInvoicesQueryInput,
} from "../schemas/payment.schema";

const logger = createLogger("billingService");

// ─── Create Razorpay order ────────────────────────────────────────────────────

export async function createOrder(
  workspaceId: string,
  uid: string,
  input: CreateOrderInput
): Promise<{
  orderId: string;
  amount: number;
  currency: string;
  tier: string;
  interval: string;
}> {
  const workspace = await workspaceRepo.getWorkspaceById(workspaceId);
  if (!workspace) {
    throw new AppError("Workspace not found", HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);
  }

  if (!isValidTier(input.tier)) {
    throw new AppError("Invalid subscription tier", HTTP_STATUS.BAD_REQUEST, ERROR_CODES.BAD_REQUEST);
  }

  const amount = getPrice(input.tier as keyof typeof RAZORPAY_PRICING, input.interval);
  const planId = getPlanId(input.tier, input.interval);

  if (!planId) {
    throw new AppError(
      `Razorpay plan not configured for ${input.tier}/${input.interval}`,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      ERROR_CODES.INTERNAL_ERROR
    );
  }

  const order = await razorpay.instance!.orders.create({
    amount,
    currency: RAZORPAY_CURRENCY,
    receipt: `obs_${workspaceId}_${Date.now()}`,
    notes: {
      workspaceId,
      uid,
      tier: input.tier,
      interval: input.interval,
      planId,
    },
  });

  // Store pending payment record
  await subscriptionRepo.createPayment({
    workspaceId,
    uid,
    razorpayOrderId: order.id,
    amount,
    currency: RAZORPAY_CURRENCY,
    tier: input.tier,
    interval: input.interval,
    status: "pending",
  });

  logger.info("Razorpay order created", { orderId: order.id, workspaceId, tier: input.tier });

  return {
    orderId: order.id,
    amount,
    currency: RAZORPAY_CURRENCY,
    tier: input.tier,
    interval: input.interval,
  };
}

// ─── Verify payment & activate subscription ───────────────────────────────────

export async function verifyPayment(
  workspaceId: string,
  uid: string,
  input: VerifyPaymentInput
): Promise<{ success: boolean; tier: string }> {
  // HMAC signature verification
  const secret = process.env.RAZORPAY_KEY_SECRET ?? "";
  const isValid = verifyRazorpayPaymentSignature(
    input.razorpayOrderId,
    input.razorpayPaymentId,
    input.razorpaySignature,
    secret
  );

  if (!isValid) {
    logger.warn("Payment signature verification failed", { workspaceId, orderId: input.razorpayOrderId });
    throw new AppError("Payment verification failed — invalid signature", HTTP_STATUS.BAD_REQUEST, ERROR_CODES.BAD_REQUEST);
  }

  // Fetch payment record
  const payment = await subscriptionRepo.getPaymentByRazorpayId(input.razorpayOrderId);
  if (!payment || payment.workspaceId !== workspaceId) {
    throw new AppError("Payment record not found", HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);
  }

  // Mark payment captured
  await subscriptionRepo.updatePaymentStatus(payment.paymentId, "captured", input.razorpayPaymentId);

  // Update workspace tier
  await subscriptionRepo.updateWorkspaceTier(workspaceId, payment.tier);
  await subscriptionRepo.updateSubscriptionTier(workspaceId, payment.tier);
  await subscriptionRepo.updateSubscriptionStatus(workspaceId, "active");

  // Create invoice record
  await subscriptionRepo.createInvoice({
    workspaceId,
    paymentId: payment.paymentId,
    razorpayPaymentId: input.razorpayPaymentId,
    amount: payment.amount,
    currency: payment.currency,
    tier: payment.tier,
    interval: payment.interval,
    status: "paid",
  });

  await workspaceRepo.writeAuditLog({
    workspaceId,
    actorId: uid,
    action: AUDIT_ACTIONS.PAYMENT_CAPTURED,
    metadata: {
      tier: payment.tier,
      amount: payment.amount,
      razorpayPaymentId: input.razorpayPaymentId,
    },
  });

  logger.info("Payment verified and subscription activated", {
    workspaceId,
    tier: payment.tier,
    razorpayPaymentId: input.razorpayPaymentId,
  });

  return { success: true, tier: payment.tier };
}

// ─── Cancel subscription ──────────────────────────────────────────────────────

export async function cancelSubscription(
  workspaceId: string,
  uid: string,
  input: CancelSubscriptionInput
): Promise<void> {
  const subscription = await subscriptionRepo.getSubscriptionByWorkspace(workspaceId);
  if (!subscription) {
    throw new AppError("No active subscription found", HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);
  }

  if (subscription.status === "cancelled") {
    throw new AppError("Subscription is already cancelled", HTTP_STATUS.BAD_REQUEST, ERROR_CODES.BAD_REQUEST);
  }

  // Cancel on Razorpay if subscription ID exists
  if (subscription.razorpaySubscriptionId) {
    try {
      await razorpay.instance!.subscriptions.cancel(subscription.razorpaySubscriptionId, input.cancelAtPeriodEnd ?? true);
    } catch (err) {
      logger.error("Razorpay subscription cancel failed", { workspaceId, error: err });
    }
  }

  await subscriptionRepo.setCancelAtPeriodEnd(workspaceId, input.cancelAtPeriodEnd ?? true);

  if (!input.cancelAtPeriodEnd) {
    await subscriptionRepo.updateSubscriptionStatus(workspaceId, "cancelled");
  }

  await workspaceRepo.writeAuditLog({
    workspaceId,
    actorId: uid,
    action: AUDIT_ACTIONS.PLAN_CHANGED,
    metadata: { action: "cancel", cancelAtPeriodEnd: input.cancelAtPeriodEnd },
  });

  logger.info("Subscription cancelled", { workspaceId, cancelAtPeriodEnd: input.cancelAtPeriodEnd });
}

// ─── Change plan ──────────────────────────────────────────────────────────────

export async function changePlan(
  workspaceId: string,
  uid: string,
  input: ChangePlanInput
): Promise<{ orderId: string; amount: number; currency: string }> {
  const workspace = await workspaceRepo.getWorkspaceById(workspaceId);
  if (!workspace) {
    throw new AppError("Workspace not found", HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);
  }

  if (workspace.tier === input.tier) {
    throw new AppError("Workspace is already on this plan", HTTP_STATUS.BAD_REQUEST, ERROR_CODES.BAD_REQUEST);
  }

  // Create a new order for the new plan
  return createOrder(workspaceId, uid, { tier: input.tier, interval: input.interval });
}

// ─── Get subscription details ─────────────────────────────────────────────────

export async function getSubscription(workspaceId: string): Promise<any> {
  const workspace = await workspaceRepo.getWorkspaceById(workspaceId);
  if (!workspace) {
    throw new AppError("Workspace not found", HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);
  }

  const subscription = await subscriptionRepo.getSubscriptionByWorkspace(workspaceId);
  const payments = await subscriptionRepo.getPaymentsByWorkspace(workspaceId, 5);

  return {
    subscription,
    currentTier: workspace.tier,
    recentPayments: payments,
  };
}

// ─── List invoices ────────────────────────────────────────────────────────────

export async function listInvoices(
  workspaceId: string,
  query: ListInvoicesQueryInput
): Promise<any[]> {
  return subscriptionRepo.getInvoicesByWorkspace(workspaceId, query.limit ?? 10);
}

// ─── Handle Razorpay webhook ──────────────────────────────────────────────────

export async function handleWebhook(
  rawBody: string,
  signature: string,
  payload: RazorpayWebhookInput
): Promise<{ processed: boolean }> {
  // 1. Verify signature
  const isValid = verifyRazorpayWebhook(rawBody, signature, RAZORPAY_WEBHOOK.secret);
  if (!isValid) {
    throw new AppError("Invalid webhook signature", HTTP_STATUS.UNAUTHORIZED, ERROR_CODES.UNAUTHORIZED);
  }

  // 2. Timestamp freshness
  if (!isWebhookTimestampFresh(payload.created_at)) {
    throw new AppError("Webhook timestamp out of acceptable window", HTTP_STATUS.BAD_REQUEST, ERROR_CODES.BAD_REQUEST);
  }

  // 3. Deduplication
  const entityId = (payload.payload as any)?.payment?.entity?.id
    ?? (payload.payload as any)?.subscription?.entity?.id
    ?? payload.created_at.toString();

  const dedupeKey = buildWebhookDedupeKey(payload.event, entityId);
  const existing = await subscriptionRepo.getWebhookLog(dedupeKey);
  if (existing?.processed) {
    logger.info("Webhook already processed, skipping", { dedupeKey, event: payload.event });
    return { processed: false };
  }

  // 4. Store webhook log
  await subscriptionRepo.createWebhookLog({
    dedupeKey,
    event: payload.event,
    payload: payload.payload,
    receivedAt: new Date(),
  });

  // 5. Route event
  try {
    await routeWebhookEvent(payload.event, payload.payload as any);
    await subscriptionRepo.markWebhookProcessed(dedupeKey);
  } catch (err) {
    logger.error("Webhook event processing failed", { event: payload.event, dedupeKey, error: err });
    throw err;
  }

  logger.info("Webhook processed", { event: payload.event, dedupeKey });
  return { processed: true };
}

// ─── Webhook event router ─────────────────────────────────────────────────────

async function routeWebhookEvent(event: string, payload: any): Promise<void> {
  const { events } = RAZORPAY_WEBHOOK;

  switch (event) {
    case events.PAYMENT_CAPTURED: {
      const payment = payload?.payment?.entity;
      if (!payment) break;

      const workspaceId = payment.notes?.workspaceId;
      const tier = payment.notes?.tier;
      if (!workspaceId || !tier) break;

      await subscriptionRepo.updateWorkspaceTier(workspaceId, tier);
      await subscriptionRepo.updateSubscriptionStatus(workspaceId, "active");

      logger.info("Webhook: payment captured", { workspaceId, tier, paymentId: payment.id });
      break;
    }

    case events.PAYMENT_FAILED: {
      const payment = payload?.payment?.entity;
      if (!payment) break;

      const workspaceId = payment.notes?.workspaceId;
      if (!workspaceId) break;

      const existingPayment = await subscriptionRepo.getPaymentByRazorpayId(payment.order_id);
      if (existingPayment) {
        await subscriptionRepo.updatePaymentStatus(existingPayment.paymentId, "failed");
      }

      logger.warn("Webhook: payment failed", { workspaceId, paymentId: payment.id });
      break;
    }

    case events.SUBSCRIPTION_CANCELLED: {
      const sub = payload?.subscription?.entity;
      if (!sub) break;

      const existing = await subscriptionRepo.getSubscriptionByRazorpayId(sub.id);
      if (existing) {
        await subscriptionRepo.updateSubscriptionStatus(existing.workspaceId, "cancelled");
      }

      logger.info("Webhook: subscription cancelled", { razorpaySubId: sub.id });
      break;
    }

    case events.SUBSCRIPTION_ACTIVATED: {
      const sub = payload?.subscription?.entity;
      if (!sub) break;

      const tier = getTierFromPlanId(sub.plan_id);
      const existing = await subscriptionRepo.getSubscriptionByRazorpayId(sub.id);
      if (existing && tier) {
        await subscriptionRepo.updateSubscriptionTier(existing.workspaceId, tier);
        await subscriptionRepo.updateSubscriptionStatus(existing.workspaceId, "active");
      }

      logger.info("Webhook: subscription activated", { razorpaySubId: sub.id, tier });
      break;
    }

    case events.SUBSCRIPTION_PAUSED: {
      const sub = payload?.subscription?.entity;
      if (!sub) break;

      const existing = await subscriptionRepo.getSubscriptionByRazorpayId(sub.id);
      if (existing) {
        await subscriptionRepo.updateSubscriptionStatus(existing.workspaceId, "paused");
      }
      break;
    }

    case events.SUBSCRIPTION_RESUMED: {
      const sub = payload?.subscription?.entity;
      if (!sub) break;

      const existing = await subscriptionRepo.getSubscriptionByRazorpayId(sub.id);
      if (existing) {
        await subscriptionRepo.updateSubscriptionStatus(existing.workspaceId, "active");
      }
      break;
    }

    default:
      logger.info("Unhandled webhook event", { event });
  }
}

// ─── Get pricing info (public) ────────────────────────────────────────────────

export function getPricingInfo(): typeof RAZORPAY_PRICING {
  return RAZORPAY_PRICING;
}
