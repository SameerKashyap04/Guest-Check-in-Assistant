// ============================================================
// Admin Panel — POST /api/coupons/validate
// ============================================================
//
// Validates a coupon code against plan, duration, and user rules.
// Returns validated discount and final payable amount.
//

import { NextRequest, NextResponse } from 'next/server';
import { validateCouponServer } from '@/lib/coupons';
import {
  calculateServerPlanAmounts,
  isValidPurchasablePlan,
  type SubscriptionPlan,
  type BillingDurationMonths,
} from '@/lib/plans';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, planId, durationMonths, userId } = body;

    if (!code || !planId) {
      return NextResponse.json(
        { error: 'Missing required parameters: code, planId' },
        { status: 400, headers: corsHeaders }
      );
    }

    if (!isValidPurchasablePlan(planId)) {
      return NextResponse.json(
        { error: `Invalid plan for coupon application: ${planId}` },
        { status: 400, headers: corsHeaders }
      );
    }

    const duration: BillingDurationMonths =
      durationMonths === 3 || durationMonths === 6 || durationMonths === 12
        ? durationMonths
        : 1;

    // 1. Authoritatively compute plan subtotal after duration discount
    const planAmounts = calculateServerPlanAmounts(planId as SubscriptionPlan, duration);
    const subtotalRupees = planAmounts.subtotalRupees;

    // 2. Validate coupon
    const validation = await validateCouponServer(
      code,
      planId as SubscriptionPlan,
      duration,
      userId || 'anonymous',
      subtotalRupees
    );

    return NextResponse.json(
      {
        ...validation,
        baseSubtotalRupees: subtotalRupees,
        baseMonthlyPrice: planAmounts.baseMonthlyPrice,
        baseTotalRupees: planAmounts.baseTotalRupees,
        durationDiscountRupees: planAmounts.durationDiscountRupees,
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('[CouponValidateAPI] Unexpected error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}
