import { storage } from '@/store/storage';
import { getApp, getApps, initializeApp } from '@firebase/app';
import { getAuth, initializeAuth } from '@firebase/auth';
import { getFirestore } from '@firebase/firestore';
import { Platform } from 'react-native';

// Firebase Configuration for Guest Check-in Assistant Cloud Sync
const firebaseConfig = {
  apiKey: "AIzaSyAMPlyK7NKHZqW_mwEfdofXu0LF5_pW7m8",
  authDomain: "guest-checkin-assistant.firebaseapp.com",
  databaseURL: "https://guest-checkin-assistant-default-rtdb.firebaseio.com",
  projectId: "guest-checkin-assistant",
  storageBucket: "guest-checkin-assistant.firebasestorage.app",
  messagingSenderId: "765584797318",
  appId: "1:765584797318:web:5ca184f29c5e0d1a75eb07",
  measurementId: "G-K2MN0PEHSZ"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app);

// Custom Storage adapter using MMKV for lightning-fast native auth persistence
const mmkvAuthStorage = {
  getItem: (key: string) => Promise.resolve(storage.getString(key) ?? null),
  setItem: (key: string, value: string) => {
    storage.set(key, value);
    return Promise.resolve();
  },
  removeItem: (key: string) => {
    storage.remove(key);
    return Promise.resolve();
  },
};

let authInstance;
if (Platform.OS === 'web') {
  authInstance = getAuth(app);
} else {
  try {
    // Dynamically import getReactNativePersistence from firebase/auth
    const { getReactNativePersistence } = require('firebase/auth');
    authInstance = initializeAuth(app, {
      persistence: getReactNativePersistence(mmkvAuthStorage as any),
    });
  } catch (e) {
    authInstance = getAuth(app);
  }
}

export const auth = authInstance;
