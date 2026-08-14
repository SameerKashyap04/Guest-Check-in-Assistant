import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GlassCard } from '@/components/GlassCard';
import { Button } from '@/components/Button';
import { ChevronLeft, Check, Star, Zap, Crown, Building2, Sparkles } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { PLANS, PLAN_ORDER, TRIAL_CONFIG, LAUNCH_OFFER, formatLimit } from '@/config/plans';
import { SubscriptionPlan, type BillingCycle } from '@/types/subscription';
import { useSubscriptionStore } from '@/store/useSubscriptionStore';
import { useAuthStore } from '@/store/useAuthStore';
import { hasPlan, getTrialDaysRemaining } from '@/services/entitlementService';
import { devifyProvider } from '@/services/paymentProvider';

const PLAN_ICONS: Record<string, React.ReactNode> = {
  [SubscriptionPlan.FREE]: <Zap size={22} color="#64748B" />,
  [SubscriptionPlan.STARTER]: <Star size={22} color="#F59E0B" />,
  [SubscriptionPlan.PROFESSIONAL]: <Crown size={22} color="#8B5CF6" />,
  [SubscriptionPlan.MULTI_PROPERTY]: <Building2 size={22} color="#0EA5E9" />,
};

const PLAN_COLORS: Record<string, { bg: string; border: string; accent: string }> = {
  [SubscriptionPlan.FREE]: { bg: 'bg-slate-50', border: 'border-slate-200', accent: '#64748B' },
  [SubscriptionPlan.STARTER]: { bg: 'bg-amber-50', border: 'border-amber-200', accent: '#F59E0B' },
  [SubscriptionPlan.PROFESSIONAL]: { bg: 'bg-violet-50', border: 'border-violet-200', accent: '#8B5CF6' },
  [SubscriptionPlan.MULTI_PROPERTY]: { bg: 'bg-sky-50', border: 'border-sky-200', accent: '#0EA5E9' },
};

/** Feature bullets per plan for display */
const PLAN_HIGHLIGHTS: Record<string, string[]> = {
  [SubscriptionPlan.FREE]: [
    'Up to 10 rooms',
    '20 check-ins / month',
    'QR self-check-in link',
    'Basic PDF & CSV reports',
    'Offline-first mode',
  ],
  [SubscriptionPlan.STARTER]: [
    'Up to 5 rooms',
    'Unlimited check-ins',
    'Unlimited exports',
    'QR self-check-in link',
    'Offline-first mode',
  ],
  [SubscriptionPlan.PROFESSIONAL]: [
    'Up to 30 rooms',
    'Unlimited check-ins',
    'OCR ID scanning',
    'Advanced reports',
    'Staff accounts (up to 5)',
    'Backup & restore',
    'Priority support',
  ],
  [SubscriptionPlan.MULTI_PROPERTY]: [
    'Up to 10 properties',
    '30 rooms per property',
    'Centralized dashboard',
    'Role-based permissions',
    'Staff accounts (up to 20)',
    'Everything in Professional',
  ],
};

export default function PricingScreen() {
  const router = useRouter();
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [checkoutPlanId, setCheckoutPlanId] = useState<string | null>(null);
  const { currentPlan, isTrialing, startTrial, setSubscription } = useSubscriptionStore();
  const { owner, ownerId } = useAuthStore();
  const trialDays = getTrialDaysRemaining();

  const visiblePlans = PLAN_ORDER.filter((planId) => PLANS[planId].isVisible);

  const handleSelectPlan = async (planId: SubscriptionPlan) => {
    if (planId === SubscriptionPlan.FREE) {
      Alert.alert('Free Plan', 'You are already on the Free plan.', [{ text: 'OK' }]);
      return;
    }

    if (planId === currentPlan) {
      Alert.alert('Current Plan', 'You are already subscribed to this plan.', [{ text: 'OK' }]);
      return;
    }

    // Get the user's email and ID for the checkout
    const userEmail = owner?.email || 'user@example.com';
    const userId = ownerId || 'OWNER_DEFAULT_101';

    setIsCheckingOut(true);
    setCheckoutPlanId(planId);

    try {
      // 1. Create checkout session via the backend
      const checkout = await devifyProvider.createCheckout(
        planId,
        billingCycle,
        userEmail,
        userId
      );

      // 2. Open checkout URL in browser
      //    On web: window.location.href (user leaves the page)
      //    On native: opens in-app browser, user returns after payment
      if (checkout.isSandbox) {
        // Sandbox test mode — direct activation without external popup windows
        router.push({
          pathname: '/subscription/payment-status',
          params: {
            orderId: checkout.orderId,
            planId,
            billingCycle,
          },
        });
      } else if (Platform.OS === 'web') {
        // Navigate to payment-status screen first, then redirect to hosted gateway
        router.push({
          pathname: '/subscription/payment-status',
          params: {
            orderId: checkout.orderId,
            planId,
            billingCycle,
          },
        });
        setTimeout(() => {
          if (typeof window !== 'undefined') {
            window.open(checkout.checkoutUrl, '_blank');
          }
        }, 500);
      } else {
        // On native, open browser then navigate to status screen
        await devifyProvider.openCheckoutUrl(checkout.checkoutUrl);
        router.push({
          pathname: '/subscription/payment-status',
          params: {
            orderId: checkout.orderId,
            planId,
            billingCycle,
          },
        });
      }
    } catch (error: any) {
      console.error('[Pricing] Checkout error:', error);
      // Offer trial as fallback if checkout fails
      Alert.alert(
        'Payment Unavailable',
        `Unable to start checkout: ${error.message || 'Unknown error'}\n\nWould you like to start a free trial instead?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Start Free Trial',
            onPress: () => {
              startTrial(planId);
              Alert.alert(
                'Trial Started! 🎉',
                `You now have ${TRIAL_CONFIG.TRIAL_DURATION_DAYS} days of free access to ${PLANS[planId].name} features.`,
                [{ text: 'Great!', onPress: () => router.back() }]
              );
            },
          },
        ]
      );
    } finally {
      setIsCheckingOut(false);
      setCheckoutPlanId(null);
    }
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} className="flex-1 bg-white">
      <ScrollView
        contentContainerStyle={{ paddingBottom: 40, flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="px-5 pt-4 pb-2">
          <TouchableOpacity
            onPress={() => router.back()}
            className="flex-row items-center mb-4"
          >
            <ChevronLeft size={24} color="#0F172A" />
            <Text className="text-base font-semibold text-slate-800 ml-1">Back</Text>
          </TouchableOpacity>

          <View className="items-center mb-6">
            <View className="w-14 h-14 bg-violet-100 rounded-full items-center justify-center mb-3">
              <Sparkles size={28} color="#8B5CF6" />
            </View>
            <Text className="text-2xl font-extrabold text-slate-900 text-center">
              Choose Your Plan
            </Text>
            <Text className="text-sm text-slate-500 text-center mt-1.5 px-4">
              Upgrade to unlock faster check-ins, OCR scanning, and advanced reporting
            </Text>
          </View>

          {/* Current plan / trial indicator */}
          {isTrialing && trialDays > 0 && (
            <View className="bg-violet-100 rounded-2xl px-4 py-3 mb-4 flex-row items-center">
              <Crown size={18} color="#8B5CF6" />
              <Text className="text-violet-800 font-semibold ml-2 flex-1">
                Trial: {trialDays} day{trialDays !== 1 ? 's' : ''} remaining
              </Text>
            </View>
          )}

          {/* Launch Offer Banner */}
          {LAUNCH_OFFER.ENABLED && (
            <GlassCard className="mb-5 p-4 border-amber-300 bg-amber-50">
              <View className="flex-row items-center mb-1.5">
                <Star size={16} color="#F59E0B" />
                <Text className="text-amber-800 font-bold text-sm ml-1.5">Early Adopter Offer</Text>
              </View>
              <Text className="text-amber-700 text-xs leading-5">
                Get {LAUNCH_OFFER.DISCOUNT_DURATION_MONTHS} months at ₹{LAUNCH_OFFER.DISCOUNTED_MONTHLY_PRICE}/mo with price lock for {LAUNCH_OFFER.PRICE_LOCK_MONTHS} months. Includes free setup & data migration.
              </Text>
            </GlassCard>
          )}

          {/* Billing Cycle Toggle */}
          <View className="flex-row bg-slate-100 rounded-2xl p-1.5 mb-6">
            <TouchableOpacity
              onPress={() => setBillingCycle('monthly')}
              className={`flex-1 py-3 rounded-xl items-center ${billingCycle === 'monthly' ? 'bg-white shadow-sm' : ''}`}
            >
              <Text className={`font-bold text-sm ${billingCycle === 'monthly' ? 'text-slate-900' : 'text-slate-500'}`}>
                Monthly
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setBillingCycle('yearly')}
              className={`flex-1 py-3 rounded-xl items-center ${billingCycle === 'yearly' ? 'bg-white shadow-sm' : ''}`}
            >
              <Text className={`font-bold text-sm ${billingCycle === 'yearly' ? 'text-slate-900' : 'text-slate-500'}`}>
                Yearly
              </Text>
              <Text className="text-xs text-emerald-600 font-semibold mt-0.5">Save up to 17%</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Plan Cards */}
        <View className="px-5">
          {visiblePlans.map((planId) => {
            const plan = PLANS[planId];
            const colors = PLAN_COLORS[planId];
            const highlights = PLAN_HIGHLIGHTS[planId] || [];
            const isCurrentPlan = currentPlan === planId;
            const price = billingCycle === 'monthly' ? plan.pricing.monthlyPrice : plan.pricing.yearlyPrice;
            const period = billingCycle === 'monthly' ? '/mo' : '/yr';

            return (
              <GlassCard
                key={planId}
                className={`mb-4 p-5 ${plan.isRecommended ? 'border-2 border-violet-400' : `border ${colors.border}`} ${colors.bg}`}
              >
                {/* Recommended badge */}
                {plan.isRecommended && (
                  <View className="bg-violet-600 self-start px-3 py-1 rounded-full mb-3">
                    <Text className="text-white text-xs font-bold">RECOMMENDED</Text>
                  </View>
                )}

                {/* Plan header */}
                <View className="flex-row items-center mb-2">
                  {PLAN_ICONS[planId]}
                  <Text className="text-lg font-extrabold text-slate-900 ml-2">{plan.name}</Text>
                  {isCurrentPlan && (
                    <View className="bg-emerald-100 px-2.5 py-0.5 rounded-full ml-auto">
                      <Text className="text-emerald-700 text-xs font-bold">CURRENT</Text>
                    </View>
                  )}
                </View>

                <Text className="text-sm text-slate-500 mb-3">{plan.description}</Text>

                {/* Price */}
                <View className="flex-row items-baseline mb-4">
                  {price === 0 ? (
                    <Text className="text-3xl font-extrabold text-slate-900">Free</Text>
                  ) : (
                    <>
                      <Text className="text-sm text-slate-500 font-semibold">₹</Text>
                      <Text className="text-3xl font-extrabold text-slate-900">{price.toLocaleString('en-IN')}</Text>
                      <Text className="text-sm text-slate-500 font-semibold ml-0.5">{period}</Text>
                    </>
                  )}
                  {billingCycle === 'yearly' && plan.pricing.yearlySavings > 0 && (
                    <View className="bg-emerald-100 px-2 py-0.5 rounded-full ml-3">
                      <Text className="text-emerald-700 text-xs font-bold">
                        Save ₹{plan.pricing.yearlySavings.toLocaleString('en-IN')}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Features list */}
                <View className="mb-4">
                  {highlights.map((feature, i) => (
                    <View key={i} className="flex-row items-center mb-2">
                      <View className="w-5 h-5 rounded-full items-center justify-center mr-2.5" style={{ backgroundColor: `${colors.accent}20` }}>
                        <Check size={12} color={colors.accent} strokeWidth={3} />
                      </View>
                      <Text className="text-sm text-slate-700 flex-1">{feature}</Text>
                    </View>
                  ))}
                </View>

                {/* CTA */}
                {planId === SubscriptionPlan.FREE ? (
                  <View className="bg-slate-200 py-3 rounded-2xl items-center">
                    <Text className="text-slate-500 font-bold text-sm">
                      {isCurrentPlan ? 'Current Plan' : 'Free Forever'}
                    </Text>
                  </View>
                ) : (
                  <Button
                    label={
                      isCurrentPlan
                        ? 'Current Plan'
                        : isCheckingOut && checkoutPlanId === planId
                        ? 'Processing...'
                        : `Upgrade to ${plan.name}`
                    }
                    variant={plan.isRecommended ? 'primary' : 'secondary'}
                    size="md"
                    disabled={isCurrentPlan || isCheckingOut}
                    isLoading={isCheckingOut && checkoutPlanId === planId}
                    className={`w-full ${plan.isRecommended ? 'bg-violet-600' : ''}`}
                    onPress={() => handleSelectPlan(planId)}
                  />
                )}
              </GlassCard>
            );
          })}
        </View>

        {/* Footer */}
        <View className="px-5 mt-4 items-center">
          <Text className="text-xs text-slate-400 text-center leading-5">
            All plans include offline mode, data privacy, and encrypted local storage.{'\n'}
            Prices are in Indian Rupees (₹). Cancel anytime.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
