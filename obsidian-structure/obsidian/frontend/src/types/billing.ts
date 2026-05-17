/**
 * frontend/src/types/billing.ts
 * Project: Obsidian
 */

// ─── Enums ────────────────────────────────────────────────────────────────────

export type Tier = "gold" | "premium" | "deluxe";
export type BillingInterval = "monthly" | "annual";
export type SubscriptionStatus =
  | "active"
  | "paused"
  | "cancelled"
  | "past_due"
  | "trialing";
export type PaymentStatus = "pending" | "captured" | "failed" | "refunded";
export type InvoiceStatus = "paid" | "pending" | "failed";

// ─── Tier features ────────────────────────────────────────────────────────────

export interface TierFeatures {
  maxMembers: number;
  maxStorageBytes: number;
  maxFileSizeBytes: number;
  maxChannels: number;
  maxRoles: number;
  guestAccess: boolean;
  voiceQuality: "standard" | "high-fi" | "spatial";
  customRoles: "limited" | "full" | "advanced";
  retentionDays: number;
}

// ─── Pricing ──────────────────────────────────────────────────────────────────

export interface PricingPlan {
  tier: Tier;
  monthlyPricePaise: number;
  annualPricePaise: number;
  monthlyPriceINR: number;
  annualPriceINR: number;
  annualDiscountPercent: number;
  features: TierFeatures;
}

// ─── Subscription ─────────────────────────────────────────────────────────────

export interface Subscription {
  subscriptionId: string;
  workspaceId: string;
  tier: Tier;
  status: SubscriptionStatus;
  interval: BillingInterval;
  razorpaySubscriptionId?: string;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  cancelAtPeriodEnd: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── Payment ──────────────────────────────────────────────────────────────────

export interface Payment {
  paymentId: string;
  workspaceId: string;
  razorpayOrderId: string;
  razorpayPaymentId?: string;
  amount: number;
  currency: string;
  tier: Tier;
  interval: BillingInterval;
  status: PaymentStatus;
  createdAt: string;
}

// ─── Invoice ──────────────────────────────────────────────────────────────────

export interface Invoice {
  invoiceId: string;
  workspaceId: string;
  paymentId: string;
  razorpayPaymentId?: string;
  amount: number;
  currency: string;
  tier: Tier;
  interval: BillingInterval;
  status: InvoiceStatus;
  createdAt: string;
}

// ─── DTOs ─────────────────────────────────────────────────────────────────────

export interface CreateOrderPayload {
  tier: Tier;
  interval: BillingInterval;
}

export interface CreateOrderResponse {
  orderId: string;
  amount: number;
  currency: string;
  tier: Tier;
  interval: BillingInterval;
}

export interface VerifyPaymentPayload {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}

export interface VerifyPaymentResponse {
  success: boolean;
  tier: Tier;
}

export interface CancelSubscriptionPayload {
  cancelAtPeriodEnd?: boolean;
}

export interface ChangePlanPayload {
  tier: Tier;
  interval: BillingInterval;
}

export interface SubscriptionDetailsResponse {
  subscription: Subscription | null;
  currentTier: Tier;
  recentPayments: Payment[];
}

// ─── Razorpay checkout ────────────────────────────────────────────────────────

export interface RazorpaySuccessResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}
