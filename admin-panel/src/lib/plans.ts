// ============================================================
// Admin Panel — Server-Side Plan Pricing (Devify Pay)
// ============================================================
//
// This is the AUTHORITATIVE price source for payment creation.
// The backend NEVER trusts amounts sent from the client.
// If plan prices change, update this file AND src/config/plans.ts in the Expo app.
//

export type SubscriptionPlan =
  | 'FREE'
  | 'STARTER'
  | 'PROFESSIONAL'
  | 'MULTI_PROPERTY'
  | 'ENTERPRISE';

export type BillingCycle = 'monthly' | 'yearly';
export type BillingDurationMonths = 1 | 3 | 6 | 12;

export interface ServerPlanPricing {
  /** Price in INR (rupees, not paise) */
  monthlyPrice: number;
  /** Price in INR (rupees, not paise) */
  yearlyPrice: number;
  /** Human-readable plan name */
  name: string;
}

export const SERVER_BILLING_PERIODS: {
  months: BillingDurationMonths;
  discountPercent: number;
  label: string;
}[] = [
  { months: 1, discountPercent: 0, label: '1 Month' },
  { months: 3, discountPercent: 5, label: '3 Months' },
  { months: 6, discountPercent: 10, label: '6 Months' },
  { months: 12, discountPercent: 15, label: '1 Year' },
];

/**
 * Server-side plan pricing lookup.
 * Prices must match the Expo app's `src/config/plans.ts`.
 */
export const SERVER_PLANS: Record<SubscriptionPlan, ServerPlanPricing> = {
  FREE: {
    name: 'Free',
    monthlyPrice: 0,
    yearlyPrice: 0,
  },
  STARTER: {
    name: 'Starter',
    monthlyPrice: 349,
    yearlyPrice: 3499,
  },
  PROFESSIONAL: {
    name: 'Professional',
    monthlyPrice: 799,
    yearlyPrice: 7999,
  },
  MULTI_PROPERTY: {
    name: 'Multi-Property',
    monthlyPrice: 1999,
    yearlyPrice: 19999,
  },
  ENTERPRISE: {
    name: 'Enterprise',
    monthlyPrice: 0, // custom pricing
    yearlyPrice: 0,
  },
};

export function getDurationDiscountPercent(months: BillingDurationMonths): number {
  const period = SERVER_BILLING_PERIODS.find((p) => p.months === months);
  return period ? period.discountPercent : 0;
}

/**
 * Authoritatively calculates itemized amounts in Rupees.
 */
export function calculateServerPlanAmounts(
  plan: SubscriptionPlan,
  durationMonths: BillingDurationMonths = 1
): {
  baseMonthlyPrice: number;
  baseTotalRupees: number;
  durationDiscountPercent: number;
  durationDiscountRupees: number;
  subtotalRupees: number;
} {
  const pricing = SERVER_PLANS[plan];
  if (!pricing) throw new Error(`Unknown plan: ${plan}`);

  const baseMonthlyPrice = pricing.monthlyPrice;
  const discountPercent = getDurationDiscountPercent(durationMonths);
  const baseTotalRupees = baseMonthlyPrice * durationMonths;
  const durationDiscountRupees = Math.round(baseTotalRupees * (discountPercent / 100));
  const subtotalRupees = Math.max(0, baseTotalRupees - durationDiscountRupees);

  return {
    baseMonthlyPrice,
    baseTotalRupees,
    durationDiscountPercent: discountPercent,
    durationDiscountRupees,
    subtotalRupees,
  };
}

/**
 * Returns the price in PAISE for a given plan and billing cycle / duration.
 * Devify Pay expects amounts in the smallest currency unit.
 */
export function getPriceInPaise(
  plan: SubscriptionPlan,
  billingCycle: BillingCycle
): number {
  const pricing = SERVER_PLANS[plan];
  if (!pricing) throw new Error(`Unknown plan: ${plan}`);

  const priceRupees =
    billingCycle === 'yearly' ? pricing.yearlyPrice : pricing.monthlyPrice;

  if (priceRupees <= 0) {
    throw new Error(`Plan "${plan}" has no payable price (₹${priceRupees})`);
  }

  return priceRupees * 100;
}

/**
 * Validates that a plan ID is a known, purchasable plan.
 */
export function isValidPurchasablePlan(plan: string): plan is SubscriptionPlan {
  return (
    plan in SERVER_PLANS &&
    plan !== 'FREE' &&
    plan !== 'ENTERPRISE'
  );
}

