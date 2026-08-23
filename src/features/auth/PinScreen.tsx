import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Vibration,
  TouchableOpacity,
  Alert,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as LocalAuthentication from 'expo-local-authentication';
import { useAuthStore } from '@/store/useAuthStore';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { C, R } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeContext';
import { Icon } from '@/components/v3/Icon';

interface PinScreenProps {
  onSuccess?: () => void;
  initialMode?: 'setup' | 'enter';
}

export function PinScreen({ onSuccess, initialMode }: PinScreenProps = {}) {
  const { isDark, colors } = useTheme();
  const { t } = useTranslation();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isBiometricSupported, setIsBiometricSupported] = useState(false);
  const { hasPin, setupPin, verifyPin, logout } = useAuthStore();
  const [confirmPin, setConfirmPin] = useState('');
  const [step, setStep] = useState<'enter' | 'setup' | 'confirm'>(
    initialMode ? initialMode : hasPin ? 'enter' : 'setup'
  );

  let router: any = null;
  try {
    router = useRouter();
  } catch (e) {
    router = null;
  }

  useEffect(() => {
    (async () => {
      try {
        const compatible = await LocalAuthentication.hasHardwareAsync();
        const enrolled = await LocalAuthentication.isEnrolledAsync();
        setIsBiometricSupported(compatible && enrolled);
      } catch (e) {
        setIsBiometricSupported(false);
      }
    })();
  }, []);

  const handleSuccessUnlock = () => {
    useAuthStore.setState({ isUnlocked: true });
    if (onSuccess) {
      onSuccess();
    } else if (router) {
      try {
        router.replace('/(tabs)');
      } catch (e) {}
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Log Out Account?',
      'Are you sure you want to log out from this device?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: () => {
            logout();
            if (onSuccess) {
              onSuccess();
            } else if (router) {
              try {
                router.replace('/auth');
              } catch (e) {}
            }
          },
        },
      ]
    );
  };

  const handleBiometric = async () => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to unlock StayMate',
        fallbackLabel: 'Use PIN',
      });
      if (result.success) {
        handleSuccessUnlock();
      }
    } catch (e) {
      console.warn('Biometric auth error', e);
    }
  };

  const handleKeyPress = async (key: string) => {
    if (pin.length >= 4) return;
    const newPin = pin + key;
    setPin(newPin);
    setError('');

    if (newPin.length === 4) {
      if (step === 'enter') {
        const isValid = await verifyPin(newPin);
        if (isValid) {
          handleSuccessUnlock();
        } else {
          Vibration.vibrate();
          setError('Incorrect PIN');
          setPin('');
        }
      } else if (step === 'setup') {
        setConfirmPin(newPin);
        setPin('');
        setStep('confirm');
      } else if (step === 'confirm') {
        if (newPin === confirmPin) {
          await setupPin(newPin);
          handleSuccessUnlock();
        } else {
          Vibration.vibrate();
          setError('PINs do not match. Try again.');
          setPin('');
          setConfirmPin('');
          setStep('setup');
        }
      }
    }
  };

  const handleDelete = () => {
    setPin(pin.slice(0, -1));
    setError('');
  };

  return (
    <SafeAreaView style={[s.wrap, isDark && { backgroundColor: colors.canvas }]}>
      {/* Icon */}
      <View style={s.lock}>
        <Icon name="lock" size={28} color="#fff" />
      </View>

      {/* Headline & Subtitle */}
      <Text style={[s.title, isDark && { color: colors.ink }]}>
        {step === 'enter'
          ? 'Welcome back'
          : step === 'setup'
          ? 'Set your PIN'
          : 'Confirm your PIN'}
      </Text>
      <Text style={[s.sub, isDark && { color: colors.muted }]}>
        {step === 'enter'
          ? 'Enter your 4-digit PIN to unlock StayMate'
          : step === 'setup'
          ? 'Choose a 4-digit PIN to secure the app'
          : 'Re-enter your 4-digit PIN'}
      </Text>

      {/* 4 PIN Dots */}
      <View style={s.dots}>
        {[0, 1, 2, 3].map((i) => (
          <View
            key={i}
            style={[
              s.dot,
              isDark && { borderColor: '#3F3F46' },
              pin.length > i && (isDark ? { backgroundColor: colors.primary, borderColor: colors.primary } : s.filled),
            ]}
          />
        ))}
      </View>

      {/* Error text if any */}
      {error ? (
        <Text style={s.errorText}>{error}</Text>
      ) : (
        <View style={{ height: 20, marginBottom: 8 }} />
      )}

      {/* Keypad */}
      <View style={s.keys}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
          <TouchableOpacity
            key={n}
            activeOpacity={0.7}
            onPress={() => handleKeyPress(String(n))}
            style={[s.key, isDark && { backgroundColor: '#18181B', borderWidth: 1, borderColor: '#27272A' }]}
          >
            <Text style={[s.keyText, isDark && { color: colors.ink }]}>{n}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={handleBiometric}
          style={[s.key, isDark && { backgroundColor: '#18181B', borderWidth: 1, borderColor: '#27272A' }]}
        >
          <Icon name="fingerprint" size={24} color={colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => handleKeyPress('0')}
          style={[s.key, isDark && { backgroundColor: '#18181B', borderWidth: 1, borderColor: '#27272A' }]}
        >
          <Text style={[s.keyText, isDark && { color: colors.ink }]}>0</Text>
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={handleDelete}
          style={[s.key, isDark && { backgroundColor: '#18181B', borderWidth: 1, borderColor: '#27272A' }]}
        >
          <Icon name="chevronLeft" size={20} color={colors.ink} />
        </TouchableOpacity>
      </View>

      {/* Logout Link */}
      <TouchableOpacity
        onPress={handleLogout}
        activeOpacity={0.7}
        style={[s.logoutBtn, isDark && { backgroundColor: '#18181B', borderWidth: 1, borderColor: '#27272A' }]}
      >
        <Icon name="logout" size={14} color={colors.muted} />
        <Text style={[s.logoutText, isDark && { color: colors.muted }]}>{t('logoutSwitchAccount') || 'Log out'}</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: '#fff',
    minHeight: '100%',
  },
  lock: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22,
  },
  title: {
    fontFamily: 'Inter',
    fontSize: 22,
    fontWeight: '600',
    letterSpacing: -0.4,
    color: '#222222',
    textAlign: 'center',
  },
  sub: {
    fontFamily: 'Inter',
    fontSize: 13.5,
    fontWeight: '400',
    color: '#6a6a6a',
    textAlign: 'center',
    marginTop: 6,
    paddingHorizontal: 16,
  },
  dots: {
    flexDirection: 'row',
    gap: 14,
    marginTop: 26,
    marginBottom: 10,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: '#222222',
  },
  filled: {
    backgroundColor: '#222222',
  },
  errorText: {
    fontFamily: 'Inter',
    fontSize: 13,
    fontWeight: '600',
    color: C.rose,
    marginBottom: 8,
    textAlign: 'center',
  },
  keys: {
    width: 250,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    justifyContent: 'center',
  },
  key: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#F8F7FB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyText: {
    fontFamily: 'Inter',
    fontSize: 24,
    fontWeight: '600',
    color: '#222222',
  },
  logoutBtn: {
    marginTop: 26,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: R.full,
    backgroundColor: '#F8F7FB',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  logoutText: {
    fontFamily: 'Inter',
    fontSize: 12.5,
    fontWeight: '600',
    color: C.muted,
  },
});
