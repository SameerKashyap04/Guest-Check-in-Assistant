import React from 'react';
import { View, Text, Modal, TouchableOpacity, Alert } from 'react-native';
import { GlassCard } from '@/components/GlassCard';
import { Button } from '@/components/Button';
import { Lock, Crown, X } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { PLANS } from '@/config/plans';
import { SubscriptionPlan } from '@/types/subscription';
import { useSubscriptionStore } from '@/store/useSubscriptionStore';

interface UpgradePromptProps {
  visible: boolean;
  onClose: () => void;
  /** Feature name to display to the user */
  featureTitle: string;
  /** Description of what the feature does */
  featureDescription: string;
  /** The minimum plan required for this feature */
  requiredPlan: SubscriptionPlan;
  /** Optional custom CTA label */
  ctaLabel?: string;
}

/**
 * Reusable modal for contextual upgrade prompts.
 * Shows when a user tries to access a feature above their current plan.
 */
export function UpgradePrompt({
  visible,
  onClose,
  featureTitle,
  featureDescription,
  requiredPlan,
  ctaLabel,
}: UpgradePromptProps) {
  const router = useRouter();
  const { currentPlan } = useSubscriptionStore();
  const requiredPlanDef = PLANS[requiredPlan];

  const handleUpgrade = () => {
    onClose();
    router.push('/subscription/pricing');
  };

  return (
    <Modal
      animationType="fade"
      transparent
      visible={visible}
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-center items-center bg-black/50 px-6">
        <GlassCard className="w-full max-w-[400px] bg-white p-6 rounded-3xl">
          {/* Close button */}
          <TouchableOpacity
            onPress={onClose}
            className="absolute right-4 top-4 p-2 bg-slate-100 rounded-full z-10"
          >
            <X size={16} color="#64748B" />
          </TouchableOpacity>

          {/* Icon */}
          <View className="items-center mb-4 mt-2">
            <View className="w-16 h-16 bg-violet-100 rounded-full items-center justify-center mb-3">
              <Lock size={28} color="#8B5CF6" />
            </View>
            <Text className="text-xl font-extrabold text-slate-900 text-center">
              {featureTitle}
            </Text>
          </View>

          {/* Description */}
          <Text className="text-sm text-slate-500 text-center mb-5 leading-5 px-2">
            {featureDescription}
          </Text>

          {/* Plan requirement */}
          <View className="bg-violet-50 rounded-2xl px-4 py-3 mb-5 flex-row items-center">
            <Crown size={18} color="#8B5CF6" />
            <View className="ml-3 flex-1">
              <Text className="text-violet-800 font-bold text-sm">
                Available on {requiredPlanDef.name}
              </Text>
              <Text className="text-violet-600 text-xs mt-0.5">
                ₹{requiredPlanDef.pricing.monthlyPrice}/month
              </Text>
            </View>
          </View>

          {/* CTA */}
          <Button
            label={ctaLabel || `Upgrade to ${requiredPlanDef.name}`}
            variant="primary"
            size="lg"
            className="w-full bg-violet-600 mb-3"
            onPress={handleUpgrade}
          />

          <TouchableOpacity onPress={onClose} className="py-2 items-center">
            <Text className="text-sm text-slate-400 font-semibold">Maybe later</Text>
          </TouchableOpacity>
        </GlassCard>
      </View>
    </Modal>
  );
}
