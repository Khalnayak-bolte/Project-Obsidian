import { FirestoreTimestamps } from "./common";
import { SubscriptionTier } from "../config/appConfig";

// ─── Payment ──────────────────────────────────────────────────────────────────

export type PaymentStatus = "created" | "authorized" | "captured" | "failed" | "refunded";

export interface Payment extends FirestoreTimestamps {
  paymentId: string;
  workspaceId: string;
  razorpayPaymentId: string;
  razorpayOrderId: string;
  razorpaySubscriptionId?: string;
  amount: number;                       // paise
  currency: string;                     // "INR"
  status: PaymentStatus;
  tier: SubscriptionTier;
  interval: "monthly" | "yearly";
  method?: PaymentMethod;
  description?: string;
  capturedAt?: FirebaseFirestore.Timestamp;
  failureReason?: string;
}

// ─── Payment Method ───────────────────────────────────────────────────────────

export type PaymentMethodType =
  | "card"
  | "netbanking"
  | "upi"
  | "wallet"
  | "emi";

export interface PaymentMethod {
  type: PaymentMethodType;
  last4?: string;                       // for cards
  bank?: string;                        // for netbanking
  wallet?: string;                      // for wallets
  vpa?: string;                         // for UPI (Virtual Payment Address)
}

// ─── Invoice ──────────────────────────────────────────────────────────────────

export type InvoiceStatus = "draft" | "paid" | "void" | "uncollectible";

export interface Invoice extends FirestoreTimestamps {
  invoiceId: string;
  workspaceId: string;
  paymentId: string;
  razorpayInvoiceId?: string;
  amount: number;                       // paise
  currency: string;
  status: InvoiceStatus;
  tier: SubscriptionTier;
  interval: "monthly" | "yearly";
  periodStart: FirebaseFirestore.Timestamp;
  periodEnd: FirebaseFirestore.Timestamp;
  paidAt?: FirebaseFirestore.Timestamp;
  invoiceUrl?: string;                  // hosted invoice PDF URL
  lineItems: InvoiceLineItem[];
}

export interface InvoiceLineItem {
  description: string;
  amount: number;                       // paise
  quantity: number;
}

// ─── Webhook Event ────────────────────────────────────────────────────────────

export interface RazorpayWebhookEvent {
  entity: "event";
  account_id: string;
  event: string;
  contains: string[];
  payload: {
    payment?: { entity: RazorpayPaymentEntity };
    subscription?: { entity: RazorpaySubscriptionEntity };
    refund?: { entity: RazorpayRefundEntity };
  };
  created_at: number;                   // Unix timestamp
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
  notes?: Record<string, string>;       // workspaceId stored here
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

// ─── Webhook Log ──────────────────────────────────────────────────────────────

// Stored in Firestore for deduplication + audit
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

// ─── Request / Response DTOs ──────────────────────────────────────────────────

export interface CreateOrderDto {
  tier: SubscriptionTier;
  interval: "monthly" | "yearly";
  workspaceId: string;
}

export interface CreateOrderResponseDto {
  orderId: string;
  amount: number;                       // paise
  currency: string;
  razorpayKeyId: string;               // public key for frontend checkout
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
  storageUsed: number;                  // bytes
  storageLimit: number;                 // bytes
  memberCount: number;
  memberLimit: number;
  invoices: Invoice[];
}

export interface CancelSubscriptionDto {
  workspaceId: string;
  cancelAtPeriodEnd: boolean;           // true = cancel at end, false = immediate
}
