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
import { Field, PrimaryButton } from '@/components/v3/Ui';
import { useTranslation } from 'react-i18next';
import { assignLegacyUnassignedGuests } from '@/database';

export default function AuthScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const router = useRouter();

  const [tab, setTab] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { isAuthenticated, isUnlocked, setOwner, checkPinSetup } =
    useAuthStore();
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
      Alert.alert(
        'Required Fields',
        'Please enter your Homestay Property Name.'
      );
      return;
    }

    try {
      setIsLoading(true);
      let profile;

      if (tab === 'signup') {
        profile = await signUpOwner(
          email.trim(),
          password.trim(),
          businessName.trim()
        );
        setBusinessSetup(businessName.trim());
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

      {/* Top bar */}
      <View style={s.header}>
        <View style={s.brand}>
          <View style={s.brandMark}>
            <Icon name="home" size={16} color="#fff" />
          </View>
          <Text style={s.brandText}>StayMate</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{
            padding: 20,
            paddingBottom: Math.max(40, insets.bottom + 20),
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Hero */}
          <View style={s.hero}>
            <View style={s.heroMark}>
              <Icon name="shield" size={28} color={C.primary} />
            </View>
            <Text style={s.h1}>Owner Account</Text>
            <Text style={s.heroText}>
              Secure access to your property, guests and self check-ins.
            </Text>
            <View style={s.trust}>
              <Icon name="lock" size={13} color={C.primary} />
              <Text style={s.trustText}>Secure owner access</Text>
            </View>
          </View>

          {/* Segmented Tabs */}
          <View style={s.tabs}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setTab('login')}
              style={[s.tab, tab === 'login' && s.activeTab]}
            >
              <Text
                style={[s.tabText, tab === 'login' && s.activeTabText]}
              >
                Log in
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setTab('signup')}
              style={[s.tab, tab === 'signup' && s.activeTab]}
            >
              <Text
                style={[s.tabText, tab === 'signup' && s.activeTabText]}
              >
                Sign up
              </Text>
            </TouchableOpacity>
          </View>

          {/* Form Fields */}
          {tab === 'signup' && (
            <Field
              label="Property / business name"
              value={businessName}
              onChangeText={setBusinessName}
              placeholder="e.g. Sunrise Homestay"
              icon="home"
            />
          )}

          <Field
            label="Email address"
            value={email}
            onChangeText={setEmail}
            placeholder="owner@homestay.com"
            icon="mail"
            keyboardType="email-address"
          />

          <Field
            label={tab === 'login' ? 'Password' : 'Create password'}
            value={password}
            onChangeText={setPassword}
            placeholder={
              tab === 'login' ? 'Enter your password' : 'At least 8 characters'
            }
            secure
            icon="lock"
          />

          {tab === 'login' && (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleForgotPassword}
              style={s.forgotWrap}
            >
              <Text style={s.forgot}>Forgot password?</Text>
            </TouchableOpacity>
          )}

          <View style={{ marginTop: tab === 'login' ? 6 : 18 }}>
            <PrimaryButton
              label={
                isLoading
                  ? 'Processing…'
                  : tab === 'login'
                  ? 'Log in to StayMate'
                  : 'Create owner account'
              }
              onPress={handleAuthSubmit}
              disabled={isLoading}
            />
          </View>

          {/* Divider */}
          <View style={s.div}>
            <View style={s.line} />
            <Text style={s.or}>or</Text>
            <View style={s.line} />
          </View>

          {/* Google Sign-in */}
          <TouchableOpacity
            activeOpacity={0.85}
            style={s.google}
            onPress={handleGoogleAuth}
            disabled={isLoading}
          >
            <Text style={s.googleText}>G</Text>
            <Text style={s.googleLabel}>Continue with Google</Text>
          </TouchableOpacity>

          <Text style={s.note}>
            By continuing, you agree to StayMate's{' '}
            <Text style={{ color: '#222222', fontWeight: '700' }}>Terms</Text> and{' '}
            <Text style={{ color: '#222222', fontWeight: '700' }}>Privacy</Text>.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#ebebeb',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandMark: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandText: {
    fontFamily: 'Inter',
    fontSize: 16,
    fontWeight: '800',
    color: '#222222',
  },
  hero: {
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 20,
  },
  heroMark: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: '#EDE9FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  h1: {
    fontFamily: 'Inter',
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.4,
    color: '#222222',
  },
  heroText: {
    fontFamily: 'Inter',
    fontSize: 13.5,
    lineHeight: 20,
    color: '#6a6a6a',
    textAlign: 'center',
    maxWidth: 340,
    marginTop: 6,
  },
  trust: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: R.full,
    backgroundColor: '#EDE9FE',
  },
  trustText: {
    fontFamily: 'Inter',
    fontSize: 11,
    fontWeight: '700',
    color: C.primary,
  },
  tabs: {
    height: 50,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    padding: 4,
    flexDirection: 'row',
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeTab: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  tabText: {
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '700',
    color: '#6a6a6a',
  },
  activeTabText: {
    color: '#222222',
  },
  forgotWrap: {
    alignSelf: 'flex-end',
    marginTop: 8,
    marginBottom: 14,
  },
  forgot: {
    fontFamily: 'Inter',
    fontSize: 13,
    fontWeight: '700',
    color: C.primary,
  },
  div: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 20,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: '#ebebeb',
  },
  or: {
    fontFamily: 'Inter',
    fontSize: 12,
    color: '#929292',
  },
  google: {
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#dddddd',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    backgroundColor: '#fff',
  },
  googleText: {
    fontFamily: 'Inter',
    fontSize: 18,
    fontWeight: '900',
    color: '#4285F4',
  },
  googleLabel: {
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '700',
    color: '#222222',
  },
  note: {
    fontFamily: 'Inter',
    fontSize: 11.5,
    color: '#929292',
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 18,
  },
});
