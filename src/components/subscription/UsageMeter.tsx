import React from 'react';
import { View, Text } from 'react-native';

interface UsageMeterProps {
  label: string;
  current: number;
  limit: number | 'unlimited';
  unit?: string;
}

export const UsageMeter: React.FC<UsageMeterProps> = ({
  label,
  current,
  limit,
  unit = '',
}) => {
  const isUnlimited = limit === 'unlimited';
  const percentage = isUnlimited ? 0 : Math.min(100, Math.round((current / limit) * 100));

  let barColor = 'bg-emerald-500';
  if (percentage > 85) barColor = 'bg-red-500';
  else if (percentage > 60) barColor = 'bg-amber-500';

  return (
    <View className="bg-slate-800/80 rounded-xl p-3 border border-slate-700/50 mb-3">
      <View className="flex-row justify-between items-center mb-2">
        <Text className="text-slate-300 text-sm font-medium">{label}</Text>
        <Text className="text-slate-100 text-sm font-semibold">
          {current} {isUnlimited ? '/ Unlimited' : `/ ${limit}`} {unit}
        </Text>
      </View>

      {!isUnlimited && (
        <View className="w-full bg-slate-700/70 h-2 rounded-full overflow-hidden">
          <View className={`h-full ${barColor} rounded-full`} style={{ width: `${percentage}%` }} />
        </View>
      )}

      {isUnlimited && (
        <View className="flex-row items-center space-x-1">
          <Text className="text-emerald-400 text-xs font-semibold">✓ Unlimited access on your plan</Text>
        </View>
      )}
    </View>
  );
};
