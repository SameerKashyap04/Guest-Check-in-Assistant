import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  RefreshControl, Modal, ActivityIndicator, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ChevronLeft, ChevronRight, Search, X, Check,
  Shield, Phone, MapPin, Calendar, User, Mail,
  LogIn, Download,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { openDatabase } from '@/database';
import { parseCheckinImportText } from '@/utils/checkinImporter';
import { createMultipleGuestsAndStay } from '@/database/stays';
import { useRoomsStore } from '@/store/useRoomsStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { Alert } from 'react-native';
import { AIRBNB } from '@/theme/airbnb';

const ITEMS_PER_PAGE = 10;

export default function RegistrationsScreen() {
  const router = useRouter();
  const { propertyId } = useSettingsStore();
  const { rooms, fetchRooms } = useRoomsStore();

  const [guests, setGuests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedGuest, setSelectedGuest] = useState<any | null>(null);

  const [isImportModalVisible, setIsImportModalVisible] = useState(false);
  const [importText, setImportText] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  const handleExecuteImport = async () => {
    if (!importText.trim()) {
      Alert.alert('Empty Input', 'Please paste the check-in message or code.');
      return;
    }
    const parsed = parseCheckinImportText(importText.trim());
    if (!parsed || !parsed.fullName) {
      Alert.alert('Invalid Check-in Code', 'Could not parse guest check-in details. Please make sure to copy the full message from WhatsApp.');
      return;
    }

    try {
      setIsImporting(true);
      let roomId = rooms.length > 0 ? rooms[0].id : 101;
      const matchedRoom = rooms.find(r => r.room_number === parsed.roomNumber);
      if (matchedRoom) roomId = matchedRoom.id;

      const todayStr = new Date().toISOString().split('T')[0];

      await createMultipleGuestsAndStay(
        [{
          full_name: parsed.fullName,
          id_number: parsed.idNumber || 'N/A',
          address: parsed.address || '',
          phone: parsed.phone || '',
          photo_uri: '',
          back_photo_uri: '',
          selfie_uri: '',
          property_id: propertyId || 'HS-DEFAULT',
          id_type: parsed.idType || 'Aadhaar',
          dob: '',
          gender: 'Other',
          pin_code: parsed.pinCode || '',
        }],
        {
          room_id: roomId,
          check_in_date: todayStr,
          check_out_date: todayStr,
        }
      );

      await fetchAllGuests();
      setIsImportModalVisible(false);
      setImportText('');
      Alert.alert('Check-in Imported!', `Guest ${parsed.fullName} assigned to Room ${parsed.roomNumber} has been saved.`);
    } catch (e: any) {
      console.error('Manual import error', e);
      Alert.alert('Import Failed', e?.message || 'Could not save imported check-in.');
    } finally {
      setIsImporting(false);
    }
  };

  const fetchAllGuests = async () => {
    try {
      setIsLoading(true);
      const activePropertyId = propertyId || 'HS-DEFAULT';
      const db = await openDatabase();
      const result = await db.getAllAsync(`
        SELECT g.*, r.room_number, r.room_type, s.check_in_date, s.check_out_date
        FROM guests g
        LEFT JOIN stays s ON s.guest_id = g.id
        LEFT JOIN rooms r ON r.id = s.room_id
        WHERE g.property_id = ? OR g.property_id IS NULL OR g.property_id = ''
        ORDER BY g.id DESC
      `, [activePropertyId]);
      setGuests(result as any[]);
    } catch (e) {
      console.error('Failed to fetch all registrations', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
    fetchAllGuests();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAllGuests();
    setRefreshing(false);
  }, []);

  const filteredGuests = guests.filter((g) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const nameMatch = g.full_name?.toLowerCase().includes(q);
    const idMatch = g.id_number?.toLowerCase().includes(q);
    const phoneMatch = g.phone?.toLowerCase().includes(q);
    const roomMatch = g.room_number?.toString().toLowerCase().includes(q);
    return nameMatch || idMatch || phoneMatch || roomMatch;
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const totalItems = filteredGuests.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedGuests = filteredGuests.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const getInitials = (name?: string) => {
    if (!name) return 'GS';
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map(n => n[0].toUpperCase())
      .join('');
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.screen}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}
        >
          <ChevronLeft size={18} color={AIRBNB.colors.ink} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>All Registrations</Text>
          <Text style={styles.subtitle}>{totalItems} registered guests</Text>
        </View>
        <TouchableOpacity
          style={styles.importIconBtn}
          onPress={() => setIsImportModalVisible(true)}
        >
          <LogIn size={16} color={AIRBNB.colors.ink} />
        </TouchableOpacity>
      </View>

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
        {/* ── Search Pill ── */}
        <View style={styles.searchPill}>
          <Search size={17} color={AIRBNB.colors.muted} />
          <Input
            placeholder="Search by name, phone, room, ID…"
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={{ minHeight: 40, borderWidth: 0, paddingHorizontal: 0 }}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={16} color={AIRBNB.colors.mutedSoft} />
            </TouchableOpacity>
          )}
        </View>

        {/* ── Registrations List ── */}
        {isLoading ? (
          <View style={{ paddingVertical: 40, alignItems: 'center' }}>
            <ActivityIndicator size="small" color={AIRBNB.colors.primary} />
          </View>
        ) : paginatedGuests.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No registrations found</Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery ? 'No guests match your search.' : 'No guest records registered yet.'}
            </Text>
          </View>
        ) : (
          <View style={styles.listCard}>
            {paginatedGuests.map((guest, idx) => (
              <TouchableOpacity
                key={guest.id}
                style={[
                  styles.guestRow,
                  idx === paginatedGuests.length - 1 && { borderBottomWidth: 0 },
                ]}
                activeOpacity={0.7}
                onPress={() => setSelectedGuest(guest)}
              >
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{getInitials(guest.full_name)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.guestName} numberOfLines={1}>
                      {guest.full_name}
                    </Text>
                    {guest.photo_uri && (
                      <Check size={14} color={AIRBNB.colors.emerald} strokeWidth={2.5} />
                    )}
                  </View>
                  <Text style={styles.guestMeta} numberOfLines={1}>
                    Room {guest.room_number || 'N/A'} · {guest.phone || 'No phone'}
                  </Text>
                </View>
                <ChevronRight size={17} color={AIRBNB.colors.mutedSoft} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* ── Pagination Buttons ── */}
        {totalPages > 1 && (
          <View style={styles.paginationRow}>
            <Button
              label="Prev"
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onPress={() => setCurrentPage(p => Math.max(1, p - 1))}
            />
            <Text style={styles.pageLabel}>
              Page {currentPage} of {totalPages}
            </Text>
            <Button
              label="Next"
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages}
              onPress={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            />
          </View>
        )}
      </ScrollView>

      {/* ══════════════════════════════════════════════════
          GUEST INSPECTION SHEET
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
                      Room {selectedGuest.room_number || 'N/A'} · {selectedGuest.phone || 'No phone'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.iconBtn}
                    onPress={() => setSelectedGuest(null)}
                  >
                    <X size={16} color={AIRBNB.colors.ink} />
                  </TouchableOpacity>
                </View>

                <View style={styles.detailsList}>
                  <View style={styles.detailRow}>
                    <Shield size={16} color={AIRBNB.colors.muted} />
                    <Text style={styles.detailKey}>{selectedGuest.id_type || 'ID'}:</Text>
                    <Text style={styles.detailVal}>{selectedGuest.id_number || 'N/A'}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <User size={16} color={AIRBNB.colors.muted} />
                    <Text style={styles.detailKey}>Gender / DOB:</Text>
                    <Text style={styles.detailVal}>
                      {selectedGuest.gender || 'N/A'} · {selectedGuest.dob || 'N/A'}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Calendar size={16} color={AIRBNB.colors.muted} />
                    <Text style={styles.detailKey}>Check-in:</Text>
                    <Text style={styles.detailVal}>{selectedGuest.check_in_date || 'N/A'}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <MapPin size={16} color={AIRBNB.colors.muted} />
                    <Text style={styles.detailKey}>Address:</Text>
                    <Text style={styles.detailVal} numberOfLines={2}>
                      {selectedGuest.address || 'N/A'}
                    </Text>
                  </View>
                </View>

                <Button
                  label="Done"
                  variant="primary"
                  style={{ marginTop: 18 }}
                  onPress={() => setSelectedGuest(null)}
                />
              </>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* ══════════════════════════════════════════════════
          MANUAL IMPORT MODAL
      ══════════════════════════════════════════════════ */}
      <Modal visible={isImportModalVisible} transparent animationType="slide">
        <TouchableOpacity
          style={styles.scrim}
          activeOpacity={1}
          onPress={() => setIsImportModalVisible(false)}
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
                onPress={() => setIsImportModalVisible(false)}
              >
                <X size={16} color={AIRBNB.colors.ink} />
              </TouchableOpacity>
            </View>

            <Input
              label="Paste WhatsApp Check-in Code"
              placeholder="Paste WhatsApp message or guest code here"
              value={importText}
              onChangeText={setImportText}
              multiline
              numberOfLines={4}
              style={{ minHeight: 90, textAlignVertical: 'top' }}
            />

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
              <Button
                label="Cancel"
                variant="outline"
                style={{ flex: 1 }}
                onPress={() => setIsImportModalVisible(false)}
              />
              <Button
                label="Save Guest"
                variant="primary"
                isLoading={isImporting}
                icon={<Download size={16} color="#ffffff" />}
                style={{ flex: 1 }}
                onPress={handleExecuteImport}
              />
            </View>
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
    paddingTop: 8,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: AIRBNB.colors.hairlineSoft,
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: AIRBNB.colors.surfaceStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  importIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: AIRBNB.colors.surfaceSoft,
    borderWidth: 1,
    borderColor: AIRBNB.colors.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: AIRBNB.colors.ink,
  },
  subtitle: {
    ...AIRBNB.typography.caption,
    color: AIRBNB.colors.muted,
  },
  searchPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: AIRBNB.colors.canvas,
    borderWidth: 1,
    borderColor: AIRBNB.colors.hairline,
    borderRadius: AIRBNB.radius.full,
    paddingHorizontal: 16,
    height: 48,
    marginBottom: 14,
    ...AIRBNB.shadow.card,
  },
  listCard: {
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
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
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
  emptyCard: {
    backgroundColor: AIRBNB.colors.canvas,
    borderWidth: 1,
    borderColor: AIRBNB.colors.hairlineSoft,
    borderRadius: AIRBNB.radius.md,
    padding: 24,
    alignItems: 'center',
  },
  emptyTitle: {
    ...AIRBNB.typography.titleSm,
    color: AIRBNB.colors.ink,
  },
  emptySubtitle: {
    ...AIRBNB.typography.bodySm,
    color: AIRBNB.colors.muted,
    marginTop: 4,
  },
  paginationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  pageLabel: {
    ...AIRBNB.typography.caption,
    color: AIRBNB.colors.muted,
  },
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
