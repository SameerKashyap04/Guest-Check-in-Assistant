// ============================================================
// Admin Panel — Server-Side Referral & Wallet Engine
// ============================================================
//
// Manages unique referral codes, referral linking, qualifying payment checks,
// fraud protection, and StayMate Credits ledger.
//

import { db } from '@/lib/firebase';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  increment,
  serverTimestamp,
  orderBy,
  limit,
} from 'firebase/firestore';

export type ReferralStatus = 'PENDING' | 'SUCCESSFUL' | 'CANCELLED' | 'REVERSED';

export interface ServerReferralRecord {
  id: string;
  referrerUserId: string;
  referredUserId: string;
  referralCode: string;
  status: ReferralStatus;
  qualifyingTransactionId: string | null;
  rewardAmount: number; // e.g. 100 ₹
  friendDiscountAmount: number; // e.g. 100 ₹
  createdAt: string; // ISO
  completedAt: string | null; // ISO
  referredUserIdentifier?: string;
}

export type WalletTxType = 'CREDIT' | 'DEBIT';
export type WalletTxSource =
  | 'REFERRAL_REWARD'
  | 'SUBSCRIPTION_DISCOUNT'
  | 'REVERSAL'
  | 'WELCOME_BONUS';

export interface ServerWalletTx {
  id: string;
  walletId: string;
  userId: string;
  type: WalletTxType;
  amount: number; // in ₹
  source: WalletTxSource;
  referenceId: string | null;
  description: string;
  createdAt: string;
}

const DEFAULT_REWARD_AMOUNT = 100; // ₹100
const DEFAULT_FRIEND_DISCOUNT = 100; // ₹100

/**
 * Derives or generates a deterministic referral code for a user
 * e.g. STAYMATE82 or STAY + last 4 chars of user ID
 */
export function generateUserReferralCode(userId: string): string {
  if (!userId) return 'STAYMATE82';
  const clean = userId.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  const suffix = clean.length >= 4 ? clean.slice(-4) : clean.padStart(4, '8');
  return `STAY${suffix}`;
}

/**
 * Gets or creates the user's referral code record
 */
export async function getOrCreateReferralCode(userId: string): Promise<string> {
  const code = generateUserReferralCode(userId);
  try {
    const refDoc = doc(db, 'referral_codes', code);
    const snap = await getDoc(refDoc);
    if (!snap.exists()) {
      await setDoc(refDoc, {
        code,
        userId,
        createdAt: serverTimestamp(),
      });
    }
  } catch (err) {
    console.warn('[Referrals] Referral code record notice:', err);
  }
  return code;
}

/**
 * Looks up the referrer user ID for a referral code
 */
export async function findReferrerByCode(code: string): Promise<string | null> {
  const cleanCode = (code || '').trim().toUpperCase();
  if (!cleanCode) return null;

  try {
    const snap = await getDoc(doc(db, 'referral_codes', cleanCode));
    if (snap.exists()) {
      return snap.data().userId || null;
    }
  } catch (err) {
    console.warn('[Referrals] Code lookup notice:', err);
  }

  // Fallback: If code starts with STAY and is 8 chars
  return null;
}

/**
 * Links a newly registered / existing user to a referral code (status: PENDING).
 * Enforces anti-fraud:
 * - Prevents self-referral
 * - Prevents duplicate referral links for the same user
 */
export async function linkReferral(
  referralCode: string,
  referredUserId: string,
  referredUserEmail?: string
): Promise<{ success: boolean; error?: string; referral?: ServerReferralRecord }> {
  const cleanCode = (referralCode || '').trim().toUpperCase();
  if (!cleanCode) {
    return { success: false, error: 'Invalid referral code' };
  }

  const referrerUserId = await findReferrerByCode(cleanCode);
  if (!referrerUserId) {
    return { success: false, error: 'Referral code not found' };
  }

  // Anti-fraud 1: Self-referral prevention
  if (referrerUserId === referredUserId) {
    return { success: false, error: 'You cannot use your own referral code' };
  }

  const referralId = `ref_${referredUserId}`;

  try {
    const existingSnap = await getDoc(doc(db, 'referrals', referralId));
    if (existingSnap.exists()) {
      const data = existingSnap.data() as ServerReferralRecord;
      if (data.status === 'SUCCESSFUL') {
        return { success: false, error: 'Referral reward already granted for this account' };
      }
      return { success: true, referral: data };
    }

    const maskedEmail = referredUserEmail
      ? `${referredUserEmail.slice(0, 2)}***@${referredUserEmail.split('@')[1] || 'mail.com'}`
      : 'Friend';

    const nowIso = new Date().toISOString();
    const newRecord: ServerReferralRecord = {
      id: referralId,
      referrerUserId,
      referredUserId,
      referralCode: cleanCode,
      status: 'PENDING',
      qualifyingTransactionId: null,
      rewardAmount: DEFAULT_REWARD_AMOUNT,
      friendDiscountAmount: DEFAULT_FRIEND_DISCOUNT,
      createdAt: nowIso,
      completedAt: null,
      referredUserIdentifier: maskedEmail,
    };

    await setDoc(doc(db, 'referrals', referralId), {
      ...newRecord,
      createdAt: serverTimestamp(),
    });

    return { success: true, referral: newRecord };
  } catch (err: any) {
    console.error('[Referrals] Link referral error:', err);
    return { success: false, error: err.message || 'Failed to apply referral code' };
  }
}

/**
 * Gets user's wallet balance in ₹ (StayMate Credits)
 */
export async function getUserWalletBalance(userId: string): Promise<number> {
  try {
    const snap = await getDoc(doc(db, 'wallets', userId));
    if (snap.exists()) {
      return snap.data().balance || 0;
    }
  } catch (err) {
    console.warn('[Wallet] Balance lookup notice:', err);
  }
  return 0;
}

/**
 * Adds a transaction to the StayMate Credits ledger and updates wallet balance
 */
export async function addWalletTransaction(
  userId: string,
  type: WalletTxType,
  amount: number,
  source: WalletTxSource,
  referenceId: string | null,
  description: string
): Promise<{ success: boolean; newBalance: number }> {
  if (amount <= 0) return { success: false, newBalance: 0 };

  const walletDocRef = doc(db, 'wallets', userId);
  const txId = `tx_${userId}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  const txDocRef = doc(db, 'wallet_transactions', txId);

  try {
    const walletSnap = await getDoc(walletDocRef);
    let currentBalance = 0;
    if (walletSnap.exists()) {
      currentBalance = walletSnap.data().balance || 0;
    }

    const balanceDelta = type === 'CREDIT' ? amount : -amount;
    const newBalance = Math.max(0, currentBalance + balanceDelta);

    await setDoc(
      walletDocRef,
      {
        userId,
        balance: newBalance,
        currency: 'INR',
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    const nowIso = new Date().toISOString();
    await setDoc(txDocRef, {
      id: txId,
      walletId: userId,
      userId,
      type,
      amount,
      source,
      referenceId,
      description,
      createdAt: nowIso,
      createdTimestamp: serverTimestamp(),
    });

    return { success: true, newBalance };
  } catch (err) {
    console.error('[Wallet] Add transaction error:', err);
    return { success: false, newBalance: 0 };
  }
}

/**
 * Called upon successful qualifying subscription payment:
 * Qualifies pending referral, awards ₹100 credits to referrer, creates ledger record.
 */
export async function completeQualifyingReferral(
  referredUserId: string,
  orderId: string,
  planId: string
): Promise<boolean> {
  // Free plan is not a qualifying paid subscription
  if (planId === 'FREE') return false;

  const referralId = `ref_${referredUserId}`;

  try {
    const refDocRef = doc(db, 'referrals', referralId);
    const snap = await getDoc(refDocRef);

    if (!snap.exists()) {
      return false;
    }

    const referral = snap.data() as ServerReferralRecord;

    // Only qualify if still PENDING
    if (referral.status !== 'PENDING') {
      return false;
    }

    const nowIso = new Date().toISOString();

    // 1. Update referral status to SUCCESSFUL
    await updateDoc(refDocRef, {
      status: 'SUCCESSFUL',
      qualifyingTransactionId: orderId,
      completedAt: nowIso,
      updatedAt: serverTimestamp(),
    });

    // 2. Award reward to referrer's wallet
    await addWalletTransaction(
      referral.referrerUserId,
      'CREDIT',
      referral.rewardAmount || DEFAULT_REWARD_AMOUNT,
      'REFERRAL_REWARD',
      orderId,
      `Referral reward for inviting ${referral.referredUserIdentifier || 'a homestay owner'}`
    );

    console.info(
      `[Referrals] ✅ Referral ${referralId} completed. Referrer ${referral.referrerUserId} awarded ₹${referral.rewardAmount} credits.`
    );
    return true;
  } catch (err) {
    console.error('[Referrals] Complete qualifying referral error:', err);
    return false;
  }
}

/**
 * Retrieves full referral statistics and history for the Refer & Earn screen
 */
export async function getReferralOverview(userId: string) {
  const referralCode = await getOrCreateReferralCode(userId);
  const availableCredits = await getUserWalletBalance(userId);

  let history: ServerReferralRecord[] = [];
  let successfulCount = 0;
  let pendingCount = 0;
  let totalEarnedCredits = 0;

  try {
    const q = query(
      collection(db, 'referrals'),
      where('referrerUserId', '==', userId)
    );
    const snap = await getDocs(q);

    snap.forEach((docSnap) => {
      const rec = docSnap.data() as ServerReferralRecord;
      history.push(rec);
      if (rec.status === 'SUCCESSFUL') {
        successfulCount += 1;
        totalEarnedCredits += rec.rewardAmount || DEFAULT_REWARD_AMOUNT;
      } else if (rec.status === 'PENDING') {
        pendingCount += 1;
      }
    });
  } catch (err) {
    console.warn('[Referrals] History lookup notice:', err);
  }

  // Fetch wallet transactions ledger
  let transactions: ServerWalletTx[] = [];
  try {
    const txQuery = query(
      collection(db, 'wallet_transactions'),
      where('userId', '==', userId),
      limit(20)
    );
    const txSnap = await getDocs(txQuery);
    txSnap.forEach((docSnap) => {
      transactions.push(docSnap.data() as ServerWalletTx);
    });
    transactions.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  } catch (err) {
    console.warn('[Wallet] Ledger lookup notice:', err);
  }

  return {
    referralCode,
    successfulCount,
    pendingCount,
    totalEarnedCredits,
    availableCredits,
    history,
    transactions,
  };
}
