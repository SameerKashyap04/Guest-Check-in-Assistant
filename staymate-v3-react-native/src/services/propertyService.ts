import AsyncStorage from '@react-native-async-storage/async-storage';
import { initializeApp, getApps, getApp } from '@firebase/app';
import { getFirestore, doc, setDoc, getDoc, collection, getDocs } from '@firebase/firestore';

export interface ManagedProperty {
  id: string;
  code: string;
  name: string;
  address: string;
  city?: string;
  phone?: string;
  email?: string;
  roomsCount: number;
  ownerUid: string;
  ownerEmail?: string;
  createdAt: string;
}

const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyD-KN4lzXROjDdHtvvqxwE6Xdlw2uStWnk',
  authDomain: 'guest-checkin-assistant.firebaseapp.com',
  projectId: 'guest-checkin-assistant',
  storageBucket: 'guest-checkin-assistant.firebasestorage.app',
  messagingSenderId: '765584797318',
  appId: '1:765584797318:android:588d3954c264987e75eb07',
};

function getFirebaseDb() {
  const app = getApps().length > 0 ? getApp() : initializeApp(FIREBASE_CONFIG);
  return getFirestore(app);
}

export const propertyService = {
  async getManagedProperties(
    ownerUid: string,
    ownerEmail?: string,
    fallbackDefault?: {
      code: string;
      name: string;
      address: string;
      phone?: string;
      email?: string;
    }
  ): Promise<ManagedProperty[]> {
    const uid = ownerUid || 'default_owner';
    const storageKey = `@staymate_properties_list_${uid}`;

    try {
      // 1. Try local storage
      const local = await AsyncStorage.getItem(storageKey);
      let list: ManagedProperty[] = local ? JSON.parse(local) : [];

      if (list.length === 0 && fallbackDefault) {
        const defaultProp: ManagedProperty = {
          id: fallbackDefault.code || 'HS-4821',
          code: fallbackDefault.code || 'HS-4821',
          name: fallbackDefault.name || 'Sunrise Homestay',
          address: fallbackDefault.address || 'India',
          phone: fallbackDefault.phone || '+91 98765 43210',
          email: fallbackDefault.email || ownerEmail || 'owner@staymate.in',
          roomsCount: 10,
          ownerUid: uid,
          ownerEmail: ownerEmail || '',
          createdAt: new Date().toISOString(),
        };
        list = [defaultProp];
        await AsyncStorage.setItem(storageKey, JSON.stringify(list));
      }

      // 2. Fetch from Firestore if online
      try {
        const db = getFirebaseDb();
        const snap = await getDocs(collection(db, 'owners', uid, 'properties'));
        if (!snap.empty) {
          const cloudList: ManagedProperty[] = snap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as any),
          }));
          if (cloudList.length > 0) {
            list = cloudList;
            await AsyncStorage.setItem(storageKey, JSON.stringify(cloudList));
          }
        }
      } catch (_) {}

      return list;
    } catch (e) {
      console.warn('Error reading managed properties:', e);
      return [];
    }
  },

  async createProperty(
    ownerUid: string,
    data: {
      name: string;
      code?: string;
      address: string;
      city?: string;
      phone?: string;
      email?: string;
      roomsCount?: number;
    }
  ): Promise<ManagedProperty> {
    const uid = ownerUid || 'default_owner';
    const storageKey = `@staymate_properties_list_${uid}`;

    const propCode = data.code?.trim().toUpperCase() || `HS-${Math.floor(1000 + Math.random() * 9000)}`;
    const newProp: ManagedProperty = {
      id: propCode,
      code: propCode,
      name: data.name.trim(),
      address: data.address.trim(),
      city: data.city?.trim() || '',
      phone: data.phone?.trim() || '',
      email: data.email?.trim().toLowerCase() || '',
      roomsCount: data.roomsCount || 10,
      ownerUid: uid,
      createdAt: new Date().toISOString(),
    };

    // 1. Save to local storage
    const current = await this.getManagedProperties(uid);
    const updated = [...current.filter((p) => p.code !== newProp.code), newProp];
    await AsyncStorage.setItem(storageKey, JSON.stringify(updated));

    // 2. Sync to Firestore (both properties collection and owner subcollection)
    try {
      const db = getFirebaseDb();
      const payload = {
        ...newProp,
        propertyId: newProp.code,
        businessName: newProp.name,
        location: newProp.address,
        rooms: newProp.roomsCount,
        updatedAt: new Date().toISOString(),
      };
      await setDoc(doc(db, 'properties', newProp.code), payload, { merge: true });
      await setDoc(doc(db, 'owners', uid, 'properties', newProp.code), newProp, { merge: true });
    } catch (e) {
      console.warn('Failed to sync property to Firestore:', e);
    }

    return newProp;
  },

  async getActivePropertyId(ownerUid: string): Promise<string> {
    const key = `@staymate_active_property_id_${ownerUid || 'default'}`;
    const stored = await AsyncStorage.getItem(key);
    return stored || 'HS-4821';
  },

  async setActivePropertyId(ownerUid: string, propertyId: string): Promise<void> {
    const key = `@staymate_active_property_id_${ownerUid || 'default'}`;
    await AsyncStorage.setItem(key, propertyId);
  },
};
