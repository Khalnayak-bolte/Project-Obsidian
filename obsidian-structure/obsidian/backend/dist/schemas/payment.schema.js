/**
 * backend/schemas/payment.schema.ts
 * Project: Obsidian
 *
 * Zod validation schemas for all billing and payment-related request bodies.
 * Covers order creation, payment verification, subscription management,
 * Razorpay webhook events, and invoice queries.
 */
import { z } from "zod";
// ─── Shared enums ─────────────────────────────────────────────────────────────
export const SubscriptionTierEnum = z.enum(["gold", "premium", "deluxe"], {
    errorMap: () => ({
        message: "Tier must be one of: gold, premium, deluxe.",
    }),
});
export const BillingIntervalEnum = z.enum(["monthly", "yearly"], {
    errorMap: () => ({
        message: "Billing interval must be either 'monthly' or 'yearly'.",
    }),
});
export const PaymentMethodTypeEnum = z.enum(["card", "netbanking", "upi", "wallet", "emi"], {
    errorMap: () => ({
        message: "Payment method must be one of: card, netbanking, upi, wallet, emi.",
    }),
});
// ─── Shared field definitions ─────────────────────────────────────────────────
const workspaceIdField = z
    .string({ required_error: "Workspace ID is required." })
    .trim()
    .min(1, "Workspace ID must not be empty.")
    .max(64, "Workspace ID must not exceed 64 characters.");
const razorpayIdField = (label) => z
    .string({ required_error: `${label} is required.` })
    .trim()
    .min(1, `${label} must not be empty.`)
    .max(128, `${label} must not exceed 128 characters.`);
// ─── Create Order ─────────────────────────────────────────────────────────────
// Called when user selects a plan to initiate the Razorpay checkout.
export const CreateOrderSchema = z.object({
    tier: SubscriptionTierEnum,
    interval: BillingIntervalEnum,
    workspaceId: workspaceIdField,
});
// ─── Verify Payment ───────────────────────────────────────────────────────────
// Called after Razorpay checkout succeeds to confirm and activate the plan.
export const VerifyPaymentSchema = z.object({
    razorpayOrderId: razorpayIdField("Razorpay order ID"),
    razorpayPaymentId: razorpayIdField("Razorpay payment ID"),
    razorpaySignature: z
        .string({ required_error: "Razorpay signature is required." })
        .trim()
        .min(1, "Razorpay signature must not be empty.")
        .max(256, "Razorpay signature must not exceed 256 characters."),
    workspaceId: workspaceIdField,
});
// ─── Cancel Subscription ──────────────────────────────────────────────────────
export const CancelSubscriptionSchema = z.object({
    workspaceId: workspaceIdField,
    cancelAtPeriodEnd: z.boolean({
        required_error: "cancelAtPeriodEnd is required.",
    }),
    reason: z
        .string()
        .trim()
        .max(512, "Reason must not exceed 512 characters.")
        .optional(),
});
// ─── Reactivate Subscription ──────────────────────────────────────────────────
export const ReactivateSubscriptionSchema = z.object({
    workspaceId: workspaceIdField,
});
// ─── Change Plan ──────────────────────────────────────────────────────────────
// Upgrade or downgrade to a different tier.
export const ChangePlanSchema = z.object({
    workspaceId: workspaceIdField,
    newTier: SubscriptionTierEnum,
    interval: BillingIntervalEnum,
    prorated: z.boolean().optional().default(true),
});
// ─── Razorpay Webhook ─────────────────────────────────────────────────────────
// Raw payload shape received from Razorpay webhooks.
// HMAC signature is verified in middleware before this schema runs.
const RazorpayPaymentEntitySchema = z.object({
    id: z.string(),
    entity: z.literal("payment"),
    amount: z.number().int().min(0),
    currency: z.string().length(3, "Currency must be a 3-letter ISO code."),
    status: z.string(),
    order_id: z.string(),
    invoice_id: z.string().optional().nullable(),
    subscription_id: z.string().optional().nullable(),
    method: z.string(),
    captured: z.boolean(),
    description: z.string().optional().nullable(),
    error_code: z.string().optional().nullable(),
    error_description: z.string().optional().nullable(),
    created_at: z.number().int(),
});
const RazorpaySubscriptionEntitySchema = z.object({
    id: z.string(),
    entity: z.literal("subscription"),
    plan_id: z.string(),
    status: z.string(),
    current_start: z.number().int().optional().nullable(),
    current_end: z.number().int().optional().nullable(),
    ended_at: z.number().int().optional().nullable(),
    quantity: z.number().int().min(1),
    notes: z.record(z.string()).optional().nullable(),
    charge_at: z.number().int().optional().nullable(),
    created_at: z.number().int(),
});
const RazorpayRefundEntitySchema = z.object({
    id: z.string(),
    entity: z.literal("refund"),
    amount: z.number().int().min(0),
    currency: z.string().length(3),
    payment_id: z.string(),
    status: z.string(),
    created_at: z.number().int(),
});
export const RazorpayWebhookSchema = z.object({
    entity: z.literal("event"),
    account_id: z.string(),
    event: z.string().min(1, "Event type must not be empty."),
    contains: z.array(z.string()).min(1),
    payload: z.object({
        payment: z
            .object({ entity: RazorpayPaymentEntitySchema })
            .optional(),
        subscription: z
            .object({ entity: RazorpaySubscriptionEntitySchema })
            .optional(),
        refund: z
            .object({ entity: RazorpayRefundEntitySchema })
            .optional(),
    }),
    created_at: z.number().int().min(0),
});
// ─── List Invoices Query ──────────────────────────────────────────────────────
export const ListInvoicesQuerySchema = z.object({
    limit: z
        .string()
        .optional()
        .transform((v) => (v ? parseInt(v, 10) : 20))
        .pipe(z
        .number()
        .int()
        .min(1, "Limit must be at least 1.")
        .max(100, "Limit must not exceed 100.")),
    cursor: z.string().trim().optional(),
    status: z
        .enum(["draft", "paid", "void", "uncollectible"], {
        errorMap: () => ({
            message: "Invoice status must be one of: draft, paid, void, uncollectible.",
        }),
    })
        .optional(),
});
// ─── Get Billing Dashboard Query ──────────────────────────────────────────────
export const BillingDashboardQuerySchema = z.object({
    workspaceId: workspaceIdField,
});
// ─── Apply Coupon ─────────────────────────────────────────────────────────────
export const ApplyCouponSchema = z.object({
    workspaceId: workspaceIdField,
    couponCode: z
        .string({ required_error: "Coupon code is required." })
        .trim()
        .toUpperCase()
        .min(4, "Coupon code must be at least 4 characters.")
        .max(32, "Coupon code must not exceed 32 characters.")
        .regex(/^[A-Z0-9_-]+$/, "Coupon code may only contain uppercase letters, numbers, underscores, and hyphens."),
});
// ─── Request Refund ───────────────────────────────────────────────────────────
export const RequestRefundSchema = z.object({
    workspaceId: workspaceIdField,
    paymentId: razorpayIdField("Payment ID"),
    amount: z
        .number()
        .int("Refund amount must be a whole number (paise).")
        .min(100, "Minimum refund amount is ₹1 (100 paise).")
        .optional(), // omit for full refund
    reason: z
        .string({ required_error: "Refund reason is required." })
        .trim()
        .min(4, "Refund reason must be at least 4 characters.")
        .max(512, "Refund reason must not exceed 512 characters."),
});
//# sourceMappingURL=payment.schema.js.map