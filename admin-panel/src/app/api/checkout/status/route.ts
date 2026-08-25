// ============================================================
// Admin Panel — GET /api/checkout/status
// ============================================================
//
// Polls the payment status of an order from Firestore.
// The Expo app calls this after opening the Devify checkout URL
// to detect when the webhook has updated the order.
//

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { completeQualifyingReferral } from '@/lib/referrals';

// ------------------------------------------------------------------
// CORS headers for cross-origin requests from the Expo app
// ------------------------------------------------------------------

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

// ------------------------------------------------------------------
// GET /api/checkout/status?orderId=xxx
// ------------------------------------------------------------------

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('orderId');

    if (!orderId) {
      return NextResponse.json(
        { error: 'Missing required query parameter: orderId' },
        { status: 400, headers: corsHeaders }
      );
    }

    let orderData: any = null;

    // 1. Look up the live order in Firestore
    try {
      const orderDocRef = doc(db, 'subscription_orders', orderId);
      const orderSnap = await getDoc(orderDocRef);

      if (orderSnap.exists()) {
        orderData = orderSnap.data();
        if (orderData.status === 'PAID') {
          return NextResponse.json(
            {
              orderId: orderData.orderId,
              status: 'PAID',
              planId: orderData.planId,
              billingCycle: orderData.billingCycle,
              amountPaise: orderData.amountPaise,
              paidAt: orderData.paidAt || null,
            },
            { status: 200, headers: corsHeaders }
          );
        }
      }
    } catch (err: any) {
      console.warn('[CheckoutStatus] Firestore lookup notice:', err?.message || err);
    }

    // 2. Direct Devify Pay Gateway Status Check (fallback if webhook hasn't arrived yet)
    try {
      let devifyApiUrl = process.env.DEVIFY_API_URL || 'https://devifypay.site';
      let devifyApiKey = process.env.DEVIFY_API_KEY || '';

      const devifyDocSnap = await getDoc(doc(db, 'system_config', 'devify_config'));
      if (devifyDocSnap.exists()) {
        const cfg = devifyDocSnap.data();
        if (cfg?.apiKey && cfg.apiKey !== 'sk_test_xxx') devifyApiKey = cfg.apiKey;
        if (cfg?.apiUrl) devifyApiUrl = cfg.apiUrl;
      }

      if (devifyApiKey) {
        const gatewayRes = await fetch(`${devifyApiUrl}/v1/orders/${encodeURIComponent(orderId)}`, {
          method: 'GET',
          headers: {
            'X-Api-Key': devifyApiKey,
            Authorization: `Bearer ${devifyApiKey}`,
            'Content-Type': 'application/json',
          },
        });

        if (gatewayRes.ok) {
          const gatewayData = await gatewayRes.json();
          const gwStatus = (gatewayData.status || gatewayData.order_status || '').toUpperCase();
          const isPaid = gwStatus === 'PAID' || gwStatus === 'COMPLETED' || gwStatus === 'SUCCESS' || gatewayData.paid === true;

          if (isPaid) {
            const paidTimestamp = gatewayData.paid_at || new Date().toISOString();
            // Update Firestore so subsequent checks are instant
            const resolvedUserId = orderData?.userId || searchParams.get('userId');
            const resolvedPlanId = orderData?.planId || searchParams.get('planId') || 'PROFESSIONAL';

            try {
              const orderDocRef = doc(db, 'subscription_orders', orderId);
              await setDoc(
                orderDocRef,
                {
                  orderId,
                  status: 'PAID',
                  paidAt: paidTimestamp,
                  planId: resolvedPlanId,
                  billingCycle: orderData?.billingCycle || searchParams.get('billingCycle') || 'monthly',
                  updatedAt: new Date().toISOString(),
                },
                { merge: true }
              );

              // Complete qualifying referral if referee purchased a paid subscription
              if (resolvedUserId) {
                await completeQualifyingReferral(resolvedUserId, orderId, resolvedPlanId);
              }
            } catch (_) {}

            return NextResponse.json(
              {
                orderId,
                status: 'PAID',
                planId: orderData?.planId || searchParams.get('planId') || 'PROFESSIONAL',
                billingCycle: orderData?.billingCycle || searchParams.get('billingCycle') || 'monthly',
                amountPaise: orderData?.amountPaise || 0,
                paidAt: paidTimestamp,
              },
              { status: 200, headers: corsHeaders }
            );
          }
        }
      }
    } catch (gwErr) {
      console.warn('[CheckoutStatus] Direct Devify API check notice:', gwErr);
    }

    // 3. Fallback to existing Firestore status or PENDING
    return NextResponse.json(
      {
        orderId,
        status: orderData?.status || 'PENDING',
        planId: orderData?.planId || searchParams.get('planId') || '',
        billingCycle: orderData?.billingCycle || searchParams.get('billingCycle') || '',
        amountPaise: orderData?.amountPaise || 0,
        paidAt: orderData?.paidAt || null,
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('[CheckoutStatus] Unexpected error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}
