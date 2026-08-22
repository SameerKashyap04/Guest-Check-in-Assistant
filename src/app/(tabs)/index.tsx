import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Platform,
  Modal,
  Image,
  Share,
  ActivityIndicator,
  StyleSheet,
  Alert,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { C, R } from '@/theme/tokens';
import { Icon } from '@/components/v3/Icon';
import { PrimaryButton, SecondaryButton, Field } from '@/components/v3/Ui';

const StayMateLogo = require('../../../assets/images/staymate-logo.png');
import { openDatabase } from '@/database';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useRoomsStore } from '@/store/useRoomsStore';
import {
  subscribeToPropertyCheckins,
  subscribeToPendingCheckinCount,
} from '@/services/firebaseSync';
import {
  createMultipleGuestsAndStay,
  autoCheckoutExpiredStays,
  checkoutGuestOrRemoveFromRoom,
} from '@/database/stays';
import { parseCheckinImportText } from '@/utils/checkinImporter';
import { useTranslation } from 'react-i18next';
import { SelfCheckinQrModal } from '@/components/v3/SelfCheckinQrModal';

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function getTodayStr(): string {
  return new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const router = useRouter();
  const {
    businessName,
    userName: customUserName,
    propertyId,
    ownerId,
    storageMode,
    getShareableLink,
  } = useSettingsStore();
  const { owner } = useAuthStore();
  const { rooms, fetchRooms } = useRoomsStore();

  const [refreshing, setRefreshing] = useState(false);
  const [recentGuests, setRecentGuests] = useState<any[]>([]);
  const [selectedGuest, setSelectedGuest] = useState<any | null>(null);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [isImportModalVisible, setIsImportModalVisible] = useState(false);
  const [importText, setImportText] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  const [overviewStats, setOverviewStats] = useState({
    todayCheckins: 0,
    todayCheckouts: 0,
    activeGuests: 0,
    pendingVerif: 0,
  });

  const userName =
    (customUserName && customUserName.trim()) ||
    owner?.businessName ||
    businessName ||
    'Owner';

  const fetchGuests = async () => {
    try {
      await autoCheckoutExpiredStays();
      const activePropertyId = propertyId || 'HS-DEFAULT';
      const db = await openDatabase();
      const guests = await db.getAllAsync(
        `
        SELECT g.*, r.room_number, r.room_type, s.check_in_date, s.check_out_date
        FROM guests g
        LEFT JOIN stays s ON s.guest_id = g.id
        LEFT JOIN rooms r ON r.id = s.room_id
        WHERE g.property_id = ? OR g.property_id IS NULL OR g.property_id = ''
        ORDER BY g.id DESC LIMIT 10
      `,
        [activePropertyId]
      );
      setRecentGuests(guests as any[]);
      fetchRooms();

      // Dynamic calculation for Today's Overview metrics
      const todayIso = new Date().toISOString().split('T')[0];
      const todayDateObj = new Date();
      const tYear = todayDateObj.getFullYear();
      const tMonth = String(todayDateObj.getMonth() + 1).padStart(2, '0');
      const tDay = String(todayDateObj.getDate()).padStart(2, '0');
      const todayIndian = `${tDay}/${tMonth}/${tYear}`;

      // 1. Today's Check-ins Count
      const checkinsRes: any = await db.getFirstAsync(
        `
        SELECT COUNT(*) as count FROM stays s
        JOIN guests g ON g.id = s.guest_id
        WHERE (g.property_id = ? OR g.property_id IS NULL)
          AND (s.check_in_date LIKE ? OR s.check_in_date LIKE ? OR s.check_in_date LIKE ?)
      `,
        [activePropertyId, `${todayIso}%`, `${todayIndian}%`, `%${todayIso}%`]
      );

      // 2. Today's Check-outs Count
      const checkoutsRes: any = await db.getFirstAsync(
        `
        SELECT COUNT(*) as count FROM stays s
        JOIN guests g ON g.id = s.guest_id
        WHERE (g.property_id = ? OR g.property_id IS NULL)
          AND s.status = 'completed' 
          AND (s.check_out_date LIKE ? OR s.check_out_date LIKE ? OR s.check_out_date LIKE ?)
      `,
        [activePropertyId, `${todayIso}%`, `${todayIndian}%`, `%${todayIso}%`]
      );

      // 3. Current Active Guests Count
      const activeRes: any = await db.getFirstAsync(
        `
        SELECT COUNT(*) as count FROM stays s
        JOIN guests g ON g.id = s.guest_id
        WHERE (g.property_id = ? OR g.property_id IS NULL)
          AND (s.status IS NULL OR s.status = 'active')
      `,
        [activePropertyId]
      );

      setOverviewStats((prev) => ({
        ...prev,
        todayCheckins: checkinsRes?.count || 0,
        todayCheckouts: checkoutsRes?.count || 0,
        activeGuests: activeRes?.count || 0,
      }));
    } catch (e) {
      console.error('Failed to fetch guests and overview metrics', e);
    }
  };

  // Real-time Cloud Sync Listener for Web Self Check-in Submissions
  useEffect(() => {
    if (!propertyId) return;
    const unsubscribe = subscribeToPropertyCheckins(
      propertyId,
      () => {
        fetchGuests();
      },
      ownerId,
      storageMode === 'local'
    );
    return () => unsubscribe();
  }, [propertyId, ownerId, storageMode]);

  // Live pending count listener
  useEffect(() => {
    if (!propertyId && !ownerId) return;
    const unsubscribeCount = subscribeToPendingCheckinCount(
      propertyId || '',
      ownerId || '',
      (count) => {
        setOverviewStats((prev) => ({ ...prev, pendingVerif: count }));
      }
    );
    return () => unsubscribeCount();
  }, [propertyId, ownerId]);

  useFocusEffect(
    useCallback(() => {
      fetchGuests();
    }, [])
  );

  const handleShareSelfCheckin = () => {
    setIsQrModalOpen(true);
  };

  const handleExecuteImport = async () => {
    if (!importText.trim()) {
      Alert.alert('Empty Input', 'Please paste the check-in message or code.');
      return;
    }
    const parsed = parseCheckinImportText(importText.trim());
    if (!parsed || !parsed.fullName) {
      Alert.alert(
        'Invalid Check-in Code',
        'Could not parse guest check-in details. Please make sure to copy the full message from WhatsApp.'
      );
      return;
    }

    try {
      setIsImporting(true);
      let roomId = rooms.length > 0 ? rooms[0].id : 101;
      const matchedRoom = rooms.find(
        (r) => r.room_number === parsed.roomNumber
      );
      if (matchedRoom) roomId = matchedRoom.id;

      const todayStr = new Date().toISOString().split('T')[0];

      await createMultipleGuestsAndStay(
        [
          {
            full_name: parsed.fullName,
            id_number: parsed.idNumber || 'N/A',
            address: parsed.address || '',
            phone: parsed.phone || '',
            photo_uri: '',
            back_photo_uri: '',
            selfie_uri: '',
            property_id: propertyId || 'HS-8821',
            id_type: parsed.idType || 'Aadhaar',
            dob: '',
            gender: 'Other',
            pin_code: parsed.pinCode || '',
          },
        ],
        {
          room_id: roomId,
          check_in_date: todayStr,
          check_out_date: todayStr,
        }
      );

      await fetchGuests();
      setIsImportModalVisible(false);
      setImportText('');
      Alert.alert(
        'Check-in Imported!',
        `Guest ${parsed.fullName} assigned to Room ${parsed.roomNumber} has been saved to your app.`
      );
    } catch (e: any) {
      console.error('Manual import error', e);
      Alert.alert(
        'Import Failed',
        e?.message || 'Could not save imported check-in.'
      );
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <View style={[s.screen, { paddingTop: insets.top }]}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await fetchGuests();
              setRefreshing(false);
            }}
          />
        }
      >
        {/* Header row: StayMate Logo + live sync badge + date & greeting */}
        <View style={s.headerSection}>
          <View style={s.topRow}>
            <Image
              source={StayMateLogo}
              style={s.dashLogo}
              resizeMode="contain"
            />
            <View style={s.syncBadge}>
              <View style={s.syncDot} />
              <Text style={s.syncText}>Live Sync</Text>
            </View>
          </View>
          <Text style={s.dateText}>{getTodayStr()}</Text>
          <Text style={s.h1}>
            {getGreeting()}, {userName}
          </Text>
        </View>

        {/* Search pill + notifications button */}
        <View style={s.searchRow}>
          <TouchableOpacity
            onPress={() => router.push('/search')}
            activeOpacity={0.8}
            style={s.searchPill}
          >
            <Icon name="search" size={18} color={C.muted} />
            <Text style={s.searchPlaceholder}>Search guests, rooms, IDs…</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push('/reports')}
            activeOpacity={0.8}
            style={s.reportsBtn}
          >
            <Icon name="bell" size={20} color={C.ink} />
            {overviewStats.pendingVerif > 0 && <View style={s.alertDot} />}
          </TouchableOpacity>
        </View>

        {/* 4 Metrics Grid */}
        <View style={s.metricsGrid}>
          {[
            ["TODAY'S CHECK-INS", String(overviewStats.todayCheckins)],
            ["TODAY'S CHECK-OUTS", String(overviewStats.todayCheckouts)],
            ['ACTIVE GUESTS', String(overviewStats.activeGuests)],
            ['PENDING VERIFY', String(overviewStats.pendingVerif)],
          ].map(([label, value], i) => (
            <View key={label} style={s.metricCard}>
              <Text style={s.metricLabel}>{label}</Text>
              <Text style={[s.metricNum, i === 2 && { color: C.primary }]}>
                {value}
              </Text>
            </View>
          ))}
        </View>

        {/* Recent Check-ins */}
        <View style={s.recentHead}>
          <Text style={s.sectionTitle}>Recent check-ins</Text>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push('/registrations')}
          >
            <Text style={s.viewAll}>View all</Text>
          </TouchableOpacity>
        </View>

        <View style={s.guestListCard}>
          {recentGuests.length === 0 ? (
            <View style={{ paddingVertical: 24, alignItems: 'center' }}>
              <Text style={{ fontFamily: 'Inter', fontSize: 13.5, color: C.mutedSoft }}>
                No recent check-ins recorded yet
              </Text>
            </View>
          ) : (
            recentGuests.map((g, index) => {
              const initials = (g.full_name || 'Guest')
                .split(' ')
                .map((n: string) => n[0])
                .join('')
                .slice(0, 2)
                .toUpperCase();

              const timeStr = g.check_in_date || 'Today';

              return (
                <View key={g.id || index}>
                  <TouchableOpacity
                    onPress={() => setSelectedGuest(g)}
                    activeOpacity={0.75}
                    style={s.guestRow}
                  >
                    <View style={s.avatar}>
                      <Text style={s.avatarText}>{initials}</Text>
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <View style={s.nameRow}>
                        <Text style={s.guestName} numberOfLines={1}>
                          {g.full_name}
                        </Text>
                        <Icon name="check" size={14} color={C.emerald} />
                      </View>
                      <Text style={s.guestSub} numberOfLines={1}>
                        Room {g.room_number || 'N/A'} · {g.id_number || 'ID Verified'}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end', flexShrink: 0 }}>
                      <Text style={s.guestTime}>{timeStr}</Text>
                    </View>
                    <Icon name="chevronRight" size={18} color={C.mutedSoft} />
                  </TouchableOpacity>
                  {index < recentGuests.length - 1 && <View style={s.divider} />}
                </View>
              );
            })
          )}
        </View>

        {/* Self check-in card */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => router.push('/self-checkin')}
          style={s.selfCard}
        >
          <View style={s.selfIcon}>
            <Icon name="qr" size={18} color={C.ink} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={s.selfTitle}>Self check-in QR & link</Text>
            <Text style={s.selfSub}>Share & manage online check-ins</Text>
          </View>
          <PrimaryButton
            label="Share"
            icon="share"
            onPress={handleShareSelfCheckin}
            style={s.selfShareBtn}
          />
        </TouchableOpacity>
      </ScrollView>

      {/* Guest Details Bottom Sheet Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={!!selectedGuest}
        onRequestClose={() => setSelectedGuest(null)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setSelectedGuest(null)}
          style={s.modalOverlay}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation?.()}
            style={s.sheetContent}
          >
            {selectedGuest && (
              <View>
                <View style={s.sheetHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <View style={s.avatarLarge}>
                      <Text style={s.avatarLargeText}>
                        {(selectedGuest.full_name || 'G')
                          .split(' ')
                          .map((n: string) => n[0])
                          .join('')
                          .slice(0, 2)
                          .toUpperCase()}
                      </Text>
                    </View>
                    <View>
                      <Text style={s.sheetTitle}>{selectedGuest.full_name}</Text>
                      <Text style={s.sheetSub}>Verified Registration</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={() => setSelectedGuest(null)}
                    style={s.sheetClose}
                  >
                    <Icon name="x" size={18} color={C.ink} />
                  </TouchableOpacity>
                </View>

                <ScrollView
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ paddingBottom: 20 }}
                >
                  {/* Selfie Image if present */}
                  {selectedGuest.selfie_uri ? (
                    <View style={{ marginBottom: 14 }}>
                      <Text style={s.sheetSectionLabel}>Guest Selfie</Text>
                      <Image
                        source={{ uri: selectedGuest.selfie_uri }}
                        style={s.docPhoto}
                        resizeMode="cover"
                      />
                    </View>
                  ) : null}

                  {/* ID Card Photos */}
                  {(selectedGuest.photo_uri || selectedGuest.back_photo_uri) && (
                    <View style={{ marginBottom: 14 }}>
                      <Text style={s.sheetSectionLabel}>ID Document Photos</Text>
                      <View style={{ gap: 8 }}>
                        {selectedGuest.photo_uri && (
                          <Image
                            source={{ uri: selectedGuest.photo_uri }}
                            style={s.docPhoto}
                            resizeMode="cover"
                          />
                        )}
                        {selectedGuest.back_photo_uri && (
                          <Image
                            source={{ uri: selectedGuest.back_photo_uri }}
                            style={s.docPhoto}
                            resizeMode="cover"
                          />
                        )}
                      </View>
                    </View>
                  )}

                  {/* Details Card */}
                  <View style={s.detailsCard}>
                    {selectedGuest.room_number && (
                      <View style={s.detailRow}>
                        <Icon name="bed" size={18} color={C.muted} />
                        <View style={{ flex: 1 }}>
                          <Text style={s.detailLabel}>Assigned Room</Text>
                          <Text style={s.detailValue}>
                            Room {selectedGuest.room_number} (
                            {selectedGuest.room_type || 'Standard'})
                          </Text>
                        </View>
                      </View>
                    )}

                    <View style={s.detailRow}>
                      <Icon name="aadhaar" size={18} color={C.muted} />
                      <View style={{ flex: 1 }}>
                        <Text style={s.detailLabel}>
                          Document ID ({selectedGuest.id_type || 'ID'})
                        </Text>
                        <Text style={s.detailValue}>
                          {selectedGuest.id_number || 'N/A'}
                        </Text>
                      </View>
                    </View>

                    <View style={s.detailRow}>
                      <Icon name="phone" size={18} color={C.muted} />
                      <View style={{ flex: 1 }}>
                        <Text style={s.detailLabel}>Phone Number</Text>
                        <Text style={s.detailValue}>
                          {selectedGuest.phone || 'N/A'}
                        </Text>
                      </View>
                    </View>

                    <View style={s.detailRow}>
                      <Icon name="mapPin" size={18} color={C.muted} />
                      <View style={{ flex: 1 }}>
                        <Text style={s.detailLabel}>Address</Text>
                        <Text style={s.detailValue}>
                          {[
                            selectedGuest.address,
                            selectedGuest.city,
                            selectedGuest.state,
                            selectedGuest.country,
                            selectedGuest.pin_code,
                          ]
                            .filter(Boolean)
                            .join(', ') || 'N/A'}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {selectedGuest.room_number && (
                    <TouchableOpacity
                      activeOpacity={0.85}
                      onPress={() => {
                        const gName = selectedGuest.full_name || 'Guest';
                        const rNum = selectedGuest.room_number;
                        Alert.alert(
                          'Check-out Guest?',
                          `Are you sure you want to check out ${gName} from Room ${rNum}?`,
                          [
                            { text: 'Cancel', style: 'cancel' },
                            {
                              text: 'Check-out Guest',
                              style: 'destructive',
                              onPress: async () => {
                                try {
                                  await checkoutGuestOrRemoveFromRoom(
                                    selectedGuest.id,
                                    selectedGuest.room_id || selectedGuest.stay_room_id || 1
                                  );
                                  await fetchGuests();
                                  setSelectedGuest(null);
                                  Alert.alert(
                                    'Checked Out',
                                    `${gName} has been checked out successfully.`
                                  );
                                } catch (e) {
                                  console.error('Checkout error', e);
                                }
                              },
                            },
                          ]
                        );
                      }}
                      style={s.checkoutBtn}
                    >
                      <Icon name="logout" size={16} color={C.rose} />
                      <Text style={s.checkoutBtnText}>Check-out Guest</Text>
                    </TouchableOpacity>
                  )}
                </ScrollView>
              </View>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Self Check-in & QR Generator Modal */}
      <SelfCheckinQrModal
        visible={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
      />
    </View>
  );
}

const s = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 130,
  },
  headerSection: {
    paddingTop: 12,
  },
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
    color: '#6a6a6a',
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
    color: '#222222',
    marginTop: 4,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 16,
  },
  searchPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#dddddd',
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
    color: '#929292',
  },
  reportsBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#dddddd',
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
    backgroundColor: '#7C3AED',
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  metricsGrid: {
    marginTop: 18,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metricCard: {
    width: '48.4%',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ebebeb',
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
    color: '#6a6a6a',
    textTransform: 'uppercase',
  },
  metricNum: {
    fontFamily: 'Inter',
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginTop: 6,
    color: '#222222',
  },
  recentHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 24,
    marginBottom: 8,
  },
  sectionTitle: {
    fontFamily: 'Inter',
    fontSize: 16,
    fontWeight: '600',
    color: '#222222',
  },
  viewAll: {
    fontFamily: 'Inter',
    fontSize: 13.5,
    fontWeight: '600',
    color: '#222222',
  },
  guestListCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ebebeb',
    paddingHorizontal: 14,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  guestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#EDE9FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: 'Inter',
    fontSize: 15,
    fontWeight: '700',
    color: '#5B21B6',
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
    color: '#222222',
  },
  guestSub: {
    fontFamily: 'Inter',
    fontSize: 13,
    fontWeight: '400',
    color: '#6a6a6a',
    marginTop: 2,
  },
  guestTime: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '500',
    color: '#6a6a6a',
  },
  divider: {
    height: 1,
    backgroundColor: '#ebebeb',
  },
  selfCard: {
    marginTop: 16,
    padding: 12,
    borderRadius: 16,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ebebeb',
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
    backgroundColor: '#f2f2f2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selfTitle: {
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 18,
    color: '#222222',
  },
  selfSub: {
    fontFamily: 'Inter',
    fontSize: 12,
    lineHeight: 16,
    color: '#6a6a6a',
    marginTop: 2,
  },
  selfShareBtn: {
    height: 34,
    paddingHorizontal: 12,
    borderRadius: R.full,
    gap: 5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheetContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '85%',
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarLarge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EDE9FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLargeText: {
    fontFamily: 'Inter',
    fontSize: 17,
    fontWeight: '700',
    color: '#5B21B6',
  },
  sheetTitle: {
    fontFamily: 'Inter',
    fontSize: 18,
    fontWeight: '700',
    color: '#222222',
  },
  sheetSub: {
    fontFamily: 'Inter',
    fontSize: 12.5,
    fontWeight: '600',
    color: C.emerald,
    marginTop: 1,
  },
  sheetClose: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#f2f2f2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetSectionLabel: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '700',
    color: '#6a6a6a',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  docPhoto: {
    width: '100%',
    height: 160,
    borderRadius: 12,
  },
  detailsCard: {
    backgroundColor: '#FAF8FD',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#ECEAF0',
    gap: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  detailLabel: {
    fontFamily: 'Inter',
    fontSize: 11.5,
    fontWeight: '500',
    color: '#6a6a6a',
  },
  detailValue: {
    fontFamily: 'Inter',
    fontSize: 13.5,
    fontWeight: '600',
    color: '#222222',
    marginTop: 1,
  },
  checkoutBtn: {
    marginTop: 16,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#FFF1F2',
    borderWidth: 1,
    borderColor: '#FFE4E6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  checkoutBtnText: {
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '700',
    color: C.rose,
  },
  dashLogo: {
    width: 135,
    height: 24,
  },
});
