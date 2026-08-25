// ============================================================
// Admin Panel — POST /api/checkout
// ============================================================
//
// Creates a Devify Pay order + payment and returns the checkout URL.
// All secrets stay server-side. Amount is looked up from server-side pricing.
//

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import {
  getPriceInPaise,
  isValidPurchasablePlan,
  SERVER_PLANS,
  calculateServerPlanAmounts,
  type SubscriptionPlan,
  type BillingCycle,
  type BillingDurationMonths,
} from '@/lib/plans';
import { validateCouponServer } from '@/lib/coupons';
import { getUserWalletBalance } from '@/lib/referrals';

// ------------------------------------------------------------------
// Environment & Configuration Resolution
// ------------------------------------------------------------------

const ENV_DEVIFY_API_URL = process.env.DEVIFY_API_URL || 'https://devifypay.site';
const ENV_DEVIFY_API_KEY = process.env.DEVIFY_API_KEY || '';

// ------------------------------------------------------------------
// CORS headers for cross-origin requests from the Expo app
// ------------------------------------------------------------------

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

// ------------------------------------------------------------------
// POST /api/checkout
// ------------------------------------------------------------------

interface CheckoutRequestBody {
  planId: string;
  billingCycle?: string;
  durationMonths?: number;
  userId: string;
  userEmail: string;
  couponCode?: string;
  appliedCreditsPaise?: number;
  amount?: number;
}

export async function POST(request: NextRequest) {
  try {
    // 1. Resolve DEVIFY_API_KEY and DEVIFY_API_URL (Firestore override -> process.env / default)
    let devifyApiUrl = ENV_DEVIFY_API_URL;
    let devifyApiKey = ENV_DEVIFY_API_KEY;

    try {
      const devifyDocSnap = await getDoc(doc(db, 'system_config', 'devify_config'));
      if (devifyDocSnap.exists()) {
        const cfg = devifyDocSnap.data();
        if (cfg?.apiKey && cfg.apiKey !== 'sk_test_xxx') {
          devifyApiKey = cfg.apiKey;
        }
        if (cfg?.apiUrl) {
          devifyApiUrl = cfg.apiUrl;
        }
      }
    } catch (err) {
      console.warn('[Checkout] Firestore devify_config lookup notice:', err);
    }

    if (!devifyApiKey) {
      return NextResponse.json(
        { error: 'Devify Pay API Key is not configured. Please add it in the admin panel.' },
        { status: 400, headers: corsHeaders }
      );
    }

    // 2. Parse and validate request body
    const body: CheckoutRequestBody = await request.json();
    const { planId, userId, userEmail, couponCode, appliedCreditsPaise } = body;

    if (!planId || !userId || !userEmail) {
      return NextResponse.json(
        { error: 'Missing required fields: planId, userId, userEmail' },
        { status: 400, headers: corsHeaders }
      );
    }

    if (!isValidPurchasablePlan(planId)) {
      return NextResponse.json(
        { error: `Invalid or non-purchasable plan: ${planId}` },
        { status: 400, headers: corsHeaders }
      );
    }

    const validPlan = planId as SubscriptionPlan;
    const durationMonths: BillingDurationMonths =
      body.durationMonths === 3 || body.durationMonths === 6 || body.durationMonths === 12
        ? body.durationMonths
        : body.billingCycle === 'yearly'
        ? 12
        : 1;

    const billingCycle = durationMonths === 12 ? 'yearly' : 'monthly';

    // 3. Authoritative server pricing calculation
    const planAmounts = calculateServerPlanAmounts(validPlan, durationMonths);
    let planName = SERVER_PLANS[validPlan]?.name || planId;
    let baseTotalRupees = planAmounts.baseTotalRupees;
    let durationDiscountRupees = planAmounts.durationDiscountRupees;
    let subtotalRupees = planAmounts.subtotalRupees;

    // 4. Validate Coupon server-side if provided
    let validatedCouponDiscountRupees = 0;
    let appliedCouponCode: string | null = null;

    if (couponCode && couponCode.trim()) {
      const couponValidation = await validateCouponServer(
        couponCode,
        validPlan,
        durationMonths,
        userId,
        subtotalRupees
      );
      if (couponValidation.valid) {
        validatedCouponDiscountRupees = couponValidation.discountAmount;
        appliedCouponCode = couponValidation.code;
      }
    }

    // 5. Validate StayMate Credits / Wallet server-side if provided
    let validatedCreditsRupees = 0;
    if (appliedCreditsPaise && appliedCreditsPaise > 0) {
      const requestedCreditsRupees = Math.floor(appliedCreditsPaise / 100);
      const userBalance = await getUserWalletBalance(userId);
      const remainingAfterCoupon = Math.max(0, subtotalRupees - validatedCouponDiscountRupees);
      validatedCreditsRupees = Math.min(requestedCreditsRupees, userBalance, remainingAfterCoupon);
    }

    // 6. Compute final payable amount (minimum ₹1 / 100 paise for gateway)
    const finalAmountRupees = Math.max(
      1,
      subtotalRupees - validatedCouponDiscountRupees - validatedCreditsRupees
    );
    const amountPaise = finalAmountRupees * 100;
    const totalSavingsRupees = durationDiscountRupees + validatedCouponDiscountRupees + validatedCreditsRupees;

    // 4. Generate idempotency key to prevent duplicate orders
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const idempotencyKey = `${userId}_${planId}_${billingCycle}_${Date.now()}`;

    // ------------------------------------------------------------------
    // Live Devify Pay Integration Flow
    // ------------------------------------------------------------------

    // 5. Create Devify Order with full customer object
    const customerPhone = (body as any).userPhone || '9876543210';
    const customerName = (body as any).userName || userEmail.split('@')[0] || 'StayMate Host';

    const orderRes = await fetch(`${devifyApiUrl}/v1/orders`, {
      method: 'POST',
      headers: {
        'X-Api-Key': devifyApiKey,
        Authorization: `Bearer ${devifyApiKey}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify({
        amount: amountPaise,
        currency: 'INR',
        description: `StayMate ${planName} Plan (${durationMonths}M)`,
        customer: {
          name: customerName,
          email: userEmail,
          phone: customerPhone,
        },
      }),
    });

    if (!orderRes.ok) {
      const errorText = await orderRes.text();
      console.error('[Checkout] Devify order creation failed:', orderRes.status, errorText);
      let details = errorText;
      try {
        const parsed = JSON.parse(errorText);
        details = parsed.message || parsed.error || errorText;
      } catch {}
      return NextResponse.json(
        { error: `Devify Pay Order Failed (${orderRes.status}): ${details}` },
        { status: 502, headers: corsHeaders }
      );
    }

    const orderData = await orderRes.json();
    const orderId = orderData.id || orderData.order_id;

    if (!orderId) {
      console.error('[Checkout] Devify order response missing ID:', orderData);
      return NextResponse.json(
        { error: 'Invalid order response from payment gateway' },
        { status: 502, headers: corsHeaders }
      );
    }

    // 6. Create Devify Payment
    const paymentRes = await fetch(`${devifyApiUrl}/v1/payments`, {
      method: 'POST',
      headers: {
        'X-Api-Key': devifyApiKey,
        Authorization: `Bearer ${devifyApiKey}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': `${idempotencyKey}_pay`,
      },
      body: JSON.stringify({
        order_id: orderId,
        method: 'UPI',
      }),
    });

    if (!paymentRes.ok) {
      const errorText = await paymentRes.text();
      console.error('[Checkout] Devify payment creation failed:', paymentRes.status, errorText);
      let details = errorText;
      try {
        const parsed = JSON.parse(errorText);
        details = parsed.message || parsed.error || errorText;
      } catch {}
      return NextResponse.json(
        { error: `Devify Pay Payment Failed (${paymentRes.status}): ${details}` },
        { status: 502, headers: corsHeaders }
      );
    }

    const paymentData = await paymentRes.json();
    const paymentId = paymentData.id || paymentData.payment_id;
    let checkoutUrl =
      paymentData.checkout_url ||
      paymentData.checkoutUrl ||
      (paymentId ? `${devifyApiUrl}/pay/${paymentId}` : null);

    if (!checkoutUrl) {
      console.error('[Checkout] Devify payment response missing checkout_url:', paymentData);
      return NextResponse.json(
        { error: 'Invalid payment response from payment gateway' },
        { status: 502, headers: corsHeaders }
      );
    }

    if (!checkoutUrl.startsWith('http://') && !checkoutUrl.startsWith('https://')) {
      checkoutUrl = `https://${checkoutUrl}`;
    }

    // Attach auto-redirect URL so customer returns to the dedicated success screen
    const successRedirectUrl = `https://admin-guest-check-in-assistant.vercel.app/subscription/success?order_id=${encodeURIComponent(orderId)}&payment_id=${encodeURIComponent(paymentId || '')}&planId=${encodeURIComponent(planId)}&cycle=${encodeURIComponent(billingCycle)}&amount=${encodeURIComponent(finalAmountRupees)}`;
    const separator = checkoutUrl.includes('?') ? '&' : '?';
    checkoutUrl = `${checkoutUrl}${separator}redirect_url=${encodeURIComponent(successRedirectUrl)}`;

    // 6.b Register subscription with Devify Pay API (/v1/subscriptions)
    // This populates the Subscriptions tab in Devify Pay Admin Dashboard (Step 4 of Developer Guide)
    try {
      let devifyPlanId = planId;
      try {
        const plansRes = await fetch(`${devifyApiUrl}/v1/plans`, {
          headers: {
            'X-Api-Key': devifyApiKey,
            Authorization: `Bearer ${devifyApiKey}`,
          },
        });
        if (plansRes.ok) {
          const plansJson = await plansRes.json();
          const pList = plansJson?.data || plansJson?.plans || (Array.isArray(plansJson) ? plansJson : []);
          if (pList.length > 0) {
            const match = pList.find((p: any) => p.name?.toUpperCase()?.includes(planId) || p.id === planId) || pList[0];
            if (match?.id) devifyPlanId = match.id;
          }
        }
      } catch (_) {}

      await fetch(`${devifyApiUrl}/v1/subscriptions`, {
        method: 'POST',
        headers: {
          'X-Api-Key': devifyApiKey,
          Authorization: `Bearer ${devifyApiKey}`,
          'Content-Type': 'application/json',
          'Idempotency-Key': `${idempotencyKey}_sub`,
        },
        body: JSON.stringify({
          plan_id: devifyPlanId,
          customer: {
            name: customerName,
            email: userEmail,
            phone: customerPhone,
          },
          metadata: {
            user_id: userId,
            order_id: orderId,
            payment_id: paymentId,
            billing_cycle: billingCycle,
            duration_months: durationMonths,
            amount_rupees: finalAmountRupees,
          },
        }),
      });
    } catch (subErr) {
      console.warn('[Checkout] Devify subscription register notice:', subErr);
    }

    // 7. Save order record to Firestore (safely wrapped)
    try {
      const orderDocRef = doc(db, 'subscription_orders', orderId);
      await setDoc(orderDocRef, {
        orderId,
        paymentId: paymentId || null,
        userId,
        userEmail,
        planId,
        billingCycle,
        durationMonths,
        baseMonthlyPrice: planAmounts.baseMonthlyPrice,
        baseTotalRupees,
        durationDiscountRupees,
        subtotalRupees,
        couponCode: appliedCouponCode || null,
        couponDiscountRupees: validatedCouponDiscountRupees,
        appliedCreditsRupees: validatedCreditsRupees,
        finalAmountRupees,
        totalSavingsRupees,
        amountPaise,
        currency: 'INR',
        status: 'PENDING',
        idempotencyKey,
        webhookProcessedId: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        paidAt: null,
      });
    } catch (err) {
      console.warn('[Checkout] Order Firestore write notice:', err);
    }

    // 8. Return checkout URL to the app
    return NextResponse.json(
      {
        checkoutUrl,
        orderId,
        paymentId: paymentId || null,
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('[Checkout] Unexpected error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}
