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
import { recordCouponRedemption } from '@/lib/coupons';
import { completeQualifyingReferral, addWalletTransaction } from '@/lib/referrals';

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
  signature: string,
  secret: string
): boolean {
  if (!secret) {
    console.error('[Webhook] Webhook secret is not configured');
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
  const expectedDirectSig = createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');

  if (compare(expectedDirectSig, signature)) {
    return true;
  }

  // 2. Timestamped HMAC-SHA256 signature
  if (timestamp) {
    const timestampedPayload = `${timestamp}.${rawBody}`;
    const expectedTimestampedSig = createHmac('sha256', secret)
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
    // 0. Resolve webhook secret (Firestore override -> process.env)
    let webhookSecret = DEVIFY_WEBHOOK_SECRET;
    try {
      const devifyDocSnap = await getDoc(doc(db, 'system_config', 'devify_config'));
      if (devifyDocSnap.exists()) {
        const cfg = devifyDocSnap.data();
        if (cfg?.webhookSecret && cfg.webhookSecret !== 'whsec_xxx') {
          webhookSecret = cfg.webhookSecret;
        }
      }
    } catch (err) {
      console.warn('[Webhook] Firestore devify_config lookup notice:', err);
    }

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
    if (!verifySignature(rawBody, timestamp, signature, webhookSecret)) {
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

  // 5. Multi-Collection Sync (subscriptions, owners, audit_logs)
  try {
    const resolvedUserId = orderData.userId || 'OWNER_DEFAULT_101';
    const resolvedPlanId = (orderData.planId || 'STARTER').toUpperCase();
    const resolvedCycle = orderData.billingCycle || 'monthly';
    const durationMonths = orderData.durationMonths || (resolvedCycle === 'yearly' ? 12 : 1);
    const amountRupees = orderData.amountPaise ? orderData.amountPaise / 100 : (orderData.finalAmountRupees || 399);

    const renewalDate = new Date();
    renewalDate.setMonth(renewalDate.getMonth() + durationMonths);
    const renewalStr = renewalDate.toISOString().split('T')[0];

    // a) Update/Create subscriptions collection doc
    const subDocId = `sub_${resolvedUserId.toLowerCase()}`;
    const { setDoc, addDoc, collection: getCollection } = await import('firebase/firestore');
    await setDoc(
      doc(db, 'subscriptions', subDocId),
      {
        id: subDocId,
        property: orderData.userEmail || `Homestay (${resolvedUserId})`,
        propertyId: resolvedUserId,
        plan: resolvedPlanId,
        cycle: resolvedCycle,
        amount: `₹ ${amountRupees.toLocaleString('en-IN')}`,
        numericAmount: amountRupees,
        status: 'active',
        renewalDate: `${renewalStr} (Renews)`,
        provider: 'Devify Pay',
        orderId: orderId,
        paymentId: paymentId || orderData.paymentId || null,
        durationMonths,
        updatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      },
      { merge: true }
    );

    // b) Update owners & properties collection doc
    try {
      await setDoc(
        doc(db, 'owners', resolvedUserId),
        {
          plan: resolvedPlanId,
          status: 'Active',
          subscriptionPlan: resolvedPlanId,
          email: orderData.userEmail || undefined,
          lastActive: 'Online Now',
          lastActiveTimestamp: Date.now(),
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    } catch (_) {}

    // c) Emit audit log
    try {
      await addDoc(getCollection(db, 'audit_logs'), {
        actor: orderData.userEmail || resolvedUserId,
        action: 'SUBSCRIPTION_PURCHASE',
        target: resolvedPlanId,
        details: `Subscribed to ${resolvedPlanId} plan (₹${amountRupees}) via Devify Pay Webhook`,
        category: 'SUBSCRIPTION',
        timestamp: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      });
    } catch (_) {}
  } catch (syncErr) {
    console.warn('[Webhook] Multi-collection sync error:', syncErr);
  }

  // 6. Post-Payment Actions:
  // a) Record coupon redemption if a coupon was used
  if (orderData.couponCode) {
    try {
      await recordCouponRedemption(
        orderData.couponCode,
        orderData.userId,
        orderId,
        orderData.couponDiscountRupees || 0
      );
    } catch (couponErr) {
      console.warn('[Webhook] Coupon redemption record notice:', couponErr);
    }
  }

  // b) Debit StayMate credits from user wallet if applied on this order
  if (orderData.appliedCreditsRupees && orderData.appliedCreditsRupees > 0) {
    try {
      await addWalletTransaction(
        orderData.userId,
        'DEBIT',
        orderData.appliedCreditsRupees,
        'SUBSCRIPTION_DISCOUNT',
        orderId,
        `Applied credits towards ${orderData.planId} subscription (${orderData.durationMonths || 1}M)`
      );
    } catch (creditErr) {
      console.warn('[Webhook] Wallet debit notice:', creditErr);
    }
  }

  // c) Check and complete qualifying referral reward for referrer
  try {
    await completeQualifyingReferral(
      orderData.userId,
      orderId,
      orderData.planId || 'STARTER'
    );
  } catch (refErr) {
    console.warn('[Webhook] Referral reward completion notice:', refErr);
  }
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
