/**
 * Google Sign-In Service for StayMate V3
 * Uses @react-native-google-signin/google-signin@16.1.4 — same package as the working main app.
 * applicationId is now com.staymate.app which is registered in Firebase with the correct SHA-1.
 */
import { initializeApp, getApps, getApp } from '@firebase/app';
import {
  initializeAuth,
  getReactNativePersistence,
  GoogleAuthProvider,
  signInWithCredential,
  getAuth,
} from '@firebase/auth';
import { getFirestore, doc, setDoc, getDoc } from '@firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import * as WebBrowser from 'expo-web-browser';

// ── Firebase config ───────────────────────────────────────────────────────────
const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyD-KN4lzXROjDdHtvvqxwE6Xdlw2uStWnk',
  authDomain: 'guest-checkin-assistant.firebaseapp.com',
  projectId: 'guest-checkin-assistant',
  storageBucket: 'guest-checkin-assistant.firebasestorage.app',
  messagingSenderId: '765584797318',
  appId: '1:765584797318:android:588d3954c264987e75eb07',
};

const WEB_CLIENT_ID = '765584797318-q9gnbmfr650bpgm2vr1na0i3u1mb7i7e.apps.googleusercontent.com';

// Configure Google Sign-In (same as main app)
try {
  GoogleSignin.configure({
    webClientId: WEB_CLIENT_ID,
    offlineAccess: true,
  });
} catch (_) {}

WebBrowser.maybeCompleteAuthSession();

// ── Lazy Firebase init ────────────────────────────────────────────────────────
function getFirebaseApp() {
  if (getApps().length > 0) return getApp();
  const app = initializeApp(FIREBASE_CONFIG);
  try {
    initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch (_) {}
  return app;
}

// ── Exported types ────────────────────────────────────────────────────────────
export interface OwnerProfile {
  uid: string;
  email: string;
  businessName: string;
  propertyId: string;
  createdAt: string;
  provider?: string;
  ownerName?: string;
  phone?: string;
  address?: string;
}

/**
 * Fetches owner profile from Firestore by UID or email
 */
export async function fetchOwnerProfile(uid?: string, email?: string): Promise<OwnerProfile | null> {
  try {
    const app = getFirebaseApp();
    const db = getFirestore(app);
    if (uid) {
      const docSnap = await getDoc(doc(db, 'owners', uid));
      if (docSnap.exists()) {
        return docSnap.data() as OwnerProfile;
      }
    }
    if (email) {
      const cleanEmail = email.trim().toLowerCase();
      const docSnap = await getDoc(doc(db, 'owners', cleanEmail));
      if (docSnap.exists()) {
        return docSnap.data() as OwnerProfile;
      }
    }
  } catch (e) {
    console.warn('Firestore owner profile fetch notice:', e);
  }
  return null;
}

/**
 * Updates owner profile in Firestore (owners & properties collections)
 * Immediately syncs name, mobile number, email, location/address, and homestay business name to Admin Panel.
 */
export async function updateOwnerProfile(
  uid: string,
  updates: Partial<OwnerProfile> & {
    name?: string;
    location?: string;
    city?: string;
    rooms?: number;
    phone?: string;
  }
): Promise<void> {
  try {
    const app = getFirebaseApp();
    const db = getFirestore(app);

    const ownerName = updates.ownerName || updates.name || '';
    const businessName = updates.businessName || '';
    const email = updates.email ? updates.email.trim().toLowerCase() : '';
    const phone = updates.phone || '';
    const location = updates.location || updates.address || '';
    const propId = updates.propertyId || (uid ? `HS-${uid.slice(0, 4).toUpperCase()}` : 'HS-4821');

    const cleanUpdates: any = {
      ...updates,
      name: ownerName,
      ownerName: ownerName,
      businessName: businessName,
      property: businessName,
      email: email,
      phone: phone,
      ownerPhone: phone,
      mobile: phone,
      address: location,
      location: location,
      propertyId: propId,
      updatedAt: new Date().toISOString(),
    };

    // Use single canonical owner document key to prevent duplicate records in admin console
    const canonicalOwnerKey = uid || (email ? email.replace(/[^a-zA-Z0-9]/g, '_') : 'default_owner');
    await setDoc(doc(db, 'owners', canonicalOwnerKey), cleanUpdates, { merge: true });

    // Always ensure single canonical property document is synced
    await setDoc(
      doc(db, 'properties', propId),
      {
        id: propId,
        propertyId: propId,
        ...(businessName ? { name: businessName, businessName: businessName } : {}),
        ...(ownerName ? { ownerName: ownerName } : {}),
        ...(email ? { ownerEmail: email, email: email } : {}),
        ...(phone ? { ownerPhone: phone, phone: phone } : {}),
        ...(location ? { location: location, address: location } : {}),
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (e) {
    console.warn('Failed to update owner profile in Firestore:', e);
  }
}

/**
 * Syncs a new checkin to Firestore checkins collection and updates property inventory stats
 */
export async function syncCheckinToFirestore(
  propertyId: string,
  checkinData: any,
  updatedRoomsList?: any[]
) {
  try {
    const app = getFirebaseApp();
    const db = getFirestore(app);
    const propId = propertyId || 'HS-4821';
    const checkinId = checkinData.id ? String(checkinData.id) : `chk_${Date.now()}`;

    // 1. Write to checkins collection
    await setDoc(
      doc(db, 'checkins', checkinId),
      {
        ...checkinData,
        id: checkinId,
        propertyId: propId,
        docType: checkinData.type || checkinData.docType || 'Aadhaar',
        createdAt: checkinData.createdAt || new Date().toISOString(),
        timestamp: new Date().toISOString(),
        verified: checkinData.verified ?? true,
      },
      { merge: true }
    );

    // 2. Update property's roomsList, live room count, and active occupancy
    const propRef = doc(db, 'properties', propId);
    const updateData: any = {
      updatedAt: new Date().toISOString(),
      lastActive: new Date().toISOString(),
    };
    if (updatedRoomsList) {
      updateData.roomsList = updatedRoomsList;
      updateData.rooms = updatedRoomsList.length;
      updateData.occupiedRooms = updatedRoomsList.filter((r) => r.status === 'occupied').length;
      updateData.availableRooms = updatedRoomsList.filter((r) => r.status === 'available').length;
    }
    await setDoc(propRef, updateData, { merge: true });

    // 3. Increment total check-ins counter
    const snap = await getDoc(propRef);
    if (snap.exists()) {
      const currentCount = Number(snap.data().checkIns || 0);
      await updateDoc(propRef, {
        checkIns: currentCount + 1,
      });
    }
  } catch (e) {
    console.warn('Failed to sync checkin to Firestore:', e);
  }
}

/**
 * Syncs live room inventory to Firestore properties collection
 */
export async function syncRoomsToFirestore(propertyId: string, roomsList: any[]) {
  try {
    const app = getFirebaseApp();
    const db = getFirestore(app);
    const propId = propertyId || 'HS-4821';
    await setDoc(
      doc(db, 'properties', propId),
      {
        roomsList: roomsList,
        rooms: roomsList.length,
        occupiedRooms: roomsList.filter((r) => r.status === 'occupied').length,
        availableRooms: roomsList.filter((r) => r.status === 'available').length,
        updatedAt: new Date().toISOString(),
        lastActive: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (e) {
    console.warn('Failed to sync rooms to Firestore:', e);
  }
}

/**
 * Native Google Sign-In — identical logic to the working main app.
 * Primary: @react-native-google-signin native sheet (works because applicationId=com.staymate.app is registered in Firebase)
 * Fallback: WebBrowser OAuth flow for any DEVELOPER_ERROR edge case
 */
export async function signInWithGoogleOwner(): Promise<OwnerProfile> {
  const app = getFirebaseApp();
  const auth = getAuth(app);
  const db = getFirestore(app);

  try {
    await GoogleSignin.configure({
      webClientId: WEB_CLIENT_ID,
      offlineAccess: true,
    });

    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

    let response: any;
    try {
      response = await GoogleSignin.signIn();
    } catch (err: any) {
      // Fallback to WebBrowser flow for DEVELOPER_ERROR (same as main app)
      if (
        err?.code === 'DEVELOPER_ERROR' ||
        err?.message?.includes('DEVELOPER_ERROR') ||
        String(err?.code) === '10'
      ) {
        console.warn('DEVELOPER_ERROR — using WebBrowser fallback');
        const nonce = Math.random().toString(36).substring(2, 18);
        const authUrl =
          `https://accounts.google.com/o/oauth2/v2/auth` +
          `?client_id=${WEB_CLIENT_ID}` +
          `&response_type=id_token` +
          `&redirect_uri=https://guest-checkin-assistant.firebaseapp.com/__/auth/handler` +
          `&scope=openid%20email%20profile` +
          `&nonce=${nonce}` +
          `&prompt=select_account`;

        const webResult = await WebBrowser.openAuthSessionAsync(authUrl, 'staymate://');

        if (webResult.type !== 'success' || !webResult.url) {
          throw new Error('Google Sign-In was cancelled or not completed.');
        }

        const idTokenMatch = webResult.url.match(/id_token=([^&]+)/);
        if (idTokenMatch?.[1]) {
          const credential = GoogleAuthProvider.credential(idTokenMatch[1]);
          const authResult = await signInWithCredential(auth, credential);
          const user = authResult.user;

          const profile: OwnerProfile = {
            uid: user.uid,
            email: user.email || 'google.user@homestay.com',
            businessName: user.displayName ? `${user.displayName}'s Homestay` : 'My Homestay',
            propertyId: `HS-${user.uid.substring(0, 4).toUpperCase()}`,
            createdAt: new Date().toISOString(),
            provider: 'google',
          };
          try { await setDoc(doc(db, 'owners', user.uid), profile); } catch (_) {}
          return profile;
        }
      }
      throw err;
    }

    // Native Sign-In succeeded
    const userInfo = (response as any)?.data || response;
    const googleEmail = userInfo?.user?.email || (userInfo as any)?.email;
    const googleName = userInfo?.user?.name || (userInfo as any)?.name || 'My Homestay';

    let idToken = userInfo?.idToken;
    if (!idToken) {
      try { const tokens = await GoogleSignin.getTokens(); idToken = tokens.idToken; } catch (_) {}
    }

    if (idToken) {
      const credential = GoogleAuthProvider.credential(idToken);
      const authResult = await signInWithCredential(auth, credential);
      const user = authResult.user;

      let profile: OwnerProfile = {
        uid: user.uid,
        email: user.email || googleEmail || 'google.user@homestay.com',
        businessName: user.displayName ? `${user.displayName}'s Homestay` : `${googleName}'s Homestay`,
        propertyId: `HS-${user.uid.substring(0, 4).toUpperCase()}`,
        createdAt: new Date().toISOString(),
        provider: 'google',
      };

      try {
        const docSnap = await getDoc(doc(db, 'owners', user.uid));
        if (docSnap.exists()) {
          profile = { ...(docSnap.data() as OwnerProfile), provider: 'google' };
        } else {
          await setDoc(doc(db, 'owners', user.uid), profile);
        }
      } catch (_) {}

      return profile;
    }

    if (googleEmail) {
      return {
        uid: `GOOGLE_${Date.now()}`,
        email: googleEmail,
        businessName: `${googleName}'s Homestay`,
        propertyId: 'HS-GOOG',
        createdAt: new Date().toISOString(),
        provider: 'google',
      };
    }

    throw new Error('Could not retrieve Google account details. Please try again.');
  } catch (err: any) {
    if (err?.code === statusCodes.SIGN_IN_CANCELLED) throw new Error('Google Sign-In was cancelled.');
    if (err?.code === statusCodes.IN_PROGRESS) throw new Error('Google Sign-In is already in progress.');
    if (err?.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) throw new Error('Google Play Services is not available.');
    throw new Error(err?.message || 'Google Sign-In failed. Please try again.');
  }
}
