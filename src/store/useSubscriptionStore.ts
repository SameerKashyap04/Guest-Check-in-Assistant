// ============================================================
// StayMate — Subscription Zustand Store
// ============================================================
//
// Persisted via MMKV for offline-first access.
// Never stores sensitive payment information (card numbers, etc).
//

import { create } from 'zustand';
import { persist, createJSONStorage, StateStorage } from 'zustand/middleware';
import { storage } from './storage';
import {
  SubscriptionPlan,
  SubscriptionStatus,
  type BillingCycle,
  type UsageMetrics,
} from '@/types/subscription';
import { TRIAL_CONFIG, GRACE_PERIOD } from '@/config/plans';
import { registerSubscriptionStateAccessor } from '@/services/entitlementService';

// ------------------------------------------------------------------
// MMKV Zustand Storage Adapter (matches useSettingsStore pattern)
// ------------------------------------------------------------------

const zustandStorage: StateStorage = {
  setItem: (name, value) => {
    return storage.set(name, value);
  },
  getItem: (name) => {
    const value = storage.getString(name);
    return value ?? null;
  },
  removeItem: (name) => {
    return storage.remove(name);
  },
};

// ------------------------------------------------------------------
// Store Interface
// ------------------------------------------------------------------

interface SubscriptionState {
  // Subscription data
  currentPlan: SubscriptionPlan;
  billingCycle: BillingCycle;
  status: SubscriptionStatus;
  isTrialing: boolean;
  trialStartDate: string | null;
  trialEndDate: string | null;
  subscriptionStartDate: string | null;
  renewalDate: string | null;
  cancellationDate: string | null;
  paymentProvider: string | null;
  externalSubscriptionId: string | null;
  lastVerifiedAt: string | null;
  lastVerifiedPlan: SubscriptionPlan | null;
  gracePeriodDays: number;

  // Usage tracking (current month)
  usage: UsageMetrics;

  // Actions: Subscription management
  setSubscription: (plan: SubscriptionPlan, status: SubscriptionStatus, billingCycle?: BillingCycle) => void;
  startTrial: (plan?: SubscriptionPlan) => void;
  endTrial: () => void;
  cancelSubscription: () => void;
  updateFromServer: (serverPlan: SubscriptionPlan, serverStatus: SubscriptionStatus) => void;
  activateFromPayment: (plan: SubscriptionPlan, billingCycle: BillingCycle, orderId: string) => void;

  // Actions: Usage tracking
  incrementCheckIn: () => void;
  incrementExport: () => void;
  incrementOcrScan: () => void;
  resetMonthlyCounters: () => void;

  // Actions: Helpers
  ensureCurrentMonth: () => void;
}

// ------------------------------------------------------------------
// Helper: Get current month/year
// ------------------------------------------------------------------

function getCurrentPeriod() {
  const now = new Date();
  return { month: now.getMonth() + 1, year: now.getFullYear() };
}

// ------------------------------------------------------------------
// Store Definition
// ------------------------------------------------------------------

export const useSubscriptionStore = create<SubscriptionState>()(
  persist(
    (set, get) => {
      // Register the state accessor for the entitlement service
      // (done inside the store factory so it captures the getter)
      registerSubscriptionStateAccessor(() => {
        const state = get();
        return {
          currentPlan: state.currentPlan,
          status: state.status,
          isTrialing: state.isTrialing,
          trialEndDate: state.trialEndDate,
          lastVerifiedAt: state.lastVerifiedAt,
          gracePeriodDays: state.gracePeriodDays,
          usage: state.usage,
        };
      });

      return {
        // ------------------------------------------------------------------
        // Default state: FREE plan, no trial, empty usage
        // ------------------------------------------------------------------
        currentPlan: SubscriptionPlan.FREE,
        billingCycle: 'monthly' as BillingCycle,
        status: SubscriptionStatus.ACTIVE,
        isTrialing: false,
        trialStartDate: null,
        trialEndDate: null,
        subscriptionStartDate: null,
        renewalDate: null,
        cancellationDate: null,
        paymentProvider: null,
        externalSubscriptionId: null,
        lastVerifiedAt: null,
        lastVerifiedPlan: null,
        gracePeriodDays: GRACE_PERIOD.DEFAULT_DAYS,

        usage: {
          month: getCurrentPeriod().month,
          year: getCurrentPeriod().year,
          checkInCount: 0,
          exportCount: 0,
          ocrScanCount: 0,
          propertyId: '',
        },

        // ------------------------------------------------------------------
        // Subscription Management
        // ------------------------------------------------------------------

        setSubscription: (plan, status, billingCycle) => {
          set({
            currentPlan: plan,
            status,
            billingCycle: billingCycle || get().billingCycle,
            isTrialing: false,
            subscriptionStartDate: new Date().toISOString(),
          });
        },

        startTrial: (plan) => {
          const trialPlan = plan || TRIAL_CONFIG.TRIAL_PLAN;
          const now = new Date();
          const trialEnd = new Date(now);
          trialEnd.setDate(trialEnd.getDate() + TRIAL_CONFIG.TRIAL_DURATION_DAYS);

          set({
            currentPlan: trialPlan,
            status: SubscriptionStatus.TRIALING,
            isTrialing: true,
            trialStartDate: now.toISOString(),
            trialEndDate: trialEnd.toISOString(),
          });
        },

        endTrial: () => {
          set({
            currentPlan: SubscriptionPlan.FREE,
            status: SubscriptionStatus.ACTIVE,
            isTrialing: false,
          });
        },

        cancelSubscription: () => {
          set({
            status: SubscriptionStatus.CANCELLED,
            cancellationDate: new Date().toISOString(),
          });
        },

        /**
         * Called when the app successfully verifies subscription with the server.
         * Updates the cached plan and records verification timestamp.
         */
        updateFromServer: (serverPlan, serverStatus) => {
          set({
            currentPlan: serverPlan,
            status: serverStatus,
            lastVerifiedAt: new Date().toISOString(),
            lastVerifiedPlan: serverPlan,
          });
        },

        /**
         * Called after a successful Devify Pay payment.
         * Activates the purchased plan and records payment provider details.
         */
        activateFromPayment: (plan, billingCycle, orderId) => {
          set({
            currentPlan: plan,
            billingCycle,
            status: SubscriptionStatus.ACTIVE,
            isTrialing: false,
            trialEndDate: null,
            subscriptionStartDate: new Date().toISOString(),
            paymentProvider: 'devify',
            externalSubscriptionId: orderId,
            lastVerifiedAt: new Date().toISOString(),
            lastVerifiedPlan: plan,
          });

          // Sync to Firestore in background
          try {
            const { doc, setDoc } = require('@firebase/firestore');
            const { db } = require('@/config/firebase');
            const { useAuthStore } = require('@/store/useAuthStore');
            const ownerId = useAuthStore?.getState?.()?.ownerId || 'OWNER_DEFAULT_101';
            const owner = useAuthStore?.getState?.()?.owner;

            const renewal = new Date();
            renewal.setMonth(renewal.getMonth() + (billingCycle === 'yearly' ? 12 : 1));

            const subId = `sub_${ownerId.toLowerCase()}`;
            setDoc(
              doc(db, 'subscriptions', subId),
              {
                id: subId,
                property: owner?.businessName || owner?.name || owner?.email || `Homestay (${ownerId})`,
                propertyId: ownerId,
                plan: plan,
                cycle: billingCycle,
                amount: plan === SubscriptionPlan.PROFESSIONAL ? '₹ 799' : '₹ 399',
                numericAmount: plan === SubscriptionPlan.PROFESSIONAL ? 799 : 399,
                status: 'active',
                renewalDate: `${renewal.toISOString().split('T')[0]} (Renews)`,
                provider: 'Devify Pay',
                orderId: orderId,
                updatedAt: new Date().toISOString(),
                createdAt: new Date().toISOString(),
              },
              { merge: true }
            ).catch(() => {});

            setDoc(
              doc(db, 'owners', ownerId),
              {
                plan: plan,
                status: 'Active',
                subscriptionPlan: plan,
                lastActive: 'Online Now',
                lastActiveTimestamp: Date.now(),
                updatedAt: new Date().toISOString(),
              },
              { merge: true }
            ).catch(() => {});
          } catch (_) {}
        },

        // ------------------------------------------------------------------
        // Usage Tracking
        // ------------------------------------------------------------------

        incrementCheckIn: () => {
          get().ensureCurrentMonth();
          set((state) => ({
            usage: {
              ...state.usage,
              checkInCount: state.usage.checkInCount + 1,
            },
          }));
        },

        incrementExport: () => {
          get().ensureCurrentMonth();
          set((state) => ({
            usage: {
              ...state.usage,
              exportCount: state.usage.exportCount + 1,
            },
          }));
        },

        incrementOcrScan: () => {
          get().ensureCurrentMonth();
          set((state) => ({
            usage: {
              ...state.usage,
              ocrScanCount: state.usage.ocrScanCount + 1,
            },
          }));
        },

        resetMonthlyCounters: () => {
          const { month, year } = getCurrentPeriod();
          set((state) => ({
            usage: {
              ...state.usage,
              month,
              year,
              checkInCount: 0,
              exportCount: 0,
              ocrScanCount: 0,
            },
          }));
        },

        /**
         * Automatically resets counters if the stored month/year doesn't match
         * the current calendar month. Called before any increment.
         */
        ensureCurrentMonth: () => {
          const { month, year } = getCurrentPeriod();
          const usage = get().usage;
          if (usage.month !== month || usage.year !== year) {
            get().resetMonthlyCounters();
          }
        },
      };
    },
    {
      name: 'subscription-storage',
      storage: createJSONStorage(() => zustandStorage),
      // Do not persist functions — only data fields
      partialize: (state) => ({
        currentPlan: state.currentPlan,
        billingCycle: state.billingCycle,
        status: state.status,
        isTrialing: state.isTrialing,
        trialStartDate: state.trialStartDate,
        trialEndDate: state.trialEndDate,
        subscriptionStartDate: state.subscriptionStartDate,
        renewalDate: state.renewalDate,
        cancellationDate: state.cancellationDate,
        paymentProvider: state.paymentProvider,
        externalSubscriptionId: state.externalSubscriptionId,
        lastVerifiedAt: state.lastVerifiedAt,
        lastVerifiedPlan: state.lastVerifiedPlan,
        gracePeriodDays: state.gracePeriodDays,
        usage: state.usage,
      }),
    }
  )
);
