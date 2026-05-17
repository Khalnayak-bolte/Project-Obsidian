import { FirestoreTimestamps } from "./common";
import { SubscriptionTier } from "../config/appConfig";
export type PaymentStatus = "created" | "authorized" | "captured" | "failed" | "refunded";
export interface Payment extends FirestoreTimestamps {
    paymentId: string;
    workspaceId: string;
    razorpayPaymentId: string;
    razorpayOrderId: string;
    razorpaySubscriptionId?: string;
    amount: number;
    currency: string;
    status: PaymentStatus;
    tier: SubscriptionTier;
    interval: "monthly" | "yearly";
    method?: PaymentMethod;
    description?: string;
    capturedAt?: FirebaseFirestore.Timestamp;
    failureReason?: string;
}
export type PaymentMethodType = "card" | "netbanking" | "upi" | "wallet" | "emi";
export interface PaymentMethod {
    type: PaymentMethodType;
    last4?: string;
    bank?: string;
    wallet?: string;
    vpa?: string;
}
export type InvoiceStatus = "draft" | "paid" | "void" | "uncollectible";
export interface Invoice extends FirestoreTimestamps {
    invoiceId: string;
    workspaceId: string;
    paymentId: string;
    razorpayInvoiceId?: string;
    amount: number;
    currency: string;
    status: InvoiceStatus;
    tier: SubscriptionTier;
    interval: "monthly" | "yearly";
    periodStart: FirebaseFirestore.Timestamp;
    periodEnd: FirebaseFirestore.Timestamp;
    paidAt?: FirebaseFirestore.Timestamp;
    invoiceUrl?: string;
    lineItems: InvoiceLineItem[];
}
export interface InvoiceLineItem {
    description: string;
    amount: number;
    quantity: number;
}
export interface RazorpayWebhookEvent {
    entity: "event";
    account_id: string;
    event: string;
    contains: string[];
    payload: {
        payment?: {
            entity: RazorpayPaymentEntity;
        };
        subscription?: {
            entity: RazorpaySubscriptionEntity;
        };
        refund?: {
            entity: RazorpayRefundEntity;
        };
    };
    created_at: number;
}
export interface RazorpayPaymentEntity {
    id: string;
    entity: "payment";
    amount: number;
    currency: string;
    status: string;
    order_id: string;
    invoice_id?: string;
    subscription_id?: string;
    method: string;
    captured: boolean;
    description?: string;
    error_code?: string;
    error_description?: string;
    created_at: number;
}
export interface RazorpaySubscriptionEntity {
    id: string;
    entity: "subscription";
    plan_id: string;
    status: string;
    current_start?: number;
    current_end?: number;
    ended_at?: number;
    quantity: number;
    notes?: Record<string, string>;
    charge_at?: number;
    created_at: number;
}
export interface RazorpayRefundEntity {
    id: string;
    entity: "refund";
    amount: number;
    currency: string;
    payment_id: string;
    status: string;
    created_at: number;
}
export interface WebhookLog extends FirestoreTimestamps {
    webhookId: string;
    event: string;
    razorpayEventId: string;
    workspaceId?: string;
    processed: boolean;
    processingError?: string;
    receivedAt: FirebaseFirestore.Timestamp;
    processedAt?: FirebaseFirestore.Timestamp;
}
export interface CreateOrderDto {
    tier: SubscriptionTier;
    interval: "monthly" | "yearly";
    workspaceId: string;
}
export interface CreateOrderResponseDto {
    orderId: string;
    amount: number;
    currency: string;
    razorpayKeyId: string;
    tier: SubscriptionTier;
    interval: "monthly" | "yearly";
}
export interface VerifyPaymentDto {
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
    workspaceId: string;
}
export interface BillingDashboardDto {
    currentTier: SubscriptionTier;
    subscriptionStatus: string;
    currentPeriodEnd: FirebaseFirestore.Timestamp;
    cancelAtPeriodEnd: boolean;
    storageUsed: number;
    storageLimit: number;
    memberCount: number;
    memberLimit: number;
    invoices: Invoice[];
}
export interface CancelSubscriptionDto {
    workspaceId: string;
    cancelAtPeriodEnd: boolean;
}
//# sourceMappingURL=billing.d.ts.map