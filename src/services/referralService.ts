// ============================================================
// StayMate — Client Referral & Wallet Service
// ============================================================
//
// Fetches referral stats, shares unique referral links, applies referral codes,
// and queries StayMate Credits transactions.
//

import { DEVIFY_CONFIG } from '@/config/devify';
import { type ReferralStats } from '@/types/subscription';
import { Share, Platform } from 'react-native';
import * as Clipboard from 'expo-clipboard';

const candidateUrls = Array.from(
  new Set([
    DEVIFY_CONFIG.ADMIN_API_URL || 'https://admin-guest-check-in-assistant.vercel.app',
  ])
);

export class ReferralService {
  /**
   * Generates a standard deterministic referral code for user
   */
  generateReferralCode(userId: string): string {
    if (!userId) return 'STAYMATE82';
    const clean = userId.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const suffix = clean.length >= 4 ? clean.slice(-4) : clean.padStart(4, '8');
    return `STAY${suffix}`;
  }

  /**
   * Fetches full referral overview, statistics, and StayMate Credits ledger
   */
  async getReferralOverview(userId: string): Promise<ReferralStats> {
    const fallbackCode = this.generateReferralCode(userId);

    for (const url of candidateUrls) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);

        const res = await fetch(`${url}/api/referrals?userId=${encodeURIComponent(userId)}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (res.ok) {
          const data = await res.json();
          return {
            referralCode: data.referralCode || fallbackCode,
            successfulCount: data.successfulCount || 0,
            pendingCount: data.pendingCount || 0,
            totalEarnedCredits: data.totalEarnedCredits || 0,
            availableCredits: data.availableCredits || 0,
            history: data.history || [],
            transactions: data.transactions || [],
          };
        }
      } catch (err) {
        console.warn(`[ReferralService] Endpoint ${url} unreachable for referral overview`);
      }
    }

    // Resilient offline defaults
    return {
      referralCode: fallbackCode,
      successfulCount: 0,
      pendingCount: 0,
      totalEarnedCredits: 0,
      availableCredits: 0,
      history: [],
      transactions: [],
    };
  }

  /**
   * Applies a referral code during signup or checkout
   */
  async applyReferralCode(
    referralCode: string,
    userId: string,
    userEmail?: string
  ): Promise<{ success: boolean; error?: string }> {
    for (const url of candidateUrls) {
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
        console.warn(`[ReferralService] Endpoint ${url} unreachable for apply referral`);
      }
    }

    return { success: true };
  }

  /**
   * Generates promotional referral message with user's unique code
   */
  getShareMessage(referralCode: string): string {
    return (
      `🏨 Hey! Manage guest check-ins, instant ID card OCR scanning, and room bookings with StayMate.\n\n` +
      `Use my referral code *${referralCode}* to get ₹100 OFF your first subscription!\n\n` +
      `Download & try StayMate: https://staymate.devify.co.in/app?ref=${referralCode}`
    );
  }

  /**
   * Opens native device share sheet
   */
  async shareReferral(referralCode: string): Promise<void> {
    const message = this.getShareMessage(referralCode);
    try {
      if (Platform.OS === 'web') {
        if (typeof navigator !== 'undefined' && (navigator as any).share) {
          await (navigator as any).share({
            title: 'Join StayMate — Homestay Check-in Assistant',
            text: message,
            url: `https://staymate.devify.co.in/app?ref=${referralCode}`,
          });
          return;
        }
        await Clipboard.setStringAsync(message);
        return;
      }

      await Share.share({
        title: 'Invite Homestay Owners to StayMate',
        message,
      });
    } catch (err: any) {
      console.warn('[ReferralService] Share sheet notice:', err);
    }
  }

  /**
   * Copies referral code to device clipboard
   */
  async copyCode(referralCode: string): Promise<boolean> {
    try {
      await Clipboard.setStringAsync(referralCode);
      return true;
    } catch (err) {
      console.error('[ReferralService] Copy code failed:', err);
      return false;
    }
  }
}

export const referralService = new ReferralService();
