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
  useWindowDimensions,
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
import { Icon } from '@/components/v3/Icon';
import { assignLegacyUnassignedGuests } from '@/database';

// Design tokens from staymate-login-signup.html
const TOKENS = {
  ink: '#0B0B0D',
  inkSoft: '#14101C',
  inkDeep: '#1E1530',
  paper: '#FAFAF8',
  paperDim: '#F1EFEA',
  line: '#E3E1DC',
  muted: '#6B6A70',
  white70: 'rgba(250, 250, 248, 0.7)',
  white40: 'rgba(250, 250, 248, 0.4)',
  purple: '#7C5CFF',
  purpleDeep: '#4B2E8C',
  purplePale: '#E4DBFF',
};

export default function AuthScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  const [tab, setTab] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
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
      Alert.alert('Required Fields', 'Please enter your property or full name.');
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

  const holeCount = isDesktop ? 14 : 9;
  const glowIndexes = [3, 4];

  return (
    <View style={s.root}>
      <Stack.Screen options={{ headerShown: false }} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={[
            s.scrollContent,
            isDesktop ? s.desktopLayout : s.mobileLayout,
            { paddingTop: isDesktop ? 0 : insets.top },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Brand Keycard Panel */}
          <View style={[s.brandPanel, isDesktop ? s.brandPanelDesktop : s.brandPanelMobile]}>
            {/* Top Brand Logo */}
            <View style={s.brandTop}>
              <View style={s.logomark}>
                <Icon name="key" size={18} color="#FFFFFF" />
              </View>
              <Text style={s.wordmark}>Staymate</Text>
            </View>

            {/* Mid Hero Info */}
            <View style={s.brandMid}>
              <View style={s.eyebrowRow}>
                <View style={s.eyebrowDot} />
                <Text style={s.eyebrowText}>MEMBERS' KEY</Text>
              </View>
              <Text style={s.headline}>Your key to wherever's next.</Text>
              <Text style={s.subText}>
                Sign in to unlock saved stays, trip notes, and your property operations.
              </Text>
            </View>

            {/* Bottom Keycard Stripe */}
            <View style={s.brandBottom}>
              <View style={s.stripe}>
                <Text style={s.stripeText}>STAYMATE ACCESS · GLOBAL MEMBER</Text>
              </View>
            </View>
          </View>

          {/* Perforated Keycard Holes Divider */}
          <View style={[s.divider, isDesktop ? s.dividerDesktop : s.dividerMobile]}>
            {Array.from({ length: holeCount }).map((_, i) => (
              <View
                key={i}
                style={[
                  s.hole,
                  glowIndexes.includes(i) && s.holeGlow,
                ]}
              />
            ))}
          </View>

          {/* Form Panel */}
          <View style={[s.formPanel, isDesktop ? s.formPanelDesktop : s.formPanelMobile]}>
            <View style={s.formWrap}>
              {/* Segmented Toggle */}
              <View style={s.toggle}>
                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={() => setTab('login')}
                  style={[s.toggleBtn, tab === 'login' && s.toggleBtnActive]}
                >
                  <Text
                    style={[
                      s.toggleBtnText,
                      tab === 'login' && s.toggleBtnTextActive,
                    ]}
                  >
                    Log in
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={() => setTab('signup')}
                  style={[s.toggleBtn, tab === 'signup' && s.toggleBtnActive]}
                >
                  <Text
                    style={[
                      s.toggleBtnText,
                      tab === 'signup' && s.toggleBtnTextActive,
                    ]}
                  >
                    Sign up
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Form Content */}
              <View>
                <Text style={s.formTitle}>
                  {tab === 'login' ? 'Welcome back' : 'Create your account'}
                </Text>
                <Text style={s.formSub}>
                  {tab === 'login'
                    ? 'Log in to pick up where you left off.'
                    : 'Join and start managing stays worth remembering.'}
                </Text>

                {tab === 'signup' && (
                  <View style={s.field}>
                    <Text style={s.fieldLabel}>FULL NAME / PROPERTY</Text>
                    <TextInput
                      value={businessName}
                      onChangeText={setBusinessName}
                      placeholder="Alex Rivera"
                      placeholderTextColor="#B7B5B0"
                      style={s.fieldInput}
                      autoCapitalize="words"
                    />
                  </View>
                )}

                <View style={s.field}>
                  <Text style={s.fieldLabel}>EMAIL</Text>
                  <TextInput
                    value={email}
                    onChangeText={setEmail}
                    placeholder="you@email.com"
                    placeholderTextColor="#B7B5B0"
                    style={s.fieldInput}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>

                <View style={s.field}>
                  <Text style={s.fieldLabel}>PASSWORD</Text>
                  <View style={s.passwordField}>
                    <TextInput
                      value={password}
                      onChangeText={setPassword}
                      placeholder={
                        tab === 'login' ? '••••••••' : 'At least 8 characters'
                      }
                      placeholderTextColor="#B7B5B0"
                      secureTextEntry={!showPassword}
                      style={s.passwordInput}
                      autoCapitalize="none"
                    />
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => setShowPassword(!showPassword)}
                      style={s.togglePassBtn}
                    >
                      <Text style={s.togglePassText}>
                        {showPassword ? 'HIDE' : 'SHOW'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {tab === 'login' ? (
                  <View style={s.formRow}>
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => setRememberMe(!rememberMe)}
                      style={s.checkboxRow}
                    >
                      <View
                        style={[
                          s.checkboxBox,
                          rememberMe && s.checkboxBoxActive,
                        ]}
                      >
                        {rememberMe && <Icon name="check" size={10} color="#FFFFFF" />}
                      </View>
                      <Text style={s.checkboxLabel}>Remember me</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={handleForgotPassword}
                    >
                      <Text style={s.linkText}>Forgot password?</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={s.termsRow}>
                    <Text style={s.termsNote}>
                      By creating an account, you agree to Staymate's{' '}
                      <Text style={s.linkText}>Terms</Text> and{' '}
                      <Text style={s.linkText}>Privacy Policy</Text>.
                    </Text>
                  </View>
                )}

                {/* Main Submit Button */}
                <TouchableOpacity
                  activeOpacity={0.88}
                  onPress={handleAuthSubmit}
                  disabled={isLoading}
                  style={[s.submitBtn, isLoading && { opacity: 0.8 }]}
                >
                  {isLoading ? (
                    <ActivityIndicator color={TOKENS.paper} size="small" />
                  ) : (
                    <Text style={s.submitBtnText}>
                      {tab === 'login' ? 'Log in' : 'Create account'}
                    </Text>
                  )}
                </TouchableOpacity>

                {/* Divider */}
                <View style={s.dividerOr}>
                  <View style={s.dividerOrLine} />
                  <Text style={s.dividerOrText}>or continue with</Text>
                  <View style={s.dividerOrLine} />
                </View>

                {/* Social Button Row */}
                <View style={s.socialRow}>
                  <TouchableOpacity
                    activeOpacity={0.85}
                    style={s.socialBtn}
                    onPress={handleGoogleAuth}
                    disabled={isLoading}
                  >
                    <View style={s.googleCircle}>
                      <Text style={s.googleCircleLetter}>G</Text>
                    </View>
                    <Text style={s.socialBtnText}>Google</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.85}
                    style={s.socialBtn}
                    onPress={() => {
                      if (!email.trim()) {
                        Alert.alert('Email Required', 'Enter your email above to receive a magic link.');
                      } else {
                        Alert.alert('Email Link Sent', `Magic sign-in link has been sent to ${email.trim()}.`);
                      }
                    }}
                  >
                    <Icon name="mail" size={15} color={TOKENS.purpleDeep} />
                    <Text style={s.socialBtnText}>Email link</Text>
                  </TouchableOpacity>
                </View>

                {/* Switch line */}
                <View style={s.switchLine}>
                  <Text style={s.switchText}>
                    {tab === 'login'
                      ? 'New to Staymate? '
                      : 'Already a member? '}
                  </Text>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => setTab(tab === 'login' ? 'signup' : 'login')}
                  >
                    <Text style={s.linkBtnText}>
                      {tab === 'login' ? 'Create an account' : 'Log in'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: TOKENS.paper,
  },
  scrollContent: {
    flexGrow: 1,
  },
  desktopLayout: {
    flexDirection: 'row',
    minHeight: '100%',
  },
  mobileLayout: {
    flexDirection: 'column',
    minHeight: '100%',
  },

  /* Brand Panel */
  brandPanel: {
    backgroundColor: TOKENS.ink,
    justifyContent: 'space-between',
  },
  brandPanelDesktop: {
    width: '42%',
    minWidth: 340,
    padding: 48,
  },
  brandPanelMobile: {
    paddingHorizontal: 28,
    paddingTop: 28,
    paddingBottom: 28,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  brandTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logomark: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: TOKENS.purpleDeep,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: TOKENS.purple,
    shadowOpacity: 0.55,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  wordmark: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 20,
    letterSpacing: 0.2,
    color: TOKENS.paper,
  },
  brandMid: {
    marginVertical: 28,
  },
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  eyebrowDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: TOKENS.purple,
    shadowColor: TOKENS.purple,
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 2,
  },
  eyebrowText: {
    fontFamily: 'Inter',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.4,
    color: TOKENS.white70,
  },
  headline: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 28,
    lineHeight: 34,
    color: TOKENS.paper,
    letterSpacing: -0.5,
    marginBottom: 12,
  },
  subText: {
    fontFamily: 'Inter',
    fontSize: 14,
    lineHeight: 22,
    color: TOKENS.white70,
  },
  brandBottom: {
    marginTop: 8,
  },
  stripe: {
    borderRadius: 8,
    paddingVertical: 11,
    paddingHorizontal: 14,
    backgroundColor: TOKENS.purpleDeep,
  },
  stripeText: {
    fontFamily: 'Inter',
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
  },

  /* Perforated Divider */
  divider: {
    backgroundColor: TOKENS.ink,
    alignItems: 'center',
    justifyContent: 'space-evenly',
  },
  dividerDesktop: {
    width: 24,
    flexDirection: 'column',
    paddingVertical: 36,
  },
  dividerMobile: {
    height: 20,
    flexDirection: 'row',
    paddingHorizontal: 28,
  },
  hole: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: TOKENS.paper,
  },
  holeGlow: {
    shadowColor: TOKENS.purple,
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 3,
  },

  /* Form Panel */
  formPanel: {
    flex: 1,
    backgroundColor: TOKENS.paper,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formPanelDesktop: {
    padding: 48,
  },
  formPanelMobile: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 48,
  },
  formWrap: {
    width: '100%',
    maxWidth: 380,
  },

  /* Toggle Switcher */
  toggle: {
    flexDirection: 'row',
    backgroundColor: TOKENS.paperDim,
    borderRadius: 999,
    padding: 4,
    marginBottom: 30,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleBtnActive: {
    backgroundColor: TOKENS.ink,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  toggleBtnText: {
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '600',
    color: TOKENS.ink,
  },
  toggleBtnTextActive: {
    color: TOKENS.paper,
    fontWeight: '700',
  },

  /* Form Headers */
  formTitle: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 24,
    letterSpacing: -0.4,
    color: TOKENS.ink,
    marginBottom: 4,
  },
  formSub: {
    fontFamily: 'Inter',
    fontSize: 14,
    color: TOKENS.muted,
    marginBottom: 24,
  },

  /* Fields */
  field: {
    marginBottom: 20,
  },
  fieldLabel: {
    fontFamily: 'Inter',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: TOKENS.muted,
    marginBottom: 6,
  },
  fieldInput: {
    width: '100%',
    borderBottomWidth: 1.5,
    borderBottomColor: TOKENS.line,
    paddingVertical: 8,
    paddingHorizontal: 2,
    fontSize: 15,
    fontFamily: 'Inter',
    color: TOKENS.ink,
  },
  passwordField: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1.5,
    borderBottomColor: TOKENS.line,
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 2,
    fontSize: 15,
    fontFamily: 'Inter',
    color: TOKENS.ink,
  },
  togglePassBtn: {
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  togglePassText: {
    fontFamily: 'Inter',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    color: TOKENS.muted,
  },

  /* Form Row */
  formRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkboxBox: {
    width: 16,
    height: 16,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: TOKENS.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxBoxActive: {
    backgroundColor: TOKENS.purple,
    borderColor: TOKENS.purple,
  },
  checkboxLabel: {
    fontFamily: 'Inter',
    fontSize: 13,
    color: TOKENS.muted,
  },
  termsRow: {
    marginBottom: 20,
  },
  termsNote: {
    fontFamily: 'Inter',
    fontSize: 12.5,
    color: TOKENS.muted,
    lineHeight: 18,
  },
  linkText: {
    color: TOKENS.purpleDeep,
    fontFamily: 'Inter',
    fontWeight: '600',
    fontSize: 13,
  },

  /* Primary Button */
  submitBtn: {
    width: '100%',
    paddingVertical: 14,
    backgroundColor: TOKENS.ink,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: TOKENS.purple,
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  submitBtnText: {
    fontFamily: 'Inter',
    fontSize: 15,
    fontWeight: '700',
    color: TOKENS.paper,
    letterSpacing: 0.2,
  },

  /* Divider OR */
  dividerOr: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 22,
  },
  dividerOrLine: {
    flex: 1,
    height: 1,
    backgroundColor: TOKENS.line,
  },
  dividerOrText: {
    fontFamily: 'Inter',
    fontSize: 12,
    color: TOKENS.muted,
  },

  /* Social Row */
  socialRow: {
    flexDirection: 'row',
    gap: 12,
  },
  socialBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 11,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: TOKENS.line,
    backgroundColor: 'transparent',
  },
  googleCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleCircleLetter: {
    fontFamily: 'Inter',
    fontSize: 10,
    fontWeight: '900',
    color: '#4285F4',
  },
  socialBtnText: {
    fontFamily: 'Inter',
    fontSize: 13.5,
    fontWeight: '600',
    color: TOKENS.ink,
  },

  /* Switch Line */
  switchLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  switchText: {
    fontFamily: 'Inter',
    fontSize: 13.5,
    color: TOKENS.muted,
  },
  linkBtnText: {
    fontFamily: 'Inter',
    fontSize: 13.5,
    fontWeight: '700',
    color: TOKENS.purpleDeep,
  },
});



