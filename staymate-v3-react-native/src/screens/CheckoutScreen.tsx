// ============================================================
// StayMate V3 — Dedicated Checkout Screen
// ============================================================

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
  Modal,
  AppState,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { Icon } from '../components/Icon';
import { PrimaryButton, SecondaryButton } from '../components/Ui';
import { useTheme } from '../theme/ThemeContext';
import {
  PLANS,
  BILLING_PERIODS,
  calculatePlanPricing,
  getBillingPeriodConfig,
} from '../config/plans';
import {
  SubscriptionPlan,
  type BillingDurationMonths,
  type CouponValidationResult,
} from '../types/subscription';
import { couponService } from '../services/couponService';
import { referralService } from '../services/referralService';
import { devifyPay, type DevifyCheckoutResult } from '../services/devifyPay';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { updateOwnerProfile } from '../services/firebaseAuth';

export function CheckoutScreen({
  initialPlan = 'Professional',
  initialDuration = 6,
  userProfile,
  onClose,
  onPaymentSuccess,
  onToast,
}: {
  initialPlan?: string;
  initialDuration?: BillingDurationMonths;
  userProfile?: any;
  onClose: () => void;
  onPaymentSuccess: (plan: string) => void;
  onToast?: (msg: string) => void;
}) {
  const insets = useSafeAreaInsets();
  const { isDark, colors } = useTheme();

  // Resolve plan
  const normalizePlanId = (name: string): SubscriptionPlan => {
    const upper = (name || '').toUpperCase().trim();
    if (upper.includes('MULTI')) return SubscriptionPlan.MULTI_PROPERTY;
    if (upper.includes('PROFESSIONAL') || upper.includes('PRO')) return SubscriptionPlan.PROFESSIONAL;
    if (upper.includes('STARTER') || upper.includes('START')) return SubscriptionPlan.STARTER;
    if (upper.includes('FREE')) return SubscriptionPlan.FREE;
    return SubscriptionPlan.PROFESSIONAL;
  };

  const [selectedPlanId, setSelectedPlanId] = useState<SubscriptionPlan>(
    normalizePlanId(initialPlan)
  );

  const [selectedDuration, setSelectedDuration] = useState<BillingDurationMonths>(
    initialDuration || 6
  );

  // Coupon state
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<CouponValidationResult | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);

  // Wallet / Credits state
  const [availableCredits, setAvailableCredits] = useState(0);
  const [useCredits, setUseCredits] = useState(false);

  // Payment execution state
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeCheckout, setActiveCheckout] = useState<DevifyCheckoutResult | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [effectiveUser, setEffectiveUser] = useState<any>(userProfile || null);

  // Load user profile from props or AsyncStorage
  useEffect(() => {
    (async () => {
      try {
        if (userProfile && (userProfile.email || userProfile.uid)) {
          setEffectiveUser(userProfile);
          const stats = await referralService.getReferralOverview(userProfile.propertyId || userProfile.uid || 'HS-4821');
          if (stats?.availableCredits) setAvailableCredits(stats.availableCredits);
        } else {
          const raw = await AsyncStorage.getItem('staymate_user_profile');
          if (raw) {
            const parsed = JSON.parse(raw);
            setEffectiveUser(parsed);
            const stats = await referralService.getReferralOverview(parsed.propertyId || parsed.uid || 'HS-4821');
            if (stats?.availableCredits) setAvailableCredits(stats.availableCredits);
          }
        }
      } catch (_) {}
    })();
  }, [userProfile]);

  const plan = PLANS[selectedPlanId] || PLANS[SubscriptionPlan.PROFESSIONAL];

  // Dynamic pricing calculation
  const couponDiscount = appliedCoupon?.valid ? appliedCoupon.discountAmount : 0;
  const rawSubtotal = calculatePlanPricing(selectedPlanId, selectedDuration, couponDiscount).subtotal;
  const usableCredits = useCredits ? Math.min(availableCredits, rawSubtotal - couponDiscount) : 0;
  const bill = calculatePlanPricing(
    selectedPlanId,
    selectedDuration,
    couponDiscount,
    usableCredits
  );

  // Re-validate coupon if duration or plan changes
  useEffect(() => {
    if (appliedCoupon?.code) {
      handleValidateCoupon(appliedCoupon.code, true);
    }
  }, [selectedPlanId, selectedDuration]);

  const handleValidateCoupon = async (codeToValidate?: string, silent = false) => {
    const code = (codeToValidate || couponInput).trim().toUpperCase();
    if (!code) {
      if (!silent) setCouponError('Please enter a coupon code');
      return;
    }

    setIsValidatingCoupon(true);
    setCouponError(null);

    try {
      const result = await couponService.validateCoupon(
        code,
        selectedPlanId,
        selectedDuration,
        effectiveUser?.propertyId || effectiveUser?.uid || 'HS-4821'
      );

      if (result.valid) {
        setAppliedCoupon(result);
        setCouponError(null);
        setCouponInput(result.code || code);
        if (onToast && !silent) onToast(`✓ Coupon ${result.code} applied!`);
      } else {
        setAppliedCoupon(null);
        if (!silent) {
          setCouponError(result.errorMessage || 'Invalid coupon code');
        }
      }
    } catch (e: any) {
      setAppliedCoupon(null);
      if (!silent) {
        setCouponError(e.message || 'Failed to validate coupon');
      }
    } finally {
      setIsValidatingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponInput('');
    setCouponError(null);
  };

  const handleProceedToPayment = async () => {
    if (selectedPlanId === SubscriptionPlan.FREE) {
      onPaymentSuccess('Free');
      onClose();
      return;
    }

    setIsProcessing(true);

    try {
      const billingCycle = selectedDuration === 12 ? 'yearly' : 'monthly';
      const resolvedEmail = (effectiveUser?.email || userProfile?.email || 'host@staymate.in').trim().toLowerCase();
      const resolvedUserId = (effectiveUser?.propertyId || effectiveUser?.uid || userProfile?.propertyId || userProfile?.uid || 'HS-4821').trim();

      const checkout = await devifyPay.createCheckout({
        planName: plan.name,
        billingCycle,
        durationMonths: selectedDuration,
        amount: bill.finalPayableAmount,
        userEmail: resolvedEmail,
        userId: resolvedUserId,
        couponCode: appliedCoupon?.valid ? appliedCoupon.code : undefined,
        appliedCreditsPaise: usableCredits * 100,
      });

      setActiveCheckout(checkout);
    } catch (e: any) {
      Alert.alert('Payment Error', e.message || 'Failed to start payment checkout');
    } finally {
      setIsProcessing(false);
    }
  };

  // Real-time polling & AppState listener to automatically verify payment when user returns from UPI app
  useEffect(() => {
    if (!activeCheckout) return;

    let isMounted = true;

    const pollStatus = async () => {
      try {
        const orderStatus = await devifyPay.checkOrderStatus(activeCheckout.orderId);
        if (isMounted && orderStatus.status === 'PAID') {
          handleVerifyPayment(true);
        }
      } catch (_) {}
    };

    const interval = setInterval(pollStatus, 2000);

    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        pollStatus();
      }
    });

    return () => {
      isMounted = false;
      clearInterval(interval);
      subscription.remove();
    };
  }, [activeCheckout]);

  const handleVerifyPayment = async (silent = false) => {
    if (!activeCheckout) return;
    setVerifying(true);

    try {
      let orderStatus = await devifyPay.checkOrderStatus(activeCheckout.orderId);

      if (orderStatus.status !== 'PAID') {
        await new Promise((resolve) => setTimeout(resolve, 1200));
        orderStatus = await devifyPay.checkOrderStatus(activeCheckout.orderId);
      }

      if (orderStatus.status === 'PAID') {
        const planName = plan.name;
        const uid = effectiveUser?.uid || userProfile?.uid || '';
        const propId = effectiveUser?.propertyId || userProfile?.propertyId || (uid ? `HS-${uid.slice(0, 4).toUpperCase()}` : 'HS-4821');
        const email = effectiveUser?.email || userProfile?.email || '';

        // Proactively sync upgraded plan to Firestore for instant real-time reflection in Admin Panel
        try {
          await updateOwnerProfile(uid, {
            email,
            propertyId: propId,
            plan: planName,
            subscriptionPlan: planName,
            planStatus: 'active',
            updatedAt: new Date().toISOString(),
          } as any);
        } catch (_) {}

        setActiveCheckout(null);
        setVerifying(false);
        onPaymentSuccess(planName);
        onClose();
        Alert.alert(
          'Subscription Activated! 🎉',
          `Your payment via Devify Pay has been verified successfully.\n\nWelcome to StayMate ${planName} plan!`,
          [{ text: 'Continue', style: 'default' }]
        );
        return;
      }

      setVerifying(false);
      if (!silent) {
        Alert.alert(
          'Payment Processing',
          'Your transaction is being confirmed by the bank. If you completed payment in your UPI app, your subscription will activate automatically in a few moments.',
          [
            { text: 'Wait', style: 'cancel' },
            {
              text: 'Check Again',
              onPress: () => handleVerifyPayment(false),
            },
          ]
        );
      }
    } catch (err: any) {
      setVerifying(false);
      if (!silent) {
        Alert.alert('Verification Notice', err?.message || 'Connecting to payment gateway... Please check again shortly.');
      }
    }
  };

  return (
    <View style={[s.container, isDark && { backgroundColor: colors.canvas }, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={[s.header, isDark && { borderBottomColor: colors.cardBorder }]}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onClose}
          style={[s.iconBtn, isDark && { backgroundColor: '#27272A' }]}
        >
          <Icon name="chevronLeft" size={18} color={colors.ink} />
        </TouchableOpacity>
        <Text style={[s.title, isDark && { color: colors.ink }]}>Checkout</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 18, paddingBottom: Math.max(30, insets.bottom + 20) }}
        showsVerticalScrollIndicator={false}
      >
        {/* Selected Plan Summary Card */}
        <View style={[s.planCard, isDark && { backgroundColor: '#18181B', borderColor: '#27272A' }]}>
          <View style={s.planCardTop}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text style={[s.planName, isDark && { color: colors.ink }]}>{plan.name} Plan</Text>
              <Text style={[s.planSub, isDark && { color: colors.muted }]}>{plan.description}</Text>
            </View>
            <View style={[s.planBadge, isDark && { backgroundColor: '#2E1065' }]}>
              <Text style={[s.planBadgeText, { color: colors.primary }]}>
                ₹{(plan.pricing.monthlyPrice ?? 0).toLocaleString('en-IN')}/mo
              </Text>
            </View>
          </View>

          <View style={s.featuresList}>
            <View style={s.featureItem}>
              <Icon name="check" size={14} color={colors.primary} />
              <Text style={[s.featureText, isDark && { color: colors.ink }]}>
                {plan.id === SubscriptionPlan.STARTER
                  ? '8 rooms capacity'
                  : plan.id === SubscriptionPlan.PROFESSIONAL
                  ? '25 rooms capacity'
                  : plan.id === SubscriptionPlan.MULTI_PROPERTY
                  ? 'Unlimited rooms · 5 properties'
                  : 'Unlimited capacity'}
              </Text>
            </View>
            <View style={s.featureItem}>
              <Icon name="check" size={14} color={colors.primary} />
              <Text style={[s.featureText, isDark && { color: colors.ink }]}>
                {plan.id === SubscriptionPlan.STARTER
                  ? '100 check-ins / mo'
                  : plan.id === SubscriptionPlan.FREE
                  ? '15 check-ins / mo'
                  : 'Unlimited guest check-ins'}
              </Text>
            </View>
            <View style={s.featureItem}>
              <Icon name="check" size={14} color={colors.primary} />
              <Text style={[s.featureText, isDark && { color: colors.ink }]}>
                {plan.id === SubscriptionPlan.STARTER
                  ? '10 reports & exports / mo'
                  : plan.id === SubscriptionPlan.FREE
                  ? '3 reports & exports / mo'
                  : 'Unlimited reports & exports'}
              </Text>
            </View>
            <View style={s.featureItem}>
              <Icon name="check" size={14} color={colors.primary} />
              <Text style={[s.featureText, isDark && { color: colors.ink }]}>AI Document OCR scanning included</Text>
            </View>
            {plan.id !== SubscriptionPlan.STARTER && plan.id !== SubscriptionPlan.FREE ? (
              <View style={s.featureItem}>
                <Icon name="check" size={14} color={colors.primary} />
                <Text style={[s.featureText, isDark && { color: colors.ink }]}>Live cloud sync & automated backup</Text>
              </View>
            ) : (
              <View style={s.featureItem}>
                <Icon name="check" size={14} color={colors.mutedSoft} />
                <Text style={[s.featureText, { color: colors.muted }]}>Local storage only (No cloud sync)</Text>
              </View>
            )}
          </View>
        </View>

        {/* 4 Duration Billing Selector */}
        <View style={s.section}>
          <Text style={[s.sectionTitle, isDark && { color: colors.muted }]}>BILLING PERIOD</Text>
          <View style={s.durationRow}>
            {BILLING_PERIODS.map((period) => {
              const isSelected = selectedDuration === period.months;
              return (
                <TouchableOpacity
                  key={period.months}
                  activeOpacity={0.8}
                  style={[
                    s.durationTab,
                    isDark && { backgroundColor: '#18181B', borderColor: '#27272A' },
                    isSelected && { borderColor: colors.primary, backgroundColor: isDark ? '#2E1065' : '#FAF5FF' },
                  ]}
                  onPress={() => setSelectedDuration(period.months)}
                >
                  {period.badge && (
                    <View style={s.tabBadge}>
                      <Text style={s.tabBadgeText}>{period.badge}</Text>
                    </View>
                  )}
                  <Text
                    style={[
                      s.durationTabTitle,
                      isDark && { color: colors.ink },
                      isSelected && { color: colors.primary },
                    ]}
                  >
                    {period.label}
                  </Text>
                  <Text
                    style={[
                      s.durationTabSub,
                      isDark && { color: colors.muted },
                      isSelected && { color: colors.primary, fontWeight: '700' },
                    ]}
                  >
                    {period.discountPercent > 0 ? `${period.discountPercent}% OFF` : 'Base'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Coupon Section */}
        <View style={s.section}>
          <Text style={[s.sectionTitle, isDark && { color: colors.muted }]}>COUPON CODE</Text>
          <View style={[s.couponCard, isDark && { backgroundColor: '#18181B', borderColor: '#27272A' }]}>
            {!appliedCoupon ? (
              <View style={s.couponInputRow}>
                <View style={[s.inputWrap, isDark && { backgroundColor: '#27272A', borderColor: '#3F3F46' }]}>
                  <Icon name="tag" size={16} color={colors.muted} />
                  <TextInput
                    style={[s.couponTextInput, isDark && { color: colors.ink }]}
                    placeholder="Enter coupon (e.g. SAVE300)"
                    placeholderTextColor="#94A3B8"
                    value={couponInput}
                    onChangeText={(t) => {
                      setCouponInput(t.toUpperCase());
                      setCouponError(null);
                    }}
                    autoCapitalize="characters"
                    autoCorrect={false}
                  />
                </View>
                <TouchableOpacity
                  style={[
                    s.applyBtn,
                    { backgroundColor: colors.primary },
                    (!couponInput.trim() || isValidatingCoupon) && { opacity: 0.6 },
                  ]}
                  disabled={!couponInput.trim() || isValidatingCoupon}
                  onPress={() => handleValidateCoupon()}
                >
                  {isValidatingCoupon ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={s.applyBtnText}>Apply</Text>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              <View style={[s.couponAppliedCard, isDark && { backgroundColor: '#064E3B', borderColor: '#047857' }]}>
                <View style={s.couponAppliedLeft}>
                  <View style={[s.couponAppliedIconWrap, isDark && { backgroundColor: '#047857' }]}>
                    <Icon name="check" size={14} color="#10B981" />
                  </View>
                  <View>
                    <Text style={[s.couponAppliedCode, isDark && { color: '#A7F3D0' }]}>
                      {appliedCoupon.code}
                    </Text>
                    <Text style={[s.couponAppliedSaving, isDark && { color: '#6EE7B7' }]}>
                      ₹{appliedCoupon.discountAmount.toLocaleString('en-IN')} discount applied
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={s.removeCouponBtn}
                  onPress={handleRemoveCoupon}
                >
                  <Icon name="x" size={16} color="#DC2626" />
                </TouchableOpacity>
              </View>
            )}

            {couponError && (
              <Text style={s.couponErrorText}>{couponError}</Text>
            )}
          </View>
        </View>

        {/* StayMate Credits (if available) */}
        {availableCredits > 0 && (
          <View style={s.section}>
            <Text style={[s.sectionTitle, isDark && { color: colors.muted }]}>STAYMATE CREDITS</Text>
            <TouchableOpacity
              activeOpacity={0.85}
              style={[
                s.creditCard,
                isDark && { backgroundColor: '#18181B', borderColor: '#27272A' },
                useCredits && { borderColor: colors.primary, backgroundColor: isDark ? '#2E1065' : '#FAF5FF' },
              ]}
              onPress={() => setUseCredits(!useCredits)}
            >
              <View style={s.creditCardLeft}>
                <View style={[s.creditIconWrap, isDark && { backgroundColor: '#2E1065' }]}>
                  <Icon name="gift" size={18} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.creditTitle, isDark && { color: colors.ink }]}>
                    Use Available Credits (₹{availableCredits})
                  </Text>
                  <Text style={[s.creditSub, isDark && { color: colors.muted }]}>
                    Apply referral credits to discount this subscription
                  </Text>
                </View>
              </View>
              <View
                style={[
                  s.checkbox,
                  isDark && { borderColor: '#52525B' },
                  useCredits && { backgroundColor: colors.primary, borderColor: colors.primary },
                ]}
              >
                {useCredits && <Icon name="check" size={12} color="#ffffff" />}
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* Itemized Final Bill */}
        <View style={[s.billCard, isDark && { backgroundColor: '#18181B', borderColor: '#27272A' }]}>
          <Text style={[s.billHeading, isDark && { color: colors.ink }]}>Billing Summary</Text>

          <View style={s.billRow}>
            <Text style={[s.billLabel, isDark && { color: colors.muted }]}>
              {plan.name} ({selectedDuration} {selectedDuration === 1 ? 'Month' : 'Months'})
            </Text>
            <Text style={[s.billValue, isDark && { color: colors.ink }]}>
              ₹{bill.baseTotal.toLocaleString('en-IN')}
            </Text>
          </View>

          {bill.durationDiscountAmount > 0 && (
            <View style={s.billRow}>
              <Text style={s.billDiscountLabel}>
                {selectedDuration}-Month Discount ({bill.durationDiscountPercent}%)
              </Text>
              <Text style={s.billDiscountValue}>
                -₹{bill.durationDiscountAmount.toLocaleString('en-IN')}
              </Text>
            </View>
          )}

          <View style={s.billRow}>
            <Text style={[s.billSubtotalLabel, isDark && { color: colors.ink }]}>Subtotal</Text>
            <Text style={[s.billSubtotalValue, isDark && { color: colors.ink }]}>
              ₹{bill.subtotal.toLocaleString('en-IN')}
            </Text>
          </View>

          {bill.couponDiscountAmount > 0 && (
            <View style={s.billRow}>
              <Text style={s.billDiscountLabel}>
                Coupon Discount ({appliedCoupon?.code})
              </Text>
              <Text style={s.billDiscountValue}>
                -₹{bill.couponDiscountAmount.toLocaleString('en-IN')}
              </Text>
            </View>
          )}

          {bill.appliedCreditsAmount > 0 && (
            <View style={s.billRow}>
              <Text style={s.billDiscountLabel}>StayMate Credits Applied</Text>
              <Text style={s.billDiscountValue}>
                -₹{bill.appliedCreditsAmount.toLocaleString('en-IN')}
              </Text>
            </View>
          )}

          <View style={[s.billDivider, isDark && { backgroundColor: '#27272A' }]} />

          <View style={s.billTotalRow}>
            <View>
              <Text style={[s.totalPayableLabel, isDark && { color: colors.ink }]}>Total Payable</Text>
              <Text style={[s.taxIncludedNote, isDark && { color: colors.muted }]}>All taxes included</Text>
            </View>
            <Text style={[s.totalPayableAmount, { color: colors.primary }]}>
              ₹{bill.finalPayableAmount.toLocaleString('en-IN')}
            </Text>
          </View>

          {bill.totalSavings > 0 && (
            <View style={[s.savingsBanner, isDark && { backgroundColor: '#064E3B' }]}>
              <Icon name="tag" size={14} color="#10B981" />
              <Text style={[s.savingsBannerText, isDark && { color: '#A7F3D0' }]}>
                You save ₹{bill.totalSavings.toLocaleString('en-IN')} on this order
              </Text>
            </View>
          )}
        </View>

        {/* Security badge */}
        <View style={s.securityNote}>
          <Icon name="shield" size={15} color="#64748B" />
          <Text style={s.securityText}>
            256-bit encrypted checkout with Instant Activation via UPI
          </Text>
        </View>

        {/* Primary CTA */}
        <PrimaryButton
          label={
            isProcessing
              ? 'Opening Secure Payment…'
              : `Proceed to Payment · ₹${bill.finalPayableAmount.toLocaleString('en-IN')}`
          }
          style={{ height: 50, borderRadius: 14 }}
          onPress={handleProceedToPayment}
        />
      </ScrollView>

      {/* Devify Pay In-App WebView Checkout Modal */}
      {activeCheckout && (
        <Modal visible animationType="slide" onRequestClose={() => setActiveCheckout(null)}>
          <View style={[{ flex: 1, backgroundColor: '#FAF8FD' }, isDark && { backgroundColor: colors.canvas }]}>
            {/* Header Bar */}
            <View style={{
              paddingTop: Math.max(20, insets.top + 8),
              paddingBottom: 14,
              paddingHorizontal: 16,
              backgroundColor: isDark ? '#18181B' : '#fff',
              borderBottomWidth: 1,
              borderBottomColor: isDark ? '#27272A' : '#ECEAF0',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: isDark ? '#2E1065' : '#EDE9FE', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="shield" size={19} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: 'Inter', fontSize: 15.5, fontWeight: '700', color: colors.ink }}>
                    Devify Pay Checkout
                  </Text>
                  <Text style={{ fontFamily: 'Inter', fontSize: 12, fontWeight: '500', color: colors.muted, marginTop: 1 }}>
                    {plan.name} Plan · ₹{bill.finalPayableAmount.toLocaleString('en-IN')} ({selectedDuration} Mo)
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setActiveCheckout(null)}
                style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: isDark ? '#27272A' : '#F1F5F9', alignItems: 'center', justifyContent: 'center', marginLeft: 10 }}
              >
                <Icon name="x" size={17} color={colors.ink} />
              </TouchableOpacity>
            </View>

            {/* In-App Browser / WebView Area */}
            <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
              {Platform.OS === 'web' ? (
                // @ts-ignore
                <iframe
                  src={activeCheckout.checkoutUrl}
                  style={{ width: '100%', height: '100%', border: 'none' }}
                  title="Devify Pay Checkout"
                />
              ) : (
                <WebView
                  source={{ uri: activeCheckout.checkoutUrl }}
                  style={{ flex: 1, backgroundColor: '#FFFFFF' }}
                  startInLoadingState
                  javaScriptEnabled
                  domStorageEnabled
                  scalesPageToFit
                  originWhitelist={['*']}
                  onNavigationStateChange={(navState) => {
                    const url = navState.url || '';
                    if (
                      url.includes('status=PAID') ||
                      url.includes('status=SUCCESS') ||
                      url.includes('payment_status=success') ||
                      url.includes('order_status=paid') ||
                      url.includes('status=completed') ||
                      url.startsWith('staymate://')
                    ) {
                      handleVerifyPayment(true);
                    }
                  }}
                />
              )}
            </View>

            {/* Bottom Action Toolbar */}
            <View style={{ padding: 16, paddingBottom: Math.max(20, insets.bottom + 12), backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#ECEAF0', gap: 10 }}>
              <PrimaryButton
                label={verifying ? "Verifying payment..." : "I have completed payment"}
                icon="check"
                onPress={() => handleVerifyPayment(false)}
                style={{ height: 48 }}
              />
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => Linking.openURL(activeCheckout.checkoutUrl)}
                  style={{ flex: 1, height: 42, borderRadius: 12, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 }}
                >
                  <Icon name="external" size={14} color="#334155" />
                  <Text style={{ fontFamily: 'Inter', fontSize: 13, fontWeight: '600', color: '#334155' }}>
                    Open in Browser
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setActiveCheckout(null)}
                  style={{ flex: 1, height: 42, borderRadius: 12, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center' }}
                >
                  <Text style={{ fontFamily: 'Inter', fontSize: 13, fontWeight: '600', color: '#64748B' }}>
                    Cancel
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF8FD',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#ECEAF0',
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: 'Inter',
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },

  // Plan Card
  planCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#ECEAF0',
    marginBottom: 14,
    overflow: 'hidden',
  },
  planCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 10,
    marginBottom: 10,
    gap: 8,
  },
  planName: {
    fontFamily: 'Inter',
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  planSub: {
    fontFamily: 'Inter',
    fontSize: 12.5,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 17,
  },
  planBadge: {
    backgroundColor: '#EDE9FE',
    paddingHorizontal: 9,
    paddingVertical: 3.5,
    borderRadius: 999,
    flexShrink: 0,
    alignSelf: 'flex-start',
  },
  planBadgeText: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '800',
  },
  featuresList: {
    gap: 6,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureText: {
    fontFamily: 'Inter',
    fontSize: 12.5,
    color: '#334155',
  },

  // Section
  section: {
    marginBottom: 14,
  },
  sectionTitle: {
    fontFamily: 'Inter',
    fontSize: 11.5,
    fontWeight: '800',
    letterSpacing: 0.6,
    color: '#64748B',
    marginBottom: 8,
    marginLeft: 2,
  },

  // Duration
  durationRow: {
    flexDirection: 'row',
    gap: 8,
  },
  durationTab: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#ECEAF0',
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    minHeight: 54,
  },
  tabBadge: {
    position: 'absolute',
    top: -7,
    backgroundColor: '#059669',
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 999,
  },
  tabBadgeText: {
    fontFamily: 'Inter',
    fontSize: 9,
    fontWeight: '800',
    color: '#ffffff',
  },
  durationTabTitle: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  durationTabSub: {
    fontFamily: 'Inter',
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },

  // Coupon
  couponCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ECEAF0',
  },
  couponInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  inputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 10,
  },
  couponTextInput: {
    flex: 1,
    fontFamily: 'Inter',
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0F172A',
    paddingVertical: 8,
    paddingHorizontal: 6,
  },
  applyBtn: {
    borderRadius: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyBtnText: {
    fontFamily: 'Inter',
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  couponAppliedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 10,
    padding: 10,
  },
  couponAppliedLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  couponAppliedIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  couponAppliedCode: {
    fontFamily: 'Inter',
    fontSize: 13,
    fontWeight: '800',
    color: '#065F46',
  },
  couponAppliedSaving: {
    fontFamily: 'Inter',
    fontSize: 11,
    color: '#047857',
    marginTop: 1,
  },
  removeCouponBtn: {
    padding: 4,
  },
  couponErrorText: {
    fontFamily: 'Inter',
    fontSize: 11.5,
    fontWeight: '600',
    color: '#DC2626',
    marginTop: 6,
    marginLeft: 2,
  },

  // Credits
  creditCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1.5,
    borderColor: '#ECEAF0',
  },
  creditCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  creditIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#EDE9FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  creditTitle: {
    fontFamily: 'Inter',
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  creditSub: {
    fontFamily: 'Inter',
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 1,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.8,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Bill Card
  billCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#ECEAF0',
    marginBottom: 14,
  },
  billHeading: {
    fontFamily: 'Inter',
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 12,
  },
  billRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  billLabel: {
    fontFamily: 'Inter',
    fontSize: 13,
    color: '#475569',
  },
  billValue: {
    fontFamily: 'Inter',
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  billDiscountLabel: {
    fontFamily: 'Inter',
    fontSize: 13,
    fontWeight: '600',
    color: '#059669',
  },
  billDiscountValue: {
    fontFamily: 'Inter',
    fontSize: 13,
    fontWeight: '700',
    color: '#059669',
  },
  billSubtotalLabel: {
    fontFamily: 'Inter',
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  billSubtotalValue: {
    fontFamily: 'Inter',
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  billDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 10,
  },
  billTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  totalPayableLabel: {
    fontFamily: 'Inter',
    fontSize: 14.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  taxIncludedNote: {
    fontFamily: 'Inter',
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  totalPayableAmount: {
    fontFamily: 'Inter',
    fontSize: 20,
    fontWeight: '800',
  },
  savingsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 12,
  },
  savingsBannerText: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
  },

  // Security Note
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 14,
  },
  securityText: {
    fontFamily: 'Inter',
    fontSize: 11.5,
    color: '#64748B',
    textAlign: 'center',
  },
});
