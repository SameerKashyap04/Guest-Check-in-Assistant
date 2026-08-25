// ============================================================
// StayMate — Subscription & Entitlement Types
// ============================================================

/** Subscription plan tiers ordered by capability */
export enum SubscriptionPlan {
  FREE = 'FREE',
  STARTER = 'STARTER',
  PROFESSIONAL = 'PROFESSIONAL',
  MULTI_PROPERTY = 'MULTI_PROPERTY',
  ENTERPRISE = 'ENTERPRISE',
}

/** Subscription lifecycle status */
export enum SubscriptionStatus {
  ACTIVE = 'active',
  TRIALING = 'trialing',
  PAST_DUE = 'past_due',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
  PAUSED = 'paused',
}

/** Billing frequency */
export type BillingCycle = 'monthly' | 'yearly';

/** Feature flags that can be gated by plan */
export type FeatureFlag =
  | 'qrCheckIn'
  | 'offlineMode'
  | 'basicReports'
  | 'advancedReports'
  | 'pdfExport'
  | 'csvExport'
  | 'unlimitedExports'
  | 'ocrScanning'
  | 'cloudSync'
  | 'staffAccounts'
  | 'backups'
  | 'restore'
  | 'multiProperty'
  | 'centralizedDashboard'
  | 'rolePermissions'
  | 'apiAccess'
  | 'prioritySupport';

/** Numeric limits that can vary by plan */
export type UsageLimitKey =
  | 'maxProperties'
  | 'maxRoomsPerProperty'
  | 'monthlyCheckInLimit'
  | 'monthlyExportLimit'
  | 'maxStaffAccounts';

/** Entitlements granted by a subscription plan */
export interface PlanEntitlements {
  /** Numeric usage limits (-1 = unlimited) */
  limits: Record<UsageLimitKey, number>;
  /** Feature flags enabled for this plan */
  features: FeatureFlag[];
}

/** Pricing information for a plan */
export interface PlanPricing {
  monthlyPrice: number;      // in ₹
  yearlyPrice: number;       // in ₹
  currency: string;          // 'INR'
  yearlySavings: number;     // how much saved vs 12× monthly
}

/** Complete plan definition */
export interface PlanDefinition {
  id: SubscriptionPlan;
  name: string;
  description: string;
  pricing: PlanPricing;
  entitlements: PlanEntitlements;
  isRecommended: boolean;
  isVisible: boolean;        // whether to show on pricing screen
}

/** Persisted subscription state for the current user */
export interface Subscription {
  currentPlan: SubscriptionPlan;
  billingCycle: BillingCycle;
  status: SubscriptionStatus;

  // Trial tracking
  isTrialing: boolean;
  trialStartDate: string | null;   // ISO date
  trialEndDate: string | null;     // ISO date

  // Subscription dates
  subscriptionStartDate: string | null;
  renewalDate: string | null;
  cancellationDate: string | null;

  // Payment provider reference (never store card details)
  paymentProvider: string | null;         // e.g. 'razorpay'
  externalSubscriptionId: string | null;  // provider's subscription ID

  // Server verification
  lastVerifiedAt: string | null;   // ISO timestamp of last server check
  lastVerifiedPlan: SubscriptionPlan | null;

  // Grace period: allow offline usage for this many days after last verification
  gracePeriodDays: number;
}

/** Monthly usage counters (persisted in SQLite and Zustand) */
export interface UsageMetrics {
  month: number;             // 1-12
  year: number;
  checkInCount: number;
  exportCount: number;
  ocrScanCount: number;
  propertyId: string;
}

/** Staff role for future staff accounts feature */
export enum StaffRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  MANAGER = 'manager',
  STAFF = 'staff',
}

/** Staff permissions (Professional+ feature) */
export type StaffPermission =
  | 'viewGuests'
  | 'createGuest'
  | 'editGuest'
  | 'deleteGuest'
  | 'checkIn'
  | 'checkOut'
  | 'scanID'
  | 'generateReports'
  | 'exportData'
  | 'manageRooms'
  | 'manageStaff'
  | 'manageSubscription';

// ============================================================
// Billing Durations & Discount Models
// ============================================================

export type BillingDurationMonths = 1 | 3 | 6 | 12;

export interface BillingPeriodConfig {
  months: BillingDurationMonths;
  label: string;
  discountPercent: number; // e.g. 0, 5, 10, 15
  badge?: string;
  description?: string;
}

export interface PlanPricingBreakdown {
  planId: SubscriptionPlan;
  planName: string;
  durationMonths: BillingDurationMonths;
  baseMonthlyPrice: number;
  baseTotal: number;
  durationDiscountPercent: number;
  durationDiscountAmount: number;
  subtotal: number;
  couponDiscountAmount: number;
  appliedCreditsAmount: number;
  taxAmount: number;
  finalPayableAmount: number;
  totalSavings: number;
}

// ============================================================
// Coupon Models
// ============================================================

export type CouponDiscountType = 'percentage' | 'fixed';

export interface CouponDefinition {
  id: string;
  code: string;
  discount_type: CouponDiscountType;
  discount_value: number; // e.g. 300 for ₹300 or 15 for 15%
  minimum_amount: number;
  maximum_discount: number | null; // max cap for percentage coupons
  valid_from: string; // ISO date
  valid_until: string; // ISO date
  usage_limit: number | null; // total global redemptions allowed
  used_count: number;
  per_user_limit: number;
  applicable_plan: SubscriptionPlan[] | null; // null means all plans
  applicable_duration: BillingDurationMonths[] | null; // null means all durations
  is_active: boolean;
  description?: string;
}

export interface CouponValidationResult {
  valid: boolean;
  coupon?: CouponDefinition;
  discountAmount: number;
  finalPayableAmount: number;
  errorMessage?: string;
  code?: string;
}

// ============================================================
// Referral & StayMate Credits Ledger Models
// ============================================================

export type ReferralStatus = 'PENDING' | 'SUCCESSFUL' | 'CANCELLED' | 'REVERSED';

export interface ReferralRecord {
  id: string;
  referrerUserId: string;
  referredUserId: string;
  referralCode: string;
  status: ReferralStatus;
  qualifyingTransactionId: string | null;
  rewardAmount: number; // e.g. 100
  friendDiscountAmount: number; // e.g. 100
  createdAt: string; // ISO timestamp
  completedAt: string | null; // ISO timestamp
  referredUserIdentifier?: string; // masked email or business name
}

export type WalletTransactionType = 'CREDIT' | 'DEBIT';
export type WalletTransactionSource =
  | 'REFERRAL_REWARD'
  | 'SUBSCRIPTION_DISCOUNT'
  | 'REVERSAL'
  | 'WELCOME_BONUS'
  | 'MANUAL_ADJUSTMENT';

export interface WalletTransaction {
  id: string;
  walletId: string;
  userId: string;
  type: WalletTransactionType;
  amount: number;
  source: WalletTransactionSource;
  referenceId: string | null;
  description: string;
  createdAt: string; // ISO timestamp
}

export interface UserWallet {
  userId: string;
  balance: number; // in ₹ (StayMate Credits)
  currency: string; // 'INR'
  updatedAt: string;
}

export interface ReferralStats {
  referralCode: string;
  successfulCount: number;
  pendingCount: number;
  totalEarnedCredits: number;
  availableCredits: number;
  history: ReferralRecord[];
  transactions: WalletTransaction[];
}

