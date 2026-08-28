import React, { useState, useEffect, useRef } from 'react';
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Image,
  KeyboardAvoidingView,
  Platform,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';
import { Icon } from '../components/Icon';
import { GoogleLogo } from '../components/GoogleLogo';
import { referralService } from '../services/referralService';
import { signInWithGoogleOwner } from '../services/firebaseAuth';

const StayMateLogo = require('../../assets/staymate-logo.png');
const StayMateLogoDark = require('../../assets/staymate-logo-dark.png');

export function LoginScreen({
  initial = 'login',
  onLoginSuccess,
  onClose,
  showClose = false,
}: {
  initial?: 'login' | 'signup';
  onLoginSuccess: (userData?: any) => void;
  onClose?: () => void;
  showClose?: boolean;
}) {
  const { isDark, colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<'form' | 'otp' | 'referral'>('form');
  const [mode, setMode] = useState(initial);
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [property, setProperty] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [referralCode, setReferralCode] = useState('');
  const [isApplyingReferral, setIsApplyingReferral] = useState(false);

  // OTP state
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [resendTimer, setResendTimer] = useState<number>(30);
  const otpInputsRef = useRef<(TextInput | null)[]>([]);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [googleError, setGoogleError] = useState('');

  useEffect(() => {
    let interval: any;
    if (step === 'otp' && resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => Math.max(0, prev - 1));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [step, resendTimer]);

  const handleSubmit = () => {
    if (!email.trim() || !pw.trim()) {
      return;
    }
    if (mode === 'signup' && !property.trim()) {
      return;
    }

    if (mode === 'login') {
      onLoginSuccess({
        email: email.trim(),
        businessName: property.trim() || 'Sunrise Homestay',
        provider: 'password',
      });
      return;
    }

    setOtpDigits(['', '', '', '', '', '']);
    setResendTimer(30);
    setStep('otp');
  };

  const handleResendOtp = () => {
    if (resendTimer > 0) return;
    setResendTimer(30);
  };

  const handleOtpChange = (text: string, index: number) => {
    const cleaned = text.replace(/[^0-9]/g, '');

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

  const handleVerifyOtp = (codeToVerify?: string) => {
    const code = codeToVerify || otpDigits.join('');
    if (code.length !== 6) {
      return;
    }

    // If signup, prompt for referral code after email verification
    if (mode === 'signup') {
      setStep('referral');
      return;
    }

    // If login, complete login immediately
    onLoginSuccess({
      email: email.trim(),
      businessName: property.trim() || 'Sunrise Homestay',
    });
  };

  const handleFinishSignup = async () => {
    setIsApplyingReferral(true);
    if (referralCode.trim()) {
      try {
        await referralService.applyReferralCode(referralCode.trim(), 'HS-4821', email.trim());
      } catch (_) {}
    }
    setIsApplyingReferral(false);
    onLoginSuccess({
      email: email.trim(),
      businessName: property.trim() || 'Sunrise Homestay',
      referralCode: referralCode.trim() || undefined,
    });
  };

  return (
    <View style={[s.container, isDark && { backgroundColor: colors.canvas }]}>
      {/* Subtle close button on top right if enabled */}
      {showClose && onClose && (
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={onClose}
          style={[s.closeBtn, isDark && { backgroundColor: '#27272A' }, { top: insets.top + 16 }]}
        >
          <Icon name="x" size={16} color={colors.ink} />
        </TouchableOpacity>
      )}

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{
            paddingTop: Math.max(28, insets.top + 12),
            paddingHorizontal: 24,
            paddingBottom: 280,
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
                  {mode === 'login' ? 'Welcome back' : 'Create account'}
                </Text>
                <Text style={[s.subtitle, isDark && { color: colors.muted }]}>
                  {mode === 'login'
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
                  onPress={() => setMode('login')}
                  style={[s.tab, mode === 'login' && [s.activeTab, isDark && { backgroundColor: '#18181B' }]]}
                >
                  <Text style={[s.tabText, isDark && { color: colors.muted }, mode === 'login' && [s.activeTabText, isDark && { color: colors.ink }]]}>
                    Log in
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setMode('signup')}
                  style={[s.tab, mode === 'signup' && [s.activeTab, isDark && { backgroundColor: '#18181B' }]]}
                >
                  <Text style={[s.tabText, isDark && { color: colors.muted }, mode === 'signup' && [s.activeTabText, isDark && { color: colors.ink }]]}>
                    Sign up
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Inputs */}
              <View style={s.form}>
                {mode === 'signup' && (
                  <View style={s.inputGroup}>
                    <Text style={[s.label, isDark && { color: colors.muted }]}>Property name</Text>
                    <View style={[s.inputWrapper, isDark && { backgroundColor: '#18181B', borderColor: '#27272A' }]}>
                      <View style={s.inputIcon}>
                        <Icon name="home" size={18} color={colors.muted} />
                      </View>
                      <TextInput
                        value={property}
                        onChangeText={setProperty}
                        placeholder="e.g. Sunrise Homestay"
                        placeholderTextColor={colors.muted}
                        style={[s.input, isDark && { color: colors.ink }]}
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
                      placeholder="host@property.com"
                      placeholderTextColor={colors.muted}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      style={[s.input, isDark && { color: colors.ink }]}
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
                      value={pw}
                      onChangeText={setPw}
                      placeholder="••••••••"
                      placeholderTextColor={colors.muted}
                      secureTextEntry={!showPassword}
                      style={[s.input, isDark && { color: colors.ink }]}
                    />
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => setShowPassword(!showPassword)}
                      style={s.eyeBtn}
                    >
                      <Icon name={showPassword ? 'eyeOff' : 'eye'} size={18} color={colors.muted} />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Primary Button */}
                <TouchableOpacity
                  activeOpacity={0.88}
                  onPress={handleSubmit}
                  style={[s.submitBtn, isDark && { backgroundColor: colors.primary }]}
                >
                  <Text style={s.submitBtnText}>
                    {mode === 'login' ? 'Sign in' : 'Create account'}
                  </Text>
                </TouchableOpacity>

                {/* Divider */}
                <View style={s.divider}>
                  <View style={[s.dividerLine, isDark && { backgroundColor: '#27272A' }]} />
                  <Text style={[s.dividerText, isDark && { color: colors.muted }]}>OR</Text>
                  <View style={[s.dividerLine, isDark && { backgroundColor: '#27272A' }]} />
                </View>

                {/* Google Sign-In */}
                <TouchableOpacity
                  activeOpacity={isGoogleLoading ? 1 : 0.8}
                  style={[s.googleBtn, isDark && { backgroundColor: '#18181B', borderColor: '#27272A' }, isGoogleLoading && { opacity: 0.6 }]}
                  onPress={async () => {
                    if (isGoogleLoading) return;
                    setGoogleError('');
                    setIsGoogleLoading(true);
                    try {
                      const profile = await signInWithGoogleOwner();
                      onLoginSuccess({
                        email: profile.email,
                        businessName: profile.businessName,
                        uid: profile.uid,
                        provider: 'google',
                      });
                    } catch (err: any) {
                      setGoogleError(err?.message || 'Google Sign-In failed. Please try again.');
                    } finally {
                      setIsGoogleLoading(false);
                    }
                  }}
                >
                  <GoogleLogo size={18} />
                  <Text style={[s.googleBtnText, isDark && { color: colors.ink }]}>
                    {isGoogleLoading ? 'Signing in...' : 'Continue with Google'}
                  </Text>
                </TouchableOpacity>
                {googleError ? (
                  <Text style={{ color: '#EF4444', fontSize: 13, textAlign: 'center', marginTop: 8 }}>{googleError}</Text>
                ) : null}
              </View>
            </>
          ) : step === 'otp' ? (
            /* OTP Verification Screen */
            <View style={s.otpContainer}>
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

              {/* Resend Row */}
              <View style={s.resendRow}>
                <Text style={[s.resendLabel, isDark && { color: colors.muted }]}>{"Didn't receive the code? "}</Text>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={handleResendOtp}
                  disabled={resendTimer > 0}
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
                style={[s.submitBtn, isDark && { backgroundColor: colors.primary }]}
              >
                <Text style={s.submitBtnText}>Verify & Continue</Text>
              </TouchableOpacity>

              {/* Back button */}
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setStep('form')}
                style={s.backBtn}
              >
                <Text style={[s.backBtnText, isDark && { color: colors.muted }]}>
                  Back to {mode === 'login' ? 'Log in' : 'Sign up'}
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
                onPress={handleFinishSignup}
                disabled={isApplyingReferral}
                style={[s.submitBtn, isDark && { backgroundColor: colors.primary }]}
              >
                <Text style={s.submitBtnText}>
                  {referralCode.trim() ? 'Apply & Complete Signup' : 'Continue to Dashboard'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => {
                  onLoginSuccess({
                    email: email.trim(),
                    businessName: property.trim() || 'Sunrise Homestay',
                  });
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
  closeBtn: {
    position: 'absolute',
    right: 20,
    zIndex: 10,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F4F4F5',
    alignItems: 'center',
    justifyContent: 'center',
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
