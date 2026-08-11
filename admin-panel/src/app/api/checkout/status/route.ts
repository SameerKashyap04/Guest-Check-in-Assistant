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
  return NextResponse.json(null, { status: 204, headers: corsHeaders });
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

    // Look up the order in Firestore
    const orderDocRef = doc(db, 'subscription_orders', orderId);
    const orderSnap = await getDoc(orderDocRef);

    if (!orderSnap.exists()) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404, headers: corsHeaders }
      );
    }

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
  } catch (error: any) {
    console.error('[CheckoutStatus] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}
