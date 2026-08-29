import AsyncStorage from '@react-native-async-storage/async-storage';
import { Share, Alert } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { DEVIFY_CONFIG } from '../config/devify';
import type { ReferralStats } from '../types/subscription';

export function derivePermanentReferralCode(userId?: string): string {
  if (!userId) return 'STAY4821';
  const digits = userId.replace(/[^0-9]/g, '');
  if (digits.length >= 4) {
    return `STAY${digits.slice(0, 4)}`;
  }
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash * 31 + userId.charCodeAt(i)) % 9000;
  }
  const num = 1000 + Math.abs(hash);
  return `STAY${num}`;
}

export class ReferralService {
  private candidateUrls: string[];

  constructor() {
    this.candidateUrls = Array.from(new Set([
      DEVIFY_CONFIG.ADMIN_API_URL || 'https://admin-guest-check-in-assistant.vercel.app',
    ]));
  }

  /**
   * Returns a permanent, persistent referral code for the user.
   */
  async getPermanentCode(userId: string): Promise<string> {
    const cleanId = userId || 'HS-4821';
    const storageKey = `@staymate_permanent_referral_${cleanId}`;
    try {
      const cached = await AsyncStorage.getItem(storageKey);
      if (cached && cached.startsWith('STAY')) return cached;
    } catch (_) {}

    const derived = derivePermanentReferralCode(cleanId);
    try {
      await AsyncStorage.setItem(storageKey, derived);
    } catch (_) {}
    return derived;
  }

  /**
   * Fetch referral overview, statistics, and transaction ledger.
   */
  async getReferralOverview(userId: string): Promise<ReferralStats | null> {
    const fallbackCode = await this.getPermanentCode(userId);

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
          const permanentCode = data.referralCode || fallbackCode;
          return {
            referralCode: permanentCode,
            shareUrl: data.shareUrl || `https://staymate.in/referral?code=${permanentCode}`,
            successfulReferralsCount: Number(data.successfulReferralsCount ?? data.successfulCount ?? 0),
            pendingReferralsCount: Number(data.pendingReferralsCount ?? data.pendingCount ?? 0),
            totalEarnedCredits: Number(data.totalEarnedCredits ?? 0),
            availableCredits: Number(data.availableCredits ?? 0),
            referralRewardAmount: Number(data.referralRewardAmount || 100),
            friendDiscountAmount: Number(data.friendDiscountAmount || 100),
            history: data.history || [],
            transactions: data.transactions || [],
          };
        }
      } catch (err) {
        // continue to next url
      }
    }

    return {
      referralCode: fallbackCode,
      shareUrl: `https://staymate.in/referral?code=${fallbackCode}`,
      successfulReferralsCount: 0,
      pendingReferralsCount: 0,
      totalEarnedCredits: 0,
      availableCredits: 0,
      referralRewardAmount: 100,
      friendDiscountAmount: 100,
      history: [],
      transactions: [],
    };
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
