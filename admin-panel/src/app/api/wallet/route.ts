// ============================================================
// Admin Panel — GET /api/wallet?userId=xxx
// ============================================================
//
// Fetches the user's StayMate Credits balance and transactions ledger.
//

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  limit,
} from 'firebase/firestore';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing required query parameter: userId' },
        { status: 400, headers: corsHeaders }
      );
    }

    let balance = 0;
    try {
      const snap = await getDoc(doc(db, 'wallets', userId));
      if (snap.exists()) {
        balance = snap.data().balance || 0;
      }
    } catch (err) {
      console.warn('[WalletAPI] Balance read notice:', err);
    }

    let transactions: any[] = [];
    try {
      const txQuery = query(
        collection(db, 'wallet_transactions'),
        where('userId', '==', userId),
        limit(50)
      );
      const txSnap = await getDocs(txQuery);
      txSnap.forEach((docSnap) => {
        transactions.push(docSnap.data());
      });
      transactions.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    } catch (err) {
      console.warn('[WalletAPI] Ledger read notice:', err);
    }

    return NextResponse.json(
      {
        userId,
        balance,
        currency: 'INR',
        transactions,
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('[WalletAPI] Unexpected error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}
