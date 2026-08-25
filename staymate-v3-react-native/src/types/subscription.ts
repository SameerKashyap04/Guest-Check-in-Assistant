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
// Billing Durations & Discounts
// ============================================================

export type BillingDurationMonths = 1 | 3 | 6 | 12;

export interface BillingPeriodConfig {
  months: BillingDurationMonths;
  label: string;
  discountPercent: number;
  badge?: string;
}

export interface PlanPricingBreakdown {
  planId: SubscriptionPlan;
  durationMonths: BillingDurationMonths;
  baseMonthlyPrice: number;
  baseTotal: number;
  durationDiscountPercent: number;
  durationDiscountAmount: number;
  subtotal: number;
  couponDiscountAmount: number;
  appliedCreditsAmount: number;
  finalPayableAmount: number;
  totalSavings: number;
}

// ============================================================
// Coupons
// ============================================================

export type CouponDiscountType = 'percentage' | 'fixed';

export interface CouponDefinition {
  code: string;
  type: CouponDiscountType;
  value: number;
  minAmount?: number;
  maxDiscount?: number;
  validUntil?: string;
  applicablePlans?: SubscriptionPlan[];
  applicableDurations?: BillingDurationMonths[];
  isActive: boolean;
  description?: string;
  usageLimit?: number;
  usedCount?: number;
}

export interface CouponValidationResult {
  valid: boolean;
  code?: string;
  discountType?: CouponDiscountType;
  discountValue?: number;
  discountAmount: number;
  finalAmount: number;
  errorMessage?: string;
}

// ============================================================
// Referrals & StayMate Credits Ledger
// ============================================================

export type ReferralStatus = 'PENDING' | 'SUCCESSFUL' | 'CANCELLED' | 'REVERSED';

export interface ReferralRecord {
  id: string;
  referrerUserId: string;
  referredUserId: string;
  referredUserIdentifier?: string;
  referralCode: string;
  status: ReferralStatus;
  createdAt: string;
  rewardPaidAt?: string | null;
  qualifyingOrderId?: string | null;
  rewardAmount: number;
}

export type WalletTransactionType = 'CREDIT' | 'DEBIT' | 'REVERSAL';

export interface WalletTransaction {
  id: string;
  userId: string;
  type: WalletTransactionType;
  amount: number;
  balanceAfter: number;
  description: string;
  referenceId?: string;
  createdAt: string;
}

export interface UserWallet {
  userId: string;
  availableCredits: number;
  lifetimeEarnedCredits: number;
  lifetimeSpentCredits: number;
  referralCode: string;
  updatedAt: string;
}

export interface ReferralStats {
  referralCode: string;
  shareUrl: string;
  successfulReferralsCount: number;
  pendingReferralsCount: number;
  totalEarnedCredits: number;
  availableCredits: number;
  referralRewardAmount: number;
  friendDiscountAmount: number;
  history: ReferralRecord[];
  transactions: WalletTransaction[];
}

