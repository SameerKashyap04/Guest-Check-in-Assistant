import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Vibration,
  Alert,
  Animated,
  Platform,
  Modal,
  TextInput,
} from 'react-native';
import { C, R } from '../theme/tokens';
import { Icon } from '../components/Icon';
import { securityService } from '../services/securityService';

export function PinScreen({ onUnlock }: { onUnlock: () => void }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isBiometricSupported, setIsBiometricSupported] = useState(false);
  const [lockoutSeconds, setLockoutSeconds] = useState(0);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [recoveryInput, setRecoveryInput] = useState('');

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
    let isMounted = true;
    (async () => {
      await securityService.init();
      const bioAvailable = await securityService.isBiometricAvailable();
      if (isMounted) {
        setIsBiometricSupported(bioAvailable);
      }
      // Auto prompt biometrics on launch if enabled
      if (bioAvailable && securityService.getSettings().isBiometricEnabled) {
        setTimeout(async () => {
          const ok = await securityService.authenticateBiometric();
          if (ok && isMounted) {
            onUnlock();
          }
        }, 300);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

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
    if (lockoutSeconds > 0) return;
    const ok = await securityService.authenticateBiometric();
    if (ok) {
      onUnlock();
    }
  };

  const handlePressKey = async (n: string) => {
    if (lockoutSeconds > 0 || pin.length >= 4) return;
    const next = pin + n;
    setPin(next);
    setError('');

    if (next.length === 4) {
      const result = await securityService.verifyPin(next);
      if (result.success) {
        setPin('');
        setError('');
        onUnlock();
      } else {
        triggerShake();
        if (Platform.OS !== 'web') {
          Vibration.vibrate(200);
        }
        setPin('');
        if (result.lockoutSeconds) {
          setLockoutSeconds(result.lockoutSeconds);
          setError(`Too many failed attempts. Locked for ${result.lockoutSeconds}s`);
        } else {
          setError(`Incorrect PIN. ${result.remainingAttempts ?? 0} attempts left`);
        }
      }
    }
  };

  const handleDelete = () => {
    if (lockoutSeconds > 0) return;
    setPin((prev) => prev.slice(0, -1));
    setError('');
  };

  const handleResetPin = async () => {
    if (recoveryInput.trim().toLowerCase() === 'reset' || recoveryInput.trim() === '1234') {
      await securityService.resetToDefaultPin();
      setShowForgotModal(false);
      setRecoveryInput('');
      setLockoutSeconds(0);
      setError('');
      Alert.alert(
        'PIN Reset Successful',
        'Your security PIN has been reset to default: 1234.\nPlease change it in Settings.',
        [{ text: 'OK' }]
      );
    } else {
      Alert.alert('Invalid Confirmation', 'Please type "reset" or enter default PIN (1234) to confirm.');
    }
  };

  return (
    <View style={s.wrap}>
      {/* App Lock Brand Icon */}
      <View style={s.lock}>
        <Icon name="lock" size={28} color="#fff" />
      </View>

      <Text style={s.title}>Welcome back</Text>
      <Text style={s.sub}>Enter your 4-digit PIN to unlock StayMate</Text>

      {/* 4-digit PIN indicator dots with shake */}
      <Animated.View style={[s.dots, { transform: [{ translateX: shakeAnim }] }]}>
        {[0, 1, 2, 3].map((i) => {
          const filled = i < pin.length;
          const isError = Boolean(error);
          return (
            <View
              key={i}
              style={[
                s.dot,
                filled && s.filled,
                isError && filled && s.dotError,
              ]}
            />
          );
        })}
      </Animated.View>

      {/* Feedback Message */}
      <View style={s.errorContainer}>
        {error ? (
          <Text style={s.errorText}>{error}</Text>
        ) : lockoutSeconds > 0 ? (
          <Text style={s.errorText}>Try again in {lockoutSeconds}s</Text>
        ) : (
          <Text style={s.hintText}>Default PIN: 1234</Text>
        )}
      </View>

      {/* Interactive Keypad */}
      <View style={s.keys}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
          <TouchableOpacity
            key={n}
            activeOpacity={0.7}
            disabled={lockoutSeconds > 0}
            onPress={() => handlePressKey(String(n))}
            style={[s.key, lockoutSeconds > 0 && s.keyDisabled]}
          >
            <Text style={[s.keyText, lockoutSeconds > 0 && s.keyTextDisabled]}>{n}</Text>
          </TouchableOpacity>
        ))}

        {/* Biometric / Face ID button */}
        <TouchableOpacity
          activeOpacity={0.7}
          disabled={lockoutSeconds > 0 || !isBiometricSupported}
          onPress={handleBiometricPress}
          style={[s.key, (!isBiometricSupported || lockoutSeconds > 0) && { opacity: 0.3 }]}
        >
          <Icon name="fingerprint" size={24} color={C.primary} />
        </TouchableOpacity>

        {/* Digit 0 */}
        <TouchableOpacity
          activeOpacity={0.7}
          disabled={lockoutSeconds > 0}
          onPress={() => handlePressKey('0')}
          style={[s.key, lockoutSeconds > 0 && s.keyDisabled]}
        >
          <Text style={[s.keyText, lockoutSeconds > 0 && s.keyTextDisabled]}>0</Text>
        </TouchableOpacity>

        {/* Backspace / Delete */}
        <TouchableOpacity
          activeOpacity={0.7}
          disabled={lockoutSeconds > 0 || pin.length === 0}
          onPress={handleDelete}
          style={[s.key, (lockoutSeconds > 0 || pin.length === 0) && { opacity: 0.3 }]}
        >
          <Icon name="chevronLeft" size={22} color={C.ink} />
        </TouchableOpacity>
      </View>

      {/* Forgot PIN Action */}
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => setShowForgotModal(true)}
        style={s.forgotBtn}
      >
        <Text style={s.forgotBtnText}>Forgot PIN?</Text>
      </TouchableOpacity>

      {/* Forgot PIN Recovery Modal */}
      <Modal
        visible={showForgotModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowForgotModal(false)}
      >
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <View style={s.modalIconWrap}>
              <Icon name="lock" size={24} color={C.primary} />
            </View>
            <Text style={s.modalTitle}>Reset Security PIN</Text>
            <Text style={s.modalSub}>
              Type <Text style={{ fontWeight: '700', color: C.ink }}>reset</Text> to restore your security PIN to the default (<Text style={{ fontWeight: '700' }}>1234</Text>).
            </Text>

            <TextInput
              style={s.modalInput}
              placeholder="Type 'reset' to confirm"
              placeholderTextColor="#94A3B8"
              value={recoveryInput}
              onChangeText={setRecoveryInput}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <View style={s.modalActions}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  setShowForgotModal(false);
                  setRecoveryInput('');
                }}
                style={s.modalCancelBtn}
              >
                <Text style={s.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={handleResetPin}
                style={s.modalResetBtn}
              >
                <Text style={s.modalResetText}>Reset to 1234</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    backgroundColor: '#FFFFFF',
    minHeight: '100%',
  },
  lock: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  title: {
    fontFamily: 'Inter',
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.5,
    color: '#0F172A',
  },
  sub: {
    fontFamily: 'Inter',
    fontSize: 13.5,
    fontWeight: '400',
    color: '#64748B',
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 8,
  },
  dots: {
    flexDirection: 'row',
    gap: 16,
    marginVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    backgroundColor: 'transparent',
  },
  filled: {
    borderColor: C.primary,
    backgroundColor: C.primary,
  },
  dotError: {
    borderColor: '#EF4444',
    backgroundColor: '#EF4444',
  },
  errorContainer: {
    minHeight: 22,
    marginBottom: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontFamily: 'Inter',
    fontSize: 13,
    fontWeight: '600',
    color: '#DC2626',
  },
  hintText: {
    fontFamily: 'Inter',
    fontSize: 12,
    color: '#94A3B8',
  },
  keys: {
    width: 250,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    justifyContent: 'center',
  },
  key: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyDisabled: {
    opacity: 0.4,
    backgroundColor: '#F1F5F9',
  },
  keyText: {
    fontFamily: 'Inter',
    fontSize: 24,
    fontWeight: '600',
    color: '#0F172A',
  },
  keyTextDisabled: {
    color: '#94A3B8',
  },
  forgotBtn: {
    marginTop: 32,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: R.full,
  },
  forgotBtnText: {
    fontFamily: 'Inter',
    fontSize: 13.5,
    fontWeight: '600',
    color: C.primary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 10,
  },
  modalIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#EDE9FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  modalTitle: {
    fontFamily: 'Inter',
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
  },
  modalSub: {
    fontFamily: 'Inter',
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  modalInput: {
    width: '100%',
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 14,
    fontFamily: 'Inter',
    fontSize: 14,
    color: '#0F172A',
    marginBottom: 18,
    textAlign: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  modalCancelBtn: {
    flex: 1,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  modalCancelText: {
    fontFamily: 'Inter',
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  modalResetBtn: {
    flex: 1,
    height: 42,
    borderRadius: 12,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalResetText: {
    fontFamily: 'Inter',
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
