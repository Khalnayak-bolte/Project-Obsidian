/**
 * backend/repositories/subscriptionRepository.ts
 * Project: Obsidian
 *
 * All Firestore read/write operations for subscriptions, payments,
 * invoices, and webhook logs. No business logic — only data access.
 */
import type { Subscription, SubscriptionStatus } from "../types/workspace";
import type { Payment, PaymentStatus, PaymentMethod, Invoice, InvoiceStatus, InvoiceLineItem, WebhookLog } from "../types/billing";
import type { SubscriptionTier } from "../config/appConfig";
export declare function getSubscriptionByWorkspace(workspaceId: string): Promise<Subscription | null>;
export declare function getSubscriptionByRazorpayId(razorpaySubscriptionId: string): Promise<Subscription | null>;
export declare function createSubscription(params: {
    workspaceId: string;
    razorpaySubscriptionId: string;
    razorpayPlanId: string;
    tier: SubscriptionTier;
    interval: "monthly" | "yearly";
    currentPeriodStart: FirebaseFirestore.Timestamp;
    currentPeriodEnd: FirebaseFirestore.Timestamp;
}): Promise<Subscription>;
export declare function updateSubscriptionStatus(subscriptionId: string, status: SubscriptionStatus, extras?: Partial<Pick<Subscription, "currentPeriodStart" | "currentPeriodEnd" | "cancelAtPeriodEnd" | "lastPaymentAt" | "lastPaymentAmount">>): Promise<void>;
export declare function updateSubscriptionTier(subscriptionId: string, tier: SubscriptionTier, razorpayPlanId: string, interval: "monthly" | "yearly"): Promise<void>;
export declare function setCancelAtPeriodEnd(subscriptionId: string, cancelAtPeriodEnd: boolean): Promise<void>;
export declare function getPaymentById(paymentId: string): Promise<Payment | null>;
export declare function getPaymentByRazorpayId(razorpayPaymentId: string): Promise<Payment | null>;
export declare function createPayment(params: {
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
}): Promise<Payment>;
export declare function updatePaymentStatus(paymentId: string, status: PaymentStatus, failureReason?: string): Promise<void>;
export declare function getPaymentsByWorkspace(workspaceId: string, limit?: number): Promise<Payment[]>;
export declare function createInvoice(params: {
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
}): Promise<Invoice>;
export declare function getInvoicesByWorkspace(workspaceId: string, limit?: number): Promise<Invoice[]>;
export declare function updateInvoiceStatus(invoiceId: string, status: InvoiceStatus): Promise<void>;
export declare function getWebhookLog(razorpayEventId: string): Promise<WebhookLog | null>;
export declare function createWebhookLog(params: {
    event: string;
    razorpayEventId: string;
    workspaceId?: string;
}): Promise<WebhookLog>;
export declare function markWebhookProcessed(webhookId: string, error?: string): Promise<void>;
export declare function updateWorkspaceTier(workspaceId: string, tier: SubscriptionTier, subscriptionStatus: SubscriptionStatus): Promise<void>;
//# sourceMappingURL=subscriptionRepository.d.ts.map