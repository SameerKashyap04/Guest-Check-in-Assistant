import { createMMKV } from 'react-native-mmkv';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const createWebStorage = () => {
  return {
    set: (key: string, value: boolean | string | number | Uint8Array) => {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, String(value));
      }
    },
    getString: (key: string) => {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key) ?? undefined;
      }
      return undefined;
    },
    getNumber: (key: string) => {
      if (typeof window !== 'undefined' && window.localStorage) {
        const val = window.localStorage.getItem(key);
        return val ? Number(val) : undefined;
      }
      return undefined;
    },
    getBoolean: (key: string) => {
      if (typeof window !== 'undefined' && window.localStorage) {
        const val = window.localStorage.getItem(key);
        return val === 'true';
      }
      return undefined;
    },
    remove: (key: string) => {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
      }
    },
    clearAll: () => {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.clear();
      }
    },
    contains: (key: string) => {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key) !== null;
      }
      return false;
    },
  };
};

export const storage = Platform.OS === 'web'
  ? (createWebStorage() as any)
  : createMMKV({ id: 'guest-checkin-storage' });

// For sensitive data like PIN or Auth tokens
export async function saveSecureItem(key: string, value: string) {
  if (Platform.OS === 'web') {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
      }
    } catch {
      // ignore web storage errors
    }
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

export async function getSecureItem(key: string) {
  if (Platform.OS === 'web') {
    try {
      return typeof window !== 'undefined' && window.localStorage ? window.localStorage.getItem(key) : null;
    } catch {
      return null;
    }
  }
  return await SecureStore.getItemAsync(key);
}

export async function deleteSecureItem(key: string) {
  if (Platform.OS === 'web') {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
      }
    } catch {
      // ignore web storage errors
    }
    return;
  }
  await SecureStore.deleteItemAsync(key);
}
