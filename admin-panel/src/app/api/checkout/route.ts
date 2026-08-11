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
  type SubscriptionPlan,
  type BillingCycle,
} from '@/lib/plans';

// ------------------------------------------------------------------
// Environment (server-side only)
// ------------------------------------------------------------------

const DEVIFY_API_URL = process.env.DEVIFY_API_URL || 'https://devifypay.site';
const DEVIFY_API_KEY = process.env.DEVIFY_API_KEY || '';

// ------------------------------------------------------------------
// CORS headers for cross-origin requests from the Expo app
// ------------------------------------------------------------------

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json(null, { status: 204, headers: corsHeaders });
}

// ------------------------------------------------------------------
// POST /api/checkout
// ------------------------------------------------------------------

interface CheckoutRequestBody {
  planId: string;
  billingCycle: string;
  userId: string;
  userEmail: string;
}

export async function POST(request: NextRequest) {
  try {
    // 1. Validate API key is configured
    if (!DEVIFY_API_KEY) {
      console.error('[Checkout] DEVIFY_API_KEY is not configured');
      return NextResponse.json(
        { error: 'Payment service not configured' },
        { status: 500, headers: corsHeaders }
      );
    }

    // 2. Parse and validate request body
    const body: CheckoutRequestBody = await request.json();
    const { planId, billingCycle, userId, userEmail } = body;

    if (!planId || !billingCycle || !userId || !userEmail) {
      return NextResponse.json(
        { error: 'Missing required fields: planId, billingCycle, userId, userEmail' },
        { status: 400, headers: corsHeaders }
      );
    }

    if (!isValidPurchasablePlan(planId)) {
      return NextResponse.json(
        { error: `Invalid or non-purchasable plan: ${planId}` },
        { status: 400, headers: corsHeaders }
      );
    }

    if (billingCycle !== 'monthly' && billingCycle !== 'yearly') {
      return NextResponse.json(
        { error: 'billingCycle must be "monthly" or "yearly"' },
        { status: 400, headers: corsHeaders }
      );
    }

    const validPlan = planId as SubscriptionPlan;

    // 3. Get the REAL price (dynamic lookup from Firestore plan matrix, fallback to server defaults)
    let amountPaise = 0;
    let planName: string = planId;

    try {
      const planDocSnap = await getDoc(doc(db, "system_config", "plan_matrix"));
      if (planDocSnap.exists() && Array.isArray(planDocSnap.data()?.plans)) {
        const dynamicPlans: any[] = planDocSnap.data().plans;
        const matched = dynamicPlans.find((p) => p.id === planId || p.name?.toUpperCase() === planId.toUpperCase());
        if (matched) {
          const priceRupees = billingCycle === 'yearly' ? matched.yearlyPrice : matched.monthlyPrice;
          if (priceRupees && priceRupees > 0) {
            amountPaise = priceRupees * 100;
            planName = matched.name || planId;
          }
        }
      }
    } catch (err) {
      console.warn('[Checkout] Dynamic price lookup notice:', err);
    }

    if (!amountPaise || amountPaise <= 0) {
      if (validPlan in SERVER_PLANS) {
        amountPaise = getPriceInPaise(validPlan, billingCycle as BillingCycle);
        const planDef = SERVER_PLANS[validPlan];
        if (planDef) {
          planName = planDef.name;
        }
      } else {
        return NextResponse.json(
          { error: `Price configuration not found for plan ${planId}` },
          { status: 400, headers: corsHeaders }
        );
      }
    }

    // 4. Generate idempotency key to prevent duplicate orders
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const idempotencyKey = `${userId}_${planId}_${billingCycle}_${today}`;

    // 5. Create Devify Order
    const orderRes = await fetch(`${DEVIFY_API_URL}/v1/orders`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${DEVIFY_API_KEY}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify({
        amount: amountPaise,
        currency: 'INR',
        description: `${planName} Plan (${billingCycle})`,
        customer: {
          email: userEmail,
        },
      }),
    });

    if (!orderRes.ok) {
      const errorText = await orderRes.text();
      console.error('[Checkout] Devify order creation failed:', orderRes.status, errorText);
      return NextResponse.json(
        { error: 'Failed to create payment order' },
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
    const paymentRes = await fetch(`${DEVIFY_API_URL}/v1/payments`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${DEVIFY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        order_id: orderId,
        method: 'UPI',
      }),
    });

    if (!paymentRes.ok) {
      const errorText = await paymentRes.text();
      console.error('[Checkout] Devify payment creation failed:', paymentRes.status, errorText);
      return NextResponse.json(
        { error: 'Failed to create payment' },
        { status: 502, headers: corsHeaders }
      );
    }

    const paymentData = await paymentRes.json();
    const paymentId = paymentData.id || paymentData.payment_id;
    const checkoutUrl = paymentData.checkout_url || paymentData.checkoutUrl;

    if (!checkoutUrl) {
      console.error('[Checkout] Devify payment response missing checkout_url:', paymentData);
      return NextResponse.json(
        { error: 'Invalid payment response from payment gateway' },
        { status: 502, headers: corsHeaders }
      );
    }

    // 7. Save order record to Firestore
    const orderDocRef = doc(collection(db, 'subscription_orders'), orderId);
    await setDoc(orderDocRef, {
      orderId,
      paymentId: paymentId || null,
      userId,
      userEmail,
      planId,
      billingCycle,
      amountPaise,
      currency: 'INR',
      status: 'PENDING',
      idempotencyKey,
      webhookProcessedId: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      paidAt: null,
    });

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
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}
