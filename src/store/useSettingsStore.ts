import { create } from 'zustand';
import { persist, createJSONStorage, StateStorage } from 'zustand/middleware';
import { storage } from './storage';

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

interface SettingsState {
  hasCompletedSetup: boolean;
  businessName: string | null;
  language: 'en' | 'hi' | 'as';
  theme: 'system' | 'light' | 'dark';
  
  // Hotel Self Check-in & System Settings
  enableSelfCheckin: boolean;
  requireSelfie: boolean;
  allowManualEditing: boolean;
  requireSignature: boolean;
  allowWalkIn: boolean;
  enableIdScanning: boolean;
  enableOcr: boolean;

  setBusinessSetup: (name: string) => void;
  setLanguage: (lang: 'en' | 'hi' | 'as') => void;
  setTheme: (theme: 'system' | 'light' | 'dark') => void;
  setSetting: (key: keyof SettingsState, value: any) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      hasCompletedSetup: false,
      businessName: null,
      language: 'en',
      theme: 'system',

      enableSelfCheckin: true,
      requireSelfie: false,
      allowManualEditing: true,
      requireSignature: false,
      allowWalkIn: true,
      enableIdScanning: true,
      enableOcr: true,

      setBusinessSetup: (name) => set({ businessName: name, hasCompletedSetup: true }),
      setLanguage: (lang) => set({ language: lang }),
      setTheme: (theme) => set({ theme: theme }),
      setSetting: (key, value) => set((state) => ({ ...state, [key]: value })),
    }),
    {
      name: 'settings-storage',
      storage: createJSONStorage(() => zustandStorage),
    }
  )
);
