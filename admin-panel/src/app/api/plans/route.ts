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

    if (snap.exists() && snap.data()?.plans) {
      return NextResponse.json(
        { plans: snap.data().plans, source: 'firestore' },
        { status: 200, headers: corsHeaders }
      );
    }

    // Fallback to static server plans definition
    return NextResponse.json(
      { plans: SERVER_PLANS, source: 'default' },
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
