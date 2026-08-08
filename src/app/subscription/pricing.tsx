import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, SafeAreaView } from 'react-native';
import { GlassCard } from '@/components/GlassCard';
import { Button } from '@/components/Button';
import { useSubscriptionStore } from '@/store/useSubscriptionStore';
import { SUBSCRIPTION_PLANS, SubscriptionTier, BillingCycle } from '@/types/subscription';
import { ArrowLeft, Check, Sparkles, ShieldCheck, Zap, Star, Building2, HelpCircle, Lock } from 'lucide-react-native';
import { useRouter } from 'expo-router';

export default function PricingScreen() {
  const router = useRouter();
  const { activeTier, billingCycle, setTier, setBillingCycle, isTrialActive, trialEndsAt } = useSubscriptionStore();
  const [selectedCycle, setSelectedCycle] = useState<BillingCycle>(billingCycle);

  const plans = [
    SUBSCRIPTION_PLANS.free,
    SUBSCRIPTION_PLANS.starter,
    SUBSCRIPTION_PLANS.professional,
    SUBSCRIPTION_PLANS.multi_property,
    SUBSCRIPTION_PLANS.enterprise,
  ];

  const handleSelectPlan = (planId: SubscriptionTier) => {
    if (planId === activeTier) {
      Alert.alert('Current Plan', `You are currently on the ${SUBSCRIPTION_PLANS[planId].name} plan.`);
      return;
    }

    if (planId === 'enterprise') {
      Alert.alert(
        'Enterprise Custom Plan',
        'Contact our hospitality solutions team for custom PMS/Accounting integrations, dedicated onboarding, and multi-hotel SLAs.\n\nEmail: enterprise@guestcheckin.in',
        [{ text: 'OK' }]
      );
      return;
    }

    const plan = SUBSCRIPTION_PLANS[planId];
    const price = selectedCycle === 'annual' ? plan.annualPrice : plan.monthlyPrice;
    const periodStr = selectedCycle === 'annual' ? 'year' : 'month';

    Alert.alert(
      `Confirm Upgrade to ${plan.name}`,
      `Would you like to subscribe to the ${plan.name} plan at ₹${price}/${periodStr}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Subscribe Now',
          onPress: () => {
            setTier(planId, selectedCycle);
            Alert.alert(
              '🎉 Plan Upgraded Successfully!',
              `Welcome to the ${plan.name} plan! All features and limits have been unlocked immediately.`
            );
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-950">
      {/* Header */}
      <View className="px-4 py-3 flex-row items-center justify-between border-b border-slate-800">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-10 h-10 rounded-full bg-slate-900 justify-center items-center border border-slate-800"
        >
          <ArrowLeft size={20} color="#94A3B8" />
        </TouchableOpacity>
        <Text className="text-white font-bold text-lg">Subscription Plans</Text>
        <View className="w-10" />
      </View>

      <ScrollView className="flex-1 px-4 py-4" showsVerticalScrollIndicator={false}>
        {/* Banner */}
        <GlassCard className="p-4 rounded-2xl mb-5 border border-amber-500/30 bg-amber-500/10">
          <View className="flex-row items-start space-x-3">
            <View className="w-8 h-8 rounded-xl bg-amber-500/20 justify-center items-center mt-0.5">
              <Sparkles size={18} color="#F59E0B" />
            </View>
            <View className="flex-1">
              <Text className="text-amber-400 font-bold text-sm">
                Launch Special • First 100 Properties
              </Text>
              <Text className="text-slate-300 text-xs mt-1 leading-relaxed">
                Get <Text className="font-bold text-amber-300">30 days free full trial</Text> + introductory pricing starting at just <Text className="font-bold text-white">₹199/month</Text> for 3 months with price lock.
              </Text>
            </View>
          </View>
        </GlassCard>

        {/* Monthly / Annual Cycle Toggle */}
        <View className="bg-slate-900/90 p-1.5 rounded-2xl flex-row items-center mb-6 border border-slate-800">
          <TouchableOpacity
            onPress={() => setSelectedCycle('monthly')}
            className={`flex-1 py-2.5 rounded-xl items-center ${selectedCycle === 'monthly' ? 'bg-primary' : 'bg-transparent'}`}
          >
            <Text className={`text-xs font-semibold ${selectedCycle === 'monthly' ? 'text-white' : 'text-slate-400'}`}>
              Monthly Billing
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setSelectedCycle('annual')}
            className={`flex-1 py-2.5 rounded-xl items-center flex-row justify-center space-x-1 ${selectedCycle === 'annual' ? 'bg-primary' : 'bg-transparent'}`}
          >
            <Text className={`text-xs font-semibold ${selectedCycle === 'annual' ? 'text-white' : 'text-slate-400'}`}>
              Annual Billing
            </Text>
            <View className="bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-500/40">
              <Text className="text-emerald-400 text-[10px] font-bold">2 MONTHS FREE</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Pricing Cards */}
        <View className="space-y-4 mb-6">
          {plans.map((plan) => {
            const isCurrent = activeTier === plan.id;
            const price = selectedCycle === 'annual' ? plan.annualPrice : plan.monthlyPrice;
            const periodLabel = selectedCycle === 'annual' ? '/yr' : '/mo';

            return (
              <GlassCard
                key={plan.id}
                className={`p-5 rounded-3xl border relative ${
                  isCurrent
                    ? 'border-emerald-500/60 bg-emerald-500/5'
                    : plan.badge
                    ? 'border-primary/50 bg-slate-900/60'
                    : 'border-slate-800 bg-slate-900/40'
                }`}
              >
                {/* Badge header */}
                {plan.badge && (
                  <View className="absolute -top-3 right-6 bg-primary px-3 py-0.5 rounded-full">
                    <Text className="text-white font-bold text-[10px] uppercase tracking-wider">
                      {plan.badge}
                    </Text>
                  </View>
                )}

                {isCurrent && (
                  <View className="absolute -top-3 right-6 bg-emerald-500 px-3 py-0.5 rounded-full">
                    <Text className="text-white font-bold text-[10px] uppercase tracking-wider">
                      ACTIVE PLAN
                    </Text>
                  </View>
                )}

                <View className="flex-row justify-between items-start mb-2">
                  <View>
                    <Text className="text-white font-bold text-lg">{plan.name}</Text>
                    <Text className="text-slate-400 text-xs">{plan.description}</Text>
                  </View>

                  <View className="items-end">
                    {plan.monthlyPrice === 0 ? (
                      <Text className="text-white font-extrabold text-2xl">FREE</Text>
                    ) : (
                      <View className="flex-row items-baseline">
                        <Text className="text-white font-extrabold text-2xl">₹{price}</Text>
                        <Text className="text-slate-400 text-xs ml-0.5">{periodLabel}</Text>
                      </View>
                    )}
                    {selectedCycle === 'annual' && plan.monthlyPrice > 0 && (
                      <Text className="text-emerald-400 text-[10px] font-medium mt-0.5">
                        Save ₹{plan.monthlyPrice * 12 - plan.annualPrice}/yr
                      </Text>
                    )}
                  </View>
                </View>

                {/* Features List */}
                <View className="my-4 pt-3 border-t border-slate-800 space-y-2">
                  {plan.features.map((feat, idx) => (
                    <View key={idx} className="flex-row items-center space-x-2.5">
                      <Check
                        size={15}
                        color={feat.included ? '#10B981' : '#475569'}
                      />
                      <Text
                        className={`text-xs ${
                          feat.included
                            ? feat.highlight
                              ? 'text-white font-semibold'
                              : 'text-slate-300'
                            : 'text-slate-500 line-through'
                        }`}
                      >
                        {feat.text}
                      </Text>
                    </View>
                  ))}
                </View>

                {/* Action button */}
                <Button
                  label={isCurrent ? 'Current Subscription' : `Select ${plan.name} Plan`}
                  variant={isCurrent ? 'secondary' : plan.badge ? 'primary' : 'outline'}
                  onPress={() => handleSelectPlan(plan.id)}
                  disabled={isCurrent}
                  className="w-full mt-1"
                />
              </GlassCard>
            );
          })}
        </View>

        {/* Privacy & DPDP Compliance Section */}
        <GlassCard className="p-4 rounded-2xl mb-8 border border-slate-800 bg-slate-900/60">
          <View className="flex-row items-center space-x-2 mb-2">
            <ShieldCheck size={18} color="#10B981" />
            <Text className="text-white font-bold text-sm">Privacy & Trust Protection</Text>
          </View>
          <Text className="text-slate-400 text-xs leading-relaxed">
            All guest data is stored with local encryption conforming to India’s <Text className="text-slate-200 font-semibold">Digital Personal Data Protection (DPDP) Act</Text> and UIDAI Aadhaar masking guidelines. Guest identity documents are never sold or used for advertising.
          </Text>
        </GlassCard>
      </ScrollView>
    </SafeAreaView>
  );
}
