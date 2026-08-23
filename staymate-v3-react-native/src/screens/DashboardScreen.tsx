import React from 'react';
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Linking,
} from 'react-native';
import { C, R, shadow } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';
import { Icon } from '../components/Icon';
import { GUESTS } from '../data';
import { PrimaryButton } from '../components/Ui';

const StayMateLogo = require('../../assets/staymate-logo.png');

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function getTodayStr(): string {
  return new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
}

export function DashboardScreen({
  guests = GUESTS as any,
  onSearch,
  onReports,
  onGuest,
  onSelfCheckin,
}: {
  guests?: any[];
  onSearch: () => void;
  onReports: () => void;
  onGuest: (id: number) => void;
  onSelfCheckin: () => void;
}) {
  const { isDark, colors } = useTheme();
  const activeCount = guests.filter((g) => g.status !== 'checked_out' && !g.checkedOut).length;
  const checkedOutCount = guests.filter((g) => g.status === 'checked_out' || g.checkedOut).length;
  const pendingVerifyCount = guests.filter((g) => !g.verified).length;
  const totalCheckinsToday = guests.length;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.canvas }}
      contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 130 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header row: StayMate Logo + live sync + date & greeting */}
      <View style={{ paddingTop: 18 }}>
        <View style={s.topRow}>
          <Image
            source={StayMateLogo}
            style={s.dashLogo}
            resizeMode="contain"
          />
          <View style={[s.syncBadge, isDark && { backgroundColor: '#064E3B' }]}>
            <View style={s.syncDot} />
            <Text style={[s.syncText, isDark && { color: '#34D399' }]}>Live Sync</Text>
          </View>
        </View>
        <Text style={[s.dateText, { color: colors.muted }]}>{getTodayStr()}</Text>
        <Text style={[s.h1, { color: colors.ink }]}>{getGreeting()}, Meera</Text>
      </View>

      {/* Search + bell */}
      <View style={s.searchRow}>
        <TouchableOpacity
          onPress={onSearch}
          activeOpacity={0.8}
          style={[
            s.searchPill,
            {
              backgroundColor: isDark ? '#18181B' : '#fff',
              borderColor: isDark ? '#27272A' : '#dddddd',
            },
          ]}
        >
          <Icon name="search" size={18} color={colors.muted} />
          <Text style={[s.searchPlaceholder, { color: colors.mutedSoft }]}>Search guests, rooms, IDs…</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onReports}
          activeOpacity={0.8}
          style={[
            s.reportsBtn,
            {
              backgroundColor: isDark ? '#18181B' : '#fff',
              borderColor: isDark ? '#27272A' : '#dddddd',
            },
          ]}
        >
          <Icon name="bell" size={20} color={colors.ink} />
          <View style={[s.alertDot, { backgroundColor: colors.primary }]} />
        </TouchableOpacity>
      </View>

      {/* Metrics */}
      <View style={s.metricsGrid}>
        {([
          ["TODAY'S CHECK-INS", String(totalCheckinsToday)],
          ["TODAY'S CHECK-OUTS", String(checkedOutCount)],
          ['ACTIVE GUESTS', String(activeCount)],
          ['PENDING VERIFY', String(pendingVerifyCount)],
        ] as [string, string][]).map(([label, value], i) => (
          <View
            key={label}
            style={[
              s.metricCard,
              {
                backgroundColor: isDark ? '#18181B' : '#fff',
                borderColor: isDark ? '#27272A' : '#ebebeb',
              },
            ]}
          >
            <Text style={[s.metricLabel, { color: colors.muted }]}>{label}</Text>
            <Text style={[s.metricNum, { color: colors.ink }, i === 2 && { color: colors.primary }]}>{value}</Text>
          </View>
        ))}
      </View>

      {/* Recent check-ins */}
      <View style={s.recentHead}>
        <Text style={[s.sectionTitle, { color: colors.ink }]}>Recent check-ins</Text>
        <TouchableOpacity activeOpacity={0.7} onPress={onSearch}>
          <Text style={[s.viewAll, { color: colors.primary }]}>View all</Text>
        </TouchableOpacity>
      </View>

      <View>
        {guests.slice(0, 3).map((g, idx) => {
          const isCheckedOut = g.status === 'checked_out' || g.checkedOut;
          return (
            <View key={g.id}>
              <TouchableOpacity
                onPress={() => onGuest(g.id)}
                activeOpacity={0.75}
                style={s.guestRow}
              >
                <View
                  style={[
                    s.avatar,
                    { backgroundColor: isDark ? '#2E1065' : '#EDE9FE' },
                    isCheckedOut && { backgroundColor: isDark ? '#27272A' : '#F1F5F9' },
                  ]}
                >
                  <Text
                    style={[
                      s.avatarText,
                      { color: isDark ? '#DDD6FE' : '#5B21B6' },
                      isCheckedOut && { color: '#64748B' },
                    ]}
                  >
                    {g.name ? g.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() : 'GS'}
                  </Text>
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={s.nameRow}>
                    <Text style={[s.guestName, { color: colors.ink }]}>{g.name}</Text>
                    {isCheckedOut ? (
                      <View style={{ backgroundColor: isDark ? '#27272A' : '#F1F5F9', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4, marginLeft: 4 }}>
                        <Text style={{ fontSize: 9.5, fontWeight: '700', color: '#64748B' }}>OUT</Text>
                      </View>
                    ) : g.verified ? (
                      <Icon name="check" size={14} color={C.emerald} />
                    ) : null}
                  </View>
                  <Text style={[s.guestSub, { color: colors.muted }]}>
                    Room {g.room} · {g.idNum || 'Verified'}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end', flexShrink: 0 }}>
                  <Text style={[s.guestTime, { color: colors.muted }, isCheckedOut && { color: '#64748B', fontWeight: '600' }]}>
                    {isCheckedOut ? 'Checked out' : g.time}
                  </Text>
                </View>
                <Icon name="chevronRight" size={18} color={colors.mutedSoft} />
              </TouchableOpacity>
              {idx < Math.min(guests.length, 3) - 1 && (
                <View style={[s.divider, { backgroundColor: isDark ? '#27272A' : '#ebebeb' }]} />
              )}
            </View>
          );
        })}
      </View>

      {/* Self check-in card */}
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onSelfCheckin}
        style={[
          s.selfCard,
          {
            backgroundColor: isDark ? '#18181B' : '#fff',
            borderColor: isDark ? '#27272A' : '#ebebeb',
          },
        ]}
      >
        <View style={[s.selfIcon, { backgroundColor: isDark ? '#27272A' : '#f2f2f2' }]}>
          <Icon name="qr" size={18} color={colors.ink} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[s.selfTitle, { color: colors.ink }]}>Self check-in QR & link</Text>
          <Text style={[s.selfSub, { color: colors.muted }]}>Share & manage online check-ins</Text>
        </View>
        <PrimaryButton
          label="Share"
          icon="share"
          onPress={onSelfCheckin}
          style={s.selfShareBtn}
        />
      </TouchableOpacity>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  dateText: {
    fontFamily: 'Inter',
    fontSize: 13.5,
    fontWeight: '400',
    marginBottom: 2,
  },
  syncBadge: {
    backgroundColor: '#ECFDF3',
    borderRadius: R.full,
    paddingHorizontal: 10,
    paddingVertical: 5,
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  syncDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#17B26A',
  },
  syncText: {
    fontFamily: 'Inter',
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  h1: {
    fontFamily: 'Inter',
    fontSize: 22,
    fontWeight: '600',
    letterSpacing: -0.4,
    lineHeight: 27,
    marginTop: 2,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 18,
  },
  searchPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: R.full,
    paddingHorizontal: 18,
    height: 48,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  searchPlaceholder: {
    fontFamily: 'Inter',
    fontSize: 13.5,
    fontWeight: '400',
  },
  reportsBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  alertDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  metricsGrid: {
    marginTop: 20,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metricCard: {
    width: '48.4%',
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  metricLabel: {
    fontFamily: 'Inter',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
  metricNum: {
    fontFamily: 'Inter',
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginTop: 6,
  },
  recentHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 26,
    marginBottom: 4,
  },
  sectionTitle: {
    fontFamily: 'Inter',
    fontSize: 17,
    fontWeight: '700',
  },
  viewAll: {
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '600',
  },
  guestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: 'Inter',
    fontSize: 15,
    fontWeight: '700',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  guestName: {
    fontFamily: 'Inter',
    fontSize: 15,
    fontWeight: '500',
  },
  guestSub: {
    fontFamily: 'Inter',
    fontSize: 13.5,
    fontWeight: '400',
    marginTop: 2,
  },
  guestTime: {
    fontFamily: 'Inter',
    fontSize: 12.5,
    fontWeight: '500',
  },
  divider: {
    height: 1,
  },
  selfCard: {
    marginTop: 16,
    padding: 10,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    shadowColor: '#111827',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  selfIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selfTitle: {
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 18,
  },
  selfSub: {
    fontFamily: 'Inter',
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  },
  selfShareBtn: {
    height: 32,
    paddingHorizontal: 10,
    borderRadius: R.full,
    gap: 5,
  },
  dashLogo: {
    width: 135,
    height: 24,
  },
});
