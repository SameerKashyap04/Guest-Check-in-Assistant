import { create } from 'zustand';
import { OwnerProfile } from '@/services/firebaseAuth';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const PIN_KEY = 'user_security_pin';

interface AuthState {
  owner: OwnerProfile | null;
  isAuthenticated: boolean;
  ownerId: string;
  isUnlocked: boolean;
  hasPin: boolean;
  setOwner: (owner: OwnerProfile | null) => void;
  logout: () => void;
  checkPinSetup: () => Promise<boolean>;
  setupPin: (pin: string) => Promise<boolean>;
  verifyPin: (pin: string) => Promise<boolean>;
  lock: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  owner: null,
  isAuthenticated: false,
  ownerId: 'OWNER_DEFAULT_101',
  isUnlocked: false,
  hasPin: false,

  setOwner: (owner) =>
    set({
      owner,
      isAuthenticated: !!owner,
      ownerId: owner?.uid || 'OWNER_DEFAULT_101',
    }),

  logout: () =>
    set({
      owner: null,
      isAuthenticated: false,
      ownerId: 'OWNER_DEFAULT_101',
      isUnlocked: false,
    }),

  checkPinSetup: async () => {
    try {
      if (Platform.OS === 'web') {
        const stored = typeof window !== 'undefined' ? window.localStorage.getItem(PIN_KEY) : null;
        const exists = !!stored;
        set({ hasPin: exists });
        return exists;
      }
      const storedPin = await SecureStore.getItemAsync(PIN_KEY);
      const exists = !!storedPin;
      set({ hasPin: exists });
      return exists;
    } catch (e) {
      console.error('Failed to check PIN setup', e);
      return false;
    }
  },

  setupPin: async (pin: string) => {
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined') window.localStorage.setItem(PIN_KEY, pin);
      } else {
        await SecureStore.setItemAsync(PIN_KEY, pin);
      }
      set({ hasPin: true, isUnlocked: true });
      return true;
    } catch (e) {
      console.error('Failed to setup PIN', e);
      return false;
    }
  },

  verifyPin: async (pin: string) => {
    try {
      let storedPin: string | null = null;
      if (Platform.OS === 'web') {
        storedPin = typeof window !== 'undefined' ? window.localStorage.getItem(PIN_KEY) : null;
      } else {
        storedPin = await SecureStore.getItemAsync(PIN_KEY);
      }
      // Default fallback PIN is 1234
      const isValid = (storedPin ? storedPin === pin : pin === '1234');
      if (isValid) {
        set({ isUnlocked: true });
      }
      return isValid;
    } catch (e) {
      console.error('Failed to verify PIN', e);
      return false;
    }
  },

  lock: () => set({ isUnlocked: false }),
}));
