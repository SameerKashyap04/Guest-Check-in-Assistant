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
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
import { C } from '@/theme/tokens';
import { Icon } from '@/components/v3/Icon';
import { assignLegacyUnassignedGuests } from '@/database';

const GoogleLogo = require('../../assets/images/google-logo.png');
const StayMateLogo = require('../../assets/images/staymate-logo.png');

export default function AuthScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [tab, setTab] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [businessName, setBusinessName] = useState('');
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
      Alert.alert('Required Fields', 'Please enter your property name.');
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
          'Logged in using local owner account. Cloud sync will resume when internet is connected.',
          [{ text: 'Continue', onPress: () => router.replace('/(tabs)') }]
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
        'Please enter your registered email address to reset your password.'
      );
      return;
    }
    try {
      await resetOwnerPassword(email.trim());
      Alert.alert(
        'Reset Link Sent',
        `A password reset link has been sent to ${email.trim()}.`
      );
    } catch (err: any) {
      Alert.alert(
        'Reset Error',
        err?.message || 'Failed to send password reset email.'
      );
    }
  };

  return (
    <View style={s.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{
            paddingTop: 160,
            paddingHorizontal: 24,
            paddingBottom: 28,
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={s.header}>
            <Image
              source={StayMateLogo}
              style={s.brandLogo}
              resizeMode="contain"
            />
            <Text style={s.title}>
              {tab === 'login' ? 'Welcome back' : 'Create account'}
            </Text>
            <Text style={s.subtitle}>
              {tab === 'login'
                ? 'Sign in to access your property'
                : 'Start managing your check-ins'}
            </Text>
          </View>

          {/* Segmented Control */}
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

          {/* Inputs */}
          <View style={s.form}>
            {tab === 'signup' && (
              <View style={s.inputGroup}>
                <Text style={s.label}>Property name</Text>
                <View style={s.inputWrapper}>
                  <View style={s.inputIcon}>
                    <Icon name="home" size={18} color="#71717A" />
                  </View>
                  <TextInput
                    value={businessName}
                    onChangeText={setBusinessName}
                    placeholder="e.g. Sunrise Homestay"
                    placeholderTextColor="#A1A1AA"
                    style={s.input}
                    autoCapitalize="words"
                  />
                </View>
              </View>
            )}

            <View style={s.inputGroup}>
              <Text style={s.label}>Email address</Text>
              <View style={s.inputWrapper}>
                <View style={s.inputIcon}>
                  <Icon name="mail" size={18} color="#71717A" />
                </View>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="owner@property.com"
                  placeholderTextColor="#A1A1AA"
                  style={s.input}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            <View style={s.inputGroup}>
              <Text style={s.label}>Password</Text>
              <View style={s.inputWrapper}>
                <View style={s.inputIcon}>
                  <Icon name="lock" size={18} color="#71717A" />
                </View>
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder={
                    tab === 'login' ? 'Enter password' : 'At least 8 characters'
                  }
                  placeholderTextColor="#A1A1AA"
                  secureTextEntry={!showPassword}
                  style={s.input}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setShowPassword(!showPassword)}
                  style={s.eyeBtn}
                >
                  <Icon
                    name={showPassword ? 'eyeOff' : 'eye'}
                    size={18}
                    color="#71717A"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {tab === 'login' && (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={handleForgotPassword}
                style={s.forgotBtn}
              >
                <Text style={s.forgotText}>Forgot password?</Text>
              </TouchableOpacity>
            )}

            {/* Submit Button */}
            <TouchableOpacity
              activeOpacity={0.88}
              onPress={handleAuthSubmit}
              disabled={isLoading}
              style={[s.submitBtn, isLoading && { opacity: 0.8 }]}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={s.submitBtnText}>
                  {tab === 'login' ? 'Log in' : 'Create account'}
                </Text>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View style={s.divider}>
              <View style={s.dividerLine} />
              <Text style={s.dividerText}>or</Text>
              <View style={s.dividerLine} />
            </View>

            {/* Google Button */}
            <TouchableOpacity
              activeOpacity={0.85}
              style={s.googleBtn}
              onPress={handleGoogleAuth}
              disabled={isLoading}
            >
              <Image
                source={GoogleLogo}
                style={s.googleImage}
                resizeMode="contain"
              />
              <Text style={s.googleBtnText}>Continue with Google</Text>
            </TouchableOpacity>
          </View>

          {/* Footer note */}
          <Text style={s.footerText}>
            By continuing, you agree to StayMate's{' '}
            <Text style={{ color: '#09090B', fontWeight: '600' }}>Terms</Text> and{' '}
            <Text style={{ color: '#09090B', fontWeight: '600' }}>Privacy</Text>.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  brandLogo: {
    width: 210,
    height: 52,
    marginBottom: 16,
  },
  title: {
    fontFamily: 'Inter',
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
    color: '#09090B',
  },
  subtitle: {
    fontFamily: 'Inter',
    fontSize: 14,
    color: '#71717A',
    marginTop: 4,
  },
  tabs: {
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F4F4F5',
    padding: 3,
    flexDirection: 'row',
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeTab: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1.5 },
    elevation: 2,
  },
  tabText: {
    fontFamily: 'Inter',
    fontSize: 13.5,
    fontWeight: '600',
    color: '#71717A',
  },
  activeTabText: {
    fontWeight: '700',
    color: '#09090B',
  },
  form: {
    width: '100%',
  },
  inputGroup: {
    marginBottom: 13,
  },
  label: {
    fontFamily: 'Inter',
    fontSize: 12.5,
    fontWeight: '600',
    color: '#18181B',
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E4E4E7',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
  },
  inputIcon: {
    marginRight: 10,
    width: 20,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '500',
    color: '#09090B',
    height: '100%',
  },
  eyeBtn: {
    padding: 6,
  },
  forgotBtn: {
    alignSelf: 'flex-end',
    marginTop: 2,
    marginBottom: 16,
  },
  forgotText: {
    fontFamily: 'Inter',
    fontSize: 12.5,
    fontWeight: '600',
    color: '#7C3AED',
  },
  submitBtn: {
    height: 48,
    borderRadius: 12,
    backgroundColor: '#09090B',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
    marginTop: 4,
  },
  submitBtnText: {
    fontFamily: 'Inter',
    fontSize: 14.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 18,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E4E4E7',
  },
  dividerText: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '500',
    color: '#A1A1AA',
  },
  googleBtn: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E4E4E7',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
  },
  googleImage: {
    width: 18,
    height: 18,
  },
  googleBtnText: {
    fontFamily: 'Inter',
    fontSize: 13.5,
    fontWeight: '600',
    color: '#18181B',
  },
  footerText: {
    fontFamily: 'Inter',
    fontSize: 11.5,
    color: '#A1A1AA',
    textAlign: 'center',
    marginTop: 22,
    lineHeight: 17,
  },
});



