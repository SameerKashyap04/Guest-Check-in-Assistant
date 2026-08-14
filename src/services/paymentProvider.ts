// ============================================================
// Guest Check-in Assistant — Devify Pay Payment Provider
// ============================================================
//
// Replaces the stub payment provider with real Devify Pay integration.
// This file runs in the Expo app — it calls the admin panel's API routes
// and NEVER accesses Devify secrets directly.
//
// Flow:
//   1. createSubscription() → POST /api/checkout → get checkoutUrl
//   2. Open checkoutUrl in browser (WebBrowser or window.location)
//   3. Poll GET /api/checkout/status until PAID / FAILED / timeout
//

import { SubscriptionPlan, type BillingCycle } from '@/types/subscription';
import { DEVIFY_CONFIG } from '@/config/devify';
import { Platform } from 'react-native';

// ------------------------------------------------------------------
// Payment Provider Interface (unchanged)
// ------------------------------------------------------------------

export interface PaymentResult {
  success: boolean;
  transactionId: string | null;
  externalSubscriptionId: string | null;
  error?: string;
}

export interface PaymentProvider {
  /** Provider name for identification */
  readonly name: string;

  /**
   * Create a new subscription payment.
   * Returns a transaction result with external subscription ID.
   */
  createSubscription(
    plan: SubscriptionPlan,
    billingCycle: BillingCycle,
    userEmail: string,
    userId: string
  ): Promise<PaymentResult>;

  /**
   * Cancel an existing subscription.
   */
  cancelSubscription(externalSubscriptionId: string): Promise<PaymentResult>;

  /**
   * Verify a payment/subscription status with the provider.
   * Should be called server-side in production.
   */
  verifySubscription(externalSubscriptionId: string): Promise<{
    isActive: boolean;
    plan: SubscriptionPlan | null;
    expiresAt: string | null;
  }>;
}

// ------------------------------------------------------------------
// Checkout Response
// ------------------------------------------------------------------

export interface CheckoutResult {
  checkoutUrl: string;
  orderId: string;
  paymentId: string | null;
  isSandbox?: boolean;
}

export interface OrderStatus {
  orderId: string;
  status: 'PENDING' | 'PAID' | 'FAILED';
  planId: string;
  billingCycle: string;
  amountPaise: number;
  paidAt: string | null;
}

// ------------------------------------------------------------------
// Devify Payment Provider
// ------------------------------------------------------------------

/**
 * Real payment provider using Devify Pay via the admin panel backend.
 *
 * SECURITY NOTES:
 * - Never stores or accesses the Devify API key — that lives in the admin panel
 * - Payment status is verified server-side via webhooks
 * - Client-side subscription state is for UX only, not authorization
 */
export class DevifyPaymentProvider implements PaymentProvider {
  readonly name = 'devify';
  private baseUrl: string;

  constructor() {
    this.baseUrl = DEVIFY_CONFIG.ADMIN_API_URL;
  }

  /**
   * Creates a checkout session via the backend and returns the checkout URL.
   * Does NOT open the URL — the caller (pricing screen) handles that.
   */
  async createCheckout(
    plan: SubscriptionPlan,
    billingCycle: BillingCycle,
    userEmail: string,
    userId: string
  ): Promise<CheckoutResult> {
    const res = await fetch(`${this.baseUrl}/api/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        planId: plan,
        billingCycle,
        userId,
        userEmail,
      }),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: 'Network error' }));
      throw new Error(errorData.error || `Checkout failed (${res.status})`);
    }

    const data = await res.json();

    if (!data.checkoutUrl || !data.orderId) {
      throw new Error('Invalid checkout response from server');
    }

    return {
      checkoutUrl: data.checkoutUrl,
      orderId: data.orderId,
      paymentId: data.paymentId || null,
      isSandbox: Boolean(data.isSandbox),
    };
  }

  /**
   * Polls the order status until it becomes PAID, FAILED, or times out.
   */
  async pollOrderStatus(
    orderId: string,
    onStatusChange?: (status: OrderStatus) => void
  ): Promise<OrderStatus> {
    const startTime = Date.now();
    const timeout = DEVIFY_CONFIG.STATUS_POLL_TIMEOUT_MS;
    const interval = DEVIFY_CONFIG.STATUS_POLL_INTERVAL_MS;

    while (Date.now() - startTime < timeout) {
      try {
        const res = await fetch(
          `${this.baseUrl}/api/checkout/status?orderId=${encodeURIComponent(orderId)}`
        );

        if (res.ok) {
          const status: OrderStatus = await res.json();
          onStatusChange?.(status);

          if (status.status === 'PAID' || status.status === 'FAILED') {
            return status;
          }
        }
      } catch (error) {
        // Network error during polling — continue retrying
        console.warn('[DevifyPay] Poll error (will retry):', error);
      }

      // Wait before next poll
      await new Promise((resolve) => setTimeout(resolve, interval));
    }

    // Timeout — return pending status
    return {
      orderId,
      status: 'PENDING',
      planId: '',
      billingCycle: '',
      amountPaise: 0,
      paidAt: null,
    };
  }

  /**
   * Opens the checkout URL in the appropriate browser.
   * - React Native / Expo: Uses expo-web-browser
   * - Web: Uses window.location.href
   */
  async openCheckoutUrl(checkoutUrl: string): Promise<void> {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined') {
        window.location.href = checkoutUrl;
      }
    } else {
      // Dynamically import to avoid bundling issues on web
      try {
        const WebBrowser = require('expo-web-browser');
        await WebBrowser.openBrowserAsync(checkoutUrl);
      } catch (error) {
        console.error('[DevifyPay] Failed to open browser:', error);
        throw new Error('Could not open payment page');
      }
    }
  }

  // ------------------------------------------------------------------
  // PaymentProvider Interface Implementation
  // ------------------------------------------------------------------

  async createSubscription(
    plan: SubscriptionPlan,
    billingCycle: BillingCycle,
    userEmail: string,
    userId: string
  ): Promise<PaymentResult> {
    try {
      const checkout = await this.createCheckout(plan, billingCycle, userEmail, userId);

      // Open checkout URL in browser (non-blocking for native)
      if (Platform.OS !== 'web') {
        await this.openCheckoutUrl(checkout.checkoutUrl);
      }

      // Poll for result
      const status = await this.pollOrderStatus(checkout.orderId);

      if (status.status === 'PAID') {
        return {
          success: true,
          transactionId: checkout.paymentId,
          externalSubscriptionId: checkout.orderId,
        };
      } else if (status.status === 'FAILED') {
        return {
          success: false,
          transactionId: checkout.paymentId,
          externalSubscriptionId: checkout.orderId,
          error: 'Payment failed',
        };
      } else {
        // Timeout
        return {
          success: false,
          transactionId: checkout.paymentId,
          externalSubscriptionId: checkout.orderId,
          error: 'Payment timed out. Please check your payment status later.',
        };
      }
    } catch (error: any) {
      return {
        success: false,
        transactionId: null,
        externalSubscriptionId: null,
        error: error.message || 'Failed to initiate payment',
      };
    }
  }

  async cancelSubscription(externalSubscriptionId: string): Promise<PaymentResult> {
    // TODO: Implement cancellation via Devify API when available
    console.info(`[DevifyPay] Cancel subscription requested: ${externalSubscriptionId}`);
    return {
      success: true,
      transactionId: null,
      externalSubscriptionId,
    };
  }

  async verifySubscription(externalSubscriptionId: string): Promise<{
    isActive: boolean;
    plan: SubscriptionPlan | null;
    expiresAt: string | null;
  }> {
    try {
      const status = await this.pollOrderStatus(externalSubscriptionId);
      return {
        isActive: status.status === 'PAID',
        plan: status.planId as SubscriptionPlan || null,
        expiresAt: null,
      };
    } catch {
      return {
        isActive: false,
        plan: null,
        expiresAt: null,
      };
    }
  }
}

// ------------------------------------------------------------------
// Singleton Export
// ------------------------------------------------------------------

/** The active payment provider instance */
export const paymentProvider: PaymentProvider = new DevifyPaymentProvider();

/** Direct access to Devify-specific methods (checkout URL, polling) */
export const devifyProvider = paymentProvider as DevifyPaymentProvider;
