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
import { collection, doc, getDoc, setDoc, addDoc } from 'firebase/firestore';
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

async function syncSubscriptionPaid(orderData: any, orderId: string, paidTimestamp: string) {
  try {
    const resolvedUserId = orderData?.userId || 'OWNER_DEFAULT_101';
    const resolvedPlanId = (orderData?.planId || 'STARTER').toUpperCase();
    const resolvedCycle = orderData?.billingCycle || 'monthly';
    const durationMonths = orderData?.durationMonths || (resolvedCycle === 'yearly' ? 12 : 1);
    const amountRupees = orderData?.amountPaise ? orderData.amountPaise / 100 : (orderData?.finalAmountRupees || 399);

    const renewalDate = new Date();
    renewalDate.setMonth(renewalDate.getMonth() + durationMonths);
    const renewalStr = renewalDate.toISOString().split('T')[0];

    // 1. Update subscription_orders
    const orderDocRef = doc(db, 'subscription_orders', orderId);
    await setDoc(
      orderDocRef,
      {
        orderId,
        status: 'PAID',
        paidAt: paidTimestamp,
        planId: resolvedPlanId,
        billingCycle: resolvedCycle,
        durationMonths,
        amountPaise: Math.round(amountRupees * 100),
        finalAmountRupees: amountRupees,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    // 2. Update/Create subscriptions document
    const subDocId = `sub_${resolvedUserId.toLowerCase()}`;
    await setDoc(
      doc(db, 'subscriptions', subDocId),
      {
        id: subDocId,
        property: orderData?.userEmail || `Homestay (${resolvedUserId})`,
        propertyId: resolvedUserId,
        plan: resolvedPlanId,
        cycle: resolvedCycle,
        amount: `₹ ${amountRupees.toLocaleString('en-IN')}`,
        numericAmount: amountRupees,
        status: 'active',
        renewalDate: `${renewalStr} (Renews)`,
        provider: 'Devify Pay',
        orderId: orderId,
        paymentId: orderData?.paymentId || null,
        durationMonths,
        updatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      },
      { merge: true }
    );

    // 3. Update owners & properties documents
    try {
      await setDoc(
        doc(db, 'owners', resolvedUserId),
        {
          plan: resolvedPlanId,
          status: 'Active',
          subscriptionPlan: resolvedPlanId,
          email: orderData?.userEmail || undefined,
          lastActive: 'Online Now',
          lastActiveTimestamp: Date.now(),
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    } catch (_) {}

    // 4. Log Audit Event
    try {
      await addDoc(collection(db, 'audit_logs'), {
        actor: orderData?.userEmail || resolvedUserId,
        action: 'SUBSCRIPTION_PURCHASE',
        target: resolvedPlanId,
        details: `Subscribed to ${resolvedPlanId} plan (₹${amountRupees}) via Devify Pay`,
        category: 'SUBSCRIPTION',
        timestamp: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      });
    } catch (_) {}

    // 5. Complete qualifying referral
    try {
      await completeQualifyingReferral(resolvedUserId, orderId, resolvedPlanId);
    } catch (_) {}
  } catch (err) {
    console.warn('[SyncSubscriptionPaid] Notice:', err);
  }
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
          // Ensure multi-collection sync is updated
          await syncSubscriptionPaid(orderData, orderId, orderData.paidAt || new Date().toISOString());

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
            const mergedOrderData = {
              ...orderData,
              userId: orderData?.userId || searchParams.get('userId') || 'OWNER_DEFAULT_101',
              planId: orderData?.planId || searchParams.get('planId') || 'STARTER',
              billingCycle: orderData?.billingCycle || searchParams.get('billingCycle') || 'monthly',
              amountPaise: orderData?.amountPaise || gatewayData.amount || 39900,
            };

            await syncSubscriptionPaid(mergedOrderData, orderId, paidTimestamp);

            return NextResponse.json(
              {
                orderId,
                status: 'PAID',
                planId: mergedOrderData.planId,
                billingCycle: mergedOrderData.billingCycle,
                amountPaise: mergedOrderData.amountPaise,
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
