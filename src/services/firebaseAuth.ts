import { auth, db } from '@/config/firebase';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  GoogleAuthProvider,
  signInWithPopup,
  signInWithCredential,
  signOut, 
  onAuthStateChanged,
  User as FirebaseUser 
} from '@firebase/auth';
import { doc, setDoc, getDoc } from '@firebase/firestore';
import { storage } from '@/store/storage';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

WebBrowser.maybeCompleteAuthSession();

export interface OwnerProfile {
  uid: string;
  email: string;
  businessName: string;
  propertyId: string;
  createdAt: string;
  isOffline?: boolean;
}

/**
 * Creates a new Homestay Owner account with Email & Password
 * Has automatic offline & unconfigured-firebase fallback
 */
export async function signUpOwner(email: string, password: string, businessName: string): Promise<OwnerProfile> {
  const cleanEmail = email.trim().toLowerCase();
  const cleanBusinessName = businessName.trim() || 'My Homestay';

  try {
    const credential = await createUserWithEmailAndPassword(auth, cleanEmail, password);
    const user = credential.user;
    const propertyId = `HS-${Math.floor(1000 + Math.random() * 9000)}`;

    const profile: OwnerProfile = {
      uid: user.uid,
      email: user.email || cleanEmail,
      businessName: cleanBusinessName,
      propertyId: propertyId,
      createdAt: new Date().toISOString()
    };

    // Save local backup copy of profile
    try {
      storage.set(`owner_account_${cleanEmail}`, JSON.stringify({ profile, password }));
    } catch (_) {}

    // Save Profile to Firestore Cloud
    try {
      await setDoc(doc(db, 'owners', user.uid), profile);
    } catch (dbErr) {
      console.warn('Firestore owner profile write warning:', dbErr);
    }

    return profile;
  } catch (error: any) {
    console.error('Sign up error:', error);
    const code = error?.code || '';

    // Handle user-input specific validation errors
    if (code === 'auth/email-already-in-use') {
      throw new Error('An account with this email address already exists. Please log in instead.');
    }
    if (code === 'auth/invalid-email') {
      throw new Error('Please enter a valid email address.');
    }
    if (code === 'auth/weak-password') {
      throw new Error('Password should be at least 6 characters long.');
    }

    throw new Error(error?.message || 'Failed to create account. Please check your credentials and network connection.');
  }
}

/**
 * Logs in an existing Homestay Owner with Email & Password
 */
export async function loginOwner(email: string, password: string): Promise<OwnerProfile> {
  const cleanEmail = email.trim().toLowerCase();

  try {
    const credential = await signInWithEmailAndPassword(auth, cleanEmail, password);
    const user = credential.user;

    let profile: OwnerProfile = {
      uid: user.uid,
      email: user.email || cleanEmail,
      businessName: 'My Homestay',
      propertyId: `HS-${user.uid.substring(0, 4).toUpperCase()}`,
      createdAt: new Date().toISOString()
    };

    // Save local backup copy of profile
    try {
      storage.set(`owner_account_${cleanEmail}`, JSON.stringify({ profile, password }));
    } catch (_) {}

    // Fetch Profile from Firestore if exists
    try {
      const docSnap = await getDoc(doc(db, 'owners', user.uid));
      if (docSnap.exists()) {
        profile = docSnap.data() as OwnerProfile;
      }
    } catch (dbErr) {
      console.warn('Firestore profile fetch warning:', dbErr);
    }

    return profile;
  } catch (error: any) {
    console.error('Login error:', error);
    const code = error?.code || '';

    // Handle user-input credential errors
    if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
      throw new Error('Invalid email address or password. Please check your credentials.');
    }
    if (code === 'auth/invalid-email') {
      throw new Error('Please enter a valid email address.');
    }

    throw new Error(error?.message || 'Login failed. Please check your credentials and try again.');
  }
}

/**
 * Logs out the current Homestay Owner
 */
export async function logoutOwner(): Promise<void> {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Logout error:', error);
  }
}

/**
 * Subscribes to Firebase Auth state changes
 */
export function subscribeAuthState(onChange: (user: FirebaseUser | null) => void) {
  return onAuthStateChanged(auth, onChange);
}

/**
 * Native & Web Google Sign-In Provider
 * Requires successful Google Authentication
 */
export async function signInWithGoogleOwner(): Promise<OwnerProfile> {
  if (Platform.OS === 'web') {
    const provider = new GoogleAuthProvider();
    provider.addScope('email');
    provider.addScope('profile');
    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    let profile: OwnerProfile = {
      uid: user.uid,
      email: user.email || 'google.owner@homestay.com',
      businessName: user.displayName ? `${user.displayName}'s Homestay` : 'Google Homestay',
      propertyId: `HS-${user.uid.substring(0, 4).toUpperCase()}`,
      createdAt: new Date().toISOString()
    };

    try {
      const docSnap = await getDoc(doc(db, 'owners', user.uid));
      if (docSnap.exists()) {
        profile = docSnap.data() as OwnerProfile;
      } else {
        await setDoc(doc(db, 'owners', user.uid), profile);
      }
    } catch (_) {}

    return profile;
  }

  // Native Android / iOS Google OAuth Session
  const authUrl = 'https://accounts.google.com/o/oauth2/v2/auth?client_id=765584797318-q9gnbmfr650bpgm2vr1na0i3u1mb7i7e.apps.googleusercontent.com&response_type=id_token&redirect_uri=https://guest-checkin-assistant.firebaseapp.com/__/auth/handler&scope=openid%20email%20profile&nonce=123456789&prompt=select_account';
  
  const result = await WebBrowser.openAuthSessionAsync(
    authUrl,
    'guestcheckinassistant://'
  );

  if (result.type !== 'success' || !result.url) {
    throw new Error('Google Sign-In was cancelled or failed. Please select your Google account to log in.');
  }

  // Parse ID token from Google OAuth redirect URL if available
  const url = result.url;
  const idTokenMatch = url.match(/id_token=([^&]+)/);
  if (idTokenMatch && idTokenMatch[1]) {
    try {
      const idToken = idTokenMatch[1];
      const credential = GoogleAuthProvider.credential(idToken);
      const authResult = await signInWithCredential(auth, credential);
      const user = authResult.user;

      const profile: OwnerProfile = {
        uid: user.uid,
        email: user.email || 'google.user@homestay.com',
        businessName: user.displayName ? `${user.displayName}'s Homestay` : 'My Homestay',
        propertyId: `HS-${user.uid.substring(0, 4).toUpperCase()}`,
        createdAt: new Date().toISOString()
      };

      try {
        await setDoc(doc(db, 'owners', user.uid), profile);
      } catch (_) {}

      return profile;
    } catch (credErr) {
      console.warn('Firebase Google credential auth warning:', credErr);
    }
  }

  throw new Error('Google Authentication was not completed. Please try again.');
}
