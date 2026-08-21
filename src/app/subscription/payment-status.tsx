import React, { useEffect, useRef, useState } from 'react';
import { View, Text, ActivityIndicator, Animated, Easing } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { GlassCard } from '@/components/GlassCard';
import { CheckCircle2, XCircle, Clock, ArrowLeft } from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSubscriptionStore } from '@/store/useSubscriptionStore';
import { devifyProvider } from '@/services/paymentProvider';
import { SubscriptionPlan, type BillingCycle } from '@/types/subscription';
import { PLANS } from '@/config/plans';

type PaymentStatusType = 'processing' | 'success' | 'failed' | 'timeout';

export default function PaymentStatusScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    orderId: string;
    planId: string;
    billingCycle: string;
  }>();

  const [status, setStatus] = useState<PaymentStatusType>('processing');
  const { activateFromPayment } = useSubscriptionStore();
  const pollingStarted = useRef(false);

  // Success animation
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (status === 'success') {
      Animated.sequence([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 4,
          tension: 60,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [status]);

  // Start polling when the screen mounts
  useEffect(() => {
    if (pollingStarted.current) return;
    pollingStarted.current = true;

    const orderId = params.orderId;
    if (!orderId) {
      setStatus('failed');
      return;
    }

    (async () => {
      try {
        const result = await devifyProvider.pollOrderStatus(orderId, (orderStatus) => {
          // Called on each poll — could update UI with progress
          console.info('[PaymentStatus] Poll update:', orderStatus.status);
        });

        if (result.status === 'PAID') {
          // Activate the plan in the local store
          const planId = (params.planId || result.planId) as SubscriptionPlan;
          const billingCycle = (params.billingCycle || result.billingCycle) as BillingCycle;
          activateFromPayment(planId, billingCycle, orderId);
          setStatus('success');
        } else if (result.status === 'FAILED') {
          setStatus('failed');
        } else {
          // Still PENDING after timeout
          setStatus('timeout');
        }
      } catch (error) {
        console.error('[PaymentStatus] Polling error:', error);
        setStatus('failed');
      }
    })();
  }, []);

  const planName = params.planId
    ? PLANS[params.planId as SubscriptionPlan]?.name || params.planId
    : 'Plan';

  return (
    <SafeAreaView edges={['top', 'left', 'right']} className="flex-1 bg-white">
      <View className="flex-1 justify-center items-center px-6">
        {/* Processing */}
        {status === 'processing' && (
          <GlassCard className="w-full max-w-[400px] p-8 items-center">
            <View className="w-20 h-20 bg-violet-100 rounded-full items-center justify-center mb-6">
              <ActivityIndicator size="large" color="#8B5CF6" />
            </View>
            <Text className="text-xl font-extrabold text-slate-900 text-center mb-2">
              Processing Payment
            </Text>
            <Text className="text-sm text-slate-500 text-center mb-6 leading-5">
              Please complete the payment in your browser.{'\n'}
              We'll update this screen automatically.
            </Text>
            <View className="flex-row items-center bg-violet-50 px-4 py-2.5 rounded-xl">
              <Clock size={16} color="#8B5CF6" />
              <Text className="text-violet-700 text-xs font-semibold ml-2">
                Waiting for payment confirmation...
              </Text>
            </View>
          </GlassCard>
        )}

        {/* Success */}
        {status === 'success' && (
          <GlassCard className="w-full max-w-[400px] p-8 items-center">
            <Animated.View
              style={{ transform: [{ scale: scaleAnim }] }}
              className="w-20 h-20 bg-emerald-100 rounded-full items-center justify-center mb-6"
            >
              <CheckCircle2 size={44} color="#059669" />
            </Animated.View>
            <Animated.View style={{ opacity: fadeAnim }}>
              <Text className="text-2xl font-extrabold text-slate-900 text-center mb-2">
                Payment Successful
              </Text>
              <Text className="text-sm text-slate-500 text-center mb-6 leading-5">
                Your {planName} plan is now active.{'\n'}
                Enjoy all premium features!
              </Text>
              <View className="bg-emerald-50 rounded-2xl px-4 py-3 mb-6 flex-row items-center self-stretch">
                <CheckCircle2 size={18} color="#059669" />
                <Text className="text-emerald-800 font-bold text-sm ml-2 flex-1">
                  {planName} Plan — Active
                </Text>
              </View>
              <Button
                label="Back to App"
                variant="primary"
                size="lg"
                className="w-full bg-emerald-600"
                onPress={() => router.replace('/(tabs)')}
              />
            </Animated.View>
          </GlassCard>
        )}

        {/* Failed */}
        {status === 'failed' && (
          <GlassCard className="w-full max-w-[400px] p-8 items-center">
            <View className="w-20 h-20 bg-rose-100 rounded-full items-center justify-center mb-6">
              <XCircle size={44} color="#E11D48" />
            </View>
            <Text className="text-xl font-extrabold text-slate-900 text-center mb-2">
              Payment Failed
            </Text>
            <Text className="text-sm text-slate-500 text-center mb-6 leading-5">
              Something went wrong with your payment.{'\n'}
              No charges have been made to your account.
            </Text>
            <Button
              label="Try Again"
              variant="primary"
              size="lg"
              className="w-full bg-violet-600 mb-3"
              onPress={() => router.replace('/subscription/pricing')}
            />
            <Button
              label="Back to App"
              variant="ghost"
              size="md"
              onPress={() => router.replace('/(tabs)')}
              icon={<ArrowLeft size={18} color="#64748B" />}
            />
          </GlassCard>
        )}

        {/* Timeout */}
        {status === 'timeout' && (
          <GlassCard className="w-full max-w-[400px] p-8 items-center">
            <View className="w-20 h-20 bg-amber-100 rounded-full items-center justify-center mb-6">
              <Clock size={44} color="#D97706" />
            </View>
            <Text className="text-xl font-extrabold text-slate-900 text-center mb-2">
              Payment Pending
            </Text>
            <Text className="text-sm text-slate-500 text-center mb-6 leading-5">
              Your payment is taking longer than expected.{'\n'}
              If you completed the payment, your plan will{'\n'}
              be activated automatically within a few minutes.
            </Text>
            <View className="bg-amber-50 rounded-2xl px-4 py-3 mb-6 flex-row items-center self-stretch">
              <Clock size={16} color="#D97706" />
              <Text className="text-amber-800 font-semibold text-xs ml-2 flex-1">
                We'll keep checking and notify you when it's confirmed.
              </Text>
            </View>
            <Button
              label="Back to App"
              variant="primary"
              size="lg"
              className="w-full bg-amber-600"
              onPress={() => router.replace('/(tabs)')}
            />
          </GlassCard>
        )}
      </View>
    </SafeAreaView>
  );
}
