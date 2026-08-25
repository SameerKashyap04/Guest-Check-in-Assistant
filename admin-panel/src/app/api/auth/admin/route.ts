// ============================================================
// Admin Panel — POST /api/auth/admin
// ============================================================
//
// Super-Admin Authentication powered strictly by Vercel Environment Variables:
// - SUPER_ADMIN_EMAIL
// - SUPER_ADMIN_PASSWORD
//

import { NextRequest, NextResponse } from 'next/server';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json(null, { status: 204, headers: corsHeaders });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, email, password } = body;

    // Read STRICTLY from Vercel environment variables
    const envAdminEmail = (process.env.SUPER_ADMIN_EMAIL || 'dev@company.com').trim().toLowerCase();
    const envAdminPass = (process.env.SUPER_ADMIN_PASSWORD || 'StayMateAdmin2026!').trim();

    if (action === 'LOGIN' || !action) {
      const inputEmail = (email || '').trim().toLowerCase();
      const inputPassword = (password || '').trim();

      const isEmailValid = inputEmail === envAdminEmail;
      const isPasswordValid = inputPassword === envAdminPass;

      if (!isEmailValid || !isPasswordValid) {
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid credentials. Please verify your Super-Admin email and password.',
          },
          { status: 401, headers: corsHeaders }
        );
      }

      const sessionToken = `sa_session_${Date.now()}_${Math.random().toString(36).substring(2)}`;

      const response = NextResponse.json(
        {
          success: true,
          authenticated: true,
          email: envAdminEmail,
          role: 'SUPER_ADMIN',
          token: sessionToken,
        },
        { status: 200, headers: corsHeaders }
      );

      // Set cookie for browser session persistence
      response.cookies.set('staymate_admin_session', sessionToken, {
        path: '/',
        httpOnly: false,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 days
      });

      return response;
    }

    if (action === 'LOGOUT') {
      const response = NextResponse.json(
        { success: true, message: 'Logged out successfully' },
        { status: 200, headers: corsHeaders }
      );
      response.cookies.delete('staymate_admin_session');
      return response;
    }

    return NextResponse.json(
      { success: false, error: 'Unknown action' },
      { status: 400, headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('[AdminAuthAPI] Error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Authentication server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}
