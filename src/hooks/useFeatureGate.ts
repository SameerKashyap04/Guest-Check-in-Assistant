import { useSubscriptionStore } from '@/store/useSubscriptionStore';
import { PlanDefinition, SubscriptionTier } from '@/types/subscription';

export interface FeatureGateResult {
  tier: SubscriptionTier;
  plan: PlanDefinition;
  isTrialActive: boolean;
  trialDaysLeft: number;
  checkinsCount: number;
  checkinsRemaining: number | 'unlimited';
  canUseOCR: boolean;
  canExportPDF: boolean;
  canExportCSV: boolean;
  canUseStaffAccounts: boolean;
  canUseMultiProperty: boolean;
  canUseBackups: boolean;
  canAddRoom: (currentRoomCount: number) => boolean;
  canAddProperty: (currentPropertyCount: number) => boolean;
  canRecordCheckin: () => boolean;
  recordCheckin: () => boolean;
}

export function useFeatureGate(): FeatureGateResult {
  const store = useSubscriptionStore();
  const plan = store.getPlan();
  const isTrialActive = store.isTrialActive && !store.isTrialExpired();

  let trialDaysLeft = 0;
  if (isTrialActive && store.trialEndsAt) {
    const diff = new Date(store.trialEndsAt).getTime() - new Date().getTime();
    trialDaysLeft = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }

  const checkinsRemaining = store.getCheckinsRemaining();
  const canRecordCheckin = (): boolean => {
    if (checkinsRemaining === 'unlimited') return true;
    return checkinsRemaining > 0;
  };

  return {
    tier: store.activeTier,
    plan,
    isTrialActive,
    trialDaysLeft,
    checkinsCount: store.monthlyCheckinsCount,
    checkinsRemaining,
    canUseOCR: plan.includesOCR,
    canExportPDF: plan.includesPDFCSVExports,
    canExportCSV: plan.includesPDFCSVExports,
    canUseStaffAccounts: plan.includesStaffAccounts,
    canUseMultiProperty: plan.includesMultiProperty,
    canUseBackups: plan.includesBackups,
    canAddRoom: (count: number) => store.canAddRoom(count),
    canAddProperty: (count: number) => store.canAddProperty(count),
    canRecordCheckin,
    recordCheckin: () => store.recordCheckin(),
  };
}
