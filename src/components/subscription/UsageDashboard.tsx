import React from 'react';
import { View, Text } from 'react-native';
import { GlassCard } from '@/components/GlassCard';
import { BarChart3, DoorOpen, ScanLine, Download } from 'lucide-react-native';
import { useSubscriptionStore } from '@/store/useSubscriptionStore';
import { getLimit, getRemainingUsage, canUseFeature } from '@/services/entitlementService';
import { formatLimit } from '@/config/plans';

interface UsageBarProps {
  label: string;
  icon: React.ReactNode;
  used: number;
  limit: number; // -1 = unlimited
  color: string;
}

function UsageBar({ label, icon, used, limit, color }: UsageBarProps) {
  const isUnlimited = limit === -1;
  const percentage = isUnlimited ? 0 : limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
  const isNearLimit = !isUnlimited && percentage >= 80;
  const isAtLimit = !isUnlimited && used >= limit;

  return (
    <View className="mb-4">
      <View className="flex-row items-center justify-between mb-1.5">
        <View className="flex-row items-center">
          {icon}
          <Text className="text-sm font-semibold text-slate-700 ml-2">{label}</Text>
        </View>
        <Text className={`text-xs font-bold ${isAtLimit ? 'text-red-500' : isNearLimit ? 'text-amber-500' : 'text-slate-500'}`}>
          {isUnlimited ? `${used} used` : `${used} / ${formatLimit(limit)}`}
        </Text>
      </View>
      {!isUnlimited && (
        <View className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <View
            className="h-full rounded-full"
            style={{
              width: `${Math.max(2, percentage)}%`,
              backgroundColor: isAtLimit ? '#EF4444' : isNearLimit ? '#F59E0B' : color,
            }}
          />
        </View>
      )}
      {isUnlimited && (
        <View className="h-2 bg-emerald-100 rounded-full overflow-hidden">
          <View className="h-full bg-emerald-400 rounded-full" style={{ width: '100%' }} />
        </View>
      )}
    </View>
  );
}

/**
 * Usage dashboard widget for the Settings screen.
 * Shows current month's usage across check-ins, exports, OCR, and rooms.
 */
export function UsageDashboard() {
  const { usage } = useSubscriptionStore();

  const checkInLimit = getLimit('monthlyCheckInLimit');
  const exportLimit = getLimit('monthlyExportLimit');
  const roomLimit = getLimit('maxRoomsPerProperty');
  const hasOcr = canUseFeature('ocrScanning');

  const monthName = new Date(usage.year, usage.month - 1).toLocaleString('en', { month: 'long' });

  return (
    <GlassCard className="p-4 mb-4">
      <View className="flex-row items-center mb-3">
        <BarChart3 size={18} color="#8B5CF6" />
        <Text className="text-sm font-bold text-slate-800 ml-2">
          Usage — {monthName} {usage.year}
        </Text>
      </View>

      <UsageBar
        label="Check-ins"
        icon={<ScanLine size={14} color="#0EA5E9" />}
        used={usage.checkInCount}
        limit={checkInLimit}
        color="#0EA5E9"
      />

      <UsageBar
        label="Exports"
        icon={<Download size={14} color="#8B5CF6" />}
        used={usage.exportCount}
        limit={exportLimit}
        color="#8B5CF6"
      />

      <View className="flex-row items-center justify-between mt-1">
        <View className="flex-row items-center">
          <ScanLine size={14} color={hasOcr ? '#10B981' : '#94A3B8'} />
          <Text className="text-sm text-slate-600 ml-2">OCR Scanning</Text>
        </View>
        <View className={`px-2 py-0.5 rounded-full ${hasOcr ? 'bg-emerald-100' : 'bg-slate-100'}`}>
          <Text className={`text-xs font-bold ${hasOcr ? 'text-emerald-700' : 'text-slate-500'}`}>
            {hasOcr ? 'Active' : 'Locked'}
          </Text>
        </View>
      </View>
    </GlassCard>
  );
}
