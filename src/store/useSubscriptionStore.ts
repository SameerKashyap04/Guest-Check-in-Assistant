import { create } from 'zustand';
import { persist, createJSONStorage, StateStorage } from 'zustand/middleware';
import { storage } from './storage';
import { SubscriptionTier, BillingCycle, SUBSCRIPTION_PLANS, PlanDefinition } from '@/types/subscription';

const zustandStorage: StateStorage = {
  setItem: (name, value) => storage.set(name, value),
  getItem: (name) => storage.getString(name) ?? null,
  removeItem: (name) => storage.remove(name),
};

const getCurrentMonthKey = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

const getFutureISO = (days: number): string => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
};

interface SubscriptionStoreState {
  activeTier: SubscriptionTier;
  billingCycle: BillingCycle;
  monthlyCheckinsCount: number;
  lastResetMonthYear: string;
  isTrialActive: boolean;
  trialEndsAt: string | null;
  subscribedAt: string | null;

  // Actions
  setTier: (tier: SubscriptionTier, cycle?: BillingCycle) => void;
  setBillingCycle: (cycle: BillingCycle) => void;
  recordCheckin: () => boolean; // returns true if checkin recorded within quota, false if limit reached
  resetMonthlyQuotaIfNeeded: () => void;
  getPlan: () => PlanDefinition;
  getCheckinsRemaining: () => number | 'unlimited';
  isFeatureAllowed: (featureKey: keyof PlanDefinition) => boolean;
  canAddRoom: (currentRoomCount: number) => boolean;
  canAddProperty: (currentPropertyCount: number) => boolean;
  activateTrial: (days?: number) => void;
  isTrialExpired: () => boolean;
}

export const useSubscriptionStore = create<SubscriptionStoreState>()(
  persist(
    (set, get) => ({
      activeTier: 'free',
      billingCycle: 'monthly',
      monthlyCheckinsCount: 0,
      lastResetMonthYear: getCurrentMonthKey(),
      isTrialActive: true,
      trialEndsAt: getFutureISO(30), // 30-day free trial on install
      subscribedAt: null,

      setTier: (tier, cycle = 'monthly') => {
        set({
          activeTier: tier,
          billingCycle: cycle,
          subscribedAt: new Date().toISOString(),
          isTrialActive: false,
        });
      },

      setBillingCycle: (cycle) => {
        set({ billingCycle: cycle });
      },

      resetMonthlyQuotaIfNeeded: () => {
        const currentMonthKey = getCurrentMonthKey();
        if (get().lastResetMonthYear !== currentMonthKey) {
          set({
            monthlyCheckinsCount: 0,
            lastResetMonthYear: currentMonthKey,
          });
        }
      },

      recordCheckin: () => {
        get().resetMonthlyQuotaIfNeeded();
        const state = get();
        const plan = state.getPlan();

        // If trial active or unlimited quota
        if (state.isTrialActive && !state.isTrialExpired()) {
          set({ monthlyCheckinsCount: state.monthlyCheckinsCount + 1 });
          return true;
        }

        if (plan.maxCheckinsPerMonth === 'unlimited') {
          set({ monthlyCheckinsCount: state.monthlyCheckinsCount + 1 });
          return true;
        }

        if (state.monthlyCheckinsCount < plan.maxCheckinsPerMonth) {
          set({ monthlyCheckinsCount: state.monthlyCheckinsCount + 1 });
          return true;
        }

        return false;
      },

      getPlan: () => {
        const state = get();
        // If active 30-day trial, give Professional capabilities during trial
        if (state.isTrialActive && !state.isTrialExpired()) {
          return SUBSCRIPTION_PLANS.professional;
        }
        return SUBSCRIPTION_PLANS[state.activeTier] || SUBSCRIPTION_PLANS.free;
      },

      getCheckinsRemaining: () => {
        const state = get();
        state.resetMonthlyQuotaIfNeeded();
        const plan = state.getPlan();

        if (state.isTrialActive && !state.isTrialExpired()) {
          return 'unlimited';
        }

        if (plan.maxCheckinsPerMonth === 'unlimited') {
          return 'unlimited';
        }

        const remaining = plan.maxCheckinsPerMonth - state.monthlyCheckinsCount;
        return Math.max(0, remaining);
      },

      isFeatureAllowed: (featureKey) => {
        const state = get();
        const plan = state.getPlan();
        return Boolean(plan[featureKey]);
      },

      canAddRoom: (currentRoomCount) => {
        const state = get();
        const plan = state.getPlan();
        return currentRoomCount < plan.maxRooms;
      },

      canAddProperty: (currentPropertyCount) => {
        const state = get();
        const plan = state.getPlan();
        return currentPropertyCount < plan.maxProperties;
      },

      activateTrial: (days = 30) => {
        set({
          isTrialActive: true,
          trialEndsAt: getFutureISO(days),
        });
      },

      isTrialExpired: () => {
        const state = get();
        if (!state.isTrialActive || !state.trialEndsAt) return true;
        return new Date() > new Date(state.trialEndsAt);
      },
    }),
    {
      name: 'subscription-storage',
      storage: createJSONStorage(() => zustandStorage),
    }
  )
);
