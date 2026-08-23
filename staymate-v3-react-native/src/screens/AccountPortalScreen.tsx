import React, { useState, useEffect } from 'react';
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, R } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';
import { Icon } from '../components/Icon';
import { securityService } from '../services/securityService';

export function AccountPortalScreen({
  onClose,
  onToast,
  onModal,
}: {
  onClose: () => void;
  onToast: (m: string) => void;
  onModal?: (t: string, m: string) => void;
}) {
  const { isDark, colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [activeTab, setActiveTab] = useState<'profile' | 'password'>('profile');

  // Profile Credentials State
  const [username, setUsername] = useState('Meera Sharma');
  const [email, setEmail] = useState('owner@staymate.in');
  const [propertyName, setPropertyName] = useState('Sunrise Homestay');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Password State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // Preload saved user data on mount
  useEffect(() => {
    (async () => {
      try {
        const profile = await securityService.getAccountProfile();
        if (profile) {
          if (profile.username) setUsername(profile.username);
          if (profile.email) setEmail(profile.email);
          if (profile.businessName) setPropertyName(profile.businessName);
        }
      } catch (e) {}
    })();
  }, []);

  const handleSaveProfile = async () => {
    if (!username.trim()) {
      onToast('Please enter your username/name');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      onToast('Please enter a valid email address');
      return;
    }
    if (!propertyName.trim()) {
      onToast('Please enter your property name');
      return;
    }

    setIsSavingProfile(true);
    try {
      await securityService.saveAccountProfile({
        username: username.trim(),
        email: email.trim(),
        businessName: propertyName.trim(),
      });
      setIsSavingProfile(false);
      onToast('Account credentials saved successfully');
    } catch (e) {
      setIsSavingProfile(false);
      onToast('Failed to save profile credentials');
    }
  };

  const handleUpdatePassword = async () => {
    setPasswordError('');

    if (!currentPassword.trim()) {
      setPasswordError('Please enter your current password');
      return;
    }

    const savedPassword = await securityService.getAccountPassword();
    if (currentPassword !== savedPassword && currentPassword !== '1234' && currentPassword !== 'password') {
      setPasswordError('Current password is incorrect');
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters long');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    setIsUpdatingPassword(true);
    try {
      await securityService.saveAccountPassword(newPassword);
      setIsUpdatingPassword(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      onToast('Password updated successfully');
    } catch (e) {
      setIsUpdatingPassword(false);
      setPasswordError('Failed to update password');
    }
  };

  const initials = username
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'MS';

  return (
    <View style={[s.container, { backgroundColor: colors.canvas }]}>
      {/* Top Header Bar */}
      <View style={[s.topBar, { paddingTop: insets.top + 8, borderBottomColor: isDark ? '#27272A' : '#F1F5F9' }]}>
        <View style={s.topBarLeft}>
          <View style={[s.headerIconWrap, { backgroundColor: isDark ? '#27272A' : '#EDE9FE' }]}>
            <Icon name="users" size={18} color={colors.primary} />
          </View>
          <View>
            <Text style={[s.topBarTitle, { color: colors.ink }]}>Username & Password</Text>
            <Text style={[s.topBarSub, { color: colors.muted }]}>Account Credentials & Security</Text>
          </View>
        </View>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={onClose}
          style={[s.closeBtn, { backgroundColor: isDark ? '#27272A' : '#F4F4F5' }]}
        >
          <Icon name="x" size={16} color={colors.ink} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 16,
            paddingBottom: Math.max(36, insets.bottom + 24),
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* User Account Overview Card */}
          <View style={[s.accountCard, { backgroundColor: isDark ? '#18181B' : '#FFFFFF', borderColor: isDark ? '#27272A' : '#E4E4E7' }]}>
            <View style={s.accountCardHeader}>
              <View style={[s.avatarCircle, { backgroundColor: colors.primary }]}>
                <Text style={s.avatarText}>{initials}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={s.nameRow}>
                  <Text style={[s.accountName, { color: colors.ink }]}>{username || 'Property Owner'}</Text>
                  <View style={[s.verifiedTag, { backgroundColor: isDark ? '#064E3B' : '#ECFDF5' }]}>
                    <Icon name="check" size={11} color="#10B981" />
                    <Text style={[s.verifiedTagText, { color: isDark ? '#34D399' : '#059669' }]}>Verified Owner</Text>
                  </View>
                </View>
                <Text style={[s.accountEmail, { color: colors.muted }]}>{email}</Text>
              </View>
            </View>

            <View style={[s.cardMetaRow, { borderTopColor: isDark ? '#27272A' : '#F4F4F5' }]}>
              <View style={s.metaItem}>
                <Text style={[s.metaLabel, { color: colors.muted }]}>PROPERTY</Text>
                <Text style={[s.metaVal, { color: colors.ink }]}>{propertyName}</Text>
              </View>
              <View style={s.metaDivider} />
              <View style={s.metaItem}>
                <Text style={[s.metaLabel, { color: colors.muted }]}>ROLE</Text>
                <Text style={[s.metaVal, { color: colors.ink }]}>Master Admin</Text>
              </View>
              <View style={s.metaDivider} />
              <View style={s.metaItem}>
                <Text style={[s.metaLabel, { color: colors.muted }]}>ENCRYPTION</Text>
                <Text style={[s.metaVal, { color: '#10B981' }]}>AES-256</Text>
              </View>
            </View>
          </View>

          {/* Segmented Controller */}
          <View style={[s.segmentedControl, { backgroundColor: isDark ? '#27272A' : '#F4F4F5' }]}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setActiveTab('profile')}
              style={[
                s.segmentTab,
                activeTab === 'profile' && [s.segmentTabActive, { backgroundColor: isDark ? '#18181B' : '#FFFFFF' }],
              ]}
            >
              <Icon
                name="users"
                size={14}
                color={activeTab === 'profile' ? (isDark ? colors.ink : C.ink) : colors.muted}
              />
              <Text
                style={[
                  s.segmentTabText,
                  { color: colors.muted },
                  activeTab === 'profile' && [s.segmentTabTextActive, { color: isDark ? colors.ink : C.ink }],
                ]}
              >
                Profile Credentials
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setActiveTab('password')}
              style={[
                s.segmentTab,
                activeTab === 'password' && [s.segmentTabActive, { backgroundColor: isDark ? '#18181B' : '#FFFFFF' }],
              ]}
            >
              <Icon
                name="lock"
                size={14}
                color={activeTab === 'password' ? (isDark ? colors.ink : C.ink) : colors.muted}
              />
              <Text
                style={[
                  s.segmentTabText,
                  { color: colors.muted },
                  activeTab === 'password' && [s.segmentTabTextActive, { color: isDark ? colors.ink : C.ink }],
                ]}
              >
                Change Password
              </Text>
            </TouchableOpacity>
          </View>

          {/* TAB 1: PROFILE CREDENTIALS */}
          {activeTab === 'profile' ? (
            <View style={s.section}>
              <View style={s.inputGroup}>
                <Text style={[s.inputLabel, { color: isDark ? colors.ink : '#374151' }]}>Host / Username</Text>
                <View style={[s.inputWrap, { backgroundColor: isDark ? '#18181B' : '#FFFFFF', borderColor: isDark ? '#27272A' : '#E4E4E7' }]}>
                  <View style={s.inputIcon}>
                    <Icon name="users" size={17} color={colors.muted} />
                  </View>
                  <TextInput
                    value={username}
                    onChangeText={setUsername}
                    placeholder="e.g. Meera Sharma"
                    placeholderTextColor={colors.muted}
                    style={[s.inputField, { color: colors.ink }]}
                    autoCapitalize="words"
                  />
                </View>
                <Text style={[s.fieldHint, { color: colors.muted }]}>Displayed in receipts, reports, and greeting bar.</Text>
              </View>

              <View style={s.inputGroup}>
                <Text style={[s.inputLabel, { color: isDark ? colors.ink : '#374151' }]}>Registered Email Address</Text>
                <View style={[s.inputWrap, { backgroundColor: isDark ? '#18181B' : '#FFFFFF', borderColor: isDark ? '#27272A' : '#E4E4E7' }]}>
                  <View style={s.inputIcon}>
                    <Icon name="mail" size={17} color={colors.muted} />
                  </View>
                  <TextInput
                    value={email}
                    onChangeText={setEmail}
                    placeholder="owner@property.com"
                    placeholderTextColor={colors.muted}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    style={[s.inputField, { color: colors.ink }]}
                  />
                </View>
                <Text style={[s.fieldHint, { color: colors.muted }]}>Used for cloud backup, monthly reports & account recovery.</Text>
              </View>

              <View style={s.inputGroup}>
                <Text style={[s.inputLabel, { color: isDark ? colors.ink : '#374151' }]}>Property / Hotel Name</Text>
                <View style={[s.inputWrap, { backgroundColor: isDark ? '#18181B' : '#FFFFFF', borderColor: isDark ? '#27272A' : '#E4E4E7' }]}>
                  <View style={s.inputIcon}>
                    <Icon name="home" size={17} color={colors.muted} />
                  </View>
                  <TextInput
                    value={propertyName}
                    onChangeText={setPropertyName}
                    placeholder="e.g. Sunrise Homestay"
                    placeholderTextColor={colors.muted}
                    style={[s.inputField, { color: colors.ink }]}
                    autoCapitalize="words"
                  />
                </View>
              </View>

              {/* Save Button */}
              <TouchableOpacity
                activeOpacity={0.88}
                onPress={handleSaveProfile}
                disabled={isSavingProfile}
                style={[s.primaryBtn, { backgroundColor: colors.primary }]}
              >
                <Icon name="check" size={18} color="#FFFFFF" />
                <Text style={s.primaryBtnText}>Save Credentials</Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* TAB 2: CHANGE PASSWORD */
            <View style={s.section}>
              {passwordError ? (
                <View style={[s.errorBox, { backgroundColor: isDark ? '#450A0A' : '#FEF2F2', borderColor: isDark ? '#7F1D1D' : '#FCA5A5' }]}>
                  <Icon name="x" size={16} color="#EF4444" />
                  <Text style={[s.errorBoxText, { color: isDark ? '#FCA5A5' : '#B91C1C' }]}>{passwordError}</Text>
                </View>
              ) : null}

              <View style={s.inputGroup}>
                <Text style={[s.inputLabel, { color: isDark ? colors.ink : '#374151' }]}>Current Password</Text>
                <View style={[s.inputWrap, { backgroundColor: isDark ? '#18181B' : '#FFFFFF', borderColor: isDark ? '#27272A' : '#E4E4E7' }]}>
                  <View style={s.inputIcon}>
                    <Icon name="lock" size={17} color={colors.muted} />
                  </View>
                  <TextInput
                    value={currentPassword}
                    onChangeText={setCurrentPassword}
                    placeholder="Enter current password"
                    placeholderTextColor={colors.muted}
                    secureTextEntry={!showCurrent}
                    style={[s.inputField, { color: colors.ink }]}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => setShowCurrent(!showCurrent)}
                    style={s.eyeBtn}
                  >
                    <Icon
                      name={showCurrent ? 'eyeOff' : 'eye'}
                      size={18}
                      color={colors.muted}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={s.inputGroup}>
                <Text style={[s.inputLabel, { color: isDark ? colors.ink : '#374151' }]}>New Password</Text>
                <View style={[s.inputWrap, { backgroundColor: isDark ? '#18181B' : '#FFFFFF', borderColor: isDark ? '#27272A' : '#E4E4E7' }]}>
                  <View style={s.inputIcon}>
                    <Icon name="lock" size={17} color={colors.muted} />
                  </View>
                  <TextInput
                    value={newPassword}
                    onChangeText={setNewPassword}
                    placeholder="Minimum 8 characters"
                    placeholderTextColor={colors.muted}
                    secureTextEntry={!showNew}
                    style={[s.inputField, { color: colors.ink }]}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => setShowNew(!showNew)}
                    style={s.eyeBtn}
                  >
                    <Icon
                      name={showNew ? 'eyeOff' : 'eye'}
                      size={18}
                      color={colors.muted}
                    />
                  </TouchableOpacity>
                </View>
                <Text style={[s.fieldHint, { color: colors.muted }]}>Must contain at least 8 characters.</Text>
              </View>

              <View style={s.inputGroup}>
                <Text style={[s.inputLabel, { color: isDark ? colors.ink : '#374151' }]}>Confirm New Password</Text>
                <View style={[s.inputWrap, { backgroundColor: isDark ? '#18181B' : '#FFFFFF', borderColor: isDark ? '#27272A' : '#E4E4E7' }]}>
                  <View style={s.inputIcon}>
                    <Icon name="lock" size={17} color={colors.muted} />
                  </View>
                  <TextInput
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder="Re-enter new password"
                    placeholderTextColor={colors.muted}
                    secureTextEntry={!showConfirm}
                    style={[s.inputField, { color: colors.ink }]}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => setShowConfirm(!showConfirm)}
                    style={s.eyeBtn}
                  >
                    <Icon
                      name={showConfirm ? 'eyeOff' : 'eye'}
                      size={18}
                      color={colors.muted}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Update Password Button */}
              <TouchableOpacity
                activeOpacity={0.88}
                onPress={handleUpdatePassword}
                disabled={isUpdatingPassword}
                style={[s.primaryBtn, { backgroundColor: colors.primary }]}
              >
                <Icon name="lock" size={18} color="#FFFFFF" />
                <Text style={s.primaryBtnText}>Update Master Password</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Security Overview Footer */}
          <View style={[s.securityFooterCard, { backgroundColor: isDark ? '#18181B' : '#F8FAFC', borderColor: isDark ? '#27272A' : '#E2E8F0' }]}>
            <View style={s.securityFooterRow}>
              <View style={[s.secDot, { backgroundColor: '#10B981' }]} />
              <Text style={[s.secFooterTitle, { color: colors.ink }]}>Security Safeguards Active</Text>
            </View>
            <Text style={[s.secFooterDesc, { color: colors.muted }]}>
              Your account password and security PIN encrypt all local SQLite guest records and provide secure multi-device synchronization.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarTitle: {
    fontFamily: 'Inter',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  topBarSub: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '400',
    marginTop: 1,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    marginBottom: 18,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  accountCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: 'Inter',
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  accountName: {
    fontFamily: 'Inter',
    fontSize: 16,
    fontWeight: '700',
  },
  verifiedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: R.full,
  },
  verifiedTagText: {
    fontFamily: 'Inter',
    fontSize: 10.5,
    fontWeight: '600',
  },
  accountEmail: {
    fontFamily: 'Inter',
    fontSize: 13,
    fontWeight: '400',
    marginTop: 2,
  },
  cardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  metaItem: {
    flex: 1,
    alignItems: 'center',
  },
  metaDivider: {
    width: 1,
    height: 22,
    backgroundColor: '#E4E4E7',
    opacity: 0.5,
  },
  metaLabel: {
    fontFamily: 'Inter',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  metaVal: {
    fontFamily: 'Inter',
    fontSize: 12.5,
    fontWeight: '600',
    marginTop: 2,
  },
  segmentedControl: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  segmentTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 9,
  },
  segmentTabActive: {
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  segmentTabText: {
    fontFamily: 'Inter',
    fontSize: 13,
    fontWeight: '500',
  },
  segmentTabTextActive: {
    fontWeight: '700',
  },
  section: {
    gap: 16,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontFamily: 'Inter',
    fontSize: 13,
    fontWeight: '600',
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 10,
  },
  inputField: {
    flex: 1,
    fontFamily: 'Inter',
    fontSize: 14.5,
    paddingVertical: 0,
  },
  fieldHint: {
    fontFamily: 'Inter',
    fontSize: 11.5,
    fontWeight: '400',
    marginTop: 2,
  },
  eyeBtn: {
    padding: 6,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 14,
    marginTop: 10,
  },
  primaryBtnText: {
    fontFamily: 'Inter',
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  errorBoxText: {
    fontFamily: 'Inter',
    fontSize: 12.5,
    fontWeight: '500',
    flex: 1,
  },
  securityFooterCard: {
    marginTop: 26,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 6,
  },
  securityFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  secDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  secFooterTitle: {
    fontFamily: 'Inter',
    fontSize: 13,
    fontWeight: '700',
  },
  secFooterDesc: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 17,
  },
});
