import { auth, db } from '@/config/firebase';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  User as FirebaseUser 
} from '@firebase/auth';
import { doc, setDoc, getDoc } from '@firebase/firestore';

export interface OwnerProfile {
  uid: string;
  email: string;
  businessName: string;
  propertyId: string;
  createdAt: string;
}

/**
 * Creates a new Homestay Owner account with Email & Password
 */
export async function signUpOwner(email: string, password: string, businessName: string): Promise<OwnerProfile> {
  try {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    const user = credential.user;
    const propertyId = `HS-${Math.floor(1000 + Math.random() * 9000)}`;

    const profile: OwnerProfile = {
      uid: user.uid,
      email: user.email || email,
      businessName: businessName || 'My Homestay',
      propertyId: propertyId,
      createdAt: new Date().toISOString()
    };

    // Save Profile to Firestore Cloud
    try {
      await setDoc(doc(db, 'owners', user.uid), profile);
    } catch (dbErr) {
      console.warn('Firestore owner profile write warning:', dbErr);
    }

    return profile;
  } catch (error: any) {
    console.error('Sign up error:', error);
    throw new Error(error?.message || 'Failed to create owner account.');
  }
}

/**
 * Logs in an existing Homestay Owner with Email & Password
 */
export async function loginOwner(email: string, password: string): Promise<OwnerProfile> {
  try {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    const user = credential.user;

    let profile: OwnerProfile = {
      uid: user.uid,
      email: user.email || email,
      businessName: 'My Homestay',
      propertyId: `HS-${user.uid.substring(0, 4).toUpperCase()}`,
      createdAt: new Date().toISOString()
    };

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
    throw new Error(error?.message || 'Invalid email or password.');
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
