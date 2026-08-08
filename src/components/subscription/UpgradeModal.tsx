import React from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Sparkles, CheckCircle2, Lock, X } from 'lucide-react-native';
import { SubscriptionPlanId } from '@/types/subscription';
import { PLANS } from '@/config/plans';

interface UpgradeModalProps {
  visible: boolean;
  onClose: () => void;
  featureName: string;
  description: string;
  requiredPlan: SubscriptionPlanId;
}

export const UpgradeModal: React.FC<UpgradeModalProps> = ({
  visible,
  onClose,
  featureName,
  description,
  requiredPlan,
}) => {
  const router = useRouter();
  const targetPlan = PLANS[requiredPlan] || PLANS.PROFESSIONAL;

  const handleUpgrade = () => {
    onClose();
    router.push('/subscription/pricing');
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-black/60 justify-end md:justify-center items-center p-4">
        <View className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl">
          {/* Header */}
          <View className="flex-row justify-between items-center mb-4">
            <View className="flex-row items-center space-x-2 bg-amber-500/10 px-3 py-1.5 rounded-full border border-amber-500/30">
              <Sparkles size={16} color="#F59E0B" />
              <Text className="text-amber-400 font-semibold text-xs uppercase tracking-wider">
                Unlock {targetPlan.name} Feature
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} className="p-2 rounded-full bg-slate-800">
              <X size={18} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          {/* Title & Description */}
          <View className="items-center my-3">
            <View className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500/20 to-blue-500/20 items-center justify-center mb-3 border border-amber-500/30">
              <Lock size={32} color="#F59E0B" />
            </View>
            <Text className="text-2xl font-bold text-white text-center mb-2">{featureName}</Text>
            <Text className="text-slate-400 text-center text-sm leading-relaxed px-2">
              {description}
            </Text>
          </View>

          {/* Key Plan Highlights */}
          <View className="bg-slate-800/60 rounded-2xl p-4 my-4 border border-slate-700/50">
            <Text className="text-xs font-semibold text-slate-300 mb-3 uppercase tracking-wider">
              Included in {targetPlan.name} Plan (₹{targetPlan.monthlyPrice}/mo):
            </Text>
            <ScrollView className="max-h-36">
              {targetPlan.features.map((item, idx) => (
                <View key={idx} className="flex-row items-center space-x-2 mb-2">
                  <CheckCircle2 size={16} color="#10B981" />
                  <Text className="text-slate-200 text-sm">{item}</Text>
                </View>
              ))}
            </ScrollView>
          </View>

          {/* Action CTAs */}
          <TouchableOpacity
            onPress={handleUpgrade}
            className="w-full bg-amber-500 hover:bg-amber-600 py-4 rounded-xl items-center justify-center shadow-lg shadow-amber-500/20 mb-3"
          >
            <Text className="text-slate-950 font-bold text-base">
              Upgrade to {targetPlan.name}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={onClose} className="w-full py-2 items-center">
            <Text className="text-slate-400 text-xs font-medium">Continue with limits</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};
