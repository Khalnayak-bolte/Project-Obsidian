import Razorpay from "razorpay";
import appConfig from "./appConfig";
export declare const razorpay: Razorpay;
export declare const RAZORPAY_PLANS: Record<string, string>;
export declare const RAZORPAY_PRICING: {
    readonly gold: {
        readonly monthly: 49900;
        readonly yearly: 479900;
    };
    readonly premium: {
        readonly monthly: 149900;
        readonly yearly: 1439900;
    };
    readonly deluxe: {
        readonly monthly: 399900;
        readonly yearly: 3839900;
    };
};
export declare const RAZORPAY_WEBHOOK: {
    secret: string;
    events: {
        readonly PAYMENT_CAPTURED: "payment.captured";
        readonly PAYMENT_FAILED: "payment.failed";
        readonly SUBSCRIPTION_ACTIVATED: "subscription.activated";
        readonly SUBSCRIPTION_CHARGED: "subscription.charged";
        readonly SUBSCRIPTION_CANCELLED: "subscription.cancelled";
        readonly SUBSCRIPTION_PAUSED: "subscription.paused";
        readonly SUBSCRIPTION_RESUMED: "subscription.resumed";
        readonly REFUND_CREATED: "refund.created";
    };
    timestampToleranceMs: number;
};
export declare const RAZORPAY_CURRENCY = "INR";
export declare const getPlanKey: (tier: string, interval: "monthly" | "yearly") => string;
export declare const getPlanId: (tier: string, interval: "monthly" | "yearly") => string;
export declare const getPrice: (tier: keyof typeof RAZORPAY_PRICING, interval: "monthly" | "yearly") => number;
export declare const getTierFromPlanId: (planId: string) => string | null;
export declare const isValidTier: (tier: string) => tier is keyof typeof appConfig.subscription.tiers;
//# sourceMappingURL=razorpay.d.ts.map