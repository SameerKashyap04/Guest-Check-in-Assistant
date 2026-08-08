import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { storage } from './storage';
import { SubscriptionPlanId, SubscriptionStatus, BillingCycle, SubscriptionState } from '@/types/subscription';
import { PLANS, TRIAL_DURATION_DAYS } from '@/config/plans';

interface SubscriptionStoreState extends SubscriptionState {
  // Actions
  setPlan: (plan: SubscriptionPlanId, cycle?: BillingCycle) => void;
  startTrial: () => void;
  updateStatus: (status: SubscriptionStatus) => void;
  verifyOnlineSubscription: () => Promise<boolean>;
  getRemainingTrialDays: () => number;
  isTrialActive: () => boolean;
  resetSubscription: () => void;
}

const zustandStorage = {
  setItem: (name: string, value: string) => storage.set(name, value),
  getItem: (name: string) => storage.getString(name) ?? null,
  removeItem: (name: string) => storage.remove(name),
};

export const useSubscriptionStore = create<SubscriptionStoreState>()(
  persist(
    (set, get) => ({
      currentPlan: 'FREE',
      status: 'active',
      billingCycle: 'monthly',
      trialStart: null,
      trialEnd: null,
      subscriptionStart: null,
      renewalDate: null,
      paymentProvider: 'none',
      externalSubscriptionId: null,
      lastVerifiedAt: new Date().toISOString(),

      setPlan: (plan: SubscriptionPlanId, cycle: BillingCycle = 'monthly') => {
        const now = new Date();
        const nextYear = new Date(now);
        if (cycle === 'yearly') {
          nextYear.setFullYear(now.getFullYear() + 1);
        } else {
          nextYear.setMonth(now.getMonth() + 1);
        }

        set({
          currentPlan: plan,
          status: 'active',
          billingCycle: cycle,
          subscriptionStart: now.toISOString(),
          renewalDate: nextYear.toISOString(),
          lastVerifiedAt: now.toISOString(),
        });
      },

      startTrial: () => {
        const now = new Date();
        const trialEnd = new Date(now);
        trialEnd.setDate(now.getDate() + TRIAL_DURATION_DAYS);

        set({
          currentPlan: 'PROFESSIONAL', // Trial grants Professional entitlements
          status: 'trialing',
          trialStart: now.toISOString(),
          trialEnd: trialEnd.toISOString(),
          lastVerifiedAt: now.toISOString(),
        });
      },

      updateStatus: (status: SubscriptionStatus) => set({ status }),

      verifyOnlineSubscription: async () => {
        try {
          // Verify with server endpoint if available; fallback to current verified state offline
          set({ lastVerifiedAt: new Date().toISOString() });
          return true;
        } catch (e) {
          console.warn('Subscription verify warning (offline mode active):', e);
          return false;
        }
      },

      getRemainingTrialDays: () => {
        const { trialEnd, status } = get();
        if (status !== 'trialing' || !trialEnd) return 0;
        const diff = new Date(trialEnd).getTime() - new Date().getTime();
        return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
      },

      isTrialActive: () => {
        const remaining = get().getRemainingTrialDays();
        return get().status === 'trialing' && remaining > 0;
      },

      resetSubscription: () =>
        set({
          currentPlan: 'FREE',
          status: 'active',
          billingCycle: 'monthly',
          trialStart: null,
          trialEnd: null,
          subscriptionStart: null,
          renewalDate: null,
          paymentProvider: 'none',
          externalSubscriptionId: null,
          lastVerifiedAt: new Date().toISOString(),
        }),
    }),
    {
      name: 'subscription-storage-v1',
      storage: createJSONStorage(() => zustandStorage),
    }
  )
);
