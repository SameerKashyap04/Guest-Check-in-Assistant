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

    // Resolve or automatically create/provision the Devify plan ID for this plan+cycle.
    // Ensures metadata.plan_id is ALWAYS populated with a valid Devify Plan ID.
    const resolvedDevifyPlanId = await getOrProvisionDevifyPlanId(
      devifyApiUrl,
      devifyApiKey,
      validPlan,
      billingCycle,
      planName,
      amountPaise
    );

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
        // plan_id in metadata tells Devify Pay to auto-create a TRIALING subscription
        // customer.email is REQUIRED for Devify to link the customer to the subscription
        ...(resolvedDevifyPlanId ? {
          metadata: {
            plan_id: resolvedDevifyPlanId,
            user_id: userId,
            plan_key: `${validPlan}_${billingCycle.toUpperCase()}`,
            billing_cycle: billingCycle,
            duration_months: durationMonths,
          },
        } : {
          metadata: {
            user_id: userId,
            plan_key: `${validPlan}_${billingCycle.toUpperCase()}`,
            billing_cycle: billingCycle,
            duration_months: durationMonths,
          },
        }),
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

    // 7a. Save order record to Firestore (safely wrapped)
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

    // 7b. Store pending_subscription record so the webhook handler can look up the user.
    // This is written AFTER the order so orderId is guaranteed to exist.
    // The webhook fires after payment — by then this doc is already in Firestore.
    try {
      const { addDoc, collection: col } = await import('firebase/firestore');
      const planKey = `${validPlan}_${billingCycle.toUpperCase()}`;
      await addDoc(col(db, 'pending_subscriptions'), {
        userId,
        userEmail,
        planKey,
        devifyPlanId: resolvedDevifyPlanId || null,
        devifyOrderId: orderId,
        devifyPaymentId: paymentId || null,
        devifySubscriptionId: null,  // populated by subscription.activated webhook
        status: 'PENDING',
        createdAt: serverTimestamp(),
      });
    } catch (pendingErr) {
      console.warn('[Checkout] pending_subscriptions write notice:', pendingErr);
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

// ------------------------------------------------------------------
// Auto-Provisioning Helper: Gets or creates Devify Plan ID on-the-fly
// ------------------------------------------------------------------

async function getOrProvisionDevifyPlanId(
  devifyApiUrl: string,
  devifyApiKey: string,
  validPlan: SubscriptionPlan,
  billingCycle: BillingCycle,
  planName: string,
  amountPaise: number
): Promise<string | null> {
  const planKey = billingCycle === 'yearly' ? `${validPlan}_YEARLY` : `${validPlan}_MONTHLY`;

  // 1. Try Firestore cache lookup first
  try {
    const devifyPlansSnap = await getDoc(doc(db, 'system_config', 'devify_plans'));
    if (devifyPlansSnap.exists() && devifyPlansSnap.data()?.[planKey]) {
      return devifyPlansSnap.data()[planKey];
    }
  } catch (err) {
    console.warn('[Checkout] Firestore devify_plans lookup notice:', err);
  }

  // 2. Provision on-the-fly: create plan in Devify Pay
  try {
    const res = await fetch(`${devifyApiUrl}/v1/plans`, {
      method: 'POST',
      headers: {
        'X-Api-Key': devifyApiKey,
        Authorization: `Bearer ${devifyApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: `StayMate ${planName} ${billingCycle === 'yearly' ? 'Yearly' : 'Monthly'}`,
        amount: amountPaise,
        currency: 'INR',
        interval: billingCycle === 'yearly' ? 'YEAR' : 'MONTH',
        interval_count: 1,
      }),
    });

    let planId: string | null = null;

    if (res.status === 201 || res.status === 200) {
      const data = await res.json();
      planId = data.id || data.plan_id || data.data?.id || null;
    } else if (res.status === 409) {
      try {
        const errJson = await res.json();
        planId = errJson.existing_id || errJson.id || errJson.plan_id || errJson.data?.id || null;
      } catch {}

      if (!planId) {
        const listRes = await fetch(`${devifyApiUrl}/v1/plans`, {
          headers: {
            'X-Api-Key': devifyApiKey,
            Authorization: `Bearer ${devifyApiKey}`,
          },
        });
        if (listRes.ok) {
          const listJson = await listRes.json();
          const pList: any[] = listJson.data || listJson.plans || (Array.isArray(listJson) ? listJson : []);
          const match = pList.find((p: any) => p.name?.toLowerCase().includes(validPlan.toLowerCase()) || p.amount === amountPaise);
          if (match?.id) planId = match.id;
        }
      }
    }

    if (planId) {
      try {
        await setDoc(
          doc(db, 'system_config', 'devify_plans'),
          { [planKey]: planId, updatedAt: serverTimestamp() },
          { merge: true }
        );
        console.info(`[Checkout] Auto-provisioned & cached Devify Plan ID for ${planKey}: ${planId}`);
      } catch (_) {}
      return planId;
    }
  } catch (err) {
    console.warn('[Checkout] On-the-fly Devify plan creation notice:', err);
  }

  return null;
}
