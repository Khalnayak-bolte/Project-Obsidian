'use strict';
// js/config/razorpay.js

const Razorpay = require('razorpay');

let razorpayInstance = null;

const razorpay = {
  get instance() {
    if (!razorpayInstance) {
      const keyId     = process.env.RAZORPAY_KEY_ID     || '';
      const keySecret = process.env.RAZORPAY_KEY_SECRET || '';
      if (!keyId || !keySecret) {
        console.warn('[Razorpay] No credentials provided. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET');
        return null;
      }
      razorpayInstance = new Razorpay({ key_id: keyId, key_secret: keySecret });
    }
    return razorpayInstance;
  },
};

const RAZORPAY_PLANS = {
  gold_monthly:    process.env.RAZORPAY_PLAN_GOLD_MONTHLY    || '',
  gold_yearly:     process.env.RAZORPAY_PLAN_GOLD_YEARLY     || '',
  premium_monthly: process.env.RAZORPAY_PLAN_PREMIUM_MONTHLY || '',
  premium_yearly:  process.env.RAZORPAY_PLAN_PREMIUM_YEARLY  || '',
  deluxe_monthly:  process.env.RAZORPAY_PLAN_DELUXE_MONTHLY  || '',
  deluxe_yearly:   process.env.RAZORPAY_PLAN_DELUXE_YEARLY   || '',
};

const RAZORPAY_PRICING = {
  gold:    { monthly: 49900,   yearly: 479900   },
  premium: { monthly: 149900,  yearly: 1439900  },
  deluxe:  { monthly: 399900,  yearly: 3839900  },
};

const RAZORPAY_WEBHOOK = {
  secret: process.env.RAZORPAY_WEBHOOK_SECRET || '',
  events: {
    PAYMENT_CAPTURED:       'payment.captured',
    PAYMENT_FAILED:         'payment.failed',
    SUBSCRIPTION_ACTIVATED: 'subscription.activated',
    SUBSCRIPTION_CHARGED:   'subscription.charged',
    SUBSCRIPTION_CANCELLED: 'subscription.cancelled',
    SUBSCRIPTION_PAUSED:    'subscription.paused',
    SUBSCRIPTION_RESUMED:   'subscription.resumed',
    REFUND_CREATED:         'refund.created',
  },
  timestampToleranceMs: 5 * 60 * 1000,
};

const RAZORPAY_CURRENCY = 'INR';

function getPlanKey(tier, interval) {
  return `${tier}_${interval}`;
}

function getPlanId(tier, interval) {
  return RAZORPAY_PLANS[getPlanKey(tier, interval)] || '';
}

function getPrice(tier, interval) {
  return RAZORPAY_PRICING[tier] ? RAZORPAY_PRICING[tier][interval] : 0;
}

function getTierFromPlanId(planId) {
  const entry = Object.entries(RAZORPAY_PLANS).find(([, id]) => id === planId);
  if (!entry) return null;
  return entry[0].split('_')[0];
}

function isValidTier(tier) {
  return ['gold', 'premium', 'deluxe'].includes(tier);
}

module.exports = {
  razorpay,
  RAZORPAY_PLANS,
  RAZORPAY_PRICING,
  RAZORPAY_WEBHOOK,
  RAZORPAY_CURRENCY,
  getPlanKey,
  getPlanId,
  getPrice,
  getTierFromPlanId,
  isValidTier,
};
