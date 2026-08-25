import { Linking, Platform } from 'react-native';
import type { BillingDurationMonths } from '../types/subscription';

export interface DevifyCheckoutParams {
  planName: string;
  billingCycle: 'monthly' | 'yearly';
  durationMonths?: BillingDurationMonths;
  amount: number; // in INR
  userEmail?: string;
  userId?: string;
  couponCode?: string;
  appliedCreditsPaise?: number;
}

export interface DevifyCheckoutResult {
  checkoutUrl: string;
  orderId: string;
  paymentId?: string | null;
  isSandbox?: boolean;
}

export interface DevifyOrderStatus {
  orderId: string;
  status: 'PENDING' | 'PAID' | 'FAILED' | 'EXPIRED';
  amount?: number;
  currency?: string;
  paymentId?: string;
  paidAt?: string;
}

const DEVIFY_LIVE_KEY = process.env.EXPO_PUBLIC_DEVIFY_KEY || '';
const DEVIFY_BASE_URL = 'https://devifypay.site';
const ADMIN_BASE_URL = 'https://admin-guest-check-in-assistant.vercel.app';

class DevifyPayService {
  private baseUrl: string = ADMIN_BASE_URL;

  /**
   * Initiates a real Devify Pay checkout session
   */
  async createCheckout(params: DevifyCheckoutParams): Promise<DevifyCheckoutResult> {
    const {
      planName,
      billingCycle,
      durationMonths = billingCycle === 'yearly' ? 12 : 1,
      amount,
      userEmail = 'owner@sunrisehomestay.com',
      userId = 'HS-4821',
      couponCode,
      appliedCreditsPaise,
    } = params;

    const normalizePlanId = (name: string): string => {
      const upper = (name || '').toUpperCase().trim();
      if (upper.includes('MULTI')) return 'MULTI_PROPERTY';
      if (upper.includes('PROFESSIONAL') || upper.includes('PRO')) return 'PROFESSIONAL';
      if (upper.includes('STARTER') || upper.includes('START')) return 'STARTER';
      return upper.replace(/[^A-Z0-9]/g, '_');
    };

    const planIdKey = normalizePlanId(planName);
    const amountPaise = (amount || 0) * 100;
    const idempotencyKey = `devify_${userId}_${planIdKey}_${billingCycle}_${durationMonths}_${Date.now()}`;

    // 1. Try Admin Backend Checkout API
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const res = await fetch(`${ADMIN_BASE_URL}/api/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: planIdKey,
          planName,
          billingCycle,
          durationMonths,
          amount: amountPaise,
          userId,
          userEmail,
          couponCode,
          appliedCreditsPaise,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (data.checkoutUrl && data.orderId) {
          return {
            checkoutUrl: data.checkoutUrl,
            orderId: data.orderId,
            paymentId: data.paymentId || null,
            isSandbox: Boolean(data.isSandbox),
          };
        }
      } else {
        const errJson = await res.json().catch(() => ({}));
        console.warn('[DevifyPay] Admin backend checkout error:', errJson);
      }
    } catch (err: any) {
      console.warn('[DevifyPay] Admin backend notice:', err?.message || err);
    }

    // 2. Direct Devify Pay API Order + Payment creation with live secret key
    try {
      const orderRes = await fetch(`${DEVIFY_BASE_URL}/v1/orders`, {
        method: 'POST',
        headers: {
          'X-Api-Key': DEVIFY_LIVE_KEY,
          Authorization: `Bearer ${DEVIFY_LIVE_KEY}`,
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify({
          amount: amountPaise,
          currency: 'INR',
          description: `StayMate ${planName} Plan (${billingCycle})`,
        }),
      });

      if (orderRes.ok) {
        const orderData = await orderRes.json();
        const orderId = orderData.id || orderData.order_id || `ORD_${Date.now()}`;

        // Create payment session
        const paymentRes = await fetch(`${DEVIFY_BASE_URL}/v1/payments`, {
          method: 'POST',
          headers: {
            'X-Api-Key': DEVIFY_LIVE_KEY,
            Authorization: `Bearer ${DEVIFY_LIVE_KEY}`,
            'Content-Type': 'application/json',
            'Idempotency-Key': `${idempotencyKey}_pay`,
          },
          body: JSON.stringify({
            order_id: orderId,
            method: 'UPI',
          }),
        });

        if (paymentRes.ok) {
          const paymentData = await paymentRes.json();
          const checkoutUrl =
            paymentData.checkout_url ||
            paymentData.checkoutUrl ||
            `${DEVIFY_BASE_URL}/pay/${paymentData.id || orderId}`;

          return {
            checkoutUrl,
            orderId,
            paymentId: paymentData.id || null,
          };
        }

        const fallbackCheckoutUrl = orderData.checkout_url || `${DEVIFY_BASE_URL}/pay/${orderId}`;
        return {
          checkoutUrl: fallbackCheckoutUrl,
          orderId,
          paymentId: null,
        };
      }
    } catch (directErr) {
      console.warn('[DevifyPay] Direct gateway notice:', directErr);
    }

    throw new Error('Unable to create payment session with Devify Pay. Please check your internet connection or try again.');
  }

  /**
   * Polls the status of an order from Backend and Devify Pay Gateway
   */
  async checkOrderStatus(orderId: string): Promise<DevifyOrderStatus> {
    // 1. Check Admin Backend (queries Firestore & Devify Gateway)
    try {
      const res = await fetch(`${ADMIN_BASE_URL}/api/checkout/status?orderId=${encodeURIComponent(orderId)}`);
      if (res.ok) {
        const data = await res.json();
        return {
          orderId,
          status: data.status || 'PENDING',
          amount: data.amountPaise ? data.amountPaise / 100 : undefined,
          currency: data.currency || 'INR',
          paidAt: data.paidAt,
        };
      }
    } catch (e) {
      console.warn('[DevifyPay] Status check notice:', e);
    }

    // 2. Direct Devify Pay Gateway Status check
    try {
      const gwRes = await fetch(`${DEVIFY_BASE_URL}/v1/orders/${encodeURIComponent(orderId)}`, {
        headers: {
          'X-Api-Key': DEVIFY_LIVE_KEY,
          Authorization: `Bearer ${DEVIFY_LIVE_KEY}`,
        },
      });
      if (gwRes.ok) {
        const gwData = await gwRes.json();
        const gwStatus = (gwData.status || gwData.order_status || '').toUpperCase();
        const isPaid = gwStatus === 'PAID' || gwStatus === 'COMPLETED' || gwStatus === 'SUCCESS' || gwData.paid === true;
        return {
          orderId,
          status: isPaid ? 'PAID' : gwStatus === 'FAILED' ? 'FAILED' : 'PENDING',
          paidAt: gwData.paid_at,
        };
      }
    } catch (_) {}

    return {
      orderId,
      status: 'PENDING',
    };
  }

  /**
   * Opens the payment URL in the system browser
   */
  async openCheckoutUrl(url: string): Promise<boolean> {
    try {
      const can = await Linking.canOpenURL(url);
      if (can) {
        await Linking.openURL(url);
        return true;
      }
    } catch (e) {
      console.warn('Cannot open URL directly:', e);
    }
    try {
      await Linking.openURL(url);
      return true;
    } catch (_) {
      return false;
    }
  }
}

export const devifyPay = new DevifyPayService();
