import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  onSnapshot,
  query,
  where,
  deleteDoc,
  doc,
  getDocs,
  QuerySnapshot,
  DocumentChange,
} from 'firebase/firestore';

// Firebase Configuration for StayMate Cloud Sync
const firebaseConfig = {
  apiKey: "AIzaSyAMPlyK7NKHZqW_mwEfdofXu0LF5_pW7m8",
  authDomain: "guest-checkin-assistant.firebaseapp.com",
  databaseURL: "https://guest-checkin-assistant-default-rtdb.firebaseio.com",
  projectId: "guest-checkin-assistant",
  storageBucket: "guest-checkin-assistant.firebasestorage.app",
  messagingSenderId: "765584797318",
  appId: "1:765584797318:web:5ca184f29c5e0d1a75eb07",
  measurementId: "G-K2MN0PEHSZ",
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app);

export interface CloudGuestCheckin {
  id?: string;
  property_id: string;
  owner_id?: string;
  full_name: string;
  phone: string;
  id_type: string;
  id_number: string;
  address: string;
  pin_code?: string;
  gender: string;
  dob: string;
  photo_uri?: string;
  back_photo_uri?: string;
  selfie_uri?: string;
  room_number: string;
  check_in_date: string;
  check_out_date?: string;
  additional_guests?: any[];
  created_at?: any;
  expires_at?: number;
}

/**
 * Deletes a temporary check-in record from Firebase after approval / discard
 */
export async function deleteCloudCheckinDoc(docId: string): Promise<void> {
  if (!docId || docId.startsWith('local_') || docId.startsWith('timeout_')) return;
  try {
    await deleteDoc(doc(db, 'guest_checkins', docId));
  } catch (e) {
    console.warn(`Failed to delete temporary check-in doc ${docId}:`, e);
  }
}

/**
 * Listens for online self check-in submissions in real-time.
 */
export function subscribeToPropertyCheckins(
  propertyId: string,
  onNewCheckin: (checkin: CloudGuestCheckin) => void,
  ownerId = 'OWNER_DEFAULT_101'
): () => void {
  if (!propertyId && !ownerId) return () => {};

  try {
    const checkinsRef = collection(db, 'guest_checkins');
    const processedDocIds = new Set<string>();

    const handleSnapshot = (snapshot: QuerySnapshot) => {
      snapshot.docChanges().forEach((change: DocumentChange) => {
        if (change.type === 'added') {
          const docId = change.doc.id;
          if (processedDocIds.has(docId)) return;

          const data = change.doc.data() as CloudGuestCheckin;

          // Strict Multi-Tenant Security Check
          if (
            ownerId &&
            ownerId !== 'OWNER_DEFAULT_101' &&
            data.owner_id &&
            data.owner_id !== 'OWNER_DEFAULT_101' &&
            data.owner_id !== ownerId
          ) {
            return;
          }

          processedDocIds.add(docId);
          onNewCheckin({ ...data, id: docId });
        }
      });
    };

    const handlePermissionError = (error: any) => {
      if (error?.code !== 'permission-denied') {
        console.warn('Firestore subscription listener warning:', error);
      }
    };

    // 1. Primary listener by property_id
    let unsub1 = () => {};
    if (propertyId) {
      const q1 = query(checkinsRef, where('property_id', '==', propertyId));
      unsub1 = onSnapshot(q1, handleSnapshot, handlePermissionError);
    }

    // 2. Secondary listener by owner_id
    let unsub2 = () => {};
    if (ownerId && ownerId !== 'OWNER_DEFAULT_101') {
      const q2 = query(checkinsRef, where('owner_id', '==', ownerId));
      unsub2 = onSnapshot(q2, handleSnapshot, handlePermissionError);
    }

    return () => {
      unsub1();
      unsub2();
    };
  } catch (e) {
    console.warn('Failed to start Firestore subscription listener:', e);
    return () => {};
  }
}
