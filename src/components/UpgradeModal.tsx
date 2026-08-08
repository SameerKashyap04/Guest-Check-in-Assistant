import React from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { GlassCard } from '@/components/GlassCard';
import { Button } from '@/components/Button';
import { Sparkles, CheckCircle2, ShieldCheck, X, Zap, ArrowRight, Lock } from 'lucide-react-native';
import { useRouter } from 'expo-router';

export interface UpgradeModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  featureName?: string;
  recommendedPlan?: string;
}

export function UpgradeModal({
  visible,
  onClose,
  title = 'Unlock Premium Features',
  subtitle = 'Upgrade your plan to unlock high-speed OCR document scanning, unlimited check-ins, and authority PDF/CSV report exports.',
  featureName = 'Camera OCR Scanning',
  recommendedPlan = 'Starter Plan (₹299/mo)',
}: UpgradeModalProps) {
  const router = useRouter();

  const handleUpgradePress = () => {
    onClose();
    router.push('/subscription/pricing' as any);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/70 justify-center items-center p-4">
        <GlassCard className="w-full max-w-md p-6 rounded-3xl border border-primary/30 relative">
          {/* Close button */}
          <TouchableOpacity
            onPress={onClose}
            className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-slate-800/80 justify-center items-center border border-white/10"
          >
            <X size={18} color="#94A3B8" />
          </TouchableOpacity>

          <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
            {/* Header Icon */}
            <View className="items-center mt-2 mb-4">
              <View className="w-16 h-16 rounded-2xl bg-primary/20 border border-primary/40 justify-center items-center mb-3">
                <Sparkles size={32} color="#208AEF" />
              </View>
              <View className="bg-primary/15 px-3 py-1 rounded-full border border-primary/30 mb-2">
                <Text className="text-primary text-xs font-semibold uppercase tracking-wider">
                  {recommendedPlan}
                </Text>
              </View>
              <Text className="text-white text-xl font-bold text-center leading-tight">
                {title}
              </Text>
              <Text className="text-slate-400 text-xs text-center mt-1 px-2">
                {subtitle}
              </Text>
            </View>

            {/* Feature Highlights */}
            <View className="bg-slate-900/60 rounded-2xl p-4 mb-5 border border-slate-800">
              <Text className="text-slate-300 font-semibold text-xs mb-3 uppercase tracking-wider">
                Included in Upgrade
              </Text>
              <View className="space-y-2.5">
                <View className="flex-row items-center space-x-2.5">
                  <CheckCircle2 size={16} color="#10B981" />
                  <Text className="text-slate-200 text-xs flex-1">
                    Automatic Indian ID OCR & Data Parsing (Aadhaar, PAN, DL, Passport)
                  </Text>
                </View>

                <View className="flex-row items-center space-x-2.5">
                  <CheckCircle2 size={16} color="#10B981" />
                  <Text className="text-slate-200 text-xs flex-1">
                    Unlimited Guest Check-ins & Occupancy Management
                  </Text>
                </View>

                <View className="flex-row items-center space-x-2.5">
                  <CheckCircle2 size={16} color="#10B981" />
                  <Text className="text-slate-200 text-xs flex-1">
                    One-click PDF & CSV Guest Registers for Police/Tourism Audits
                  </Text>
                </View>

                <View className="flex-row items-center space-x-2.5">
                  <CheckCircle2 size={16} color="#10B981" />
                  <Text className="text-slate-200 text-xs flex-1">
                    Offline-first encryption & local data protection
                  </Text>
                </View>
              </View>
            </View>

            {/* Trust badge */}
            <View className="flex-row items-center justify-center space-x-1.5 mb-5">
              <ShieldCheck size={14} color="#64748B" />
              <Text className="text-slate-400 text-[11px]">
                Cancel anytime • DPDP Act Compliant Privacy
              </Text>
            </View>

            {/* CTA Buttons */}
            <View className="space-y-2.5">
              <Button
                label="View Plans & Upgrade"
                icon={<ArrowRight size={16} color="#FFFFFF" className="ml-1" />}
                variant="primary"
                onPress={handleUpgradePress}
                className="w-full flex-row justify-center items-center"
              />

              <TouchableOpacity
                onPress={onClose}
                className="py-2.5 items-center"
              >
                <Text className="text-slate-400 text-xs font-medium">Maybe Later</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </GlassCard>
      </View>
    </Modal>
  );
}
