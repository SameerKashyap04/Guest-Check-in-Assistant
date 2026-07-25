import { db } from '@/config/firebase';
import { collection, addDoc, onSnapshot, query, where, serverTimestamp, QuerySnapshot, DocumentChange } from 'firebase/firestore';

export interface CloudGuestCheckin {
  id?: string;
  property_id: string;
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
}

/**
 * Pushes guest self check-in registration to Cloud Firestore in real-time
 */
export async function pushGuestCheckinToCloud(data: CloudGuestCheckin): Promise<string> {
  try {
    const checkinsRef = collection(db, 'guest_checkins');
    const docRef = await addDoc(checkinsRef, {
      ...data,
      created_at: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    console.warn('Firestore cloud push warning (offline or demo mode fallback):', error);
    return `local_${Date.now()}`;
  }
}

/**
 * Listens for new online check-in submissions for a specific homestay propertyId in real-time
 */
export function subscribeToPropertyCheckins(
  propertyId: string,
  onNewCheckin: (checkin: CloudGuestCheckin) => void
) {
  if (!propertyId) return () => {};

  try {
    const checkinsRef = collection(db, 'guest_checkins');
    const q = query(checkinsRef, where('property_id', '==', propertyId));

    const unsubscribe = onSnapshot(q, (snapshot: QuerySnapshot) => {
      snapshot.docChanges().forEach((change: DocumentChange) => {
        if (change.type === 'added') {
          const data = change.doc.data() as CloudGuestCheckin;
          onNewCheckin({ ...data, id: change.doc.id });
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
