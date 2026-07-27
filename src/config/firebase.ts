import { storage } from '@/store/storage';
import { getApp, getApps, initializeApp } from '@firebase/app';
import { getAuth, initializeAuth } from '@firebase/auth';
import { getFirestore } from '@firebase/firestore';
import { Platform } from 'react-native';

// Firebase Configuration using Environment Variables for Security
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || "",
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || "guest-checkin-assistant.firebaseapp.com",
  databaseURL: process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL || "https://guest-checkin-assistant-default-rtdb.firebaseio.com",
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "guest-checkin-assistant",
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || "guest-checkin-assistant.firebasestorage.app",
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "765584797318",
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || "1:765584797318:web:5ca184f29c5e0d1a75eb07",
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-K2MN0PEHSZ"
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
    const { getReactNativePersistence } = require('firebase/auth');
    authInstance = initializeAuth(app, {
      persistence: getReactNativePersistence(mmkvAuthStorage as any),
    });
  } catch (e) {
    authInstance = getAuth(app);
  }
}

export const auth = authInstance;
