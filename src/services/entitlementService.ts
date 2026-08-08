import { useSubscriptionStore } from '@/store/useSubscriptionStore';
import { PLANS } from '@/config/plans';
import { EntitlementMatrix, SubscriptionPlanId } from '@/types/subscription';
import { getMonthlyCheckinCount, getMonthlyExportCount } from '@/database';

export class EntitlementService {
  /**
   * Get the active plan definition and entitlements
   */
  public static getActivePlan() {
    const store = useSubscriptionStore.getState();
    const planId = store.currentPlan || 'FREE';
    return PLANS[planId] || PLANS.FREE;
  }

  /**
   * Check if a boolean feature is enabled for current plan
   */
  public static canUseFeature(feature: keyof EntitlementMatrix): boolean {
    const activePlan = this.getActivePlan();
    const entitlement = activePlan.entitlements[feature];
    return typeof entitlement === 'boolean' ? entitlement : true;
  }

  /**
   * Get a numeric or limit entitlement value
   */
  public static getLimit<K extends keyof EntitlementMatrix>(limitKey: K): EntitlementMatrix[K] {
    const activePlan = this.getActivePlan();
    return activePlan.entitlements[limitKey];
  }

  /**
   * Check if user has at least the required plan
   */
  public static hasPlan(requiredPlan: SubscriptionPlanId): boolean {
    const current = useSubscriptionStore.getState().currentPlan;
    const hierarchy: Record<SubscriptionPlanId, number> = {
      FREE: 1,
      STARTER: 2,
      PROFESSIONAL: 3,
      MULTI_PROPERTY: 4,
      ENTERPRISE: 5,
    };
    return (hierarchy[current] || 1) >= (hierarchy[requiredPlan] || 1);
  }

  /**
   * Check check-in limit allowance
   */
  public static async canPerformCheckin(propertyId: string): Promise<{ allowed: boolean; count: number; limit: number | 'unlimited' }> {
    const activePlan = this.getActivePlan();
    const limit = activePlan.entitlements.monthlyCheckInLimit;
    
    if (limit === 'unlimited') {
      return { allowed: true, count: 0, limit: 'unlimited' };
    }

    const currentCount = await getMonthlyCheckinCount(propertyId);
    return {
      allowed: currentCount < limit,
      count: currentCount,
      limit,
    };
  }

  /**
   * Check export limit allowance
   */
  public static async canPerformExport(propertyId: string): Promise<{ allowed: boolean; count: number; limit: number }> {
    const activePlan = this.getActivePlan();
    if (activePlan.entitlements.unlimitedExports) {
      return { allowed: true, count: 0, limit: 999999 };
    }

    const freeExportLimit = 5;
    const currentCount = await getMonthlyExportCount(propertyId);
    return {
      allowed: currentCount < freeExportLimit,
      count: currentCount,
      limit: freeExportLimit,
    };
  }

  /**
   * Check room limit allowance
   */
  public static canAddRoom(currentRoomCount: number): { allowed: boolean; currentCount: number; maxRooms: number } {
    const activePlan = this.getActivePlan();
    const maxRooms = activePlan.entitlements.maxRoomsPerProperty;
    return {
      allowed: currentRoomCount < maxRooms,
      currentCount: currentRoomCount,
      maxRooms,
    };
  }
}
