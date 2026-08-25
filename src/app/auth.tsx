import React, { useState, useEffect, useRef } from 'react';
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
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import {
  signUpOwner,
  loginOwner,
  signInWithGoogleOwner,
  resetOwnerPassword,
  sendAuthOtp,
  verifyAuthOtp,
} from '@/services/firebaseAuth';
import { useAuthStore } from '@/store/useAuthStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { PinScreen } from '@/features/auth/PinScreen';
import { referralService } from '@/services/referralService';
import { C } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeContext';
import { Icon } from '@/components/v3/Icon';
import { GoogleLogo } from '@/components/GoogleLogo';
import { assignLegacyUnassignedGuests } from '@/database';

const StayMateLogo = require('../../assets/images/staymate-logo.png');
const StayMateLogoDark = require('../../assets/images/staymate-logo-dark.png');

export default function AuthScreen() {
  const { isDark, colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [step, setStep] = useState<'form' | 'otp' | 'referral'>('form');
  const [authStage, setAuthStage] = useState<'form' | 'set_pin'>('form');
  const [tab, setTab] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [referralCode, setReferralCode] = useState('');
  const [createdProfile, setCreatedProfile] = useState<any>(null);

  // OTP state (6 digits)
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [resendTimer, setResendTimer] = useState<number>(30);
  const otpInputsRef = useRef<(TextInput | null)[]>([]);

  const { isAuthenticated, isUnlocked, setOwner, checkPinSetup } = useAuthStore();
  const { setBusinessSetup, setPropertyId, setOwnerId } = useSettingsStore();

  useEffect(() => {
    checkPinSetup();
  }, [checkPinSetup]);

  // Resend timer countdown
  useEffect(() => {
    let interval: any;
    if (step === 'otp' && resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => Math.max(0, prev - 1));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [step, resendTimer]);

  // If owner is already authenticated and unlocked, redirect directly to dashboard
  useEffect(() => {
    if (isAuthenticated && isUnlocked && authStage === 'form') {
      setTimeout(() => router.replace('/(tabs)'), 50);
    }
  }, [isAuthenticated, isUnlocked, authStage]);

  // If set_pin stage is active, present PIN setup screen
  if (authStage === 'set_pin') {
    return (
      <PinScreen
        initialMode="setup"
        onSuccess={() => {
          useAuthStore.setState({ isUnlocked: true });
          router.replace('/(tabs)');
        }}
      />
    );
  }

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
      useAuthStore.setState({ isUnlocked: false });
      setAuthStage('set_pin');
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

  const handleInitiateAuth = async () => {
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
      const generatedCode = await sendAuthOtp(email.trim());
      setOtpDigits(['', '', '', '', '', '']);
      setResendTimer(30);
      setStep('otp');

      Alert.alert(
        'Verification Code Sent',
        `We sent a 6-digit verification code to ${email.trim()}.\n\n(For testing, code is: ${generatedCode} or 123456)`
      );
    } catch (err: any) {
      Alert.alert('Notice', err?.message || 'Failed to send verification code.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendTimer > 0) return;
    try {
      setIsLoading(true);
      const newCode = await sendAuthOtp(email.trim());
      setResendTimer(30);
      Alert.alert('Code Resent', `A new verification code has been sent to ${email.trim()}.\n\n(Code: ${newCode})`);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to resend code.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpChange = (text: string, index: number) => {
    const cleaned = text.replace(/[^0-9]/g, '');

    // Handle pasting complete 6-digit code
    if (cleaned.length === 6) {
      const newDigits = cleaned.split('');
      setOtpDigits(newDigits);
      otpInputsRef.current[5]?.focus();
      handleVerifyOtp(cleaned);
      return;
    }

    const digit = cleaned.slice(-1);
    const updated = [...otpDigits];
    updated[index] = digit;
    setOtpDigits(updated);

    if (digit && index < 5) {
      otpInputsRef.current[index + 1]?.focus();
    }

    // Auto verify if all 6 digits entered
    const completeCode = updated.join('');
    if (completeCode.length === 6 && !updated.includes('')) {
      handleVerifyOtp(completeCode);
    }
  };

  const handleOtpKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputsRef.current[index - 1]?.focus();
    }
  };

  const handleVerifyOtp = async (codeToVerify?: string) => {
    const code = codeToVerify || otpDigits.join('');
    if (code.length !== 6) {
      Alert.alert('Incomplete Code', 'Please enter all 6 digits of your verification code.');
      return;
    }

    try {
      setIsLoading(true);
      const isValid = await verifyAuthOtp(email.trim(), code);
      if (!isValid) {
        Alert.alert('Invalid Code', 'The verification code entered is incorrect or expired. Please check and try again.');
        setIsLoading(false);
        return;
      }

      // Complete login / sign up
      if (tab === 'signup') {
        const profile = await signUpOwner(
          email.trim(),
          password.trim(),
          businessName.trim()
        );
        setBusinessSetup(businessName.trim());
        setOwner(profile);
        setOwnerId(profile.uid);
        if (profile.propertyId) {
          setPropertyId(profile.propertyId);
          assignLegacyUnassignedGuests(profile.propertyId).catch(() => {});
        }
        setCreatedProfile(profile);
        setIsLoading(false);
        setStep('referral');
        return;
      } else {
        const profile = await loginOwner(email.trim(), password.trim());
        if (profile.businessName) {
          setBusinessSetup(profile.businessName);
        }
        setOwner(profile);
        setOwnerId(profile.uid);
        if (profile.propertyId) {
          setPropertyId(profile.propertyId);
          assignLegacyUnassignedGuests(profile.propertyId).catch(() => {});
        }
        useAuthStore.setState({ isUnlocked: false });
        setAuthStage('set_pin');
      }
    } catch (err: any) {
      console.error('Auth verification error', err);
      Alert.alert(
        'Authentication Notice',
        err?.message || 'Verification failed. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleFinishSignupWithReferral = async () => {
    if (referralCode.trim() && createdProfile?.uid) {
      try {
        setIsLoading(true);
        await referralService.applyReferralCode(
          referralCode.trim(),
          createdProfile.uid,
          email.trim()
        );
      } catch (_) {} finally {
        setIsLoading(false);
      }
    }
    useAuthStore.setState({ isUnlocked: false });
    setAuthStage('set_pin');
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
    <View style={[s.container, isDark && { backgroundColor: colors.canvas }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{
            paddingTop: 143,
            paddingHorizontal: 24,
            paddingBottom: Math.max(32, insets.bottom + 16),
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          {/* Header */}
          <View style={s.header}>
            <Image
              source={isDark ? StayMateLogoDark : StayMateLogo}
              style={s.brandLogo}
              resizeMode="contain"
            />

            {step === 'form' ? (
              <>
                <Text style={[s.title, isDark && { color: colors.ink }]}>
                  {tab === 'login' ? 'Welcome back' : 'Create account'}
                </Text>
                <Text style={[s.subtitle, isDark && { color: colors.muted }]}>
                  {tab === 'login'
                    ? 'Sign in to access your property'
                    : 'Start managing your check-ins'}
                </Text>
              </>
            ) : step === 'otp' ? (
              <>
                <Text style={[s.title, isDark && { color: colors.ink }]}>Verify your email</Text>
                <Text style={[s.subtitle, isDark && { color: colors.muted }]}>
                  Enter the 6-digit code sent to
                </Text>
                <View style={[s.emailChip, isDark && { backgroundColor: '#27272A' }]}>
                  <Text style={[s.emailChipText, isDark && { color: colors.ink }]}>{email.trim()}</Text>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => setStep('form')}
                    style={s.editEmailBtn}
                  >
                    <Text style={[s.editEmailText, isDark && { color: colors.primary }]}>Edit</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: isDark ? '#2E1065' : '#EDE9FE', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                  <Icon name="gift" size={24} color={colors.primary} />
                </View>
                <Text style={[s.title, isDark && { color: colors.ink }]}>Have a referral code?</Text>
                <Text style={[s.subtitle, isDark && { color: colors.muted }, { textAlign: 'center', paddingHorizontal: 20 }]}>
                  Got an invite from a fellow host? Enter their code to get ₹100 OFF your first subscription.
                </Text>
              </>
            )}
          </View>

          {step === 'form' ? (
            <>
              {/* Segmented Control */}
              <View style={[s.tabs, isDark && { backgroundColor: '#27272A' }]}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setTab('login')}
                  style={[s.tab, tab === 'login' && [s.activeTab, isDark && { backgroundColor: '#18181B' }]]}
                >
                  <Text style={[s.tabText, isDark && { color: colors.muted }, tab === 'login' && [s.activeTabText, isDark && { color: colors.ink }]]}>
                    Log in
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setTab('signup')}
                  style={[s.tab, tab === 'signup' && [s.activeTab, isDark && { backgroundColor: '#18181B' }]]}
                >
                  <Text style={[s.tabText, isDark && { color: colors.muted }, tab === 'signup' && [s.activeTabText, isDark && { color: colors.ink }]]}>
                    Sign up
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Form Inputs */}
              <View style={s.form}>
                {tab === 'signup' && (
                  <View style={s.inputGroup}>
                    <Text style={[s.label, isDark && { color: colors.muted }]}>Property name</Text>
                    <View style={[s.inputWrapper, isDark && { backgroundColor: '#18181B', borderColor: '#27272A' }]}>
                      <View style={s.inputIcon}>
                        <Icon name="home" size={18} color={colors.muted} />
                      </View>
                      <TextInput
                        value={businessName}
                        onChangeText={setBusinessName}
                        placeholder="e.g. Sunrise Homestay"
                        placeholderTextColor={colors.muted}
                        style={[s.input, isDark && { color: colors.ink }]}
                        autoCapitalize="words"
                      />
                    </View>
                  </View>
                )}

                <View style={s.inputGroup}>
                  <Text style={[s.label, isDark && { color: colors.muted }]}>Email address</Text>
                  <View style={[s.inputWrapper, isDark && { backgroundColor: '#18181B', borderColor: '#27272A' }]}>
                    <View style={s.inputIcon}>
                      <Icon name="mail" size={18} color={colors.muted} />
                    </View>
                    <TextInput
                      value={email}
                      onChangeText={setEmail}
                      placeholder="owner@property.com"
                      placeholderTextColor={colors.muted}
                      style={[s.input, isDark && { color: colors.ink }]}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>
                </View>

                <View style={s.inputGroup}>
                  <Text style={[s.label, isDark && { color: colors.muted }]}>Password</Text>
                  <View style={[s.inputWrapper, isDark && { backgroundColor: '#18181B', borderColor: '#27272A' }]}>
                    <View style={s.inputIcon}>
                      <Icon name="lock" size={18} color={colors.muted} />
                    </View>
                    <TextInput
                      value={password}
                      onChangeText={setPassword}
                      placeholder={
                        tab === 'login' ? 'Enter password' : 'At least 8 characters'
                      }
                      placeholderTextColor={colors.muted}
                      secureTextEntry={!showPassword}
                      style={[s.input, isDark && { color: colors.ink }]}
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
                        color={colors.muted}
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
                    <Text style={[s.forgotText, isDark && { color: colors.primary }]}>Forgot password?</Text>
                  </TouchableOpacity>
                )}

                {/* Submit Button */}
                <TouchableOpacity
                  activeOpacity={0.88}
                  onPress={handleInitiateAuth}
                  disabled={isLoading}
                  style={[s.submitBtn, isDark && { backgroundColor: colors.primary }, isLoading && { opacity: 0.8 }]}
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
                  <View style={[s.dividerLine, isDark && { backgroundColor: '#27272A' }]} />
                  <Text style={[s.dividerText, isDark && { color: colors.muted }]}>or</Text>
                  <View style={[s.dividerLine, isDark && { backgroundColor: '#27272A' }]} />
                </View>

                {/* Google Button */}
                <TouchableOpacity
                  activeOpacity={0.85}
                  style={[s.googleBtn, isDark && { backgroundColor: '#18181B', borderColor: '#27272A' }]}
                  onPress={handleGoogleAuth}
                  disabled={isLoading}
                >
                  <GoogleLogo size={18} />
                  <Text style={[s.googleBtnText, isDark && { color: colors.ink }]}>Continue with Google</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : step === 'otp' ? (
            /* OTP Verification Step Screen */
            <View style={s.otpContainer}>
              {/* 6-digit OTP Inputs */}
              <View style={s.otpRow}>
                {otpDigits.map((digit, index) => (
                  <TextInput
                    key={index}
                    ref={(ref) => {
                      otpInputsRef.current[index] = ref;
                    }}
                    value={digit}
                    onChangeText={(val) => handleOtpChange(val, index)}
                    onKeyPress={(e) => handleOtpKeyPress(e, index)}
                    keyboardType="number-pad"
                    maxLength={1}
                    selectTextOnFocus
                    style={[
                      s.otpBox,
                      isDark && { backgroundColor: '#18181B', borderColor: '#27272A', color: colors.ink },
                      digit ? (isDark ? { borderColor: colors.primary, backgroundColor: '#2E1065' } : s.otpBoxFilled) : null,
                    ]}
                  />
                ))}
              </View>

              {/* Resend Timer */}
              <View style={s.resendRow}>
                <Text style={[s.resendLabel, isDark && { color: colors.muted }]}>{"Didn't receive the code? "}</Text>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={handleResendOtp}
                  disabled={resendTimer > 0 || isLoading}
                >
                  <Text
                    style={[
                      s.resendLink,
                      isDark && { color: colors.primary },
                      resendTimer > 0 && s.resendLinkDisabled,
                    ]}
                  >
                    {resendTimer > 0
                      ? `Resend in 0:${resendTimer < 10 ? '0' : ''}${resendTimer}`
                      : 'Resend code'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Verify Button */}
              <TouchableOpacity
                activeOpacity={0.88}
                onPress={() => handleVerifyOtp()}
                disabled={isLoading}
                style={[s.submitBtn, isDark && { backgroundColor: colors.primary }, isLoading && { opacity: 0.8 }]}
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={s.submitBtnText}>Verify & Continue</Text>
                )}
              </TouchableOpacity>

              {/* Back to credentials button */}
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setStep('form')}
                style={s.backBtn}
              >
                <Text style={[s.backBtnText, isDark && { color: colors.muted }]}>
                  Back to {tab === 'login' ? 'Log in' : 'Sign up'}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* Referral Code Input Step */
            <View style={{ gap: 16 }}>
              <View style={s.inputGroup}>
                <Text style={[s.label, isDark && { color: colors.muted }]}>Referral Code (Optional)</Text>
                <View style={[s.inputWrapper, isDark && { backgroundColor: '#18181B', borderColor: '#27272A' }]}>
                  <View style={s.inputIcon}>
                    <Icon name="tag" size={18} color={colors.primary} />
                  </View>
                  <TextInput
                    value={referralCode}
                    onChangeText={(t) => setReferralCode(t.toUpperCase())}
                    placeholder="e.g. STAYMATE82"
                    placeholderTextColor={colors.muted}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    style={[s.input, isDark && { color: colors.ink }, { fontWeight: '700', letterSpacing: 1 }]}
                  />
                  {referralCode.length > 0 && (
                    <TouchableOpacity
                      onPress={() => setReferralCode('')}
                      style={{ padding: 10 }}
                    >
                      <Icon name="x" size={15} color={colors.muted} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* Reward Callout Banner */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                  backgroundColor: isDark ? '#064E3B' : '#ECFDF5',
                  borderWidth: 1,
                  borderColor: isDark ? '#047857' : '#A7F3D0',
                  borderRadius: 12,
                  padding: 12,
                }}
              >
                <Icon name="gift" size={16} color="#059669" />
                <Text style={{ flex: 1, fontFamily: 'Inter', fontSize: 12.5, color: isDark ? '#A7F3D0' : '#065F46', fontWeight: '600' }}>
                  Applying a code gives you ₹100 OFF and rewards your inviter ₹100 in StayMate Credits.
                </Text>
              </View>

              {/* Action Buttons */}
              <TouchableOpacity
                activeOpacity={0.88}
                onPress={handleFinishSignupWithReferral}
                disabled={isLoading}
                style={[s.submitBtn, isDark && { backgroundColor: colors.primary }, isLoading && { opacity: 0.8 }]}
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={s.submitBtnText}>
                    {referralCode.trim() ? 'Apply & Complete Signup' : 'Continue to Dashboard'}
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => {
                  useAuthStore.setState({ isUnlocked: false });
                  setAuthStage('set_pin');
                }}
                style={s.backBtn}
              >
                <Text style={[s.backBtnText, isDark && { color: colors.muted }]}>
                  {"I don't have a referral code"}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Footer note */}
          <Text style={[s.footerText, isDark && { color: colors.muted }]}>
            {"By continuing, you agree to StayMate's "}
            <Text style={{ color: isDark ? colors.ink : '#09090B', fontWeight: '600' }}>Terms</Text> and{' '}
            <Text style={{ color: isDark ? colors.ink : '#09090B', fontWeight: '600' }}>Privacy</Text>.
          </Text>

          {/* Devify Developer Attribution */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => Linking.openURL('https://www.devify.co.in')}
            style={s.devifyBadge}
          >
            <Text style={[s.devifyText, isDark && { color: colors.muted }]}>
              Developed by <Text style={[s.devifyBrand, isDark && { color: colors.ink }]}>Devify</Text> · www.devify.co.in
            </Text>
          </TouchableOpacity>
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
    width: 190,
    height: 34,
    marginBottom: 36,
  },
  title: {
    fontFamily: 'Inter',
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.4,
    color: '#09090B',
  },
  subtitle: {
    fontFamily: 'Inter',
    fontSize: 13.5,
    color: '#71717A',
    marginTop: 3,
  },
  emailChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F4F4F5',
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginTop: 8,
    gap: 8,
  },
  emailChipText: {
    fontFamily: 'Inter',
    fontSize: 13,
    fontWeight: '600',
    color: '#09090B',
  },
  editEmailBtn: {
    paddingHorizontal: 4,
  },
  editEmailText: {
    fontFamily: 'Inter',
    fontSize: 12.5,
    fontWeight: '700',
    color: '#7C3AED',
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
  otpContainer: {
    width: '100%',
    paddingTop: 8,
  },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  otpBox: {
    width: 44,
    height: 52,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E4E4E7',
    backgroundColor: '#FFFFFF',
    textAlign: 'center',
    fontFamily: 'Inter',
    fontSize: 22,
    fontWeight: '700',
    color: '#09090B',
  },
  otpBoxFilled: {
    borderColor: '#7C3AED',
    backgroundColor: '#FAF5FF',
  },
  resendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  resendLabel: {
    fontFamily: 'Inter',
    fontSize: 13,
    color: '#71717A',
  },
  resendLink: {
    fontFamily: 'Inter',
    fontSize: 13,
    fontWeight: '700',
    color: '#7C3AED',
  },
  resendLinkDisabled: {
    color: '#A1A1AA',
    fontWeight: '600',
  },
  backBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    marginTop: 8,
  },
  backBtnText: {
    fontFamily: 'Inter',
    fontSize: 13.5,
    fontWeight: '600',
    color: '#71717A',
  },
  footerText: {
    fontFamily: 'Inter',
    fontSize: 11.5,
    color: '#A1A1AA',
    textAlign: 'center',
    marginTop: 14,
    lineHeight: 17,
  },
  devifyBadge: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    marginTop: 2,
  },
  devifyText: {
    fontFamily: 'Inter',
    fontSize: 12,
    color: '#71717A',
  },
  devifyBrand: {
    fontWeight: '700',
    color: '#09090B',
  },
});
