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

import i18n from '@/i18n';

interface SettingsState {
  hasCompletedSetup: boolean;
  businessName: string | null;
  userName: string;
  propertyId: string;
  ownerId: string;
  storageMode: 'cloud' | 'local';
  language: 'en' | 'hi' | 'as';
  theme: 'system' | 'light' | 'dark';
  selfCheckinUrl: string;
  setBusinessSetup: (name: string) => void;
  setUserName: (name: string) => void;
  setOwnerId: (uid: string) => void;
  setPropertyId: (id: string) => void;
  setStorageMode: (mode: 'cloud' | 'local') => void;
  setLanguage: (lang: 'en' | 'hi' | 'as') => void;
  setTheme: (theme: 'system' | 'light' | 'dark') => void;
  setSelfCheckinUrl: (url: string) => void;
  getShareableLink: (customRooms?: any[]) => string;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      hasCompletedSetup: false,
      businessName: null,
      userName: 'Sameer',
      propertyId: generatePropertyId(null),
      ownerId: 'OWNER_DEFAULT_101',
      storageMode: 'cloud',
      language: 'en',
      theme: 'system',
      selfCheckinUrl: 'https://staymate.co.in/self-checkin',
      setBusinessSetup: (name) => {
        const currentPropId = get().propertyId || generatePropertyId(name);
        set({ businessName: name, propertyId: currentPropId, hasCompletedSetup: true });
      },
      setUserName: (name) => {
        set({ userName: name?.trim() || 'Sameer' });
      },
      setOwnerId: (uid) => set({ ownerId: uid }),
      setPropertyId: (id) => set({ propertyId: id }),
      setStorageMode: (mode) => set({ storageMode: mode }),
      setLanguage: (lang) => {
        try { i18n.changeLanguage(lang); } catch (_) {}
        set({ language: lang });
      },
      setTheme: (theme) => set({ theme: theme }),
      setSelfCheckinUrl: (url) => set({ selfCheckinUrl: url }),

      getShareableLink: (customRooms?: any[]) => {
        const state = get();
        const baseUrl = state.selfCheckinUrl || 'https://staymate.co.in/self-checkin';
        const cleanBaseUrl = baseUrl.split('?')[0];
        const propId = state.propertyId || generatePropertyId(state.businessName);
        const ownerId = state.ownerId || 'OWNER_DEFAULT_101';
        const propName = encodeURIComponent(state.businessName || 'Homestay');
        
        let roomsQuery = '';
        if (customRooms) {
          const availableOnly = customRooms.filter(r => r.status === 'available');
          if (availableOnly.length > 0) {
            const encodedRooms = availableOnly.map(r => 
              `${encodeURIComponent(r.room_number || '')}:${encodeURIComponent(r.room_type || 'Standard')}:${r.price || 0}`
            ).join(';');
            roomsQuery = `&rooms=${encodeURIComponent(encodedRooms)}`;
          } else {
            roomsQuery = `&rooms=none`;
          }
        }
        return `${cleanBaseUrl}?property_id=${propId}&owner_id=${ownerId}&property_name=${propName}${roomsQuery}`;
      },
    }),
    {
      name: 'settings-storage',
      storage: createJSONStorage(() => zustandStorage),
    }
  )
);
