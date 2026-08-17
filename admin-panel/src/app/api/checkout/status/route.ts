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
import { doc, getDoc } from 'firebase/firestore';

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

    // 1. Look up the live order in Firestore
    try {
      const orderDocRef = doc(db, 'subscription_orders', orderId);
      const orderSnap = await getDoc(orderDocRef);

      if (orderSnap.exists()) {
        const orderData = orderSnap.data();
        return NextResponse.json(
          {
            orderId: orderData.orderId,
            status: orderData.status, // 'PENDING' | 'PAID' | 'FAILED'
            planId: orderData.planId,
            billingCycle: orderData.billingCycle,
            amountPaise: orderData.amountPaise,
            paidAt: orderData.paidAt || null,
          },
          { status: 200, headers: corsHeaders }
        );
      }
    } catch (err: any) {
      console.warn('[CheckoutStatus] Firestore lookup notice:', err?.message || err);
    }

    // Fallback if not found yet
    return NextResponse.json(
      {
        orderId,
        status: 'PENDING',
        planId: searchParams.get('planId') || '',
        billingCycle: searchParams.get('billingCycle') || '',
        amountPaise: 0,
        paidAt: null,
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
