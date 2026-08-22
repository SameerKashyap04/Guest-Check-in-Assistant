import React, { useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '../components/Icon';

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

export function AccountPortalScreen({
  initial = 'login',
  onClose,
  onToast,
  onModal,
}: {
  initial?: 'login' | 'signup';
  onClose: () => void;
  onToast: (m: string) => void;
  onModal: (t: string, m: string) => void;
}) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  const [mode, setMode] = useState(initial);
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [property, setProperty] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const handleSubmit = () => {
    if (!email.trim() || !pw.trim()) {
      onToast('Please enter your email and password');
      return;
    }
    if (mode === 'signup' && !property.trim()) {
      onToast('Please enter your property name');
      return;
    }

    if (mode === 'login') {
      onToast('Welcome back to StayMate');
      setTimeout(onClose, 400);
    } else {
      onToast('Owner account created successfully');
      setTimeout(onClose, 400);
    }
  };

  const holeCount = isDesktop ? 14 : 9;
  const glowIndexes = [3, 4];

  return (
    <View style={s.root}>
      {/* Subtle close button */}
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onClose}
        style={[s.closeBtn, { top: insets.top + 14 }]}
      >
        <Icon name="x" size={16} color={TOKENS.paper} />
      </TouchableOpacity>

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
                onPress={() => setMode('login')}
                style={[s.toggleBtn, mode === 'login' && s.toggleBtnActive]}
              >
                <Text
                  style={[
                    s.toggleBtnText,
                    mode === 'login' && s.toggleBtnTextActive,
                  ]}
                >
                  Log in
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => setMode('signup')}
                style={[s.toggleBtn, mode === 'signup' && s.toggleBtnActive]}
              >
                <Text
                  style={[
                    s.toggleBtnText,
                    mode === 'signup' && s.toggleBtnTextActive,
                  ]}
                >
                  Sign up
                </Text>
              </TouchableOpacity>
            </View>

            {/* Form Content */}
            <View>
              <Text style={s.formTitle}>
                {mode === 'login' ? 'Welcome back' : 'Create your account'}
              </Text>
              <Text style={s.formSub}>
                {mode === 'login'
                  ? 'Log in to pick up where you left off.'
                  : 'Join and start managing stays worth remembering.'}
              </Text>

              {mode === 'signup' && (
                <View style={s.field}>
                  <Text style={s.fieldLabel}>FULL NAME / PROPERTY</Text>
                  <TextInput
                    value={property}
                    onChangeText={setProperty}
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
                    value={pw}
                    onChangeText={setPw}
                    placeholder={
                      mode === 'login' ? '••••••••' : 'At least 8 characters'
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

              {mode === 'login' ? (
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
                    onPress={() =>
                      onModal(
                        'Password Reset',
                        'Password reset instructions have been sent to your email.'
                      )
                    }
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
                onPress={handleSubmit}
                style={s.submitBtn}
              >
                <Text style={s.submitBtnText}>
                  {mode === 'login' ? 'Log in' : 'Create account'}
                </Text>
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
                  onPress={() => onToast('Connecting with Google…')}
                >
                  <View style={s.googleCircle}>
                    <Text style={s.googleCircleLetter}>G</Text>
                  </View>
                  <Text style={s.socialBtnText}>Google</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.85}
                  style={s.socialBtn}
                  onPress={() => onToast('Magic link sent to ' + (email || 'your email'))}
                >
                  <Icon name="mail" size={15} color={TOKENS.purpleDeep} />
                  <Text style={s.socialBtnText}>Email link</Text>
                </TouchableOpacity>
              </View>

              {/* Switch line */}
              <View style={s.switchLine}>
                <Text style={s.switchText}>
                  {mode === 'login'
                    ? 'New to Staymate? '
                    : 'Already a member? '}
                </Text>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setMode(mode === 'login' ? 'signup' : 'login')}
                >
                  <Text style={s.linkBtnText}>
                    {mode === 'login' ? 'Create an account' : 'Log in'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: TOKENS.paper,
  },
  closeBtn: {
    position: 'absolute',
    right: 20,
    zIndex: 20,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
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



