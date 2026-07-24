import { create } from 'zustand';
import { getSecureItem, saveSecureItem, deleteSecureItem } from './storage';

interface AuthState {
  isUnlocked: boolean;
  hasPin: boolean;
  checkPinSetup: () => Promise<void>;
  setupPin: (pin: string) => Promise<boolean>;
  verifyPin: (pin: string) => Promise<boolean>;
  lock: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isUnlocked: false,
  hasPin: false,
  checkPinSetup: async () => {
    const pin = await getSecureItem('app_pin');
    set({ hasPin: !!pin, isUnlocked: !pin });
  },
  setupPin: async (pin: string) => {
    try {
      await saveSecureItem('app_pin', pin);
      set({ hasPin: true, isUnlocked: true });
      return true;
    } catch {
      return false;
    }
  },
  verifyPin: async (pin: string) => {
    const storedPin = await getSecureItem('app_pin');
    if (storedPin === pin) {
      set({ isUnlocked: true });
      return true;
    }
    return false;
  },
  lock: () => set({ isUnlocked: false }),
}));
