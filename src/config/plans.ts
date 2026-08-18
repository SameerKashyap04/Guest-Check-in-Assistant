// ============================================================
// StayMate — Plan Definitions & Configuration
// ============================================================

import {
  SubscriptionPlan,
  PlanDefinition,
  PlanEntitlements,
  type FeatureFlag,
  type UsageLimitKey,
} from '@/types/subscription';

// ------------------------------------------------------------------
// Entitlement Matrix
// ------------------------------------------------------------------

const UNLIMITED = -1;

const FREE_ENTITLEMENTS: PlanEntitlements = {
  limits: {
    maxProperties: 1,
    maxRoomsPerProperty: 10,
    monthlyCheckInLimit: 20,
    monthlyExportLimit: 5,
    maxStaffAccounts: 0,
  },
  features: [
    'qrCheckIn',
    'offlineMode',
    'basicReports',
    'pdfExport',
    'csvExport',
  ],
};

const STARTER_ENTITLEMENTS: PlanEntitlements = {
  limits: {
    maxProperties: 1,
    maxRoomsPerProperty: 5,
    monthlyCheckInLimit: UNLIMITED,
    monthlyExportLimit: UNLIMITED,
    maxStaffAccounts: 0,
  },
  features: [
    'qrCheckIn',
    'offlineMode',
    'basicReports',
    'pdfExport',
    'csvExport',
    'unlimitedExports',
  ],
};

const PROFESSIONAL_ENTITLEMENTS: PlanEntitlements = {
  limits: {
    maxProperties: 1,
    maxRoomsPerProperty: 30,
    monthlyCheckInLimit: UNLIMITED,
    monthlyExportLimit: UNLIMITED,
    maxStaffAccounts: 5,
  },
  features: [
    'qrCheckIn',
    'offlineMode',
    'basicReports',
    'advancedReports',
    'pdfExport',
    'csvExport',
    'unlimitedExports',
    'ocrScanning',
    'cloudSync',
    'staffAccounts',
    'backups',
    'restore',
    'prioritySupport',
  ],
};

const MULTI_PROPERTY_ENTITLEMENTS: PlanEntitlements = {
  limits: {
    maxProperties: 10,
    maxRoomsPerProperty: 30,
    monthlyCheckInLimit: UNLIMITED,
    monthlyExportLimit: UNLIMITED,
    maxStaffAccounts: 20,
  },
  features: [
    'qrCheckIn',
    'offlineMode',
    'basicReports',
    'advancedReports',
    'pdfExport',
    'csvExport',
    'unlimitedExports',
    'ocrScanning',
    'cloudSync',
    'staffAccounts',
    'backups',
    'restore',
    'multiProperty',
    'centralizedDashboard',
    'rolePermissions',
    'prioritySupport',
  ],
};

const ENTERPRISE_ENTITLEMENTS: PlanEntitlements = {
  limits: {
    maxProperties: UNLIMITED,
    maxRoomsPerProperty: UNLIMITED,
    monthlyCheckInLimit: UNLIMITED,
    monthlyExportLimit: UNLIMITED,
    maxStaffAccounts: UNLIMITED,
  },
  features: [
    'qrCheckIn',
    'offlineMode',
    'basicReports',
    'advancedReports',
    'pdfExport',
    'csvExport',
    'unlimitedExports',
    'ocrScanning',
    'cloudSync',
    'staffAccounts',
    'backups',
    'restore',
    'multiProperty',
    'centralizedDashboard',
    'rolePermissions',
    'apiAccess',
    'prioritySupport',
  ],
};

// ------------------------------------------------------------------
// Plan Definitions
// ------------------------------------------------------------------

export const PLANS: Record<SubscriptionPlan, PlanDefinition> = {
  [SubscriptionPlan.FREE]: {
    id: SubscriptionPlan.FREE,
    name: 'Free',
    description: 'Get started with basic guest management',
    pricing: {
      monthlyPrice: 0,
      yearlyPrice: 0,
      currency: 'INR',
      yearlySavings: 0,
    },
    entitlements: FREE_ENTITLEMENTS,
    isRecommended: false,
    isVisible: true,
  },
  [SubscriptionPlan.STARTER]: {
    id: SubscriptionPlan.STARTER,
    name: 'Starter',
    description: 'For small homestays with unlimited check-ins',
    pricing: {
      monthlyPrice: 5,
      yearlyPrice: 2999,
      currency: 'INR',
      yearlySavings: 299 * 12 - 2999,  // ₹589
    },
    entitlements: STARTER_ENTITLEMENTS,
    isRecommended: false,
    isVisible: true,
  },
  [SubscriptionPlan.PROFESSIONAL]: {
    id: SubscriptionPlan.PROFESSIONAL,
    name: 'Professional',
    description: 'For hotels and resorts with OCR, staff accounts, and backups',
    pricing: {
      monthlyPrice: 799,
      yearlyPrice: 7999,
      currency: 'INR',
      yearlySavings: 799 * 12 - 7999,  // ₹1589
    },
    entitlements: PROFESSIONAL_ENTITLEMENTS,
    isRecommended: true,
    isVisible: true,
  },
  [SubscriptionPlan.MULTI_PROPERTY]: {
    id: SubscriptionPlan.MULTI_PROPERTY,
    name: 'Multi-Property',
    description: 'Manage up to 10 properties from a centralized dashboard',
    pricing: {
      monthlyPrice: 1999,
      yearlyPrice: 19999,
      currency: 'INR',
      yearlySavings: 1999 * 12 - 19999,  // ₹3989
    },
    entitlements: MULTI_PROPERTY_ENTITLEMENTS,
    isRecommended: false,
    isVisible: true,
  },
  [SubscriptionPlan.ENTERPRISE]: {
    id: SubscriptionPlan.ENTERPRISE,
    name: 'Enterprise',
    description: 'Custom solution for hotel groups and chains',
    pricing: {
      monthlyPrice: 0,  // custom pricing
      yearlyPrice: 0,
      currency: 'INR',
      yearlySavings: 0,
    },
    entitlements: ENTERPRISE_ENTITLEMENTS,
    isRecommended: false,
    isVisible: false,  // not shown on self-serve pricing screen
  },
};

// ------------------------------------------------------------------
// Plan Ordering (for tier comparison)
// ------------------------------------------------------------------

export const PLAN_ORDER: SubscriptionPlan[] = [
  SubscriptionPlan.FREE,
  SubscriptionPlan.STARTER,
  SubscriptionPlan.PROFESSIONAL,
  SubscriptionPlan.MULTI_PROPERTY,
  SubscriptionPlan.ENTERPRISE,
];

/** Returns true if planA is strictly higher tier than planB */
export function isPlanHigherThan(planA: SubscriptionPlan, planB: SubscriptionPlan): boolean {
  return PLAN_ORDER.indexOf(planA) > PLAN_ORDER.indexOf(planB);
}

/** Returns the minimum plan required for a given feature */
export function getMinimumPlanForFeature(feature: FeatureFlag): SubscriptionPlan {
  for (const planId of PLAN_ORDER) {
    if (PLANS[planId].entitlements.features.includes(feature)) {
      return planId;
    }
  }
  return SubscriptionPlan.ENTERPRISE;
}

/** Returns the minimum plan that satisfies a given limit */
export function getMinimumPlanForLimit(limitKey: UsageLimitKey, requiredValue: number): SubscriptionPlan {
  for (const planId of PLAN_ORDER) {
    const planLimit = PLANS[planId].entitlements.limits[limitKey];
    if (planLimit === UNLIMITED || planLimit >= requiredValue) {
      return planId;
    }
  }
  return SubscriptionPlan.ENTERPRISE;
}

// ------------------------------------------------------------------
// Trial Configuration
// ------------------------------------------------------------------

export const TRIAL_CONFIG = {
  /** Duration of free trial in days */
  TRIAL_DURATION_DAYS: 30,
  /** Plan granted during trial */
  TRIAL_PLAN: SubscriptionPlan.PROFESSIONAL,
  /** Days before expiry to show first reminder */
  REMINDER_DAYS: [7, 3, 1],
} as const;

// ------------------------------------------------------------------
// Launch Offer Configuration
// ------------------------------------------------------------------

export const LAUNCH_OFFER = {
  /** Whether the launch offer is currently active */
  ENABLED: true,
  /** Maximum number of properties eligible */
  MAX_PROPERTIES: 100,
  /** Discounted monthly price during offer (₹) */
  DISCOUNTED_MONTHLY_PRICE: 199,
  /** Duration of discounted pricing (months) */
  DISCOUNT_DURATION_MONTHS: 3,
  /** Price lock duration (months) */
  PRICE_LOCK_MONTHS: 12,
  /** Includes free record migration */
  FREE_MIGRATION: true,
  /** Includes free setup call */
  FREE_SETUP: true,
} as const;

// ------------------------------------------------------------------
// Grace Period (Offline Tolerance)
// ------------------------------------------------------------------

export const GRACE_PERIOD = {
  /** Days of offline access after last server verification */
  DEFAULT_DAYS: 30,
  /** Days of access after subscription expiry */
  EXPIRY_GRACE_DAYS: 7,
} as const;

// ------------------------------------------------------------------
// Helper: Get plan entitlements
// ------------------------------------------------------------------

export function getEntitlements(plan: SubscriptionPlan): PlanEntitlements {
  return PLANS[plan].entitlements;
}

export function getPlanDefinition(plan: SubscriptionPlan): PlanDefinition {
  return PLANS[plan];
}

/** Returns human-readable limit display: "5", "30", or "Unlimited" */
export function formatLimit(value: number): string {
  return value === UNLIMITED ? 'Unlimited' : String(value);
}
