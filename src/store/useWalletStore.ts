// ============================================================
// StayMate — Wallet & Referral Zustand Store
// ============================================================
//
// Persisted via MMKV for instant local availability.
// Keeps track of user referral code, statistics, available credits,
// and the StayMate Credits transaction ledger.
//

import { create } from 'zustand';
import { persist, createJSONStorage, StateStorage } from 'zustand/middleware';
import { storage } from './storage';
import {
  type ReferralRecord,
  type WalletTransaction,
  type ReferralStats,
} from '@/types/subscription';
import { referralService } from '@/services/referralService';

const zustandStorage: StateStorage = {
  setItem: (name, value) => storage.set(name, value),
  getItem: (name) => storage.getString(name) ?? null,
  removeItem: (name) => storage.remove(name),
};

interface WalletState {
  referralCode: string;
  availableCredits: number;
  successfulCount: number;
  pendingCount: number;
  totalEarnedCredits: number;
  history: ReferralRecord[];
  transactions: WalletTransaction[];
  isLoading: boolean;

  // Actions
  setReferralOverview: (data: Partial<ReferralStats>) => void;
  fetchReferralOverview: (userId: string) => Promise<void>;
  useCreditsLocally: (amount: number, orderId: string) => void;
}

export const useWalletStore = create<WalletState>()(
  persist(
    (set, get) => ({
      referralCode: 'STAYMATE82',
      availableCredits: 0,
      successfulCount: 0,
      pendingCount: 0,
      totalEarnedCredits: 0,
      history: [],
      transactions: [],
      isLoading: false,

      setReferralOverview: (data) => {
        set((state) => ({
          ...state,
          ...data,
        }));
      },

      fetchReferralOverview: async (userId: string) => {
        if (!userId) return;
        set({ isLoading: true });
        try {
          const overview = await referralService.getReferralOverview(userId);
          set({
            referralCode: overview.referralCode,
            availableCredits: overview.availableCredits,
            successfulCount: overview.successfulCount,
            pendingCount: overview.pendingCount,
            totalEarnedCredits: overview.totalEarnedCredits,
            history: overview.history,
            transactions: overview.transactions,
            isLoading: false,
          });
        } catch (e) {
          console.warn('[WalletStore] Fetch overview notice:', e);
          set({ isLoading: false });
        }
      },

      useCreditsLocally: (amount: number, orderId: string) => {
        if (amount <= 0) return;
        const current = get().availableCredits;
        const newBalance = Math.max(0, current - amount);
        const newTx: WalletTransaction = {
          id: `tx_local_${Date.now()}`,
          walletId: 'local',
          userId: 'me',
          type: 'DEBIT',
          amount,
          source: 'SUBSCRIPTION_DISCOUNT',
          referenceId: orderId,
          description: `Applied credits to subscription purchase`,
          createdAt: new Date().toISOString(),
        };

        set((state) => ({
          availableCredits: newBalance,
          transactions: [newTx, ...state.transactions],
        }));
      },
    }),
    {
      name: 'staymate_wallet_store_v1',
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({
        referralCode: state.referralCode,
        availableCredits: state.availableCredits,
        successfulCount: state.successfulCount,
        pendingCount: state.pendingCount,
        totalEarnedCredits: state.totalEarnedCredits,
        history: state.history,
        transactions: state.transactions,
      }),
    }
  )
);
