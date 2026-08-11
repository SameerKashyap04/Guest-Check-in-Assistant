// ============================================================
// Guest Check-in Assistant — Devify Pay Client Config
// ============================================================
//
// Contains ONLY the admin panel API URL. No secrets here.
// The API key and webhook secret live exclusively in the admin panel's .env.local.
//

/**
 * Public configuration for the Devify Pay checkout flow.
 * The Expo app calls these endpoints to initiate and poll payments.
 */
export const DEVIFY_CONFIG = {
  /**
   * Base URL of the admin panel backend.
   * Set via EXPO_PUBLIC_ADMIN_API_URL in the Expo app's .env.
   * Falls back to localhost:3000 for local development.
   */
  ADMIN_API_URL:
    process.env.EXPO_PUBLIC_ADMIN_API_URL || 'http://localhost:3000',

  /** Polling interval in ms when checking payment status */
  STATUS_POLL_INTERVAL_MS: 3000,

  /** Max time in ms to wait for payment completion before timing out */
  STATUS_POLL_TIMEOUT_MS: 5 * 60 * 1000, // 5 minutes
} as const;
