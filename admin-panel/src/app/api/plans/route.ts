// ============================================================
// Admin Panel — GET /api/plans
// ============================================================
//
// Dynamic endpoint returning active Plan & Pricing Matrix.
// Reads live configurations set by super-admins in the Admin Panel.
//

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { SERVER_PLANS } from '@/lib/plans';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json(null, { status: 204, headers: corsHeaders });
}

export async function GET(request: NextRequest) {
  try {
    const docRef = doc(db, 'system_config', 'plan_matrix');
    const snap = await getDoc(docRef);
    const plansData = snap.exists() && snap.data()?.plans ? snap.data().plans : SERVER_PLANS;

    let billingPeriodsData = [
      { months: 1, discountPercent: 0, label: '1 Month', badgeText: 'Standard', isActive: true },
      { months: 3, discountPercent: 5, label: '3 Months', badgeText: 'Save 5%', isActive: true },
      { months: 6, discountPercent: 10, label: '6 Months', badgeText: 'Save 10%', isActive: true },
      { months: 12, discountPercent: 15, label: '12 Months (Annual)', badgeText: 'Best Value · Save 15%', isActive: true },
    ];

    try {
      const bpDocRef = doc(db, 'system_config', 'billing_periods');
      const bpSnap = await getDoc(bpDocRef);
      if (bpSnap.exists() && Array.isArray(bpSnap.data()?.periods)) {
        billingPeriodsData = bpSnap.data().periods;
      }
    } catch (_) {}

    return NextResponse.json(
      {
        plans: plansData,
        billingPeriods: billingPeriodsData,
        source: snap.exists() ? 'firestore' : 'default',
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (error: any) {
    console.warn('[GetPlansAPI] Fallback to default plans:', error);
    return NextResponse.json(
      { plans: SERVER_PLANS, source: 'default' },
      { status: 200, headers: corsHeaders }
    );
  }
}
