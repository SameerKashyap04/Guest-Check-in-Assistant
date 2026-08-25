// ============================================================
// Admin Panel — POST /api/referrals/apply
// ============================================================
//
// Links a user to a referral code with anti-fraud protection.
//

import { NextRequest, NextResponse } from 'next/server';
import { linkReferral } from '@/lib/referrals';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { referralCode, userId, userEmail } = body;

    if (!referralCode || !userId) {
      return NextResponse.json(
        { error: 'Missing required parameters: referralCode, userId' },
        { status: 400, headers: corsHeaders }
      );
    }

    const result = await linkReferral(referralCode, userId, userEmail);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to apply referral code' },
        { status: 400, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Referral code linked successfully',
        referral: result.referral,
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('[ApplyReferralAPI] Unexpected error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}
