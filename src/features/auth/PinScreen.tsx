import React, { useState, useEffect } from 'react';
import { View, Text, Vibration, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as LocalAuthentication from 'expo-local-authentication';
import { PinPad } from '@/components/PinPad';
import { useAuthStore } from '@/store/useAuthStore';
import { ShieldAlert, ShieldCheck, LogOut } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

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
          }
        }
      ]
    );
  };

  const handleBiometric = async () => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to unlock',
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
    <SafeAreaView className="flex-1 bg-background justify-center items-center px-6">
      <View className="bg-primary/5 dark:bg-primary/10 rounded-3xl p-8 mb-8 items-center">
        {step === 'enter' ? (
          <ShieldCheck size={64} color="#38BDF8" className="mb-6" />
        ) : (
          <ShieldAlert size={64} color="#38BDF8" className="mb-6" />
        )}
        <Text className="text-2xl font-bold text-foreground mb-2 text-center">
          {step === 'enter' ? t('enterPin') : step === 'setup' ? t('setupPin') : t('confirmPin')}
        </Text>
        <Text className="text-sm text-gray-500 text-center px-4">
          {step === 'enter'
            ? t('enterPinDesc')
            : t('setupPinDesc')}
        </Text>
      </View>

      <View className="flex-row gap-4 mb-12">
        {[0, 1, 2, 3].map((i) => (
          <View
            key={i}
            className={`w-4 h-4 rounded-full ${
              pin.length > i ? 'bg-primary' : 'bg-gray-200/50 dark:bg-gray-700/40'
            }`}
          />
        ))}
      </View>

      {error ? (
        <Text className="text-red-500 mb-6 font-medium">{error}</Text>
      ) : (
        <View className="h-6 mb-6" />
      )}

      <PinPad
        onKeyPress={handleKeyPress}
        onDelete={handleDelete}
        onBiometric={handleBiometric}
        showBiometric={isBiometricSupported && step === 'enter'}
      />

      <TouchableOpacity
        onPress={handleLogout}
        activeOpacity={0.7}
        className="mt-6 py-2 px-4 rounded-full bg-gray-100 dark:bg-gray-800 flex-row items-center gap-1.5"
      >
        <LogOut size={14} color="#EF4444" />
        <Text className="text-xs font-bold text-red-500">{t('logoutSwitchAccount')}</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}
