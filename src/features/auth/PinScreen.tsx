import React, { useState, useEffect } from 'react';
import { View, Text, Vibration } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as LocalAuthentication from 'expo-local-authentication';
import { PinPad } from '@/components/PinPad';
import { useAuthStore } from '@/store/useAuthStore';
import { ShieldAlert, ShieldCheck } from 'lucide-react-native';
import { useRouter } from 'expo-router';

interface PinScreenProps {
  onSuccess?: () => void;
}

export function PinScreen({ onSuccess }: PinScreenProps = {}) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isBiometricSupported, setIsBiometricSupported] = useState(false);
  const { hasPin, setupPin, verifyPin } = useAuthStore();
  const [confirmPin, setConfirmPin] = useState('');
  const [step, setStep] = useState<'enter' | 'setup' | 'confirm'>(hasPin ? 'enter' : 'setup');
  const router = useRouter();

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
    } else {
      router.replace('/(tabs)');
    }
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
          {step === 'enter' ? 'Enter PIN' : step === 'setup' ? 'Set up a 4-digit PIN' : 'Confirm your PIN'}
        </Text>
        <Text className="text-sm text-gray-500 text-center px-4">
          {step === 'enter'
            ? 'Enter your PIN to access the Guest Check-in Assistant.'
            : 'This PIN will be used to protect guest data.'}
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
        <View className="h-6 mb-6" /> // Placeholder to prevent layout shift
      )}

      <PinPad
        onKeyPress={handleKeyPress}
        onDelete={handleDelete}
        onBiometric={handleBiometric}
        showBiometric={isBiometricSupported && step === 'enter'}
      />
    </SafeAreaView>
  );
}
