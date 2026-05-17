/**
 * backend/repositories/subscriptionRepository.ts
 * Project: Obsidian
 *
 * All Firestore read/write operations for subscriptions, payments,
 * invoices, and webhook logs. No business logic — only data access.
 */

import { db, COLLECTIONS, FieldValue, Timestamp } from "../config/firebase";
import { createLogger } from "../utils/logger";
import { generatePaymentId, generateInvoiceId, generateWebhookId } from "../utils/helpers";
import type {
  Subscription,
  SubscriptionStatus,
} from "../types/workspace";
import type {
  Payment,
  PaymentStatus,
  PaymentMethod,
  Invoice,
  InvoiceStatus,
  InvoiceLineItem,
  WebhookLog,
} from "../types/billing";
import type { SubscriptionTier } from "../config/appConfig";

const logger = createLogger("subscriptionRepository");

// ─── Subscriptions ────────────────────────────────────────────────────────────

export async function getSubscriptionByWorkspace(
  workspaceId: string
): Promise<Subscription | null> {
  try {
    const snap = await db
      .collection(COLLECTIONS.SUBSCRIPTIONS)
      .where("workspaceId", "==", workspaceId)
      .where("status", "in", ["active", "trialing", "past_due", "paused"])
      .orderBy("createdAt", "desc")
      .limit(1)
      .get();

    if (snap.empty) return null;
    return { subscriptionId: snap.docs[0].id, ...snap.docs[0].data() } as Subscription;
  } catch (err) {
    logger.error("getSubscriptionByWorkspace failed", { workspaceId, error: err });
    throw err;
  }
}

export async function getSubscriptionByRazorpayId(
  razorpaySubscriptionId: string
): Promise<Subscription | null> {
  try {
    const snap = await db
      .collection(COLLECTIONS.SUBSCRIPTIONS)
      .where("razorpaySubscriptionId", "==", razorpaySubscriptionId)
      .limit(1)
      .get();

    if (snap.empty) return null;
    return { subscriptionId: snap.docs[0].id, ...snap.docs[0].data() } as Subscription;
  } catch (err) {
    logger.error("getSubscriptionByRazorpayId failed", { razorpaySubscriptionId, error: err });
    throw err;
  }
}

export async function createSubscription(params: {
  workspaceId: string;
  razorpaySubscriptionId: string;
  razorpayPlanId: string;
  tier: SubscriptionTier;
  interval: "monthly" | "yearly";
  currentPeriodStart: FirebaseFirestore.Timestamp;
  currentPeriodEnd: FirebaseFirestore.Timestamp;
}): Promise<Subscription> {
  try {
    const subscriptionId = `sub_${params.workspaceId}_${Date.now()}`;
    const now = Timestamp.now();

    const subscription: Subscription = {
      subscriptionId,
      workspaceId: params.workspaceId,
      razorpaySubscriptionId: params.razorpaySubscriptionId,
      razorpayPlanId: params.razorpayPlanId,
      tier: params.tier,
      interval: params.interval,
      status: "active",
      currentPeriodStart: params.currentPeriodStart,
      currentPeriodEnd: params.currentPeriodEnd,
      cancelAtPeriodEnd: false,
      createdAt: now,
      updatedAt: now,
    };

    await db
      .collection(COLLECTIONS.SUBSCRIPTIONS)
      .doc(subscriptionId)
      .set(subscription);

    logger.info("Subscription created", {
      subscriptionId,
      workspaceId: params.workspaceId,
      tier: params.tier,
    });

    return subscription;
  } catch (err) {
    logger.error("createSubscription failed", { ...params, error: err });
    throw err;
  }
}

export async function updateSubscriptionStatus(
  subscriptionId: string,
  status: SubscriptionStatus,
  extras?: Partial<
    Pick<
      Subscription,
      | "currentPeriodStart"
      | "currentPeriodEnd"
      | "cancelAtPeriodEnd"
      | "lastPaymentAt"
      | "lastPaymentAmount"
    >
  >
): Promise<void> {
  try {
    await db
      .collection(COLLECTIONS.SUBSCRIPTIONS)
      .doc(subscriptionId)
      .update({
        status,
        ...extras,
        updatedAt: Timestamp.now(),
      });

    logger.info("Subscription status updated", { subscriptionId, status });
  } catch (err) {
    logger.error("updateSubscriptionStatus failed", { subscriptionId, status, error: err });
    throw err;
  }
}

export async function updateSubscriptionTier(
  subscriptionId: string,
  tier: SubscriptionTier,
  razorpayPlanId: string,
  interval: "monthly" | "yearly"
): Promise<void> {
  try {
    await db
      .collection(COLLECTIONS.SUBSCRIPTIONS)
      .doc(subscriptionId)
      .update({
        tier,
        razorpayPlanId,
        interval,
        updatedAt: Timestamp.now(),
      });

    logger.info("Subscription tier updated", { subscriptionId, tier });
  } catch (err) {
    logger.error("updateSubscriptionTier failed", { subscriptionId, tier, error: err });
    throw err;
  }
}

export async function setCancelAtPeriodEnd(
  subscriptionId: string,
  cancelAtPeriodEnd: boolean
): Promise<void> {
  try {
    await db
      .collection(COLLECTIONS.SUBSCRIPTIONS)
      .doc(subscriptionId)
      .update({ cancelAtPeriodEnd, updatedAt: Timestamp.now() });
  } catch (err) {
    logger.error("setCancelAtPeriodEnd failed", { subscriptionId, error: err });
    throw err;
  }
}

// ─── Payments ─────────────────────────────────────────────────────────────────

export async function getPaymentById(paymentId: string): Promise<Payment | null> {
  try {
    const snap = await db
      .collection("payments")
      .doc(paymentId)
      .get();

    if (!snap.exists) return null;
    return { paymentId: snap.id, ...snap.data() } as Payment;
  } catch (err) {
    logger.error("getPaymentById failed", { paymentId, error: err });
    throw err;
  }
}

export async function getPaymentByRazorpayId(
  razorpayPaymentId: string
): Promise<Payment | null> {
  try {
    const snap = await db
      .collection("payments")
      .where("razorpayPaymentId", "==", razorpayPaymentId)
      .limit(1)
      .get();

    if (snap.empty) return null;
    return { paymentId: snap.docs[0].id, ...snap.docs[0].data() } as Payment;
  } catch (err) {
    logger.error("getPaymentByRazorpayId failed", { razorpayPaymentId, error: err });
    throw err;
  }
}

export async function createPayment(params: {
  workspaceId: string;
  razorpayPaymentId: string;
  razorpayOrderId: string;
  razorpaySubscriptionId?: string;
  amount: number;
  currency: string;
  tier: SubscriptionTier;
  interval: "monthly" | "yearly";
  method?: PaymentMethod;
  description?: string;
}): Promise<Payment> {
  try {
    const paymentId = generatePaymentId();
    const now = Timestamp.now();

    const payment: Payment = {
      paymentId,
      workspaceId: params.workspaceId,
      razorpayPaymentId: params.razorpayPaymentId,
      razorpayOrderId: params.razorpayOrderId,
      razorpaySubscriptionId: params.razorpaySubscriptionId,
      amount: params.amount,
      currency: params.currency,
      status: "captured",
      tier: params.tier,
      interval: params.interval,
      method: params.method,
      description: params.description,
      capturedAt: now,
      createdAt: now,
      updatedAt: now,
    };

    await db.collection("payments").doc(paymentId).set(payment);

    logger.info("Payment recorded", {
      paymentId,
      workspaceId: params.workspaceId,
      amount: params.amount,
    });

    return payment;
  } catch (err) {
    logger.error("createPayment failed", { workspaceId: params.workspaceId, error: err });
    throw err;
  }
}

export async function updatePaymentStatus(
  paymentId: string,
  status: PaymentStatus,
  failureReason?: string
): Promise<void> {
  try {
    await db.collection("payments").doc(paymentId).update({
      status,
      ...(failureReason && { failureReason }),
      ...(status === "captured" && { capturedAt: Timestamp.now() }),
      updatedAt: Timestamp.now(),
    });
  } catch (err) {
    logger.error("updatePaymentStatus failed", { paymentId, status, error: err });
    throw err;
  }
}

export async function getPaymentsByWorkspace(
  workspaceId: string,
  limit = 20
): Promise<Payment[]> {
  try {
    const snap = await db
      .collection("payments")
      .where("workspaceId", "==", workspaceId)
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get();

    return snap.docs.map((doc) => ({
      paymentId: doc.id,
      ...doc.data(),
    })) as Payment[];
  } catch (err) {
    logger.error("getPaymentsByWorkspace failed", { workspaceId, error: err });
    throw err;
  }
}

// ─── Invoices ─────────────────────────────────────────────────────────────────

export async function createInvoice(params: {
  workspaceId: string;
  paymentId: string;
  amount: number;
  currency: string;
  tier: SubscriptionTier;
  interval: "monthly" | "yearly";
  periodStart: FirebaseFirestore.Timestamp;
  periodEnd: FirebaseFirestore.Timestamp;
  lineItems: InvoiceLineItem[];
  invoiceUrl?: string;
}): Promise<Invoice> {
  try {
    const invoiceId = generateInvoiceId();
    const now = Timestamp.now();

    const invoice: Invoice = {
      invoiceId,
      workspaceId: params.workspaceId,
      paymentId: params.paymentId,
      amount: params.amount,
      currency: params.currency,
      status: "paid",
      tier: params.tier,
      interval: params.interval,
      periodStart: params.periodStart,
      periodEnd: params.periodEnd,
      paidAt: now,
      invoiceUrl: params.invoiceUrl,
      lineItems: params.lineItems,
      createdAt: now,
      updatedAt: now,
    };

    await db.collection("invoices").doc(invoiceId).set(invoice);

    logger.info("Invoice created", { invoiceId, workspaceId: params.workspaceId });
    return invoice;
  } catch (err) {
    logger.error("createInvoice failed", { workspaceId: params.workspaceId, error: err });
    throw err;
  }
}

export async function getInvoicesByWorkspace(
  workspaceId: string,
  limit = 12
): Promise<Invoice[]> {
  try {
    const snap = await db
      .collection("invoices")
      .where("workspaceId", "==", workspaceId)
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get();

    return snap.docs.map((doc) => ({
      invoiceId: doc.id,
      ...doc.data(),
    })) as Invoice[];
  } catch (err) {
    logger.error("getInvoicesByWorkspace failed", { workspaceId, error: err });
    throw err;
  }
}

export async function updateInvoiceStatus(
  invoiceId: string,
  status: InvoiceStatus
): Promise<void> {
  try {
    await db.collection("invoices").doc(invoiceId).update({
      status,
      updatedAt: Timestamp.now(),
    });
  } catch (err) {
    logger.error("updateInvoiceStatus failed", { invoiceId, status, error: err });
    throw err;
  }
}

// ─── Webhook logs (deduplication + audit) ────────────────────────────────────

export async function getWebhookLog(
  razorpayEventId: string
): Promise<WebhookLog | null> {
  try {
    const snap = await db
      .collection("webhookLogs")
      .where("razorpayEventId", "==", razorpayEventId)
      .limit(1)
      .get();

    if (snap.empty) return null;
    return { webhookId: snap.docs[0].id, ...snap.docs[0].data() } as WebhookLog;
  } catch (err) {
    logger.error("getWebhookLog failed", { razorpayEventId, error: err });
    throw err;
  }
}

export async function createWebhookLog(params: {
  event: string;
  razorpayEventId: string;
  workspaceId?: string;
}): Promise<WebhookLog> {
  try {
    const webhookId = generateWebhookId();
    const now = Timestamp.now();

    const log: WebhookLog = {
      webhookId,
      event: params.event,
      razorpayEventId: params.razorpayEventId,
      workspaceId: params.workspaceId,
      processed: false,
      receivedAt: now,
      createdAt: now,
      updatedAt: now,
    };

    await db.collection("webhookLogs").doc(webhookId).set(log);
    return log;
  } catch (err) {
    logger.error("createWebhookLog failed", { ...params, error: err });
    throw err;
  }
}

export async function markWebhookProcessed(
  webhookId: string,
  error?: string
): Promise<void> {
  try {
    await db.collection("webhookLogs").doc(webhookId).update({
      processed: !error,
      ...(error && { processingError: error }),
      processedAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
  } catch (err) {
    logger.error("markWebhookProcessed failed", { webhookId, error: err });
    throw err;
  }
}

// ─── Workspace tier update (atomic with subscription) ────────────────────────

export async function updateWorkspaceTier(
  workspaceId: string,
  tier: SubscriptionTier,
  subscriptionStatus: SubscriptionStatus
): Promise<void> {
  try {
    await db.collection(COLLECTIONS.WORKSPACES).doc(workspaceId).update({
      tier,
      subscriptionStatus,
      updatedAt: Timestamp.now(),
    });

    logger.info("Workspace tier updated", { workspaceId, tier, subscriptionStatus });
  } catch (err) {
    logger.error("updateWorkspaceTier failed", { workspaceId, tier, error: err });
    throw err;
  }
}
