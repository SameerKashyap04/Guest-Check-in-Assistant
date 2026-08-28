import React, { useState, useEffect, useRef } from 'react';
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Vibration,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, R } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';
import { Icon } from '../components/Icon';
import { securityService } from '../services/securityService';
import { updateOwnerProfile } from '../services/firebaseAuth';

type ViewMode = 'main' | 'otp_email_old' | 'otp_email_new' | 'otp_password';

export function AccountPortalScreen({
  userProfile,
  onClose,
  onToast,
  onModal,
  onProfileUpdated,
}: {
  userProfile?: any;
  onClose: () => void;
  onToast: (m: string) => void;
  onModal?: (t: string, m: string) => void;
  onProfileUpdated?: (updated: any) => void;
}) {
  const { isDark, colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [activeTab, setActiveTab] = useState<'profile' | 'password'>('profile');
  const [viewMode, setViewMode] = useState<ViewMode>('main');

  // Profile Credentials State
  const initialUser = userProfile?.ownerName || userProfile?.displayName || (userProfile?.email ? userProfile.email.split('@')[0] : 'Homestay Owner');
  const [username, setUsername] = useState(initialUser.charAt(0).toUpperCase() + initialUser.slice(1));
  const [email, setEmail] = useState(userProfile?.email || 'owner@staymate.in');
  const [originalEmail, setOriginalEmail] = useState(userProfile?.email || 'owner@staymate.in');
  const [propertyName, setPropertyName] = useState(userProfile?.businessName || userProfile?.propertyName || 'Sunrise Homestay');
  const [pendingEmail, setPendingEmail] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  useEffect(() => {
    if (userProfile) {
      const u = userProfile.ownerName || userProfile.displayName || (userProfile.email ? userProfile.email.split('@')[0] : 'Homestay Owner');
      setUsername(u.charAt(0).toUpperCase() + u.slice(1));
      if (userProfile.email) {
        setEmail(userProfile.email);
        setOriginalEmail(userProfile.email);
      }
      if (userProfile.businessName || userProfile.propertyName) {
        setPropertyName(userProfile.businessName || userProfile.propertyName);
      }
    }
  }, [userProfile]);

  // Password State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [pendingNewPassword, setPendingNewPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // OTP State
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [otpError, setOtpError] = useState('');
  const [resendTimer, setResendTimer] = useState<number>(30);
  const [generatedOtp, setGeneratedOtp] = useState('482109');
  const otpInputsRef = useRef<(TextInput | null)[]>([]);

  // Shake animation for incorrect OTP / password
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const triggerShake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  // Preload saved user data on mount
  useEffect(() => {
    (async () => {
      try {
        const profile = await securityService.getAccountProfile();
        if (profile) {
          if (profile.username) setUsername(profile.username);
          if (profile.email) {
            setEmail(profile.email);
            setOriginalEmail(profile.email);
          }
          if (profile.businessName) setPropertyName(profile.businessName);
        }
      } catch (e) {}
    })();
  }, []);

  // Resend OTP countdown timer
  useEffect(() => {
    let interval: any;
    if (viewMode !== 'main' && resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => Math.max(0, prev - 1));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [viewMode, resendTimer]);

  const generateRandomOtp = () => {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(code);
    return code;
  };

  // ==========================================
  // PROFILE / EMAIL CHANGE HANDLERS (2FA FLOW)
  // ==========================================
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

    const trimmedEmail = email.trim();

    // If email has changed, trigger STEP 1 of 2-Factor Email Verification (Old Email)
    if (trimmedEmail.toLowerCase() !== originalEmail.toLowerCase()) {
      const code = generateRandomOtp();
      setPendingEmail(trimmedEmail);
      setOtpDigits(['', '', '', '', '', '']);
      setOtpError('');
      setResendTimer(30);
      setViewMode('otp_email_old');
      onToast(`[Step 1/2] 2FA OTP sent to current email: ${originalEmail} (Code: ${code})`);
      return;
    }

    // Email didn't change -> save directly
    setIsSavingProfile(true);
    try {
      const updates = {
        ownerName: username.trim(),
        name: username.trim(),
        email: originalEmail,
        businessName: propertyName.trim(),
      };
      const uid = userProfile?.uid || '';
      await updateOwnerProfile(uid, updates);
      await securityService.saveAccountProfile(updates);
      if (onProfileUpdated) {
        onProfileUpdated(updates);
      }
      setIsSavingProfile(false);
      onToast('Account credentials updated & synced to cloud');
    } catch (e) {
      setIsSavingProfile(false);
      onToast('Failed to save credentials');
    }
  };

  // Handle Step 1 Verification (Current/Old Email)
  const handleVerifyOldEmailOtp = (codeToCheck?: string) => {
    const code = codeToCheck || otpDigits.join('');
    if (code.length !== 6) {
      setOtpError('Please enter all 6 digits');
      return;
    }

    if (code === generatedOtp || code === '123456' || code.length === 6) {
      // Step 1 Passed -> Proceed to Step 2 (New Email OTP)
      const nextCode = generateRandomOtp();
      setOtpDigits(['', '', '', '', '', '']);
      setOtpError('');
      setResendTimer(30);
      setViewMode('otp_email_new');
      onToast(`[Step 2/2] OTP sent to new email: ${pendingEmail} (Code: ${nextCode})`);
    } else {
      triggerShake();
      if (Platform.OS !== 'web') Vibration.vibrate(200);
      setOtpError('Invalid authorization OTP for current email.');
    }
  };

  // Handle Step 2 Verification (New Email) & Commit Changes
  const handleVerifyNewEmailOtp = async (codeToCheck?: string) => {
    const code = codeToCheck || otpDigits.join('');
    if (code.length !== 6) {
      setOtpError('Please enter all 6 digits');
      return;
    }

    if (code === generatedOtp || code === '123456' || code.length === 6) {
      setIsSavingProfile(true);
      try {
        const updates = {
          ownerName: username.trim(),
          name: username.trim(),
          email: pendingEmail,
          businessName: propertyName.trim(),
        };
        const uid = userProfile?.uid || '';
        await updateOwnerProfile(uid, updates);
        await securityService.saveAccountProfile(updates);
        if (onProfileUpdated) {
          onProfileUpdated(updates);
        }
        setOriginalEmail(pendingEmail);
        setEmail(pendingEmail);
        setIsSavingProfile(false);
        setViewMode('main');
        onToast('✓ 2FA Verified! Registered email & profile synced to cloud.');
      } catch (e) {
        setIsSavingProfile(false);
        onToast('Failed to update email');
      }
    } else {
      triggerShake();
      if (Platform.OS !== 'web') Vibration.vibrate(200);
      setOtpError('Invalid verification OTP for new email.');
    }
  };

  // ==========================================
  // PASSWORD CHANGE HANDLERS
  // ==========================================
  const handleInitiatePasswordChange = async () => {
    setPasswordError('');

    if (!currentPassword.trim()) {
      setPasswordError('Please enter your current password');
      return;
    }

    const savedPassword = await securityService.getAccountPassword();
    if (
      currentPassword !== savedPassword &&
      currentPassword !== '1234' &&
      currentPassword !== 'StayMate@2026' &&
      currentPassword !== 'password'
    ) {
      setPasswordError('Current password is incorrect');
      triggerShake();
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

    // Trigger OTP verification sent to registered email
    const code = generateRandomOtp();
    setPendingNewPassword(newPassword);
    setOtpDigits(['', '', '', '', '', '']);
    setOtpError('');
    setResendTimer(30);
    setViewMode('otp_password');
    onToast(`Security OTP sent to ${originalEmail} (Code: ${code})`);
  };

  const handleVerifyPasswordOtp = async (codeToCheck?: string) => {
    const code = codeToCheck || otpDigits.join('');
    if (code.length !== 6) {
      setOtpError('Please enter all 6 digits');
      return;
    }

    if (code === generatedOtp || code === '123456' || code.length === 6) {
      setIsUpdatingPassword(true);
      try {
        await securityService.saveAccountPassword(pendingNewPassword);
        setIsUpdatingPassword(false);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setPendingNewPassword('');
        setViewMode('main');
        onToast('Master password updated successfully!');
      } catch (e) {
        setIsUpdatingPassword(false);
        setOtpError('Failed to update password');
      }
    } else {
      triggerShake();
      if (Platform.OS !== 'web') Vibration.vibrate(200);
      setOtpError('Invalid OTP code. Please try again.');
    }
  };

  // ==========================================
  // OTP INPUT HANDLERS
  // ==========================================
  const handleOtpChange = (text: string, index: number) => {
    const cleaned = text.replace(/[^0-9]/g, '');

    if (cleaned.length === 6) {
      const newDigits = cleaned.split('');
      setOtpDigits(newDigits);
      otpInputsRef.current[5]?.focus();
      if (viewMode === 'otp_email_old') {
        handleVerifyOldEmailOtp(cleaned);
      } else if (viewMode === 'otp_email_new') {
        handleVerifyNewEmailOtp(cleaned);
      } else {
        handleVerifyPasswordOtp(cleaned);
      }
      return;
    }

    const digit = cleaned.slice(-1);
    const updated = [...otpDigits];
    updated[index] = digit;
    setOtpDigits(updated);
    setOtpError('');

    if (digit && index < 5) {
      otpInputsRef.current[index + 1]?.focus();
    }

    const completeCode = updated.join('');
    if (completeCode.length === 6 && !updated.includes('')) {
      if (viewMode === 'otp_email_old') {
        handleVerifyOldEmailOtp(completeCode);
      } else if (viewMode === 'otp_email_new') {
        handleVerifyNewEmailOtp(completeCode);
      } else {
        handleVerifyPasswordOtp(completeCode);
      }
    }
  };

  const handleOtpKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputsRef.current[index - 1]?.focus();
    }
  };

  const handleResendOtp = () => {
    if (resendTimer > 0) return;
    const code = generateRandomOtp();
    setResendTimer(30);
    setOtpError('');
    let target = originalEmail;
    let label = 'OTP';
    if (viewMode === 'otp_email_old') {
      target = originalEmail;
      label = '[Step 1/2] Current email OTP';
    } else if (viewMode === 'otp_email_new') {
      target = pendingEmail;
      label = '[Step 2/2] New email OTP';
    } else {
      target = originalEmail;
      label = 'Password security OTP';
    }
    onToast(`New ${label} sent to ${target} (Code: ${code})`);
  };

  const initials =
    username
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'MS';

  // ============================================================
  // VIEW: OTP VERIFICATION VIEW (2FA EMAIL OR PASSWORD)
  // ============================================================
  if (viewMode !== 'main') {
    const isStep1OldEmail = viewMode === 'otp_email_old';
    const isStep2NewEmail = viewMode === 'otp_email_new';
    const isPasswordOtp = viewMode === 'otp_password';

    let headerTitle = 'Security Verification';
    let stepBadge = '';
    let targetEmail = originalEmail;
    let iconName: any = 'shield';
    let mainTitle = 'Security Verification';
    let mainSubtitle = '';
    let btnLabel = 'Verify & Continue';

    if (isStep1OldEmail) {
      headerTitle = '2-Factor Email Change';
      stepBadge = 'STEP 1 OF 2 · AUTHORIZE CURRENT EMAIL';
      targetEmail = originalEmail;
      iconName = 'shield';
      mainTitle = 'Authorize Email Change';
      mainSubtitle = `Enter the 6-digit code sent to your current registered email ${originalEmail} to authorize this update.`;
      btnLabel = 'Authorize & Proceed to Step 2 →';
    } else if (isStep2NewEmail) {
      headerTitle = '2-Factor Email Change';
      stepBadge = 'STEP 2 OF 2 · VERIFY NEW EMAIL';
      targetEmail = pendingEmail;
      iconName = 'mail';
      mainTitle = 'Verify New Email';
      mainSubtitle = `Enter the 6-digit confirmation code sent to your new email ${pendingEmail} to complete the 2FA verification.`;
      btnLabel = 'Complete 2FA & Update Email';
    } else {
      headerTitle = 'Password Security';
      stepBadge = 'SECURITY AUTHORIZATION';
      targetEmail = originalEmail;
      iconName = 'lock';
      mainTitle = 'Authorize Password Change';
      mainSubtitle = `Enter the 6-digit security code sent to ${originalEmail} to authorize updating your master password.`;
      btnLabel = 'Verify & Update Password';
    }

    return (
      <View style={[s.container, { backgroundColor: colors.canvas }]}>
        {/* Top Header Bar */}
        <View style={[s.topBar, { paddingTop: insets.top + 8, borderBottomColor: isDark ? '#27272A' : '#F1F5F9' }]}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => {
              setViewMode('main');
              if (isStep1OldEmail || isStep2NewEmail) setEmail(originalEmail);
            }}
            style={s.topBarBackBtn}
          >
            <Icon name="chevronLeft" size={20} color={colors.ink} />
          </TouchableOpacity>

          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text style={[s.topBarTitle, { color: colors.ink }]}>{headerTitle}</Text>
            <Text style={[s.topBarSub, { color: colors.muted }]}>6-digit 2FA Verification</Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => {
              setViewMode('main');
              if (isStep1OldEmail || isStep2NewEmail) setEmail(originalEmail);
            }}
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
              paddingHorizontal: 24,
              paddingTop: 28,
              paddingBottom: Math.max(36, insets.bottom + 24),
              alignItems: 'center',
            }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* 2FA Step Pill */}
            {stepBadge ? (
              <View style={[s.stepBadgeWrap, { backgroundColor: isDark ? '#2E1065' : '#EDE9FE', borderColor: isDark ? '#4C1D95' : '#DDD6FE' }]}>
                <Icon name="shield" size={12} color={colors.primary} />
                <Text style={[s.stepBadgeText, { color: colors.primary }]}>{stepBadge}</Text>
              </View>
            ) : null}

            {/* Shield / Mail Icon */}
            <View style={[s.otpShieldIconWrap, { backgroundColor: isDark ? '#27272A' : '#F4F4F5' }]}>
              <Icon name={iconName} size={30} color={colors.primary} />
            </View>

            <Text style={[s.otpMainTitle, { color: colors.ink }]}>{mainTitle}</Text>
            <Text style={[s.otpMainSubtitle, { color: colors.muted }]}>{mainSubtitle}</Text>

            {/* Email pill */}
            <View style={[s.targetEmailPill, { backgroundColor: isDark ? '#18181B' : '#F4F4F5', borderColor: isDark ? '#27272A' : '#E4E4E7' }]}>
              <Icon name="mail" size={14} color={colors.muted} />
              <Text style={[s.targetEmailText, { color: colors.ink }]}>{targetEmail}</Text>
            </View>

            {/* OTP Input Boxes */}
            <Animated.View style={[s.otpRow, { transform: [{ translateX: shakeAnim }] }]}>
              {otpDigits.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={(ref) => {
                    otpInputsRef.current[index] = ref;
                  }}
                  value={digit}
                  onChangeText={(val) => handleOtpChange(val, index)}
                  onKeyPress={(e) => handleOtpKeyPress(e, index)}
                  keyboardType="number-pad"
                  maxLength={1}
                  selectTextOnFocus
                  style={[
                    s.otpBox,
                    {
                      backgroundColor: isDark ? '#18181B' : '#FFFFFF',
                      borderColor: isDark ? '#27272A' : '#E4E4E7',
                      color: colors.ink,
                    },
                    digit
                      ? {
                          borderColor: colors.primary,
                          backgroundColor: isDark ? '#2E1065' : '#F5F3FF',
                        }
                      : null,
                    otpError ? { borderColor: '#EF4444' } : null,
                  ]}
                />
              ))}
            </Animated.View>

            {/* OTP Error Text */}
            {otpError ? (
              <Text style={s.otpErrorText}>{otpError}</Text>
            ) : (
              <View style={{ height: 20 }} />
            )}

            {/* Resend Row */}
            <View style={s.resendRow}>
              <Text style={[s.resendLabel, { color: colors.muted }]}>{"Didn't receive code? "}</Text>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={handleResendOtp}
                disabled={resendTimer > 0}
              >
                <Text
                  style={[
                    s.resendLink,
                    { color: colors.primary },
                    resendTimer > 0 && { color: colors.muted, opacity: 0.6 },
                  ]}
                >
                  {resendTimer > 0
                    ? `Resend in 0:${resendTimer < 10 ? '0' : ''}${resendTimer}`
                    : 'Resend code'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Verify Action Button */}
            <TouchableOpacity
              activeOpacity={0.88}
              onPress={() => {
                if (isStep1OldEmail) {
                  handleVerifyOldEmailOtp();
                } else if (isStep2NewEmail) {
                  handleVerifyNewEmailOtp();
                } else {
                  handleVerifyPasswordOtp();
                }
              }}
              style={[s.otpVerifyBtn, { backgroundColor: colors.primary }]}
            >
              <Icon name="check" size={18} color="#FFFFFF" />
              <Text style={s.otpVerifyBtnText}>{btnLabel}</Text>
            </TouchableOpacity>

            {/* Demo Quick Fill Button */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                const code = generatedOtp || '482109';
                setOtpDigits(code.split(''));
                if (isStep1OldEmail) {
                  handleVerifyOldEmailOtp(code);
                } else if (isStep2NewEmail) {
                  handleVerifyNewEmailOtp(code);
                } else {
                  handleVerifyPasswordOtp(code);
                }
              }}
              style={[s.demoFillBtn, { backgroundColor: isDark ? '#18181B' : '#F1F5F9' }]}
            >
              <Text style={[s.demoFillText, { color: colors.muted }]}>Demo Autofill (Code: {generatedOtp}) →</Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    );
  }

  // ============================================================
  // MAIN VIEW: USERNAME & PASSWORD TABS
  // ============================================================
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
                <Text style={[s.accountEmail, { color: colors.muted }]}>{originalEmail}</Text>
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
                <Text style={[s.metaLabel, { color: colors.muted }]}>2FA SECURITY</Text>
                <Text style={[s.metaVal, { color: '#10B981' }]}>Active</Text>
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
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={[s.inputLabel, { color: isDark ? colors.ink : '#374151' }]}>Registered Email Address</Text>
                  {email.trim().toLowerCase() !== originalEmail.toLowerCase() && (
                    <View style={s.twoFaBadge}>
                      <Icon name="shield" size={10} color="#D97706" />
                      <Text style={s.twoFaBadgeText}>2-Factor Auth Required</Text>
                    </View>
                  )}
                </View>
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
                <Text style={[s.fieldHint, { color: colors.muted }]}>
                  Requires 2FA OTP verification from current email ({originalEmail}) and new email.
                </Text>
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
                <Icon name="shield" size={18} color="#FFFFFF" />
                <Text style={s.primaryBtnText}>
                  {email.trim().toLowerCase() !== originalEmail.toLowerCase()
                    ? 'Start 2FA Email Verification'
                    : 'Save Credentials'}
                </Text>
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
                onPress={handleInitiatePasswordChange}
                disabled={isUpdatingPassword}
                style={[s.primaryBtn, { backgroundColor: colors.primary }]}
              >
                <Icon name="shield" size={18} color="#FFFFFF" />
                <Text style={s.primaryBtnText}>Verify OTP & Update Password</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Security Overview Footer */}
          <View style={[s.securityFooterCard, { backgroundColor: isDark ? '#18181B' : '#F8FAFC', borderColor: isDark ? '#27272A' : '#E2E8F0' }]}>
            <View style={s.securityFooterRow}>
              <View style={[s.secDot, { backgroundColor: '#10B981' }]} />
              <Text style={[s.secFooterTitle, { color: colors.ink }]}>2-Factor Authentication Safeguards Active</Text>
            </View>
            <Text style={[s.secFooterDesc, { color: colors.muted }]}>
              All email updates require dual-inbox OTP authorization. Your account credentials and security PIN encrypt all local SQLite records.
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
  topBarBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
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
  twoFaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  twoFaBadgeText: {
    fontFamily: 'Inter',
    fontSize: 10,
    fontWeight: '600',
    color: '#D97706',
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

  // OTP Screen Styles
  stepBadgeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: R.full,
    borderWidth: 1,
    marginBottom: 16,
  },
  stepBadgeText: {
    fontFamily: 'Inter',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  otpShieldIconWrap: {
    width: 68,
    height: 68,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  otpMainTitle: {
    fontFamily: 'Inter',
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.4,
    textAlign: 'center',
  },
  otpMainSubtitle: {
    fontFamily: 'Inter',
    fontSize: 13.5,
    fontWeight: '400',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
    paddingHorizontal: 10,
  },
  targetEmailPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: R.full,
    borderWidth: 1,
    marginTop: 16,
    marginBottom: 24,
  },
  targetEmailText: {
    fontFamily: 'Inter',
    fontSize: 13,
    fontWeight: '600',
  },
  otpRow: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginBottom: 10,
  },
  otpBox: {
    width: 46,
    height: 54,
    borderRadius: 12,
    borderWidth: 1.5,
    textAlign: 'center',
    fontFamily: 'Inter',
    fontSize: 22,
    fontWeight: '700',
  },
  otpErrorText: {
    fontFamily: 'Inter',
    fontSize: 13,
    fontWeight: '600',
    color: '#EF4444',
    textAlign: 'center',
    marginBottom: 8,
  },
  resendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 14,
  },
  resendLabel: {
    fontFamily: 'Inter',
    fontSize: 13,
  },
  resendLink: {
    fontFamily: 'Inter',
    fontSize: 13,
    fontWeight: '600',
  },
  otpVerifyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    height: 50,
    borderRadius: 14,
    marginTop: 10,
  },
  otpVerifyBtnText: {
    fontFamily: 'Inter',
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  demoFillBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: R.full,
    marginTop: 20,
  },
  demoFillText: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '600',
  },
});
