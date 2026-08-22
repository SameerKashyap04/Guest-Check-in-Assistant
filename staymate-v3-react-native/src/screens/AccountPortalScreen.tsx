import React, { useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C } from '../theme/tokens';
import { Icon } from '../components/Icon';

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
  const [mode, setMode] = useState(initial);
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [property, setProperty] = useState('');
  const [showPassword, setShowPassword] = useState(false);

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

  return (
    <View style={s.container}>
      {/* Subtle close button on top right */}
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onClose}
        style={[s.closeBtn, { top: insets.top + 12 }]}
      >
        <Icon name="x" size={16} color="#64748B" />
      </TouchableOpacity>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingTop: insets.top + 28,
          paddingBottom: Math.max(30, insets.bottom + 16),
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={s.header}>
          <View style={s.brandIcon}>
            <Icon name="home" size={24} color="#FFFFFF" />
          </View>
          <Text style={s.title}>
            {mode === 'login' ? 'Welcome back' : 'Create account'}
          </Text>
          <Text style={s.subtitle}>
            {mode === 'login'
              ? 'Sign in to access your property'
              : 'Start managing your check-ins'}
          </Text>
        </View>

        {/* Segmented Control */}
        <View style={s.tabs}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setMode('login')}
            style={[s.tab, mode === 'login' && s.activeTab]}
          >
            <Text style={[s.tabText, mode === 'login' && s.activeTabText]}>
              Log in
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setMode('signup')}
            style={[s.tab, mode === 'signup' && s.activeTab]}
          >
            <Text style={[s.tabText, mode === 'signup' && s.activeTabText]}>
              Sign up
            </Text>
          </TouchableOpacity>
        </View>

        {/* Inputs */}
        <View style={s.form}>
          {mode === 'signup' && (
            <View style={s.inputGroup}>
              <Text style={s.label}>Property name</Text>
              <View style={s.inputWrapper}>
                <View style={s.inputIcon}>
                  <Icon name="home" size={18} color="#64748B" />
                </View>
                <TextInput
                  value={property}
                  onChangeText={setProperty}
                  placeholder="e.g. Sunrise Homestay"
                  placeholderTextColor="#94A3B8"
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
                <Icon name="mail" size={18} color="#64748B" />
              </View>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="owner@property.com"
                placeholderTextColor="#94A3B8"
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
                <Icon name="lock" size={18} color="#64748B" />
              </View>
              <TextInput
                value={pw}
                onChangeText={setPw}
                placeholder={
                  mode === 'login' ? 'Enter password' : 'At least 8 characters'
                }
                placeholderTextColor="#94A3B8"
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
                  color="#64748B"
                />
              </TouchableOpacity>
            </View>
          </View>

          {mode === 'login' && (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() =>
                onModal(
                  'Password Reset',
                  'Password reset instructions have been sent to your email.'
                )
              }
              style={s.forgotBtn}
            >
              <Text style={s.forgotText}>Forgot password?</Text>
            </TouchableOpacity>
          )}

          {/* Submit Button */}
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
          <View style={s.divider}>
            <View style={s.dividerLine} />
            <Text style={s.dividerText}>or</Text>
            <View style={s.dividerLine} />
          </View>

          {/* Google Button */}
          <TouchableOpacity
            activeOpacity={0.85}
            style={s.googleBtn}
            onPress={() => onToast('Connecting with Google…')}
          >
            <View style={s.googleIconBox}>
              <Text style={s.googleLetter}>G</Text>
            </View>
            <Text style={s.googleBtnText}>Continue with Google</Text>
          </TouchableOpacity>
        </View>

        {/* Footer note */}
        <Text style={s.footerText}>
          By continuing, you agree to StayMate's{' '}
          <Text style={{ color: '#0F172A', fontWeight: '600' }}>Terms</Text> and{' '}
          <Text style={{ color: '#0F172A', fontWeight: '600' }}>Privacy</Text>.
        </Text>
      </ScrollView>
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
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 26,
  },
  brandIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    shadowColor: C.primary,
    shadowOpacity: 0.28,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  title: {
    fontFamily: 'Inter',
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
    color: '#0F172A',
  },
  subtitle: {
    fontFamily: 'Inter',
    fontSize: 14,
    color: '#64748B',
    marginTop: 4,
  },
  tabs: {
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    padding: 3,
    flexDirection: 'row',
    marginBottom: 22,
  },
  tab: {
    flex: 1,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeTab: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
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
    fontWeight: '700',
    color: '#0F172A',
  },
  form: {
    width: '100%',
  },
  inputGroup: {
    marginBottom: 14,
  },
  label: {
    fontFamily: 'Inter',
    fontSize: 12.5,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
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
  forgotBtn: {
    alignSelf: 'flex-end',
    marginTop: 2,
    marginBottom: 16,
  },
  forgotText: {
    fontFamily: 'Inter',
    fontSize: 12.5,
    fontWeight: '600',
    color: C.primary,
  },
  submitBtn: {
    height: 48,
    borderRadius: 12,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: C.primary,
    shadowOpacity: 0.25,
    shadowRadius: 8,
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
    backgroundColor: '#E2E8F0',
  },
  dividerText: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '500',
    color: '#94A3B8',
  },
  googleBtn: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
  },
  googleIconBox: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleLetter: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '900',
    color: '#4285F4',
  },
  googleBtnText: {
    fontFamily: 'Inter',
    fontSize: 13.5,
    fontWeight: '600',
    color: '#1E293B',
  },
  footerText: {
    fontFamily: 'Inter',
    fontSize: 11.5,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 22,
    lineHeight: 17,
  },
});


