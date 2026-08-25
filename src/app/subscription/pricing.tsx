import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Check } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { SubscriptionPlan } from '@/types/subscription';
import { useSubscriptionStore } from '@/store/useSubscriptionStore';
import { plansService, DEFAULT_DISPLAY_PLANS, ClientDisplayPlan } from '@/services/plansService';
import { Button } from '@/components/Button';
import { AIRBNB } from '@/theme/airbnb';
import { C } from '@/theme/tokens';

export default function PricingScreen() {
  const router = useRouter();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('yearly');
  const [plans, setPlans] = useState<ClientDisplayPlan[]>(DEFAULT_DISPLAY_PLANS);
  const { currentPlan } = useSubscriptionStore();

  useEffect(() => {
    let isMounted = true;
    plansService.fetchLivePlans().then((live) => {
      if (isMounted && live && live.length > 0) {
        setPlans(live);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const isAnnual = billingCycle === 'yearly';
  const selectedDuration = isAnnual ? 12 : 1;

  const handleSelectPlan = (planId: SubscriptionPlan) => {
    if (planId === SubscriptionPlan.FREE) {
      Alert.alert('Free Plan', 'You are currently on the Free plan.', [{ text: 'OK' }]);
      return;
    }

    if (planId === currentPlan) {
      Alert.alert(
        'Current Plan',
        'You are already subscribed to this plan. Would you like to view checkout or manage your subscription?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Continue to Checkout',
            onPress: () => {
              router.push({
                pathname: '/subscription/checkout' as any,
                params: { planId, duration: String(selectedDuration) },
              });
            },
          },
        ]
      );
      return;
    }

    // Navigate to dedicated Checkout Screen
    router.push({
      pathname: '/subscription/checkout' as any,
      params: {
        planId,
        duration: String(selectedDuration),
      },
    });
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
        >
          <ChevronLeft size={18} color={AIRBNB.colors.ink} />
        </TouchableOpacity>
        <Text style={styles.title}>Plans &amp; pricing</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Monthly / Annual Toggle Track (reverted to classic 2-option toggle) */}
        <View style={styles.toggleTrack}>
          <TouchableOpacity
            style={[
              styles.toggleOpt,
              !isAnnual && styles.toggleOptActive,
            ]}
            activeOpacity={0.8}
            onPress={() => setBillingCycle('monthly')}
          >
            <Text
              style={[
                styles.toggleOptText,
                !isAnnual && styles.toggleOptTextActive,
              ]}
            >
              Monthly
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.toggleOpt,
              isAnnual && styles.toggleOptActive,
            ]}
            activeOpacity={0.8}
            onPress={() => setBillingCycle('yearly')}
          >
            <Text
              style={[
                styles.toggleOptText,
                isAnnual && styles.toggleOptTextActive,
              ]}
            >
              Annual · save 15%
            </Text>
          </TouchableOpacity>
        </View>

        {/* Plan Cards */}
        <View style={styles.plansWrap}>
          {plans.map((p) => {
            const isFeatured = Boolean(p.isRecommended) || p.tag !== null;
            const isFree = p.basePriceM === 0;
            const isCustom = p.basePriceM === null;

            const effectiveMonthly = isCustom
              ? 0
              : isFree
              ? 0
              : isAnnual
              ? Math.round(p.basePriceM * 0.85)
              : p.basePriceM;

            const priceDisplay = isCustom
              ? 'Custom'
              : isFree
              ? 'Free'
              : `₹${effectiveMonthly.toLocaleString('en-IN')}`;

            return (
              <View
                key={p.id}
                style={[
                  styles.planCard,
                  isFeatured && styles.planCardFeatured,
                ]}
              >
                {isFeatured && (
                  <View style={styles.featuredBadge}>
                    <Text style={styles.featuredBadgeText}>{p.tag || 'Recommended'}</Text>
                  </View>
                )}

                <View style={styles.planHeaderRow}>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text style={styles.planName}>{p.name}</Text>
                    {isAnnual && !isFree && !isCustom && (
                      <Text style={styles.savingsCallout}>
                        Save 15% on Annual billing
                      </Text>
                    )}
                  </View>

                  <View style={{ alignItems: 'flex-end', flexShrink: 0 }}>
                    <Text style={styles.planPrice}>
                      {priceDisplay}
                      {!isFree && !isCustom && (
                        <Text style={styles.perMo}>/mo</Text>
                      )}
                    </Text>
                    {isAnnual && !isFree && !isCustom && (
                      <Text style={styles.durationTotalNote}>
                        ₹{Math.round(p.basePriceM * 12 * 0.85).toLocaleString('en-IN')} billed annually
                      </Text>
                    )}
                  </View>
                </View>

                <View style={{ marginTop: 10, gap: 5 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Check size={14} color={C.primary} />
                    <Text style={styles.planRooms}>{p.rooms}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Check size={14} color={C.primary} />
                    <Text style={styles.planCheckins}>{p.checkins}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Check size={14} color={C.primary} />
                    <Text style={styles.planCheckins}>
                      {p.id === SubscriptionPlan.STARTER
                        ? '10 reports & exports / mo'
                        : p.id === SubscriptionPlan.FREE
                        ? '3 reports & exports / mo'
                        : 'Unlimited reports & exports'}
                    </Text>
                  </View>
                  {p.ocr ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Check size={14} color={C.primary} />
                      <Text style={styles.ocrText}>AI Document OCR included</Text>
                    </View>
                  ) : null}
                  {p.cloud ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Check size={14} color={C.primary} />
                      <Text style={styles.ocrText}>Live Cloud sync & backup</Text>
                    </View>
                  ) : null}
                </View>

                <Button
                  label={
                    isCustom
                      ? 'Contact sales'
                      : currentPlan === p.id
                      ? 'Current plan'
                      : 'Choose plan'
                  }
                  variant={isFeatured ? 'primary' : 'secondary'}
                  disabled={currentPlan === p.id}
                  style={{ marginTop: 14, height: 46 }}
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

  // Toggle Track
  toggleTrack: {
    width: 240,
    alignSelf: 'center',
    backgroundColor: AIRBNB.colors.surfaceStrong,
    borderRadius: AIRBNB.radius.full,
    padding: 3,
    flexDirection: 'row',
    marginBottom: 20,
  },
  toggleOpt: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderRadius: AIRBNB.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleOptActive: {
    backgroundColor: AIRBNB.colors.ink,
  },
  toggleOptText: {
    fontFamily: 'Inter',
    fontSize: 11.5,
    fontWeight: '600',
    color: AIRBNB.colors.muted,
  },
  toggleOptTextActive: {
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
    borderColor: C.primary,
  },
  featuredBadge: {
    position: 'absolute',
    top: -11,
    left: 20,
    backgroundColor: C.primary,
    paddingHorizontal: 10,
    paddingVertical: 3.5,
    borderRadius: AIRBNB.radius.full,
    flexDirection: 'row',
    alignItems: 'center',
  },
  featuredBadgeText: {
    fontFamily: 'Inter',
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
  },
  planHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  planName: {
    fontFamily: 'Inter',
    fontSize: 17,
    fontWeight: '700',
    color: AIRBNB.colors.ink,
  },
  savingsCallout: {
    fontFamily: 'Inter',
    fontSize: 11.5,
    fontWeight: '700',
    color: '#059669',
    marginTop: 2,
  },
  planPrice: {
    fontFamily: 'Inter',
    fontSize: 20,
    fontWeight: '800',
    color: AIRBNB.colors.ink,
  },
  perMo: {
    fontFamily: 'Inter',
    fontSize: 12.5,
    fontWeight: '500',
    color: AIRBNB.colors.muted,
  },
  durationTotalNote: {
    fontFamily: 'Inter',
    fontSize: 11,
    fontWeight: '500',
    color: AIRBNB.colors.muted,
    marginTop: 2,
  },
  planRooms: {
    fontFamily: 'Inter',
    fontSize: 13.5,
    color: AIRBNB.colors.muted,
    marginTop: 8,
  },
  planCheckins: {
    fontFamily: 'Inter',
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
    fontFamily: 'Inter',
    fontSize: 13.5,
    color: AIRBNB.colors.body,
  },
});
