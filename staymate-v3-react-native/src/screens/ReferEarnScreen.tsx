// ============================================================
// StayMate V3 — Refer & Earn Screen
// ============================================================

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Share,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '../components/Icon';
import { useTheme } from '../theme/ThemeContext';
import { referralService } from '../services/referralService';
import type { ReferralStats } from '../types/subscription';

export function ReferEarnScreen({
  onClose,
  onToast,
}: {
  onClose: () => void;
  onToast?: (msg: string) => void;
}) {
  const insets = useSafeAreaInsets();
  const { isDark, colors } = useTheme();

  const [copied, setCopied] = useState(false);
  const [stats, setStats] = useState<ReferralStats>({
    referralCode: 'STAYMATE82',
    shareUrl: 'https://staymate.in/referral?code=STAYMATE82',
    successfulReferralsCount: 0,
    pendingReferralsCount: 0,
    totalEarnedCredits: 0,
    availableCredits: 0,
    referralRewardAmount: 100,
    friendDiscountAmount: 100,
    history: [],
    transactions: [],
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const data = await referralService.getReferralOverview('HS-4821');
        if (data) {
          setStats(data);
        }
      } catch (_) {}
      setLoading(false);
    })();
  }, []);

  const handleCopy = async () => {
    const ok = await referralService.copyCode(stats.referralCode);
    if (ok) {
      setCopied(true);
      if (onToast) onToast('✓ Referral code copied to clipboard!');
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleShare = async () => {
    await referralService.shareReferral(stats.referralCode);
  };

  return (
    <View style={[s.container, isDark && { backgroundColor: colors.canvas }, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={[s.header, isDark && { borderBottomColor: colors.cardBorder }]}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onClose}
          style={[s.iconBtn, isDark && { backgroundColor: '#27272A' }]}
        >
          <Icon name="chevronLeft" size={18} color={colors.ink} />
        </TouchableOpacity>
        <Text style={[s.title, isDark && { color: colors.ink }]}>Refer &amp; Earn</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: Math.max(30, insets.bottom + 20) }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Card */}
        <View style={[s.heroCard, isDark && { backgroundColor: '#18181B', borderColor: '#27272A' }]}>
          <View style={[s.heroBadge, isDark && { backgroundColor: '#2E1065' }]}>
            <Icon name="gift" size={13} color={colors.primary} />
            <Text style={[s.heroBadgeText, { color: colors.primary }]}>StayMate Rewards Program</Text>
          </View>
          <Text style={[s.heroTitle, isDark && { color: colors.ink }]}>Invite friends to StayMate</Text>
          <Text style={[s.heroSubtitle, { color: colors.primary }]}>
            Give ₹100. Earn ₹100.
          </Text>
          <Text style={[s.heroDesc, isDark && { color: colors.muted }]}>
            Share your unique referral code with fellow homestay and hotel owners.
            They get ₹100 OFF their first subscription, and you earn ₹100 StayMate Credits once they subscribe!
          </Text>
        </View>

        {/* Unique Code Card */}
        <View style={[s.codeCard, isDark && { backgroundColor: '#18181B', borderColor: '#27272A' }]}>
          <Text style={[s.sectionCaption, isDark && { color: colors.muted }]}>YOUR REFERRAL CODE</Text>
          <View style={[s.codeDisplayRow, isDark && { backgroundColor: '#27272A', borderColor: '#3F3F46' }]}>
            <Text style={[s.codeText, { color: colors.primary }]}>{stats.referralCode}</Text>
            {copied && (
              <View style={s.copiedPill}>
                <Text style={s.copiedText}>Copied!</Text>
              </View>
            )}
          </View>

          <View style={s.btnRow}>
            <TouchableOpacity
              activeOpacity={0.8}
              style={[s.copyBtn, isDark && { backgroundColor: '#2E1065', borderColor: colors.primary }]}
              onPress={handleCopy}
            >
              <Icon name="copy" size={16} color={colors.primary} />
              <Text style={[s.copyBtnText, { color: colors.primary }]}>
                {copied ? 'Code Copied' : 'Copy Code'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.85}
              style={[s.shareBtn, { backgroundColor: colors.primary }]}
              onPress={handleShare}
            >
              <Icon name="share" size={16} color="#ffffff" />
              <Text style={s.shareBtnText}>Share Link</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* How It Works Split Card */}
        <View style={[s.howItWorksCard, isDark && { backgroundColor: '#18181B', borderColor: '#27272A' }]}>
          <View style={s.splitRow}>
            <View style={s.splitCol}>
              <View style={[s.iconCircle, { backgroundColor: isDark ? '#2E1065' : '#EDE9FE' }]}>
                <Icon name="gift" size={20} color={colors.primary} />
              </View>
              <Text style={[s.splitLabel, isDark && { color: colors.muted }]}>Your reward</Text>
              <Text style={[s.splitAmount, isDark && { color: colors.ink }]}>₹100 Credits</Text>
              <Text style={[s.splitDesc, isDark && { color: colors.muted }]}>On their qualifying paid plan</Text>
            </View>

            <View style={[s.vDivider, isDark && { backgroundColor: '#27272A' }]} />

            <View style={s.splitCol}>
              <View style={[s.iconCircle, { backgroundColor: isDark ? '#064E3B' : '#D1FAE5' }]}>
                <Icon name="coins" size={20} color="#059669" />
              </View>
              <Text style={[s.splitLabel, isDark && { color: colors.muted }]}>Friend reward</Text>
              <Text style={[s.splitAmount, isDark && { color: colors.ink }]}>₹100 OFF</Text>
              <Text style={[s.splitDesc, isDark && { color: colors.muted }]}>On their first subscription</Text>
            </View>
          </View>
        </View>

        {/* Referral Statistics */}
        <Text style={[s.sectionHeading, isDark && { color: colors.muted }]}>REFERRAL STATISTICS</Text>
        <View style={s.statsGrid}>
          <View style={[s.statBox, isDark && { backgroundColor: '#18181B', borderColor: '#27272A' }]}>
            <Text style={[s.statVal, isDark && { color: colors.ink }]}>{stats.successfulReferralsCount}</Text>
            <Text style={[s.statLbl, isDark && { color: colors.muted }]}>Successful</Text>
          </View>
          <View style={[s.statBox, isDark && { backgroundColor: '#18181B', borderColor: '#27272A' }]}>
            <Text style={[s.statVal, isDark && { color: colors.ink }]}>{stats.pendingReferralsCount}</Text>
            <Text style={[s.statLbl, isDark && { color: colors.muted }]}>Pending</Text>
          </View>
          <View style={[s.statBox, isDark && { backgroundColor: '#18181B', borderColor: '#27272A' }]}>
            <Text style={[s.statVal, isDark && { color: colors.ink }]}>₹{stats.totalEarnedCredits}</Text>
            <Text style={[s.statLbl, isDark && { color: colors.muted }]}>Total earned</Text>
          </View>
          <View style={[s.statBox, s.statBoxHighlight, isDark && { backgroundColor: '#2E1065', borderColor: colors.primary }]}>
            <Text style={[s.statVal, { color: colors.primary }]}>₹{stats.availableCredits}</Text>
            <Text style={[s.statLbl, { color: colors.primary }]}>Available</Text>
          </View>
        </View>

        {/* Referral History */}
        <Text style={[s.sectionHeading, { marginTop: 20 }, isDark && { color: colors.muted }]}>REFERRAL HISTORY</Text>
        <View style={[s.historyCard, isDark && { backgroundColor: '#18181B', borderColor: '#27272A' }]}>
          {stats.history.length === 0 ? (
            <View style={s.emptyWrap}>
              <Icon name="users" size={28} color={colors.mutedSoft} />
              <Text style={[s.emptyTitle, isDark && { color: colors.ink }]}>No referrals yet</Text>
              <Text style={[s.emptyDesc, isDark && { color: colors.muted }]}>
                Share your code to start earning StayMate Credits when friends subscribe!
              </Text>
            </View>
          ) : (
            stats.history.map((item, idx) => {
              const isSuccess = item.status === 'SUCCESSFUL';
              const isPending = item.status === 'PENDING';
              return (
                <View
                  key={item.id || idx}
                  style={[
                    s.historyRow,
                    idx < stats.history.length - 1 && s.rowBorder,
                    isDark && { borderBottomColor: '#27272A' },
                  ]}
                >
                  <View style={s.historyLeft}>
                    <View
                      style={[
                        s.dot,
                        isSuccess ? { backgroundColor: '#10B981' } : isPending ? { backgroundColor: '#F59E0B' } : { backgroundColor: '#EF4444' },
                      ]}
                    />
                    <View>
                      <Text style={[s.historyUser, isDark && { color: colors.ink }]}>
                        {item.referredUserIdentifier || 'Friend'}
                      </Text>
                      <Text style={[s.historyDate, isDark && { color: colors.muted }]}>
                        {new Date(item.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </Text>
                    </View>
                  </View>

                  <View style={{ alignItems: 'flex-end' }}>
                    <View
                      style={[
                        s.badge,
                        isSuccess ? s.badgeSuccess : isPending ? s.badgePending : s.badgeFail,
                      ]}
                    >
                      <Text
                        style={[
                          s.badgeText,
                          isSuccess ? s.textSuccess : isPending ? s.textPending : s.textFail,
                        ]}
                      >
                        {item.status}
                      </Text>
                    </View>
                    <Text style={[s.historyReward, isDark && { color: colors.muted }]}>
                      {isSuccess ? `+₹${item.rewardAmount} Credits` : 'Awaiting payment'}
                    </Text>
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* Credits Ledger Activity */}
        <Text style={[s.sectionHeading, { marginTop: 20 }, isDark && { color: colors.muted }]}>CREDITS ACTIVITY</Text>
        <View style={[s.historyCard, isDark && { backgroundColor: '#18181B', borderColor: '#27272A' }]}>
          {stats.transactions.length === 0 ? (
            <View style={s.emptyWrap}>
              <Icon name="coins" size={28} color={colors.mutedSoft} />
              <Text style={[s.emptyTitle, isDark && { color: colors.ink }]}>No credit transactions</Text>
              <Text style={[s.emptyDesc, isDark && { color: colors.muted }]}>
                Credits earned from successful referrals and used on checkout will appear here.
              </Text>
            </View>
          ) : (
            stats.transactions.map((tx, idx) => {
              const isCredit = tx.type === 'CREDIT';
              return (
                <View
                  key={tx.id || idx}
                  style={[
                    s.historyRow,
                    idx < stats.transactions.length - 1 && s.rowBorder,
                    isDark && { borderBottomColor: '#27272A' },
                  ]}
                >
                  <View style={s.historyLeft}>
                    <View
                      style={[
                        s.txIconWrap,
                        isCredit
                          ? { backgroundColor: isDark ? '#064E3B' : '#ECFDF5' }
                          : { backgroundColor: isDark ? '#450A0A' : '#FEF2F2' },
                      ]}
                    >
                      <Icon name={isCredit ? "download" : "upload"} size={14} color={isCredit ? "#059669" : "#DC2626"} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.txDesc, isDark && { color: colors.ink }]} numberOfLines={1}>
                        {tx.description}
                      </Text>
                      <Text style={[s.historyDate, isDark && { color: colors.muted }]}>
                        {new Date(tx.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </Text>
                    </View>
                  </View>

                  <Text
                    style={[
                      s.txAmount,
                      isCredit ? { color: '#059669' } : { color: '#DC2626' },
                    ]}
                  >
                    {isCredit ? `+₹${tx.amount}` : `-₹${tx.amount}`}
                  </Text>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF8FD',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'transparent',
    borderBottomWidth: 1,
    borderBottomColor: '#ECEAF0',
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: 'Inter',
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },

  // Hero Card
  heroCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#ECEAF0',
    marginBottom: 14,
  },
  heroBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 10,
    paddingVertical: 3.5,
    borderRadius: 999,
    marginBottom: 8,
  },
  heroBadgeText: {
    fontFamily: 'Inter',
    fontSize: 11.5,
    fontWeight: '700',
  },
  heroTitle: {
    fontFamily: 'Inter',
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  heroSubtitle: {
    fontFamily: 'Inter',
    fontSize: 15,
    fontWeight: '700',
    marginTop: 2,
  },
  heroDesc: {
    fontFamily: 'Inter',
    fontSize: 12.5,
    color: '#475569',
    lineHeight: 18,
    marginTop: 6,
  },

  // Code Card
  codeCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#ECEAF0',
    marginBottom: 14,
  },
  sectionCaption: {
    fontFamily: 'Inter',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
    color: '#64748B',
    marginBottom: 8,
  },
  codeDisplayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    marginBottom: 12,
  },
  codeText: {
    fontFamily: 'Inter',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 2,
  },
  copiedPill: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  copiedText: {
    fontFamily: 'Inter',
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  btnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  copyBtn: {
    flex: 1,
    height: 42,
    borderRadius: 10,
    backgroundColor: '#FAF5FF',
    borderWidth: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  copyBtnText: {
    fontFamily: 'Inter',
    fontSize: 13,
    fontWeight: '700',
  },
  shareBtn: {
    flex: 1,
    height: 42,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  shareBtnText: {
    fontFamily: 'Inter',
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },

  // Split
  howItWorksCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#ECEAF0',
    marginBottom: 16,
  },
  splitRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  splitCol: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
  },
  vDivider: {
    width: 1,
    height: 60,
    backgroundColor: '#E2E8F0',
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  splitLabel: {
    fontFamily: 'Inter',
    fontSize: 11.5,
    fontWeight: '600',
    color: '#64748B',
  },
  splitAmount: {
    fontFamily: 'Inter',
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 1,
  },
  splitDesc: {
    fontFamily: 'Inter',
    fontSize: 10.5,
    color: '#94A3B8',
    marginTop: 2,
    textAlign: 'center',
  },

  // Stats
  sectionHeading: {
    fontFamily: 'Inter',
    fontSize: 11.5,
    fontWeight: '800',
    letterSpacing: 0.6,
    color: '#64748B',
    marginBottom: 8,
    marginLeft: 2,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#ECEAF0',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 62,
  },
  statBoxHighlight: {
    backgroundColor: '#FAF5FF',
    borderWidth: 1.5,
  },
  statVal: {
    fontFamily: 'Inter',
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  statLbl: {
    fontFamily: 'Inter',
    fontSize: 10.5,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 1,
    textAlign: 'center',
  },

  // History
  historyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#ECEAF0',
  },
  emptyWrap: {
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 8,
  },
  emptyDesc: {
    fontFamily: 'Inter',
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
    maxWidth: 240,
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  historyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  historyUser: {
    fontFamily: 'Inter',
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  historyDate: {
    fontFamily: 'Inter',
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 1,
  },
  badge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
  },
  badgeSuccess: {
    backgroundColor: '#ECFDF5',
  },
  badgePending: {
    backgroundColor: '#FFFBEB',
  },
  badgeFail: {
    backgroundColor: '#FEF2F2',
  },
  badgeText: {
    fontFamily: 'Inter',
    fontSize: 10,
    fontWeight: '800',
  },
  textSuccess: {
    color: '#059669',
  },
  textPending: {
    color: '#D97706',
  },
  textFail: {
    color: '#DC2626',
  },
  historyReward: {
    fontFamily: 'Inter',
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 2,
  },

  // Tx
  txIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txDesc: {
    fontFamily: 'Inter',
    fontSize: 12.5,
    fontWeight: '600',
    color: '#0F172A',
  },
  txAmount: {
    fontFamily: 'Inter',
    fontSize: 13.5,
    fontWeight: '800',
  },
});
