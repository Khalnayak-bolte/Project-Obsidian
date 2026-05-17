import Razorpay from "razorpay";
// Razorpay client instance
export const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || "",
    key_secret: process.env.RAZORPAY_KEY_SECRET || "",
});
// Plan IDs from Razorpay dashboard — set these after creating plans
export const RAZORPAY_PLANS = {
    gold_monthly: process.env.RAZORPAY_PLAN_GOLD_MONTHLY || "",
    gold_yearly: process.env.RAZORPAY_PLAN_GOLD_YEARLY || "",
    premium_monthly: process.env.RAZORPAY_PLAN_PREMIUM_MONTHLY || "",
    premium_yearly: process.env.RAZORPAY_PLAN_PREMIUM_YEARLY || "",
    deluxe_monthly: process.env.RAZORPAY_PLAN_DELUXE_MONTHLY || "",
    deluxe_yearly: process.env.RAZORPAY_PLAN_DELUXE_YEARLY || "",
};
// Pricing in paise (INR × 100)
export const RAZORPAY_PRICING = {
    gold: {
        monthly: 49900, // ₹499/month
        yearly: 479900, // ₹4,799/year
    },
    premium: {
        monthly: 149900, // ₹1,499/month
        yearly: 1439900, // ₹14,399/year
    },
    deluxe: {
        monthly: 399900, // ₹3,999/month
        yearly: 3839900, // ₹38,399/year
    },
};
// Webhook config
export const RAZORPAY_WEBHOOK = {
    secret: process.env.RAZORPAY_WEBHOOK_SECRET || "",
    // All events we listen for
    events: {
        PAYMENT_CAPTURED: "payment.captured",
        PAYMENT_FAILED: "payment.failed",
        SUBSCRIPTION_ACTIVATED: "subscription.activated",
        SUBSCRIPTION_CHARGED: "subscription.charged",
        SUBSCRIPTION_CANCELLED: "subscription.cancelled",
        SUBSCRIPTION_PAUSED: "subscription.paused",
        SUBSCRIPTION_RESUMED: "subscription.resumed",
        REFUND_CREATED: "refund.created",
    },
    // Replay attack window — reject webhooks older than this
    timestampToleranceMs: 5 * 60 * 1000, // 5 minutes
};
// Currency
export const RAZORPAY_CURRENCY = "INR";
// Helper — get plan key from tier + interval
export const getPlanKey = (tier, interval) => {
    return `${tier}_${interval}`;
};
// Helper — get plan ID from tier + interval
export const getPlanId = (tier, interval) => {
    const key = getPlanKey(tier, interval);
    return RAZORPAY_PLANS[key] || "";
};
// Helper — get price in paise
export const getPrice = (tier, interval) => {
    return RAZORPAY_PRICING[tier][interval];
};
// Helper — get tier from Razorpay plan ID (reverse lookup)
export const getTierFromPlanId = (planId) => {
    const entry = Object.entries(RAZORPAY_PLANS).find(([, id]) => id === planId);
    if (!entry)
        return null;
    const [key] = entry;
    return key.split("_")[0]; // "gold_monthly" → "gold"
};
export const isValidTier = (tier) => {
    return ["gold", "premium", "deluxe"].includes(tier);
};
//# sourceMappingURL=razorpay.js.map