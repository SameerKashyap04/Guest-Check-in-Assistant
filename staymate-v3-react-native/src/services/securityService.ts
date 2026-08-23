// ============================================================
// StayMate — Security & PIN Service
// ============================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import { Platform } from 'react-native';

const STORAGE_KEYS = {
  PIN: '@staymate_security_pin',
  IS_LOCK_ENABLED: '@staymate_is_lock_enabled',
  IS_BIOMETRIC_ENABLED: '@staymate_is_biometric_enabled',
  AUTO_LOCK_MINUTES: '@staymate_auto_lock_minutes',
  FAILED_ATTEMPTS: '@staymate_failed_attempts',
  LOCKOUT_UNTIL: '@staymate_lockout_until',
};

const DEFAULT_PIN = '1234';
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 30 * 1000; // 30 seconds

export interface SecuritySettings {
  pin: string;
  isLockEnabled: boolean;
  isBiometricEnabled: boolean;
  autoLockMinutes: number; // 0 = immediately, 1 = 1m, 5 = 5m, 15 = 15m, -1 = never
  hasCustomPin: boolean;
}

class SecurityService {
  private cachedPin: string = DEFAULT_PIN;
  private isLockEnabled: boolean = true;
  private isBiometricEnabled: boolean = true;
  private autoLockMinutes: number = 5;
  private hasCustomPin: boolean = false;
  private isInitialized: boolean = false;

  /**
   * Initializes and preloads security settings from local storage
   */
  async init(): Promise<SecuritySettings> {
    try {
      const [savedPin, savedLock, savedBiometric, savedAutoLock] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.PIN),
        AsyncStorage.getItem(STORAGE_KEYS.IS_LOCK_ENABLED),
        AsyncStorage.getItem(STORAGE_KEYS.IS_BIOMETRIC_ENABLED),
        AsyncStorage.getItem(STORAGE_KEYS.AUTO_LOCK_MINUTES),
      ]);

      if (savedPin && savedPin.length === 4) {
        this.cachedPin = savedPin;
        this.hasCustomPin = true;
      } else {
        this.cachedPin = DEFAULT_PIN;
        this.hasCustomPin = false;
        await AsyncStorage.setItem(STORAGE_KEYS.PIN, DEFAULT_PIN);
      }

      this.isLockEnabled = savedLock !== null ? savedLock === 'true' : true;
      this.isBiometricEnabled = savedBiometric !== null ? savedBiometric === 'true' : true;
      this.autoLockMinutes = savedAutoLock !== null ? parseInt(savedAutoLock, 10) : 5;
      this.isInitialized = true;
    } catch (e) {
      console.warn('[SecurityService] Init fallback:', e);
      this.cachedPin = DEFAULT_PIN;
      this.hasCustomPin = false;
      this.isLockEnabled = true;
      this.isBiometricEnabled = true;
      this.autoLockMinutes = 5;
      this.isInitialized = true;
    }

    return this.getSettings();
  }

  getSettings(): SecuritySettings {
    return {
      pin: this.cachedPin,
      isLockEnabled: this.isLockEnabled,
      isBiometricEnabled: this.isBiometricEnabled,
      autoLockMinutes: this.autoLockMinutes,
      hasCustomPin: this.hasCustomPin,
    };
  }

  async changePin(newPin: string): Promise<boolean> {
    return this.savePin(newPin);
  }

  /**
   * Verifies the entered PIN against saved PIN and tracks failed attempts
   */
  async verifyPin(enteredPin: string): Promise<{ success: boolean; remainingAttempts?: number; lockoutSeconds?: number }> {
    if (!this.isInitialized) {
      await this.init();
    }

    // Check lockout state
    const lockoutUntilStr = await AsyncStorage.getItem(STORAGE_KEYS.LOCKOUT_UNTIL);
    if (lockoutUntilStr) {
      const lockoutUntil = parseInt(lockoutUntilStr, 10);
      const remainingMs = lockoutUntil - Date.now();
      if (remainingMs > 0) {
        return {
          success: false,
          lockoutSeconds: Math.ceil(remainingMs / 1000),
        };
      } else {
        // Lockout expired, reset
        await AsyncStorage.removeItem(STORAGE_KEYS.LOCKOUT_UNTIL);
        await AsyncStorage.setItem(STORAGE_KEYS.FAILED_ATTEMPTS, '0');
      }
    }

    if (enteredPin === this.cachedPin) {
      // Success! Reset failed attempts
      await AsyncStorage.setItem(STORAGE_KEYS.FAILED_ATTEMPTS, '0');
      await AsyncStorage.removeItem(STORAGE_KEYS.LOCKOUT_UNTIL);
      return { success: true };
    }

    // Incorrect PIN -> increment failed attempts
    const attemptsStr = await AsyncStorage.getItem(STORAGE_KEYS.FAILED_ATTEMPTS);
    const attempts = (attemptsStr ? parseInt(attemptsStr, 10) : 0) + 1;
    await AsyncStorage.setItem(STORAGE_KEYS.FAILED_ATTEMPTS, String(attempts));

    if (attempts >= MAX_FAILED_ATTEMPTS) {
      const lockoutUntil = Date.now() + LOCKOUT_DURATION_MS;
      await AsyncStorage.setItem(STORAGE_KEYS.LOCKOUT_UNTIL, String(lockoutUntil));
      return {
        success: false,
        lockoutSeconds: Math.ceil(LOCKOUT_DURATION_MS / 1000),
      };
    }

    return {
      success: false,
      remainingAttempts: MAX_FAILED_ATTEMPTS - attempts,
    };
  }

  /**
   * Sets and saves a new 4-digit PIN
   */
  async savePin(newPin: string): Promise<boolean> {
    if (!newPin || newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
      throw new Error('PIN must be exactly 4 digits');
    }
    this.cachedPin = newPin;
    this.hasCustomPin = true;
    await AsyncStorage.setItem(STORAGE_KEYS.PIN, newPin);
    return true;
  }

  /**
   * Toggles whether the app requires PIN on startup / background
   */
  async setLockEnabled(enabled: boolean): Promise<void> {
    this.isLockEnabled = enabled;
    await AsyncStorage.setItem(STORAGE_KEYS.IS_LOCK_ENABLED, String(enabled));
  }

  /**
   * Toggles biometric support
   */
  async setBiometricEnabled(enabled: boolean): Promise<void> {
    this.isBiometricEnabled = enabled;
    await AsyncStorage.setItem(STORAGE_KEYS.IS_BIOMETRIC_ENABLED, String(enabled));
  }

  /**
   * Sets auto-lock duration in minutes
   */
  async setAutoLockMinutes(minutes: number): Promise<void> {
    this.autoLockMinutes = minutes;
    await AsyncStorage.setItem(STORAGE_KEYS.AUTO_LOCK_MINUTES, String(minutes));
  }

  /**
   * Checks if device supports biometrics
   */
  async isBiometricAvailable(): Promise<boolean> {
    try {
      if (Platform.OS === 'web') return false;
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      return Boolean(compatible && enrolled);
    } catch {
      return false;
    }
  }

  /**
   * Authenticates user using Face ID / Touch ID / Biometrics
   */
  async authenticateBiometric(): Promise<boolean> {
    try {
      if (!this.isBiometricEnabled || Platform.OS === 'web') return false;
      const isAvailable = await this.isBiometricAvailable();
      if (!isAvailable) return false;

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock StayMate with Face ID / Biometrics',
        fallbackLabel: 'Use PIN',
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
      });

      if (result.success) {
        await AsyncStorage.setItem(STORAGE_KEYS.FAILED_ATTEMPTS, '0');
        await AsyncStorage.removeItem(STORAGE_KEYS.LOCKOUT_UNTIL);
        return true;
      }
      return false;
    } catch (e) {
      console.warn('[SecurityService] Biometric auth notice:', e);
      return false;
    }
  }

  /**
   * Resets PIN to factory default (1234)
   */
  async resetToDefaultPin(): Promise<void> {
    this.cachedPin = DEFAULT_PIN;
    await AsyncStorage.setItem(STORAGE_KEYS.PIN, DEFAULT_PIN);
    await AsyncStorage.setItem(STORAGE_KEYS.FAILED_ATTEMPTS, '0');
    await AsyncStorage.removeItem(STORAGE_KEYS.LOCKOUT_UNTIL);
  }
}

export const securityService = new SecurityService();
