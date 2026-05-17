/**
 * backend/services/billingService.ts
 * Project: Obsidian
 */
import { RAZORPAY_PRICING } from "../config/razorpay";
import type { CreateOrderInput, VerifyPaymentInput, CancelSubscriptionInput, ChangePlanInput, RazorpayWebhookInput, ListInvoicesQueryInput } from "../schemas/payment.schema";
export declare function createOrder(workspaceId: string, uid: string, input: CreateOrderInput): Promise<{
    orderId: string;
    amount: number;
    currency: string;
    tier: string;
    interval: string;
}>;
export declare function verifyPayment(workspaceId: string, uid: string, input: VerifyPaymentInput): Promise<{
    success: boolean;
    tier: string;
}>;
export declare function cancelSubscription(workspaceId: string, uid: string, input: CancelSubscriptionInput): Promise<void>;
export declare function changePlan(workspaceId: string, uid: string, input: ChangePlanInput): Promise<{
    orderId: string;
    amount: number;
    currency: string;
}>;
export declare function getSubscription(workspaceId: string): Promise<any>;
export declare function listInvoices(workspaceId: string, query: ListInvoicesQueryInput): Promise<any[]>;
export declare function handleWebhook(rawBody: string, signature: string, payload: RazorpayWebhookInput): Promise<{
    processed: boolean;
}>;
export declare function getPricingInfo(): typeof RAZORPAY_PRICING;
//# sourceMappingURL=billingService.d.ts.map