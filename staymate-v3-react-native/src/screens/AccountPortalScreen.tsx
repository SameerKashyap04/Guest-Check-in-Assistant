import React, {useState} from 'react';
import {ScrollView, View, Text, TouchableOpacity, StyleSheet} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {C, R} from '../theme/tokens';
import {Icon} from '../components/Icon';
import {Field, PrimaryButton} from '../components/Ui';

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

  return (
    <View style={[s.container, {paddingTop: insets.top}]}>
      {/* Top bar */}
      <View style={s.header}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={onClose}
          style={s.backBtn}
        >
          <Icon name="chevronLeft" size={19} color={C.ink}/>
        </TouchableOpacity>
        <View style={s.brand}>
          <View style={s.brandMark}>
            <Icon name="home" size={16} color="#fff"/>
          </View>
          <Text style={s.brandText}>StayMate</Text>
        </View>
        <View style={{width: 36}}/>
      </View>

      <ScrollView
        contentContainerStyle={{padding: 20, paddingBottom: Math.max(40, insets.bottom + 20)}}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={s.hero}>
          <View style={s.heroMark}>
            <Icon name="shield" size={28} color={C.primary}/>
          </View>
          <Text style={s.h1}>Owner Account</Text>
          <Text style={s.heroText}>
            Secure access to your property, guests and self check-ins.
          </Text>
          <View style={s.trust}>
            <Icon name="lock" size={13} color={C.primary}/>
            <Text style={s.trustText}>Secure owner access</Text>
          </View>
        </View>

        {/* Tabs */}
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

        {/* Form */}
        {mode === 'signup' && (
          <Field
            label="Property / business name"
            value={property}
            onChangeText={setProperty}
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
        />
        <Field
          label={mode === 'login' ? 'Password' : 'Create password'}
          value={pw}
          onChangeText={setPw}
          placeholder={mode === 'login' ? 'Enter your password' : 'At least 8 characters'}
          secure
          icon="lock"
        />

        {mode === 'login' && (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() =>
              onModal(
                'Password reset',
                'We will help you reset your owner account password securely.'
              )
            }
            style={s.forgotWrap}
          >
            <Text style={s.forgot}>Forgot password?</Text>
          </TouchableOpacity>
        )}

        <View style={{marginTop: mode === 'login' ? 0 : 16}}>
          <PrimaryButton
            label={mode === 'login' ? 'Log in to StayMate' : 'Create owner account'}
            onPress={() =>
              onToast(mode === 'login' ? 'Welcome back to StayMate' : 'Owner account created')
            }
          />
        </View>

        {/* Divider */}
        <View style={s.div}>
          <View style={s.line}/>
          <Text style={s.or}>or</Text>
          <View style={s.line}/>
        </View>

        {/* Google sign-in */}
        <TouchableOpacity
          activeOpacity={0.85}
          style={s.google}
          onPress={() => onToast('Google sign-in selected')}
        >
          <Text style={s.googleText}>G</Text>
          <Text style={s.googleLabel}>Continue with Google</Text>
        </TouchableOpacity>

        <Text style={s.note}>
          By continuing, you agree to StayMate's{' '}
          <Text style={{color: '#222222', fontWeight: '700'}}>Terms</Text> and{' '}
          <Text style={{color: '#222222', fontWeight: '700'}}>Privacy</Text>.
        </Text>
      </ScrollView>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f2f2f2',
    alignItems: 'center',
    justifyContent: 'center',
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
    paddingTop: 20,
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
    shadowOffset: {width: 0, height: 4},
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
    marginTop: 6,
    marginBottom: 18,
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
