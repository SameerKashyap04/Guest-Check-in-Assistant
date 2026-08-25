import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  CheckCircle2,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Building2,
  ScanLine,
  FileSpreadsheet,
  Receipt,
  Headphones,
  Check,
} from 'lucide-react-native';
import { SubscriptionPlan } from '@/types/subscription';
import { PLANS } from '@/config/plans';

export default function SubscriptionSuccessScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    order_id?: string;
    orderId?: string;
    payment_id?: string;
    paymentId?: string;
    planId?: string;
    plan?: string;
    cycle?: string;
    amount?: string;
  }>();

  const planIdRaw = (params.planId || params.plan || 'STARTER').toUpperCase();
  const planKey = (
    Object.keys(SubscriptionPlan).includes(planIdRaw)
      ? planIdRaw
      : SubscriptionPlan.STARTER
  ) as SubscriptionPlan;

  const planConfig = PLANS[planKey] || PLANS[SubscriptionPlan.STARTER];
  const cycle = params.cycle || 'monthly';
  const amount = params.amount || String(planConfig.pricing.monthlyPrice || 399);
  const orderRef = params.order_id || params.orderId || 'DEVIFY_ORDER_PAID';

  // Animation values
  const scaleAnim = useRef(new Animated.Value(0.3)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 5,
        tension: 80,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const calculateRenewalDate = () => {
    const d = new Date();
    if (cycle === 'yearly') {
      d.setFullYear(d.getFullYear() + 1);
    } else {
      d.setMonth(d.getMonth() + 1);
    }
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const getUnlockedFeatures = () => {
    if (planKey === SubscriptionPlan.ENTERPRISE || planKey === SubscriptionPlan.MULTI_PROPERTY) {
      return [
        { icon: Building2, text: 'Unlimited Properties & Multi-Unit Support' },
        { icon: ScanLine, text: 'Unlimited High-Speed AI OCR Document Scans' },
        { icon: FileSpreadsheet, text: 'Government Form-C & Police C-Form Export' },
        { icon: Receipt, text: 'Automated Guest WhatsApp Check-in Receipts' },
        { icon: Headphones, text: '24/7 Dedicated Account Manager & SLA' },
      ];
    }
    if (planKey === SubscriptionPlan.PROFESSIONAL) {
      return [
        { icon: Building2, text: 'Up to 25 Rooms Capacity' },
        { icon: ScanLine, text: 'Unlimited Fast OCR Document Scanning' },
        { icon: FileSpreadsheet, text: 'Instant PDF / Excel Monthly Reports' },
        { icon: Receipt, text: 'Digital WhatsApp Check-in Confirmations' },
        { icon: Headphones, text: 'Priority WhatsApp Support' },
      ];
    }
    return [
      { icon: Building2, text: 'Up to 8 Rooms Full Capacity' },
      { icon: ScanLine, text: 'AI OCR Document Scanning (100 Scans/mo)' },
      { icon: FileSpreadsheet, text: 'Government Form-C Monthly PDF Exports' },
      { icon: Receipt, text: 'Live Room Occupancy & Guest Tracking' },
      { icon: ShieldCheck, text: 'Instant Cloud Data Backup' },
    ];
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Success Icon */}
        <Animated.View
          style={[
            styles.iconWrapper,
            {
              transform: [{ scale: scaleAnim }],
              opacity: fadeAnim,
            },
          ]}
        >
          <View style={styles.outerGlow}>
            <View style={styles.iconCircle}>
              <CheckCircle2 size={52} color="#059669" />
            </View>
          </View>
        </Animated.View>

        {/* Header Text */}
        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
            alignItems: 'center',
          }}
        >
          <View style={styles.pillBadge}>
            <Sparkles size={13} color="#7c3aed" />
            <Text style={styles.pillBadgeText}>SUBSCRIPTION ACTIVATED</Text>
          </View>

          <Text style={styles.title}>
            You have successfully subscribed to {planConfig.name}!
          </Text>

          <Text style={styles.subtitle}>
            Your homestay is now unlocked with all premium features. Real-time sync is live.
          </Text>
        </Animated.View>

        {/* Subscription Detail Card */}
        <Animated.View
          style={[
            styles.detailCard,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.cardRow}>
            <Text style={styles.cardLabel}>Active Plan</Text>
            <View style={styles.planPill}>
              <Text style={styles.planPillText}>{planConfig.name.toUpperCase()} PLAN</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.cardRow}>
            <Text style={styles.cardLabel}>Amount Paid</Text>
            <Text style={styles.amountText}>
              ₹{Number(amount).toLocaleString('en-IN')}{' '}
              <Text style={styles.amountSub}>
                / {cycle === 'yearly' ? 'Year' : 'Month'}
              </Text>
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.cardRow}>
            <Text style={styles.cardLabel}>Next Renewal</Text>
            <Text style={styles.cardValue}>{calculateRenewalDate()}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.cardRow}>
            <Text style={styles.cardLabel}>Payment Gateway</Text>
            <View style={styles.gatewayBadge}>
              <ShieldCheck size={13} color="#059669" />
              <Text style={styles.gatewayBadgeText}>Devify Pay (Verified)</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.cardRow}>
            <Text style={styles.cardLabel}>Order Reference</Text>
            <Text style={styles.orderRefText} numberOfLines={1}>
              {orderRef}
            </Text>
          </View>
        </Animated.View>

        {/* Unlocked Features List */}
        <Animated.View
          style={[
            styles.featuresCard,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <Text style={styles.featuresHeading}>Features Unlocked on Your Account</Text>

          {getUnlockedFeatures().map((f, i) => {
            const IconComponent = f.icon;
            return (
              <View key={i} style={styles.featureItem}>
                <View style={styles.featureIconBox}>
                  <IconComponent size={16} color="#7c3aed" />
                </View>
                <Text style={styles.featureText}>{f.text}</Text>
                <Check size={16} color="#059669" />
              </View>
            );
          })}
        </Animated.View>

        {/* Primary & Secondary Action CTAs */}
        <View style={styles.buttonGroup}>
          <TouchableOpacity
            style={styles.primaryButton}
            activeOpacity={0.88}
            onPress={() => router.replace('/(tabs)' as any)}
          >
            <Text style={styles.primaryButtonText}>Go to Homestay Dashboard</Text>
            <ArrowRight size={18} color="#ffffff" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            activeOpacity={0.8}
            onPress={() => router.replace('/(tabs)/settings' as any)}
          >
            <Text style={styles.secondaryButtonText}>View Subscription Settings</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
    alignItems: 'center',
  },
  iconWrapper: {
    marginBottom: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outerGlow: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#ecfdf5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#d1fae5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f5f3ff',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#ede9fe',
  },
  pillBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#7c3aed',
    letterSpacing: 0.8,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: 8,
    paddingHorizontal: 10,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  detailCard: {
    width: '100%',
    backgroundColor: '#f8fafc',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 20,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  cardLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  cardValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  amountText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#059669',
  },
  amountSub: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748b',
  },
  planPill: {
    backgroundColor: '#7c3aed',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  planPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  gatewayBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  gatewayBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  orderRefText: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#475569',
    maxWidth: 180,
  },
  divider: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 10,
  },
  featuresCard: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#ede9fe',
    marginBottom: 28,
  },
  featuresHeading: {
    fontSize: 13,
    fontWeight: '800',
    color: '#7c3aed',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 14,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 12,
  },
  featureIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#f5f3ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#1e293b',
  },
  buttonGroup: {
    width: '100%',
    gap: 12,
  },
  primaryButton: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#7c3aed',
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
  },
  secondaryButton: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
  },
});
