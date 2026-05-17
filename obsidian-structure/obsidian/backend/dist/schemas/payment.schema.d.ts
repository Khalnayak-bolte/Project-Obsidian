/**
 * backend/schemas/payment.schema.ts
 * Project: Obsidian
 *
 * Zod validation schemas for all billing and payment-related request bodies.
 * Covers order creation, payment verification, subscription management,
 * Razorpay webhook events, and invoice queries.
 */
import { z } from "zod";
export declare const SubscriptionTierEnum: z.ZodEnum<["gold", "premium", "deluxe"]>;
export declare const BillingIntervalEnum: z.ZodEnum<["monthly", "yearly"]>;
export declare const PaymentMethodTypeEnum: z.ZodEnum<["card", "netbanking", "upi", "wallet", "emi"]>;
export declare const CreateOrderSchema: z.ZodObject<{
    tier: z.ZodEnum<["gold", "premium", "deluxe"]>;
    interval: z.ZodEnum<["monthly", "yearly"]>;
    workspaceId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    workspaceId: string;
    tier: "gold" | "premium" | "deluxe";
    interval: "monthly" | "yearly";
}, {
    workspaceId: string;
    tier: "gold" | "premium" | "deluxe";
    interval: "monthly" | "yearly";
}>;
export type CreateOrderInput = z.infer<typeof CreateOrderSchema>;
export declare const VerifyPaymentSchema: z.ZodObject<{
    razorpayOrderId: z.ZodString;
    razorpayPaymentId: z.ZodString;
    razorpaySignature: z.ZodString;
    workspaceId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    workspaceId: string;
    razorpayPaymentId: string;
    razorpayOrderId: string;
    razorpaySignature: string;
}, {
    workspaceId: string;
    razorpayPaymentId: string;
    razorpayOrderId: string;
    razorpaySignature: string;
}>;
export type VerifyPaymentInput = z.infer<typeof VerifyPaymentSchema>;
export declare const CancelSubscriptionSchema: z.ZodObject<{
    workspaceId: z.ZodString;
    cancelAtPeriodEnd: z.ZodBoolean;
    reason: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    workspaceId: string;
    cancelAtPeriodEnd: boolean;
    reason?: string | undefined;
}, {
    workspaceId: string;
    cancelAtPeriodEnd: boolean;
    reason?: string | undefined;
}>;
export type CancelSubscriptionInput = z.infer<typeof CancelSubscriptionSchema>;
export declare const ReactivateSubscriptionSchema: z.ZodObject<{
    workspaceId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    workspaceId: string;
}, {
    workspaceId: string;
}>;
export type ReactivateSubscriptionInput = z.infer<typeof ReactivateSubscriptionSchema>;
export declare const ChangePlanSchema: z.ZodObject<{
    workspaceId: z.ZodString;
    newTier: z.ZodEnum<["gold", "premium", "deluxe"]>;
    interval: z.ZodEnum<["monthly", "yearly"]>;
    prorated: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}, "strip", z.ZodTypeAny, {
    workspaceId: string;
    interval: "monthly" | "yearly";
    newTier: "gold" | "premium" | "deluxe";
    prorated: boolean;
}, {
    workspaceId: string;
    interval: "monthly" | "yearly";
    newTier: "gold" | "premium" | "deluxe";
    prorated?: boolean | undefined;
}>;
export type ChangePlanInput = z.infer<typeof ChangePlanSchema>;
export declare const RazorpayWebhookSchema: z.ZodObject<{
    entity: z.ZodLiteral<"event">;
    account_id: z.ZodString;
    event: z.ZodString;
    contains: z.ZodArray<z.ZodString, "many">;
    payload: z.ZodObject<{
        payment: z.ZodOptional<z.ZodObject<{
            entity: z.ZodObject<{
                id: z.ZodString;
                entity: z.ZodLiteral<"payment">;
                amount: z.ZodNumber;
                currency: z.ZodString;
                status: z.ZodString;
                order_id: z.ZodString;
                invoice_id: z.ZodNullable<z.ZodOptional<z.ZodString>>;
                subscription_id: z.ZodNullable<z.ZodOptional<z.ZodString>>;
                method: z.ZodString;
                captured: z.ZodBoolean;
                description: z.ZodNullable<z.ZodOptional<z.ZodString>>;
                error_code: z.ZodNullable<z.ZodOptional<z.ZodString>>;
                error_description: z.ZodNullable<z.ZodOptional<z.ZodString>>;
                created_at: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                id: string;
                status: string;
                captured: boolean;
                entity: "payment";
                amount: number;
                currency: string;
                order_id: string;
                method: string;
                created_at: number;
                description?: string | null | undefined;
                invoice_id?: string | null | undefined;
                subscription_id?: string | null | undefined;
                error_code?: string | null | undefined;
                error_description?: string | null | undefined;
            }, {
                id: string;
                status: string;
                captured: boolean;
                entity: "payment";
                amount: number;
                currency: string;
                order_id: string;
                method: string;
                created_at: number;
                description?: string | null | undefined;
                invoice_id?: string | null | undefined;
                subscription_id?: string | null | undefined;
                error_code?: string | null | undefined;
                error_description?: string | null | undefined;
            }>;
        }, "strip", z.ZodTypeAny, {
            entity: {
                id: string;
                status: string;
                captured: boolean;
                entity: "payment";
                amount: number;
                currency: string;
                order_id: string;
                method: string;
                created_at: number;
                description?: string | null | undefined;
                invoice_id?: string | null | undefined;
                subscription_id?: string | null | undefined;
                error_code?: string | null | undefined;
                error_description?: string | null | undefined;
            };
        }, {
            entity: {
                id: string;
                status: string;
                captured: boolean;
                entity: "payment";
                amount: number;
                currency: string;
                order_id: string;
                method: string;
                created_at: number;
                description?: string | null | undefined;
                invoice_id?: string | null | undefined;
                subscription_id?: string | null | undefined;
                error_code?: string | null | undefined;
                error_description?: string | null | undefined;
            };
        }>>;
        subscription: z.ZodOptional<z.ZodObject<{
            entity: z.ZodObject<{
                id: z.ZodString;
                entity: z.ZodLiteral<"subscription">;
                plan_id: z.ZodString;
                status: z.ZodString;
                current_start: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
                current_end: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
                ended_at: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
                quantity: z.ZodNumber;
                notes: z.ZodNullable<z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>>;
                charge_at: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
                created_at: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                id: string;
                status: string;
                entity: "subscription";
                created_at: number;
                plan_id: string;
                quantity: number;
                current_start?: number | null | undefined;
                current_end?: number | null | undefined;
                ended_at?: number | null | undefined;
                notes?: Record<string, string> | null | undefined;
                charge_at?: number | null | undefined;
            }, {
                id: string;
                status: string;
                entity: "subscription";
                created_at: number;
                plan_id: string;
                quantity: number;
                current_start?: number | null | undefined;
                current_end?: number | null | undefined;
                ended_at?: number | null | undefined;
                notes?: Record<string, string> | null | undefined;
                charge_at?: number | null | undefined;
            }>;
        }, "strip", z.ZodTypeAny, {
            entity: {
                id: string;
                status: string;
                entity: "subscription";
                created_at: number;
                plan_id: string;
                quantity: number;
                current_start?: number | null | undefined;
                current_end?: number | null | undefined;
                ended_at?: number | null | undefined;
                notes?: Record<string, string> | null | undefined;
                charge_at?: number | null | undefined;
            };
        }, {
            entity: {
                id: string;
                status: string;
                entity: "subscription";
                created_at: number;
                plan_id: string;
                quantity: number;
                current_start?: number | null | undefined;
                current_end?: number | null | undefined;
                ended_at?: number | null | undefined;
                notes?: Record<string, string> | null | undefined;
                charge_at?: number | null | undefined;
            };
        }>>;
        refund: z.ZodOptional<z.ZodObject<{
            entity: z.ZodObject<{
                id: z.ZodString;
                entity: z.ZodLiteral<"refund">;
                amount: z.ZodNumber;
                currency: z.ZodString;
                payment_id: z.ZodString;
                status: z.ZodString;
                created_at: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                id: string;
                status: string;
                entity: "refund";
                amount: number;
                currency: string;
                created_at: number;
                payment_id: string;
            }, {
                id: string;
                status: string;
                entity: "refund";
                amount: number;
                currency: string;
                created_at: number;
                payment_id: string;
            }>;
        }, "strip", z.ZodTypeAny, {
            entity: {
                id: string;
                status: string;
                entity: "refund";
                amount: number;
                currency: string;
                created_at: number;
                payment_id: string;
            };
        }, {
            entity: {
                id: string;
                status: string;
                entity: "refund";
                amount: number;
                currency: string;
                created_at: number;
                payment_id: string;
            };
        }>>;
    }, "strip", z.ZodTypeAny, {
        payment?: {
            entity: {
                id: string;
                status: string;
                captured: boolean;
                entity: "payment";
                amount: number;
                currency: string;
                order_id: string;
                method: string;
                created_at: number;
                description?: string | null | undefined;
                invoice_id?: string | null | undefined;
                subscription_id?: string | null | undefined;
                error_code?: string | null | undefined;
                error_description?: string | null | undefined;
            };
        } | undefined;
        subscription?: {
            entity: {
                id: string;
                status: string;
                entity: "subscription";
                created_at: number;
                plan_id: string;
                quantity: number;
                current_start?: number | null | undefined;
                current_end?: number | null | undefined;
                ended_at?: number | null | undefined;
                notes?: Record<string, string> | null | undefined;
                charge_at?: number | null | undefined;
            };
        } | undefined;
        refund?: {
            entity: {
                id: string;
                status: string;
                entity: "refund";
                amount: number;
                currency: string;
                created_at: number;
                payment_id: string;
            };
        } | undefined;
    }, {
        payment?: {
            entity: {
                id: string;
                status: string;
                captured: boolean;
                entity: "payment";
                amount: number;
                currency: string;
                order_id: string;
                method: string;
                created_at: number;
                description?: string | null | undefined;
                invoice_id?: string | null | undefined;
                subscription_id?: string | null | undefined;
                error_code?: string | null | undefined;
                error_description?: string | null | undefined;
            };
        } | undefined;
        subscription?: {
            entity: {
                id: string;
                status: string;
                entity: "subscription";
                created_at: number;
                plan_id: string;
                quantity: number;
                current_start?: number | null | undefined;
                current_end?: number | null | undefined;
                ended_at?: number | null | undefined;
                notes?: Record<string, string> | null | undefined;
                charge_at?: number | null | undefined;
            };
        } | undefined;
        refund?: {
            entity: {
                id: string;
                status: string;
                entity: "refund";
                amount: number;
                currency: string;
                created_at: number;
                payment_id: string;
            };
        } | undefined;
    }>;
    created_at: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    event: string;
    entity: "event";
    created_at: number;
    account_id: string;
    contains: string[];
    payload: {
        payment?: {
            entity: {
                id: string;
                status: string;
                captured: boolean;
                entity: "payment";
                amount: number;
                currency: string;
                order_id: string;
                method: string;
                created_at: number;
                description?: string | null | undefined;
                invoice_id?: string | null | undefined;
                subscription_id?: string | null | undefined;
                error_code?: string | null | undefined;
                error_description?: string | null | undefined;
            };
        } | undefined;
        subscription?: {
            entity: {
                id: string;
                status: string;
                entity: "subscription";
                created_at: number;
                plan_id: string;
                quantity: number;
                current_start?: number | null | undefined;
                current_end?: number | null | undefined;
                ended_at?: number | null | undefined;
                notes?: Record<string, string> | null | undefined;
                charge_at?: number | null | undefined;
            };
        } | undefined;
        refund?: {
            entity: {
                id: string;
                status: string;
                entity: "refund";
                amount: number;
                currency: string;
                created_at: number;
                payment_id: string;
            };
        } | undefined;
    };
}, {
    event: string;
    entity: "event";
    created_at: number;
    account_id: string;
    contains: string[];
    payload: {
        payment?: {
            entity: {
                id: string;
                status: string;
                captured: boolean;
                entity: "payment";
                amount: number;
                currency: string;
                order_id: string;
                method: string;
                created_at: number;
                description?: string | null | undefined;
                invoice_id?: string | null | undefined;
                subscription_id?: string | null | undefined;
                error_code?: string | null | undefined;
                error_description?: string | null | undefined;
            };
        } | undefined;
        subscription?: {
            entity: {
                id: string;
                status: string;
                entity: "subscription";
                created_at: number;
                plan_id: string;
                quantity: number;
                current_start?: number | null | undefined;
                current_end?: number | null | undefined;
                ended_at?: number | null | undefined;
                notes?: Record<string, string> | null | undefined;
                charge_at?: number | null | undefined;
            };
        } | undefined;
        refund?: {
            entity: {
                id: string;
                status: string;
                entity: "refund";
                amount: number;
                currency: string;
                created_at: number;
                payment_id: string;
            };
        } | undefined;
    };
}>;
export type RazorpayWebhookInput = z.infer<typeof RazorpayWebhookSchema>;
export declare const ListInvoicesQuerySchema: z.ZodObject<{
    limit: z.ZodPipeline<z.ZodEffects<z.ZodOptional<z.ZodString>, number, string | undefined>, z.ZodNumber>;
    cursor: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodEnum<["draft", "paid", "void", "uncollectible"]>>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    cursor?: string | undefined;
    status?: "void" | "draft" | "paid" | "uncollectible" | undefined;
}, {
    limit?: string | undefined;
    cursor?: string | undefined;
    status?: "void" | "draft" | "paid" | "uncollectible" | undefined;
}>;
export type ListInvoicesQueryInput = z.infer<typeof ListInvoicesQuerySchema>;
export declare const BillingDashboardQuerySchema: z.ZodObject<{
    workspaceId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    workspaceId: string;
}, {
    workspaceId: string;
}>;
export type BillingDashboardQueryInput = z.infer<typeof BillingDashboardQuerySchema>;
export declare const ApplyCouponSchema: z.ZodObject<{
    workspaceId: z.ZodString;
    couponCode: z.ZodString;
}, "strip", z.ZodTypeAny, {
    workspaceId: string;
    couponCode: string;
}, {
    workspaceId: string;
    couponCode: string;
}>;
export type ApplyCouponInput = z.infer<typeof ApplyCouponSchema>;
export declare const RequestRefundSchema: z.ZodObject<{
    workspaceId: z.ZodString;
    paymentId: z.ZodString;
    amount: z.ZodOptional<z.ZodNumber>;
    reason: z.ZodString;
}, "strip", z.ZodTypeAny, {
    workspaceId: string;
    reason: string;
    paymentId: string;
    amount?: number | undefined;
}, {
    workspaceId: string;
    reason: string;
    paymentId: string;
    amount?: number | undefined;
}>;
export type RequestRefundInput = z.infer<typeof RequestRefundSchema>;
//# sourceMappingURL=payment.schema.d.ts.map