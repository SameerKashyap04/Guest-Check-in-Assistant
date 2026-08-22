import React, {useState, useEffect} from 'react';
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
} from 'react-native';
import {C, R, shadow} from '../theme/tokens';
import {Icon, IconName} from '../components/Icon';
import {SettingRow, PrimaryButton, SecondaryButton, Field} from '../components/Ui';
import {securityService} from '../services/securityService';

const StayMateLogo = require('../../assets/staymate-logo.png');

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
  {id: 'es', name: 'Spanish', native: 'Español'},
  {id: 'fr', name: 'French', native: 'Français'},
];

const THEMES = [
  {id: 'system', name: 'System default', desc: 'Follows device appearance'},
  {id: 'light', name: 'Light mode', desc: 'Crisp bright interface'},
  {id: 'dark', name: 'Dark mode', desc: 'Sleek low-light theme'},
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
  onAccount,
  onModal,
  onPricing,
  onLogout,
  onLock,
  onToast,
}: {
  onAccount: () => void;
  onModal?: (title: string, text: string) => void;
  onPricing: () => void;
  onLogout: () => void;
  onLock: () => void;
  onToast?: (msg: string) => void;
}) {
  // Live State
  const [profile, setProfile] = useState<PropertyProfile>({
    name: 'Sunrise Homestay',
    code: 'HS-4821',
    owner: 'Homestay Owner',
    address: 'Plot 14, Hilltop View Road, Ooty, Tamil Nadu 643001',
    phone: '+91 98765 43210',
    email: 'owner@sunrisehomestay.com',
  });

  const [cloudSync, setCloudSync] = useState(true);
  const [requirePin, setRequirePin] = useState(true);
  const [biometric, setBiometric] = useState(true);
  const [language, setLanguage] = useState('English');
  const [theme, setTheme] = useState('System default');
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
    'profile' | 'language' | 'theme' | 'pin' | 'autolock' | 'help' | null
  >(null);

  // Form Temp States
  const [editProfile, setEditProfile] = useState<PropertyProfile>(profile);
  const [currentPinInput, setCurrentPinInput] = useState('');
  const [newPinInput, setNewPinInput] = useState('');
  const [confirmPinInput, setConfirmPinInput] = useState('');

  const notify = (msg: string) => {
    if (onToast) onToast(msg);
  };

  // Open Profile Sheet
  const handleOpenProfile = () => {
    setEditProfile({...profile});
    setActiveModal('profile');
  };

  // Save Profile Sheet
  const handleSaveProfile = () => {
    if (!editProfile.name.trim()) {
      Alert.alert('Required', 'Please enter a property name.');
      return;
    }
    setProfile(editProfile);
    setActiveModal(null);
    notify('Property profile updated');
  };

  // Toggle Cloud Mode
  const handleToggleCloud = () => {
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
    setCurrentPinInput('');
    setNewPinInput('');
    setConfirmPinInput('');
    setActiveModal('pin');
  };

  // Save PIN Sheet
  const handleSavePin = async () => {
    const currentPin = securityService.getSettings().pin;
    if (currentPinInput !== currentPin) {
      Alert.alert('Incorrect PIN', 'The current security PIN is incorrect.');
      return;
    }
    if (newPinInput.length !== 4 || !/^\d{4}$/.test(newPinInput)) {
      Alert.alert('Invalid PIN', 'Please enter a 4-digit numeric PIN.');
      return;
    }
    if (newPinInput !== confirmPinInput) {
      Alert.alert('Mismatch', 'New PIN and Confirm PIN do not match.');
      return;
    }
    await securityService.savePin(newPinInput);
    setActiveModal(null);
    notify('Security PIN changed successfully');
  };

  // Initials for avatar
  const initials = profile.name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('') || 'SM';

  return (
    <ScrollView
      style={{flex: 1, backgroundColor: '#fff'}}
      contentContainerStyle={{paddingHorizontal: 20, paddingBottom: 130}}
      showsVerticalScrollIndicator={false}
    >
      <Text style={s.h1}>Settings</Text>

      {/* Profile card */}
      <TouchableOpacity
        activeOpacity={0.8}
        style={s.profileCard}
        onPress={handleOpenProfile}
      >
        <View style={s.profileMark}>
          <Text style={s.profileMarkText}>{initials}</Text>
        </View>
        <View style={{flex: 1}}>
          <Text style={s.profileTitle}>{profile.name}</Text>
          <Text style={s.profileSub}>
            {profile.code} · {profile.owner}
          </Text>
        </View>
        <Icon name="chevronRight" size={18} color={C.mutedSoft}/>
      </TouchableOpacity>

      {/* Plan & Usage card */}
      <View style={s.planCard}>
        <View style={s.planTop}>
          <View>
            <Text style={s.planTitle}>Professional plan</Text>
            <Text style={s.planSub}>12 days left on trial</Text>
          </View>
          <View style={s.proBadge}>
            <Text style={s.proBadgeText}>PRO</Text>
          </View>
        </View>

        <UsageBar label="Check-ins" value="84 / 100" pct={84}/>
        <UsageBar label="Reports & exports" value="6 / 10" pct={60} dark/>

        <View style={s.ocrRow}>
          <Text style={s.ocrText}>AI Document OCR</Text>
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

      {/* DATA STORAGE */}
      <Text style={s.sectionHeader}>DATA STORAGE</Text>
      <SettingRow
        icon="cloud"
        label="Cloud mode"
        subtitle="Synced live across staff devices"
        onPress={handleToggleCloud}
        right={
          <TouchableOpacity activeOpacity={0.9} onPress={handleToggleCloud}>
            <Switch on={cloudSync}/>
          </TouchableOpacity>
        }
      />

      {/* GENERAL */}
      <Text style={[s.sectionHeader, {marginTop: 16}]}>GENERAL</Text>
      <SettingRow
        icon="users"
        label="Username & password"
        onPress={onAccount}
      />
      <SettingRow
        icon="mapPin"
        label="Property name & address"
        onPress={handleOpenProfile}
      />
      <SettingRow
        icon="globe"
        label={`Language — ${language}`}
        onPress={() => setActiveModal('language')}
      />
      <SettingRow
        icon="moon"
        label={`Theme — ${theme}`}
        onPress={() => setActiveModal('theme')}
      />

      {/* SECURITY & ACCESS */}
      <Text style={[s.sectionHeader, {marginTop: 16}]}>SECURITY & ACCESS</Text>
      <SettingRow
        icon="lock"
        label="Change security PIN"
        subtitle="Update your 4-digit security PIN"
        onPress={handleOpenPin}
      />
      <SettingRow
        icon="fingerprint"
        label="Biometric unlock"
        subtitle="Face ID / Fingerprint"
        onPress={handleToggleBiometric}
        right={
          <TouchableOpacity activeOpacity={0.9} onPress={handleToggleBiometric}>
            <Switch on={biometric}/>
          </TouchableOpacity>
        }
      />
      <SettingRow
        icon="clock"
        label={`Auto-lock — ${autoLock}`}
        subtitle="Lock after period of inactivity"
        onPress={() => setActiveModal('autolock')}
      />

      {/* HELP & SUPPORT */}
      <Text style={[s.sectionHeader, {marginTop: 16}]}>HELP & SUPPORT</Text>
      <SettingRow
        icon="info"
        label="Help Center & FAQs"
        subtitle="Guides on scanning, sync & check-ins"
        onPress={() => setActiveModal('help')}
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
      <Text style={[s.sectionHeader, {marginTop: 16}]}>ABOUT & DEVELOPER</Text>
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

      {/* Actions: Lock app & Log out */}
      <View style={s.bottomActions}>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={onLock}
          style={s.lockBtn}
        >
          <Icon name="lock" size={16} color={C.ink}/>
          <Text style={s.lockBtnText}>Lock app</Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={onLogout}
          style={s.logoutBtn}
        >
          <Icon name="logout" size={16} color={C.primary}/>
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
            source={StayMateLogo}
            style={s.footerLogo}
            resizeMode="contain"
          />
          <Text style={s.devifyText}>
            Engineered by <Text style={s.devifyBrand}>Devify</Text> · www.devify.co.in
          </Text>
        </View>
      </TouchableOpacity>

      {/* ============================================================ */}
      {/* 1. PROPERTY PROFILE MODAL SHEET                              */}
      {/* ============================================================ */}
      {activeModal === 'profile' && (
        <Modal visible transparent animationType="slide">
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={ms.sheetScrim}
          >
            <View style={ms.sheet}>
              <View style={ms.handle}/>
              <View style={ms.sheetHeaderBar}>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setActiveModal(null)}
                  style={ms.sheetBackBtn}
                >
                  <Icon name="chevronLeft" size={18} color={C.ink}/>
                </TouchableOpacity>
                <Text style={ms.sheetHeaderTitle}>Property Profile</Text>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setActiveModal(null)}
                  style={ms.sheetCloseBtnRelative}
                >
                  <Icon name="x" size={16} color={C.ink}/>
                </TouchableOpacity>
              </View>

              <ScrollView
                contentContainerStyle={{paddingHorizontal: 20, paddingBottom: 32}}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
              >
                <Text style={[ms.bodySm, {marginBottom: 16}]}>
                  Update your property details, address and contact information.
                </Text>

                <View style={ms.inputGroup}>
                  <Text style={ms.inputLabel}>PROPERTY NAME *</Text>
                  <TextInput
                    value={editProfile.name}
                    onChangeText={(t) => setEditProfile({...editProfile, name: t})}
                    placeholder="e.g. Sunrise Homestay"
                    placeholderTextColor="#94A3B8"
                    style={ms.inputField}
                  />
                </View>


                <View style={ms.inputGroup}>
                  <Text style={ms.inputLabel}>OWNER / MANAGER NAME</Text>
                  <TextInput
                    value={editProfile.owner}
                    onChangeText={(t) => setEditProfile({...editProfile, owner: t})}
                    placeholder="e.g. Homestay Owner"
                    placeholderTextColor="#94A3B8"
                    style={ms.inputField}
                  />
                </View>

                <View style={ms.inputGroup}>
                  <Text style={ms.inputLabel}>FULL ADDRESS</Text>
                  <TextInput
                    value={editProfile.address}
                    onChangeText={(t) => setEditProfile({...editProfile, address: t})}
                    placeholder="Enter complete address"
                    placeholderTextColor="#94A3B8"
                    multiline
                    style={[ms.inputField, {height: 68, textAlignVertical: 'top', paddingTop: 10}]}
                  />
                </View>

                <View style={ms.inputGroup}>
                  <Text style={ms.inputLabel}>CONTACT PHONE</Text>
                  <TextInput
                    value={editProfile.phone}
                    onChangeText={(t) => setEditProfile({...editProfile, phone: t})}
                    placeholder="+91 98765 43210"
                    placeholderTextColor="#94A3B8"
                    keyboardType="phone-pad"
                    style={ms.inputField}
                  />
                </View>

                <View style={ms.inputGroup}>
                  <Text style={ms.inputLabel}>EMAIL ADDRESS</Text>
                  <TextInput
                    value={editProfile.email}
                    onChangeText={(t) => setEditProfile({...editProfile, email: t})}
                    placeholder="owner@homestay.com"
                    placeholderTextColor="#94A3B8"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    style={ms.inputField}
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
        <Modal visible transparent animationType="slide">
          <View style={ms.sheetScrim}>
            <View style={ms.sheet}>
              <View style={ms.handle}/>
              <View style={ms.sheetHeaderBar}>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setActiveModal(null)}
                  style={ms.sheetBackBtn}
                >
                  <Icon name="chevronLeft" size={18} color={C.ink}/>
                </TouchableOpacity>
                <Text style={ms.sheetHeaderTitle}>Select Language</Text>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setActiveModal(null)}
                  style={ms.sheetCloseBtnRelative}
                >
                  <Icon name="x" size={16} color={C.ink}/>
                </TouchableOpacity>
              </View>

              <ScrollView
                contentContainerStyle={{paddingHorizontal: 20, paddingBottom: 32}}
                showsVerticalScrollIndicator={false}
              >
                <Text style={[ms.bodySm, {marginBottom: 14}]}>
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
                      style={[ms.optionRow, isSelected && ms.optionRowActive]}
                    >
                      <View style={{flex: 1}}>
                        <Text style={[ms.optionTitle, isSelected && ms.optionTitleActive]}>
                          {item.name}
                        </Text>
                        <Text style={ms.optionDesc}>{item.native}</Text>
                      </View>
                      {isSelected ? (
                        <View style={ms.checkCircle}>
                          <Icon name="check" size={14} color="#fff"/>
                        </View>
                      ) : (
                        <View style={ms.uncheckCircle}/>
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
        <Modal visible transparent animationType="slide">
          <View style={ms.sheetScrim}>
            <View style={ms.sheet}>
              <View style={ms.handle}/>
              <View style={ms.sheetHeaderBar}>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setActiveModal(null)}
                  style={ms.sheetBackBtn}
                >
                  <Icon name="chevronLeft" size={18} color={C.ink}/>
                </TouchableOpacity>
                <Text style={ms.sheetHeaderTitle}>Select Theme</Text>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setActiveModal(null)}
                  style={ms.sheetCloseBtnRelative}
                >
                  <Icon name="x" size={16} color={C.ink}/>
                </TouchableOpacity>
              </View>

              <ScrollView
                contentContainerStyle={{paddingHorizontal: 20, paddingBottom: 32}}
                showsVerticalScrollIndicator={false}
              >
                <Text style={[ms.bodySm, {marginBottom: 14}]}>
                  Customize the look and contrast of StayMate.
                </Text>

                {THEMES.map((th) => {
                  const isSelected = theme === th.name;
                  return (
                    <TouchableOpacity
                      key={th.id}
                      activeOpacity={0.75}
                      onPress={() => {
                        setTheme(th.name);
                        setActiveModal(null);
                        notify(`✓ Theme set to ${th.name}`);
                      }}
                      style={[ms.optionRow, isSelected && ms.optionRowActive]}
                    >
                      <View style={{flex: 1}}>
                        <Text style={[ms.optionTitle, isSelected && ms.optionTitleActive]}>
                          {th.name}
                        </Text>
                        <Text style={ms.optionDesc}>{th.desc}</Text>
                      </View>
                      {isSelected ? (
                        <View style={ms.checkCircle}>
                          <Icon name="check" size={14} color="#fff"/>
                        </View>
                      ) : (
                        <View style={ms.uncheckCircle}/>
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
        <Modal visible transparent animationType="slide">
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={ms.sheetScrim}
          >
            <View style={ms.sheet}>
              <View style={ms.handle}/>
              <View style={ms.sheetHeaderBar}>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setActiveModal(null)}
                  style={ms.sheetBackBtn}
                >
                  <Icon name="chevronLeft" size={18} color={C.ink}/>
                </TouchableOpacity>
                <Text style={ms.sheetHeaderTitle}>Change Security PIN</Text>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setActiveModal(null)}
                  style={ms.sheetCloseBtnRelative}
                >
                  <Icon name="x" size={16} color={C.ink}/>
                </TouchableOpacity>
              </View>

              <ScrollView
                contentContainerStyle={{paddingHorizontal: 20, paddingBottom: 32}}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
              >
                <Text style={[ms.bodySm, {marginBottom: 16}]}>
                  Your 4-digit PIN is used to lock and unlock the app.
                </Text>

                <View style={ms.inputGroup}>
                  <Text style={ms.inputLabel}>CURRENT PIN</Text>
                  <TextInput
                    value={currentPinInput}
                    onChangeText={setCurrentPinInput}
                    placeholder="Enter current 4-digit PIN (default: 1234)"
                    placeholderTextColor="#94A3B8"
                    keyboardType="number-pad"
                    maxLength={4}
                    secureTextEntry
                    style={ms.inputField}
                  />
                </View>

                <View style={ms.inputGroup}>
                  <Text style={ms.inputLabel}>NEW 4-DIGIT PIN</Text>
                  <TextInput
                    value={newPinInput}
                    onChangeText={setNewPinInput}
                    placeholder="Enter new 4-digit PIN"
                    placeholderTextColor="#94A3B8"
                    keyboardType="number-pad"
                    maxLength={4}
                    secureTextEntry
                    style={ms.inputField}
                  />
                </View>

                <View style={ms.inputGroup}>
                  <Text style={ms.inputLabel}>CONFIRM NEW PIN</Text>
                  <TextInput
                    value={confirmPinInput}
                    onChangeText={setConfirmPinInput}
                    placeholder="Re-enter new 4-digit PIN"
                    placeholderTextColor="#94A3B8"
                    keyboardType="number-pad"
                    maxLength={4}
                    secureTextEntry
                    style={ms.inputField}
                  />
                </View>

                <View style={{flexDirection: 'row', gap: 10, marginTop: 14}}>
                  <SecondaryButton
                    label="Cancel"
                    style={{flex: 1}}
                    onPress={() => setActiveModal(null)}
                  />
                  <PrimaryButton
                    label="Update PIN"
                    style={{flex: 1.6}}
                    onPress={handleSavePin}
                  />
                </View>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      )}

      {/* ============================================================ */}
      {/* 5. AUTO-LOCK DURATION MODAL SHEET                            */}
      {/* ============================================================ */}
      {activeModal === 'autolock' && (
        <Modal visible transparent animationType="slide">
          <View style={ms.sheetScrim}>
            <View style={ms.sheet}>
              <View style={ms.handle}/>
              <View style={ms.sheetHeaderBar}>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setActiveModal(null)}
                  style={ms.sheetBackBtn}
                >
                  <Icon name="chevronLeft" size={18} color={C.ink}/>
                </TouchableOpacity>
                <Text style={ms.sheetHeaderTitle}>Auto-Lock Duration</Text>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setActiveModal(null)}
                  style={ms.sheetCloseBtnRelative}
                >
                  <Icon name="x" size={16} color={C.ink}/>
                </TouchableOpacity>
              </View>

              <ScrollView
                contentContainerStyle={{paddingHorizontal: 20, paddingBottom: 32}}
                showsVerticalScrollIndicator={false}
              >
                <Text style={[ms.bodySm, {marginBottom: 14}]}>
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
                      style={[ms.optionRow, isSelected && ms.optionRowActive]}
                    >
                      <Text style={[ms.optionTitle, isSelected && ms.optionTitleActive]}>
                        {opt.label}
                      </Text>
                      {isSelected ? (
                        <View style={ms.checkCircle}>
                          <Icon name="check" size={14} color="#fff"/>
                        </View>
                      ) : (
                        <View style={ms.uncheckCircle}/>
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
        <Modal visible transparent animationType="slide">
          <View style={ms.sheetScrim}>
            <View style={ms.sheet}>
              <View style={ms.handle}/>
              <View style={ms.sheetHeaderBar}>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setActiveModal(null)}
                  style={ms.sheetBackBtn}
                >
                  <Icon name="chevronLeft" size={18} color={C.ink}/>
                </TouchableOpacity>
                <Text style={ms.sheetHeaderTitle}>Help & Support</Text>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setActiveModal(null)}
                  style={ms.sheetCloseBtnRelative}
                >
                  <Icon name="x" size={16} color={C.ink}/>
                </TouchableOpacity>
              </View>

              <ScrollView
                contentContainerStyle={{paddingHorizontal: 20, paddingBottom: 36}}
                showsVerticalScrollIndicator={false}
              >
                <Text style={[ms.bodySm, {marginBottom: 16}]}>
                  Find quick answers to common questions or reach out directly to the Devify team.
                </Text>

                {/* FAQ 1 */}
                <View style={{backgroundColor: '#F8FAFC', borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0'}}>
                  <Text style={{fontFamily: 'Inter', fontSize: 14, fontWeight: '700', color: '#0F172A', marginBottom: 4}}>
                    How do I scan guest IDs?
                  </Text>
                  <Text style={{fontFamily: 'Inter', fontSize: 13, color: '#475569', lineHeight: 18}}>
                    Tap the purple Camera button at the bottom navigation, select the document type (Aadhaar, Passport, DL, etc.), and align the ID in the frame.
                  </Text>
                </View>

                {/* FAQ 2 */}
                <View style={{backgroundColor: '#F8FAFC', borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0'}}>
                  <Text style={{fontFamily: 'Inter', fontSize: 14, fontWeight: '700', color: '#0F172A', marginBottom: 4}}>
                    Does live sync work offline?
                  </Text>
                  <Text style={{fontFamily: 'Inter', fontSize: 13, color: '#475569', lineHeight: 18}}>
                    Yes! You can check in guests offline. Records are stored locally and automatically synchronized across devices once internet is restored.
                  </Text>
                </View>

                {/* FAQ 3 */}
                <View style={{backgroundColor: '#F8FAFC', borderRadius: 14, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: '#E2E8F0'}}>
                  <Text style={{fontFamily: 'Inter', fontSize: 14, fontWeight: '700', color: '#0F172A', marginBottom: 4}}>
                    How do guests self check-in?
                  </Text>
                  <Text style={{fontFamily: 'Inter', fontSize: 13, color: '#475569', lineHeight: 18}}>
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
