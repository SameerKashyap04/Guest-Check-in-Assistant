// ============================================================
// StayMate — Centralized Entitlement Service
// ============================================================
//
// All feature-gate and limit checks flow through this service.
// Screens never check plan names directly — they call these functions.
//

import {
  SubscriptionPlan,
  SubscriptionStatus,
  type FeatureFlag,
  type UsageLimitKey,
} from '@/types/subscription';
import {
  PLANS,
  PLAN_ORDER,
  getMinimumPlanForFeature,
  getMinimumPlanForLimit,
  GRACE_PERIOD,
} from '@/config/plans';

// ------------------------------------------------------------------
// The store will be imported lazily to avoid circular dependencies.
// useSubscriptionStore is a Zustand store created separately.
// ------------------------------------------------------------------
let _getSubscriptionState: (() => {
  currentPlan: SubscriptionPlan;
  status: SubscriptionStatus;
  isTrialing: boolean;
  trialEndDate: string | null;
  lastVerifiedAt: string | null;
  gracePeriodDays: number;
  usage: {
    month: number;
    year: number;
    checkInCount: number;
    exportCount: number;
    ocrScanCount: number;
  };
}) | null = null;

/**
 * Called once from useSubscriptionStore to register the state accessor.
 * This avoids circular imports between the store and this service.
 */
export function registerSubscriptionStateAccessor(accessor: typeof _getSubscriptionState) {
  _getSubscriptionState = accessor;
}

function getState() {
  if (!_getSubscriptionState) {
    // Fallback: return free plan defaults if store not yet initialized
    return {
      currentPlan: SubscriptionPlan.FREE,
      status: SubscriptionStatus.ACTIVE,
      isTrialing: false,
      trialEndDate: null,
      lastVerifiedAt: null,
      gracePeriodDays: GRACE_PERIOD.DEFAULT_DAYS,
      usage: {
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
        checkInCount: 0,
        exportCount: 0,
        ocrScanCount: 0,
      },
    };
  }
  return _getSubscriptionState();
}

// ------------------------------------------------------------------
// Feature Gates
// ------------------------------------------------------------------

/**
 * Check if the current subscription allows a specific feature.
 *
 * @example
 * if (!canUseFeature('ocrScanning')) {
 *   showUpgradePrompt('ocrScanning');
 * }
 */
export function canUseFeature(feature: FeatureFlag): boolean {
  const state = getState();
  const effectivePlan = getEffectivePlan(state);
  const entitlements = PLANS[effectivePlan].entitlements;
  return entitlements.features.includes(feature);
}

/**
 * Get the numeric limit for a usage dimension under the current plan.
 * Returns -1 for unlimited.
 */
export function getLimit(limitKey: UsageLimitKey): number {
  const state = getState();
  const effectivePlan = getEffectivePlan(state);
  return PLANS[effectivePlan].entitlements.limits[limitKey];
}

/**
 * Check if the user has reached or exceeded a usage limit.
 */
export function isAtLimit(metric: 'monthlyCheckIns' | 'monthlyExports' | 'rooms'): boolean {
  const state = getState();
  const effectivePlan = getEffectivePlan(state);
  const limits = PLANS[effectivePlan].entitlements.limits;

  switch (metric) {
    case 'monthlyCheckIns': {
      const limit = limits.monthlyCheckInLimit;
      if (limit === -1) return false; // unlimited
      return state.usage.checkInCount >= limit;
    }
    case 'monthlyExports': {
      const limit = limits.monthlyExportLimit;
      if (limit === -1) return false;
      return state.usage.exportCount >= limit;
    }
    case 'rooms': {
      // Room count is checked externally by passing current count
      // This case is handled by isRoomLimitReached() below
      return false;
    }
    default:
      return false;
  }
}

/**
 * Check if adding one more room would exceed the plan's room limit.
 * @param currentRoomCount - number of rooms currently in the property
 */
export function isRoomLimitReached(currentRoomCount: number): boolean {
  const limit = getLimit('maxRoomsPerProperty');
  if (limit === -1) return false; // unlimited
  return currentRoomCount >= limit;
}

/**
 * Get remaining usage for a metric. Returns -1 if unlimited.
 */
export function getRemainingUsage(
  metric: 'monthlyCheckIns' | 'monthlyExports'
): number {
  const state = getState();
  const effectivePlan = getEffectivePlan(state);
  const limits = PLANS[effectivePlan].entitlements.limits;

  switch (metric) {
    case 'monthlyCheckIns': {
      const limit = limits.monthlyCheckInLimit;
      if (limit === -1) return -1;
      return Math.max(0, limit - state.usage.checkInCount);
    }
    case 'monthlyExports': {
      const limit = limits.monthlyExportLimit;
      if (limit === -1) return -1;
      return Math.max(0, limit - state.usage.exportCount);
    }
    default:
      return -1;
  }
}

/**
 * Check if the user has at least the specified plan tier.
 *
 * @example
 * if (hasPlan(SubscriptionPlan.PROFESSIONAL)) {
 *   // show advanced reports
 * }
 */
export function hasPlan(minimumPlan: SubscriptionPlan): boolean {
  const state = getState();
  const effectivePlan = getEffectivePlan(state);
  return PLAN_ORDER.indexOf(effectivePlan) >= PLAN_ORDER.indexOf(minimumPlan);
}

// ------------------------------------------------------------------
// Upgrade Context Helpers
// ------------------------------------------------------------------

/**
 * Get info for an upgrade prompt: which plan is needed and what benefit it provides.
 */
export function getUpgradeInfo(feature: FeatureFlag): {
  requiredPlan: SubscriptionPlan;
  requiredPlanName: string;
  currentPlan: SubscriptionPlan;
  currentPlanName: string;
} {
  const state = getState();
  const requiredPlan = getMinimumPlanForFeature(feature);
  return {
    requiredPlan,
    requiredPlanName: PLANS[requiredPlan].name,
    currentPlan: state.currentPlan,
    currentPlanName: PLANS[state.currentPlan].name,
  };
}

/**
 * Get info for a limit-based upgrade prompt.
 */
export function getLimitUpgradeInfo(limitKey: UsageLimitKey, neededValue: number): {
  requiredPlan: SubscriptionPlan;
  requiredPlanName: string;
  currentLimit: number;
  newLimit: number;
} {
  const state = getState();
  const effectivePlan = getEffectivePlan(state);
  const currentLimit = PLANS[effectivePlan].entitlements.limits[limitKey];
  const requiredPlan = getMinimumPlanForLimit(limitKey, neededValue);
  const newLimit = PLANS[requiredPlan].entitlements.limits[limitKey];
  return {
    requiredPlan,
    requiredPlanName: PLANS[requiredPlan].name,
    currentLimit,
    newLimit,
  };
}

// ------------------------------------------------------------------
// Trial Helpers
// ------------------------------------------------------------------

/**
 * Get remaining trial days. Returns 0 if not trialing or expired.
 */
export function getTrialDaysRemaining(): number {
  const state = getState();
  if (!state.isTrialing || !state.trialEndDate) return 0;
  const now = new Date();
  const end = new Date(state.trialEndDate);
  const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(0, diff);
}

/**
 * Check if a trial reminder should be shown (7, 3, or 1 day before expiry).
 */
export function shouldShowTrialReminder(): number | null {
  const remaining = getTrialDaysRemaining();
  if (remaining === 7 || remaining === 3 || remaining === 1) return remaining;
  return null;
}

// ------------------------------------------------------------------
// Subscription Status Helpers
// ------------------------------------------------------------------

/**
 * Returns true if the subscription is in an active or grace state
 * that should allow normal app usage.
 */
export function isSubscriptionActive(): boolean {
  const state = getState();
  const status = state.status;
  // Active, trialing, and past_due (within grace) all allow usage
  return (
    status === SubscriptionStatus.ACTIVE ||
    status === SubscriptionStatus.TRIALING ||
    status === SubscriptionStatus.PAST_DUE
  );
}

/**
 * Check if the app should operate in grace mode (offline or past_due).
 * In grace mode, cached entitlements are used and the user is not locked out.
 */
export function isInGracePeriod(): boolean {
  const state = getState();
  if (state.status === SubscriptionStatus.PAST_DUE) return true;

  // If we haven't verified with server recently, we're in offline grace
  if (state.lastVerifiedAt) {
    const lastCheck = new Date(state.lastVerifiedAt);
    const graceCutoff = new Date();
    graceCutoff.setDate(graceCutoff.getDate() - state.gracePeriodDays);
    return lastCheck < graceCutoff;
  }

  // Never verified — this is a new install, grant grace
  return false;
}

// ------------------------------------------------------------------
// Internal: Effective Plan Resolution
// ------------------------------------------------------------------

/**
 * Determines the effective plan considering trial status, expiry, and grace.
 *
 * CRITICAL OFFLINE-FIRST RULE:
 * Never downgrade the user just because the network is unavailable.
 * Use the cached plan and entitlements until the grace period expires.
 */
export function getEffectivePlan(state: ReturnType<typeof getState>): SubscriptionPlan {
  const { currentPlan, status, isTrialing } = state;

  // Expired or cancelled with no grace → FREE
  if (status === SubscriptionStatus.EXPIRED || status === SubscriptionStatus.CANCELLED) {
    // Check if within expiry grace period
    if (state.lastVerifiedAt) {
      const lastCheck = new Date(state.lastVerifiedAt);
      const graceCutoff = new Date();
      graceCutoff.setDate(graceCutoff.getDate() - GRACE_PERIOD.EXPIRY_GRACE_DAYS);
      if (lastCheck >= graceCutoff) {
        // Still within grace, honor last known plan
        return currentPlan;
      }
    }
    return SubscriptionPlan.FREE;
  }

  // Active, trialing, past_due, or paused → honor current plan
  return currentPlan;
}
