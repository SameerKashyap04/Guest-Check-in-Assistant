// ============================================================
// Admin Panel — POST /api/subscriptions/cancel
// ============================================================
//
// Cancels a Devify subscription via the Devify Pay API.
// After this call, Devify fires a `subscription.cancelled` webhook
// which automatically updates the database via the webhook handler.
//
// Body: { devifySubscriptionId: "sub_xxx" }
//

import { NextRequest, NextResponse } from 'next/server';

const DEVIFY_API_URL = process.env.DEVIFY_API_URL || 'https://devifypay.site';
const DEVIFY_API_KEY = process.env.DEVIFY_API_KEY || '';

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
    const { devifySubscriptionId } = body;

    if (!devifySubscriptionId || typeof devifySubscriptionId !== 'string') {
      return NextResponse.json(
        { error: 'Missing required field: devifySubscriptionId' },
        { status: 400, headers: corsHeaders }
      );
    }

    if (!DEVIFY_API_KEY) {
      return NextResponse.json(
        { error: 'DEVIFY_API_KEY is not configured' },
        { status: 500, headers: corsHeaders }
      );
    }

    // Call Devify Pay cancel endpoint
    // After this, Devify fires subscription.cancelled webhook → our handler updates the DB
    const res = await fetch(
      `${DEVIFY_API_URL}/v1/subscriptions/${encodeURIComponent(devifySubscriptionId)}/cancel`,
      {
        method: 'POST',
        headers: {
          'X-Api-Key': DEVIFY_API_KEY,
          Authorization: `Bearer ${DEVIFY_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      let details = errText;
      try {
        const parsed = JSON.parse(errText);
        details = parsed.message || parsed.error || errText;
      } catch {}
      console.error(`[CancelSubscription] Devify cancel failed (${res.status}):`, details);
      return NextResponse.json(
        { error: `Devify cancel failed (${res.status}): ${details}` },
        { status: res.status >= 400 && res.status < 500 ? res.status : 502, headers: corsHeaders }
      );
    }

    const data = await res.json().catch(() => ({}));

    console.info(`[CancelSubscription] Cancelled subscription ${devifySubscriptionId}`);

    // Database update happens via the subscription.cancelled webhook — no direct DB write here.
    return NextResponse.json(
      {
        success: true,
        subscriptionId: devifySubscriptionId,
        status: data.status || 'CANCELLED',
        message: 'Subscription cancellation initiated. Your access remains active until the end of the billing period.',
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('[CancelSubscription] Unexpected error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}
