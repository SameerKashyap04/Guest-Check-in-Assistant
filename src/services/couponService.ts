// ============================================================
// StayMate — Client Coupon Service
// ============================================================
//
// Calls the authoritative backend /api/coupons/validate endpoint
// to validate coupon codes, verify rules, and calculate real discounts.
// Includes offline and network-fallback resilience.
//

import { DEVIFY_CONFIG } from '@/config/devify';
import {
  SubscriptionPlan,
  type BillingDurationMonths,
  type CouponValidationResult,
} from '@/types/subscription';
import { calculatePlanPricing } from '@/config/plans';

const candidateUrls = Array.from(
  new Set([
    DEVIFY_CONFIG.ADMIN_API_URL || 'https://admin-guest-check-in-assistant.vercel.app',
    'http://192.168.31.209:3000',
  ])
);

// Fallback client-side coupon rules if server is completely offline
const LOCAL_FALLBACK_COUPONS: Record<
  string,
  {
    type: 'fixed' | 'percentage';
    value: number;
    minAmount: number;
    maxDiscount: number | null;
    applicablePlans?: SubscriptionPlan[];
    applicableDurations?: BillingDurationMonths[];
    expiry: string;
  }
> = {
  SAVE300: {
    type: 'fixed',
    value: 300,
    minAmount: 1000,
    maxDiscount: 300,
    expiry: '2030-12-31',
  },
  WELCOME100: {
    type: 'fixed',
    value: 100,
    minAmount: 300,
    maxDiscount: 100,
    expiry: '2030-12-31',
  },
  STAYMATE15: {
    type: 'percentage',
    value: 15,
    minAmount: 500,
    maxDiscount: 1500,
    applicableDurations: [3, 6, 12],
    expiry: '2030-12-31',
  },
  PROMO500: {
    type: 'fixed',
    value: 500,
    minAmount: 3000,
    maxDiscount: 500,
    applicablePlans: [SubscriptionPlan.PROFESSIONAL, SubscriptionPlan.MULTI_PROPERTY],
    applicableDurations: [6, 12],
    expiry: '2030-12-31',
  },
};

export class CouponService {
  /**
   * Validates coupon code via backend API.
   * Never trusts client discounts alone — server is authoritative.
   */
  async validateCoupon(
    code: string,
    planId: SubscriptionPlan,
    durationMonths: BillingDurationMonths,
    userId: string
  ): Promise<CouponValidationResult> {
    const cleanCode = (code || '').trim().toUpperCase();

    if (!cleanCode) {
      return {
        valid: false,
        discountAmount: 0,
        finalPayableAmount: 0,
        errorMessage: 'Please enter a coupon code',
      };
    }

    // 1. Try candidate backend endpoints
    for (const url of candidateUrls) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);

        const res = await fetch(`${url}/api/coupons/validate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code: cleanCode,
            planId,
            durationMonths,
            userId,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (res.ok) {
          const data = await res.json();
          return {
            valid: Boolean(data.valid),
            discountAmount: data.discountAmount || 0,
            finalPayableAmount: data.finalAmount || 0,
            code: data.code || cleanCode,
            errorMessage: data.valid ? undefined : data.message || 'Invalid coupon code',
          };
        } else {
          const errData = await res.json().catch(() => ({}));
          return {
            valid: false,
            discountAmount: 0,
            finalPayableAmount: 0,
            errorMessage: errData.error || 'Invalid coupon code',
          };
        }
      } catch (networkErr) {
        console.warn(`[CouponService] Endpoint ${url} unreachable, trying fallback...`);
      }
    }

    // 2. Resilient local fallback if backend is unreachable
    return this.validateLocally(cleanCode, planId, durationMonths);
  }

  private validateLocally(
    code: string,
    planId: SubscriptionPlan,
    durationMonths: BillingDurationMonths
  ): CouponValidationResult {
    const breakdown = calculatePlanPricing(planId, durationMonths);
    const subtotal = breakdown.subtotal;
    const rule = LOCAL_FALLBACK_COUPONS[code];

    if (!rule) {
      return {
        valid: false,
        discountAmount: 0,
        finalPayableAmount: subtotal,
        errorMessage: 'Invalid coupon code',
      };
    }

    if (new Date(rule.expiry) < new Date()) {
      return {
        valid: false,
        discountAmount: 0,
        finalPayableAmount: subtotal,
        errorMessage: 'This coupon has expired',
      };
    }

    if (rule.applicablePlans && !rule.applicablePlans.includes(planId)) {
      return {
        valid: false,
        discountAmount: 0,
        finalPayableAmount: subtotal,
        errorMessage: 'This coupon is not valid for this plan',
      };
    }

    if (rule.applicableDurations && !rule.applicableDurations.includes(durationMonths)) {
      return {
        valid: false,
        discountAmount: 0,
        finalPayableAmount: subtotal,
        errorMessage: 'This coupon is not valid for this billing duration',
      };
    }

    if (subtotal < rule.minAmount) {
      return {
        valid: false,
        discountAmount: 0,
        finalPayableAmount: subtotal,
        errorMessage: `This coupon requires a minimum purchase of ₹${rule.minAmount}`,
      };
    }

    let discount = 0;
    if (rule.type === 'percentage') {
      const raw = Math.round(subtotal * (rule.value / 100));
      discount = rule.maxDiscount ? Math.min(raw, rule.maxDiscount) : raw;
    } else {
      discount = Math.min(rule.value, subtotal);
    }

    const finalAmount = Math.max(0, subtotal - discount);

    return {
      valid: true,
      code,
      discountAmount: discount,
      finalPayableAmount: finalAmount,
    };
  }
}

export const couponService = new CouponService();
