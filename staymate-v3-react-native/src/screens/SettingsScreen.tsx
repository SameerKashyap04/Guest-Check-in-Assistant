import React, {useState, useEffect, useRef} from 'react';
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
  Linking,
  Animated,
  Vibration,
} from 'react-native';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import {C, R, shadow} from '../theme/tokens';
import {useTheme, ThemeMode} from '../theme/ThemeContext';
import {Icon, IconName} from '../components/Icon';
import {SettingRow, PrimaryButton, SecondaryButton, Field} from '../components/Ui';
import {securityService} from '../services/securityService';
import {updateOwnerProfile} from '../services/firebaseAuth';

const StayMateLogo = require('../../assets/staymate-logo.png');
const StayMateLogoDark = require('../../assets/staymate-logo-dark.png');

interface PropertyProfile {
  name: string;
  code: string;
  owner: string;
  address: string;
  phone: string;
  email: string;
}

const LANGUAGES = [
  {id: 'en', name: 'English', native: 'English'},
  {id: 'hi', name: 'Hindi', native: 'हिंदी'},
  {id: 'ta', name: 'Tamil', native: 'தமிழ்'},
  {id: 'te', name: 'Telugu', native: 'తెలుగు'},
  {id: 'kn', name: 'Kannada', native: 'ಕನ್ನಡ'},
  {id: 'ml', name: 'Malayalam', native: 'മലയാളം'},
  {id: 'mr', name: 'Marathi', native: 'मराठी'},
  {id: 'bn', name: 'Bengali', native: 'বাংলা'},
  {id: 'gu', name: 'Gujarati', native: 'ગુજરાતી'},
  {id: 'pa', name: 'Punjabi', native: 'ਪੰਜਾਬੀ'},
];

const THEMES: {id: ThemeMode; name: string; desc: string}[] = [
  {id: 'light', name: 'Light mode', desc: 'Crisp bright white interface'},
  {id: 'dark', name: 'Dark mode', desc: 'Sleek low-light theme'},
  {id: 'system', name: 'System preference', desc: 'Automatically match device appearance'},
];

const AUTOLOCK_OPTIONS = [
  {id: '0', label: 'Immediately'},
  {id: '1', label: 'After 1 minute'},
  {id: '5', label: 'After 5 minutes'},
  {id: '15', label: 'After 15 minutes'},
  {id: '30', label: 'After 30 minutes'},
  {id: 'never', label: 'Never'},
];

export function SettingsScreen({
  currentPlan,
  userProfile,
  onAccount,
  onModal,
  onPricing,
  onReferEarn,
  onStaff,
  onProperties,
  onLogout,
  onLock,
  onToast,
  onProfileUpdated,
}: {
  currentPlan?: string;
  userProfile?: any;
  onAccount: () => void;
  onModal?: (title: string, text: string) => void;
  onPricing: () => void;
  onReferEarn?: () => void;
  onStaff?: () => void;
  onProperties?: () => void;
  onLogout: () => void;
  onLock: () => void;
  onToast?: (msg: string) => void;
  onProfileUpdated?: (updated: any) => void;
}) {
  const { themeMode, isDark, colors, setThemeMode } = useTheme();

  // Cloud Mode entitlement (Professional, Multi-Property, Enterprise only)
  const normalizedPlan = (currentPlan || '').toLowerCase();
  const isCloudAllowed =
    normalizedPlan.includes('pro') ||
    normalizedPlan.includes('multi') ||
    normalizedPlan.includes('enterprise');

  // Live State
  const [profile, setProfile] = useState<PropertyProfile>({
    name: userProfile?.businessName || userProfile?.propertyName || 'Sunrise Homestay',
    code: userProfile?.propertyId || 'HS-4821',
    owner: userProfile?.ownerName || userProfile?.displayName || (userProfile?.email ? userProfile.email.split('@')[0] : 'Homestay Owner'),
    address: userProfile?.address || 'Plot 14, Hilltop View Road, Ooty, Tamil Nadu 643001',
    phone: userProfile?.phone || '+91 98765 43210',
    email: userProfile?.email || 'owner@sunrisehomestay.com',
  });

  useEffect(() => {
    if (userProfile) {
      setProfile((prev) => ({
        ...prev,
        name: userProfile.businessName || userProfile.propertyName || prev.name,
        code: userProfile.propertyId || prev.code,
        owner: userProfile.ownerName || userProfile.displayName || (userProfile.email ? userProfile.email.split('@')[0] : prev.owner),
        email: userProfile.email || prev.email,
        phone: userProfile.phone || prev.phone,
        address: userProfile.address || prev.address,
      }));
    }
  }, [userProfile]);

  const [cloudSync, setCloudSync] = useState(true);
  const [requirePin, setRequirePin] = useState(true);
  const [biometric, setBiometric] = useState(true);
  const [language, setLanguage] = useState('English');
  const [autoLock, setAutoLock] = useState('After 5 minutes');

  // Load persistent security settings on mount
  useEffect(() => {
    (async () => {
      const cfg = await securityService.init();
      setRequirePin(cfg.isLockEnabled);
      setBiometric(cfg.isBiometricEnabled);
      const minutesMap: Record<number, string> = {
        0: 'Immediately',
        1: 'After 1 minute',
        5: 'After 5 minutes',
        15: 'After 15 minutes',
        [-1]: 'Never',
      };
      setAutoLock(minutesMap[cfg.autoLockMinutes] || 'After 5 minutes');
    })();
  }, []);

  // Modal Sheet State
  const [activeModal, setActiveModal] = useState<
    | 'profile' | 'language' | 'theme' | 'pin' | 'autolock' | 'help'
    | 'general' | 'security' | 'team' | 'storage'
    | null
  >(null);

  // Form Temp States
  const [editProfile, setEditProfile] = useState<PropertyProfile>(profile);
  const insets = useSafeAreaInsets();
  const [changePinStep, setChangePinStep] = useState<'current' | 'new' | 'confirm'>('current');
  const [changePinDigits, setChangePinDigits] = useState('');
  const [tempNewPin, setTempNewPin] = useState('');
  const [changePinError, setChangePinError] = useState('');
  const changePinShakeAnim = useRef(new Animated.Value(0)).current;

  const triggerChangePinShake = () => {
    Animated.sequence([
      Animated.timing(changePinShakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(changePinShakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(changePinShakeAnim, { toValue: 8, duration: 50, useNativeDriver: true }),
      Animated.timing(changePinShakeAnim, { toValue: -8, duration: 50, useNativeDriver: true }),
      Animated.timing(changePinShakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const notify = (msg: string) => {
    if (onToast) onToast(msg);
  };

  // Open Profile Sheet
  const handleOpenProfile = () => {
    setEditProfile({...profile});
    setActiveModal('profile');
  };

  // Save Profile Sheet
  const handleSaveProfile = async () => {
    if (!editProfile.name.trim()) {
      Alert.alert('Required', 'Please enter a property name.');
      return;
    }
    setProfile(editProfile);
    setActiveModal(null);
    try {
      const uid = userProfile?.uid || '';
      const updates = {
        businessName: editProfile.name.trim(),
        name: editProfile.owner.trim(),
        ownerName: editProfile.owner.trim(),
        propertyId: editProfile.code.trim(),
        phone: editProfile.phone.trim(),
        email: editProfile.email.trim(),
        address: editProfile.address.trim(),
        location: editProfile.address.trim(),
      };
      await updateOwnerProfile(uid, updates);
      if (onProfileUpdated) {
        onProfileUpdated(updates);
      }
      notify('Property profile updated & synced to cloud');
    } catch (e) {
      notify('Property profile updated');
    }
  };

  // Toggle Cloud Mode (restricted to Professional plan or higher)
  const handleToggleCloud = () => {
    if (!isCloudAllowed) {
      Alert.alert(
        'Professional Feature',
        'Cloud storage & live multi-device sync is available exclusively on the Professional plan and higher.\n\nUpgrade to unlock automated cloud backup and staff device sync.',
        [
          { text: 'Not Now', style: 'cancel' },
          {
            text: 'View Plans',
            onPress: onPricing,
          },
        ]
      );
      return;
    }

    const next = !cloudSync;
    setCloudSync(next);
    notify(
      next
        ? 'Cloud mode enabled: Real-time multi-device sync active'
        : 'Offline mode active: Local-first storage enabled'
    );
  };

  // Toggle Require PIN
  const handleToggleRequirePin = async () => {
    const next = !requirePin;
    setRequirePin(next);
    await securityService.setLockEnabled(next);
    notify(next ? 'App lock enabled (PIN required on launch)' : 'App lock disabled');
  };

  // Toggle Biometric
  const handleToggleBiometric = async () => {
    const next = !biometric;
    setBiometric(next);
    await securityService.setBiometricEnabled(next);
    notify(
      next
        ? 'Biometric unlock enabled (Face ID / Fingerprint)'
        : 'Biometric unlock disabled'
    );
  };

  // Open PIN Sheet
  const handleOpenPin = () => {
    setChangePinStep('current');
    setChangePinDigits('');
    setTempNewPin('');
    setChangePinError('');
    setActiveModal('pin');
  };

  const handleChangePinKeyPress = async (key: string) => {
    if (changePinDigits.length >= 4) return;
    const next = changePinDigits + key;
    setChangePinDigits(next);
    setChangePinError('');

    if (next.length === 4) {
      if (changePinStep === 'current') {
        const verifyRes = await securityService.verifyPin(next);
        if (verifyRes.success) {
          setTimeout(() => {
            setChangePinStep('new');
            setChangePinDigits('');
            setChangePinError('');
          }, 150);
        } else {
          triggerChangePinShake();
          if (Platform.OS !== 'web') Vibration.vibrate(200);
          setTimeout(() => {
            setChangePinDigits('');
            setChangePinError('Incorrect current PIN. Try again.');
          }, 150);
        }
      } else if (changePinStep === 'new') {
        setTempNewPin(next);
        setTimeout(() => {
          setChangePinStep('confirm');
          setChangePinDigits('');
          setChangePinError('');
        }, 150);
      } else if (changePinStep === 'confirm') {
        if (next === tempNewPin) {
          await securityService.savePin(next);
          notify('✓ Security PIN changed successfully');
          setActiveModal(null);
          setChangePinStep('current');
          setChangePinDigits('');
          setTempNewPin('');
          setChangePinError('');
        } else {
          triggerChangePinShake();
          if (Platform.OS !== 'web') Vibration.vibrate(200);
          setTimeout(() => {
            setChangePinDigits('');
            setTempNewPin('');
            setChangePinError('PINs do not match. Enter new PIN again.');
            setChangePinStep('new');
          }, 150);
        }
      }
    }
  };

  const handleChangePinDelete = () => {
    setChangePinDigits((prev) => prev.slice(0, -1));
    setChangePinError('');
  };

  // Initials for avatar
  const initials = profile.name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('') || 'SM';

  const currentThemeLabel =
    themeMode === 'dark'
      ? 'Dark mode'
      : themeMode === 'light'
      ? 'Light mode'
      : 'System default';

  return (
    <ScrollView
      style={{flex: 1, backgroundColor: colors.canvas}}
      contentContainerStyle={{paddingHorizontal: 20, paddingBottom: 130}}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[s.h1, {color: colors.ink, marginTop: 4}]}>Settings</Text>
      <Text style={[s.pageSub, {color: colors.muted}]}>Manage your property, security & preferences</Text>

      {/* Profile card */}
      <TouchableOpacity
        activeOpacity={0.85}
        style={[s.profileCard, isDark && {backgroundColor: '#18181B', borderColor: '#27272A'}]}
        onPress={handleOpenProfile}
      >
        <View style={s.profileMark}>
          <Text style={s.profileMarkText}>{initials}</Text>
        </View>
        <View style={{flex: 1}}>
          <Text style={[s.profileTitle, {color: colors.ink}]}>{profile.name}</Text>
          <Text style={[s.profileSub, isDark && {color: colors.muted}]}>
            {profile.code} · {profile.owner}
          </Text>
        </View>
        <View style={[s.editBadge, {backgroundColor: isDark ? '#27272A' : '#F1F5F9'}]}>
          <Icon name="edit" size={14} color={colors.muted} />
        </View>
      </TouchableOpacity>

      {/* Plan & Usage card */}
      <View style={[s.planCard, isDark && { backgroundColor: '#18181B', borderColor: '#27272A' }]}>
        <View style={s.planTop}>
          <View>
            <Text style={[s.planTitle, { color: colors.ink }]}>{currentPlan || 'Professional'} plan</Text>
            <Text style={[s.planSub, isDark && { color: colors.muted }]}>
              {(currentPlan || '').toLowerCase().includes('free')
                ? 'Basic local-only tier'
                : (currentPlan || '').toLowerCase().includes('starter')
                ? 'Active subscription (Local-first storage)'
                : 'Active subscription (Cloud sync & OCR enabled)'}
            </Text>
          </View>
          <View style={s.proBadge}>
            <Text style={s.proBadgeText}>
              {(currentPlan || '').toUpperCase().includes('MULTI')
                ? 'MULTI'
                : (currentPlan || '').toUpperCase().includes('START')
                ? 'START'
                : (currentPlan || '').toUpperCase().includes('FREE')
                ? 'FREE'
                : 'PRO'}
            </Text>
          </View>
        </View>

        <UsageBar
          label="Check-ins"
          value={
            (currentPlan || '').toUpperCase().includes('STARTER')
              ? '84 / 100'
              : (currentPlan || '').toUpperCase().includes('FREE')
              ? '12 / 15'
              : '84 / Unlimited'
          }
          pct={(currentPlan || '').toUpperCase().includes('STARTER') ? 84 : (currentPlan || '').toUpperCase().includes('FREE') ? 80 : 25}
        />
        <UsageBar
          label="Reports & exports"
          value={
            (currentPlan || '').toUpperCase().includes('STARTER')
              ? '6 / 10'
              : (currentPlan || '').toUpperCase().includes('FREE')
              ? '2 / 3'
              : '6 / Unlimited'
          }
          pct={(currentPlan || '').toUpperCase().includes('STARTER') ? 60 : (currentPlan || '').toUpperCase().includes('FREE') ? 66 : 15}
          dark
        />

        <View style={s.ocrRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Icon name="scanText" size={16} color={colors.primary} />
            <Text style={[s.ocrText, isDark && { color: colors.ink }]}>AI Document OCR</Text>
          </View>
          <View style={s.activeBadge}>
            <Text style={s.activeBadgeText}>Active</Text>
          </View>
        </View>

        <PrimaryButton
          label="View plans & upgrade"
          onPress={onPricing}
          style={{marginTop: 14}}
        />
      </View>


      {/* ── Refer & Earn banner ── */}
      <TouchableOpacity
        activeOpacity={0.87}
        onPress={onReferEarn}
        style={[s.referBanner, isDark && {backgroundColor: '#2E1065', borderColor: '#5B21B6'}]}
      >
        <View style={[s.referBannerIcon, {backgroundColor: isDark ? '#5B21B6' : '#7C3AED'}]}>
          <Icon name="gift" size={18} color="#fff" />
        </View>
        <View style={{flex: 1}}>
          <Text style={[s.referBannerTitle, {color: isDark ? '#E9D5FF' : '#4C1D95'}]}>Refer & Earn</Text>
          <Text style={[s.referBannerSub, {color: isDark ? '#A78BFA' : '#7C3AED'}]}>Invite owners · Give ₹100, Earn ₹100</Text>
        </View>
        <Icon name="arrowRight" size={16} color={isDark ? '#A78BFA' : '#7C3AED'} />
      </TouchableOpacity>

      {/* ── Category grid ── */}
      <Text style={[s.sectionHeader, {marginTop: 22, color: colors.muted}]}>MANAGE</Text>

      <View style={s.categoryGrid}>
        {/* General */}
        <TouchableOpacity
          activeOpacity={0.85}
          style={[s.categoryCard, isDark && {backgroundColor: '#18181B', borderColor: '#27272A'}]}
          onPress={() => setActiveModal('general')}
        >
          <View style={[s.categoryIconBg, {backgroundColor: '#EEF2FF'}]}>
            <Icon name="settings" size={20} color="#4F46E5" />
          </View>
          <Text style={[s.categoryCardTitle, {color: colors.ink}]}>General</Text>
          <Text style={[s.categoryCardSub, {color: colors.muted}]}>Account, language & theme</Text>
          <View style={[s.categoryArrow, {backgroundColor: isDark ? '#27272A' : '#F8FAFC'}]}>
            <Icon name="chevronRight" size={13} color={colors.muted} />
          </View>
        </TouchableOpacity>

        {/* Security */}
        <TouchableOpacity
          activeOpacity={0.85}
          style={[s.categoryCard, isDark && {backgroundColor: '#18181B', borderColor: '#27272A'}]}
          onPress={() => setActiveModal('security')}
        >
          <View style={[s.categoryIconBg, {backgroundColor: '#ECFDF5'}]}>
            <Icon name="shield" size={20} color="#059669" />
          </View>
          <Text style={[s.categoryCardTitle, {color: colors.ink}]}>Security</Text>
          <Text style={[s.categoryCardSub, {color: colors.muted}]}>PIN, biometric & lock</Text>
          <View style={[s.categoryArrow, {backgroundColor: isDark ? '#27272A' : '#F8FAFC'}]}>
            <Icon name="chevronRight" size={13} color={colors.muted} />
          </View>
        </TouchableOpacity>

        {/* Team */}
        <TouchableOpacity
          activeOpacity={0.85}
          style={[s.categoryCard, isDark && {backgroundColor: '#18181B', borderColor: '#27272A'}]}
          onPress={() => setActiveModal('team')}
        >
          <View style={[s.categoryIconBg, {backgroundColor: '#FFF7ED'}]}>
            <Icon name="users" size={20} color="#EA580C" />
          </View>
          <Text style={[s.categoryCardTitle, {color: colors.ink}]}>Team</Text>
          <Text style={[s.categoryCardSub, {color: colors.muted}]}>Staff & properties</Text>
          <View style={[s.categoryArrow, {backgroundColor: isDark ? '#27272A' : '#F8FAFC'}]}>
            <Icon name="chevronRight" size={13} color={colors.muted} />
          </View>
        </TouchableOpacity>

        {/* Storage */}
        <TouchableOpacity
          activeOpacity={0.85}
          style={[s.categoryCard, isDark && {backgroundColor: '#18181B', borderColor: '#27272A'}]}
          onPress={() => setActiveModal('storage')}
        >
          <View style={[s.categoryIconBg, {backgroundColor: '#F0F9FF'}]}>
            <Icon name="cloud" size={20} color="#0284C7" />
          </View>
          <Text style={[s.categoryCardTitle, {color: colors.ink}]}>Storage</Text>
          <Text style={[s.categoryCardSub, {color: colors.muted}]}>Cloud & offline mode</Text>
          <View style={[s.categoryArrow, {backgroundColor: isDark ? '#27272A' : '#F8FAFC'}]}>
            <Icon name="chevronRight" size={13} color={colors.muted} />
          </View>
        </TouchableOpacity>
      </View>

      {/* Help & Support — full width */}
      <TouchableOpacity
        activeOpacity={0.85}
        style={[s.helpCard, isDark && {backgroundColor: '#18181B', borderColor: '#27272A'}]}
        onPress={() => setActiveModal('help')}
      >
        <View style={[s.categoryIconBg, {backgroundColor: '#FFF1F2'}]}>
          <Icon name="info" size={20} color="#E11D48" />
        </View>
        <View style={{flex: 1, marginLeft: 12}}>
          <Text style={[s.categoryCardTitle, {color: colors.ink}]}>Help & Support</Text>
          <Text style={[s.categoryCardSub, {color: colors.muted}]}>FAQs, email & WhatsApp helpline</Text>
        </View>
        <Icon name="chevronRight" size={16} color={colors.muted} />
      </TouchableOpacity>

      {/* About row */}
      <View style={[s.aboutRow, isDark && {backgroundColor: '#18181B', borderColor: '#27272A'}]}>
        <View style={{flex: 1}}>
          <Text style={{fontFamily: 'Inter', fontSize: 13, fontWeight: '600', color: colors.ink}}>StayMate v3.0.0</Text>
          <Text style={{fontFamily: 'Inter', fontSize: 12, color: colors.muted, marginTop: 1}}>Developed by Devify</Text>
        </View>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => Linking.openURL('https://www.devify.co.in')}
          style={{paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: isDark ? '#27272A' : '#F1F5F9'}}
        >
          <Text style={{fontFamily: 'Inter', fontSize: 12, fontWeight: '700', color: colors.muted}}>Visit</Text>
        </TouchableOpacity>
      </View>

      {/* Lock & Logout */}
      <View style={s.bottomActions}>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={onLock}
          style={[s.lockBtn, isDark && {backgroundColor: '#27272A'}]}
        >
          <Icon name="lock" size={16} color={colors.ink} />
          <Text style={[s.lockBtnText, isDark && {color: colors.ink}]}>Lock app</Text>
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={onLogout}
          style={[s.logoutBtn, isDark && {backgroundColor: '#18181B', borderColor: colors.primary}]}
        >
          <Icon name="logout" size={16} color={colors.primary} />
          <Text style={[s.logoutBtnText, {color: colors.primary}]}>Log out</Text>
        </TouchableOpacity>
      </View>

      {/* Devify Footer */}
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => Linking.openURL('https://www.devify.co.in')}
        style={s.devifyFooter}
      >
        <View style={s.footerContentRow}>
          <Image source={isDark ? StayMateLogoDark : StayMateLogo} style={s.footerLogo} resizeMode="contain" />
          <Text style={s.devifyText}>
            Engineered by <Text style={[s.devifyBrand, isDark && {color: colors.ink}]}>Devify</Text> · www.devify.co.in
          </Text>
        </View>
      </TouchableOpacity>

      {/* SUB-SHEET: GENERAL */}
      {activeModal === 'general' && (
        <Modal visible transparent animationType="slide" onRequestClose={() => setActiveModal(null)}>
          <View style={ms.sheetScrim}>
            <View style={[ms.sheet, isDark && {backgroundColor: '#18181B'}]}>
              <View style={[ms.handle, isDark && {backgroundColor: '#3F3F46'}]} />
              <View style={[ms.sheetHeaderBar, isDark && {borderBottomColor: '#27272A'}]}>
                <TouchableOpacity activeOpacity={0.7} onPress={() => setActiveModal(null)} style={[ms.sheetBackBtn, isDark && {backgroundColor: '#27272A'}]}>
                  <Icon name="chevronLeft" size={18} color={colors.ink} />
                </TouchableOpacity>
                <Text style={[ms.sheetHeaderTitle, isDark && {color: colors.ink}]}>General</Text>
                <TouchableOpacity activeOpacity={0.7} onPress={() => setActiveModal(null)} style={[ms.sheetCloseBtnRelative, isDark && {backgroundColor: '#27272A'}]}>
                  <Icon name="x" size={16} color={colors.ink} />
                </TouchableOpacity>
              </View>
              <ScrollView contentContainerStyle={{paddingHorizontal: 20, paddingBottom: 40}} showsVerticalScrollIndicator={false}>
                <SettingRow icon="users" label="Username & password" subtitle="Manage credentials & master password" onPress={() => { setActiveModal(null); onAccount(); }} />
                <SettingRow icon="mapPin" label="Property name & address" subtitle={profile.name} onPress={() => { setActiveModal(null); setTimeout(handleOpenProfile, 350); }} />
                <SettingRow icon="globe" label="Language" subtitle={language} onPress={() => { setActiveModal(null); setTimeout(() => setActiveModal('language'), 350); }} />
                <SettingRow icon="moon" label="Theme" subtitle={currentThemeLabel} onPress={() => { setActiveModal(null); setTimeout(() => setActiveModal('theme'), 350); }} />
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}

      {/* SUB-SHEET: SECURITY */}
      {activeModal === 'security' && (
        <Modal visible transparent animationType="slide" onRequestClose={() => setActiveModal(null)}>
          <View style={ms.sheetScrim}>
            <View style={[ms.sheet, isDark && {backgroundColor: '#18181B'}]}>
              <View style={[ms.handle, isDark && {backgroundColor: '#3F3F46'}]} />
              <View style={[ms.sheetHeaderBar, isDark && {borderBottomColor: '#27272A'}]}>
                <TouchableOpacity activeOpacity={0.7} onPress={() => setActiveModal(null)} style={[ms.sheetBackBtn, isDark && {backgroundColor: '#27272A'}]}>
                  <Icon name="chevronLeft" size={18} color={colors.ink} />
                </TouchableOpacity>
                <Text style={[ms.sheetHeaderTitle, isDark && {color: colors.ink}]}>Security & Access</Text>
                <TouchableOpacity activeOpacity={0.7} onPress={() => setActiveModal(null)} style={[ms.sheetCloseBtnRelative, isDark && {backgroundColor: '#27272A'}]}>
                  <Icon name="x" size={16} color={colors.ink} />
                </TouchableOpacity>
              </View>
              <ScrollView contentContainerStyle={{paddingHorizontal: 20, paddingBottom: 40}} showsVerticalScrollIndicator={false}>
                <SettingRow icon="lock" label="Change security PIN" subtitle="Update your 4-digit security PIN" onPress={() => { setActiveModal(null); setTimeout(handleOpenPin, 350); }} />
                <SettingRow
                  icon="fingerprint"
                  label="Biometric unlock"
                  subtitle={biometric ? 'Face ID / Fingerprint — Enabled' : 'Face ID / Fingerprint — Disabled'}
                  onPress={handleToggleBiometric}
                  right={
                    <TouchableOpacity activeOpacity={0.9} onPress={handleToggleBiometric}>
                      <Switch on={biometric} />
                    </TouchableOpacity>
                  }
                />
                <SettingRow
                  icon="lock"
                  label="App lock (PIN on launch)"
                  subtitle={requirePin ? 'Enabled — PIN required to open' : 'Disabled'}
                  onPress={handleToggleRequirePin}
                  right={
                    <TouchableOpacity activeOpacity={0.9} onPress={handleToggleRequirePin}>
                      <Switch on={requirePin} />
                    </TouchableOpacity>
                  }
                />
                <SettingRow icon="clock" label="Auto-lock" subtitle={autoLock} onPress={() => { setActiveModal(null); setTimeout(() => setActiveModal('autolock'), 350); }} />
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}

      {/* SUB-SHEET: TEAM */}
      {activeModal === 'team' && (
        <Modal visible transparent animationType="slide" onRequestClose={() => setActiveModal(null)}>
          <View style={ms.sheetScrim}>
            <View style={[ms.sheet, isDark && {backgroundColor: '#18181B'}]}>
              <View style={[ms.handle, isDark && {backgroundColor: '#3F3F46'}]} />
              <View style={[ms.sheetHeaderBar, isDark && {borderBottomColor: '#27272A'}]}>
                <TouchableOpacity activeOpacity={0.7} onPress={() => setActiveModal(null)} style={[ms.sheetBackBtn, isDark && {backgroundColor: '#27272A'}]}>
                  <Icon name="chevronLeft" size={18} color={colors.ink} />
                </TouchableOpacity>
                <Text style={[ms.sheetHeaderTitle, isDark && {color: colors.ink}]}>Team & Properties</Text>
                <TouchableOpacity activeOpacity={0.7} onPress={() => setActiveModal(null)} style={[ms.sheetCloseBtnRelative, isDark && {backgroundColor: '#27272A'}]}>
                  <Icon name="x" size={16} color={colors.ink} />
                </TouchableOpacity>
              </View>
              <ScrollView contentContainerStyle={{paddingHorizontal: 20, paddingBottom: 40}} showsVerticalScrollIndicator={false}>
                <SettingRow
                  icon="users"
                  label="Staff & Team Accounts"
                  subtitle={
                    (currentPlan || '').toUpperCase().includes('ENTERPRISE')
                      ? 'Manage managers & front desk (Unlimited)'
                      : (currentPlan || '').toUpperCase().includes('MULTI')
                      ? 'Manage managers & front desk (Up to 20 accounts)'
                      : (currentPlan || '').toUpperCase().includes('PRO')
                      ? 'Manage managers & front desk (Up to 5 accounts)'
                      : 'Role-based staff accounts (Upgrade to Pro)'
                  }
                  onPress={() => { setActiveModal(null); if (onStaff) onStaff(); }}
                />
                <SettingRow
                  icon="mapPin"
                  label="Properties & Branches"
                  subtitle={`Active: ${profile.name} (${profile.code}) · Switch or add`}
                  onPress={() => { setActiveModal(null); if (onProperties) onProperties(); }}
                />
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}

      {/* SUB-SHEET: STORAGE */}
      {activeModal === 'storage' && (
        <Modal visible transparent animationType="slide" onRequestClose={() => setActiveModal(null)}>
          <View style={ms.sheetScrim}>
            <View style={[ms.sheet, isDark && {backgroundColor: '#18181B'}]}>
              <View style={[ms.handle, isDark && {backgroundColor: '#3F3F46'}]} />
              <View style={[ms.sheetHeaderBar, isDark && {borderBottomColor: '#27272A'}]}>
                <TouchableOpacity activeOpacity={0.7} onPress={() => setActiveModal(null)} style={[ms.sheetBackBtn, isDark && {backgroundColor: '#27272A'}]}>
                  <Icon name="chevronLeft" size={18} color={colors.ink} />
                </TouchableOpacity>
                <Text style={[ms.sheetHeaderTitle, isDark && {color: colors.ink}]}>Data & Storage</Text>
                <TouchableOpacity activeOpacity={0.7} onPress={() => setActiveModal(null)} style={[ms.sheetCloseBtnRelative, isDark && {backgroundColor: '#27272A'}]}>
                  <Icon name="x" size={16} color={colors.ink} />
                </TouchableOpacity>
              </View>
              <ScrollView contentContainerStyle={{paddingHorizontal: 20, paddingBottom: 40}} showsVerticalScrollIndicator={false}>
                <SettingRow
                  icon="cloud"
                  label="Cloud mode"
                  subtitle={
                    isCloudAllowed
                      ? cloudSync
                        ? 'Synced live across staff devices'
                        : 'Offline mode active (Local-first storage)'
                      : 'Requires Professional plan or higher'
                  }
                  onPress={handleToggleCloud}
                  right={
                    <TouchableOpacity activeOpacity={0.9} onPress={handleToggleCloud}>
                      <Switch on={isCloudAllowed && cloudSync} />
                    </TouchableOpacity>
                  }
                />
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}

      {/* ============================================================ */}
      {/* 1. PROPERTY PROFILE MODAL SHEET                              */}
      {/* ============================================================ */}
      {activeModal === 'profile' && (
        <Modal visible transparent animationType="slide" onRequestClose={() => setActiveModal(null)}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={ms.sheetScrim}
          >
            <View style={[ms.sheet, isDark && { backgroundColor: '#18181B' }]}>
              <View style={[ms.handle, isDark && { backgroundColor: '#3F3F46' }]}/>
              <View style={[ms.sheetHeaderBar, isDark && { borderBottomColor: '#27272A' }]}>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setActiveModal(null)}
                  style={[ms.sheetBackBtn, isDark && { backgroundColor: '#27272A' }]}
                >
                  <Icon name="chevronLeft" size={18} color={colors.ink}/>
                </TouchableOpacity>
                <Text style={[ms.sheetHeaderTitle, isDark && { color: colors.ink }]}>Property Profile</Text>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setActiveModal(null)}
                  style={[ms.sheetCloseBtnRelative, isDark && { backgroundColor: '#27272A' }]}
                >
                  <Icon name="x" size={16} color={colors.ink}/>
                </TouchableOpacity>
              </View>

              <ScrollView
                contentContainerStyle={{paddingHorizontal: 20, paddingBottom: 280}}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
              >
                <Text style={[ms.bodySm, {marginBottom: 16}, isDark && { color: colors.muted }]}>
                  Update your property details, address and contact information.
                </Text>

                <View style={ms.inputGroup}>
                  <Text style={[ms.inputLabel, isDark && { color: colors.muted }]}>PROPERTY NAME *</Text>
                  <TextInput
                    value={editProfile.name}
                    onChangeText={(t) => setEditProfile({...editProfile, name: t})}
                    placeholder="e.g. Sunrise Homestay"
                    placeholderTextColor="#94A3B8"
                    style={[ms.inputField, isDark && { backgroundColor: '#27272A', borderColor: '#3F3F46', color: colors.ink }]}
                  />
                </View>

                <View style={ms.inputGroup}>
                  <Text style={[ms.inputLabel, isDark && { color: colors.muted }]}>OWNER / MANAGER NAME</Text>
                  <TextInput
                    value={editProfile.owner}
                    onChangeText={(t) => setEditProfile({...editProfile, owner: t})}
                    placeholder="e.g. Homestay Owner"
                    placeholderTextColor="#94A3B8"
                    style={[ms.inputField, isDark && { backgroundColor: '#27272A', borderColor: '#3F3F46', color: colors.ink }]}
                  />
                </View>

                <View style={ms.inputGroup}>
                  <Text style={[ms.inputLabel, isDark && { color: colors.muted }]}>FULL ADDRESS</Text>
                  <TextInput
                    value={editProfile.address}
                    onChangeText={(t) => setEditProfile({...editProfile, address: t})}
                    placeholder="Enter complete address"
                    placeholderTextColor="#94A3B8"
                    multiline
                    style={[ms.inputField, {height: 68, textAlignVertical: 'top', paddingTop: 10}, isDark && { backgroundColor: '#27272A', borderColor: '#3F3F46', color: colors.ink }]}
                  />
                </View>

                <View style={ms.inputGroup}>
                  <Text style={[ms.inputLabel, isDark && { color: colors.muted }]}>CONTACT PHONE</Text>
                  <TextInput
                    value={editProfile.phone}
                    onChangeText={(t) => setEditProfile({...editProfile, phone: t})}
                    placeholder="+91 98765 43210"
                    placeholderTextColor="#94A3B8"
                    keyboardType="phone-pad"
                    style={[ms.inputField, isDark && { backgroundColor: '#27272A', borderColor: '#3F3F46', color: colors.ink }]}
                  />
                </View>

                <View style={ms.inputGroup}>
                  <Text style={[ms.inputLabel, isDark && { color: colors.muted }]}>EMAIL ADDRESS</Text>
                  <TextInput
                    value={editProfile.email}
                    onChangeText={(t) => setEditProfile({...editProfile, email: t})}
                    placeholder="owner@homestay.com"
                    placeholderTextColor="#94A3B8"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    style={[ms.inputField, isDark && { backgroundColor: '#27272A', borderColor: '#3F3F46', color: colors.ink }]}
                  />
                </View>

                <View style={{flexDirection: 'row', gap: 10, marginTop: 14}}>
                  <SecondaryButton
                    label="Cancel"
                    style={{flex: 1}}
                    onPress={() => setActiveModal(null)}
                  />
                  <PrimaryButton
                    label="Save Changes"
                    style={{flex: 1.6}}
                    onPress={handleSaveProfile}
                  />
                </View>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      )}

      {/* ============================================================ */}
      {/* 2. LANGUAGE SELECTOR MODAL SHEET                             */}
      {/* ============================================================ */}
      {activeModal === 'language' && (
        <Modal visible transparent animationType="slide" onRequestClose={() => setActiveModal(null)}>
          <View style={ms.sheetScrim}>
            <View style={[ms.sheet, isDark && { backgroundColor: '#18181B' }]}>
              <View style={[ms.handle, isDark && { backgroundColor: '#3F3F46' }]}/>
              <View style={[ms.sheetHeaderBar, isDark && { borderBottomColor: '#27272A' }]}>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setActiveModal(null)}
                  style={[ms.sheetBackBtn, isDark && { backgroundColor: '#27272A' }]}
                >
                  <Icon name="chevronLeft" size={18} color={colors.ink}/>
                </TouchableOpacity>
                <Text style={[ms.sheetHeaderTitle, isDark && { color: colors.ink }]}>Select Language</Text>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setActiveModal(null)}
                  style={[ms.sheetCloseBtnRelative, isDark && { backgroundColor: '#27272A' }]}
                >
                  <Icon name="x" size={16} color={colors.ink}/>
                </TouchableOpacity>
              </View>

              <ScrollView
                contentContainerStyle={{paddingHorizontal: 20, paddingBottom: 32}}
                showsVerticalScrollIndicator={false}
              >
                <Text style={[ms.bodySm, {marginBottom: 14}, isDark && { color: colors.muted }]}>
                  Choose your preferred interface language.
                </Text>

                {LANGUAGES.map((item) => {
                  const isSelected = language === item.name;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      activeOpacity={0.75}
                      onPress={() => {
                        setLanguage(item.name);
                        setActiveModal(null);
                        notify(`✓ Language set to ${item.name}`);
                      }}
                      style={[
                        ms.optionRow,
                        isSelected && ms.optionRowActive,
                        isDark && {
                          backgroundColor: isSelected ? '#2E1065' : '#27272A',
                          borderColor: isSelected ? colors.primary : '#3F3F46',
                        },
                      ]}
                    >
                      <View style={{flex: 1}}>
                        <Text style={[
                          ms.optionTitle,
                          isSelected && ms.optionTitleActive,
                          isDark && { color: isSelected ? colors.primary : colors.ink },
                        ]}>
                          {item.name}
                        </Text>
                        <Text style={[ms.optionDesc, isDark && { color: colors.muted }]}>{item.native}</Text>
                      </View>
                      {isSelected ? (
                        <View style={[ms.checkCircle, { backgroundColor: colors.primary }]}>
                          <Icon name="check" size={14} color="#fff"/>
                        </View>
                      ) : (
                        <View style={[ms.uncheckCircle, isDark && { borderColor: '#52525B', backgroundColor: '#18181B' }]}/>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}

      {/* ============================================================ */}
      {/* 3. THEME SELECTOR MODAL SHEET                                */}
      {/* ============================================================ */}
      {activeModal === 'theme' && (
        <Modal visible transparent animationType="slide" onRequestClose={() => setActiveModal(null)}>
          <View style={ms.sheetScrim}>
            <View style={[ms.sheet, isDark && { backgroundColor: '#18181B' }]}>
              <View style={[ms.handle, isDark && { backgroundColor: '#3F3F46' }]}/>
              <View style={[ms.sheetHeaderBar, isDark && { borderBottomColor: '#27272A' }]}>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setActiveModal(null)}
                  style={[ms.sheetBackBtn, isDark && { backgroundColor: '#27272A' }]}
                >
                  <Icon name="chevronLeft" size={18} color={colors.ink}/>
                </TouchableOpacity>
                <Text style={[ms.sheetHeaderTitle, isDark && { color: colors.ink }]}>Select Theme</Text>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setActiveModal(null)}
                  style={[ms.sheetCloseBtnRelative, isDark && { backgroundColor: '#27272A' }]}
                >
                  <Icon name="x" size={16} color={colors.ink}/>
                </TouchableOpacity>
              </View>

              <ScrollView
                contentContainerStyle={{paddingHorizontal: 20, paddingBottom: 32}}
                showsVerticalScrollIndicator={false}
              >
                <Text style={[ms.bodySm, {marginBottom: 14}, isDark && { color: colors.muted }]}>
                  Customize the look and contrast of StayMate.
                </Text>

                {THEMES.map((th) => {
                  const isSelected = themeMode === th.id;
                  return (
                    <TouchableOpacity
                      key={th.id}
                      activeOpacity={0.75}
                      onPress={async () => {
                        await setThemeMode(th.id);
                        setActiveModal(null);
                        notify(`✓ Theme set to ${th.name}`);
                      }}
                      style={[
                        ms.optionRow,
                        isSelected && ms.optionRowActive,
                        isDark && {
                          backgroundColor: isSelected ? '#2E1065' : '#27272A',
                          borderColor: isSelected ? colors.primary : '#3F3F46',
                        },
                      ]}
                    >
                      <View style={{flex: 1}}>
                        <Text style={[
                          ms.optionTitle,
                          isSelected && ms.optionTitleActive,
                          isDark && { color: isSelected ? colors.primary : colors.ink },
                        ]}>
                          {th.name}
                        </Text>
                        <Text style={[ms.optionDesc, isDark && { color: colors.muted }]}>{th.desc}</Text>
                      </View>
                      {isSelected ? (
                        <View style={[ms.checkCircle, { backgroundColor: colors.primary }]}>
                          <Icon name="check" size={14} color="#fff"/>
                        </View>
                      ) : (
                        <View style={[ms.uncheckCircle, isDark && { borderColor: '#52525B', backgroundColor: '#18181B' }]}/>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}

      {/* ============================================================ */}
      {/* 4. CHANGE SECURITY PIN MODAL SHEET                           */}
      {/* ============================================================ */}
      {activeModal === 'pin' && (
        <Modal visible animationType="slide" onRequestClose={() => {
          setActiveModal(null);
          setChangePinStep('current');
          setChangePinDigits('');
          setTempNewPin('');
          setChangePinError('');
        }}>
          <SafeAreaView style={{flex: 1, backgroundColor: isDark ? colors.canvas : '#fff', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30}}>
            {/* Close button on top right */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                setActiveModal(null);
                setChangePinStep('current');
                setChangePinDigits('');
                setTempNewPin('');
                setChangePinError('');
              }}
              style={{
                position: 'absolute',
                top: insets.top + 16,
                right: 20,
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: isDark ? '#27272A' : '#F8F7FB',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 10,
              }}
            >
              <Icon name="x" size={18} color={colors.ink} />
            </TouchableOpacity>

            <View style={{
              width: 64,
              height: 64,
              borderRadius: 18,
              backgroundColor: C.primary,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 22,
            }}>
              <Icon name="lock" size={28} color="#fff" />
            </View>

            <Text style={{
              fontFamily: 'Inter',
              fontSize: 22,
              fontWeight: '600',
              letterSpacing: -0.4,
              color: isDark ? colors.ink : '#222222',
            }}>
              {changePinStep === 'current'
                ? 'Enter Current PIN'
                : changePinStep === 'new'
                ? 'Set New 4-digit PIN'
                : 'Confirm New PIN'}
            </Text>
            <Text style={{
              fontFamily: 'Inter',
              fontSize: 13.5,
              fontWeight: '400',
              color: changePinError ? '#EF4444' : (isDark ? colors.muted : '#6a6a6a'),
              textAlign: 'center',
              marginTop: 6,
              paddingHorizontal: 10,
            }}>
              {changePinError
                ? changePinError
                : changePinStep === 'current'
                ? 'Enter your current 4-digit PIN to verify identity'
                : changePinStep === 'new'
                ? 'Choose a new 4-digit PIN for app security'
                : 'Re-enter your new 4-digit PIN to confirm'}
            </Text>

            {/* 4 dots with shakeAnim */}
            <Animated.View style={{
              flexDirection: 'row',
              gap: 14,
              marginVertical: 30,
              transform: [{ translateX: changePinShakeAnim }],
            }}>
              {[0, 1, 2, 3].map((i) => (
                <View
                  key={i}
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: 7,
                    borderWidth: 1.5,
                    borderColor: changePinError ? '#EF4444' : (isDark ? '#3F3F46' : '#222222'),
                    backgroundColor: i < changePinDigits.length ? (changePinError ? '#EF4444' : (isDark ? colors.primary : '#222222')) : 'transparent',
                  }}
                />
              ))}
            </Animated.View>

            {/* Numeric Keypad matching lock screen */}
            <View style={{
              width: 240,
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: 14,
              justifyContent: 'center',
            }}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                <TouchableOpacity
                  key={n}
                  activeOpacity={0.7}
                  onPress={() => handleChangePinKeyPress(String(n))}
                  style={{
                    width: 66,
                    height: 66,
                    borderRadius: 33,
                    backgroundColor: isDark ? '#18181B' : '#F8F7FB',
                    borderWidth: isDark ? 1 : 0,
                    borderColor: '#27272A',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{
                    fontFamily: 'Inter',
                    fontSize: 22,
                    fontWeight: '500',
                    color: isDark ? colors.ink : '#222222',
                  }}>{n}</Text>
                </TouchableOpacity>
              ))}
              <View style={{ width: 66, height: 66 }} />
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => handleChangePinKeyPress('0')}
                style={{
                  width: 66,
                  height: 66,
                  borderRadius: 33,
                  backgroundColor: isDark ? '#18181B' : '#F8F7FB',
                  borderWidth: isDark ? 1 : 0,
                  borderColor: '#27272A',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{
                  fontFamily: 'Inter',
                  fontSize: 22,
                  fontWeight: '500',
                  color: isDark ? colors.ink : '#222222',
                }}>0</Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={handleChangePinDelete}
                style={{
                  width: 66,
                  height: 66,
                  borderRadius: 33,
                  backgroundColor: isDark ? '#18181B' : '#F8F7FB',
                  borderWidth: isDark ? 1 : 0,
                  borderColor: '#27272A',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon name="chevronLeft" size={20} color={colors.ink} />
              </TouchableOpacity>
            </View>

            {/* Cancel Button */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                setActiveModal(null);
                setChangePinStep('current');
                setChangePinDigits('');
                setTempNewPin('');
                setChangePinError('');
              }}
              style={{
                marginTop: 24,
                paddingVertical: 10,
                paddingHorizontal: 20,
                borderRadius: R.full,
                backgroundColor: isDark ? '#18181B' : '#F1F5F9',
                borderWidth: isDark ? 1 : 0,
                borderColor: '#27272A',
              }}
            >
              <Text style={{
                fontFamily: 'Inter',
                fontSize: 13,
                fontWeight: '600',
                color: isDark ? colors.muted : '#64748B',
              }}>Cancel</Text>
            </TouchableOpacity>
          </SafeAreaView>
        </Modal>
      )}

      {/* ============================================================ */}
      {/* 5. AUTO-LOCK DURATION MODAL SHEET                            */}
      {/* ============================================================ */}
      {activeModal === 'autolock' && (
        <Modal visible transparent animationType="slide" onRequestClose={() => setActiveModal(null)}>
          <View style={ms.sheetScrim}>
            <View style={[ms.sheet, isDark && { backgroundColor: '#18181B' }]}>
              <View style={[ms.handle, isDark && { backgroundColor: '#3F3F46' }]}/>
              <View style={[ms.sheetHeaderBar, isDark && { borderBottomColor: '#27272A' }]}>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setActiveModal(null)}
                  style={[ms.sheetBackBtn, isDark && { backgroundColor: '#27272A' }]}
                >
                  <Icon name="chevronLeft" size={18} color={colors.ink}/>
                </TouchableOpacity>
                <Text style={[ms.sheetHeaderTitle, isDark && { color: colors.ink }]}>Auto-Lock Duration</Text>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setActiveModal(null)}
                  style={[ms.sheetCloseBtnRelative, isDark && { backgroundColor: '#27272A' }]}
                >
                  <Icon name="x" size={16} color={colors.ink}/>
                </TouchableOpacity>
              </View>

              <ScrollView
                contentContainerStyle={{paddingHorizontal: 20, paddingBottom: 32}}
                showsVerticalScrollIndicator={false}
              >
                <Text style={[ms.bodySm, {marginBottom: 14}, isDark && { color: colors.muted }]}>
                  Automatically require PIN / Biometric unlock when inactive.
                </Text>

                {AUTOLOCK_OPTIONS.map((opt) => {
                  const isSelected = autoLock === opt.label;
                  return (
                    <TouchableOpacity
                      key={opt.id}
                      activeOpacity={0.75}
                      onPress={async () => {
                        setAutoLock(opt.label);
                        setActiveModal(null);
                        const mins = opt.id === 'never' ? -1 : parseInt(opt.id, 10);
                        await securityService.setAutoLockMinutes(mins);
                        notify(`Auto-lock set to ${opt.label}`);
                      }}
                      style={[
                        ms.optionRow,
                        isSelected && ms.optionRowActive,
                        isDark && {
                          backgroundColor: isSelected ? '#2E1065' : '#27272A',
                          borderColor: isSelected ? colors.primary : '#3F3F46',
                        },
                      ]}
                    >
                      <Text style={[
                        ms.optionTitle,
                        isSelected && ms.optionTitleActive,
                        isDark && { color: isSelected ? colors.primary : colors.ink },
                      ]}>
                        {opt.label}
                      </Text>
                      {isSelected ? (
                        <View style={[ms.checkCircle, { backgroundColor: colors.primary }]}>
                          <Icon name="check" size={14} color="#fff"/>
                        </View>
                      ) : (
                        <View style={[ms.uncheckCircle, isDark && { borderColor: '#52525B', backgroundColor: '#18181B' }]}/>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}

      {/* ============================================================ */}
      {/* 6. HELP CENTER & FAQS MODAL SHEET                            */}
      {/* ============================================================ */}
      {activeModal === 'help' && (
        <Modal visible transparent animationType="slide" onRequestClose={() => setActiveModal(null)}>
          <View style={ms.sheetScrim}>
            <View style={[ms.sheet, isDark && { backgroundColor: '#18181B' }]}>
              <View style={[ms.handle, isDark && { backgroundColor: '#3F3F46' }]}/>
              <View style={[ms.sheetHeaderBar, isDark && { borderBottomColor: '#27272A' }]}>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setActiveModal(null)}
                  style={[ms.sheetBackBtn, isDark && { backgroundColor: '#27272A' }]}
                >
                  <Icon name="chevronLeft" size={18} color={colors.ink}/>
                </TouchableOpacity>
                <Text style={[ms.sheetHeaderTitle, isDark && { color: colors.ink }]}>Help & Support</Text>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setActiveModal(null)}
                  style={[ms.sheetCloseBtnRelative, isDark && { backgroundColor: '#27272A' }]}
                >
                  <Icon name="x" size={16} color={colors.ink}/>
                </TouchableOpacity>
              </View>

              <ScrollView
                contentContainerStyle={{paddingHorizontal: 20, paddingBottom: 36}}
                showsVerticalScrollIndicator={false}
              >
                <Text style={[ms.bodySm, {marginBottom: 16}, isDark && { color: colors.muted }]}>
                  Find quick answers to common questions or reach out directly to the Devify team.
                </Text>

                {/* FAQ 1 */}
                <View style={[{backgroundColor: '#F8FAFC', borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0'}, isDark && { backgroundColor: '#27272A', borderColor: '#3F3F46' }]}>
                  <Text style={[{fontFamily: 'Inter', fontSize: 14, fontWeight: '700', color: '#0F172A', marginBottom: 4}, isDark && { color: colors.ink }]}>
                    How do I scan guest IDs?
                  </Text>
                  <Text style={[{fontFamily: 'Inter', fontSize: 13, color: '#475569', lineHeight: 18}, isDark && { color: colors.muted }]}>
                    Tap the purple Camera button at the bottom navigation, select the document type (Aadhaar, Passport, DL, etc.), and align the ID in the frame.
                  </Text>
                </View>

                {/* FAQ 2 */}
                <View style={[{backgroundColor: '#F8FAFC', borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0'}, isDark && { backgroundColor: '#27272A', borderColor: '#3F3F46' }]}>
                  <Text style={[{fontFamily: 'Inter', fontSize: 14, fontWeight: '700', color: '#0F172A', marginBottom: 4}, isDark && { color: colors.ink }]}>
                    Does live sync work offline?
                  </Text>
                  <Text style={[{fontFamily: 'Inter', fontSize: 13, color: '#475569', lineHeight: 18}, isDark && { color: colors.muted }]}>
                    Yes! You can check in guests offline. Records are stored locally and automatically synchronized across devices once internet is restored.
                  </Text>
                </View>

                {/* FAQ 3 */}
                <View style={[{backgroundColor: '#F8FAFC', borderRadius: 14, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: '#E2E8F0'}, isDark && { backgroundColor: '#27272A', borderColor: '#3F3F46' }]}>
                  <Text style={[{fontFamily: 'Inter', fontSize: 14, fontWeight: '700', color: '#0F172A', marginBottom: 4}, isDark && { color: colors.ink }]}>
                    How do guests self check-in?
                  </Text>
                  <Text style={[{fontFamily: 'Inter', fontSize: 13, color: '#475569', lineHeight: 18}, isDark && { color: colors.muted }]}>
                    From the Dashboard, tap "Share" on the Self check-in card to send a WhatsApp or SMS link to guests prior to their arrival.
                  </Text>
                </View>

                {/* Direct Contact Buttons */}
                <PrimaryButton
                  label="Email Devify Support"
                  icon="mail"
                  onPress={() => {
                    setActiveModal(null);
                    Linking.openURL('mailto:support@devify.co.in?subject=StayMate%20Support%20Request');
                  }}
                  style={{marginBottom: 10}}
                />

                <SecondaryButton
                  label="Chat on WhatsApp (+91 84718 97293)"
                  icon="phone"
                  onPress={() => {
                    setActiveModal(null);
                    Linking.openURL('https://wa.me/918471897293?text=Hi%20Devify%20Team%2C%20I%20need%20help%20with%20StayMate.');
                  }}
                />
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}
    </ScrollView>
  );
}

function UsageBar({
  label,
  value,
  pct,
  dark,
}: {
  label: string;
  value: string;
  pct: number;
  dark?: boolean;
}) {
  return (
    <View style={{marginTop: 14}}>
      <View style={s.usageLabels}>
        <Text style={s.usageText}>{label}</Text>
        <Text style={s.usageText}>{value}</Text>
      </View>
      <View style={s.usageTrack}>
        <View
          style={[
            s.usageFill,
            {width: `${pct}%`, backgroundColor: dark ? '#222222' : C.primary},
          ]}
        />
      </View>
    </View>
  );
}

function Switch({on}: {on: boolean}) {
  return (
    <View style={[s.switchTrack, {backgroundColor: on ? C.primary : '#dddddd'}]}>
      <View style={[s.switchKnob, {left: on ? 20 : 3}]}/>
    </View>
  );
}

const s = StyleSheet.create({
  headerTop: {
    paddingTop: 18,
    gap: 8,
  },
  headerLogo: {
    width: 175,
    height: 46,
    marginLeft: -4,
  },
  h1: {
    fontFamily: 'Inter',
    fontSize: 22,
    fontWeight: '600',
    letterSpacing: -0.4,
    color: '#222222',
  },
  pageSub: {
    fontFamily: 'Inter',
    fontSize: 13.5,
    fontWeight: '400',
    color: '#6a6a6a',
    marginTop: 3,
    marginBottom: 4,
  },
  editBadge: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  referBanner: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FAF5FF',
    borderWidth: 1,
    borderColor: '#DDD6FE',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  referBannerIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  referBannerTitle: {
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '700',
    color: '#4C1D95',
  },
  referBannerSub: {
    fontFamily: 'Inter',
    fontSize: 12.5,
    fontWeight: '400',
    color: '#7C3AED',
    marginTop: 1,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 8,
  },
  categoryCard: {
    width: '47%',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ebebeb',
    borderRadius: 16,
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: {width: 0, height: 3},
    elevation: 2,
  },
  categoryIconBg: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  categoryCardTitle: {
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  categoryCardSub: {
    fontFamily: 'Inter',
    fontSize: 11.5,
    fontWeight: '400',
    color: '#64748B',
    marginTop: 2,
    lineHeight: 16,
  },
  categoryArrow: {
    alignSelf: 'flex-end',
    marginTop: 10,
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  helpCard: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ebebeb',
    borderRadius: 16,
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: {width: 0, height: 3},
    elevation: 2,
  },
  aboutRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ebebeb',
    borderRadius: 14,
    padding: 14,
  },
  profileCard: {
    marginTop: 16,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#ebebeb',
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: {width: 0, height: 4},
    elevation: 2,
  },
  profileMark: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileMarkText: {
    fontFamily: 'Inter',
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  profileTitle: {
    fontFamily: 'Inter',
    fontSize: 16,
    fontWeight: '600',
    color: '#222222',
  },
  profileSub: {
    fontFamily: 'Inter',
    fontSize: 13.5,
    fontWeight: '400',
    color: '#6a6a6a',
    marginTop: 2,
  },
  planCard: {
    marginTop: 14,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#ebebeb',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: {width: 0, height: 4},
    elevation: 2,
  },
  planTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  planTitle: {
    fontFamily: 'Inter',
    fontSize: 15,
    fontWeight: '500',
    color: '#222222',
  },
  planSub: {
    fontFamily: 'Inter',
    fontSize: 13.5,
    fontWeight: '400',
    color: '#6a6a6a',
    marginTop: 2,
  },
  proBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: R.full,
    backgroundColor: '#f2f2f2',
  },
  proBadgeText: {
    fontFamily: 'Inter',
    fontSize: 11,
    fontWeight: '700',
    color: '#222222',
  },
  usageLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  usageText: {
    fontFamily: 'Inter',
    fontSize: 12.5,
    fontWeight: '500',
    color: '#6a6a6a',
  },
  usageTrack: {
    height: 8,
    borderRadius: R.full,
    backgroundColor: '#f2f2f2',
    overflow: 'hidden',
  },
  usageFill: {
    height: '100%',
    borderRadius: R.full,
  },
  ocrRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
  },
  ocrText: {
    fontFamily: 'Inter',
    fontSize: 13.5,
    fontWeight: '400',
    color: '#6a6a6a',
  },
  activeBadge: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: R.full,
    backgroundColor: '#ECFDF3',
  },
  activeBadgeText: {
    fontFamily: 'Inter',
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  sectionHeader: {
    fontFamily: 'Inter',
    fontSize: 12.5,
    fontWeight: '700',
    letterSpacing: 0.5,
    color: '#6a6a6a',
    textTransform: 'uppercase',
    marginTop: 20,
    marginBottom: 4,
  },
  switchTrack: {
    width: 42,
    height: 25,
    borderRadius: R.full,
    position: 'relative',
  },
  switchKnob: {
    position: 'absolute',
    top: 3,
    width: 19,
    height: 19,
    borderRadius: 10,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 3,
    shadowOffset: {width: 0, height: 1},
    elevation: 2,
  },
  bottomActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 24,
  },
  lockBtn: {
    flex: 1,
    height: 50,
    borderRadius: R.sm,
    backgroundColor: '#f2f2f2',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  lockBtnText: {
    fontFamily: 'Inter',
    fontSize: 15,
    fontWeight: '600',
    color: '#222222',
  },
  logoutBtn: {
    flex: 1,
    height: 50,
    borderRadius: R.sm,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  logoutBtnText: {
    fontFamily: 'Inter',
    fontSize: 15,
    fontWeight: '600',
    color: C.primary,
  },
  devifyFooter: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    marginTop: 12,
    width: '100%',
  },
  footerContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  footerLogo: {
    width: 96,
    height: 17,
  },
  devifyText: {
    fontFamily: 'Inter',
    fontSize: 12,
    color: '#94A3B8',
    lineHeight: 17,
    includeFontPadding: false,
    textAlignVertical: 'center',
    paddingTop: 2,
  },
  devifyBrand: {
    fontWeight: '700',
    color: '#0F172A',
  },
});

const ms = StyleSheet.create({
  sheetScrim: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 40,
    shadowOffset: {width: 0, height: -10},
    elevation: 10,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: R.full,
    backgroundColor: '#dddddd',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  sheetHeaderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginBottom: 12,
  },
  sheetBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetHeaderTitle: {
    fontFamily: 'Inter',
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
  },
  sheetCloseBtnRelative: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bodySm: {
    fontFamily: 'Inter',
    fontSize: 13.5,
    fontWeight: '400',
    color: '#64748B',
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontFamily: 'Inter',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: '#64748B',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  inputField: {
    backgroundColor: '#ffffff',
    borderWidth: 1.2,
    borderColor: '#ECEAF0',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '500',
    color: '#1E293B',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.2,
    borderColor: '#ECEAF0',
    backgroundColor: '#ffffff',
    marginBottom: 10,
  },
  optionRowActive: {
    borderColor: C.primary,
    backgroundColor: '#FAF5FF',
  },
  optionTitle: {
    fontFamily: 'Inter',
    fontSize: 15,
    fontWeight: '600',
    color: '#1E293B',
  },
  optionTitleActive: {
    color: C.primary,
  },
  optionDesc: {
    fontFamily: 'Inter',
    fontSize: 12.5,
    color: '#64748B',
    marginTop: 2,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uncheckCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    backgroundColor: '#fff',
  },
});
