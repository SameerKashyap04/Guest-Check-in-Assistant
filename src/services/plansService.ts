// ============================================================
// StayMate — Client Dynamic Plans Service
// ============================================================
//
// Fetches the live Plan & Pricing Matrix configured in the Admin Panel
// (/api/plans) so Recommended badges, prices, and limits update dynamically.
// Seamlessly falls back to local definitions if offline.
//

import { DEVIFY_CONFIG } from '@/config/devify';
import { SubscriptionPlan } from '@/types/subscription';

export interface ClientDisplayPlan {
  id: SubscriptionPlan;
  name: string;
  description?: string;
  basePriceM: number | null;
  yearlyPrice?: number;
  rooms: string;
  checkins: string;
  ocr: boolean;
  cloud: boolean;
  backup?: boolean;
  support?: boolean;
  isRecommended: boolean;
  tag: string | null;
  isActive?: boolean;
}

export const DEFAULT_DISPLAY_PLANS: ClientDisplayPlan[] = [
  {
    id: SubscriptionPlan.FREE,
    name: 'Free',
    basePriceM: 0,
    rooms: '2 rooms',
    checkins: '15 check-ins / mo',
    ocr: false,
    cloud: false,
    isRecommended: false,
    tag: null,
  },
  {
    id: SubscriptionPlan.STARTER,
    name: 'Starter',
    basePriceM: 349,
    rooms: '8 rooms',
    checkins: '100 check-ins / mo',
    ocr: true,
    cloud: false,
    isRecommended: false,
    tag: null,
  },
  {
    id: SubscriptionPlan.PROFESSIONAL,
    name: 'Professional',
    basePriceM: 799,
    rooms: '25 rooms',
    checkins: 'Unlimited check-ins',
    ocr: true,
    cloud: true,
    isRecommended: true,
    tag: 'Most popular',
  },
  {
    id: SubscriptionPlan.MULTI_PROPERTY,
    name: 'Multi-Property',
    basePriceM: 1999,
    rooms: 'Unlimited rooms · 10 properties',
    checkins: 'Unlimited check-ins',
    ocr: true,
    cloud: true,
    isRecommended: false,
    tag: null,
  },
  {
    id: SubscriptionPlan.ENTERPRISE,
    name: 'Enterprise',
    basePriceM: null,
    rooms: 'Unlimited everything',
    checkins: 'Dedicated support',
    ocr: true,
    cloud: true,
    isRecommended: false,
    tag: null,
  },
];

let _isFreeTierDisabled = false;

export function isFreeTierDisabledGlobal(): boolean {
  return _isFreeTierDisabled;
}

class PlansService {
  private candidateUrls = Array.from(
    new Set([
      DEVIFY_CONFIG.ADMIN_API_URL || 'https://admin-guest-check-in-assistant.vercel.app',
    ])
  );

  async fetchLivePlans(): Promise<ClientDisplayPlan[]> {
    for (const baseUrl of this.candidateUrls) {
      const cleanUrl = baseUrl.replace(/\/$/, '');
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);

        const res = await fetch(`${cleanUrl}/api/plans`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (res.ok) {
          const data = await res.json();
          _isFreeTierDisabled = Boolean(data?.freeTierDisabled);

          if (data && Array.isArray(data.plans) && data.plans.length > 0) {
            let mapped: ClientDisplayPlan[] = data.plans
              .filter((p: any) => p.isActive !== false && p.disabled !== true)
              .map((p: any) => {
                const planId = (p.id || '').toUpperCase() as SubscriptionPlan;
                const isRec = Boolean(p.isRecommended);
                return {
                  id: planId,
                  name: p.name || planId,
                  description: p.description,
                  basePriceM: typeof p.monthlyPrice === 'number' ? p.monthlyPrice : 0,
                  yearlyPrice: p.yearlyPrice,
                  rooms: p.maxRooms ? `${p.maxRooms} rooms` : '2 rooms',
                  checkins: p.maxCheckIns ? `${p.maxCheckIns} check-ins` : 'Unlimited check-ins',
                  ocr: Boolean(p.ocrScanning),
                  cloud: Boolean(p.cloudSync),
                  backup: Boolean(p.backupRestore),
                  support: Boolean(p.prioritySupport),
                  isRecommended: isRec,
                  tag: isRec ? 'Most popular' : null,
                  isActive: p.isActive !== false,
                };
              });

            if (_isFreeTierDisabled) {
              mapped = mapped.filter((m) => m.id !== SubscriptionPlan.FREE);
            }

            if (!mapped.some((m) => m.id === SubscriptionPlan.ENTERPRISE)) {
              mapped.push({
                id: SubscriptionPlan.ENTERPRISE,
                name: 'Enterprise',
                basePriceM: null,
                rooms: 'Unlimited everything',
                checkins: 'Dedicated support',
                ocr: true,
                cloud: true,
                isRecommended: false,
                tag: null,
              });
            }

            return mapped;
          }
        }
      } catch {
        // Fallback gracefully to default list
      }
    }

    return _isFreeTierDisabled 
      ? DEFAULT_DISPLAY_PLANS.filter((p) => p.id !== SubscriptionPlan.FREE)
      : DEFAULT_DISPLAY_PLANS;
  }
}

export const plansService = new PlansService();

