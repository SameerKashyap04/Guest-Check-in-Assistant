import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  Modal, StyleSheet, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import {
  List, Grid, X,
} from 'lucide-react-native';
import { useRoomsStore } from '@/store/useRoomsStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { getGuestsForRoom, checkoutGuestOrRemoveFromRoom } from '@/database/stays';
import { Room } from '@/database/rooms';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { AIRBNB } from '@/theme/airbnb';

// ─── Airbnb Rooms Screen for StayMate ─────────────────────────────────────────
// Dynamic room inventory, real guest association & live status management
// ─────────────────────────────────────────────────────────────────────────────

type FilterTab = 'all' | 'available' | 'occupied' | 'cleaning' | 'maintenance';

export default function RoomsScreen() {
  const { rooms, fetchRooms, createRoom, editRoom } = useRoomsStore();
  const { propertyId } = useSettingsStore();

  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Room Inspection Sheet
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [roomGuest, setRoomGuest] = useState<any | null>(null);

  // Add / Edit Room Sheet
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [roomNumInput, setRoomNumInput] = useState('');
  const [roomTypeInput, setRoomTypeInput] = useState('Standard');
  const [basePriceInput, setBasePriceInput] = useState('1800');

  useFocusEffect(
    useCallback(() => {
      fetchRooms();
    }, [])
  );

  // Filtered list
  const filteredRooms = rooms.filter(r => {
    if (activeFilter === 'all') return true;
    return r.status === activeFilter;
  });

  // Mini stats count (dynamic from live rooms array)
  const totalCount = rooms.length;
  const availCount = rooms.filter(r => r.status === 'available').length;
  const occCount = rooms.filter(r => r.status === 'occupied').length;
  const cleanCount = rooms.filter(r => r.status === 'cleaning').length;
  const maintCount = rooms.filter(r => r.status === 'maintenance').length;

  const handleOpenRoom = async (room: Room) => {
    setSelectedRoom(room);
    setRoomGuest(null);
    try {
      const activePropertyId = propertyId || undefined;
      const guests = await getGuestsForRoom(room.id, activePropertyId);
      if (guests && guests.length > 0) {
        setRoomGuest(guests[0]);
      }
    } catch (e) {
      console.error('Failed to load guest for room', e);
    }
  };

  const handleStatusChange = async (newStatus: 'available' | 'occupied' | 'cleaning' | 'maintenance') => {
    if (!selectedRoom) return;
    try {
      await editRoom(selectedRoom.id, selectedRoom.room_number, selectedRoom.room_type, newStatus, selectedRoom.price || 1800);
      setSelectedRoom({ ...selectedRoom, status: newStatus });
      fetchRooms();
    } catch (e) {
      Alert.alert('Error', 'Failed to update room status');
    }
  };

  const handleCheckoutGuest = async () => {
    if (!roomGuest || !selectedRoom) return;
    Alert.alert('Check out guest?', `Check out ${roomGuest.full_name || 'guest'} from Room ${selectedRoom.room_number}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Check Out',
        style: 'destructive',
        onPress: async () => {
          try {
            await checkoutGuestOrRemoveFromRoom(roomGuest.id, selectedRoom.id);
            await editRoom(selectedRoom.id, selectedRoom.room_number, selectedRoom.room_type, 'cleaning', selectedRoom.price || 1800);
            setSelectedRoom(null);
            setRoomGuest(null);
            fetchRooms();
            Alert.alert('Checked Out', 'Room is now marked for Cleaning.');
          } catch (e) {
            Alert.alert('Error', 'Failed to check out guest');
          }
        },
      },
    ]);
  };

  const handleSaveRoom = async () => {
    if (!roomNumInput.trim()) {
      Alert.alert('Missing Number', 'Please enter a room number.');
      return;
    }
    const price = parseInt(basePriceInput, 10) || 1800;

    try {
      if (isAddingNew) {
        await createRoom(roomNumInput.trim(), roomTypeInput.trim() || 'Standard', 'available', price);
      } else if (selectedRoom) {
        await editRoom(selectedRoom.id, roomNumInput.trim(), roomTypeInput.trim() || 'Standard', selectedRoom.status, price);
      }
      setIsEditModalOpen(false);
      fetchRooms();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to save room.');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'available':
        return { label: 'Available', bg: AIRBNB.colors.emeraldBg, text: AIRBNB.colors.emerald };
      case 'occupied':
        return { label: 'Occupied', bg: AIRBNB.colors.skyBg, text: AIRBNB.colors.sky };
      case 'cleaning':
        return { label: 'Cleaning', bg: AIRBNB.colors.amberBg, text: AIRBNB.colors.amber };
      case 'maintenance':
        return { label: 'Maintenance', bg: AIRBNB.colors.roseBg, text: AIRBNB.colors.rose };
      default:
        return { label: status, bg: AIRBNB.colors.surfaceStrong, text: AIRBNB.colors.ink };
    }
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Screen Header ── */}
        <View style={styles.headerRow}>
          <Text style={styles.title}>Rooms</Text>
          <TouchableOpacity
            style={styles.circleBtn}
            activeOpacity={0.7}
            onPress={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
          >
            {viewMode === 'grid' ? <List size={18} color={AIRBNB.colors.ink} /> : <Grid size={18} color={AIRBNB.colors.ink} />}
          </TouchableOpacity>
        </View>

        {/* ── 5-Column Mini Metrics (Dynamic) ── */}
        <View style={styles.statsRow}>
          <View style={styles.statCol}>
            <Text style={[styles.statNum, { color: AIRBNB.colors.ink }]}>{totalCount}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statCol}>
            <Text style={[styles.statNum, { color: AIRBNB.colors.emerald }]}>{availCount}</Text>
            <Text style={styles.statLabel}>Avail</Text>
          </View>
          <View style={styles.statCol}>
            <Text style={[styles.statNum, { color: AIRBNB.colors.sky }]}>{occCount}</Text>
            <Text style={styles.statLabel}>Occ</Text>
          </View>
          <View style={styles.statCol}>
            <Text style={[styles.statNum, { color: AIRBNB.colors.amber }]}>{cleanCount}</Text>
            <Text style={styles.statLabel}>Clean</Text>
          </View>
          <View style={styles.statCol}>
            <Text style={[styles.statNum, { color: AIRBNB.colors.rose }]}>{maintCount}</Text>
            <Text style={styles.statLabel}>Maint</Text>
          </View>
        </View>

        {/* ── Horizontal Filter Chips ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterBar}
        >
          {[
            { id: 'all', label: 'All' },
            { id: 'available', label: 'Available' },
            { id: 'occupied', label: 'Occupied' },
            { id: 'cleaning', label: 'Cleaning' },
            { id: 'maintenance', label: 'Maintenance' },
          ].map(tab => {
            const active = activeFilter === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                style={[styles.chip, active && styles.chipActive]}
                activeOpacity={0.8}
                onPress={() => setActiveFilter(tab.id as FilterTab)}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ── Room Cards (2-Column Grid or List) ── */}
        {viewMode === 'grid' ? (
          <View style={styles.gridWrap}>
            {filteredRooms.map(room => {
              const badge = getStatusBadge(room.status);
              return (
                <TouchableOpacity
                  key={room.id}
                  style={styles.roomCard}
                  activeOpacity={0.8}
                  onPress={() => handleOpenRoom(room)}
                >
                  {/* Photo Plate with Status Pill */}
                  <View style={styles.photoPlate}>
                    <View style={[styles.statusPill, { backgroundColor: badge.bg }]}>
                      <Text style={[styles.statusPillText, { color: badge.text }]}>
                        {badge.label}
                      </Text>
                    </View>
                  </View>

                  {/* Body Content */}
                  <View style={styles.cardBody}>
                    <Text style={styles.roomName}>Room {room.room_number}</Text>
                    <Text style={styles.roomType}>{room.room_type || 'Standard'}</Text>
                    <View style={styles.priceRow}>
                      <Text style={styles.priceVal}>₹{room.price?.toLocaleString('en-IN') || '1,800'}</Text>
                      <Text style={styles.priceUnit}>/night</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          <View style={styles.listWrap}>
            {filteredRooms.map(room => {
              const badge = getStatusBadge(room.status);
              return (
                <TouchableOpacity
                  key={room.id}
                  style={styles.listCard}
                  activeOpacity={0.8}
                  onPress={() => handleOpenRoom(room)}
                >
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <Text style={styles.roomName}>Room {room.room_number}</Text>
                      <View style={[styles.statusPill, { backgroundColor: badge.bg }]}>
                        <Text style={[styles.statusPillText, { color: badge.text }]}>
                          {badge.label}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.roomType}>{room.room_type || 'Standard'}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.priceVal}>₹{room.price?.toLocaleString('en-IN') || '1,800'}</Text>
                    <Text style={styles.priceUnit}>/night</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* ── Add Room Action Button ── */}
        <Button
          label="+ Add new room"
          variant="secondary"
          style={{ marginTop: 20 }}
          onPress={() => {
            setIsAddingNew(true);
            setRoomNumInput('');
            setRoomTypeInput('Standard');
            setBasePriceInput('1800');
            setIsEditModalOpen(true);
          }}
        />
      </ScrollView>

      {/* ══════════════════════════════════════════════════
          ROOM INSPECTION BOTTOM SHEET
      ══════════════════════════════════════════════════ */}
      <Modal visible={!!selectedRoom} transparent animationType="slide">
        <TouchableOpacity
          style={styles.scrim}
          activeOpacity={1}
          onPress={() => setSelectedRoom(null)}
        >
          <TouchableOpacity
            style={styles.sheet}
            activeOpacity={1}
            onPress={e => e.stopPropagation?.()}
          >
            <View style={styles.sheetHandle} />
            {selectedRoom && (
              <>
                <View style={styles.sheetHeader}>
                  <View>
                    <Text style={styles.sheetTitle}>Room {selectedRoom.room_number}</Text>
                    <Text style={styles.sheetSubtitle}>
                      {selectedRoom.room_type || 'Standard'} · ₹{selectedRoom.price?.toLocaleString('en-IN') || '1,800'}/night
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.iconBtn}
                    onPress={() => setSelectedRoom(null)}
                  >
                    <X size={16} color={AIRBNB.colors.ink} />
                  </TouchableOpacity>
                </View>

                {/* Status Toggle Row */}
                <Text style={styles.sheetSectionLabel}>UPDATE STATUS</Text>
                <View style={styles.statusSelectRow}>
                  {[
                    { id: 'available', label: 'Available', bg: AIRBNB.colors.emeraldBg, text: AIRBNB.colors.emerald },
                    { id: 'occupied', label: 'Occupied', bg: AIRBNB.colors.skyBg, text: AIRBNB.colors.sky },
                    { id: 'cleaning', label: 'Cleaning', bg: AIRBNB.colors.amberBg, text: AIRBNB.colors.amber },
                    { id: 'maintenance', label: 'Maint.', bg: AIRBNB.colors.roseBg, text: AIRBNB.colors.rose },
                  ].map(st => {
                    const active = selectedRoom.status === st.id;
                    return (
                      <TouchableOpacity
                        key={st.id}
                        style={[
                          styles.statusBtn,
                          { backgroundColor: st.bg },
                          active && { borderWidth: 2, borderColor: st.text },
                        ]}
                        activeOpacity={0.8}
                        onPress={() => handleStatusChange(st.id as any)}
                      >
                        <Text style={[styles.statusBtnText, { color: st.text }]}>
                          {st.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Guest In-Room Card if occupied */}
                {roomGuest && (
                  <View style={styles.inRoomCard}>
                    <Text style={styles.inRoomHeading}>CURRENT GUEST</Text>
                    <Text style={styles.inRoomGuestName}>{roomGuest.full_name}</Text>
                    <Text style={styles.inRoomGuestMeta}>
                      Checked in: {roomGuest.check_in_date || 'Active'} · {roomGuest.phone || 'No phone recorded'}
                    </Text>
                    <Button
                      label="Check Out Guest"
                      variant="danger"
                      style={{ marginTop: 12 }}
                      onPress={handleCheckoutGuest}
                    />
                  </View>
                )}

                {/* Edit Room Details Button */}
                <Button
                  label="Edit room details"
                  variant="outline"
                  style={{ marginTop: 14 }}
                  onPress={() => {
                    setIsAddingNew(false);
                    setRoomNumInput(selectedRoom.room_number);
                    setRoomTypeInput(selectedRoom.room_type || 'Standard');
                    setBasePriceInput(String(selectedRoom.price || 1800));
                    setIsEditModalOpen(true);
                  }}
                />
              </>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* ══════════════════════════════════════════════════
          ADD / EDIT ROOM MODAL
      ══════════════════════════════════════════════════ */}
      <Modal visible={isEditModalOpen} transparent animationType="slide">
        <TouchableOpacity
          style={styles.scrim}
          activeOpacity={1}
          onPress={() => setIsEditModalOpen(false)}
        >
          <TouchableOpacity
            style={styles.sheet}
            activeOpacity={1}
            onPress={e => e.stopPropagation?.()}
          >
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>
                {isAddingNew ? 'Add New Room' : `Edit Room ${selectedRoom?.room_number}`}
              </Text>
              <TouchableOpacity
                style={styles.iconBtn}
                onPress={() => setIsEditModalOpen(false)}
              >
                <X size={16} color={AIRBNB.colors.ink} />
              </TouchableOpacity>
            </View>

            <Input
              label="Room Number"
              value={roomNumInput}
              onChangeText={setRoomNumInput}
              placeholder="e.g. 101"
            />
            <Input
              label="Room Type"
              value={roomTypeInput}
              onChangeText={setRoomTypeInput}
              placeholder="e.g. Standard / Deluxe / Suite"
            />
            <Input
              label="Base Price per Night (₹)"
              value={basePriceInput}
              onChangeText={setBasePriceInput}
              placeholder="1800"
              keyboardType="numeric"
            />

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
              <Button
                label="Cancel"
                variant="outline"
                style={{ flex: 1 }}
                onPress={() => setIsEditModalOpen(false)}
              />
              <Button
                label="Save Room"
                variant="primary"
                style={{ flex: 1 }}
                onPress={handleSaveRoom}
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
    paddingTop: 4,
    paddingBottom: 110,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 18,
  },
  title: {
    ...AIRBNB.typography.displayLg,
    color: AIRBNB.colors.ink,
  },
  circleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: AIRBNB.colors.hairline,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AIRBNB.colors.canvas,
  },

  // 5-Column Mini Metrics
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: AIRBNB.colors.hairlineSoft,
    marginTop: 8,
  },
  statCol: {
    alignItems: 'center',
    flex: 1,
  },
  statNum: {
    fontSize: 18,
    fontWeight: '700',
  },
  statLabel: {
    ...AIRBNB.typography.micro,
    color: AIRBNB.colors.muted,
    marginTop: 2,
  },

  // Filter Chips
  filterBar: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 14,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: AIRBNB.radius.full,
    borderWidth: 1,
    borderColor: AIRBNB.colors.hairline,
    backgroundColor: AIRBNB.colors.canvas,
  },
  chipActive: {
    backgroundColor: AIRBNB.colors.ink,
    borderColor: AIRBNB.colors.ink,
  },
  chipText: {
    ...AIRBNB.typography.bodySm,
    fontWeight: '500',
    color: AIRBNB.colors.ink,
  },
  chipTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },

  // 2-Column Grid
  gridWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 4,
  },
  roomCard: {
    width: '48%',
    backgroundColor: AIRBNB.colors.canvas,
    borderWidth: 1,
    borderColor: AIRBNB.colors.hairlineSoft,
    borderRadius: 14,
    overflow: 'hidden',
    ...AIRBNB.shadow.card,
  },
  photoPlate: {
    height: 95,
    backgroundColor: '#fdf1e7',
    padding: 8,
  },
  statusPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: AIRBNB.radius.full,
  },
  statusPillText: {
    ...AIRBNB.typography.micro,
    fontWeight: '600',
  },
  cardBody: {
    padding: 12,
  },
  roomName: {
    ...AIRBNB.typography.titleSm,
    color: AIRBNB.colors.ink,
  },
  roomType: {
    ...AIRBNB.typography.caption,
    color: AIRBNB.colors.muted,
    marginTop: 2,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 6,
  },
  priceVal: {
    ...AIRBNB.typography.titleSm,
    fontWeight: '700',
    color: AIRBNB.colors.ink,
  },
  priceUnit: {
    ...AIRBNB.typography.micro,
    color: AIRBNB.colors.muted,
  },

  // List View
  listWrap: {
    gap: 10,
    marginTop: 4,
  },
  listCard: {
    backgroundColor: AIRBNB.colors.canvas,
    borderWidth: 1,
    borderColor: AIRBNB.colors.hairlineSoft,
    borderRadius: AIRBNB.radius.md,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...AIRBNB.shadow.card,
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
  sheetSectionLabel: {
    ...AIRBNB.typography.caption,
    color: AIRBNB.colors.muted,
    marginBottom: 8,
  },
  statusSelectRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  statusBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: AIRBNB.radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBtnText: {
    ...AIRBNB.typography.caption,
    fontWeight: '700',
  },
  inRoomCard: {
    backgroundColor: AIRBNB.colors.surfaceSoft,
    borderRadius: AIRBNB.radius.md,
    padding: 14,
    marginVertical: 10,
  },
  inRoomHeading: {
    ...AIRBNB.typography.micro,
    color: AIRBNB.colors.muted,
    marginBottom: 4,
  },
  inRoomGuestName: {
    ...AIRBNB.typography.titleSm,
    color: AIRBNB.colors.ink,
  },
  inRoomGuestMeta: {
    ...AIRBNB.typography.caption,
    color: AIRBNB.colors.muted,
    marginTop: 2,
  },
});
