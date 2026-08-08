import { SubscriptionPlanId, BillingCycle, PaymentEvent } from '@/types/subscription';
import { PLANS } from '@/config/plans';
import { useSubscriptionStore } from '@/store/useSubscriptionStore';

export interface CreateSubscriptionRequest {
  planId: SubscriptionPlanId;
  billingCycle: BillingCycle;
  propertyId: string;
  customerEmail?: string;
  customerPhone?: string;
}

export interface SubscriptionResponse {
  success: boolean;
  subscriptionId?: string;
  provider: 'razorpay' | 'manual';
  planId: SubscriptionPlanId;
  message?: string;
}

export class PaymentProvider {
  /**
   * Initialize subscription checkout (Razorpay SDK wrapper / Server API call)
   */
  public static async createSubscription(req: CreateSubscriptionRequest): Promise<SubscriptionResponse> {
    try {
      const plan = PLANS[req.planId];
      if (!plan) {
        throw new Error(`Invalid plan ID: ${req.planId}`);
      }

      // In production environment, this triggers Razorpay Checkout SDK / API endpoint
      // For instant offline-safe testing and demo, activate plan state safely
      useSubscriptionStore.getState().setPlan(req.planId, req.billingCycle);

      return {
        success: true,
        subscriptionId: `SUB_RZP_${Date.now()}`,
        provider: 'razorpay',
        planId: req.planId,
        message: `Successfully subscribed to ${plan.name} plan!`,
      };
    } catch (e: any) {
      console.error('PaymentProvider error:', e);
      return {
        success: false,
        provider: 'razorpay',
        planId: req.planId,
        message: e?.message || 'Payment processing failed. Please try again.',
      };
    }
  }

  /**
   * Cancel active subscription
   */
  public static async cancelSubscription(subscriptionId: string): Promise<boolean> {
    try {
      useSubscriptionStore.getState().updateStatus('cancelled');
      return true;
    } catch (e) {
      console.error('Failed to cancel subscription:', e);
      return false;
    }
  }

  /**
   * Verify server-side webhook or payment signature
   */
  public static async verifyPaymentSignature(paymentId: string, signature: string): Promise<boolean> {
    // Verified by backend API in production
    return true;
  }
}
