// ============================================================
// StayMate — Dedicated Subscription Checkout Screen
// ============================================================
//
// Authoritative checkout flow:
// 1. Shows selected plan summary
// 2. Allows selecting 1M, 3M, 6M, 1Y billing periods with dynamic savings
// 3. Validates coupon codes authoritatively via backend
// 4. Allows applying StayMate wallet credits
// 5. Displays full itemized bill breakdown & total savings
// 6. Launches secure Devify Pay payment with validated amount
//

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  Check,
  Tag,
  Gift,
  ShieldCheck,
  ArrowRight,
  X,
} from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  PLANS,
  BILLING_PERIODS,
  calculatePlanPricing,
  getBillingPeriodConfig,
} from '@/config/plans';
import {
  SubscriptionPlan,
  type BillingDurationMonths,
  type CouponValidationResult,
} from '@/types/subscription';
import { useSubscriptionStore } from '@/store/useSubscriptionStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useWalletStore } from '@/store/useWalletStore';
import { couponService } from '@/services/couponService';
import { devifyProvider } from '@/services/paymentProvider';
import { Button } from '@/components/Button';
import { AIRBNB } from '@/theme/airbnb';
import { C } from '@/theme/tokens';

export default function CheckoutScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    planId?: string;
    duration?: string;
    coupon?: string;
  }>();

  // Selected Plan resolution
  const requestedPlanId = (params.planId as SubscriptionPlan) || SubscriptionPlan.PROFESSIONAL;
  const initialPlan = PLANS[requestedPlanId] ? requestedPlanId : SubscriptionPlan.PROFESSIONAL;
  const [selectedPlanId, setSelectedPlanId] = useState<SubscriptionPlan>(initialPlan);

  // Selected Duration resolution (1, 3, 6, 12 months)
  const initialDuration = Number(params.duration) as BillingDurationMonths;
  const validDuration: BillingDurationMonths =
    initialDuration === 1 || initialDuration === 3 || initialDuration === 6 || initialDuration === 12
      ? initialDuration
      : 6;
  const [selectedDuration, setSelectedDuration] = useState<BillingDurationMonths>(validDuration);

  // Coupon state
  const [couponInput, setCouponInput] = useState(params.coupon || '');
  const [appliedCoupon, setAppliedCoupon] = useState<CouponValidationResult | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);

  // Credits / Wallet state
  const [useCredits, setUseCredits] = useState(false);

  // Payment processing state
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  const { owner, ownerId } = useAuthStore();
  const { currentPlan } = useSubscriptionStore();
  const { availableCredits, fetchReferralOverview, useCreditsLocally } = useWalletStore();

  const userId = ownerId || 'OWNER_DEFAULT_101';
  const userEmail = owner?.email || 'user@example.com';

  // Load wallet credits for user on mount
  useEffect(() => {
    if (userId) {
      fetchReferralOverview(userId);
    }
  }, [userId]);

  // Selected Plan Object
  const plan = PLANS[selectedPlanId] || PLANS[SubscriptionPlan.PROFESSIONAL];
  const durationConfig = getBillingPeriodConfig(selectedDuration);

  // Calculate dynamic pricing
  const couponDiscount = appliedCoupon?.valid ? appliedCoupon.discountAmount : 0;
  const usableCredits = useCredits ? Math.min(availableCredits, calculatePlanPricing(selectedPlanId, selectedDuration, couponDiscount).subtotal - couponDiscount) : 0;
  const bill = calculatePlanPricing(
    selectedPlanId,
    selectedDuration,
    couponDiscount,
    usableCredits
  );

  // Validate coupon when user changes plan or duration if already applied
  useEffect(() => {
    if (appliedCoupon?.code) {
      handleValidateCoupon(appliedCoupon.code, true);
    }
  }, [selectedPlanId, selectedDuration]);

  // Apply Coupon Handler
  const handleValidateCoupon = async (codeToValidate?: string, silent = false) => {
    const code = (codeToValidate || couponInput).trim();
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
        userId
      );

      if (result.valid) {
        setAppliedCoupon(result);
        setCouponError(null);
        setCouponInput(result.code || code);
      } else {
        setAppliedCoupon(null);
        setCouponError(result.errorMessage || 'Invalid coupon code');
      }
    } catch (e: any) {
      setAppliedCoupon(null);
      setCouponError(e.message || 'Failed to validate coupon');
    } finally {
      setIsValidatingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponInput('');
    setCouponError(null);
  };

  // Payment Execution Handler
  const handleProceedToPayment = async () => {
    if (selectedPlanId === SubscriptionPlan.FREE) {
      Alert.alert('Free Plan', 'Free plan does not require payment.');
      return;
    }

    setIsProcessingPayment(true);

    try {
      const billingCycle = selectedDuration === 12 ? 'yearly' : 'monthly';
      const appliedCreditsPaise = usableCredits * 100;
      const couponCodeToSend = appliedCoupon?.valid ? appliedCoupon.code : undefined;

      // 1. Create checkout session with server-authoritative validation
      const checkout = await devifyProvider.createCheckout(
        selectedPlanId,
        billingCycle,
        userEmail,
        userId,
        {
          durationMonths: selectedDuration,
          couponCode: couponCodeToSend,
          appliedCreditsPaise,
        }
      );

      if (usableCredits > 0) {
        useCreditsLocally(usableCredits, checkout.orderId);
      }

      // 2. Open payment gateway in browser / WebBrowser
      if (checkout.checkoutUrl) {
        await devifyProvider.openCheckoutUrl(checkout.checkoutUrl);
      }

      // 3. Navigate to Payment Status Polling Screen
      router.replace({
        pathname: '/subscription/payment-status' as any,
        params: {
          orderId: checkout.orderId,
          planId: selectedPlanId,
          billingCycle,
        },
      });
    } catch (e: any) {
      Alert.alert(
        'Payment Initialization Failed',
        e?.message || 'Unable to start checkout. Please check your internet connection.'
      );
    } finally {
      setIsProcessingPayment(false);
    }
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/subscription/pricing'))}
        >
          <ChevronLeft size={18} color={AIRBNB.colors.ink} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Checkout</Text>
        <View style={{ width: 34 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Selected Plan Summary Card */}
        <View style={styles.planCard}>
          <View style={styles.planCardTop}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text style={styles.planName}>{plan.name} Plan</Text>
              <Text style={styles.planSub}>{plan.description}</Text>
            </View>
            <View style={styles.planBadge}>
              <Text style={styles.planBadgeText}>
                ₹{(plan.pricing.monthlyPrice ?? 0).toLocaleString('en-IN')}/mo
              </Text>
            </View>
          </View>

          <View style={styles.featuresList}>
            <View style={styles.featureItem}>
              <Check size={14} color={C.primary} />
              <Text style={styles.featureText}>
                {plan.id === SubscriptionPlan.STARTER
                  ? '8 rooms capacity'
                  : plan.id === SubscriptionPlan.PROFESSIONAL
                  ? '25 rooms capacity'
                  : plan.id === SubscriptionPlan.MULTI_PROPERTY
                  ? 'Unlimited rooms · 5 properties'
                  : 'Unlimited capacity'}
              </Text>
            </View>
            <View style={styles.featureItem}>
              <Check size={14} color={C.primary} />
              <Text style={styles.featureText}>
                {plan.id === SubscriptionPlan.STARTER
                  ? '100 check-ins / mo'
                  : plan.id === SubscriptionPlan.FREE
                  ? '15 check-ins / mo'
                  : 'Unlimited guest check-ins'}
              </Text>
            </View>
            <View style={styles.featureItem}>
              <Check size={14} color={C.primary} />
              <Text style={styles.featureText}>
                {plan.id === SubscriptionPlan.STARTER
                  ? '10 reports & exports / mo'
                  : plan.id === SubscriptionPlan.FREE
                  ? '3 reports & exports / mo'
                  : 'Unlimited reports & exports'}
              </Text>
            </View>
            <View style={styles.featureItem}>
              <Check size={14} color={C.primary} />
              <Text style={styles.featureText}>AI Document OCR scanning included</Text>
            </View>
            {plan.id !== SubscriptionPlan.STARTER && plan.id !== SubscriptionPlan.FREE ? (
              <View style={styles.featureItem}>
                <Check size={14} color={C.primary} />
                <Text style={styles.featureText}>Live cloud sync & automated backup</Text>
              </View>
            ) : (
              <View style={styles.featureItem}>
                <Check size={14} color={AIRBNB.colors.mutedSoft} />
                <Text style={[styles.featureText, { color: AIRBNB.colors.muted }]}>Local storage only (No cloud sync)</Text>
              </View>
            )}
          </View>
        </View>

        {/* Billing Period Selector */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>BILLING PERIOD</Text>
          <View style={styles.durationRow}>
            {BILLING_PERIODS.map((period) => {
              const isSelected = selectedDuration === period.months;
              return (
                <TouchableOpacity
                  key={period.months}
                  style={[
                    styles.durationTab,
                    isSelected && styles.durationTabActive,
                  ]}
                  activeOpacity={0.8}
                  onPress={() => setSelectedDuration(period.months)}
                >
                  {period.badge && (
                    <View style={styles.tabBadge}>
                      <Text style={styles.tabBadgeText}>{period.badge}</Text>
                    </View>
                  )}
                  <Text
                    style={[
                      styles.durationTabTitle,
                      isSelected && styles.durationTabTitleActive,
                    ]}
                  >
                    {period.label}
                  </Text>
                  <Text
                    style={[
                      styles.durationTabSub,
                      isSelected && styles.durationTabSubActive,
                    ]}
                  >
                    {period.discountPercent > 0
                      ? `${period.discountPercent}% OFF`
                      : 'Base'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Coupon Code Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>COUPON CODE</Text>
          <View style={styles.couponContainer}>
            {!appliedCoupon ? (
              <View style={styles.couponInputRow}>
                <View style={styles.inputWrap}>
                  <Tag size={16} color={C.muted} style={{ marginLeft: 12 }} />
                  <TextInput
                    style={styles.couponTextInput}
                    placeholder="Enter coupon (e.g. SAVE300)"
                    placeholderTextColor="#94A3B8"
                    value={couponInput}
                    onChangeText={(text) => {
                      setCouponInput(text.toUpperCase());
                      setCouponError(null);
                    }}
                    autoCapitalize="characters"
                    autoCorrect={false}
                  />
                </View>
                <TouchableOpacity
                  style={[
                    styles.applyBtn,
                    (!couponInput.trim() || isValidatingCoupon) && styles.applyBtnDisabled,
                  ]}
                  disabled={!couponInput.trim() || isValidatingCoupon}
                  onPress={() => handleValidateCoupon()}
                >
                  {isValidatingCoupon ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={styles.applyBtnText}>Apply</Text>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.couponAppliedCard}>
                <View style={styles.couponAppliedLeft}>
                  <View style={styles.couponAppliedIconWrap}>
                    <Check size={16} color="#059669" />
                  </View>
                  <View>
                    <Text style={styles.couponAppliedCode}>
                      {appliedCoupon.code}
                    </Text>
                    <Text style={styles.couponAppliedSaving}>
                      ₹{appliedCoupon.discountAmount.toLocaleString('en-IN')} discount applied
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.removeCouponBtn}
                  onPress={handleRemoveCoupon}
                >
                  <X size={16} color="#DC2626" />
                </TouchableOpacity>
              </View>
            )}

            {couponError && (
              <Text style={styles.couponErrorText}>{couponError}</Text>
            )}
          </View>
        </View>

        {/* StayMate Credits Section (if user has available credits) */}
        {availableCredits > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>STAYMATE CREDITS</Text>
            <TouchableOpacity
              style={[
                styles.creditCard,
                useCredits && styles.creditCardActive,
              ]}
              activeOpacity={0.85}
              onPress={() => setUseCredits(!useCredits)}
            >
              <View style={styles.creditCardLeft}>
                <View style={styles.creditIconWrap}>
                  <Gift size={18} color={C.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.creditTitle}>
                    Use Available Credits (₹{availableCredits})
                  </Text>
                  <Text style={styles.creditSub}>
                    Apply referral credits to discount this subscription
                  </Text>
                </View>
              </View>
              <View
                style={[
                  styles.checkbox,
                  useCredits && styles.checkboxActive,
                ]}
              >
                {useCredits && <Check size={13} color="#ffffff" />}
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* Detailed Itemized Final Bill */}
        <View style={styles.billCard}>
          <Text style={styles.billHeading}>Billing Summary</Text>

          {/* Base Plan */}
          <View style={styles.billRow}>
            <Text style={styles.billLabel}>
              {plan.name} ({selectedDuration} {selectedDuration === 1 ? 'Month' : 'Months'})
            </Text>
            <Text style={styles.billValue}>
              ₹{bill.baseTotal.toLocaleString('en-IN')}
            </Text>
          </View>

          {/* Duration Discount */}
          {bill.durationDiscountAmount > 0 && (
            <View style={styles.billRow}>
              <Text style={styles.billDiscountLabel}>
                {selectedDuration}-Month Duration Discount ({bill.durationDiscountPercent}%)
              </Text>
              <Text style={styles.billDiscountValue}>
                -₹{bill.durationDiscountAmount.toLocaleString('en-IN')}
              </Text>
            </View>
          )}

          {/* Subtotal */}
          <View style={styles.billRow}>
            <Text style={styles.billSubtotalLabel}>Subtotal</Text>
            <Text style={styles.billSubtotalValue}>
              ₹{bill.subtotal.toLocaleString('en-IN')}
            </Text>
          </View>

          {/* Coupon Discount */}
          {bill.couponDiscountAmount > 0 && (
            <View style={styles.billRow}>
              <Text style={styles.billDiscountLabel}>
                Coupon Discount ({appliedCoupon?.code})
              </Text>
              <Text style={styles.billDiscountValue}>
                -₹{bill.couponDiscountAmount.toLocaleString('en-IN')}
              </Text>
            </View>
          )}

          {/* Credits Used */}
          {bill.appliedCreditsAmount > 0 && (
            <View style={styles.billRow}>
              <Text style={styles.billDiscountLabel}>StayMate Credits Applied</Text>
              <Text style={styles.billDiscountValue}>
                -₹{bill.appliedCreditsAmount.toLocaleString('en-IN')}
              </Text>
            </View>
          )}

          <View style={styles.billDivider} />

          {/* Total Payable */}
          <View style={styles.billTotalRow}>
            <View>
              <Text style={styles.totalPayableLabel}>Total Payable</Text>
              <Text style={styles.taxIncludedNote}>All taxes included</Text>
            </View>
            <Text style={styles.totalPayableAmount}>
              ₹{bill.finalPayableAmount.toLocaleString('en-IN')}
            </Text>
          </View>

          {/* Total Savings Highlight Badge */}
          {bill.totalSavings > 0 && (
            <View style={styles.savingsBanner}>
              <Tag size={14} color="#059669" />
              <Text style={styles.savingsBannerText}>
                You save ₹{bill.totalSavings.toLocaleString('en-IN')} on this order
              </Text>
            </View>
          )}
        </View>

        {/* Security & Guarantee Note */}
        <View style={styles.securityNote}>
          <ShieldCheck size={16} color="#64748B" />
          <Text style={styles.securityText}>
            256-bit encrypted secure checkout with UPI & Instant Activation
          </Text>
        </View>

        {/* Primary CTA Button */}
        <Button
          label={
            isProcessingPayment
              ? 'Opening Secure Payment…'
              : `Proceed to Payment · ₹${bill.finalPayableAmount.toLocaleString('en-IN')}`
          }
          variant="primary"
          isLoading={isProcessingPayment}
          style={styles.payBtn}
          onPress={handleProceedToPayment}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F8F7FB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#ECEAF0',
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F2F2F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: 'Inter',
    fontSize: 17,
    fontWeight: '700',
    color: '#222222',
  },
  scroll: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 40,
  },

  // Plan Card
  planCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#ECEAF0',
    marginBottom: 16,
    overflow: 'hidden',
    ...AIRBNB.shadow.card,
  },
  planCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F2',
    paddingBottom: 12,
    marginBottom: 12,
    gap: 8,
  },
  planName: {
    fontFamily: 'Inter',
    fontSize: 18,
    fontWeight: '700',
    color: '#222222',
  },
  planSub: {
    fontFamily: 'Inter',
    fontSize: 13,
    color: '#6A6A6A',
    marginTop: 2,
    lineHeight: 18,
  },
  planBadge: {
    backgroundColor: '#EDE9FE',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    flexShrink: 0,
    alignSelf: 'flex-start',
  },
  planBadgeText: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '700',
    color: C.primary,
  },
  featuresList: {
    gap: 8,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureText: {
    fontFamily: 'Inter',
    fontSize: 13,
    color: '#3F3F3F',
  },

  // Section
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '800',
    color: '#6A6A6A',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginLeft: 2,
  },

  // Duration Row
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
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    minHeight: 56,
  },
  durationTabActive: {
    borderColor: C.primary,
    backgroundColor: '#FAF5FF',
  },
  tabBadge: {
    position: 'absolute',
    top: -8,
    backgroundColor: '#059669',
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 999,
  },
  tabBadgeText: {
    fontFamily: 'Inter',
    fontSize: 9.5,
    fontWeight: '800',
    color: '#ffffff',
  },
  durationTabTitle: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '700',
    color: '#222222',
  },
  durationTabTitleActive: {
    color: C.primary,
  },
  durationTabSub: {
    fontFamily: 'Inter',
    fontSize: 10.5,
    color: '#6A6A6A',
    marginTop: 2,
  },
  durationTabSubActive: {
    color: C.primary,
    fontWeight: '700',
  },

  // Coupon
  couponContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ECEAF0',
  },
  couponInputRow: {
    flexDirection: 'row',
    gap: 10,
  },
  inputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  couponTextInput: {
    flex: 1,
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    paddingHorizontal: 10,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
  },
  applyBtn: {
    backgroundColor: C.primary,
    borderRadius: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyBtnDisabled: {
    backgroundColor: '#DDD6FE',
  },
  applyBtnText: {
    fontFamily: 'Inter',
    fontSize: 13.5,
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
    gap: 10,
  },
  couponAppliedIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  couponAppliedCode: {
    fontFamily: 'Inter',
    fontSize: 13.5,
    fontWeight: '800',
    color: '#065F46',
  },
  couponAppliedSaving: {
    fontFamily: 'Inter',
    fontSize: 11.5,
    color: '#047857',
    marginTop: 1,
  },
  removeCouponBtn: {
    padding: 6,
  },
  couponErrorText: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '600',
    color: '#DC2626',
    marginTop: 8,
    marginLeft: 2,
  },

  // Credits
  creditCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#ECEAF0',
  },
  creditCardActive: {
    borderColor: C.primary,
    backgroundColor: '#FAF5FF',
  },
  creditCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  creditIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EDE9FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  creditTitle: {
    fontFamily: 'Inter',
    fontSize: 13.5,
    fontWeight: '700',
    color: '#222222',
  },
  creditSub: {
    fontFamily: 'Inter',
    fontSize: 12,
    color: '#6A6A6A',
    marginTop: 2,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.8,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: C.primary,
    borderColor: C.primary,
  },

  // Bill Card
  billCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#ECEAF0',
    marginBottom: 16,
    ...AIRBNB.shadow.card,
  },
  billHeading: {
    fontFamily: 'Inter',
    fontSize: 16,
    fontWeight: '700',
    color: '#222222',
    marginBottom: 14,
  },
  billRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  billLabel: {
    fontFamily: 'Inter',
    fontSize: 13.5,
    color: '#3F3F3F',
  },
  billValue: {
    fontFamily: 'Inter',
    fontSize: 13.5,
    fontWeight: '600',
    color: '#222222',
  },
  billDiscountLabel: {
    fontFamily: 'Inter',
    fontSize: 13.5,
    fontWeight: '600',
    color: '#059669',
  },
  billDiscountValue: {
    fontFamily: 'Inter',
    fontSize: 13.5,
    fontWeight: '700',
    color: '#059669',
  },
  billSubtotalLabel: {
    fontFamily: 'Inter',
    fontSize: 13.5,
    fontWeight: '700',
    color: '#222222',
  },
  billSubtotalValue: {
    fontFamily: 'Inter',
    fontSize: 13.5,
    fontWeight: '700',
    color: '#222222',
  },
  billDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 12,
  },
  billTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  totalPayableLabel: {
    fontFamily: 'Inter',
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  taxIncludedNote: {
    fontFamily: 'Inter',
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 2,
  },
  totalPayableAmount: {
    fontFamily: 'Inter',
    fontSize: 22,
    fontWeight: '800',
    color: C.primary,
  },
  savingsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginTop: 14,
  },
  savingsBannerText: {
    fontFamily: 'Inter',
    fontSize: 12.5,
    fontWeight: '700',
    color: '#059669',
  },

  // Security Note
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  securityText: {
    fontFamily: 'Inter',
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
  },

  // Pay CTA Button
  payBtn: {
    height: 52,
    borderRadius: 14,
  },
});
