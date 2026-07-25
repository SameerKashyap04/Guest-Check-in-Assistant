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

const generatePropertyId = (name?: string | null) => {
  const prefix = name ? name.replace(/[^a-zA-Z0-9]/g, '').slice(0, 6).toUpperCase() : 'HOMESTAY';
  const randomCode = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${randomCode}`;
};

interface SettingsState {
  hasCompletedSetup: boolean;
  businessName: string | null;
  propertyId: string;
  language: 'en' | 'hi' | 'as';
  theme: 'system' | 'light' | 'dark';
  selfCheckinUrl: string;
  setBusinessSetup: (name: string) => void;
  setLanguage: (lang: 'en' | 'hi' | 'as') => void;
  setTheme: (theme: 'system' | 'light' | 'dark') => void;
  setSelfCheckinUrl: (url: string) => void;
  getShareableLink: () => string;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      hasCompletedSetup: false,
      businessName: null,
      propertyId: generatePropertyId(null),
      language: 'en',
      theme: 'system',
      selfCheckinUrl: 'https://guest-checkin-assistant.vercel.app/self-checkin',
      setBusinessSetup: (name) => {
        const currentPropId = get().propertyId || generatePropertyId(name);
        set({ businessName: name, propertyId: currentPropId, hasCompletedSetup: true });
      },
      setLanguage: (lang) => set({ language: lang }),
      setTheme: (theme) => set({ theme: theme }),
      setSelfCheckinUrl: (url) => set({ selfCheckinUrl: url }),
      getShareableLink: () => {
        const state = get();
        const baseUrl = state.selfCheckinUrl || 'https://guest-checkin-assistant.vercel.app/self-checkin';
        const cleanBaseUrl = baseUrl.split('?')[0];
        const propId = state.propertyId || generatePropertyId(state.businessName);
        const propName = encodeURIComponent(state.businessName || 'Homestay');
        return `${cleanBaseUrl}?property_id=${propId}&property_name=${propName}`;
      },
    }),
    {
      name: 'settings-storage',
      storage: createJSONStorage(() => zustandStorage),
    }
  )
);
