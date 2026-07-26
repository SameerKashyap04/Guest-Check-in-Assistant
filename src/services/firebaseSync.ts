import { db } from '@/config/firebase';
import { 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  where, 
  serverTimestamp, 
  deleteDoc, 
  doc, 
  getDocs,
  QuerySnapshot, 
  DocumentChange 
} from '@firebase/firestore';

export interface CloudGuestCheckin {
  id?: string;
  property_id: string;
  owner_id?: string;
  full_name: string;
  phone: string;
  id_type: string;
  id_number: string;
  address: string;
  pin_code: string;
  gender: string;
  dob: string;
  photo_uri?: string;
  back_photo_uri?: string;
  selfie_uri?: string;
  room_number: string;
  check_in_date: string;
  created_at?: any;
  expires_at?: number; // 10-day TTL timestamp
}

const TEN_DAYS_MS = 10 * 24 * 60 * 60 * 1000;

/**
 * Pushes guest self check-in registration to Cloud Firestore with a 10-day expiration TTL.
 */
export async function pushGuestCheckinToCloud(data: CloudGuestCheckin): Promise<string> {
  // 1. Instant local backup in Web LocalStorage
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const existingStr = window.localStorage.getItem('pending_guest_checkins') || '[]';
      const existing = JSON.parse(existingStr);
      existing.push({ ...data, timestamp: Date.now() });
      window.localStorage.setItem('pending_guest_checkins', JSON.stringify(existing));
    } catch (e) {
      console.warn('LocalStorage backup warning:', e);
    }
  }

  // 2. Push to Firestore with 10-day TTL
  const pushTask = (async () => {
    try {
      const checkinsRef = collection(db, 'guest_checkins');
      const docRef = await addDoc(checkinsRef, {
        ...data,
        owner_id: data.owner_id || 'OWNER_DEFAULT_101',
        created_at: serverTimestamp(),
        expires_at: Date.now() + TEN_DAYS_MS,
      });
      return docRef.id;
    } catch (err) {
      console.warn('Firestore cloud write warning:', err);
      return `local_${Date.now()}`;
    }
  })();

  const timeoutTask = new Promise<string>((resolve) => {
    setTimeout(() => resolve(`timeout_${Date.now()}`), 2000);
  });

  try {
    return await Promise.race([pushTask, timeoutTask]);
  } catch (error) {
    console.warn('Firestore cloud push warning:', error);
    return `local_${Date.now()}`;
  }
}

/**
 * Deletes a temporary check-in record from Firebase after it is safely stored in local device SQLite storage.
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
 * Purges any temporary check-in records older than 10 days from Firebase
 */
export async function purgeExpiredTempCheckins(ownerId?: string): Promise<void> {
  try {
    const checkinsRef = collection(db, 'guest_checkins');
    const now = Date.now();
    const q = query(checkinsRef, where('expires_at', '<=', now));
    const snapshot = await getDocs(q);
    snapshot.forEach((d) => {
      deleteDoc(d.ref).catch(() => {});
    });
  } catch (e) {
    console.warn('Purge expired temp check-ins warning:', e);
  }
}

/**
 * Listens for online check-in submissions in real-time.
 * Deletes doc from Firebase once downloaded if storage mode is Local Storage.
 */
export function subscribeToPropertyCheckins(
  propertyId: string,
  onNewCheckin: (checkin: CloudGuestCheckin) => void,
  ownerId?: string,
  deleteAfterDownload = false
) {
  if (!propertyId) return () => {};

  // Run async purge of >10 days expired records
  purgeExpiredTempCheckins(ownerId);

  try {
    const checkinsRef = collection(db, 'guest_checkins');
    let q = query(checkinsRef, where('property_id', '==', propertyId));

    if (ownerId && ownerId !== 'OWNER_DEFAULT_101') {
      q = query(checkinsRef, where('owner_id', '==', ownerId));
    }

    const unsubscribe = onSnapshot(q, (snapshot: QuerySnapshot) => {
      snapshot.docChanges().forEach((change: DocumentChange) => {
        if (change.type === 'added') {
          const data = change.doc.data() as CloudGuestCheckin;
          const docId = change.doc.id;
          onNewCheckin({ ...data, id: docId });

          // If local storage mode, delete from cloud after downloading locally
          if (deleteAfterDownload && docId) {
            deleteCloudCheckinDoc(docId);
          }
        }
      });
    }, (error: any) => {
      console.warn('Firestore real-time subscription listener warning:', error);
    });

    return unsubscribe;
  } catch (e) {
    console.warn('Failed to start Firestore subscription listener:', e);
    return () => {};
  }
}
