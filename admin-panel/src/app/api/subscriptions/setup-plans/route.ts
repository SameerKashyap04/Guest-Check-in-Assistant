// ============================================================
// Admin Panel — POST /api/subscriptions/setup-plans
// ============================================================
//
// One-time setup: creates StayMate plans in Devify Pay and saves
// the returned plan IDs to Firestore (system_config/devify_plans).
//
// Run once from your admin panel or via curl after deployment.
// 409 from Devify means the plan already exists — we extract the
// existing plan ID from the error body and use that.
//
// Protected by super-admin email header check.
//

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

const DEVIFY_API_URL = process.env.DEVIFY_API_URL || 'https://devifypay.site';
const DEVIFY_API_KEY = process.env.DEVIFY_API_KEY || '';
const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL || 'dev@company.com';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Admin-Email',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

// ------------------------------------------------------------------
// Plans to create in Devify Pay
// These must match SERVER_PLANS in @/lib/plans.ts
// ------------------------------------------------------------------

const PLANS_TO_CREATE = [
  {
    key: 'STARTER_MONTHLY',
    name: 'StayMate Starter Monthly',
    amount: 34900,   // ₹349 in paise
    currency: 'INR',
    interval: 'MONTH',
    interval_count: 1,
  },
  {
    key: 'STARTER_YEARLY',
    name: 'StayMate Starter Yearly',
    amount: 349900,  // ₹3499 in paise
    currency: 'INR',
    interval: 'YEAR',
    interval_count: 1,
  },
  {
    key: 'PROFESSIONAL_MONTHLY',
    name: 'StayMate Professional Monthly',
    amount: 79900,   // ₹799 in paise
    currency: 'INR',
    interval: 'MONTH',
    interval_count: 1,
  },
  {
    key: 'PROFESSIONAL_YEARLY',
    name: 'StayMate Professional Yearly',
    amount: 799900,  // ₹7999 in paise
    currency: 'INR',
    interval: 'YEAR',
    interval_count: 1,
  },
  {
    key: 'MULTI_PROPERTY_MONTHLY',
    name: 'StayMate Multi-Property Monthly',
    amount: 179900,  // ₹1799 in paise
    currency: 'INR',
    interval: 'MONTH',
    interval_count: 1,
  },
  {
    key: 'MULTI_PROPERTY_YEARLY',
    name: 'StayMate Multi-Property Yearly',
    amount: 1799900, // ₹17999 in paise
    currency: 'INR',
    interval: 'YEAR',
    interval_count: 1,
  },
];

export async function POST(request: NextRequest) {
  // Simple super-admin guard (same pattern used in other admin routes)
  const adminEmail =
    request.headers.get('x-admin-email') ||
    request.headers.get('X-Admin-Email') ||
    '';

  const allowedEmails = (process.env.SUPER_ADMIN_ALLOWED_EMAILS || SUPER_ADMIN_EMAIL)
    .split(',')
    .map((e) => e.trim().toLowerCase());

  if (!allowedEmails.includes(adminEmail.toLowerCase())) {
    return NextResponse.json(
      { error: 'Unauthorized: super-admin access required' },
      { status: 403, headers: corsHeaders }
    );
  }

  if (!DEVIFY_API_KEY) {
    return NextResponse.json(
      { error: 'DEVIFY_API_KEY is not configured' },
      { status: 500, headers: corsHeaders }
    );
  }

  const results: Record<string, { planId: string; status: 'created' | 'existing' | 'error'; error?: string }> = {};

  for (const plan of PLANS_TO_CREATE) {
    try {
      const res = await fetch(`${DEVIFY_API_URL}/v1/plans`, {
        method: 'POST',
        headers: {
          'X-Api-Key': DEVIFY_API_KEY,
          Authorization: `Bearer ${DEVIFY_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: plan.name,
          amount: plan.amount,
          currency: plan.currency,
          interval: plan.interval,
          interval_count: plan.interval_count,
        }),
      });

      if (res.status === 201 || res.status === 200) {
        const data = await res.json();
        const planId = data.id || data.plan_id;
        results[plan.key] = { planId, status: 'created' };
        console.info(`[SetupPlans] Created plan ${plan.key}: ${planId}`);

      } else if (res.status === 409) {
        // Plan already exists — extract existing plan ID from error body
        let planId = '';
        try {
          const errBody = await res.json();
          planId = errBody.existing_id || errBody.id || errBody.plan_id || errBody.data?.id || '';
        } catch {}

        if (planId) {
          results[plan.key] = { planId, status: 'existing' };
          console.info(`[SetupPlans] Plan ${plan.key} already exists: ${planId}`);
        } else {
          // 409 but couldn't extract ID — try listing plans to find it
          try {
            const listRes = await fetch(`${DEVIFY_API_URL}/v1/plans`, {
              headers: {
                'X-Api-Key': DEVIFY_API_KEY,
                Authorization: `Bearer ${DEVIFY_API_KEY}`,
              },
            });
            if (listRes.ok) {
              const listData = await listRes.json();
              const allPlans: any[] = listData.data || listData.plans || (Array.isArray(listData) ? listData : []);
              const match = allPlans.find((p: any) => p.name === plan.name);
              if (match?.id) {
                results[plan.key] = { planId: match.id, status: 'existing' };
                console.info(`[SetupPlans] Plan ${plan.key} found via listing: ${match.id}`);
              } else {
                results[plan.key] = { planId: '', status: 'error', error: '409 but plan ID not found in listing' };
              }
            }
          } catch (listErr) {
            results[plan.key] = { planId: '', status: 'error', error: `409 conflict, listing failed: ${listErr}` };
          }
        }
      } else {
        const errText = await res.text();
        results[plan.key] = { planId: '', status: 'error', error: `HTTP ${res.status}: ${errText}` };
        console.error(`[SetupPlans] Failed to create plan ${plan.key}: ${res.status} ${errText}`);
      }
    } catch (e: any) {
      results[plan.key] = { planId: '', status: 'error', error: e.message };
      console.error(`[SetupPlans] Exception creating plan ${plan.key}:`, e);
    }
  }

  // Persist all successful plan IDs to Firestore
  const planIdsToStore: Record<string, string> = {};
  for (const [key, result] of Object.entries(results)) {
    if (result.planId) {
      planIdsToStore[key] = result.planId;
    }
  }

  if (Object.keys(planIdsToStore).length > 0) {
    try {
      await setDoc(
        doc(db, 'system_config', 'devify_plans'),
        {
          ...planIdsToStore,
          updatedAt: serverTimestamp(),
          updatedBy: adminEmail,
        },
        { merge: true }
      );
      console.info('[SetupPlans] Saved plan IDs to Firestore system_config/devify_plans');
    } catch (fsErr) {
      console.error('[SetupPlans] Failed to save plan IDs to Firestore:', fsErr);
    }
  }

  const hasErrors = Object.values(results).some((r) => r.status === 'error');

  return NextResponse.json(
    {
      success: !hasErrors,
      results,
      firestoreKey: 'system_config/devify_plans',
      message: hasErrors
        ? 'Some plans had errors — check results for details'
        : 'All plans created/verified successfully',
    },
    { status: hasErrors ? 207 : 200, headers: corsHeaders }
  );
}
