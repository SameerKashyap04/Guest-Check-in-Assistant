import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  Modal, StyleSheet, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import {
  Search, Bell, Check, ChevronRight, Mail,
  Shield, MapPin, Phone, User, X,
  ScanLine,
} from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useRoomsStore } from '@/store/useRoomsStore';
import { getRecentStays, getDashboardStats, DashboardStats } from '@/database/stays';
import { Button } from '@/components/Button';
import { AIRBNB } from '@/theme/airbnb';

// ─── Airbnb Dynamic Dashboard for StayMate ────────────────────────────────────
// Real-time metrics & live database guest records matching reference designs
// ─────────────────────────────────────────────────────────────────────────────

export default function DashboardScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { businessName, propertyId } = useSettingsStore();
  const { owner } = useAuthStore();
  const { rooms, fetchRooms } = useRoomsStore();

  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<DashboardStats>({
    todayCheckins: 0,
    todayCheckouts: 0,
    activeGuests: 0,
    pendingVerify: 0,
  });
  const [recentGuests, setRecentGuests] = useState<any[]>([]);
  const [selectedGuest, setSelectedGuest] = useState<any | null>(null);
  const [isSelfCheckinOpen, setIsSelfCheckinOpen] = useState(false);

  const loadData = async () => {
    try {
      await fetchRooms();
      const currentStats = await getDashboardStats(propertyId || undefined);
      setStats(currentStats);

      const stays = await getRecentStays(10, propertyId || undefined);
      const formatted = stays.map(s => ({
        id: s.id,
        guest_id: s.guest_id,
        full_name: s.full_name || 'Guest',
        id_number: s.id_number || 'N/A',
        id_type: s.id_type || 'ID',
        phone: s.phone || 'N/A',
        address: s.address || 'N/A',
        dob: s.dob || 'N/A',
        gender: s.gender || 'N/A',
        roomNumber: s.room_number || 'N/A',
        timeLabel: s.check_in_date ? formatTime(s.check_in_date) : 'Today',
        verified: !!(s.id_number && s.photo_uri),
      }));
      setRecentGuests(formatted);
    } catch (e) {
      console.error('Failed to refresh dashboard', e);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [propertyId])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const formatTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return isoString;
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return 'Today';
    }
  };

  const getInitials = (name?: string | null) => {
    if (!name) return 'GS';
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map(n => n[0].toUpperCase())
      .join('');
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const hostName = (businessName ? businessName.split(' ')[0] : '') || (owner?.businessName ? owner.businessName.split(' ')[0] : '') || (owner?.email ? owner.email.split('@')[0] : 'Host');

  const todayFormatted = new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={AIRBNB.colors.primary}
          />
        }
      >
        {/* ── Top Date & Greeting Row ── */}
        <View style={styles.topHeader}>
          <View>
            <Text style={styles.dateLabel}>{todayFormatted}</Text>
            <Text style={styles.greetingTitle}>
              {getGreeting()}, {hostName}
            </Text>
          </View>
          <View style={styles.liveSyncBadge}>
            <View style={styles.liveSyncDot} />
            <Text style={styles.liveSyncText}>Live Sync</Text>
          </View>
        </View>

        {/* ── Search Bar & Notification Bell Row ── */}
        <View style={styles.searchRow}>
          <TouchableOpacity
            style={styles.searchPill}
            activeOpacity={0.8}
            onPress={() => router.push('/search')}
          >
            <Search size={18} color={AIRBNB.colors.muted} />
            <Text style={styles.searchPlaceholder}>Search guests, rooms, IDs...</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.bellBtn}
            activeOpacity={0.8}
            onPress={() => router.push('/reports')}
          >
            <Bell size={18} color={AIRBNB.colors.ink} />
            {stats.pendingVerify > 0 && <View style={styles.bellDot} />}
          </TouchableOpacity>
        </View>

        {/* ── 2x2 Dynamic Metric Cards ── */}
        <View style={styles.metricsGrid}>
          {/* Today's Check-ins */}
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>TODAY'S CHECK-INS</Text>
            <Text style={styles.metricVal}>{stats.todayCheckins}</Text>
          </View>
          {/* Today's Check-outs */}
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>TODAY'S CHECK-OUTS</Text>
            <Text style={styles.metricVal}>{stats.todayCheckouts}</Text>
          </View>
          {/* Active Guests (Rausch Pink) */}
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>ACTIVE GUESTS</Text>
            <Text style={[styles.metricVal, { color: AIRBNB.colors.primary }]}>
              {stats.activeGuests}
            </Text>
          </View>
          {/* Pending Verify */}
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>PENDING VERIFY</Text>
            <Text style={styles.metricVal}>{stats.pendingVerify}</Text>
          </View>
        </View>

        {/* ── Recent Check-ins Header ── */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Recent check-ins</Text>
          {recentGuests.length > 0 && (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => router.push('/search')}
            >
              <Text style={styles.viewAllLink}>View all</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ── Dynamic Guest Row List or Empty State ── */}
        {recentGuests.length > 0 ? (
          <View style={styles.guestList}>
            {recentGuests.map((guest, idx) => (
              <TouchableOpacity
                key={guest.id || idx}
                style={[
                  styles.guestRow,
                  idx === recentGuests.length - 1 && { borderBottomWidth: 0 },
                ]}
                activeOpacity={0.7}
                onPress={() => setSelectedGuest(guest)}
              >
                {/* Pink Gradient Avatar */}
                <View style={styles.avatarGradient}>
                  <Text style={styles.avatarText}>{getInitials(guest.full_name)}</Text>
                </View>

                {/* Guest Info */}
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    <Text style={styles.guestName} numberOfLines={1}>
                      {guest.full_name}
                    </Text>
                    {guest.verified && (
                      <Check size={14} color={AIRBNB.colors.emerald} strokeWidth={2.5} />
                    )}
                  </View>
                  <Text style={styles.guestMeta} numberOfLines={1}>
                    Room {guest.roomNumber} · {guest.id_number}
                  </Text>
                </View>

                {/* Time & Chevron */}
                <Text style={styles.timeLabel}>{guest.timeLabel}</Text>
                <ChevronRight size={17} color={AIRBNB.colors.mutedSoft} />
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles.emptyStateCard}>
            <View style={styles.emptyIconWell}>
              <ScanLine size={24} color={AIRBNB.colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>No check-ins yet today</Text>
            <Text style={styles.emptySubtitle}>
              Tap below to scan a guest ID or enter details manually.
            </Text>
            <Button
              label="+ Check in new guest"
              variant="primary"
              style={{ marginTop: 12, height: 44 }}
              onPress={() => router.push('/(tabs)/scanner')}
            />
          </View>
        )}

        {/* ── Import Self Check-in Card ── */}
        <TouchableOpacity
          style={styles.importCard}
          activeOpacity={0.8}
          onPress={() => setIsSelfCheckinOpen(true)}
        >
          <View style={styles.mailIconWell}>
            <Mail size={18} color={AIRBNB.colors.ink} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.importTitle}>Import self check-in</Text>
            <Text style={styles.importSubtitle}>
              Paste WhatsApp guest code or view online submissions
            </Text>
          </View>
          <ChevronRight size={18} color={AIRBNB.colors.mutedSoft} />
        </TouchableOpacity>
      </ScrollView>

      {/* ══════════════════════════════════════════════════
          GUEST INSPECTION BOTTOM SHEET
      ══════════════════════════════════════════════════ */}
      <Modal visible={!!selectedGuest} transparent animationType="slide">
        <TouchableOpacity
          style={styles.scrim}
          activeOpacity={1}
          onPress={() => setSelectedGuest(null)}
        >
          <TouchableOpacity
            style={styles.sheet}
            activeOpacity={1}
            onPress={e => e.stopPropagation?.()}
          >
            <View style={styles.sheetHandle} />
            {selectedGuest && (
              <>
                <View style={styles.sheetHeader}>
                  <View>
                    <Text style={styles.sheetTitle}>{selectedGuest.full_name}</Text>
                    <Text style={styles.sheetSubtitle}>
                      Room {selectedGuest.roomNumber} · Checked in {selectedGuest.timeLabel}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.iconBtn}
                    onPress={() => setSelectedGuest(null)}
                  >
                    <X size={16} color={AIRBNB.colors.ink} />
                  </TouchableOpacity>
                </View>

                {/* Details Breakdown */}
                <View style={styles.detailsList}>
                  <View style={styles.detailRow}>
                    <Shield size={16} color={AIRBNB.colors.muted} />
                    <Text style={styles.detailKey}>{selectedGuest.id_type || 'ID'}:</Text>
                    <Text style={styles.detailVal}>{selectedGuest.id_number}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <User size={16} color={AIRBNB.colors.muted} />
                    <Text style={styles.detailKey}>Gender / DOB:</Text>
                    <Text style={styles.detailVal}>
                      {selectedGuest.gender || 'N/A'} · {selectedGuest.dob || 'N/A'}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Phone size={16} color={AIRBNB.colors.muted} />
                    <Text style={styles.detailKey}>Phone:</Text>
                    <Text style={styles.detailVal}>{selectedGuest.phone || 'N/A'}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <MapPin size={16} color={AIRBNB.colors.muted} />
                    <Text style={styles.detailKey}>Address:</Text>
                    <Text style={styles.detailVal} numberOfLines={2}>
                      {selectedGuest.address || 'N/A'}
                    </Text>
                  </View>
                </View>

                {/* Action Buttons */}
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
                  <Button
                    label="Share Form C"
                    variant="secondary"
                    style={{ flex: 1 }}
                    onPress={() => {
                      setSelectedGuest(null);
                      router.push('/reports');
                    }}
                  />
                  <Button
                    label="Done"
                    variant="primary"
                    style={{ flex: 1 }}
                    onPress={() => setSelectedGuest(null)}
                  />
                </View>
              </>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* ══════════════════════════════════════════════════
          SELF CHECK-IN IMPORT MODAL
      ══════════════════════════════════════════════════ */}
      <Modal visible={isSelfCheckinOpen} transparent animationType="slide">
        <TouchableOpacity
          style={styles.scrim}
          activeOpacity={1}
          onPress={() => setIsSelfCheckinOpen(false)}
        >
          <TouchableOpacity
            style={styles.sheet}
            activeOpacity={1}
            onPress={e => e.stopPropagation?.()}
          >
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Import Self Check-in</Text>
              <TouchableOpacity
                style={styles.iconBtn}
                onPress={() => setIsSelfCheckinOpen(false)}
              >
                <X size={16} color={AIRBNB.colors.ink} />
              </TouchableOpacity>
            </View>

            <Text style={{ ...AIRBNB.typography.bodySm, color: AIRBNB.colors.muted, marginBottom: 16 }}>
              Guests can scan your property QR code or submit details online via their self-check-in link.
            </Text>

            <Button
              label="View Pending Registrations"
              variant="primary"
              onPress={() => {
                setIsSelfCheckinOpen(false);
                router.push('/registrations');
              }}
            />
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: AIRBNB.colors.canvas,
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 110,
  },

  // Top Header
  topHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingTop: 18,
  },
  dateLabel: {
    ...AIRBNB.typography.caption,
    color: AIRBNB.colors.muted,
  },
  greetingTitle: {
    ...AIRBNB.typography.displayLg,
    color: AIRBNB.colors.ink,
    marginTop: 2,
  },
  liveSyncBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: AIRBNB.radius.full,
    backgroundColor: AIRBNB.colors.emeraldBg,
    marginTop: 4,
  },
  liveSyncDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: AIRBNB.colors.emerald,
  },
  liveSyncText: {
    ...AIRBNB.typography.micro,
    color: AIRBNB.colors.emerald,
    fontWeight: '700',
  },

  // Search Row
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 16,
  },
  searchPill: {
    flex: 1,
    height: 48,
    borderRadius: AIRBNB.radius.full,
    borderWidth: 1,
    borderColor: AIRBNB.colors.hairline,
    backgroundColor: AIRBNB.colors.canvas,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 10,
    ...AIRBNB.shadow.card,
  },
  searchPlaceholder: {
    ...AIRBNB.typography.bodySm,
    color: AIRBNB.colors.muted,
  },
  bellBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: AIRBNB.colors.hairline,
    backgroundColor: AIRBNB.colors.canvas,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    ...AIRBNB.shadow.card,
  },
  bellDot: {
    position: 'absolute',
    top: 12,
    right: 13,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: AIRBNB.colors.primary,
  },

  // 2x2 Metrics Grid
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 16,
  },
  metricCard: {
    width: '48.5%',
    backgroundColor: AIRBNB.colors.canvas,
    borderWidth: 1,
    borderColor: AIRBNB.colors.hairlineSoft,
    borderRadius: AIRBNB.radius.md,
    padding: 14,
    ...AIRBNB.shadow.card,
  },
  metricLabel: {
    ...AIRBNB.typography.micro,
    color: AIRBNB.colors.muted,
  },
  metricVal: {
    ...AIRBNB.typography.displayLg,
    color: AIRBNB.colors.ink,
    marginTop: 4,
  },

  // Section Header
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 22,
    marginBottom: 10,
  },
  sectionTitle: {
    ...AIRBNB.typography.titleMd,
    color: AIRBNB.colors.ink,
  },
  viewAllLink: {
    ...AIRBNB.typography.bodySm,
    fontWeight: '600',
    color: AIRBNB.colors.ink,
  },

  // Guest Row List
  guestList: {
    backgroundColor: AIRBNB.colors.canvas,
    borderWidth: 1,
    borderColor: AIRBNB.colors.hairlineSoft,
    borderRadius: AIRBNB.radius.md,
    overflow: 'hidden',
    ...AIRBNB.shadow.card,
  },
  guestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: AIRBNB.colors.hairlineSoft,
  },
  avatarGradient: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#ffd1da',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#8a0030',
  },
  guestName: {
    ...AIRBNB.typography.titleSm,
    color: AIRBNB.colors.ink,
  },
  guestMeta: {
    ...AIRBNB.typography.bodySm,
    color: AIRBNB.colors.muted,
    marginTop: 2,
  },
  timeLabel: {
    ...AIRBNB.typography.caption,
    color: AIRBNB.colors.muted,
  },

  // Empty State Card
  emptyStateCard: {
    backgroundColor: AIRBNB.colors.canvas,
    borderWidth: 1,
    borderColor: AIRBNB.colors.hairlineSoft,
    borderRadius: AIRBNB.radius.md,
    padding: 20,
    alignItems: 'center',
    ...AIRBNB.shadow.card,
  },
  emptyIconWell: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: AIRBNB.colors.surfaceStrong,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  emptyTitle: {
    ...AIRBNB.typography.titleMd,
    color: AIRBNB.colors.ink,
  },
  emptySubtitle: {
    ...AIRBNB.typography.bodySm,
    color: AIRBNB.colors.muted,
    textAlign: 'center',
    marginTop: 4,
    maxWidth: 260,
  },

  // Import Card
  importCard: {
    backgroundColor: AIRBNB.colors.canvas,
    borderWidth: 1,
    borderColor: AIRBNB.colors.hairlineSoft,
    borderRadius: AIRBNB.radius.md,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 16,
    ...AIRBNB.shadow.card,
  },
  mailIconWell: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: AIRBNB.colors.surfaceStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  importTitle: {
    ...AIRBNB.typography.titleSm,
    color: AIRBNB.colors.ink,
  },
  importSubtitle: {
    ...AIRBNB.typography.bodySm,
    color: AIRBNB.colors.muted,
    marginTop: 2,
  },

  // Sheet
  scrim: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: AIRBNB.colors.canvas,
    borderTopLeftRadius: AIRBNB.radius.sheet,
    borderTopRightRadius: AIRBNB.radius.sheet,
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 28,
    maxHeight: '84%',
    ...AIRBNB.shadow.sheet,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: AIRBNB.radius.full,
    backgroundColor: AIRBNB.colors.hairline,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 6,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sheetTitle: {
    ...AIRBNB.typography.titleMd,
    color: AIRBNB.colors.ink,
  },
  sheetSubtitle: {
    ...AIRBNB.typography.bodySm,
    color: AIRBNB.colors.muted,
    marginTop: 2,
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: AIRBNB.colors.surfaceStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailsList: {
    backgroundColor: AIRBNB.colors.surfaceSoft,
    borderRadius: AIRBNB.radius.md,
    padding: 14,
    gap: 10,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailKey: {
    ...AIRBNB.typography.bodySm,
    fontWeight: '600',
    color: AIRBNB.colors.ink,
  },
  detailVal: {
    ...AIRBNB.typography.bodySm,
    color: AIRBNB.colors.muted,
    flex: 1,
  },
});
