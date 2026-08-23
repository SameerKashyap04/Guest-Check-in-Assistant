import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Vibration,
  Animated,
  Platform,
} from 'react-native';
import { C, R } from '../theme/tokens';
import { Icon } from '../components/Icon';
import { securityService } from '../services/securityService';

export function PinScreen({
  onUnlock,
  mode = 'enter',
  onPinSet,
}: {
  onUnlock: () => void;
  mode?: 'setup' | 'enter';
  onPinSet?: (pin: string) => void;
}) {
  const [currentStep, setCurrentStep] = useState<'setup' | 'confirm' | 'enter'>(mode);
  const [pin, setPin] = useState('');
  const [setupPinFirst, setSetupPinFirst] = useState('');
  const [error, setError] = useState('');
  const [lockoutSeconds, setLockoutSeconds] = useState(0);

  // Shake animation for incorrect PIN
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

  useEffect(() => {
    if (mode === 'setup') {
      setCurrentStep('setup');
    }
  }, [mode]);

  useEffect(() => {
    let isMounted = true;
    if (currentStep === 'enter') {
      (async () => {
        await securityService.init();
        const bioAvailable = await securityService.isBiometricAvailable();
        if (bioAvailable && securityService.getSettings().isBiometricEnabled) {
          setTimeout(async () => {
            const ok = await securityService.authenticateBiometric();
            if (ok && isMounted) {
              onUnlock();
            }
          }, 300);
        }
      })();
    }

    return () => {
      isMounted = false;
    };
  }, [currentStep]);

  // Lockout countdown timer
  useEffect(() => {
    if (lockoutSeconds <= 0) return;
    const timer = setInterval(() => {
      setLockoutSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setError('');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [lockoutSeconds]);

  const handleBiometricPress = async () => {
    if (currentStep !== 'enter' || lockoutSeconds > 0) return;
    const ok = await securityService.authenticateBiometric();
    if (ok) {
      onUnlock();
    }
  };

  const press = async (n: string) => {
    if (lockoutSeconds > 0 || pin.length >= 4) return;
    const next = pin + n;
    setPin(next);
    setError('');

    if (next.length === 4) {
      if (currentStep === 'setup') {
        setSetupPinFirst(next);
        setPin('');
        setCurrentStep('confirm');
      } else if (currentStep === 'confirm') {
        if (next === setupPinFirst) {
          await securityService.changePin(next);
          if (onPinSet) onPinSet(next);
          onUnlock();
        } else {
          triggerShake();
          if (Platform.OS !== 'web') Vibration.vibrate(200);
          setError('PINs do not match. Please re-enter.');
          setPin('');
          setSetupPinFirst('');
          setCurrentStep('setup');
        }
      } else {
        const result = await securityService.verifyPin(next);
        if (result.success) {
          setTimeout(onUnlock, 150);
        } else {
          triggerShake();
          if (Platform.OS !== 'web') {
            Vibration.vibrate(200);
          }
          setTimeout(() => setPin(''), 150);
          if (result.lockoutSeconds) {
            setLockoutSeconds(result.lockoutSeconds);
            setError(`Locked for ${result.lockoutSeconds}s`);
          } else {
            setError(`Incorrect PIN (${result.remainingAttempts ?? 0} left)`);
          }
        }
      }
    }
  };

  const handleDelete = () => {
    if (lockoutSeconds > 0) return;
    setPin((prev) => prev.slice(0, -1));
    setError('');
  };

  const handleQuickUnlock = async () => {
    if (currentStep === 'enter') {
      await securityService.resetToDefaultPin();
      onUnlock();
    } else {
      await securityService.changePin('1234');
      if (onPinSet) onPinSet('1234');
      onUnlock();
    }
  };

  const isSetupFlow = currentStep === 'setup' || currentStep === 'confirm';

  return (
    <View style={s.wrap}>
      {/* Stage Badge for Setup */}
      {isSetupFlow && (
        <View style={s.stepBadge}>
          <Text style={s.stepBadgeText}>STEP 2 OF 2 · SET APP PASSWORD</Text>
        </View>
      )}

      <View style={s.lock}>
        <Icon name="lock" size={28} color="#fff" />
      </View>

      <Text style={s.title}>
        {currentStep === 'enter'
          ? 'Welcome back'
          : currentStep === 'setup'
          ? 'Set Security Password'
          : 'Confirm Security Password'}
      </Text>
      <Text style={s.sub}>
        {error
          ? error
          : lockoutSeconds > 0
          ? `Try again in ${lockoutSeconds}s`
          : currentStep === 'enter'
          ? 'Enter your 4-digit PIN to unlock StayMate'
          : currentStep === 'setup'
          ? 'Choose a 4-digit PIN for instant access to your homestay dashboard'
          : 'Re-enter your 4-digit PIN to confirm'}
      </Text>

      <Animated.View style={[s.dots, { transform: [{ translateX: shakeAnim }] }]}>
        {[0, 1, 2, 3].map((i) => (
          <View
            key={i}
            style={[
              s.dot,
              i < pin.length && s.filled,
              error ? s.dotError : null,
            ]}
          />
        ))}
      </Animated.View>

      <View style={s.keys}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
          <TouchableOpacity
            key={n}
            activeOpacity={0.7}
            disabled={lockoutSeconds > 0}
            onPress={() => press(String(n))}
            style={s.key}
          >
            <Text style={s.keyText}>{n}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          activeOpacity={0.7}
          disabled={lockoutSeconds > 0 || isSetupFlow}
          onPress={handleBiometricPress}
          style={[s.key, isSetupFlow && { opacity: 0.3 }]}
        >
          <Icon name="fingerprint" size={22} color={C.primary} />
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={0.7}
          disabled={lockoutSeconds > 0}
          onPress={() => press('0')}
          style={s.key}
        >
          <Text style={s.keyText}>0</Text>
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={0.7}
          disabled={lockoutSeconds > 0}
          onPress={handleDelete}
          style={s.key}
        >
          <Icon name="chevronLeft" size={20} color={C.ink} />
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        activeOpacity={0.8}
        onPress={handleQuickUnlock}
        style={s.quickUnlock}
      >
        <Text style={s.quickUnlockText}>
          {isSetupFlow ? 'Skip & Use Default PIN (1234) →' : 'Quick Unlock (Demo) →'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
    backgroundColor: '#fff',
    minHeight: '100%',
  },
  stepBadge: {
    backgroundColor: '#EDE9FE',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: R.full,
    marginBottom: 16,
  },
  stepBadgeText: {
    fontFamily: 'Inter',
    color: C.primary,
    fontSize: 11.5,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  lock: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontFamily: 'Inter',
    fontSize: 22,
    fontWeight: '600',
    letterSpacing: -0.4,
    color: '#222222',
  },
  sub: {
    fontFamily: 'Inter',
    fontSize: 13.5,
    fontWeight: '400',
    color: '#6a6a6a',
    textAlign: 'center',
    marginTop: 6,
    paddingHorizontal: 10,
    lineHeight: 19,
  },
  dots: {
    flexDirection: 'row',
    gap: 14,
    marginVertical: 26,
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
  dotError: {
    borderColor: '#EF4444',
    backgroundColor: '#EF4444',
  },
  keys: {
    width: 240,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    justifyContent: 'center',
  },
  key: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: '#F8F7FB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyText: {
    fontFamily: 'Inter',
    fontSize: 22,
    fontWeight: '500',
    color: '#222222',
  },
  quickUnlock: {
    marginTop: 22,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: R.full,
    backgroundColor: '#EDE9FE',
  },
  quickUnlockText: {
    fontFamily: 'Inter',
    fontSize: 13,
    fontWeight: '700',
    color: C.primary,
  },
});
