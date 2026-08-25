// ============================================================
// StayMate — Refer & Earn Screen
// ============================================================
//
// Allows homestay owners to share unique referral links/codes,
// view referral statistics, track pending vs successful referrals,
// and monitor their StayMate Credits ledger.
//

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  Copy,
  Share2,
  Gift,
  Users,
  Clock,
  CheckCircle2,
  AlertCircle,
  Coins,
  ArrowUpRight,
  ArrowDownLeft,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/store/useAuthStore';
import { useWalletStore } from '@/store/useWalletStore';
import { referralService } from '@/services/referralService';
import { Button } from '@/components/Button';
import { C, R, shadow } from '@/theme/tokens';
import { AIRBNB } from '@/theme/airbnb';

export default function ReferAndEarnScreen() {
  const router = useRouter();
  const { owner, ownerId } = useAuthStore();
  const userId = ownerId || 'OWNER_DEFAULT_101';

  const {
    referralCode,
    availableCredits,
    successfulCount,
    pendingCount,
    totalEarnedCredits,
    history,
    transactions,
    isLoading,
    fetchReferralOverview,
  } = useWalletStore();

  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (userId) {
      fetchReferralOverview(userId);
    }
  }, [userId]);

  const handleCopy = async () => {
    const ok = await referralService.copyCode(referralCode);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleShare = async () => {
    await referralService.shareReferral(referralCode);
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/settings'))}
        >
          <ChevronLeft size={18} color={AIRBNB.colors.ink} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Refer &amp; Earn</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section */}
        <View style={styles.heroCard}>
          <View style={styles.heroBadge}>
            <Gift size={13} color="#7C3AED" />
            <Text style={styles.heroBadgeText}>StayMate Rewards Program</Text>
          </View>
          <Text style={styles.heroTitle}>Invite friends to StayMate</Text>
          <Text style={styles.heroSubtitle}>
            Give ₹100. Earn ₹100.
          </Text>
          <Text style={styles.heroDescription}>
            Share your unique referral code with fellow homestay and hotel owners.
            They get ₹100 OFF their first subscription, and you get ₹100 in StayMate Credits once they subscribe!
          </Text>
        </View>

        {/* Unique Referral Code Card */}
        <View style={styles.codeCard}>
          <Text style={styles.codeCardLabel}>YOUR REFERRAL CODE</Text>
          <View style={styles.codeDisplayRow}>
            <Text style={styles.codeText}>{referralCode || 'STAYMATE82'}</Text>
            {copied && (
              <View style={styles.copiedPill}>
                <Text style={styles.copiedText}>Copied!</Text>
              </View>
            )}
          </View>

          <View style={styles.actionButtonsRow}>
            <TouchableOpacity
              style={styles.copyBtn}
              activeOpacity={0.8}
              onPress={handleCopy}
            >
              <Copy size={16} color={C.primary} />
              <Text style={styles.copyBtnText}>
                {copied ? 'Code Copied' : 'Copy Code'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.shareBtn}
              activeOpacity={0.85}
              onPress={handleShare}
            >
              <Share2 size={16} color="#ffffff" />
              <Text style={styles.shareBtnText}>Share Link</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* How It Works / Rewards Overview */}
        <View style={styles.howItWorksCard}>
          <View style={styles.rewardSplitRow}>
            <View style={styles.rewardColumn}>
              <View style={styles.rewardIconBgPurple}>
                <Gift size={20} color={C.primary} />
              </View>
              <Text style={styles.rewardColTitle}>Your reward</Text>
              <Text style={styles.rewardColAmount}>₹100 Credits</Text>
              <Text style={styles.rewardColDesc}>On their qualifying paid plan</Text>
            </View>

            <View style={styles.verticalDivider} />

            <View style={styles.rewardColumn}>
              <View style={styles.rewardIconBgGreen}>
                <Coins size={20} color="#059669" />
              </View>
              <Text style={styles.rewardColTitle}>Friend reward</Text>
              <Text style={styles.rewardColAmount}>₹100 OFF</Text>
              <Text style={styles.rewardColDesc}>On their first subscription</Text>
            </View>
          </View>
        </View>

        {/* Referral Statistics Grid */}
        <Text style={styles.sectionHeading}>REFERRAL STATISTICS</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{successfulCount}</Text>
            <Text style={styles.statLabel}>Successful</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{pendingCount}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>₹{totalEarnedCredits}</Text>
            <Text style={styles.statLabel}>Total earned</Text>
          </View>
          <View style={[styles.statCard, styles.statCardHighlight]}>
            <Text style={[styles.statValue, { color: C.primary }]}>
              ₹{availableCredits}
            </Text>
            <Text style={[styles.statLabel, { color: C.primary }]}>
              Available credits
            </Text>
          </View>
        </View>

        {/* Referral History Section */}
        <Text style={[styles.sectionHeading, { marginTop: 20 }]}>
          REFERRAL HISTORY
        </Text>
        <View style={styles.historyCard}>
          {history.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Users size={32} color="#CBD5E1" />
              <Text style={styles.emptyTitle}>No referrals yet</Text>
              <Text style={styles.emptyDesc}>
                Share your code to start earning StayMate Credits when friends join!
              </Text>
            </View>
          ) : (
            history.map((item, index) => {
              const isSuccess = item.status === 'SUCCESSFUL';
              const isPending = item.status === 'PENDING';
              return (
                <View
                  key={item.id || index}
                  style={[
                    styles.historyRow,
                    index < history.length - 1 && styles.historyRowBorder,
                  ]}
                >
                  <View style={styles.historyLeft}>
                    <View
                      style={[
                        styles.statusDot,
                        isSuccess
                          ? { backgroundColor: '#10B981' }
                          : isPending
                          ? { backgroundColor: '#F59E0B' }
                          : { backgroundColor: '#EF4444' },
                      ]}
                    />
                    <View>
                      <Text style={styles.historyUser}>
                        {item.referredUserIdentifier || 'Friend'}
                      </Text>
                      <Text style={styles.historyDate}>
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
                        styles.statusBadge,
                        isSuccess
                          ? styles.statusBadgeSuccess
                          : isPending
                          ? styles.statusBadgePending
                          : styles.statusBadgeCancelled,
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusBadgeText,
                          isSuccess
                            ? styles.statusTextSuccess
                            : isPending
                            ? styles.statusTextPending
                            : styles.statusTextCancelled,
                        ]}
                      >
                        {item.status}
                      </Text>
                    </View>
                    <Text style={styles.historyReward}>
                      {isSuccess ? `+₹${item.rewardAmount} Credits` : 'Awaiting plan payment'}
                    </Text>
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* StayMate Credits Ledger Section */}
        <Text style={[styles.sectionHeading, { marginTop: 20 }]}>
          CREDITS LEDGER &amp; ACTIVITY
        </Text>
        <View style={styles.historyCard}>
          {transactions.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Coins size={32} color="#CBD5E1" />
              <Text style={styles.emptyTitle}>No credit transactions</Text>
              <Text style={styles.emptyDesc}>
                Credits earned from successful referrals and discounts will show here.
              </Text>
            </View>
          ) : (
            transactions.map((tx, index) => {
              const isCredit = tx.type === 'CREDIT';
              return (
                <View
                  key={tx.id || index}
                  style={[
                    styles.historyRow,
                    index < transactions.length - 1 && styles.historyRowBorder,
                  ]}
                >
                  <View style={styles.historyLeft}>
                    <View
                      style={[
                        styles.txIconWrap,
                        isCredit ? styles.txIconCredit : styles.txIconDebit,
                      ]}
                    >
                      {isCredit ? (
                        <ArrowDownLeft size={16} color="#059669" />
                      ) : (
                        <ArrowUpRight size={16} color="#DC2626" />
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.txDesc} numberOfLines={1}>
                        {tx.description}
                      </Text>
                      <Text style={styles.historyDate}>
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
                      styles.txAmount,
                      isCredit ? styles.txAmountCredit : styles.txAmountDebit,
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F8F7FB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#ECEAF0',
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F2F2F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: 'Inter',
    fontSize: 17,
    fontWeight: '700',
    color: '#222222',
  },
  scroll: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 50,
  },

  // Hero Card
  heroCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#ECEAF0',
    marginBottom: 16,
    ...AIRBNB.shadow.card,
  },
  heroBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginBottom: 10,
  },
  heroBadgeText: {
    fontFamily: 'Inter',
    fontSize: 11.5,
    fontWeight: '700',
    color: C.primary,
  },
  heroTitle: {
    fontFamily: 'Inter',
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
  },
  heroSubtitle: {
    fontFamily: 'Inter',
    fontSize: 16,
    fontWeight: '700',
    color: C.primary,
    marginTop: 4,
  },
  heroDescription: {
    fontFamily: 'Inter',
    fontSize: 13,
    color: '#475569',
    lineHeight: 19,
    marginTop: 8,
  },

  // Code Card
  codeCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#ECEAF0',
    marginBottom: 16,
    ...AIRBNB.shadow.card,
  },
  codeCardLabel: {
    fontFamily: 'Inter',
    fontSize: 11.5,
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
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    marginBottom: 14,
  },
  codeText: {
    fontFamily: 'Inter',
    fontSize: 22,
    fontWeight: '900',
    color: C.primary,
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
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  copyBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FAF5FF',
    borderWidth: 1.2,
    borderColor: C.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  copyBtnText: {
    fontFamily: 'Inter',
    fontSize: 13.5,
    fontWeight: '700',
    color: C.primary,
  },
  shareBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: C.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  shareBtnText: {
    fontFamily: 'Inter',
    fontSize: 13.5,
    fontWeight: '700',
    color: '#ffffff',
  },

  // How it works
  howItWorksCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#ECEAF0',
    marginBottom: 20,
    ...AIRBNB.shadow.card,
  },
  rewardSplitRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rewardColumn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
  },
  verticalDivider: {
    width: 1,
    height: 70,
    backgroundColor: '#E2E8F0',
  },
  rewardIconBgPurple: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EDE9FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  rewardIconBgGreen: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  rewardColTitle: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  rewardColAmount: {
    fontFamily: 'Inter',
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 2,
  },
  rewardColDesc: {
    fontFamily: 'Inter',
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
    textAlign: 'center',
  },

  // Statistics
  sectionHeading: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.6,
    color: '#64748B',
    textTransform: 'uppercase',
    marginBottom: 10,
    marginLeft: 2,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ECEAF0',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 68,
  },
  statCardHighlight: {
    backgroundColor: '#FAF5FF',
    borderColor: C.primary,
  },
  statValue: {
    fontFamily: 'Inter',
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  statLabel: {
    fontFamily: 'Inter',
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 2,
    textAlign: 'center',
  },

  // History & Ledger
  historyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#ECEAF0',
    ...AIRBNB.shadow.card,
  },
  emptyWrap: {
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontFamily: 'Inter',
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 10,
  },
  emptyDesc: {
    fontFamily: 'Inter',
    fontSize: 12.5,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
    maxWidth: 240,
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  historyRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  historyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  historyUser: {
    fontFamily: 'Inter',
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  historyDate: {
    fontFamily: 'Inter',
    fontSize: 11.5,
    color: '#94A3B8',
    marginTop: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 999,
  },
  statusBadgeSuccess: {
    backgroundColor: '#ECFDF5',
  },
  statusBadgePending: {
    backgroundColor: '#FFFBEB',
  },
  statusBadgeCancelled: {
    backgroundColor: '#FEF2F2',
  },
  statusBadgeText: {
    fontFamily: 'Inter',
    fontSize: 10.5,
    fontWeight: '800',
  },
  statusTextSuccess: {
    color: '#059669',
  },
  statusTextPending: {
    color: '#D97706',
  },
  statusTextCancelled: {
    color: '#DC2626',
  },
  historyReward: {
    fontFamily: 'Inter',
    fontSize: 11.5,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 2,
  },

  // Tx Ledger
  txIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txIconCredit: {
    backgroundColor: '#ECFDF5',
  },
  txIconDebit: {
    backgroundColor: '#FEF2F2',
  },
  txDesc: {
    fontFamily: 'Inter',
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  txAmount: {
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '800',
  },
  txAmountCredit: {
    color: '#059669',
  },
  txAmountDebit: {
    color: '#DC2626',
  },
});
