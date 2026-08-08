import { logAuditEvent } from '@/database';

export type AnalyticsEventType =
  | 'app_opened'
  | 'property_created'
  | 'first_checkin_completed'
  | 'qr_checkin_used'
  | 'ocr_started'
  | 'ocr_completed'
  | 'report_generated'
  | 'export_created'
  | 'pricing_viewed'
  | 'upgrade_prompt_viewed'
  | 'checkout_started'
  | 'subscription_started'
  | 'subscription_cancelled'
  | 'trial_started'
  | 'trial_expired';

export interface AnalyticsEvent {
  eventName: AnalyticsEventType;
  properties?: Record<string, any>;
  timestamp: string;
}

export class AnalyticsService {
  /**
   * Track product usage event safely without PII
   */
  public static trackEvent(eventName: AnalyticsEventType, properties: Record<string, any> = {}) {
    try {
      // Strip any sensitive identity fields if passed accidentally
      const sanitizedProps = { ...properties };
      delete sanitizedProps.idNumber;
      delete sanitizedProps.fullName;
      delete sanitizedProps.phone;
      delete sanitizedProps.email;
      delete sanitizedProps.photoUri;

      const event: AnalyticsEvent = {
        eventName,
        properties: sanitizedProps,
        timestamp: new Date().toISOString(),
      };

      // Log locally to audit table
      logAuditEvent(eventName, 'user', sanitizedProps.propertyId, JSON.stringify(sanitizedProps));

      if (__DEV__) {
        console.log(`[Analytics] ${eventName}:`, sanitizedProps);
      }
    } catch (e) {
      console.warn('Analytics tracking warning:', e);
    }
  }
}
