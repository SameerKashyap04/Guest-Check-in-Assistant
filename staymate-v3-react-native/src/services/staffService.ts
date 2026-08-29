import AsyncStorage from '@react-native-async-storage/async-storage';
import { initializeApp, getApps, getApp } from '@firebase/app';
import { getFirestore, doc, setDoc, getDoc, collection, getDocs, deleteDoc } from '@firebase/firestore';

export type StaffRoleType = 'manager' | 'receptionist' | 'housekeeping';

export interface StaffPermissionItem {
  key: string;
  label: string;
  description: string;
}

export const STAFF_PERMISSIONS_LIST: StaffPermissionItem[] = [
  { key: 'checkIn', label: 'Guest Check-in', description: 'Can complete new guest check-ins' },
  { key: 'scanID', label: 'ID Scanning & OCR', description: 'Can scan Aadhaar, PAN, Passport & Voter IDs' },
  { key: 'manageRooms', label: 'Room Management', description: 'Can toggle room status (cleaning, maintenance)' },
  { key: 'viewGuests', label: 'View Guest Directory', description: 'Can view verified guest directory & call guests' },
  { key: 'exportData', label: 'Export Reports', description: 'Can download PDF & CSV police/management reports' },
];

export interface StaffMember {
  id: string;
  name: string;
  phone: string;
  email?: string;
  role: StaffRoleType;
  accessPin: string;
  permissions: string[];
  propertyId: string;
  status: 'active' | 'inactive';
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

export const staffService = {
  async getStaffMembers(propertyId: string): Promise<StaffMember[]> {
    const propId = propertyId || 'HS-4821';
    const storageKey = `@staymate_staff_list_${propId}`;

    try {
      // 1. Try local storage
      const local = await AsyncStorage.getItem(storageKey);
      let list: StaffMember[] = local ? JSON.parse(local) : [];

      // 2. Fetch from Firestore if online
      try {
        const db = getFirebaseDb();
        const snap = await getDocs(collection(db, 'properties', propId, 'staff'));
        if (!snap.empty) {
          const cloudList: StaffMember[] = snap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as any),
          }));
          list = cloudList;
          await AsyncStorage.setItem(storageKey, JSON.stringify(cloudList));
        }
      } catch (_) {}

      return list;
    } catch (e) {
      console.warn('Error reading staff members:', e);
      return [];
    }
  },

  async addStaffMember(
    propertyId: string,
    data: {
      name: string;
      phone: string;
      email?: string;
      role: StaffRoleType;
      permissions: string[];
      accessPin?: string;
    }
  ): Promise<StaffMember> {
    const propId = propertyId || 'HS-4821';
    const storageKey = `@staymate_staff_list_${propId}`;

    const newStaff: StaffMember = {
      id: `staff_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      name: data.name.trim(),
      phone: data.phone.trim(),
      email: data.email?.trim().toLowerCase() || '',
      role: data.role,
      accessPin: data.accessPin || String(Math.floor(1000 + Math.random() * 9000)),
      permissions: data.permissions || ['checkIn', 'scanID'],
      propertyId: propId,
      status: 'active',
      createdAt: new Date().toISOString(),
    };

    // 1. Save to local storage
    const current = await this.getStaffMembers(propId);
    const updated = [newStaff, ...current.filter((s) => s.id !== newStaff.id)];
    await AsyncStorage.setItem(storageKey, JSON.stringify(updated));

    // 2. Sync to Firestore
    try {
      const db = getFirebaseDb();
      await setDoc(doc(db, 'properties', propId, 'staff', newStaff.id), newStaff, { merge: true });
    } catch (e) {
      console.warn('Failed to sync staff to Firestore:', e);
    }

    return newStaff;
  },

  async updateStaffMember(
    propertyId: string,
    staffId: string,
    updates: Partial<StaffMember>
  ): Promise<void> {
    const propId = propertyId || 'HS-4821';
    const storageKey = `@staymate_staff_list_${propId}`;

    const current = await this.getStaffMembers(propId);
    const updated = current.map((s) => (s.id === staffId ? { ...s, ...updates } : s));
    await AsyncStorage.setItem(storageKey, JSON.stringify(updated));

    try {
      const db = getFirebaseDb();
      await setDoc(doc(db, 'properties', propId, 'staff', staffId), updates, { merge: true });
    } catch (e) {
      console.warn('Failed to update staff in Firestore:', e);
    }
  },

  async deleteStaffMember(propertyId: string, staffId: string): Promise<void> {
    const propId = propertyId || 'HS-4821';
    const storageKey = `@staymate_staff_list_${propId}`;

    const current = await this.getStaffMembers(propId);
    const updated = current.filter((s) => s.id !== staffId);
    await AsyncStorage.setItem(storageKey, JSON.stringify(updated));

    try {
      const db = getFirebaseDb();
      await deleteDoc(doc(db, 'properties', propId, 'staff', staffId));
    } catch (e) {
      console.warn('Failed to delete staff in Firestore:', e);
    }
  },
};
