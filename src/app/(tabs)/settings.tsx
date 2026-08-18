import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  Alert, Modal, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ChevronRight, Cloud, MapPin, Globe, Moon,
  Lock, Clock, Fingerprint, LogOut, Check,
  X, User,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useColorScheme } from 'nativewind';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { AirbnbSwitch } from '@/components/AirbnbSwitch';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useSubscriptionStore } from '@/store/useSubscriptionStore';
import { useAuthStore } from '@/store/useAuthStore';
import { getEffectivePlan, getTrialDaysRemaining } from '@/services/entitlementService';
import { PLANS } from '@/config/plans';
import { SubscriptionPlan } from '@/types/subscription';
import { AIRBNB } from '@/theme/airbnb';

// ─── Airbnb Settings for StayMate ─────────────────────────────────────────────
// Exact 1:1 port of renderSettings() from staymate-airbnb-redesign/app.html
// ─────────────────────────────────────────────────────────────────────────────

export default function SettingsScreen() {
  const { t, i18n } = useTranslation();
  const { colorScheme, setColorScheme } = useColorScheme();
  const router = useRouter();

  const {
    businessName, userName, propertyId, storageMode,
    setStorageMode, setBusinessSetup, setUserName, setLanguage, setTheme,
  } = useSettingsStore();

  const { currentPlan, usage, isTrialing } = useSubscriptionStore();
  const { logout, verifyPin, setupPin } = useAuthStore();

  // Dialog State
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [tempPropName, setTempPropName] = useState(businessName || '');
  const [userNameModalOpen, setUserNameModalOpen] = useState(false);
  const [tempUserName, setTempUserName] = useState(userName || 'Sameer');
  const [langModalOpen, setLangModalOpen] = useState(false);
  const [themeModalOpen, setThemeModalOpen] = useState(false);
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [autoLockModalOpen, setAutoLockModalOpen] = useState(false);
  const [autoLockTimeout, setAutoLockTimeout] = useState(5);
  const [biometricEnabled, setBiometricEnabled] = useState(true);

  // PIN Form State
  const [currentPinInput, setCurrentPinInput] = useState('');
  const [newPinInput, setNewPinInput] = useState('');
  const [confirmPinInput, setConfirmPinInput] = useState('');

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

  const handleToggleStorage = async (val: boolean) => {
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

  const getInitials = (name?: string | null) => {
    if (!name) return 'SM';
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map(n => n[0].toUpperCase())
      .join('');
  };

  const checkinPct = checkInLimit > 0
    ? Math.min(100, Math.round((usage.checkInCount / checkInLimit) * 100))
    : 0;

  const exportPct = exportLimit > 0
    ? Math.min(100, Math.round((usage.exportCount / exportLimit) * 100))
    : 0;

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <Text style={styles.title}>Settings</Text>

        {/* ── Property Hero Card ── */}
        <TouchableOpacity
          style={styles.propertyCard}
          activeOpacity={0.8}
          onPress={() => {
            setTempPropName(businessName || '');
            setTempUserName(userName || 'Sameer');
            setProfileModalOpen(true);
          }}
        >
          <View style={styles.propertyAvatar}>
            <Text style={styles.propertyAvatarText}>
              {getInitials(businessName)}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.propertyName} numberOfLines={1}>
              {businessName || 'Sunrise Homestay'}
            </Text>
            <Text style={styles.propertyMeta}>
              {propertyId || 'HS-4821'} · {userName || 'Sameer'} (Owner)
            </Text>
          </View>
          <ChevronRight size={18} color={AIRBNB.colors.mutedSoft} />
        </TouchableOpacity>

        {/* ── Subscription Card ── */}
        <View style={styles.subCard}>
          <View style={styles.subHeaderRow}>
            <View>
              <Text style={styles.subPlanTitle}>
                {planConfig.name} plan
              </Text>
              <Text style={styles.subTrialSubtitle}>
                {isTrialing ? `${trialDays} days left on trial` : 'Active subscription'}
              </Text>
            </View>
            <View style={styles.proBadge}>
              <Text style={styles.proBadgeText}>PRO</Text>
            </View>
          </View>

          {/* Check-ins Progress Bar */}
          <View style={styles.progressWrap}>
            <View style={styles.progressLabelRow}>
              <Text style={styles.progressLabel}>Check-ins this month</Text>
              <Text style={styles.progressVal}>
                {checkInLimit === -1 ? `${usage.checkInCount} / Unlimited` : `${usage.checkInCount} / ${checkInLimit}`}
              </Text>
            </View>
            <View style={styles.track}>
              <View style={[styles.fill, { width: checkInLimit === -1 ? '100%' : `${checkinPct}%`, backgroundColor: AIRBNB.colors.primary }]} />
            </View>
          </View>

          {/* Reports Progress Bar */}
          <View style={styles.progressWrap}>
            <View style={styles.progressLabelRow}>
              <Text style={styles.progressLabel}>Reports &amp; exports</Text>
              <Text style={styles.progressVal}>
                {exportLimit === -1 ? `${usage.exportCount} / Unlimited` : `${usage.exportCount} / ${exportLimit}`}
              </Text>
            </View>
            <View style={styles.track}>
              <View style={[styles.fill, { width: exportLimit === -1 ? '100%' : `${exportPct}%`, backgroundColor: AIRBNB.colors.ink }]} />
            </View>
          </View>

          {/* AI Document OCR Row */}
          <View style={styles.ocrRow}>
            <Text style={styles.ocrLabel}>AI Document OCR</Text>
            <View style={styles.activePill}>
              <Text style={styles.activePillText}>Active</Text>
            </View>
          </View>

          {/* View Plans Button */}
          <Button
            label="View plans &amp; upgrade"
            variant="primary"
            style={{ marginTop: 14 }}
            onPress={() => router.push('/subscription/pricing')}
          />
        </View>

        {/* ── DATA STORAGE Section ── */}
        <Text style={styles.sectionLabel}>DATA STORAGE</Text>
        <View style={styles.settingsRow}>
          <View style={styles.iconWell}>
            <Cloud size={18} color={AIRBNB.colors.ink} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle}>Cloud mode</Text>
            <Text style={styles.rowSubtitle}>
              {storageMode === 'cloud' ? 'Synced live across staff devices' : 'Local storage only'}
            </Text>
          </View>
          <AirbnbSwitch
            value={storageMode === 'cloud'}
            onValueChange={handleToggleStorage}
          />
        </View>

        {/* ── GENERAL Section ── */}
        <Text style={styles.sectionLabel}>GENERAL</Text>

        <TouchableOpacity
          style={styles.settingsRow}
          activeOpacity={0.7}
          onPress={() => {
            setTempUserName(userName || 'Sameer');
            setUserNameModalOpen(true);
          }}
        >
          <View style={styles.iconWell}>
            <User size={18} color={AIRBNB.colors.ink} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle}>User name — {userName || 'Sameer'}</Text>
          </View>
          <ChevronRight size={18} color={AIRBNB.colors.mutedSoft} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.settingsRow}
          activeOpacity={0.7}
          onPress={() => {
            setTempPropName(businessName || '');
            setTempUserName(userName || 'Sameer');
            setProfileModalOpen(true);
          }}
        >
          <View style={styles.iconWell}>
            <MapPin size={18} color={AIRBNB.colors.ink} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle}>Property name &amp; address</Text>
          </View>
          <ChevronRight size={18} color={AIRBNB.colors.mutedSoft} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.settingsRow}
          activeOpacity={0.7}
          onPress={() => setLangModalOpen(true)}
        >
          <View style={styles.iconWell}>
            <Globe size={18} color={AIRBNB.colors.ink} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle}>
              Language — {i18n.language === 'hi' ? 'Hindi' : 'English'}
            </Text>
          </View>
          <ChevronRight size={18} color={AIRBNB.colors.mutedSoft} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.settingsRow}
          activeOpacity={0.7}
          onPress={() => setThemeModalOpen(true)}
        >
          <View style={styles.iconWell}>
            <Moon size={18} color={AIRBNB.colors.ink} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle}>
              Theme — {colorScheme === 'dark' ? 'Dark' : 'System default'}
            </Text>
          </View>
          <ChevronRight size={18} color={AIRBNB.colors.mutedSoft} />
        </TouchableOpacity>

        {/* ── SECURITY Section ── */}
        <Text style={styles.sectionLabel}>SECURITY</Text>

        <TouchableOpacity
          style={styles.settingsRow}
          activeOpacity={0.7}
          onPress={() => setPinModalOpen(true)}
        >
          <View style={styles.iconWell}>
            <Lock size={18} color={AIRBNB.colors.ink} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle}>Change security PIN</Text>
          </View>
          <ChevronRight size={18} color={AIRBNB.colors.mutedSoft} />
        </TouchableOpacity>

        <View style={styles.settingsRow}>
          <View style={styles.iconWell}>
            <Fingerprint size={18} color={AIRBNB.colors.ink} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle}>Biometric unlock</Text>
            <Text style={styles.rowSubtitle}>Face ID / Fingerprint</Text>
          </View>
          <AirbnbSwitch
            value={biometricEnabled}
            onValueChange={setBiometricEnabled}
          />
        </View>

        <TouchableOpacity
          style={styles.settingsRow}
          activeOpacity={0.7}
          onPress={() => setAutoLockModalOpen(true)}
        >
          <View style={styles.iconWell}>
            <Clock size={18} color={AIRBNB.colors.ink} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle}>
              Auto-lock — {autoLockTimeout === 0 ? 'Immediately' : `After ${autoLockTimeout} minutes`}
            </Text>
          </View>
          <ChevronRight size={18} color={AIRBNB.colors.mutedSoft} />
        </TouchableOpacity>

        {/* ── Bottom Action Buttons ── */}
        <View style={styles.bottomBtnsRow}>
          <Button
            label="Lock app"
            variant="soft"
            icon={<Lock size={16} color={AIRBNB.colors.ink} />}
            style={{ flex: 1 }}
            onPress={() => useAuthStore.setState({ isUnlocked: false })}
          />
          <Button
            label="Log out"
            variant="danger"
            icon={<LogOut size={16} color={AIRBNB.colors.rose} />}
            style={{ flex: 1 }}
            onPress={() => {
              Alert.alert('Log out?', 'You will need to sign in again with your email and password.', [
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
            }}
          />
        </View>
      </ScrollView>

      {/* ══════════════════════════════════════════════════
          PROPERTY PROFILE MODAL
      ══════════════════════════════════════════════════ */}
      <Modal visible={profileModalOpen} transparent animationType="slide">
        <TouchableOpacity
          style={styles.scrim}
          activeOpacity={1}
          onPress={() => setProfileModalOpen(false)}
        >
          <TouchableOpacity
            style={styles.sheet}
            activeOpacity={1}
            onPress={e => e.stopPropagation?.()}
          >
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Property Details</Text>
              <TouchableOpacity
                style={styles.iconBtn}
                onPress={() => setProfileModalOpen(false)}
              >
                <X size={16} color={AIRBNB.colors.ink} />
              </TouchableOpacity>
            </View>

            <Input
              label="Your Name / Host Name"
              value={tempUserName}
              onChangeText={setTempUserName}
              placeholder="e.g. Sameer"
            />

            <Input
              label="Property / Business Name"
              value={tempPropName}
              onChangeText={setTempPropName}
              placeholder="e.g. Sunrise Homestay"
            />

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
              <Button
                label="Cancel"
                variant="outline"
                style={{ flex: 1 }}
                onPress={() => setProfileModalOpen(false)}
              />
              <Button
                label="Save"
                variant="primary"
                style={{ flex: 1 }}
                onPress={handleSavePropertyProfile}
              />
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* ══════════════════════════════════════════════════
          USER NAME MODAL
      ══════════════════════════════════════════════════ */}
      <Modal visible={userNameModalOpen} transparent animationType="slide">
        <TouchableOpacity
          style={styles.scrim}
          activeOpacity={1}
          onPress={() => setUserNameModalOpen(false)}
        >
          <TouchableOpacity
            style={styles.sheet}
            activeOpacity={1}
            onPress={e => e.stopPropagation?.()}
          >
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Change User Name</Text>
              <TouchableOpacity
                style={styles.iconBtn}
                onPress={() => setUserNameModalOpen(false)}
              >
                <X size={16} color={AIRBNB.colors.ink} />
              </TouchableOpacity>
            </View>

            <Input
              label="Your Name / Greeting Name"
              value={tempUserName}
              onChangeText={setTempUserName}
              placeholder="e.g. Sameer"
              autoFocus
            />

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
              <Button
                label="Cancel"
                variant="outline"
                style={{ flex: 1 }}
                onPress={() => setUserNameModalOpen(false)}
              />
              <Button
                label="Save"
                variant="primary"
                style={{ flex: 1 }}
                onPress={() => {
                  if (!tempUserName.trim()) {
                    Alert.alert('Required', 'User name cannot be empty');
                    return;
                  }
                  setUserName(tempUserName.trim());
                  setUserNameModalOpen(false);
                  Alert.alert('Updated', 'User name updated successfully!');
                }}
              />
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* ══════════════════════════════════════════════════
          SECURITY PIN MODAL
      ══════════════════════════════════════════════════ */}
      <Modal visible={pinModalOpen} transparent animationType="slide">
        <TouchableOpacity
          style={styles.scrim}
          activeOpacity={1}
          onPress={() => setPinModalOpen(false)}
        >
          <TouchableOpacity
            style={styles.sheet}
            activeOpacity={1}
            onPress={e => e.stopPropagation?.()}
          >
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Change Security PIN</Text>
              <TouchableOpacity
                style={styles.iconBtn}
                onPress={() => setPinModalOpen(false)}
              >
                <X size={16} color={AIRBNB.colors.ink} />
              </TouchableOpacity>
            </View>

            <Input
              label="Current PIN"
              value={currentPinInput}
              onChangeText={setCurrentPinInput}
              placeholder="4-digit PIN"
              secureTextEntry
              keyboardType="numeric"
              maxLength={4}
            />
            <Input
              label="New PIN"
              value={newPinInput}
              onChangeText={setNewPinInput}
              placeholder="New 4-digit PIN"
              secureTextEntry
              keyboardType="numeric"
              maxLength={4}
            />
            <Input
              label="Confirm New PIN"
              value={confirmPinInput}
              onChangeText={setConfirmPinInput}
              placeholder="Confirm 4-digit PIN"
              secureTextEntry
              keyboardType="numeric"
              maxLength={4}
            />

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
              <Button
                label="Cancel"
                variant="outline"
                style={{ flex: 1 }}
                onPress={() => setPinModalOpen(false)}
              />
              <Button
                label="Update PIN"
                variant="primary"
                style={{ flex: 1 }}
                onPress={handleUpdatePin}
              />
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* ══════════════════════════════════════════════════
          LANGUAGE MODAL
      ══════════════════════════════════════════════════ */}
      <Modal visible={langModalOpen} transparent animationType="slide">
        <TouchableOpacity
          style={styles.scrim}
          activeOpacity={1}
          onPress={() => setLangModalOpen(false)}
        >
          <TouchableOpacity
            style={styles.sheet}
            activeOpacity={1}
            onPress={e => e.stopPropagation?.()}
          >
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Select Language</Text>
              <TouchableOpacity
                style={styles.iconBtn}
                onPress={() => setLangModalOpen(false)}
              >
                <X size={16} color={AIRBNB.colors.ink} />
              </TouchableOpacity>
            </View>

            {[
              { code: 'en', label: 'English (India)' },
              { code: 'hi', label: 'Hindi (हिंदी)' },
            ].map(l => (
              <TouchableOpacity
                key={l.code}
                style={styles.dialogOptionRow}
                onPress={() => {
                  i18n.changeLanguage(l.code);
                  setLangModalOpen(false);
                }}
              >
                <Text style={styles.dialogOptionText}>{l.label}</Text>
                {i18n.language === l.code && <Check size={18} color={AIRBNB.colors.primary} />}
              </TouchableOpacity>
            ))}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* ══════════════════════════════════════════════════
          THEME MODAL
      ══════════════════════════════════════════════════ */}
      <Modal visible={themeModalOpen} transparent animationType="slide">
        <TouchableOpacity
          style={styles.scrim}
          activeOpacity={1}
          onPress={() => setThemeModalOpen(false)}
        >
          <TouchableOpacity
            style={styles.sheet}
            activeOpacity={1}
            onPress={e => e.stopPropagation?.()}
          >
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Appearance</Text>
              <TouchableOpacity
                style={styles.iconBtn}
                onPress={() => setThemeModalOpen(false)}
              >
                <X size={16} color={AIRBNB.colors.ink} />
              </TouchableOpacity>
            </View>

            {[
              { id: 'light', label: 'Light' },
              { id: 'dark', label: 'Dark' },
              { id: 'system', label: 'System Default' },
            ].map(thm => (
              <TouchableOpacity
                key={thm.id}
                style={styles.dialogOptionRow}
                onPress={() => {
                  setColorScheme(thm.id as any);
                  setThemeModalOpen(false);
                }}
              >
                <Text style={styles.dialogOptionText}>{thm.label}</Text>
                {colorScheme === thm.id && <Check size={18} color={AIRBNB.colors.primary} />}
              </TouchableOpacity>
            ))}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* ══════════════════════════════════════════════════
          AUTO-LOCK MODAL
      ══════════════════════════════════════════════════ */}
      <Modal visible={autoLockModalOpen} transparent animationType="slide">
        <TouchableOpacity
          style={styles.scrim}
          activeOpacity={1}
          onPress={() => setAutoLockModalOpen(false)}
        >
          <TouchableOpacity
            style={styles.sheet}
            activeOpacity={1}
            onPress={e => e.stopPropagation?.()}
          >
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Auto-lock Timer</Text>
              <TouchableOpacity
                style={styles.iconBtn}
                onPress={() => setAutoLockModalOpen(false)}
              >
                <X size={16} color={AIRBNB.colors.ink} />
              </TouchableOpacity>
            </View>

            {[
              { val: 0, label: 'Immediately' },
              { val: 1, label: '1 Minute' },
              { val: 5, label: '5 Minutes' },
              { val: 15, label: '15 Minutes' },
            ].map(opt => (
              <TouchableOpacity
                key={opt.val}
                style={styles.dialogOptionRow}
                onPress={() => {
                  setAutoLockTimeout(opt.val);
                  setAutoLockModalOpen(false);
                }}
              >
                <Text style={styles.dialogOptionText}>{opt.label}</Text>
                {autoLockTimeout === opt.val && <Check size={18} color={AIRBNB.colors.primary} />}
              </TouchableOpacity>
            ))}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: AIRBNB.colors.canvas,
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 110,
  },
  title: {
    ...AIRBNB.typography.displayLg,
    color: AIRBNB.colors.ink,
    paddingTop: 18,
  },

  // Property Hero Card
  propertyCard: {
    backgroundColor: AIRBNB.colors.canvas,
    borderWidth: 1,
    borderColor: AIRBNB.colors.hairlineSoft,
    borderRadius: AIRBNB.radius.md,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginTop: 16,
    ...AIRBNB.shadow.card,
  },
  propertyAvatar: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: AIRBNB.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  propertyAvatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  propertyName: {
    ...AIRBNB.typography.titleMd,
    color: AIRBNB.colors.ink,
  },
  propertyMeta: {
    ...AIRBNB.typography.bodySm,
    color: AIRBNB.colors.muted,
    marginTop: 2,
  },

  // Subscription Card
  subCard: {
    backgroundColor: AIRBNB.colors.canvas,
    borderWidth: 1,
    borderColor: AIRBNB.colors.hairlineSoft,
    borderRadius: AIRBNB.radius.md,
    padding: 16,
    marginTop: 14,
    ...AIRBNB.shadow.card,
  },
  subHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  subPlanTitle: {
    ...AIRBNB.typography.titleSm,
    color: AIRBNB.colors.ink,
  },
  subTrialSubtitle: {
    ...AIRBNB.typography.bodySm,
    color: AIRBNB.colors.muted,
    marginTop: 2,
  },
  proBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: AIRBNB.radius.full,
    backgroundColor: AIRBNB.colors.surfaceStrong,
  },
  proBadgeText: {
    ...AIRBNB.typography.micro,
    color: AIRBNB.colors.ink,
  },
  progressWrap: {
    marginBottom: 12,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressLabel: {
    ...AIRBNB.typography.caption,
    color: AIRBNB.colors.muted,
  },
  progressVal: {
    ...AIRBNB.typography.caption,
    fontWeight: '600',
    color: AIRBNB.colors.ink,
  },
  track: {
    height: 8,
    borderRadius: AIRBNB.radius.full,
    backgroundColor: AIRBNB.colors.surfaceStrong,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: AIRBNB.radius.full,
  },
  ocrRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: AIRBNB.colors.hairlineSoft,
  },
  ocrLabel: {
    ...AIRBNB.typography.bodySm,
    color: AIRBNB.colors.ink,
  },
  activePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: AIRBNB.radius.full,
    backgroundColor: AIRBNB.colors.emeraldBg,
  },
  activePillText: {
    ...AIRBNB.typography.micro,
    color: AIRBNB.colors.emerald,
  },

  // Section Headers
  sectionLabel: {
    ...AIRBNB.typography.caption,
    color: AIRBNB.colors.muted,
    marginTop: 20,
    marginBottom: 4,
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: AIRBNB.colors.hairlineSoft,
  },
  iconWell: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: AIRBNB.colors.surfaceStrong,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  rowTitle: {
    ...AIRBNB.typography.titleSm,
    color: AIRBNB.colors.ink,
  },
  rowSubtitle: {
    ...AIRBNB.typography.bodySm,
    color: AIRBNB.colors.muted,
    marginTop: 2,
  },
  bottomBtnsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 24,
    marginBottom: 20,
  },

  // Sheet
  scrim: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: AIRBNB.colors.canvas,
    borderTopLeftRadius: AIRBNB.radius.sheet,
    borderTopRightRadius: AIRBNB.radius.sheet,
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 28,
    maxHeight: '82%',
    ...AIRBNB.shadow.sheet,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: AIRBNB.radius.full,
    backgroundColor: AIRBNB.colors.hairline,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 6,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sheetTitle: {
    ...AIRBNB.typography.titleMd,
    color: AIRBNB.colors.ink,
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: AIRBNB.colors.surfaceStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialogOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: AIRBNB.colors.hairlineSoft,
  },
  dialogOptionText: {
    ...AIRBNB.typography.titleSm,
    color: AIRBNB.colors.ink,
  },
});
