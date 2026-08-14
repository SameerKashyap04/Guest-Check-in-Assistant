// ============================================================
// Guest Check-in Assistant — Devify Pay Client Config
// ============================================================
//
// Contains ONLY the admin panel API URL. No secrets here.
// The API key and webhook secret live exclusively in the admin panel's .env.local.
//

import { Platform } from 'react-native';

const getDefaultAdminUrl = (): string => {
  if (process.env.EXPO_PUBLIC_ADMIN_API_URL) {
    return process.env.EXPO_PUBLIC_ADMIN_API_URL;
  }
  // Android emulator routes host machine localhost via 10.0.2.2
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:3000';
  }
  return 'http://localhost:3000';
};

/**
 * Public configuration for the Devify Pay checkout flow.
 * The Expo app calls these endpoints to initiate and poll payments.
 */
export const DEVIFY_CONFIG = {
  /**
   * Base URL of the admin panel backend.
   * Set via EXPO_PUBLIC_ADMIN_API_URL in the Expo app's .env.
   * Auto-resolves localhost on web/iOS and 10.0.2.2 on Android emulator.
   */
  ADMIN_API_URL: getDefaultAdminUrl(),

  /** Polling interval in ms when checking payment status */
  STATUS_POLL_INTERVAL_MS: 3000,

  /** Max time in ms to wait for payment completion before timing out */
  STATUS_POLL_TIMEOUT_MS: 5 * 60 * 1000, // 5 minutes
} as const;
