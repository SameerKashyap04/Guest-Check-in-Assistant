import { createMMKV } from 'react-native-mmkv';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

export const storage = createMMKV({ id: 'guest-checkin-storage' });

// For sensitive data like PIN or Auth tokens
export async function saveSecureItem(key: string, value: string) {
  if (Platform.OS === 'web') {
    try {
      localStorage.setItem(key, value);
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
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }
  return await SecureStore.getItemAsync(key);
}

export async function deleteSecureItem(key: string) {
  if (Platform.OS === 'web') {
    try {
      localStorage.removeItem(key);
    } catch {
      // ignore web storage errors
    }
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

