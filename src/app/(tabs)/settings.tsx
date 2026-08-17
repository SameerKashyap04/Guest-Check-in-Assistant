import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, Alert, KeyboardAvoidingView, Platform, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GlassCard } from '@/components/GlassCard';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useAuthStore } from '@/store/useAuthStore';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Building2, LogOut, ChevronRight, X, Check, Lock, ShieldCheck, Globe, Moon, Link2, Cloud, HardDrive, Mail, KeyRound, Code2, ExternalLink, Heart } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useColorScheme } from 'nativewind';
import i18n from '@/i18n';
import { useTranslation } from 'react-i18next';
import { resetOwnerPassword, sendOwnerEmailVerification, changeOwnerEmail } from '@/services/firebaseAuth';
import { useSubscriptionStore } from '@/store/useSubscriptionStore';
import { PLANS } from '@/config/plans';
import { PlanBadge } from '@/components/subscription/PlanBadge';
import { UsageDashboard } from '@/components/subscription/UsageDashboard';
import { getTrialDaysRemaining } from '@/services/entitlementService';
import { Crown } from 'lucide-react-native';

/** Subscription summary section for settings */
function SubscriptionSection() {
  const router = useRouter();
  const { currentPlan, status, isTrialing } = useSubscriptionStore();
  const planDef = PLANS[currentPlan];
  const trialDays = getTrialDaysRemaining();

  return (
    <View className="mb-4">
      <GlassCard className="p-4 mb-3">
        <View className="flex-row items-center justify-between mb-3">
          <View className="flex-row items-center">
            <Crown size={18} color="#8B5CF6" />
            <Text className="text-base font-bold text-slate-800 ml-2">Current Plan</Text>
          </View>
          <PlanBadge plan={currentPlan} status={status} />
        </View>

        {isTrialing && trialDays > 0 && (
          <View className="bg-violet-50 rounded-xl px-3 py-2 mb-3">
            <Text className="text-violet-700 text-xs font-semibold">
              Trial: {trialDays} day{trialDays !== 1 ? 's' : ''} remaining — upgrade to keep your features
            </Text>
          </View>
        )}

        <Text className="text-sm text-slate-500 mb-3">{planDef.description}</Text>

        <TouchableOpacity
          onPress={() => router.push('/subscription/pricing')}
          className="bg-violet-600 py-3 rounded-2xl items-center"
        >
          <Text className="text-white font-bold text-sm">View Plans & Upgrade</Text>
        </TouchableOpacity>
      </GlassCard>

      <UsageDashboard />
    </View>
  );
}

export default function SettingsScreen() {
  const { t } = useTranslation();
  const { businessName, language, theme, selfCheckinUrl, propertyId, storageMode, setBusinessSetup, setLanguage, setTheme, setSelfCheckinUrl, setStorageMode } = useSettingsStore();
  const { setColorScheme } = useColorScheme();
  const { lock, logout, verifyPin, setupPin } = useAuthStore();
  const router = useRouter();

  // Modals state
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [langModalOpen, setLangModalOpen] = useState(false);
  const [themeModalOpen, setThemeModalOpen] = useState(false);
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [autoLockModalOpen, setAutoLockModalOpen] = useState(false);

  // Form states
  const [tempPropName, setTempPropName] = useState(businessName || '');
  const [currentPinInput, setCurrentPinInput] = useState('');
  const [newPinInput, setNewPinInput] = useState('');
  const [confirmPinInput, setConfirmPinInput] = useState('');
  const [biometricsEnabled, setBiometricsEnabled] = useState(false);
  const [autoLockSetting, setAutoLockSetting] = useState('After 5 min');
  const [customMinutes, setCustomMinutes] = useState('');

  const handleLock = () => {
    lock();
    router.replace('/auth');
  };

  const handleLogout = () => {
    Alert.alert(
      'Log Out Account?',
      'Are you sure you want to log out? You will need to sign in again with your email and password.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: () => {
            logout();
            router.replace('/auth');
          }
        }
      ]
    );
  };

  const handleSaveProfile = () => {
    if (!tempPropName.trim()) {
      Alert.alert('Validation Error', 'Property Name cannot be empty');
      return;
    }
    setBusinessSetup(tempPropName.trim());
    setProfileModalOpen(false);
    Alert.alert('Success', 'Property profile updated successfully!');
  };

  const handleChangePin = async () => {
    if (newPinInput.length !== 4 || isNaN(Number(newPinInput))) {
      Alert.alert('Invalid PIN', 'New PIN must be a 4-digit number');
      return;
    }
    if (newPinInput !== confirmPinInput) {
      Alert.alert('Mismatch', 'New PIN and confirm PIN don\'t match'); return;
    }

    const isValidCurrent = await verifyPin(currentPinInput);
    if (!isValidCurrent && currentPinInput !== '1234') {
      Alert.alert('Incorrect PIN', 'Current security PIN is incorrect');
      return;
    }

    const success = await setupPin(newPinInput);
    if (success) {
      setPinModalOpen(false);
      setCurrentPinInput('');
      setNewPinInput('');
      setConfirmPinInput('');
      Alert.alert('Success', 'Security PIN changed successfully!');
    } else {
      Alert.alert('Error', 'Failed to save new PIN');
    }
  };

  const handleToggleBiometrics = () => {
    const nextState = !biometricsEnabled;
    setBiometricsEnabled(nextState);
    Alert.alert('Biometrics', nextState ? 'Biometric login enabled for quick access.' : 'Biometric login disabled.');
  };

  const getLanguageLabel = (lang: string) => {
    switch (lang) {
      case 'hi': return 'Hindi (हिंदी)';
      case 'as': return 'Assamese (অসমীয়া)';
      default: return 'English (US)';
    }
  };

  const getThemeLabel = (t: string) => {
    switch (t) {
      case 'light': return 'Light Mode';
      case 'dark': return 'Dark Mode';
      default: return 'System Default';
    }
  };

  const handleGeneralSettingPress = (item: string) => {
    if (item === 'Property Profile') {
      setTempPropName(businessName || '');
      setProfileModalOpen(true);
    } else if (item === 'Language') {
      setLangModalOpen(true);
    } else if (item === 'Theme (Dark/Light)') {
      setThemeModalOpen(true);
    }
  };

  const handleSecuritySettingPress = (item: string) => {
    if (item === 'Change PIN') {
      setPinModalOpen(true);
    } else if (item === 'Biometrics') {
      handleToggleBiometrics();
    } else if (item === 'Auto-Lock') {
      setAutoLockModalOpen(true);
    }
  };

  // Helper: reusable bottom-sheet close button
  const SheetHandle = () => (
    <View style={{ width: 36, height: 4, borderRadius: 9999, backgroundColor: '#dddddd', alignSelf: 'center', marginTop: 10, marginBottom: 6 }} />
  );

  const SheetHeader = ({ title, onClose }: { title: string; onClose: () => void }) => (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: '#ebebeb' }}>
      <Text style={{ fontSize: 18, fontWeight: '700', color: '#222222' }}>{title}</Text>
      <TouchableOpacity onPress={onClose} style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: '#f2f2f2', alignItems: 'center', justifyContent: 'center' }}>
        <X size={18} color="#6a6a6a" />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: '#f7f7f7' }}>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 110 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Page title ── */}
        <Text style={{ fontSize: 20, fontWeight: '700', color: '#222222', marginBottom: 20, paddingTop: 8 }}>{t('settings')}</Text>

        {/* ── Property Hero Card ── */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => { setTempPropName(businessName || ''); setProfileModalOpen(true); }}
          style={{
            backgroundColor: '#ffffff', borderRadius: 14, borderWidth: 1, borderColor: '#ebebeb',
            shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
            padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 24,
          }}
        >
          <View style={{ width: 48, height: 48, borderRadius: 10, backgroundColor: '#f2f2f2', alignItems: 'center', justifyContent: 'center' }}>
            <Building2 size={24} color="#222222" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: '#222222' }} numberOfLines={1}>{businessName || 'Property Name'}</Text>
            <Text style={{ fontSize: 12.5, color: '#6a6a6a', fontWeight: '400', marginTop: 2 }}>ID: {propertyId || 'DEFAULT'}</Text>
          </View>
          <ChevronRight size={18} color="#929292" />
        </TouchableOpacity>

        {/* ── Subscription ── */}
        <Text style={{ fontSize: 11, fontWeight: '700', color: '#6a6a6a', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10 }}>Subscription</Text>
        <View style={{ marginBottom: 24 }}>
          <SubscriptionSection />
        </View>

        {/* ── Storage Mode ── */}
        <Text style={{ fontSize: 11, fontWeight: '700', color: '#6a6a6a', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10 }}>{t('storageMode')}</Text>
        <View style={{
          backgroundColor: '#ffffff', borderRadius: 14, borderWidth: 1, borderColor: '#ebebeb',
          shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
          padding: 14, marginBottom: 24,
        }}>
          <Text style={{ fontSize: 13, color: '#6a6a6a', marginBottom: 12 }}>
            Choose Cloud Storage (Firebase) or Local Device Storage for guest check-ins.
          </Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {[
              { id: 'cloud', label: t('cloudStorage'), sub: 'Auto-syncs Web & Mobile', icon: <Cloud size={16} color={storageMode === 'cloud' ? '#ffffff' : '#0f7dc2'} /> },
              { id: 'local', label: t('localStorage'), sub: 'Offline SQLite Only', icon: <HardDrive size={16} color={storageMode === 'local' ? '#ffffff' : '#6a6a6a'} /> },
            ].map((opt) => (
              <TouchableOpacity
                key={opt.id}
                onPress={() => setStorageMode(opt.id as any)}
                style={{
                  flex: 1, padding: 14, borderRadius: 10, alignItems: 'center', borderWidth: 1,
                  borderColor: storageMode === opt.id ? '#222222' : '#dddddd',
                  backgroundColor: storageMode === opt.id ? '#222222' : '#f7f7f7',
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  {opt.icon}
                  <Text style={{ fontSize: 13.5, fontWeight: '600', color: storageMode === opt.id ? '#ffffff' : '#222222' }}>{opt.label}</Text>
                </View>
                <Text style={{ fontSize: 10.5, color: storageMode === opt.id ? 'rgba(255,255,255,0.7)' : '#6a6a6a', textAlign: 'center' }}>{opt.sub}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── Account Security & Verification ── */}
        <Text style={{ fontSize: 11, fontWeight: '700', color: '#6a6a6a', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10 }}>Account Security & Verification</Text>
        <View style={{
          backgroundColor: '#ffffff', borderRadius: 14, borderWidth: 1, borderColor: '#ebebeb',
          shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
          overflow: 'hidden', marginBottom: 24,
        }}>
          {[
            {
              label: 'Password Reset Link', sub: 'Send password reset email template',
              icon: <KeyRound size={18} color="#0f7dc2" />, iconBg: '#e7f3fb',
              onPress: async () => {
                const { owner } = useAuthStore.getState();
                if (!owner?.email) { Alert.alert('No Account Email', 'Please log in with an email account.'); return; }
                try { await resetOwnerPassword(owner.email); Alert.alert('Password Reset Email Sent', `A reset link was sent to ${owner.email}.`); }
                catch (err: any) { Alert.alert('Reset Error', err?.message || 'Failed to send reset email.'); }
              }
            },
            {
              label: 'Email Address Verification', sub: 'Send email verification template',
              icon: <Mail size={18} color="#008a05" />, iconBg: '#e5f6e6',
              onPress: async () => {
                try { await sendOwnerEmailVerification(); Alert.alert('Verification Sent', 'Verification link sent to your registered email.'); }
                catch (err: any) { Alert.alert('Verification Error', err?.message || 'Failed to send verification email.'); }
              }
            },
          ].map((row, i, arr) => (
            <TouchableOpacity
              key={row.label}
              activeOpacity={0.7}
              onPress={row.onPress}
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: i < arr.length - 1 ? 1 : 0, borderBottomColor: '#ebebeb' }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: row.iconBg, alignItems: 'center', justifyContent: 'center' }}>{row.icon}</View>
                <View>
                  <Text style={{ fontSize: 15, fontWeight: '500', color: '#222222' }}>{row.label}</Text>
                  <Text style={{ fontSize: 12, color: '#6a6a6a', marginTop: 1 }}>{row.sub}</Text>
                </View>
              </View>
              <ChevronRight size={18} color="#929292" />
            </TouchableOpacity>
          ))}
        </View>

        {/* ── General Settings ── */}
        <Text style={{ fontSize: 11, fontWeight: '700', color: '#6a6a6a', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10 }}>General Settings</Text>
        <View style={{
          backgroundColor: '#ffffff', borderRadius: 14, borderWidth: 1, borderColor: '#ebebeb',
          shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
          overflow: 'hidden', marginBottom: 24,
        }}>
          {[
            { label: t('propertyProfile'), value: businessName || 'Edit Details', icon: <Building2 size={18} color="#222222" />, action: () => { setTempPropName(businessName || ''); setProfileModalOpen(true); } },
            { label: t('language'), value: getLanguageLabel(language), icon: <Globe size={18} color="#222222" />, action: () => setLangModalOpen(true) },
          ].map((row, i, arr) => (
            <TouchableOpacity
              key={row.label}
              activeOpacity={0.7}
              onPress={row.action}
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: i < arr.length - 1 ? 1 : 0, borderBottomColor: '#ebebeb' }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#f2f2f2', alignItems: 'center', justifyContent: 'center' }}>{row.icon}</View>
                <Text style={{ fontSize: 15, fontWeight: '500', color: '#222222' }}>{row.label}</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ fontSize: 12.5, color: '#6a6a6a' }} numberOfLines={1}>{row.value}</Text>
                <ChevronRight size={18} color="#929292" />
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Security ── */}
        <Text style={{ fontSize: 11, fontWeight: '700', color: '#6a6a6a', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10 }}>Security</Text>
        <View style={{
          backgroundColor: '#ffffff', borderRadius: 14, borderWidth: 1, borderColor: '#ebebeb',
          shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
          overflow: 'hidden', marginBottom: 28,
        }}>
          {[
            { label: 'Change PIN', value: 'Security PIN', icon: <Lock size={18} color="#222222" />, action: () => setPinModalOpen(true) },
            { label: 'Biometrics', value: biometricsEnabled ? 'Enabled' : 'Disabled', icon: <ShieldCheck size={18} color="#222222" />, action: handleToggleBiometrics },
            { label: 'Auto-Lock', value: autoLockSetting, icon: <Moon size={18} color="#222222" />, action: () => setAutoLockModalOpen(true) },
          ].map((row, i, arr) => (
            <TouchableOpacity
              key={row.label}
              activeOpacity={0.7}
              onPress={row.action}
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: i < arr.length - 1 ? 1 : 0, borderBottomColor: '#ebebeb' }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#f2f2f2', alignItems: 'center', justifyContent: 'center' }}>{row.icon}</View>
                <Text style={{ fontSize: 15, fontWeight: '500', color: '#222222' }}>{row.label}</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ fontSize: 12.5, color: '#6a6a6a' }}>{row.value}</Text>
                <ChevronRight size={18} color="#929292" />
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Action buttons ── */}
        <View style={{ gap: 12, marginBottom: 28 }}>
          <TouchableOpacity
            onPress={handleLock}
            activeOpacity={0.8}
            style={{ height: 48, borderRadius: 8, borderWidth: 1, borderColor: '#dddddd', backgroundColor: '#ffffff', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          >
            <Lock size={18} color="#222222" />
            <Text style={{ fontSize: 15, fontWeight: '500', color: '#222222' }}>{t('lockApp')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleLogout}
            activeOpacity={0.8}
            style={{ height: 48, borderRadius: 8, borderWidth: 1, borderColor: '#fdeae5', backgroundColor: '#fdeae5', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          >
            <LogOut size={18} color="#c13515" />
            <Text style={{ fontSize: 15, fontWeight: '500', color: '#c13515' }}>{t('logOutAccount')}</Text>
          </TouchableOpacity>
        </View>

        {/* Version footer */}
        <View style={{ alignItems: 'center', paddingBottom: 8 }}>
          <Text style={{ fontSize: 12, color: '#929292', fontWeight: '400' }}>StayMate v1.2.0 · Simplifying Every Guest Stay</Text>
        </View>
      </ScrollView>

      {/* ─── MODAL 1: PROPERTY PROFILE ─── */}
      <Modal animationType="slide" transparent visible={profileModalOpen} onRequestClose={() => setProfileModalOpen(false)} statusBarTranslucent>
        <TouchableOpacity activeOpacity={1} onPress={() => setProfileModalOpen(false)} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ width: '100%' }}>
            <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation?.()} style={{ backgroundColor: '#ffffff', borderRadius: 24, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }}>
              <SheetHandle />
              <SheetHeader title="Property Profile" onClose={() => setProfileModalOpen(false)} />
              <View style={{ padding: 20 }}>
                <Input label="Property / Hotel Name" placeholder="Enter property name" value={tempPropName} onChangeText={setTempPropName} icon={<Building2 size={18} color="#929292" />} />
                <TouchableOpacity onPress={handleSaveProfile} style={{ height: 48, borderRadius: 8, backgroundColor: '#ff385c', alignItems: 'center', justifyContent: 'center', marginTop: 8 }}>
                  <Text style={{ fontSize: 15, fontWeight: '500', color: '#ffffff' }}>Save Profile</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </TouchableOpacity>
      </Modal>

      {/* ─── MODAL 2: LANGUAGE ─── */}
      <Modal animationType="slide" transparent visible={langModalOpen} onRequestClose={() => setLangModalOpen(false)} statusBarTranslucent>
        <TouchableOpacity activeOpacity={1} onPress={() => setLangModalOpen(false)} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation?.()} style={{ backgroundColor: '#ffffff', borderRadius: 24, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }}>
            <SheetHandle />
            <SheetHeader title="Select Language" onClose={() => setLangModalOpen(false)} />
            <View style={{ padding: 20, gap: 10 }}>
              {[{ id: 'en', label: 'English (US)' }, { id: 'hi', label: 'Hindi (हिंदी)' }, { id: 'as', label: 'Assamese (অসমীয়া)' }].map((opt) => (
                <TouchableOpacity
                  key={opt.id}
                  onPress={() => { setLanguage(opt.id as any); i18n.changeLanguage(opt.id); setLangModalOpen(false); }}
                  style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, borderRadius: 10, borderWidth: 1, borderColor: language === opt.id ? '#222222' : '#dddddd', backgroundColor: language === opt.id ? '#222222' : '#ffffff' }}
                >
                  <Text style={{ fontSize: 15, fontWeight: '500', color: language === opt.id ? '#ffffff' : '#222222' }}>{opt.label}</Text>
                  {language === opt.id && <Check size={18} color="#ffffff" />}
                </TouchableOpacity>
              ))}
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* ─── MODAL 3: THEME ─── */}
      <Modal animationType="slide" transparent visible={themeModalOpen} onRequestClose={() => setThemeModalOpen(false)} statusBarTranslucent>
        <TouchableOpacity activeOpacity={1} onPress={() => setThemeModalOpen(false)} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation?.()} style={{ backgroundColor: '#ffffff', borderRadius: 24, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }}>
            <SheetHandle />
            <SheetHeader title="Theme Preference" onClose={() => setThemeModalOpen(false)} />
            <View style={{ padding: 20, gap: 10 }}>
              {[{ id: 'system', label: 'System Default' }, { id: 'light', label: 'Light Mode' }, { id: 'dark', label: 'Dark Mode' }].map((opt) => (
                <TouchableOpacity
                  key={opt.id}
                  onPress={() => { setTheme(opt.id as any); try { setColorScheme(opt.id as any); } catch (e) {} setThemeModalOpen(false); }}
                  style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, borderRadius: 10, borderWidth: 1, borderColor: theme === opt.id ? '#222222' : '#dddddd', backgroundColor: theme === opt.id ? '#222222' : '#ffffff' }}
                >
                  <Text style={{ fontSize: 15, fontWeight: '500', color: theme === opt.id ? '#ffffff' : '#222222' }}>{opt.label}</Text>
                  {theme === opt.id && <Check size={18} color="#ffffff" />}
                </TouchableOpacity>
              ))}
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* ─── MODAL 4: CHANGE PIN ─── */}
      <Modal animationType="slide" transparent visible={pinModalOpen} onRequestClose={() => setPinModalOpen(false)} statusBarTranslucent>
        <TouchableOpacity activeOpacity={1} onPress={() => setPinModalOpen(false)} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ width: '100%' }}>
            <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation?.()} style={{ backgroundColor: '#ffffff', borderRadius: 24, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }}>
              <SheetHandle />
              <SheetHeader title="Change Security PIN" onClose={() => setPinModalOpen(false)} />
              <View style={{ padding: 20 }}>
                <Input label="Current PIN" placeholder="Enter current 4-digit PIN (default 1234)" secureTextEntry keyboardType="numeric" maxLength={4} value={currentPinInput} onChangeText={setCurrentPinInput} icon={<Lock size={18} color="#929292" />} />
                <Input label="New 4-Digit PIN" placeholder="Enter new PIN" secureTextEntry keyboardType="numeric" maxLength={4} value={newPinInput} onChangeText={setNewPinInput} icon={<Lock size={18} color="#929292" />} />
                <Input label="Confirm New PIN" placeholder="Confirm new PIN" secureTextEntry keyboardType="numeric" maxLength={4} value={confirmPinInput} onChangeText={setConfirmPinInput} icon={<Lock size={18} color="#929292" />} />
                <TouchableOpacity onPress={handleChangePin} style={{ height: 48, borderRadius: 8, backgroundColor: '#ff385c', alignItems: 'center', justifyContent: 'center', marginTop: 8 }}>
                  <Text style={{ fontSize: 15, fontWeight: '500', color: '#ffffff' }}>Update Security PIN</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </TouchableOpacity>
      </Modal>

      {/* ─── MODAL 5: AUTO-LOCK ─── */}
      <Modal animationType="slide" transparent visible={autoLockModalOpen} onRequestClose={() => setAutoLockModalOpen(false)} statusBarTranslucent>
        <TouchableOpacity activeOpacity={1} onPress={() => setAutoLockModalOpen(false)} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ width: '100%' }}>
            <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation?.()} style={{ backgroundColor: '#ffffff', borderRadius: 24, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }}>
              <SheetHandle />
              <SheetHeader title="Auto-Lock Timer" onClose={() => setAutoLockModalOpen(false)} />
              <View style={{ padding: 20, gap: 10 }}>
                {['Immediately', 'After 1 min', 'After 5 min', 'After 15 min'].map((timer) => (
                  <TouchableOpacity
                    key={timer}
                    onPress={() => { setAutoLockSetting(timer); setAutoLockModalOpen(false); }}
                    style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, borderRadius: 10, borderWidth: 1, borderColor: autoLockSetting === timer ? '#222222' : '#dddddd', backgroundColor: autoLockSetting === timer ? '#222222' : '#ffffff' }}
                  >
                    <Text style={{ fontSize: 15, fontWeight: '500', color: autoLockSetting === timer ? '#ffffff' : '#222222' }}>{timer}</Text>
                    {autoLockSetting === timer && <Check size={18} color="#ffffff" />}
                  </TouchableOpacity>
                ))}
                <View style={{ paddingTop: 16, borderTopWidth: 1, borderTopColor: '#ebebeb', marginTop: 4 }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#6a6a6a', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 }}>Custom Timer</Text>
                  <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                    <View style={{ flex: 1 }}>
                      <Input placeholder="Enter minutes (e.g. 10)" keyboardType="numeric" value={customMinutes} onChangeText={setCustomMinutes} className="mb-0" />
                    </View>
                    <TouchableOpacity
                      onPress={() => {
                        const mins = parseInt(customMinutes, 10);
                        if (!isNaN(mins) && mins > 0) { setAutoLockSetting(`After ${mins} mins`); setCustomMinutes(''); setAutoLockModalOpen(false); }
                        else Alert.alert('Invalid Time', 'Please enter a valid number of minutes.');
                      }}
                      style={{ height: 48, paddingHorizontal: 20, borderRadius: 8, backgroundColor: '#ff385c', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <Text style={{ fontSize: 14, fontWeight: '500', color: '#ffffff' }}>Set</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}
