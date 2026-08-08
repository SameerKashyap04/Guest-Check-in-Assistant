export type SubscriptionTier = 'free' | 'starter' | 'professional' | 'multi_property' | 'enterprise';

export type BillingCycle = 'monthly' | 'annual';

export interface PlanFeature {
  text: string;
  included: boolean;
  highlight?: boolean;
}

export interface PlanDefinition {
  id: SubscriptionTier;
  name: string;
  monthlyPrice: number; // in INR ₹
  annualPrice: number;  // in INR ₹ (includes ~2 months free)
  badge?: string;
  description: string;
  maxProperties: number;
  maxRooms: number;
  maxCheckinsPerMonth: number | 'unlimited';
  includesOCR: boolean;
  includesPDFCSVExports: boolean;
  includesStaffAccounts: boolean;
  includesMultiProperty: boolean;
  includesBackups: boolean;
  includesPrioritySupport: boolean;
  features: PlanFeature[];
}

export interface SubscriptionState {
  activeTier: SubscriptionTier;
  billingCycle: BillingCycle;
  monthlyCheckinsCount: number;
  lastResetMonthYear: string; // "YYYY-MM" format
  isTrialActive: boolean;
  trialEndsAt: string | null;
  subscribedAt: string | null;
}

export const SUBSCRIPTION_PLANS: Record<SubscriptionTier, PlanDefinition> = {
  free: {
    id: 'free',
    name: 'Free',
    monthlyPrice: 0,
    annualPrice: 0,
    description: 'Trial users and very small properties',
    maxProperties: 1,
    maxRooms: 5,
    maxCheckinsPerMonth: 20,
    includesOCR: false,
    includesPDFCSVExports: false,
    includesStaffAccounts: false,
    includesMultiProperty: false,
    includesBackups: false,
    includesPrioritySupport: false,
    features: [
      { text: '1 Property & 5 Rooms', included: true },
      { text: 'Up to 20 check-ins / month', included: true },
      { text: 'Free QR Self Check-in link', included: true },
      { text: 'Basic guest records & search', included: true },
      { text: 'Offline data entry', included: true },
      { text: 'Camera OCR document scan', included: false },
      { text: 'PDF / CSV Report exports', included: false },
      { text: 'Staff accounts & permissions', included: false },
    ],
  },
  starter: {
    id: 'starter',
    name: 'Starter',
    monthlyPrice: 299,
    annualPrice: 2999,
    badge: 'Popular for Homestays',
    description: 'Small homestays & guest houses',
    maxProperties: 1,
    maxRooms: 10,
    maxCheckinsPerMonth: 'unlimited',
    includesOCR: true,
    includesPDFCSVExports: true,
    includesStaffAccounts: false,
    includesMultiProperty: false,
    includesBackups: true,
    includesPrioritySupport: false,
    features: [
      { text: '1 Property & 10 Rooms', included: true },
      { text: 'Unlimited guest check-ins', included: true, highlight: true },
      { text: 'Camera OCR document scanning', included: true, highlight: true },
      { text: 'Offline mode & automatic backup', included: true },
      { text: 'PDF & CSV report exports', included: true },
      { text: 'Free QR Self Check-in link', included: true },
      { text: 'Multiple staff logins', included: false },
      { text: 'Multi-property management', included: false },
    ],
  },
  professional: {
    id: 'professional',
    name: 'Professional',
    monthlyPrice: 799,
    annualPrice: 7999,
    badge: 'Best Value for Hotels',
    description: 'Hotels, resorts, and busy lodges',
    maxProperties: 1,
    maxRooms: 30,
    maxCheckinsPerMonth: 'unlimited',
    includesOCR: true,
    includesPDFCSVExports: true,
    includesStaffAccounts: true,
    includesMultiProperty: false,
    includesBackups: true,
    includesPrioritySupport: true,
    features: [
      { text: '1 Property & up to 30 Rooms', included: true },
      { text: 'Unlimited check-ins & OCR scan', included: true },
      { text: 'Unlimited PDF/CSV authority reports', included: true },
      { text: 'Multiple staff accounts & PINs', included: true, highlight: true },
      { text: 'Advanced occupancy analytics', included: true },
      { text: 'Priority phone & WhatsApp support', included: true },
      { text: 'Multi-property management', included: false },
    ],
  },
  multi_property: {
    id: 'multi_property',
    name: 'Multi-Property',
    monthlyPrice: 1999,
    annualPrice: 19999,
    badge: 'For Property Managers',
    description: 'Property managers operating multiple homestays',
    maxProperties: 10,
    maxRooms: 150,
    maxCheckinsPerMonth: 'unlimited',
    includesOCR: true,
    includesPDFCSVExports: true,
    includesStaffAccounts: true,
    includesMultiProperty: true,
    includesBackups: true,
    includesPrioritySupport: true,
    features: [
      { text: 'Up to 10 Properties & 150 Rooms', included: true, highlight: true },
      { text: 'Centralized property dashboard', included: true },
      { text: 'Unlimited check-ins & OCR scanning', included: true },
      { text: 'Role-based staff permissions', included: true },
      { text: 'Consolidated revenue & police reports', included: true },
      { text: 'Automated cloud & local backups', included: true },
      { text: 'Dedicated account manager', included: true },
    ],
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    monthlyPrice: 4999,
    annualPrice: 49999,
    badge: 'Custom Integration',
    description: 'Hotel groups, chains, and large resorts',
    maxProperties: 999,
    maxRooms: 9999,
    maxCheckinsPerMonth: 'unlimited',
    includesOCR: true,
    includesPDFCSVExports: true,
    includesStaffAccounts: true,
    includesMultiProperty: true,
    includesBackups: true,
    includesPrioritySupport: true,
    features: [
      { text: 'Unlimited Properties & Rooms', included: true },
      { text: 'Custom PMS & accounting API integration', included: true },
      { text: 'SLA support & custom onboarding', included: true },
      { text: 'Custom identity document workflows', included: true },
      { text: 'On-site staff training', included: true },
    ],
  },
};
