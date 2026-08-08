import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { Check, Sparkles, ShieldCheck, ArrowLeft, Zap } from 'lucide-react-native';
import { PLANS, LAUNCH_OFFER_CONFIG } from '@/config/plans';
import { SubscriptionPlanId, BillingCycle } from '@/types/subscription';
import { useSubscriptionStore } from '@/store/useSubscriptionStore';
import { PaymentProvider } from '@/services/paymentProvider';
import { AnalyticsService } from '@/services/analyticsService';

export default function PricingScreen() {
  const router = useRouter();
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('yearly');
  const [loadingPlan, setLoadingPlan] = useState<SubscriptionPlanId | null>(null);
  
  const currentPlan = useSubscriptionStore((s) => s.currentPlan);
  const status = useSubscriptionStore((s) => s.status);

  React.useEffect(() => {
    AnalyticsService.trackEvent('pricing_viewed', { currentPlan, status });
  }, []);

  const handleSelectPlan = async (planId: SubscriptionPlanId) => {
    if (planId === currentPlan) {
      Alert.alert('Current Plan', `You are currently on the ${PLANS[planId].name} plan.`);
      return;
    }

    if (planId === 'ENTERPRISE') {
      Alert.alert(
        'Enterprise Plan',
        'Contact our sales team for custom hotel group setups and SLA support:\nsupport@devify.com'
      );
      return;
    }

    setLoadingPlan(planId);
    AnalyticsService.trackEvent('checkout_started', { planId, billingCycle });

    const result = await PaymentProvider.createSubscription({
      planId,
      billingCycle,
      propertyId: 'HOMESTAY_DEFAULT',
    });

    setLoadingPlan(null);

    if (result.success) {
      AnalyticsService.trackEvent('subscription_started', { planId, billingCycle });
      Alert.alert('Success', `Subscribed to ${PLANS[planId].name} plan!`, [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } else {
      Alert.alert('Payment Failed', result.message || 'Could not complete subscription.');
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-950">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-slate-800/80">
        <TouchableOpacity onPress={() => router.back()} className="p-2 rounded-full bg-slate-900">
          <ArrowLeft size={20} color="#F8FAFC" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-white">Choose Your Plan</Text>
        <View className="w-8" />
      </View>

      <ScrollView className="flex-1 px-4 py-4" showsVerticalScrollIndicator={false}>
        {/* Launch Offer Banner */}
        {LAUNCH_OFFER_CONFIG.enabled && (
          <View className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/40 rounded-2xl p-4 mb-6 flex-row items-center space-x-3">
            <Zap size={28} color="#F59E0B" />
            <View className="flex-1">
              <Text className="text-amber-400 font-bold text-sm uppercase tracking-wide">
                Special Launch Offer (First 100 Properties)
              </Text>
              <Text className="text-slate-300 text-xs mt-1">
                Get 30 days free trial + ₹199/month for first 3 months with 12-month price lock & free migration support.
              </Text>
            </View>
          </View>
        )}

        {/* Monthly / Yearly Toggle */}
        <View className="flex-row justify-center items-center mb-6">
          <View className="bg-slate-900 p-1 rounded-2xl flex-row border border-slate-800">
            <TouchableOpacity
              onPress={() => setBillingCycle('monthly')}
              className={`px-5 py-2.5 rounded-xl ${billingCycle === 'monthly' ? 'bg-amber-500' : 'bg-transparent'}`}
            >
              <Text className={`font-semibold text-sm ${billingCycle === 'monthly' ? 'text-slate-950' : 'text-slate-400'}`}>
                Monthly
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setBillingCycle('yearly')}
              className={`px-5 py-2.5 rounded-xl flex-row items-center space-x-1 ${billingCycle === 'yearly' ? 'bg-amber-500' : 'bg-transparent'}`}
            >
              <Text className={`font-semibold text-sm ${billingCycle === 'yearly' ? 'text-slate-950' : 'text-slate-400'}`}>
                Annual (Save 2 Months)
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Plan Cards */}
        {(Object.keys(PLANS) as SubscriptionPlanId[]).map((planId) => {
          const plan = PLANS[planId];
          const isCurrent = currentPlan === planId;
          const isPopular = plan.popular;
          const price = billingCycle === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice;

          return (
            <View
              key={planId}
              className={`bg-slate-900 rounded-3xl p-5 mb-5 border ${
                isPopular ? 'border-amber-500 shadow-xl shadow-amber-500/10' : 'border-slate-800'
              }`}
            >
              {isPopular && (
                <View className="self-start bg-amber-500/20 px-3 py-1 rounded-full border border-amber-500/40 mb-3 flex-row items-center space-x-1">
                  <Sparkles size={12} color="#F59E0B" />
                  <Text className="text-amber-400 font-bold text-xs uppercase tracking-wider">Most Popular Choice</Text>
                </View>
              )}

              <View className="flex-row justify-between items-baseline mb-2">
                <Text className="text-xl font-bold text-white">{plan.name}</Text>
                <View className="flex-row items-baseline">
                  <Text className="text-2xl font-black text-white">
                    {planId === 'FREE' ? '₹0' : planId === 'ENTERPRISE' ? 'Custom' : `₹${price}`}
                  </Text>
                  {planId !== 'FREE' && planId !== 'ENTERPRISE' && (
                    <Text className="text-slate-400 text-xs ml-1">
                      /{billingCycle === 'yearly' ? 'year' : 'month'}
                    </Text>
                  )}
                </View>
              </View>

              <Text className="text-slate-400 text-xs mb-4">{plan.suitableFor}</Text>

              {/* Feature List */}
              <View className="space-y-2 mb-5">
                {plan.features.map((feat, i) => (
                  <View key={i} className="flex-row items-center space-x-2">
                    <Check size={16} color="#10B981" />
                    <Text className="text-slate-300 text-xs flex-1">{feat}</Text>
                  </View>
                ))}
              </View>

              {/* CTA Button */}
              <TouchableOpacity
                onPress={() => handleSelectPlan(planId)}
                disabled={loadingPlan === planId}
                className={`py-3.5 rounded-xl items-center justify-center ${
                  isCurrent
                    ? 'bg-slate-800 border border-slate-700'
                    : isPopular
                    ? 'bg-amber-500 hover:bg-amber-600'
                    : 'bg-slate-800 hover:bg-slate-700'
                }`}
              >
                <Text
                  className={`font-bold text-sm ${
                    isCurrent
                      ? 'text-emerald-400'
                      : isPopular
                      ? 'text-slate-950'
                      : 'text-white'
                  }`}
                >
                  {isCurrent
                    ? '✓ Current Active Plan'
                    : planId === 'FREE'
                    ? 'Start Free'
                    : planId === 'ENTERPRISE'
                    ? 'Contact Sales'
                    : `Upgrade to ${plan.name}`}
                </Text>
              </TouchableOpacity>
            </View>
          );
        })}

        {/* Security & Offline Trust Note */}
        <View className="items-center py-6 border-t border-slate-900 mb-8">
          <View className="flex-row items-center space-x-1.5 mb-1">
            <ShieldCheck size={16} color="#94A3B8" />
            <Text className="text-slate-400 text-xs font-medium">Offline-First & Security Guaranteed</Text>
          </View>
          <Text className="text-slate-500 text-[10px] text-center px-4">
            Subscriptions work 100% offline. Razorpay payments are encrypted & verified. Cancel anytime.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
