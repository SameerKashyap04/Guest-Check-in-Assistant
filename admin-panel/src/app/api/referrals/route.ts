// ============================================================
// Admin Panel — GET /api/referrals?userId=xxx
// ============================================================
//
// Fetches the user's referral code, statistics, and history.
//

import { NextRequest, NextResponse } from 'next/server';
import { getReferralOverview } from '@/lib/referrals';

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

    const overview = await getReferralOverview(userId);

    return NextResponse.json(overview, { status: 200, headers: corsHeaders });
  } catch (error: any) {
    console.error('[ReferralsAPI] Unexpected error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}
