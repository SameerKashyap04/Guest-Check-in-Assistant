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
  useColorScheme,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Input } from '@/components/Input';
import { ShieldCheck, Mail, Lock, Building2, UserPlus, LogIn, Zap } from 'lucide-react-native';
import { useRouter, Stack } from 'expo-router';
import { signUpOwner, loginOwner, signInWithGoogleOwner, resetOwnerPassword } from '@/services/firebaseAuth';
import { useAuthStore } from '@/store/useAuthStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { PinScreen } from '@/features/auth/PinScreen';
import { GoogleLogo } from '@/components/GoogleLogo';
import { useTranslation } from 'react-i18next';

import { assignLegacyUnassignedGuests } from '@/database';

export default function AuthScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

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
      Alert.alert('Authentication Notice', err?.message || 'Please check your credentials and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Theme-aware colors using plain StyleSheet (no NativeWind dark: needed)
  const bg = isDark ? '#0D0F17' : '#F8FAFC';
  const cardBg = isDark ? '#181A24' : '#FFFFFF';
  const cardBorder = isDark ? '#1F2937' : 'rgba(0,0,0,0.08)';
  const textPrimary = isDark ? '#F9FAFB' : '#111827';
  const textMuted = isDark ? '#9CA3AF' : '#6B7280';
  const headerBorder = isDark ? '#1F2937' : 'rgba(0,0,0,0.08)';
  const tabBg = isDark ? 'rgba(31,41,55,0.8)' : '#F3F4F6';
  const activeTabBg = isDark ? '#181A24' : '#FFFFFF';
  const submitBtnBg = isDark ? '#FFFFFF' : '#000000';
  const submitBtnText = isDark ? '#000000' : '#FFFFFF';

  return (
    <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={[styles.root, { backgroundColor: bg }]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: headerBorder }]}>
        <Text style={[styles.headerTitle, { color: textPrimary }]}>{t('ownerPortalTitle')}</Text>
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
        style={{ flex: 1 }}
      >
        <ScrollView 
          contentContainerStyle={[styles.scrollContent, { flexGrow: 1 }]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >

          {/* Card */}
          <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>

            {/* Icon Header */}
            <View style={styles.iconHeader}>
              <View style={styles.shieldCircle}>
                <ShieldCheck size={36} color="#38BDF8" />
              </View>
              <Text style={[styles.cardTitle, { color: textPrimary }]}>{t('ownerAccount')}</Text>
              <Text style={[styles.cardSubtitle, { color: textMuted }]}>
                {t('ownerAccountDesc')}
              </Text>
            </View>

            {/* Tabs */}
            <View style={[styles.tabBar, { backgroundColor: tabBg }]}>
              <TouchableOpacity
                onPress={() => setTab('login')}
                style={[styles.tab, tab === 'login' && [styles.activeTab, { backgroundColor: activeTabBg }]]}
              >
                <LogIn size={15} color={tab === 'login' ? '#38BDF8' : textMuted} />
                <Text style={[styles.tabText, { color: tab === 'login' ? textPrimary : textMuted }]}>{t('loginTab')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setTab('signup')}
                style={[styles.tab, tab === 'signup' && [styles.activeTab, { backgroundColor: activeTabBg }]]}
              >
                <UserPlus size={15} color={tab === 'signup' ? '#38BDF8' : textMuted} />
                <Text style={[styles.tabText, { color: tab === 'signup' ? textPrimary : textMuted }]}>{t('signupTab')}</Text>
              </TouchableOpacity>
            </View>

            {/* Form */}
            {tab === 'signup' && (
              <Input
                label={t('propertyName')}
                placeholder="e.g. Sameer Homestay"
                autoCapitalize="words"
                autoCorrect={false}
                returnKeyType="next"
                value={businessName}
                onChangeText={setBusinessName}
                icon={<Building2 size={18} color="#9498AA" />}
              />
            )}

            <Input
              label={t('emailAddress')}
              placeholder="owner@homestay.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              textContentType="emailAddress"
              returnKeyType="next"
              value={email}
              onChangeText={setEmail}
              icon={<Mail size={18} color="#9498AA" />}
            />

            <Input
              label={t('password')}
              placeholder="••••••••"
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="password"
              returnKeyType="done"
              onSubmitEditing={handleAuthSubmit}
              value={password}
              onChangeText={setPassword}
              icon={<Lock size={18} color="#9498AA" />}
            />

            {tab === 'login' && (
              <TouchableOpacity
                onPress={async () => {
                  if (!email.trim()) {
                    Alert.alert('Email Required', 'Please enter your registered email address above to reset your password.');
                    return;
                  }
                  try {
                    await resetOwnerPassword(email.trim());
                    Alert.alert('Reset Link Sent', `A password reset link has been sent to ${email.trim()}. Please check your email inbox.`);
                  } catch (err: any) {
                    Alert.alert('Reset Error', err?.message || 'Failed to send password reset email.');
                  }
                }}
                activeOpacity={0.7}
                style={{ alignSelf: 'flex-end', marginTop: -6, marginBottom: 16 }}
              >
                <Text style={{ fontSize: 13, fontWeight: '600', color: isDark ? '#60A5FA' : '#2563EB' }}>
                  Forgot Password?
                </Text>
              </TouchableOpacity>
            )}

            {/* Submit */}
            <TouchableOpacity
              onPress={handleAuthSubmit}
              disabled={isLoading}
              activeOpacity={0.8}
              style={[styles.submitBtn, { backgroundColor: submitBtnBg, opacity: isLoading ? 0.7 : 1 }]}
            >
              {isLoading && <ActivityIndicator size="small" color={isDark ? '#000' : '#fff'} style={{ marginRight: 8 }} />}
              <Text style={[styles.submitBtnText, { color: submitBtnText }]}>
                {isLoading ? t('processing') : tab === 'signup' ? t('createOwnerAccount') : t('loginToDashboard')}
              </Text>
            </TouchableOpacity>

            {/* Google Sign-In */}
            <TouchableOpacity
              onPress={handleGoogleAuth}
              disabled={isLoading}
              activeOpacity={0.8}
              style={[styles.googleBtn, { opacity: isLoading ? 0.7 : 1 }]}
            >
              <GoogleLogo size={20} />
              <Text style={styles.googleBtnText}>
                {t('continueWithGoogle')}
              </Text>
            </TouchableOpacity>

          </View>

          {/* Devify Branding Footer */}
          <View style={{ alignItems: 'center', marginTop: 20, marginBottom: 16, gap: 6 }}>
            <TouchableOpacity 
              onPress={() => Linking.openURL('https://www.devify.co.in')}
              activeOpacity={0.7}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: isDark ? 'rgba(56,189,248,0.1)' : 'rgba(2,132,199,0.08)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 }}
            >
              <Text style={{ fontSize: 12, fontWeight: '700', color: isDark ? '#38BDF8' : '#0284C7' }}>
                Crafted with ❤️ by Devify • www.devify.co.in
              </Text>
            </TouchableOpacity>
            <Text style={{ fontSize: 11, fontWeight: '600', color: textMuted }}>
              Guest Check-in Assistant v1.2.0
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 16, fontWeight: '700' },
  scrollContent: { padding: 20, flexGrow: 1, justifyContent: 'center' },
  card: {
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  iconHeader: { alignItems: 'center', marginBottom: 24 },
  shieldCircle: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: 'rgba(56,189,248,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  cardTitle: { fontSize: 22, fontWeight: '800', textAlign: 'center' },
  cardSubtitle: { fontSize: 12, textAlign: 'center', marginTop: 4, paddingHorizontal: 16, lineHeight: 18 },
  tabBar: {
    flexDirection: 'row',
    borderRadius: 16,
    padding: 4,
    marginBottom: 24,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  activeTab: {
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  tabText: { fontSize: 12, fontWeight: '700' },
  submitBtn: {
    marginTop: 8,
    paddingVertical: 14,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnText: { fontSize: 14, fontWeight: '800' },
  googleBtn: {
    marginTop: 10,
    paddingVertical: 14,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: 'rgba(66,133,244,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(66,133,244,0.3)',
  },
  googleBtnText: { fontSize: 14, fontWeight: '700', color: '#4285F4' },
  debugDivider: { marginTop: 16, paddingTop: 16, borderTopWidth: 1 },
  debugBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(245,158,11,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.3)',
  },
  debugBtnText: { fontSize: 13, fontWeight: '700', color: '#D97706' },
});
