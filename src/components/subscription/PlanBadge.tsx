import React from 'react';
import { View, Text } from 'react-native';
import { SubscriptionPlan, SubscriptionStatus } from '@/types/subscription';
import { PLANS } from '@/config/plans';
import { Crown, Zap, Star, Building2 } from 'lucide-react-native';

interface PlanBadgeProps {
  plan: SubscriptionPlan;
  status?: SubscriptionStatus;
  /** Whether to show the full plan name or just the icon */
  compact?: boolean;
}

const BADGE_CONFIG: Record<string, { bgClass: string; textClass: string; color: string }> = {
  [SubscriptionPlan.FREE]: { bgClass: 'bg-slate-100', textClass: 'text-slate-600', color: '#64748B' },
  [SubscriptionPlan.STARTER]: { bgClass: 'bg-amber-100', textClass: 'text-amber-700', color: '#F59E0B' },
  [SubscriptionPlan.PROFESSIONAL]: { bgClass: 'bg-violet-100', textClass: 'text-violet-700', color: '#8B5CF6' },
  [SubscriptionPlan.MULTI_PROPERTY]: { bgClass: 'bg-sky-100', textClass: 'text-sky-700', color: '#0EA5E9' },
  [SubscriptionPlan.ENTERPRISE]: { bgClass: 'bg-rose-100', textClass: 'text-rose-700', color: '#F43F5E' },
};

const BADGE_ICONS: Record<string, (color: string) => React.ReactNode> = {
  [SubscriptionPlan.FREE]: (c) => <Zap size={12} color={c} />,
  [SubscriptionPlan.STARTER]: (c) => <Star size={12} color={c} />,
  [SubscriptionPlan.PROFESSIONAL]: (c) => <Crown size={12} color={c} />,
  [SubscriptionPlan.MULTI_PROPERTY]: (c) => <Building2 size={12} color={c} />,
  [SubscriptionPlan.ENTERPRISE]: (c) => <Crown size={12} color={c} />,
};

/**
 * Small badge showing the current subscription plan.
 * Used in settings, dashboard, and headers.
 */
export function PlanBadge({ plan, status, compact = false }: PlanBadgeProps) {
  const config = BADGE_CONFIG[plan] || BADGE_CONFIG[SubscriptionPlan.FREE];
  const planDef = PLANS[plan];
  const icon = BADGE_ICONS[plan]?.(config.color);
  const isTrialing = status === SubscriptionStatus.TRIALING;

  if (compact) {
    return (
      <View className={`${config.bgClass} px-2 py-0.5 rounded-full flex-row items-center`}>
        {icon}
      </View>
    );
  }

  return (
    <View className={`${config.bgClass} px-3 py-1 rounded-full flex-row items-center`}>
      {icon}
      <Text className={`${config.textClass} text-xs font-bold ml-1`}>
        {planDef.name}
        {isTrialing ? ' (Trial)' : ''}
      </Text>
    </View>
  );
}
