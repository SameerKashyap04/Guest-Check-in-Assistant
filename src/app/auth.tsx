import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  StyleSheet,
  TextInput,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import {
  signUpOwner,
  loginOwner,
  signInWithGoogleOwner,
  resetOwnerPassword,
} from '@/services/firebaseAuth';
import { useAuthStore } from '@/store/useAuthStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { PinScreen } from '@/features/auth/PinScreen';
import { C, R } from '@/theme/tokens';
import { Icon } from '@/components/v3/Icon';
import { useTranslation } from 'react-i18next';
import { assignLegacyUnassignedGuests } from '@/database';

const PROPERTY_TYPES = ['Homestay', 'Villa', 'Resort', 'Boutique Hotel', 'Apartment'];

export default function AuthScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const router = useRouter();

  const [tab, setTab] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [propertyType, setPropertyType] = useState('Homestay');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { isAuthenticated, isUnlocked, setOwner, checkPinSetup } = useAuthStore();
  const { setBusinessSetup, setPropertyId, setOwnerId } = useSettingsStore();

  useEffect(() => {
    checkPinSetup();
  }, [checkPinSetup]);

  // If owner is already authenticated and unlocked, redirect directly to dashboard
  useEffect(() => {
    if (isAuthenticated && isUnlocked) {
      setTimeout(() => router.replace('/(tabs)'), 50);
    }
  }, [isAuthenticated, isUnlocked]);

  // If owner is authenticated, show Security PIN & Biometrics Screen
  if (isAuthenticated && !isUnlocked) {
    return <PinScreen onSuccess={() => router.replace('/(tabs)')} />;
  }

  const handleGoogleAuth = async () => {
    try {
      setIsLoading(true);
      const profile = await signInWithGoogleOwner();
      setBusinessSetup(profile.businessName || 'My Homestay');
      if (profile.propertyId) {
        setPropertyId(profile.propertyId);
        assignLegacyUnassignedGuests(profile.propertyId).catch(() => {});
      }
      setOwner(profile);
      setOwnerId(profile.uid);
      useAuthStore.setState({ isUnlocked: true });

      router.replace('/(tabs)');
    } catch (err: any) {
      console.error('Google auth error:', err);
      Alert.alert(
        'Google Sign-In',
        err?.message || 'Google Sign-In was not completed.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleAuthSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Required Fields', 'Please enter your email and password.');
      return;
    }

    if (tab === 'signup' && !businessName.trim()) {
      Alert.alert('Required Fields', 'Please enter your Property Name.');
      return;
    }

    try {
      setIsLoading(true);
      let profile;

      if (tab === 'signup') {
        const fullBusinessName = `${businessName.trim()} (${propertyType})`;
        profile = await signUpOwner(
          email.trim(),
          password.trim(),
          fullBusinessName
        );
        setBusinessSetup(fullBusinessName);
      } else {
        profile = await loginOwner(email.trim(), password.trim());
        if (profile.businessName) {
          setBusinessSetup(profile.businessName);
        }
      }

      setOwner(profile);
      setOwnerId(profile.uid);
      if (profile.propertyId) {
        setPropertyId(profile.propertyId);
        assignLegacyUnassignedGuests(profile.propertyId).catch(() => {});
      }
      useAuthStore.setState({ isUnlocked: true });

      if (profile.isOffline) {
        Alert.alert(
          'Offline Mode Activated',
          'Logged in using local owner account. You can manage guest check-ins offline, and cloud sync will resume when internet is connected.',
          [{ text: 'Continue to App', onPress: () => router.replace('/(tabs)') }]
        );
      } else {
        setTimeout(() => router.replace('/(tabs)'), 50);
      }
    } catch (err: any) {
      console.error('Auth error', err);
      Alert.alert(
        'Authentication Notice',
        err?.message || 'Please check your credentials and try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      Alert.alert(
        'Email Required',
        'Please enter your registered email address above to reset your password.'
      );
      return;
    }
    try {
      await resetOwnerPassword(email.trim());
      Alert.alert(
        'Reset Link Sent',
        `A password reset link has been sent to ${email.trim()}. Please check your email inbox.`
      );
    } catch (err: any) {
      Alert.alert(
        'Reset Error',
        err?.message || 'Failed to send password reset email.'
      );
    }
  };

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Brand Top Bar */}
      <View style={s.header}>
        <View style={s.brand}>
          <View style={s.brandMark}>
            <Icon name="home" size={16} color="#fff" />
          </View>
          <Text style={s.brandText}>StayMate</Text>
        </View>
        <View style={s.osPill}>
          <Text style={s.osPillText}>HOSPITALITY OS</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 12,
            paddingBottom: Math.max(34, insets.bottom + 20),
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Hero Section */}
          <View style={s.hero}>
            <View style={s.heroBadgeOuter}>
              <View style={s.heroBadge}>
                <Icon name="shield" size={26} color="#FFFFFF" />
              </View>
            </View>
            <Text style={s.h1}>
              {tab === 'login' ? 'Welcome Back' : 'Set Up Your Property'}
            </Text>
            <Text style={s.heroText}>
              {tab === 'login'
                ? 'Sign in to access real-time check-ins, room inventory, and government compliance.'
                : 'Join homestays, villas, and boutique hotels managing check-ins with StayMate.'}
            </Text>

            {/* Feature Pills */}
            <View style={s.featureRow}>
              <View style={s.featurePill}>
                <Icon name="qr" size={11} color={C.primary} />
                <Text style={s.featurePillText}>QR Check-ins</Text>
              </View>
              <View style={s.featurePill}>
                <Icon name="check" size={11} color={C.emerald} />
                <Text style={s.featurePillText}>Police Form C</Text>
              </View>
              <View style={s.featurePill}>
                <Icon name="cloud" size={11} color="#2563EB" />
                <Text style={s.featurePillText}>Cloud & Offline</Text>
              </View>
            </View>
          </View>

          {/* Luxury Card Container */}
          <View style={s.authCard}>
            {/* Segmented Tabs Switcher */}
            <View style={s.tabs}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setTab('login')}
                style={[s.tab, tab === 'login' && s.activeTab]}
              >
                <Text style={[s.tabText, tab === 'login' && s.activeTabText]}>
                  Log in
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setTab('signup')}
                style={[s.tab, tab === 'signup' && s.activeTab]}
              >
                <Text style={[s.tabText, tab === 'signup' && s.activeTabText]}>
                  Sign up
                </Text>
              </TouchableOpacity>
            </View>

            {/* Form Fields */}
            {tab === 'signup' && (
              <>
                <View style={s.inputGroup}>
                  <Text style={s.inputLabel}>PROPERTY / BUSINESS NAME</Text>
                  <View style={s.inputField}>
                    <View style={s.inputIconBox}>
                      <Icon name="home" size={17} color={C.primary} />
                    </View>
                    <TextInput
                      value={businessName}
                      onChangeText={setBusinessName}
                      placeholder="e.g. Whispering Pines Homestay"
                      placeholderTextColor="#94A3B8"
                      style={s.textInput}
                      autoCapitalize="words"
                    />
                  </View>
                </View>

                {/* Property Type Selector */}
                <View style={[s.inputGroup, { marginTop: 4 }]}>
                  <Text style={s.inputLabel}>PROPERTY TYPE</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: 6, paddingTop: 4, paddingBottom: 2 }}
                  >
                    {PROPERTY_TYPES.map((t) => {
                      const isSelected = propertyType === t;
                      return (
                        <TouchableOpacity
                          key={t}
                          activeOpacity={0.8}
                          onPress={() => setPropertyType(t)}
                          style={[
                            s.typeChip,
                            isSelected && s.typeChipActive,
                          ]}
                        >
                          <Text
                            style={[
                              s.typeChipText,
                              isSelected && s.typeChipTextActive,
                            ]}
                          >
                            {t}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              </>
            )}

            <View style={s.inputGroup}>
              <Text style={s.inputLabel}>OWNER EMAIL ADDRESS</Text>
              <View style={s.inputField}>
                <View style={s.inputIconBox}>
                  <Icon name="mail" size={17} color={C.primary} />
                </View>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="owner@property.com"
                  placeholderTextColor="#94A3B8"
                  style={s.textInput}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            <View style={s.inputGroup}>
              <Text style={s.inputLabel}>
                {tab === 'login' ? 'PASSWORD' : 'CREATE STRONG PASSWORD'}
              </Text>
              <View style={s.inputField}>
                <View style={s.inputIconBox}>
                  <Icon name="lock" size={17} color={C.primary} />
                </View>
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder={
                    tab === 'login' ? 'Enter your password' : 'At least 8 characters'
                  }
                  placeholderTextColor="#94A3B8"
                  secureTextEntry={!showPassword}
                  style={s.textInput}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setShowPassword(!showPassword)}
                  style={s.eyeBtn}
                >
                  <Icon
                    name={showPassword ? 'eyeOff' : 'eye'}
                    size={17}
                    color="#64748B"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {tab === 'login' && (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={handleForgotPassword}
                style={s.forgotWrap}
              >
                <Text style={s.forgot}>Forgot password?</Text>
              </TouchableOpacity>
            )}

            {/* Primary Action Button */}
            <TouchableOpacity
              activeOpacity={0.88}
              onPress={handleAuthSubmit}
              disabled={isLoading}
              style={[s.mainBtn, isLoading && { opacity: 0.8 }]}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={s.mainBtnText}>
                    {tab === 'login'
                      ? 'Sign In to Property'
                      : 'Create Property Account'}
                  </Text>
                  <Icon name="arrowRight" size={16} color="#FFFFFF" />
                </View>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View style={s.div}>
              <View style={s.line} />
              <Text style={s.or}>or connect with</Text>
              <View style={s.line} />
            </View>

            {/* Google Sign-in Button */}
            <TouchableOpacity
              activeOpacity={0.85}
              style={s.googleBtn}
              onPress={handleGoogleAuth}
              disabled={isLoading}
            >
              <View style={s.googleEmblem}>
                <Text style={s.googleLetter}>G</Text>
              </View>
              <Text style={s.googleBtnText}>Continue with Google</Text>
            </TouchableOpacity>
          </View>

          {/* Security & Compliance Footer */}
          <View style={s.securityBanner}>
            <Icon name="shield" size={15} color={C.primary} />
            <Text style={s.securityBannerText}>
              256-Bit Bank-Grade Encryption · Police Form C Ready
            </Text>
          </View>

          <Text style={s.termsText}>
            By signing in, you agree to StayMate's{' '}
            <Text style={{ color: '#0F172A', fontWeight: '700' }}>Terms of Service</Text> and{' '}
            <Text style={{ color: '#0F172A', fontWeight: '700' }}>Privacy Policy</Text>.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandMark: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: C.primary,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  brandText: {
    fontFamily: 'Inter',
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  osPill: {
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 6,
    backgroundColor: '#EDE9FE',
  },
  osPillText: {
    fontFamily: 'Inter',
    fontSize: 9.5,
    fontWeight: '800',
    color: C.primary,
    letterSpacing: 0.6,
  },
  hero: {
    alignItems: 'center',
    paddingTop: 18,
    paddingBottom: 16,
  },
  heroBadgeOuter: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: '#F3E8FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  heroBadge: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: C.primary,
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  h1: {
    fontFamily: 'Inter',
    fontSize: 23,
    fontWeight: '800',
    letterSpacing: -0.5,
    color: '#0F172A',
    textAlign: 'center',
  },
  heroText: {
    fontFamily: 'Inter',
    fontSize: 13,
    lineHeight: 19,
    color: '#64748B',
    textAlign: 'center',
    maxWidth: 320,
    marginTop: 5,
  },
  featureRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
  },
  featurePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  featurePillText: {
    fontFamily: 'Inter',
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },
  authCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOpacity: 0.04,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
    marginTop: 6,
  },
  tabs: {
    height: 46,
    borderRadius: 13,
    backgroundColor: '#F1F5F9',
    padding: 3,
    flexDirection: 'row',
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeTab: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  tabText: {
    fontFamily: 'Inter',
    fontSize: 13.5,
    fontWeight: '600',
    color: '#64748B',
  },
  activeTabText: {
    fontWeight: '800',
    color: C.primary,
  },
  inputGroup: {
    marginBottom: 13,
  },
  inputLabel: {
    fontFamily: 'Inter',
    fontSize: 10.5,
    fontWeight: '800',
    color: '#475569',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  inputField: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 13,
    paddingHorizontal: 12,
    height: 50,
  },
  inputIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#EDE9FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '500',
    color: '#0F172A',
    height: '100%',
  },
  eyeBtn: {
    padding: 6,
  },
  typeChip: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  typeChipActive: {
    backgroundColor: '#EDE9FE',
    borderColor: C.primary,
  },
  typeChipText: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  typeChipTextActive: {
    color: C.primary,
    fontWeight: '800',
  },
  forgotWrap: {
    alignSelf: 'flex-end',
    marginTop: 2,
    marginBottom: 14,
  },
  forgot: {
    fontFamily: 'Inter',
    fontSize: 12.5,
    fontWeight: '700',
    color: C.primary,
  },
  mainBtn: {
    height: 50,
    borderRadius: 14,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: C.primary,
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    marginTop: 4,
  },
  mainBtnText: {
    fontFamily: 'Inter',
    fontSize: 14.5,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  div: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 16,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  or: {
    fontFamily: 'Inter',
    fontSize: 11.5,
    fontWeight: '600',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  googleBtn: {
    height: 48,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
  },
  googleEmblem: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleLetter: {
    fontFamily: 'Inter',
    fontSize: 13.5,
    fontWeight: '900',
    color: '#4285F4',
  },
  googleBtnText: {
    fontFamily: 'Inter',
    fontSize: 13.5,
    fontWeight: '700',
    color: '#1E293B',
  },
  securityBanner: {
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 9,
    paddingHorizontal: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  securityBannerText: {
    fontFamily: 'Inter',
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  termsText: {
    fontFamily: 'Inter',
    fontSize: 11,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 16,
  },
});

