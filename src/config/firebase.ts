import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, collection, addDoc, onSnapshot, query, where, orderBy, serverTimestamp } from 'firebase/firestore';

// Default Firebase Configuration for Guest Check-in Assistant Cloud Sync
const firebaseConfig = {
  apiKey: "AIzaSyB_GUEST_CHECKIN_KEY_2026",
  authDomain: "guest-checkin-assistant.firebaseapp.com",
  projectId: "guest-checkin-assistant",
  storageBucket: "guest-checkin-assistant.appspot.com",
  messagingSenderId: "1098237491823",
  appId: "1:1098237491823:web:9876543210abc"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app);
