// ============================================================
// Admin Panel — POST /api/webhook/devify
// ============================================================
//
// Handles webhook events from Devify Pay.
// Verifies HMAC-SHA256 signature, prevents duplicate processing,
// validates amount, and updates order status in Firestore.
//

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { createHmac } from 'crypto';
import { getPriceInPaise, type SubscriptionPlan, type BillingCycle } from '@/lib/plans';

// ------------------------------------------------------------------
// Environment (server-side only)
// ------------------------------------------------------------------

const DEVIFY_WEBHOOK_SECRET = process.env.DEVIFY_WEBHOOK_SECRET || '';

// ------------------------------------------------------------------
// Signature Verification
// ------------------------------------------------------------------

/**
 * Verifies the Devify webhook signature.
 * Supports both:
 * 1. Direct HMAC-SHA256 signature over rawBody (Standard Devify Pay Developer Guide format: crypto.createHmac('sha256', secret).update(bodyText).digest('hex'))
 * 2. Timestamped HMAC-SHA256 signature (timestamp + "." + rawBody)
 */
function verifySignature(
  rawBody: string,
  timestamp: string,
  signature: string
): boolean {
  if (!DEVIFY_WEBHOOK_SECRET) {
    console.error('[Webhook] DEVIFY_WEBHOOK_SECRET is not configured');
    return false;
  }

  // Helper for constant-time comparison
  const compare = (sigA: string, sigB: string) => {
    if (sigA.length !== sigB.length) return false;
    let mismatch = 0;
    for (let i = 0; i < sigA.length; i++) {
      mismatch |= sigA.charCodeAt(i) ^ sigB.charCodeAt(i);
    }
    return mismatch === 0;
  };

  // 1. Direct HMAC-SHA256 signature
  const expectedDirectSig = createHmac('sha256', DEVIFY_WEBHOOK_SECRET)
    .update(rawBody)
    .digest('hex');

  if (compare(expectedDirectSig, signature)) {
    return true;
  }

  // 2. Timestamped HMAC-SHA256 signature
  if (timestamp) {
    const timestampedPayload = `${timestamp}.${rawBody}`;
    const expectedTimestampedSig = createHmac('sha256', DEVIFY_WEBHOOK_SECRET)
      .update(timestampedPayload)
      .digest('hex');
    if (compare(expectedTimestampedSig, signature)) {
      return true;
    }
  }

  return false;
}

/**
 * Checks that the webhook timestamp is within 5 minutes of now.
 */
function isTimestampValid(timestamp: string): boolean {
  if (!timestamp) return true; // Optional timestamp check if header omitted
  const ts = parseInt(timestamp, 10);
  if (isNaN(ts)) return false;

  const now = Math.floor(Date.now() / 1000);
  const fiveMinutes = 5 * 60;

  return Math.abs(now - ts) <= fiveMinutes;
}

// ------------------------------------------------------------------
// POST /api/webhook/devify
// ------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    // 1. Read raw body for signature verification
    const rawBody = await request.text();

    // 2. Extract webhook headers (supports both case conventions)
    const timestamp =
      request.headers.get('x-devify-timestamp') ||
      request.headers.get('X-Devify-Timestamp') ||
      '';
    const signature =
      request.headers.get('x-devify-signature') ||
      request.headers.get('X-Devify-Signature') ||
      '';
    const headerEvent =
      request.headers.get('x-devify-event') ||
      request.headers.get('X-Devify-Event') ||
      '';

    // 3. Validate timestamp freshness if present
    if (timestamp && !isTimestampValid(timestamp)) {
      console.warn('[Webhook] Rejected: timestamp too old or invalid:', timestamp);
      return NextResponse.json(
        { error: 'Invalid or expired timestamp' },
        { status: 401 }
      );
    }

    // 4. Verify HMAC-SHA256 signature
    if (!verifySignature(rawBody, timestamp, signature)) {
      console.warn('[Webhook] Rejected: invalid signature');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    // 5. Parse the event payload
    let payload: any;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      );
    }

    const eventType = payload.type || payload.event || headerEvent;
    const eventData = payload.data || payload;

    console.info(`[Webhook] Received event: ${eventType}`, {
      orderId: eventData.order_id || eventData.orderId,
      paymentId: eventData.payment_id || eventData.paymentId,
    });

    // 6. Handle events
    switch (eventType) {
      case 'payment.success':
      case 'order.paid':
      case 'subscription.created':
      case 'subscription.activated':
        await handlePaymentSuccess(eventData, eventType);
        break;

      case 'payment.failed':
      case 'order.failed':
        await handlePaymentFailed(eventData, eventType);
        break;

      default:
        console.info(`[Webhook] Unhandled event type: ${eventType}`);
    }

    // Always return 200 to Devify to acknowledge receipt
    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error: any) {
    console.error('[Webhook] Unexpected error:', error);
    // Still return 200 to avoid Devify retrying on our internal errors
    return NextResponse.json({ received: true }, { status: 200 });
  }
}

// ------------------------------------------------------------------
// Event Handlers
// ------------------------------------------------------------------

async function handlePaymentSuccess(payload: any, eventType: string) {
  const orderId = payload.order_id || payload.orderId;
  const paymentId = payload.payment_id || payload.paymentId;
  const webhookEventId = payload.id || payload.event_id || `${eventType}_${orderId}_${Date.now()}`;

  if (!orderId) {
    console.error('[Webhook] payment.success missing order_id');
    return;
  }

  // 1. Find the order in Firestore
  const orderDocRef = doc(db, 'subscription_orders', orderId);
  const orderSnap = await getDoc(orderDocRef);

  if (!orderSnap.exists()) {
    console.error(`[Webhook] Order not found in Firestore: ${orderId}`);
    return;
  }

  const orderData = orderSnap.data();

  // 2. Prevent duplicate webhook processing
  if (orderData.webhookProcessedId) {
    console.info(`[Webhook] Order ${orderId} already processed by webhook ${orderData.webhookProcessedId}. Skipping.`);
    return;
  }

  // 3. Verify the amount matches (server-side trust)
  const webhookAmount = payload.amount || payload.amount_paise;
  if (webhookAmount !== undefined && webhookAmount !== orderData.amountPaise) {
    console.error(
      `[Webhook] Amount mismatch for order ${orderId}: ` +
      `webhook=${webhookAmount}, stored=${orderData.amountPaise}`
    );
    // Mark as failed due to amount mismatch — possible tampering
    await updateDoc(orderDocRef, {
      status: 'FAILED',
      failureReason: 'Amount mismatch between webhook and order',
      webhookProcessedId: webhookEventId,
      updatedAt: serverTimestamp(),
    });
    return;
  }

  // 4. Mark order as PAID
  await updateDoc(orderDocRef, {
    status: 'PAID',
    paymentId: paymentId || orderData.paymentId,
    webhookProcessedId: webhookEventId,
    paidAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  console.info(
    `[Webhook] ✅ Order ${orderId} marked as PAID. ` +
    `Plan: ${orderData.planId}, User: ${orderData.userId}`
  );
}

async function handlePaymentFailed(payload: any, eventType: string) {
  const orderId = payload.order_id || payload.orderId;
  const webhookEventId = payload.id || payload.event_id || `${eventType}_${orderId}_${Date.now()}`;

  if (!orderId) {
    console.error('[Webhook] payment.failed missing order_id');
    return;
  }

  // 1. Find the order in Firestore
  const orderDocRef = doc(db, 'subscription_orders', orderId);
  const orderSnap = await getDoc(orderDocRef);

  if (!orderSnap.exists()) {
    console.error(`[Webhook] Order not found in Firestore: ${orderId}`);
    return;
  }

  const orderData = orderSnap.data();

  // 2. Prevent duplicate webhook processing
  if (orderData.webhookProcessedId) {
    console.info(`[Webhook] Order ${orderId} already processed. Skipping.`);
    return;
  }

  // 3. Mark order as FAILED
  await updateDoc(orderDocRef, {
    status: 'FAILED',
    failureReason: payload.error_description || payload.reason || 'Payment failed',
    webhookProcessedId: webhookEventId,
    updatedAt: serverTimestamp(),
  });

  console.info(`[Webhook] ❌ Order ${orderId} marked as FAILED. User: ${orderData.userId}`);
}
