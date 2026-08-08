export type SubscriptionPlanId = 'FREE' | 'STARTER' | 'PROFESSIONAL' | 'MULTI_PROPERTY' | 'ENTERPRISE';

export type SubscriptionStatus = 'active' | 'trialing' | 'past_due' | 'cancelled' | 'expired' | 'paused';

export type BillingCycle = 'monthly' | 'yearly';

export interface EntitlementMatrix {
  maxProperties: number;
  maxRoomsPerProperty: number;
  monthlyCheckInLimit: number | 'unlimited';
  unlimitedCheckIns: boolean;
  qrCheckIn: boolean;
  offlineMode: boolean;
  basicReports: boolean;
  advancedReports: boolean;
  pdfExport: boolean;
  csvExport: boolean;
  unlimitedExports: boolean;
  ocrScanning: boolean;
  staffAccounts: boolean;
  backups: boolean;
  restore: boolean;
  multiProperty: boolean;
  centralizedDashboard: boolean;
  rolePermissions: boolean;
  apiAccess: boolean;
  prioritySupport: boolean;
}

export interface PlanDefinition {
  id: SubscriptionPlanId;
  name: string;
  monthlyPrice: number; // In INR ₹
  yearlyPrice: number;  // In INR ₹
  suitableFor: string;
  popular?: boolean;
  features: string[];
  entitlements: EntitlementMatrix;
}

export interface SubscriptionState {
  currentPlan: SubscriptionPlanId;
  status: SubscriptionStatus;
  billingCycle: BillingCycle;
  trialStart: string | null;
  trialEnd: string | null;
  subscriptionStart: string | null;
  renewalDate: string | null;
  paymentProvider: 'razorpay' | 'stripe' | 'manual' | 'none';
  externalSubscriptionId: string | null;
  lastVerifiedAt: string | null;
}

export interface SubscriptionUsage {
  propertyId: string;
  yearMonth: string; // 'YYYY-MM'
  checkinCount: number;
  exportCount: number;
  ocrCount: number;
}

export interface PaymentEvent {
  id: string;
  subscriptionId: string;
  amount: number;
  currency: string;
  status: 'success' | 'failed' | 'refunded' | 'pending';
  provider: string;
  timestamp: string;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: 'SUPER_ADMIN' | 'ADMIN';
  createdAt: string;
}
