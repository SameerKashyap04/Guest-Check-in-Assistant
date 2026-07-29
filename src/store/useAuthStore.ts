import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { OwnerProfile } from '@/services/firebaseAuth';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const PIN_KEY = 'user_security_pin';

const secureStoreAdapter = {
  getItem: async (name: string): Promise<string | null> => {
    if (Platform.OS === 'web') {
      return typeof window !== 'undefined' ? localStorage.getItem(name) : null;
    }
    return await SecureStore.getItemAsync(name);
  },
  setItem: async (name: string, value: string): Promise<void> => {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined') localStorage.setItem(name, value);
    } else {
      await SecureStore.setItemAsync(name, value);
    }
  },
  removeItem: async (name: string): Promise<void> => {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined') localStorage.removeItem(name);
    } else {
      await SecureStore.deleteItemAsync(name);
    }
  },
};

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

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
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
          // Default fallback PIN is 1234 if no custom PIN was configured yet
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
    }),
    {
      name: 'auth_persistent_store_v1',
      storage: createJSONStorage(() => secureStoreAdapter),
      partialize: (state) => ({
        owner: state.owner,
        isAuthenticated: state.isAuthenticated,
        ownerId: state.ownerId,
        hasPin: state.hasPin,
      }),
    }
  )
);
