// ============================================================
// Guest Check-in Assistant — Analytics Service Abstraction
// ============================================================
//
// Abstract analytics layer. No specific provider dependency.
// Can be wired to Firebase Analytics, Mixpanel, Amplitude, or PostHog.
//
// PRIVACY:
// - Never send raw guest identity data (Aadhaar, PAN, etc.)
// - Never send full names unless the user explicitly consents
// - Only send aggregate counts and event types
//

export type AnalyticsEvent =
  | 'app_opened'
  | 'app_backgrounded'
  | 'checkin_started'
  | 'checkin_completed'
  | 'checkin_failed'
  | 'checkout_completed'
  | 'ocr_scan_started'
  | 'ocr_scan_completed'
  | 'ocr_scan_failed'
  | 'room_created'
  | 'room_deleted'
  | 'report_exported_pdf'
  | 'report_exported_csv'
  | 'self_checkin_approved'
  | 'self_checkin_rejected'
  | 'pricing_viewed'
  | 'plan_selected'
  | 'trial_started'
  | 'trial_expired'
  | 'subscription_created'
  | 'subscription_cancelled'
  | 'upgrade_prompt_shown'
  | 'upgrade_prompt_dismissed'
  | 'settings_changed'
  | 'qr_link_shared'
  | 'search_performed';

export interface AnalyticsProperties {
  [key: string]: string | number | boolean | undefined;
}

interface AnalyticsProvider {
  /** Track a product event */
  track(event: AnalyticsEvent, properties?: AnalyticsProperties): void;

  /** Set user properties (never PII) */
  setUser(userId: string, properties?: AnalyticsProperties): void;

  /** Clear user identity on logout */
  clearUser(): void;
}

// ------------------------------------------------------------------
// Console-only implementation (development)
// ------------------------------------------------------------------

class ConsoleAnalyticsProvider implements AnalyticsProvider {
  track(event: AnalyticsEvent, properties?: AnalyticsProperties): void {
    if (__DEV__) {
      console.log(`[Analytics] ${event}`, properties || '');
    }
  }

  setUser(userId: string, properties?: AnalyticsProperties): void {
    if (__DEV__) {
      console.log(`[Analytics] setUser: ${userId}`, properties || '');
    }
  }

  clearUser(): void {
    if (__DEV__) {
      console.log('[Analytics] clearUser');
    }
  }
}

// ------------------------------------------------------------------
// Singleton Export
// ------------------------------------------------------------------

/** The active analytics provider instance */
export const analytics: AnalyticsProvider = new ConsoleAnalyticsProvider();
