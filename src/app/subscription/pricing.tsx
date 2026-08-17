import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Alert, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Check, X } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { PLANS, PLAN_ORDER, formatLimit } from '@/config/plans';
import { SubscriptionPlan, type BillingCycle } from '@/types/subscription';
import { useSubscriptionStore } from '@/store/useSubscriptionStore';
import { useAuthStore } from '@/store/useAuthStore';
import { devifyProvider } from '@/services/paymentProvider';
import { Button } from '@/components/Button';
import { AIRBNB } from '@/theme/airbnb';

// ─── Airbnb Pricing Screen for StayMate ───────────────────────────────────────
// Direct port of renderPricing() from staymate-airbnb-redesign/app.html
// ─────────────────────────────────────────────────────────────────────────────

export default function PricingScreen() {
  const router = useRouter();
  const [billingAnnual, setBillingAnnual] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [checkoutPlanId, setCheckoutPlanId] = useState<string | null>(null);
  const { currentPlan } = useSubscriptionStore();
  const { owner, ownerId } = useAuthStore();

  const handleSelectPlan = async (planId: SubscriptionPlan) => {
    if (planId === SubscriptionPlan.FREE) {
      Alert.alert('Free Plan', 'You are already on the Free plan.', [{ text: 'OK' }]);
      return;
    }

    if (planId === currentPlan) {
      Alert.alert('Current Plan', 'You are already subscribed to this plan.', [{ text: 'OK' }]);
      return;
    }

    const userEmail = owner?.email || 'user@example.com';
    const userId = ownerId || 'OWNER_DEFAULT_101';

    setIsCheckingOut(true);
    setCheckoutPlanId(planId);

    try {
      const checkout = await devifyProvider.createCheckout(
        planId,
        billingAnnual ? 'yearly' : 'monthly',
        userEmail,
        userId
      );

      if (checkout.checkoutUrl) {
        await Linking.openURL(checkout.checkoutUrl);
      }
    } catch (e: any) {
      Alert.alert('Payment Error', e?.message || 'Failed to start payment');
    } finally {
      setIsCheckingOut(false);
      setCheckoutPlanId(null);
    }
  };

  const plans = [
    {
      id: SubscriptionPlan.FREE,
      name: 'Free',
      priceM: 0,
      priceY: 0,
      rooms: '2 rooms',
      checkins: '15 check-ins / mo',
      ocr: false,
      tag: null,
    },
    {
      id: SubscriptionPlan.STARTER,
      name: 'Starter',
      priceM: 349,
      priceY: 3499,
      rooms: '8 rooms',
      checkins: '100 check-ins / mo',
      ocr: true,
      tag: null,
    },
    {
      id: SubscriptionPlan.PROFESSIONAL,
      name: 'Professional',
      priceM: 799,
      priceY: 7999,
      rooms: '25 rooms',
      checkins: 'Unlimited check-ins',
      ocr: true,
      tag: 'Most popular',
    },
    {
      id: SubscriptionPlan.MULTI_PROPERTY,
      name: 'Multi-Property',
      priceM: 1799,
      priceY: 17999,
      rooms: 'Unlimited rooms · 5 properties',
      checkins: 'Unlimited check-ins',
      ocr: true,
      tag: null,
    },
    {
      id: SubscriptionPlan.ENTERPRISE,
      name: 'Enterprise',
      priceM: null,
      priceY: null,
      rooms: 'Unlimited everything',
      checkins: 'Dedicated support',
      ocr: true,
      tag: null,
    },
  ];

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}
        >
          <ChevronLeft size={18} color={AIRBNB.colors.ink} />
        </TouchableOpacity>
        <Text style={styles.title}>Plans &amp; pricing</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Monthly vs Annual Toggle */}
        <View style={styles.toggleTrack}>
          <TouchableOpacity
            style={[styles.toggleOpt, !billingAnnual && styles.toggleOptActive]}
            activeOpacity={0.8}
            onPress={() => setBillingAnnual(false)}
          >
            <Text style={[styles.toggleText, !billingAnnual && styles.toggleTextActive]}>
              Monthly
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleOpt, billingAnnual && styles.toggleOptActive]}
            activeOpacity={0.8}
            onPress={() => setBillingAnnual(true)}
          >
            <Text style={[styles.toggleText, billingAnnual && styles.toggleTextActive]}>
              Annual · save 15%
            </Text>
          </TouchableOpacity>
        </View>

        {/* Plan Cards */}
        <View style={styles.plansWrap}>
          {plans.map(p => {
            const isFeatured = p.tag !== null;
            const price = p.priceM === null
              ? 'Custom'
              : p.priceM === 0
              ? 'Free'
              : `₹${(billingAnnual ? Math.round((p.priceY || 0) / 12) : p.priceM).toLocaleString('en-IN')}`;

            return (
              <View
                key={p.id}
                style={[
                  styles.planCard,
                  isFeatured && styles.planCardFeatured,
                ]}
              >
                {p.tag && (
                  <View style={styles.featuredBadge}>
                    <Text style={styles.featuredBadgeText}>{p.tag}</Text>
                  </View>
                )}

                <View style={styles.planHeaderRow}>
                  <Text style={styles.planName}>{p.name}</Text>
                  <Text style={styles.planPrice}>
                    {price}
                    {p.priceM ? <Text style={styles.perMo}>/mo</Text> : null}
                  </Text>
                </View>

                <Text style={styles.planRooms}>{p.rooms}</Text>
                <Text style={styles.planCheckins}>{p.checkins}</Text>

                <View style={styles.ocrRow}>
                  <Check size={15} color={AIRBNB.colors.ink} />
                  <Text style={styles.ocrText}>
                    {p.ocr ? 'AI Document OCR included' : 'OCR not included'}
                  </Text>
                </View>

                <Button
                  label={
                    checkoutPlanId === p.id && isCheckingOut
                      ? 'Processing…'
                      : p.priceM === null
                      ? 'Contact sales'
                      : currentPlan === p.id
                      ? 'Current plan'
                      : 'Choose plan'
                  }
                  variant={isFeatured ? 'primary' : 'secondary'}
                  isLoading={checkoutPlanId === p.id && isCheckingOut}
                  disabled={currentPlan === p.id}
                  style={{ marginTop: 14, height: 44 }}
                  onPress={() => handleSelectPlan(p.id)}
                />
              </View>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: AIRBNB.colors.canvas,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: AIRBNB.colors.hairlineSoft,
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: AIRBNB.colors.surfaceStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: AIRBNB.colors.ink,
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },

  // Toggle
  toggleTrack: {
    width: 240,
    alignSelf: 'center',
    backgroundColor: AIRBNB.colors.surfaceStrong,
    borderRadius: AIRBNB.radius.full,
    padding: 3,
    flexDirection: 'row',
    marginBottom: 22,
  },
  toggleOpt: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: AIRBNB.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleOptActive: {
    backgroundColor: AIRBNB.colors.ink,
  },
  toggleText: {
    fontSize: 13,
    fontWeight: '600',
    color: AIRBNB.colors.muted,
  },
  toggleTextActive: {
    color: '#ffffff',
  },

  // Plan Cards
  plansWrap: {
    gap: 14,
  },
  planCard: {
    borderWidth: 1.5,
    borderColor: AIRBNB.colors.hairline,
    borderRadius: AIRBNB.radius.lg,
    padding: 20,
    backgroundColor: AIRBNB.colors.canvas,
    position: 'relative',
    ...AIRBNB.shadow.card,
  },
  planCardFeatured: {
    borderColor: AIRBNB.colors.primary,
  },
  featuredBadge: {
    position: 'absolute',
    top: -11,
    left: 20,
    backgroundColor: AIRBNB.colors.primary,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: AIRBNB.radius.full,
  },
  featuredBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
  },
  planHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  planName: {
    fontSize: 16,
    fontWeight: '600',
    color: AIRBNB.colors.ink,
  },
  planPrice: {
    fontSize: 20,
    fontWeight: '700',
    color: AIRBNB.colors.ink,
  },
  perMo: {
    fontSize: 12.5,
    fontWeight: '500',
    color: AIRBNB.colors.muted,
  },
  planRooms: {
    fontSize: 13.5,
    color: AIRBNB.colors.muted,
    marginTop: 8,
  },
  planCheckins: {
    fontSize: 13.5,
    color: AIRBNB.colors.muted,
    marginTop: 2,
  },
  ocrRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  ocrText: {
    fontSize: 13.5,
    color: AIRBNB.colors.body,
  },
});
