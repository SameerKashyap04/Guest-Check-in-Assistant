import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  KeyboardAvoidingView, Platform, Alert,
  ActivityIndicator, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { Mail, Lock, Building2, UserPlus, LogIn, LockKeyhole } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { signUpOwner, loginOwner, signInWithGoogleOwner, resetOwnerPassword } from '@/services/firebaseAuth';
import { useAuthStore } from '@/store/useAuthStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { PinScreen } from '@/features/auth/PinScreen';
import { GoogleLogo } from '@/components/GoogleLogo';
import { useTranslation } from 'react-i18next';
import { assignLegacyUnassignedGuests } from '@/database';
import { AIRBNB } from '@/theme/airbnb';

// ─── Airbnb Auth Screen for StayMate ─────────────────────────────────────────
// Modern, clean Rausch identity matching staymate-airbnb-redesign
// ─────────────────────────────────────────────────────────────────────────────

export default function AuthScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  const [tab, setTab] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [businessName, setBusinessName] = useState('');
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

  // If owner is authenticated, show Security PIN & Biometrics Screen (Setup or Unlock)
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
      Alert.alert('Google Sign-In', err?.message || 'Google Sign-In was not completed.');
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
      Alert.alert('Required Fields', 'Please enter your Homestay Property Name.');
      return;
    }

    try {
      setIsLoading(true);
      let profile;

      if (tab === 'signup') {
        profile = await signUpOwner(email.trim(), password.trim(), businessName.trim());
        setBusinessSetup(businessName.trim());
      } else {
        profile = await loginOwner(email.trim(), password.trim());
      }

      if (profile) {
        setOwner(profile);
        setOwnerId(profile.uid);
        if (profile.propertyId) {
          setPropertyId(profile.propertyId);
          assignLegacyUnassignedGuests(profile.propertyId).catch(() => {});
        }
        if (profile.businessName) {
          setBusinessSetup(profile.businessName);
        }

        useAuthStore.setState({ isUnlocked: true });
        router.replace('/(tabs)');
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      Alert.alert('Authentication Failed', err?.message || 'Unable to sign in.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero Well */}
          <View style={styles.iconWell}>
            <LockKeyhole size={30} color="#ffffff" />
          </View>

          <Text style={styles.title}>
            {tab === 'login' ? 'Welcome back' : 'Create an account'}
          </Text>
          <Text style={styles.subtitle}>
            {tab === 'login'
              ? 'Sign in to manage check-ins, rooms & compliance'
              : 'Start your 14-day free trial of StayMate Pro'}
          </Text>

          {/* Segmented Switcher */}
          <View style={styles.segmentTrack}>
            <TouchableOpacity
              style={[styles.segmentBtn, tab === 'login' && styles.segmentBtnActive]}
              activeOpacity={0.8}
              onPress={() => setTab('login')}
            >
              <LogIn size={15} color={tab === 'login' ? AIRBNB.colors.ink : AIRBNB.colors.muted} />
              <Text style={[styles.segmentText, tab === 'login' && styles.segmentTextActive]}>
                Sign In
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.segmentBtn, tab === 'signup' && styles.segmentBtnActive]}
              activeOpacity={0.8}
              onPress={() => setTab('signup')}
            >
              <UserPlus size={15} color={tab === 'signup' ? AIRBNB.colors.ink : AIRBNB.colors.muted} />
              <Text style={[styles.segmentText, tab === 'signup' && styles.segmentTextActive]}>
                New Property
              </Text>
            </TouchableOpacity>
          </View>

          {/* Form Card */}
          <View style={styles.formCard}>
            {tab === 'signup' && (
              <Input
                label="Property / Business Name"
                placeholder="e.g. Sunrise Homestay"
                autoCapitalize="words"
                value={businessName}
                onChangeText={setBusinessName}
                icon={<Building2 size={18} color={AIRBNB.colors.mutedSoft} />}
              />
            )}

            <Input
              label="Email Address"
              placeholder="owner@homestay.com"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
              icon={<Mail size={18} color={AIRBNB.colors.mutedSoft} />}
            />

            <Input
              label="Password"
              placeholder="••••••••"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              icon={<Lock size={18} color={AIRBNB.colors.mutedSoft} />}
            />

            {tab === 'login' && (
              <TouchableOpacity
                onPress={async () => {
                  if (!email.trim()) {
                    Alert.alert('Email Required', 'Please enter your registered email address above.');
                    return;
                  }
                  try {
                    await resetOwnerPassword(email.trim());
                    Alert.alert('Reset Link Sent', `A password reset link has been sent to ${email.trim()}.`);
                  } catch (err: any) {
                    Alert.alert('Reset Error', err?.message || 'Failed to send password reset email.');
                  }
                }}
                activeOpacity={0.7}
                style={{ alignSelf: 'flex-end', marginTop: 2, marginBottom: 16 }}
              >
                <Text style={{ ...AIRBNB.typography.caption, color: AIRBNB.colors.primary, fontWeight: '600' }}>
                  Forgot password?
                </Text>
              </TouchableOpacity>
            )}

            {/* Submit Button */}
            <Button
              label={tab === 'signup' ? 'Create Property Account' : 'Sign In to StayMate'}
              variant="primary"
              isLoading={isLoading}
              onPress={handleAuthSubmit}
            />

            {/* Google Sign-in */}
            <TouchableOpacity
              onPress={handleGoogleAuth}
              disabled={isLoading}
              activeOpacity={0.8}
              style={styles.googleBtn}
            >
              <GoogleLogo size={20} />
              <Text style={styles.googleBtnText}>Continue with Google</Text>
            </TouchableOpacity>
          </View>

          {/* Footer Note */}
          <Text style={styles.footerText}>
            StayMate v1.2.0 · Designed for Indian Homestays &amp; Hotels
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: AIRBNB.colors.canvas,
  },
  scroll: {
    paddingHorizontal: 24,
    paddingTop: 30,
    paddingBottom: 40,
    alignItems: 'center',
  },
  iconWell: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: AIRBNB.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    ...AIRBNB.shadow.fab,
  },
  title: {
    ...AIRBNB.typography.displayLg,
    color: AIRBNB.colors.ink,
    textAlign: 'center',
  },
  subtitle: {
    ...AIRBNB.typography.bodySm,
    color: AIRBNB.colors.muted,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 24,
    maxWidth: 290,
  },
  segmentTrack: {
    flexDirection: 'row',
    backgroundColor: AIRBNB.colors.surfaceStrong,
    borderRadius: AIRBNB.radius.full,
    padding: 3,
    width: '100%',
    marginBottom: 20,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: AIRBNB.radius.full,
  },
  segmentBtnActive: {
    backgroundColor: AIRBNB.colors.canvas,
    ...AIRBNB.shadow.card,
  },
  segmentText: {
    ...AIRBNB.typography.bodySm,
    fontWeight: '500',
    color: AIRBNB.colors.muted,
  },
  segmentTextActive: {
    fontWeight: '700',
    color: AIRBNB.colors.ink,
  },
  formCard: {
    width: '100%',
    backgroundColor: AIRBNB.colors.canvas,
    borderWidth: 1,
    borderColor: AIRBNB.colors.hairlineSoft,
    borderRadius: AIRBNB.radius.md,
    padding: 20,
    gap: 12,
    ...AIRBNB.shadow.card,
  },
  googleBtn: {
    height: 50,
    borderRadius: AIRBNB.radius.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: AIRBNB.colors.hairline,
    backgroundColor: AIRBNB.colors.canvas,
    marginTop: 4,
  },
  googleBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: AIRBNB.colors.ink,
  },
  footerText: {
    ...AIRBNB.typography.micro,
    color: AIRBNB.colors.mutedSoft,
    marginTop: 28,
  },
});
