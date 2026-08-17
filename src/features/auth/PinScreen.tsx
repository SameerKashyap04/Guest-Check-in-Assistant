import React, { useState, useEffect } from 'react';
import { View, Text, Vibration, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as LocalAuthentication from 'expo-local-authentication';
import { PinPad } from '@/components/PinPad';
import { useAuthStore } from '@/store/useAuthStore';
import { Lock, LogOut } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { AIRBNB } from '@/theme/airbnb';

// ─── Airbnb PinScreen for StayMate ───────────────────────────────────────────
// Direct port of renderPin() from staymate-airbnb-redesign/app.html
// ─────────────────────────────────────────────────────────────────────────────

interface PinScreenProps {
  onSuccess?: () => void;
}

export function PinScreen({ onSuccess }: PinScreenProps = {}) {
  const { t } = useTranslation();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isBiometricSupported, setIsBiometricSupported] = useState(false);
  const { hasPin, setupPin, verifyPin, logout } = useAuthStore();
  const [confirmPin, setConfirmPin] = useState('');
  const [step, setStep] = useState<'enter' | 'setup' | 'confirm'>(hasPin ? 'enter' : 'setup');

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
    <SafeAreaView style={styles.screen}>
      {/* Icon Well */}
      <View style={styles.iconWell}>
        <Lock size={28} color="#ffffff" />
      </View>

      {/* Headline & Subtitle */}
      <Text style={styles.title}>
        {step === 'enter' ? 'Welcome back' : step === 'setup' ? 'Set your PIN' : 'Confirm your PIN'}
      </Text>
      <Text style={styles.subtitle}>
        {step === 'enter'
          ? 'Enter your 4-digit PIN to unlock StayMate'
          : step === 'setup'
          ? 'Choose a 4-digit PIN to secure the app'
          : 'Re-enter your 4-digit PIN'}
      </Text>

      {/* 4 PIN Dots */}
      <View style={styles.dotsRow}>
        {[0, 1, 2, 3].map(i => (
          <View
            key={i}
            style={[
              styles.pinDot,
              pin.length > i && styles.pinDotFilled,
            ]}
          />
        ))}
      </View>

      {/* Error Message */}
      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : (
        <View style={{ height: 24, marginBottom: 14 }} />
      )}

      {/* Keypad */}
      <PinPad
        onKeyPress={handleKeyPress}
        onDelete={handleDelete}
        onBiometric={handleBiometric}
        showBiometric={isBiometricSupported && step === 'enter'}
      />

      {/* Logout Link */}
      <TouchableOpacity
        onPress={handleLogout}
        activeOpacity={0.7}
        style={styles.logoutBtn}
      >
        <LogOut size={14} color={AIRBNB.colors.muted} />
        <Text style={styles.logoutText}>{t('logoutSwitchAccount')}</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: AIRBNB.colors.canvas,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  iconWell: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: AIRBNB.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22,
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    color: AIRBNB.colors.ink,
    textAlign: 'center',
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 13.5,
    color: AIRBNB.colors.muted,
    textAlign: 'center',
    marginTop: 6,
    paddingHorizontal: 16,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 14,
    marginTop: 28,
    marginBottom: 14,
  },
  pinDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: AIRBNB.colors.ink,
    backgroundColor: 'transparent',
  },
  pinDotFilled: {
    backgroundColor: AIRBNB.colors.ink,
  },
  errorText: {
    fontSize: 13,
    fontWeight: '500',
    color: AIRBNB.colors.rose,
    marginBottom: 14,
    textAlign: 'center',
  },
  logoutBtn: {
    marginTop: 24,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: AIRBNB.radius.full,
    backgroundColor: AIRBNB.colors.surfaceSoft,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  logoutText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: AIRBNB.colors.muted,
  },
});
