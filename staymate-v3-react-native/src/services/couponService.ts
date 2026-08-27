// ============================================================
// StayMate — Client-Side Coupon Service (with Authoritative Backend Validation)
// ============================================================

import {
  SubscriptionPlan,
  type BillingDurationMonths,
  type CouponValidationResult,
  type CouponDefinition,
} from '../types/subscription';
import { DEVIFY_CONFIG } from '../config/devify';
import { calculatePlanPricing } from '../config/plans';

/** Default offline / cached coupon fallback database */
export const DEFAULT_FALLBACK_COUPONS: Record<string, CouponDefinition> = {
  SAVE300: {
    code: 'SAVE300',
    type: 'fixed',
    value: 300,
    minAmount: 1000,
    maxDiscount: 300,
    validUntil: '2030-12-31T23:59:59.999Z',
    isActive: true,
    description: 'Flat ₹300 OFF on billing above ₹1,000',
  },
  WELCOME100: {
    code: 'WELCOME100',
    type: 'fixed',
    value: 100,
    minAmount: 300,
    maxDiscount: 100,
    validUntil: '2030-12-31T23:59:59.999Z',
    isActive: true,
    description: 'Special ₹100 Welcome Discount for new properties',
  },
  STAYMATE15: {
    code: 'STAYMATE15',
    type: 'percentage',
    value: 15,
    minAmount: 500,
    maxDiscount: 1500,
    applicableDurations: [3, 6, 12],
    validUntil: '2030-12-31T23:59:59.999Z',
    isActive: true,
    description: '15% OFF on Multi-Month subscriptions',
  },
  PROMO500: {
    code: 'PROMO500',
    type: 'fixed',
    value: 500,
    minAmount: 3500,
    maxDiscount: 500,
    applicablePlans: [SubscriptionPlan.PROFESSIONAL, SubscriptionPlan.MULTI_PROPERTY],
    applicableDurations: [6, 12],
    validUntil: '2030-12-31T23:59:59.999Z',
    isActive: true,
    description: 'Flat ₹500 OFF on 6-Month or Annual Professional/Multi-Property plans',
  },
};

export class CouponService {
  private candidateUrls: string[];

  constructor() {
    const primary = DEVIFY_CONFIG.ADMIN_API_URL || 'https://admin-guest-check-in-assistant.vercel.app';
    this.candidateUrls = Array.from(new Set([
      primary,
    ]));
  }

  /**
   * Validate a coupon code against the backend API.
   * If offline or unreachable, performs a strict client-side validation using the fallback rules.
   */
  async validateCoupon(
    rawCode: string,
    planId: SubscriptionPlan,
    durationMonths: BillingDurationMonths,
    userId?: string
  ): Promise<CouponValidationResult> {
    const code = (rawCode || '').trim().toUpperCase();
    if (!code) {
      return {
        valid: false,
        discountAmount: 0,
        finalAmount: calculatePlanPricing(planId, durationMonths).subtotal,
        errorMessage: 'Please enter a coupon code',
      };
    }

    // 1. Attempt authoritative backend validation
    for (const url of this.candidateUrls) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);

        const res = await fetch(`${url}/api/coupons/validate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code,
            planId,
            durationMonths,
            userId,
          }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (res.ok) {
          const data: CouponValidationResult = await res.json();
          return data;
        }
      } catch (err: any) {
        console.warn(`[CouponService] Backend at ${url} unavailable:`, err?.message || err);
      }
    }

    // 2. Fallback client-side validation
    return this.validateLocally(code, planId, durationMonths);
  }

  private validateLocally(
    code: string,
    planId: SubscriptionPlan,
    durationMonths: BillingDurationMonths
  ): CouponValidationResult {
    const pricing = calculatePlanPricing(planId, durationMonths);
    const subtotal = pricing.subtotal;

    const coupon = DEFAULT_FALLBACK_COUPONS[code];
    if (!coupon || !coupon.isActive) {
      return {
        valid: false,
        code,
        discountAmount: 0,
        finalAmount: subtotal,
        errorMessage: 'Invalid or inactive coupon code',
      };
    }

    if (coupon.validUntil && new Date(coupon.validUntil).getTime() < Date.now()) {
      return {
        valid: false,
        code,
        discountAmount: 0,
        finalAmount: subtotal,
        errorMessage: 'This coupon code has expired',
      };
    }

    if (coupon.applicablePlans && !coupon.applicablePlans.includes(planId)) {
      return {
        valid: false,
        code,
        discountAmount: 0,
        finalAmount: subtotal,
        errorMessage: `Coupon is not valid for the ${planId} plan`,
      };
    }

    if (coupon.applicableDurations && !coupon.applicableDurations.includes(durationMonths)) {
      return {
        valid: false,
        code,
        discountAmount: 0,
        finalAmount: subtotal,
        errorMessage: `Coupon requires a ${coupon.applicableDurations.join(' or ')}-month billing period`,
      };
    }

    if (coupon.minAmount && subtotal < coupon.minAmount) {
      return {
        valid: false,
        code,
        discountAmount: 0,
        finalAmount: subtotal,
        errorMessage: `Minimum order amount of ₹${coupon.minAmount} required for this coupon`,
      };
    }

    let discountAmount = 0;
    if (coupon.type === 'percentage') {
      const raw = Math.round(subtotal * (coupon.value / 100));
      discountAmount = coupon.maxDiscount ? Math.min(raw, coupon.maxDiscount) : raw;
    } else {
      discountAmount = Math.min(coupon.value, subtotal);
    }

    const finalAmount = Math.max(0, subtotal - discountAmount);

    return {
      valid: true,
      code: coupon.code,
      discountType: coupon.type,
      discountValue: coupon.value,
      discountAmount,
      finalAmount,
    };
  }
}

export const couponService = new CouponService();
