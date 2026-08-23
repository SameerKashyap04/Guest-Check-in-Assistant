import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { C, R, shadow } from '../theme/tokens';
import { Icon } from '../components/Icon';

const StayMateLogo = require('../../../assets/images/staymate-logo.png');
const GoogleLogo = require('../../../assets/images/google-logo.png');

export function LoginScreen({
  onLoginSuccess,
}: {
  onLoginSuccess: (userData?: any) => void;
}) {
  const [tab, setTab] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = () => {
    if (!email.trim()) {
      Alert.alert('Required', 'Please enter your email address.');
      return;
    }
    if (!password.trim()) {
      Alert.alert('Required', 'Please enter your password.');
      return;
    }
    if (tab === 'signup' && !businessName.trim()) {
      Alert.alert('Required', 'Please enter your homestay / property name.');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      onLoginSuccess({
        email: email.trim(),
        businessName: businessName.trim() || 'My Homestay',
      });
    }, 400);
  };

  const handleGoogleLogin = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      onLoginSuccess({
        email: 'host@staymate.in',
        businessName: 'Highland Homestay',
      });
    }, 400);
  };

  const handleDemoLogin = () => {
    onLoginSuccess({
      email: 'demo.owner@staymate.in',
      businessName: 'Highland Homestay',
    });
  };

  return (
    <SafeAreaView style={s.container} edges={['top', 'bottom', 'left', 'right']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={s.scrollWrap}
          showsVerticalScrollIndicator={false}
        >
          {/* Header Brand */}
          <View style={s.brandWrap}>
            <Image
              source={StayMateLogo}
              style={s.logo}
              resizeMode="contain"
            />
            <Text style={s.tagline}>Smart Homestay Guest Management</Text>
          </View>

          {/* Card */}
          <View style={s.card}>
            {/* Tab switch */}
            <View style={s.tabRow}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setTab('login')}
                style={[s.tabBtn, tab === 'login' && s.tabBtnActive]}
              >
                <Text style={[s.tabText, tab === 'login' && s.tabTextActive]}>
                  Sign In
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setTab('signup')}
                style={[s.tabBtn, tab === 'signup' && s.tabBtnActive]}
              >
                <Text style={[s.tabText, tab === 'signup' && s.tabTextActive]}>
                  Create Account
                </Text>
              </TouchableOpacity>
            </View>

            {/* Subtitle info */}
            <Text style={s.formTitle}>
              {tab === 'login' ? 'Welcome back, Host' : 'Start Managing Your Homestay'}
            </Text>
            <Text style={s.formSub}>
              {tab === 'login'
                ? 'Sign in to access your dashboard, room status & guest check-ins.'
                : 'Register your property to streamline self check-ins and compliance.'}
            </Text>

            {/* Inputs */}
            <View style={{ gap: 14, marginTop: 14 }}>
              {tab === 'signup' && (
                <View>
                  <Text style={s.label}>HOMESTAY / PROPERTY NAME</Text>
                  <View style={s.inputBox}>
                    <Icon name="home" size={18} color="#6a6a6a" />
                    <TextInput
                      style={s.input}
                      placeholder="e.g. Pine View Heritage Villa"
                      placeholderTextColor="#94A3B8"
                      value={businessName}
                      onChangeText={setBusinessName}
                    />
                  </View>
                </View>
              )}

              <View>
                <Text style={s.label}>EMAIL ADDRESS</Text>
                <View style={s.inputBox}>
                  <Icon name="mail" size={18} color="#6a6a6a" />
                  <TextInput
                    style={s.input}
                    placeholder="name@homestay.com"
                    placeholderTextColor="#94A3B8"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={email}
                    onChangeText={setEmail}
                  />
                </View>
              </View>

              <View>
                <Text style={s.label}>PASSWORD</Text>
                <View style={s.inputBox}>
                  <Icon name="lock" size={18} color="#6a6a6a" />
                  <TextInput
                    style={s.input}
                    placeholder="Enter your password"
                    placeholderTextColor="#94A3B8"
                    secureTextEntry={!showPassword}
                    value={password}
                    onChangeText={setPassword}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword((p) => !p)}
                    style={{ padding: 4 }}
                  >
                    <Icon
                      name={showPassword ? 'eyeOff' : 'eye'}
                      size={18}
                      color="#6a6a6a"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={handleSubmit}
                disabled={isLoading}
                style={s.primaryBtn}
              >
                <Text style={s.primaryBtnText}>
                  {isLoading
                    ? 'Processing...'
                    : tab === 'login'
                    ? 'Sign In to Dashboard →'
                    : 'Create Property Account →'}
                </Text>
              </TouchableOpacity>

              {/* Divider */}
              <View style={s.dividerRow}>
                <View style={s.dividerLine} />
                <Text style={s.dividerText}>OR</Text>
                <View style={s.dividerLine} />
              </View>

              {/* Google Sign-in */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={handleGoogleLogin}
                style={s.googleBtn}
              >
                <Image
                  source={GoogleLogo}
                  style={s.googleIcon}
                  resizeMode="contain"
                />
                <Text style={s.googleBtnText}>Continue with Google</Text>
              </TouchableOpacity>

              {/* Quick Demo Login */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={handleDemoLogin}
                style={s.demoBtn}
              >
                <Text style={s.demoBtnText}>⚡ 1-Click Quick Demo Sign In</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Footer note */}
          <Text style={s.footerNote}>
            🔒 256-Bit Encrypted & Compliant with Form C / Local Regulations
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF8FD',
  },
  scrollWrap: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
    alignItems: 'center',
  },
  brandWrap: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logo: {
    width: 170,
    height: 52,
  },
  tagline: {
    fontFamily: 'Inter',
    fontSize: 13,
    color: '#6A6A6A',
    fontWeight: '500',
    marginTop: 6,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#ECEAF0',
    padding: 22,
    ...shadow,
  },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: '#F3E8FF',
    padding: 4,
    borderRadius: 12,
    marginBottom: 16,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    borderRadius: 9,
  },
  tabBtnActive: {
    backgroundColor: '#FFFFFF',
    ...shadow,
  },
  tabText: {
    fontFamily: 'Inter',
    fontSize: 13,
    fontWeight: '600',
    color: '#6A6A6A',
  },
  tabTextActive: {
    color: C.primary,
    fontWeight: '700',
  },
  formTitle: {
    fontFamily: 'Inter',
    fontSize: 18,
    fontWeight: '700',
    color: '#1E1B4B',
  },
  formSub: {
    fontFamily: 'Inter',
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
    lineHeight: 18,
  },
  label: {
    fontFamily: 'Inter',
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    backgroundColor: '#F8FAFC',
    gap: 10,
  },
  input: {
    flex: 1,
    fontFamily: 'Inter',
    fontSize: 14,
    color: '#1E293B',
  },
  primaryBtn: {
    backgroundColor: C.primary,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  primaryBtnText: {
    fontFamily: 'Inter',
    color: '#FFFFFF',
    fontSize: 14.5,
    fontWeight: '700',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 4,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  dividerText: {
    fontFamily: 'Inter',
    fontSize: 11.5,
    color: '#94A3B8',
    fontWeight: '600',
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    height: 46,
    borderRadius: 12,
    gap: 10,
  },
  googleIcon: {
    width: 20,
    height: 20,
  },
  googleBtnText: {
    fontFamily: 'Inter',
    fontSize: 13.5,
    fontWeight: '600',
    color: '#334155',
  },
  demoBtn: {
    backgroundColor: '#EDE9FE',
    borderWidth: 1,
    borderColor: '#DDD6FE',
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  demoBtnText: {
    fontFamily: 'Inter',
    fontSize: 13,
    fontWeight: '700',
    color: C.primary,
  },
  footerNote: {
    fontFamily: 'Inter',
    fontSize: 11.5,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 20,
  },
});
