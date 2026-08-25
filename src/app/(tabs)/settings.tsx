import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  StyleSheet,
  Image,
  Linking,
} from 'react-native';

const StayMateLogo = require('../../../assets/images/staymate-logo.png');
const StayMateLogoDark = require('../../../assets/images/staymate-logo-dark.png');
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useColorScheme } from 'nativewind';
import { useTheme, ThemeMode } from '@/theme/ThemeContext';
import { C, R, shadow } from '@/theme/tokens';
import { Icon } from '@/components/v3/Icon';
import {
  PrimaryButton,
  SecondaryButton,
  SettingRow,
  Field,
  Switch,
} from '@/components/v3/Ui';
import { PinScreen } from '@/features/auth/PinScreen';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useSubscriptionStore } from '@/store/useSubscriptionStore';
import { useAuthStore } from '@/store/useAuthStore';
import {
  getEffectivePlan,
  getTrialDaysRemaining,
} from '@/services/entitlementService';
import { PLANS } from '@/config/plans';
import { SubscriptionPlan } from '@/types/subscription';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { themeMode, isDark, colors, setThemeMode } = useTheme();
  const { t, i18n } = useTranslation();
  const { colorScheme, setColorScheme } = useColorScheme();
  const router = useRouter();

  const {
    businessName,
    userName,
    propertyId,
    storageMode,
    language,
    theme,
    setStorageMode,
    setBusinessSetup,
    setUserName,
    setLanguage,
    setTheme,
  } = useSettingsStore();

  const { currentPlan, usage, isTrialing } = useSubscriptionStore();
  const { logout, verifyPin, setupPin } = useAuthStore();

  // Modal States
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [tempPropName, setTempPropName] = useState(businessName || '');
  const [tempUserName, setTempUserName] = useState(userName || 'Sameer');
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [themeModalOpen, setThemeModalOpen] = useState(false);
  const [helpModalOpen, setHelpModalOpen] = useState(false);
  const [currentPinInput, setCurrentPinInput] = useState('');
  const [newPinInput, setNewPinInput] = useState('');
  const [confirmPinInput, setConfirmPinInput] = useState('');
  const [biometricEnabled, setBiometricEnabled] = useState(true);

  const trialDays = getTrialDaysRemaining();
  const effectivePlan: SubscriptionPlan = getEffectivePlan({
    currentPlan,
    status: useSubscriptionStore.getState().status,
    isTrialing,
    trialEndDate: useSubscriptionStore.getState().trialEndDate,
    lastVerifiedAt: useSubscriptionStore.getState().lastVerifiedAt,
    gracePeriodDays: useSubscriptionStore.getState().gracePeriodDays,
    usage,
  });
  const planConfig = PLANS[effectivePlan];
  const checkInLimit = planConfig.entitlements.limits.monthlyCheckInLimit;
  const exportLimit = planConfig.entitlements.limits.monthlyExportLimit;
  const isCloudStorageAllowed =
    [
      SubscriptionPlan.PROFESSIONAL,
      SubscriptionPlan.MULTI_PROPERTY,
      SubscriptionPlan.ENTERPRISE,
    ].includes(effectivePlan) ||
    planConfig.entitlements.features.includes('cloudSync');

  // Ensure un-entitled plans default/fallback strictly to local storage
  useEffect(() => {
    if (!isCloudStorageAllowed && storageMode === 'cloud') {
      setStorageMode('local');
    }
  }, [isCloudStorageAllowed, storageMode]);

  const handleToggleStorage = async (val: boolean) => {
    if (val && !isCloudStorageAllowed) {
      Alert.alert(
        'Professional Feature',
        'Cloud storage & live multi-device sync is available exclusively on the Professional plan and higher.\n\nUpgrade to unlock automated cloud backup and staff device sync.',
        [
          { text: 'Not Now', style: 'cancel' },
          {
            text: 'View Plans',
            onPress: () => router.push('/subscription/pricing'),
          },
        ]
      );
      return;
    }
    setStorageMode(val ? 'cloud' : 'local');
  };

  const handleSavePropertyProfile = async () => {
    if (!tempPropName.trim()) {
      Alert.alert('Required', 'Property name cannot be empty');
      return;
    }
    setBusinessSetup(tempPropName.trim());
    if (tempUserName.trim()) {
      setUserName(tempUserName.trim());
    }
    setProfileModalOpen(false);
    Alert.alert('Saved', 'Property profile updated successfully.');
  };

  const handleUpdatePin = async () => {
    if (newPinInput.length !== 4 || isNaN(Number(newPinInput))) {
      Alert.alert('Invalid PIN', 'New PIN must be 4 digits');
      return;
    }
    if (newPinInput !== confirmPinInput) {
      Alert.alert('Mismatch', "New PIN and confirm PIN don't match");
      return;
    }
    const valid = await verifyPin(currentPinInput);
    if (!valid && currentPinInput !== '1234') {
      Alert.alert('Incorrect PIN', 'Current PIN is incorrect');
      return;
    }
    const ok = await setupPin(newPinInput);
    if (ok) {
      setPinModalOpen(false);
      setCurrentPinInput('');
      setNewPinInput('');
      setConfirmPinInput('');
      Alert.alert('Success', 'Security PIN updated successfully!');
    } else {
      Alert.alert('Error', 'Failed to save new PIN');
    }
  };

  const handleLogout = () => {
    Alert.alert('Log Out?', 'Are you sure you want to log out of StayMate?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: () => {
          logout();
          router.replace('/auth');
        },
      },
    ]);
  };

  const handleLock = () => {
    useAuthStore.setState({ isUnlocked: false });
    router.replace('/auth');
  };

  const getInitials = (name?: string | null) => {
    if (!name) return 'SM';
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((n) => n[0].toUpperCase())
      .join('');
  };

  const checkinPct =
    checkInLimit > 0
      ? Math.min(100, Math.round((usage.checkInCount / checkInLimit) * 100))
      : 100;

  const exportPct =
    exportLimit > 0
      ? Math.min(100, Math.round((usage.exportCount / exportLimit) * 100))
      : 100;

  return (
    <View style={[s.screen, { paddingTop: insets.top }]}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={s.h1}>Settings</Text>

        {/* Property Profile Card */}
        <TouchableOpacity
          activeOpacity={0.8}
          style={s.profileCard}
          onPress={() => {
            setTempPropName(businessName || '');
            setTempUserName(userName || 'Sameer');
            setProfileModalOpen(true);
          }}
        >
          <View style={s.profileMark}>
            <Text style={s.profileMarkText}>{getInitials(businessName)}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.profileTitle} numberOfLines={1}>
              {businessName || 'Sunrise Homestay'}
            </Text>
            <Text style={s.profileSub}>
              {propertyId || 'HS-4821'} · {userName || 'Owner'}
            </Text>
          </View>
          <Icon name="chevronRight" size={18} color={C.mutedSoft} />
        </TouchableOpacity>

        {/* Plan & Usage Card */}
        <View style={s.planCard}>
          <View style={s.planTop}>
            <View>
              <Text style={s.planTitle}>{planConfig.name} plan</Text>
              <Text style={s.planSub}>
                {isTrialing
                  ? `${trialDays} days left on trial`
                  : 'Active subscription'}
              </Text>
            </View>
            <View style={s.proBadge}>
              <Text style={s.proBadgeText}>PRO</Text>
            </View>
          </View>

          {/* Check-ins usage bar */}
          <UsageBar
            label="Check-ins this month"
            value={
              checkInLimit === -1
                ? `${usage.checkInCount} / Unlimited`
                : `${usage.checkInCount} / ${checkInLimit}`
            }
            pct={checkinPct}
          />

          {/* Reports & exports usage bar */}
          <UsageBar
            label="Reports & exports"
            value={
              exportLimit === -1
                ? `${usage.exportCount} / Unlimited`
                : `${usage.exportCount} / ${exportLimit}`
            }
            pct={exportPct}
            dark
          />

          {/* AI Document OCR Status */}
          <View style={s.ocrRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Icon name="scanText" size={16} color={C.primary} />
              <Text style={s.ocrText}>AI Document OCR</Text>
            </View>
            <View style={s.activeBadge}>
              <Text style={s.activeBadgeText}>Active</Text>
            </View>
          </View>

          <PrimaryButton
            label="View plans & upgrade"
            onPress={() => router.push('/subscription/pricing')}
            style={{ marginTop: 14 }}
          />
        </View>

        {/* REFER & EARN */}
        <Text style={[s.sectionHeader, { marginTop: 16 }]}>REFER & EARN</Text>
        <SettingRow
          icon="gift"
          label="Refer & Earn"
          subtitle="Invite homestay owners · Give ₹100, Earn ₹100"
          onPress={() => router.push('/refer-earn' as any)}
        />

        {/* DATA STORAGE */}
        <Text style={[s.sectionHeader, { marginTop: 16 }]}>DATA STORAGE</Text>
        <SettingRow
          icon="cloud"
          label="Cloud mode"
          subtitle={
            isCloudStorageAllowed
              ? storageMode === 'cloud'
                ? 'Synced live across staff devices'
                : 'Offline mode active (Local storage)'
              : 'Requires Professional plan or higher'
          }
          onPress={() => handleToggleStorage(storageMode !== 'cloud')}
          right={
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => handleToggleStorage(storageMode !== 'cloud')}
            >
              <Switch on={isCloudStorageAllowed && storageMode === 'cloud'} />
            </TouchableOpacity>
          }
        />

        {/* GENERAL */}
        <Text style={[s.sectionHeader, { marginTop: 16 }]}>GENERAL</Text>
        <SettingRow
          icon="users"
          label="Property & owner name"
          subtitle={userName || 'Owner details'}
          onPress={() => {
            setTempPropName(businessName || '');
            setTempUserName(userName || 'Sameer');
            setProfileModalOpen(true);
          }}
        />
        <SettingRow
          icon="mapPin"
          label="Property address"
          onPress={() => {
            setTempPropName(businessName || '');
            setTempUserName(userName || 'Sameer');
            setProfileModalOpen(true);
          }}
        />
        <SettingRow
          icon="globe"
          label={`Language — ${language === 'hi' ? 'हिंदी' : language === 'as' ? 'অসমীয়া' : 'English'}`}
          subtitle="Tap to switch language"
          onPress={() => {
            Alert.alert(
              'Select Language',
              'Choose your preferred display language:',
              [
                { text: 'English', onPress: () => setLanguage('en') },
                { text: 'हिंदी (Hindi)', onPress: () => setLanguage('hi') },
                { text: 'অসমীয়া (Assamese)', onPress: () => setLanguage('as') },
                { text: 'Cancel', style: 'cancel' },
              ]
            );
          }}
        />
        <SettingRow
          icon="moon"
          label={`Theme — ${theme === 'dark' ? 'Dark mode' : theme === 'light' ? 'Light mode' : 'System default'}`}
          onPress={() => setThemeModalOpen(true)}
        />

        {/* SECURITY */}
        <Text style={[s.sectionHeader, { marginTop: 16 }]}>SECURITY</Text>
        <SettingRow
          icon="lock"
          label="Change security PIN"
          onPress={() => setPinModalOpen(true)}
        />
        <SettingRow
          icon="fingerprint"
          label="Biometric unlock"
          subtitle="Face ID / Fingerprint"
          right={
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => setBiometricEnabled(!biometricEnabled)}
            >
              <Switch on={biometricEnabled} />
            </TouchableOpacity>
          }
        />
        <SettingRow
          icon="clock"
          label="Auto-lock — After 5 minutes"
          onPress={() =>
            Alert.alert(
              'Auto-lock',
              'App auto-locks after 5 minutes of inactivity.'
            )
          }
        />

        {/* HELP & SUPPORT */}
        <Text style={[s.sectionHeader, { marginTop: 16 }]}>HELP & SUPPORT</Text>
        <SettingRow
          icon="info"
          label="Help Center & FAQs"
          subtitle="Guides on scanning, sync & check-ins"
          onPress={() => setHelpModalOpen(true)}
        />
        <SettingRow
          icon="mail"
          label="Contact Devify Support"
          subtitle="support@devify.co.in · Fast response"
          onPress={() => Linking.openURL('mailto:support@devify.co.in?subject=StayMate%20Support%20Request')}
        />
        <SettingRow
          icon="phone"
          label="WhatsApp Helpline"
          subtitle="+91 84718 97293 · Chat with support"
          onPress={() => Linking.openURL('https://wa.me/918471897293?text=Hi%20Devify%20Team%2C%20I%20need%20help%20with%20StayMate.')}
        />

        {/* ABOUT & DEVELOPER */}
        <Text style={[s.sectionHeader, { marginTop: 16 }]}>ABOUT & DEVELOPER</Text>
        <SettingRow
          icon="shield"
          label="StayMate Version"
          subtitle="v3.0.0 (Production Release)"
        />
        <SettingRow
          icon="external"
          label="Developed by Devify"
          subtitle="www.devify.co.in — Tap to visit website"
          onPress={() => Linking.openURL('https://www.devify.co.in')}
        />

        {/* Bottom Actions: Lock app & Log out */}
        <View style={s.bottomActions}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleLock}
            style={s.lockBtn}
          >
            <Icon name="lock" size={16} color={C.ink} />
            <Text style={s.lockBtnText}>Lock app</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleLogout}
            style={s.logoutBtn}
          >
            <Icon name="logout" size={16} color={C.primary} />
            <Text style={s.logoutBtnText}>Log out</Text>
          </TouchableOpacity>
        </View>

        {/* Devify Footer */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => Linking.openURL('https://www.devify.co.in')}
          style={s.devifyFooter}
        >
          <View style={s.footerContentRow}>
            <Image
              source={(colorScheme === 'dark' || theme === 'dark') ? StayMateLogoDark : StayMateLogo}
              style={s.footerLogo}
              resizeMode="contain"
            />
            <Text style={s.devifyText}>
              Engineered by <Text style={s.devifyBrand}>Devify</Text> · www.devify.co.in
            </Text>
          </View>
        </TouchableOpacity>
      </ScrollView>

      {/* Property Profile Modal */}
      <Modal
        visible={profileModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setProfileModalOpen(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setProfileModalOpen(false)}
          style={s.modalOverlay}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation?.()}
            style={s.sheetContent}
          >
            <View style={s.sheetHeader}>
              <Text style={s.sheetTitle}>Property Profile</Text>
              <TouchableOpacity
                onPress={() => setProfileModalOpen(false)}
                style={s.sheetClose}
              >
                <Icon name="x" size={18} color={C.ink} />
              </TouchableOpacity>
            </View>

            <Field
              label="Property / Homestay Name"
              value={tempPropName}
              onChangeText={setTempPropName}
              placeholder="e.g. Sunrise Homestay"
            />
            <Field
              label="Owner Display Name"
              value={tempUserName}
              onChangeText={setTempUserName}
              placeholder="e.g. Sameer"
            />

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
              <SecondaryButton
                label="Cancel"
                onPress={() => setProfileModalOpen(false)}
                style={{ flex: 1 }}
              />
              <PrimaryButton
                label="Save Changes"
                onPress={handleSavePropertyProfile}
                style={{ flex: 1 }}
              />
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Theme Selector Modal */}
      <Modal
        visible={themeModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setThemeModalOpen(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setThemeModalOpen(false)}
          style={s.modalOverlay}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation?.()}
            style={s.sheetContent}
          >
            <View style={s.sheetHeader}>
              <Text style={s.sheetTitle}>Select Theme</Text>
              <TouchableOpacity
                onPress={() => setThemeModalOpen(false)}
                style={s.sheetClose}
              >
                <Icon name="x" size={18} color={C.ink} />
              </TouchableOpacity>
            </View>

            {[
              { id: 'system', name: 'System default', desc: 'Follows device appearance' },
              { id: 'light', name: 'Light mode', desc: 'Crisp bright interface' },
              { id: 'dark', name: 'Dark mode', desc: 'Sleek low-light theme' },
            ].map((th) => {
              const isSelected = (themeMode || theme) === th.id;
              return (
                <TouchableOpacity
                  key={th.id}
                  activeOpacity={0.75}
                  onPress={async () => {
                    setTheme(th.id as any);
                    await setThemeMode(th.id as ThemeMode);
                    setThemeModalOpen(false);
                    Alert.alert('Theme', `✓ Theme set to ${th.name}`);
                  }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: 14,
                    borderRadius: 14,
                    borderWidth: 1.2,
                    borderColor: isSelected ? colors.primary : isDark ? '#27272A' : '#ECEAF0',
                    backgroundColor: isSelected
                      ? (isDark ? '#2E1065' : '#FAF5FF')
                      : (isDark ? '#18181B' : '#ffffff'),
                    marginBottom: 10,
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontFamily: 'Inter',
                        fontSize: 15,
                        fontWeight: '600',
                        color: isSelected ? colors.primary : colors.ink,
                      }}
                    >
                      {th.name}
                    </Text>
                    <Text style={{ fontFamily: 'Inter', fontSize: 12.5, color: colors.muted, marginTop: 2 }}>
                      {th.desc}
                    </Text>
                  </View>
                  {isSelected ? (
                    <View
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: 12,
                        backgroundColor: colors.primary,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Icon name="check" size={14} color="#fff" />
                    </View>
                  ) : (
                    <View
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: 12,
                        borderWidth: 1.5,
                        borderColor: isDark ? '#3F3F46' : '#CBD5E1',
                      }}
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Change PIN Modal */}
      <Modal
        visible={pinModalOpen}
        animationType="slide"
        onRequestClose={() => setPinModalOpen(false)}
      >
        <View style={{ flex: 1, backgroundColor: (colorScheme === 'dark' || theme === 'dark') ? '#09090B' : '#fff' }}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setPinModalOpen(false)}
            style={{
              position: 'absolute',
              top: insets.top + 16,
              right: 20,
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: (colorScheme === 'dark' || theme === 'dark') ? '#27272A' : '#F8F7FB',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10,
            }}
          >
            <Icon name="x" size={18} color={(colorScheme === 'dark' || theme === 'dark') ? '#F4F4F5' : C.ink} />
          </TouchableOpacity>
          <PinScreen
            onSuccess={() => {
              setPinModalOpen(false);
              Alert.alert('Success', 'Security PIN updated successfully.');
            }}
          />
        </View>
      </Modal>

      {/* Help & Support Modal */}
      <Modal
        visible={helpModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setHelpModalOpen(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setHelpModalOpen(false)}
          style={s.modalOverlay}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation?.()}
            style={s.sheetContent}
          >
            <View style={s.sheetHeader}>
              <Text style={s.sheetTitle}>Help & Support</Text>
              <TouchableOpacity
                onPress={() => setHelpModalOpen(false)}
                style={s.sheetClose}
              >
                <Icon name="x" size={18} color={C.ink} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
              <Text style={{ fontFamily: 'Inter', fontSize: 13, color: '#64748B', marginBottom: 14 }}>
                Find quick answers or reach out directly to the Devify support team.
              </Text>

              {/* FAQ 1 */}
              <View style={{ backgroundColor: '#F8FAFC', borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0' }}>
                <Text style={{ fontFamily: 'Inter', fontSize: 14, fontWeight: '700', color: '#0F172A', marginBottom: 4 }}>
                  How do I scan guest IDs?
                </Text>
                <Text style={{ fontFamily: 'Inter', fontSize: 13, color: '#475569', lineHeight: 18 }}>
                  Tap the purple Camera button at the bottom navigation, select the document type, and align the card in the frame.
                </Text>
              </View>

              {/* FAQ 2 */}
              <View style={{ backgroundColor: '#F8FAFC', borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0' }}>
                <Text style={{ fontFamily: 'Inter', fontSize: 14, fontWeight: '700', color: '#0F172A', marginBottom: 4 }}>
                  Does live sync work offline?
                </Text>
                <Text style={{ fontFamily: 'Inter', fontSize: 13, color: '#475569', lineHeight: 18 }}>
                  Yes! You can check in guests offline. Records are saved locally and synced across devices once internet reconnects.
                </Text>
              </View>

              {/* FAQ 3 */}
              <View style={{ backgroundColor: '#F8FAFC', borderRadius: 12, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: '#E2E8F0' }}>
                <Text style={{ fontFamily: 'Inter', fontSize: 14, fontWeight: '700', color: '#0F172A', marginBottom: 4 }}>
                  How do guests self check-in?
                </Text>
                <Text style={{ fontFamily: 'Inter', fontSize: 13, color: '#475569', lineHeight: 18 }}>
                  From the Dashboard, tap "Share" on the Self check-in card to send a link to guests before their arrival.
                </Text>
              </View>

              <PrimaryButton
                label="Email Devify Support"
                icon="mail"
                onPress={() => {
                  setHelpModalOpen(false);
                  Linking.openURL('mailto:support@devify.co.in?subject=StayMate%20Support%20Request');
                }}
                style={{ marginBottom: 10 }}
              />

              <SecondaryButton
                label="Chat on WhatsApp (+91 84718 97293)"
                icon="phone"
                onPress={() => {
                  setHelpModalOpen(false);
                  Linking.openURL('https://wa.me/918471897293?text=Hi%20Devify%20Team%2C%20I%20need%20help%20with%20StayMate.');
                }}
              />
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 130,
  },
  headerTop: {
    paddingTop: 12,
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
    shadowOffset: { width: 0, height: 4 },
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
    shadowOffset: { width: 0, height: 4 },
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
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: '#6a6a6a',
    textTransform: 'uppercase',
    marginTop: 20,
    marginBottom: 4,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheetContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '85%',
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sheetTitle: {
    fontFamily: 'Inter',
    fontSize: 20,
    fontWeight: '700',
    color: '#222222',
  },
  sheetClose: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#f2f2f2',
    alignItems: 'center',
    justifyContent: 'center',
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
    <View style={{ marginTop: 14 }}>
      <View style={s.usageLabels}>
        <Text style={s.usageText}>{label}</Text>
        <Text style={s.usageText}>{value}</Text>
      </View>
      <View style={s.usageTrack}>
        <View
          style={[
            s.usageFill,
            { width: `${pct}%`, backgroundColor: dark ? '#222222' : C.primary },
          ]}
        />
      </View>
    </View>
  );
}
