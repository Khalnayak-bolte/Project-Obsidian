/**
 * frontend/src/services/billingService.ts
 * Project: Obsidian
 */

import { apiGet, apiPost, apiDelete } from "../lib/axios";

// ─── Types ────────────────────────────────────────────────────────────────────

export type Tier = "gold" | "premium" | "deluxe";
export type BillingInterval = "monthly" | "annual";
export type SubscriptionStatus =
  | "active"
  | "paused"
  | "cancelled"
  | "past_due"
  | "trialing";

export interface TierFeatures {
  maxMembers: number;
  maxStorageBytes: number;
  maxFileSizeBytes: number;
  maxChannels: number;
  guestAccess: boolean;
  voiceQuality: "standard" | "high-fi" | "spatial";
  customRoles: "limited" | "full" | "advanced";
  retentionDays: number;
}

export interface PricingPlan {
  tier: Tier;
  monthlyPricePaise: number;
  annualPricePaise: number;
  monthlyPriceINR: number;
  annualPriceINR: number;
  annualDiscountPercent: number;
  features: TierFeatures;
}

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

export interface Payment {
  paymentId: string;
  workspaceId: string;
  razorpayOrderId: string;
  razorpayPaymentId?: string;
  amount: number;
  currency: string;
  tier: Tier;
  interval: BillingInterval;
  status: "pending" | "captured" | "failed" | "refunded";
  createdAt: string;
}

export interface Invoice {
  invoiceId: string;
  workspaceId: string;
  paymentId: string;
  amount: number;
  currency: string;
  tier: Tier;
  interval: BillingInterval;
  status: "paid" | "pending" | "failed";
  createdAt: string;
}

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

// ─── Pricing ──────────────────────────────────────────────────────────────────

export async function getPricing(): Promise<PricingPlan[]> {
  return apiGet<PricingPlan[]>("/api/v1/payments/pricing");
}

// ─── Orders ───────────────────────────────────────────────────────────────────

export async function createOrder(
  workspaceId: string,
  payload: CreateOrderPayload
): Promise<CreateOrderResponse> {
  return apiPost<CreateOrderResponse>(
    `/api/v1/workspaces/${workspaceId}/payments/order`,
    payload
  );
}

export async function verifyPayment(
  workspaceId: string,
  payload: VerifyPaymentPayload
): Promise<VerifyPaymentResponse> {
  return apiPost<VerifyPaymentResponse>(
    `/api/v1/workspaces/${workspaceId}/payments/verify`,
    payload
  );
}

// ─── Subscription ─────────────────────────────────────────────────────────────

export async function getSubscription(
  workspaceId: string
): Promise<SubscriptionDetailsResponse> {
  return apiGet<SubscriptionDetailsResponse>(
    `/api/v1/workspaces/${workspaceId}/payments/subscription`
  );
}

export async function cancelSubscription(
  workspaceId: string,
  payload: CancelSubscriptionPayload = {}
): Promise<void> {
  return apiPost<void>(
    `/api/v1/workspaces/${workspaceId}/payments/cancel`,
    payload
  );
}

export async function changePlan(
  workspaceId: string,
  payload: ChangePlanPayload
): Promise<CreateOrderResponse> {
  return apiPost<CreateOrderResponse>(
    `/api/v1/workspaces/${workspaceId}/payments/change-plan`,
    payload
  );
}

// ─── Invoices ─────────────────────────────────────────────────────────────────

export async function getInvoices(
  workspaceId: string,
  limit = 10
): Promise<Invoice[]> {
  return apiGet<Invoice[]>(
    `/api/v1/workspaces/${workspaceId}/payments/invoices`,
    { params: { limit } }
  );
}

// ─── Razorpay checkout helper ─────────────────────────────────────────────────

export interface RazorpayCheckoutOptions {
  orderId: string;
  amount: number;
  currency: string;
  workspaceName: string;
  userEmail: string;
  userName: string;
  onSuccess: (response: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }) => void;
  onDismiss?: () => void;
}

export function openRazorpayCheckout(opts: RazorpayCheckoutOptions): void {
  const rzp = new (window as any).Razorpay({
    key: import.meta.env.VITE_RAZORPAY_KEY_ID as string,
    amount: opts.amount,
    currency: opts.currency,
    order_id: opts.orderId,
    name: "Obsidian",
    description: `Obsidian Subscription — ${opts.workspaceName}`,
    image: "/logo.svg",
    prefill: {
      email: opts.userEmail,
      name: opts.userName,
    },
    theme: { color: "#6D5EF5" },
    modal: { ondismiss: opts.onDismiss },
    handler: opts.onSuccess,
  });

  rzp.open();
}
