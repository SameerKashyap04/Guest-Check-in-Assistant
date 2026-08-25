// ============================================================
// StayMate — Client Referral & Credits Service
// ============================================================

import { Share, Alert } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { DEVIFY_CONFIG } from '../config/devify';
import type { ReferralStats } from '../types/subscription';

export class ReferralService {
  private candidateUrls: string[];

  constructor() {
    const primary = DEVIFY_CONFIG.ADMIN_API_URL || 'https://admin-guest-check-in-assistant.vercel.app';
    this.candidateUrls = Array.from(new Set([
      primary,
      'http://192.168.31.209:3000',
    ]));
  }

  /**
   * Fetch referral overview, statistics, and transaction ledger.
   */
  async getReferralOverview(userId: string): Promise<ReferralStats | null> {
    for (const url of this.candidateUrls) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);

        const res = await fetch(`${url}/api/referrals?userId=${encodeURIComponent(userId)}`, {
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (res.ok) {
          const data = await res.json();
          return data;
        }
      } catch (err) {
        // continue to next url
      }
    }

    return null;
  }

  /**
   * Copy referral code to clipboard with user feedback.
   */
  async copyCode(code: string): Promise<boolean> {
    try {
      await Clipboard.setStringAsync(code);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Apply referral code during signup.
   */
  async applyReferralCode(
    referralCode: string,
    userId: string,
    userEmail?: string
  ): Promise<{ success: boolean; error?: string }> {
    for (const url of this.candidateUrls) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const res = await fetch(`${url}/api/referrals/apply`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            referralCode: referralCode.trim().toUpperCase(),
            userId,
            userEmail,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (res.ok) {
          return { success: true };
        } else {
          const errData = await res.json().catch(() => ({}));
          return { success: false, error: errData.error || 'Failed to apply referral code' };
        }
      } catch (err) {
        // continue to next url
      }
    }

    return { success: true };
  }

  /**
   * Open the native OS share sheet to share referral link and invitation code.
   */
  async shareReferral(code: string): Promise<void> {
    const shareMessage =
      `Manage your homestay or hotel with StayMate! Use my referral code ${code} ` +
      `to get ₹100 OFF on your first subscription.\n\n` +
      `Download & subscribe: https://staymate.in/referral?code=${code}`;

    try {
      await Share.share({
        title: 'Join StayMate — Homestay Check-in Assistant',
        message: shareMessage,
      });
    } catch (err: any) {
      Alert.alert('Share Failed', err?.message || 'Unable to open share sheet');
    }
  }
}

export const referralService = new ReferralService();
