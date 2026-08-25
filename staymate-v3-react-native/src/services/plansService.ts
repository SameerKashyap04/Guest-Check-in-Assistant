// ============================================================
// StayMate — Client Dynamic Plans Service (SDK 54)
// ============================================================
//
// Fetches the live Plan & Pricing Matrix configured in the Admin Panel
// (/api/plans) so Recommended badges, prices, and limits update dynamically.
// Seamlessly falls back to local definitions if offline.
//

import { DEVIFY_CONFIG } from '../config/devify';
import { SubscriptionPlan } from '../types/subscription';

export interface ClientDisplayPlan {
  id: SubscriptionPlan;
  name: string;
  priceM: number | null;
  priceY: number | null;
  rooms: string;
  checkins: string;
  exports: string;
  ocr: boolean;
  cloud: boolean;
  tag: string;
  isRecommended: boolean;
}

export const DEFAULT_DISPLAY_PLANS: ClientDisplayPlan[] = [
  {
    id: SubscriptionPlan.FREE,
    name: 'Free',
    priceM: 0,
    priceY: 0,
    rooms: '2 rooms',
    checkins: '15 check-ins / mo',
    exports: '3 reports & exports / mo',
    ocr: false,
    cloud: false,
    tag: '',
    isRecommended: false,
  },
  {
    id: SubscriptionPlan.STARTER,
    name: 'Starter',
    priceM: 349,
    priceY: 3499,
    rooms: '8 rooms',
    checkins: '100 check-ins / mo',
    exports: '10 reports & exports / mo',
    ocr: true,
    cloud: false,
    tag: '',
    isRecommended: false,
  },
  {
    id: SubscriptionPlan.PROFESSIONAL,
    name: 'Professional',
    priceM: 799,
    priceY: 7999,
    rooms: '25 rooms',
    checkins: 'Unlimited check-ins',
    exports: 'Unlimited reports & exports',
    ocr: true,
    cloud: true,
    tag: 'Most popular',
    isRecommended: true,
  },
  {
    id: SubscriptionPlan.MULTI_PROPERTY,
    name: 'Multi-Property',
    priceM: 1799,
    priceY: 17999,
    rooms: 'Unlimited rooms · 5 properties',
    checkins: 'Unlimited check-ins',
    exports: 'Unlimited reports & exports',
    ocr: true,
    cloud: true,
    tag: '',
    isRecommended: false,
  },
  {
    id: SubscriptionPlan.ENTERPRISE,
    name: 'Enterprise',
    priceM: null,
    priceY: null,
    rooms: 'Unlimited everything',
    checkins: 'Dedicated support',
    exports: 'Unlimited reports & exports',
    ocr: true,
    cloud: true,
    tag: '',
    isRecommended: false,
  },
];

let _isFreeTierDisabled54 = false;

export function isFreeTierDisabledGlobal(): boolean {
  return _isFreeTierDisabled54;
}

class PlansService {
  private candidateUrls = Array.from(
    new Set([
      DEVIFY_CONFIG.ADMIN_API_URL || 'https://admin-guest-check-in-assistant.vercel.app',
      'http://192.168.31.209:3000',
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
          _isFreeTierDisabled54 = Boolean(data?.freeTierDisabled);

          if (data && Array.isArray(data.plans) && data.plans.length > 0) {
            let mapped: ClientDisplayPlan[] = data.plans
              .filter((p: any) => p.isActive !== false && p.disabled !== true)
              .map((p: any) => {
                const planId = (p.id || '').toUpperCase() as SubscriptionPlan;
                const isRec = Boolean(p.isRecommended);
                return {
                  id: planId,
                  name: p.name || planId,
                  priceM: typeof p.monthlyPrice === 'number' ? p.monthlyPrice : 0,
                  priceY: typeof p.yearlyPrice === 'number' ? p.yearlyPrice : 0,
                  rooms: p.maxRooms ? `${p.maxRooms} rooms` : '2 rooms',
                  checkins: p.maxCheckIns ? `${p.maxCheckIns} check-ins / mo` : 'Unlimited check-ins',
                  exports: p.maxExports ? `${p.maxExports} reports & exports` : 'Unlimited reports & exports',
                  ocr: Boolean(p.ocrScanning),
                  cloud: Boolean(p.cloudSync),
                  isRecommended: isRec,
                  tag: isRec ? 'Most popular' : '',
                };
              });

            if (_isFreeTierDisabled54) {
              mapped = mapped.filter((m) => m.name !== 'Free' && m.id !== SubscriptionPlan.FREE);
            }

            if (!mapped.some((m) => m.name === 'Enterprise' || m.id === SubscriptionPlan.ENTERPRISE)) {
              mapped.push({
                id: SubscriptionPlan.ENTERPRISE,
                name: 'Enterprise',
                priceM: null,
                priceY: null,
                rooms: 'Unlimited everything',
                checkins: 'Dedicated support',
                exports: 'Unlimited reports & exports',
                ocr: true,
                cloud: true,
                tag: '',
                isRecommended: false,
              });
            }

            return mapped;
          }
        }
      } catch {
        // Fallback to default
      }
    }

    return _isFreeTierDisabled54
      ? DEFAULT_DISPLAY_PLANS.filter((p) => p.name !== 'Free' && p.id !== SubscriptionPlan.FREE)
      : DEFAULT_DISPLAY_PLANS;
  }
}

export const plansService = new PlansService();

