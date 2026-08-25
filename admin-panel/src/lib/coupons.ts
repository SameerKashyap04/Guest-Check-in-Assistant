// ============================================================
// Admin Panel — Server-Side Coupon Engine
// ============================================================
//
// Authoritative coupon management and validation.
// Evaluates coupons against plan, duration, minimum amounts, expiry dates,
// per-user limits, and calculates the exact validated discount amount.
//

import { db } from '@/lib/firebase';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  increment,
  updateDoc,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { SubscriptionPlan, BillingDurationMonths } from '@/lib/plans';

export type CouponDiscountType = 'percentage' | 'fixed';

export interface ServerCouponDefinition {
  id: string;
  code: string;
  discount_type: CouponDiscountType;
  discount_value: number; // ₹ value or percentage (e.g. 300 or 15)
  minimum_amount: number; // Minimum order subtotal in ₹
  maximum_discount: number | null; // Cap on discount in ₹ (useful for %)
  valid_from: string; // ISO date string
  valid_until: string; // ISO date string
  usage_limit: number | null; // Max total redemptions
  used_count: number;
  per_user_limit: number; // Max redemptions per user ID
  applicable_plan: SubscriptionPlan[] | null; // null = all plans
  applicable_duration: BillingDurationMonths[] | null; // null = all durations
  is_active: boolean;
  description?: string;
}

export interface CouponValidationResponse {
  valid: boolean;
  code: string;
  discountAmount: number; // in Rupees
  finalAmount: number; // in Rupees
  discountType?: CouponDiscountType;
  discountValue?: number;
  message: string;
}

// ------------------------------------------------------------------
// Default Seed Coupons (Available Out of the Box)
// ------------------------------------------------------------------

export const DEFAULT_COUPONS: Record<string, ServerCouponDefinition> = {
  SAVE300: {
    id: 'coupon_save300',
    code: 'SAVE300',
    discount_type: 'fixed',
    discount_value: 300,
    minimum_amount: 1000,
    maximum_discount: 300,
    valid_from: '2025-01-01T00:00:00Z',
    valid_until: '2030-12-31T23:59:59Z',
    usage_limit: 10000,
    used_count: 0,
    per_user_limit: 5,
    applicable_plan: null,
    applicable_duration: null,
    is_active: true,
    description: 'Flat ₹300 OFF on orders above ₹1,000',
  },
  WELCOME100: {
    id: 'coupon_welcome100',
    code: 'WELCOME100',
    discount_type: 'fixed',
    discount_value: 100,
    minimum_amount: 300,
    maximum_discount: 100,
    valid_from: '2025-01-01T00:00:00Z',
    valid_until: '2030-12-31T23:59:59Z',
    usage_limit: 50000,
    used_count: 0,
    per_user_limit: 1,
    applicable_plan: null,
    applicable_duration: null,
    is_active: true,
    description: 'Welcome reward: Flat ₹100 OFF on your first subscription',
  },
  STAYMATE15: {
    id: 'coupon_staymate15',
    code: 'STAYMATE15',
    discount_type: 'percentage',
    discount_value: 15,
    minimum_amount: 500,
    maximum_discount: 1500,
    valid_from: '2025-01-01T00:00:00Z',
    valid_until: '2030-12-31T23:59:59Z',
    usage_limit: null,
    used_count: 0,
    per_user_limit: 3,
    applicable_plan: null,
    applicable_duration: [3, 6, 12], // applicable to 3M+
    is_active: true,
    description: '15% OFF on 3 months, 6 months & 1 year subscriptions (up to ₹1,500)',
  },
  PROMO500: {
    id: 'coupon_promo500',
    code: 'PROMO500',
    discount_type: 'fixed',
    discount_value: 500,
    minimum_amount: 3000,
    maximum_discount: 500,
    valid_from: '2025-01-01T00:00:00Z',
    valid_until: '2030-12-31T23:59:59Z',
    usage_limit: 1000,
    used_count: 0,
    per_user_limit: 2,
    applicable_plan: ['PROFESSIONAL', 'MULTI_PROPERTY'],
    applicable_duration: [6, 12],
    is_active: true,
    description: 'Special ₹500 OFF on Professional & Multi-Property plans for 6M/1Y',
  },
};

// ------------------------------------------------------------------
// Server-side Coupon Lookup & Validation
// ------------------------------------------------------------------

export async function validateCouponServer(
  couponCodeInput: string,
  planId: SubscriptionPlan,
  durationMonths: BillingDurationMonths,
  userId: string,
  subtotalRupees: number
): Promise<CouponValidationResponse> {
  const code = (couponCodeInput || '').trim().toUpperCase();

  if (!code) {
    return {
      valid: false,
      code,
      discountAmount: 0,
      finalAmount: subtotalRupees,
      message: 'Please enter a coupon code',
    };
  }

  // 1. Fetch coupon definition from Firestore or fallback to default seed list
  let coupon: ServerCouponDefinition | null = null;

  try {
    const couponDocRef = doc(db, 'coupons', code);
    const couponSnap = await getDoc(couponDocRef);
    if (couponSnap.exists()) {
      coupon = couponSnap.data() as ServerCouponDefinition;
    }
  } catch (err) {
    console.warn('[CouponValidation] Firestore lookup notice:', err);
  }

  if (!coupon) {
    coupon = DEFAULT_COUPONS[code] || null;
  }

  if (!coupon) {
    return {
      valid: false,
      code,
      discountAmount: 0,
      finalAmount: subtotalRupees,
      message: 'Invalid coupon code',
    };
  }

  // 2. Check if active
  if (!coupon.is_active) {
    return {
      valid: false,
      code,
      discountAmount: 0,
      finalAmount: subtotalRupees,
      message: 'This coupon is no longer active',
    };
  }

  // 3. Check validity date range
  const now = new Date();
  if (coupon.valid_from && new Date(coupon.valid_from) > now) {
    return {
      valid: false,
      code,
      discountAmount: 0,
      finalAmount: subtotalRupees,
      message: 'This coupon is not active yet',
    };
  }
  if (coupon.valid_until && new Date(coupon.valid_until) < now) {
    return {
      valid: false,
      code,
      discountAmount: 0,
      finalAmount: subtotalRupees,
      message: 'This coupon has expired',
    };
  }

  // 4. Check plan restriction
  if (
    coupon.applicable_plan &&
    coupon.applicable_plan.length > 0 &&
    !coupon.applicable_plan.includes(planId)
  ) {
    return {
      valid: false,
      code,
      discountAmount: 0,
      finalAmount: subtotalRupees,
      message: `This coupon is not valid for the ${planId} plan`,
    };
  }

  // 5. Check duration restriction
  if (
    coupon.applicable_duration &&
    coupon.applicable_duration.length > 0 &&
    !coupon.applicable_duration.includes(durationMonths)
  ) {
    return {
      valid: false,
      code,
      discountAmount: 0,
      finalAmount: subtotalRupees,
      message: `This coupon requires a minimum billing duration of ${Math.min(...coupon.applicable_duration)} months`,
    };
  }

  // 6. Check minimum purchase amount
  if (coupon.minimum_amount && subtotalRupees < coupon.minimum_amount) {
    return {
      valid: false,
      code,
      discountAmount: 0,
      finalAmount: subtotalRupees,
      message: `This coupon requires a minimum purchase of ₹${coupon.minimum_amount.toLocaleString('en-IN')}`,
    };
  }

  // 7. Check global usage limit
  if (coupon.usage_limit !== null && coupon.used_count >= coupon.usage_limit) {
    return {
      valid: false,
      code,
      discountAmount: 0,
      finalAmount: subtotalRupees,
      message: 'This coupon has reached its maximum global usage limit',
    };
  }

  // 8. Check per-user redemption limit (Firestore lookup if available)
  if (userId && coupon.per_user_limit > 0) {
    try {
      const redemptionsQuery = query(
        collection(db, 'coupon_redemptions'),
        where('code', '==', code),
        where('userId', '==', userId)
      );
      const redemptionSnaps = await getDocs(redemptionsQuery);
      if (redemptionSnaps.size >= coupon.per_user_limit) {
        return {
          valid: false,
          code,
          discountAmount: 0,
          finalAmount: subtotalRupees,
          message: 'You have already used this coupon the maximum allowed times',
        };
      }
    } catch (err) {
      console.warn('[CouponValidation] User redemption check notice:', err);
    }
  }

  // 9. Calculate discount
  let discountAmount = 0;
  if (coupon.discount_type === 'percentage') {
    const rawDiscount = Math.round(subtotalRupees * (coupon.discount_value / 100));
    if (coupon.maximum_discount !== null && coupon.maximum_discount > 0) {
      discountAmount = Math.min(rawDiscount, coupon.maximum_discount);
    } else {
      discountAmount = rawDiscount;
    }
  } else {
    // Fixed amount
    discountAmount = Math.min(coupon.discount_value, subtotalRupees);
  }

  const finalAmount = Math.max(0, subtotalRupees - discountAmount);

  return {
    valid: true,
    code,
    discountAmount,
    finalAmount,
    discountType: coupon.discount_type,
    discountValue: coupon.discount_value,
    message: `✓ Coupon applied: ₹${discountAmount.toLocaleString('en-IN')} savings`,
  };
}

/**
 * Records coupon redemption in Firestore after successful payment
 */
export async function recordCouponRedemption(
  code: string,
  userId: string,
  orderId: string,
  discountAmount: number
) {
  try {
    const redemptionDocRef = doc(db, 'coupon_redemptions', `${orderId}_${code}`);
    await setDoc(redemptionDocRef, {
      code,
      userId,
      orderId,
      discountAmount,
      createdAt: serverTimestamp(),
    });

    // Increment coupon used_count in Firestore
    const couponDocRef = doc(db, 'coupons', code);
    await updateDoc(couponDocRef, {
      used_count: increment(1),
    }).catch(() => {});
  } catch (err) {
    console.warn('[CouponRedemption] Firestore write notice:', err);
  }
}
