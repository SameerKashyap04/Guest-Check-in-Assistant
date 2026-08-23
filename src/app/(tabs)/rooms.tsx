import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Alert,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { C, R, shadow } from '@/theme/tokens';
import { Icon } from '@/components/v3/Icon';
import { RoomCard, STATUS_META } from '@/components/v3/RoomCard';
import { PrimaryButton, SecondaryButton, Field } from '@/components/v3/Ui';
import { useRoomsStore } from '@/store/useRoomsStore';
import { Room } from '@/database/rooms';
import { getGuestsForRoom, checkoutGuestOrRemoveFromRoom } from '@/database/stays';
import { isRoomLimitReached, getLimit } from '@/services/entitlementService';
import { formatLimit } from '@/config/plans';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme/ThemeContext';

export default function RoomsScreen() {
  const insets = useSafeAreaInsets();
  const { isDark, colors } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const { rooms, fetchRooms, createRoom, editRoom, removeRoom, isLoading } =
    useRoomsStore();

  const [filter, setFilter] = useState<
    'all' | 'available' | 'occupied' | 'cleaning' | 'maintenance'
  >('all');
  const [isListView, setIsListView] = useState(false);

  // Modal / Sheet State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [isEditingMode, setIsEditingMode] = useState(false);
  const [roomGuests, setRoomGuests] = useState<any[]>([]);
  const [isLoadingGuests, setIsLoadingGuests] = useState(false);

  // Form Fields
  const [roomNumber, setRoomNumber] = useState('');
  const [roomType, setRoomType] = useState('');
  const [roomPrice, setRoomPrice] = useState('');
  const [roomStatus, setRoomStatus] = useState<
    'available' | 'occupied' | 'cleaning' | 'maintenance'
  >('available');

  useEffect(() => {
    fetchRooms();
  }, []);

  const counts = useMemo(
    () => ({
      all: rooms.length,
      available: rooms.filter((r) => r.status === 'available').length,
      occupied: rooms.filter((r) => r.status === 'occupied').length,
      cleaning: rooms.filter((r) => r.status === 'cleaning').length,
      maintenance: rooms.filter((r) => r.status === 'maintenance').length,
    }),
    [rooms]
  );

  const filtered = useMemo(
    () =>
      filter === 'all'
        ? rooms
        : rooms.filter((r) => (r.status || 'available').toLowerCase() === filter),
    [rooms, filter]
  );

  const openAddSheet = () => {
    setEditingRoom(null);
    setRoomGuests([]);
    setIsEditingMode(true);
    setRoomNumber('');
    setRoomType('');
    setRoomPrice('');
    setRoomStatus('available');
    setIsModalOpen(true);
  };

  const openRoomSheet = async (room: Room) => {
    setEditingRoom(room);
    setIsEditingMode(false);
    setRoomNumber(room.room_number);
    setRoomType(room.room_type || '');
    setRoomPrice(room.price ? String(room.price) : '');
    setRoomStatus(room.status as any);
    setIsModalOpen(true);

    setIsLoadingGuests(true);
    const guests = await getGuestsForRoom(room.id);
    setRoomGuests(guests);
    setIsLoadingGuests(false);
  };

  const closeSheet = () => {
    setIsModalOpen(false);
  };

  const handleSave = async () => {
    if (!roomNumber.trim()) {
      Alert.alert('Validation Error', 'Room Number is required');
      return;
    }

    const parsedPrice = parseFloat(roomPrice) || 0;
    if (editingRoom) {
      await editRoom(
        editingRoom.id,
        roomNumber.trim(),
        roomType.trim(),
        roomStatus,
        parsedPrice
      );
    } else {
      if (isRoomLimitReached(rooms.length)) {
        const limit = getLimit('maxRoomsPerProperty');
        Alert.alert(
          'Room Limit Reached',
          `Your current plan allows up to ${formatLimit(limit)} rooms. Upgrade to add more rooms.`,
          [
            { text: 'OK', style: 'cancel' },
            {
              text: 'View Plans',
              onPress: () => router.push('/subscription/pricing'),
            },
          ]
        );
        return;
      }
      await createRoom(
        roomNumber.trim(),
        roomType.trim(),
        roomStatus,
        parsedPrice
      );
    }
    closeSheet();
  };

  const handleDelete = () => {
    if (!editingRoom) return;
    Alert.alert(
      'Delete Room',
      `Are you sure you want to delete Room ${editingRoom.room_number}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await removeRoom(editingRoom.id);
            closeSheet();
          },
        },
      ]
    );
  };

  const handleCheckoutGuest = (guest: any) => {
    if (!editingRoom && !guest?.room_id) return;
    const rId = editingRoom ? editingRoom.id : guest.room_id;
    const gName = guest.full_name || 'Guest';
    const rNum = editingRoom
      ? editingRoom.room_number
      : guest.room_number || '';

    Alert.alert(
      'Check-out Guest?',
      `Are you sure you want to check out ${gName}${rNum ? ` from Room ${rNum}` : ''}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Check-out Guest',
          style: 'destructive',
          onPress: async () => {
            await checkoutGuestOrRemoveFromRoom(guest.id, rId);
            if (editingRoom) {
              const updated = await getGuestsForRoom(editingRoom.id);
              setRoomGuests(updated);
            }
            await fetchRooms();
            Alert.alert(
              'Checked Out',
              `${gName} has been checked out successfully.`
            );
          },
        },
      ]
    );
  };

  return (
    <View style={[s.screen, { paddingTop: insets.top, backgroundColor: colors.canvas }]}>
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.canvas }}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={s.head}>
          <View>
            <Text style={[s.h1, { color: colors.ink }]}>Rooms</Text>
            <Text style={[s.sub, { color: colors.muted }]}>
              {rooms.length} rooms <Text style={{ color: colors.mutedSoft }}>•</Text>{' '}
              <Text style={{ color: '#059669', fontWeight: '600' }}>
                {counts.available} available now
              </Text>
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => setIsListView(!isListView)}
            activeOpacity={0.8}
            style={[s.iconBtn, { backgroundColor: isDark ? '#27272A' : '#f2f2f2' }]}
          >
            <Icon name={isListView ? 'grid' : 'list'} size={18} color={colors.ink} />
          </TouchableOpacity>
        </View>

        {/* 5-Stat bar */}
        <View style={[s.stats, { backgroundColor: isDark ? '#18181B' : '#FAF8FD', borderColor: isDark ? '#27272A' : '#ECEAF0' }]}>
          {(
            ['all', 'available', 'occupied', 'cleaning', 'maintenance'] as const
          ).map((k) => {
            const label =
              k === 'all'
                ? 'Total'
                : k === 'maintenance'
                ? 'Maint.'
                : STATUS_META[k]?.label || k;
            const isSelected = filter === k;
            return (
              <TouchableOpacity
                key={k}
                activeOpacity={0.7}
                onPress={() => setFilter(k)}
                style={[s.stat, isSelected && { backgroundColor: isDark ? '#27272A' : '#ffffff' }]}
              >
                <Text
                  style={[
                    s.statNum,
                    { color: colors.ink },
                    k === 'available' && { color: '#059669' },
                    k === 'occupied' && { color: colors.primary },
                    k === 'cleaning' && { color: '#D97706' },
                    k === 'maintenance' && { color: '#DC2626' },
                  ]}
                >
                  {counts[k]}
                </Text>
                <Text style={[s.statLabel, { color: colors.muted }, isSelected && { fontWeight: '700', color: colors.ink }]}>{label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Filter chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.chipsRow}
        >
          {(
            ['all', 'available', 'occupied', 'cleaning', 'maintenance'] as const
          ).map((k) => {
            const label =
              k === 'all' ? 'All' : STATUS_META[k]?.label || k;
            const active = filter === k;
            return (
              <TouchableOpacity
                key={k}
                activeOpacity={0.75}
                onPress={() => setFilter(k)}
                style={[s.chip, active && s.chipActive]}
              >
                <Text style={[s.chipText, active && s.chipTextActive]}>
                  {label} <Text style={{ opacity: 0.7 }}>{counts[k]}</Text>
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Room Grid or List */}
        {filtered.length === 0 ? (
          <View style={s.emptyBox}>
            <Icon name="bed" size={32} color={C.mutedSoft} />
            <Text style={s.emptyTitle}>No rooms match this filter</Text>
            <Text style={s.emptySub}>
              Try selecting "All" or add a new room below
            </Text>
          </View>
        ) : isListView ? (
          <View style={{ gap: 10, marginTop: 16 }}>
            {filtered.map((r) => {
              const statusKey = (r.status || 'available').toLowerCase();
              const m = STATUS_META[statusKey] || STATUS_META.available;
              return (
                <TouchableOpacity
                  key={r.id}
                  onPress={() => openRoomSheet(r)}
                  activeOpacity={0.85}
                  style={s.listCard}
                >
                  <View style={s.listBed}>
                    <Icon name="bed" size={18} color={C.primary} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <View style={s.listCardTop}>
                      <Text style={s.listNum}>{r.room_number}</Text>
                      <View
                        style={[
                          s.statusPill,
                          { backgroundColor: m.bg, borderColor: m.color },
                        ]}
                      >
                        <Icon
                          name={statusKey === 'available' ? 'check' : 'info'}
                          size={10}
                          color={m.color}
                        />
                        <Text style={[s.statusPillText, { color: m.color }]}>
                          {statusKey === 'maintenance' ? 'Maint.' : m.label}
                        </Text>
                      </View>
                    </View>
                    <Text style={s.listMeta}>
                      {r.room_type || 'Standard'} · ₹
                      {(r.price || 0).toLocaleString('en-IN')}/night
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          <View style={s.grid}>
            {filtered.map((r) => (
              <View key={r.id} style={s.gridItem}>
                <RoomCard
                  room={{
                    id: r.id,
                    room_number: r.room_number,
                    room_type: r.room_type || undefined,
                    price_per_night: r.price ?? undefined,
                    status: r.status,
                  }}
                  onPress={() => openRoomSheet(r)}
                />
              </View>
            ))}
          </View>
        )}

        {/* Add room button */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={openAddSheet}
          style={s.addBtn}
        >
          <Icon name="plus" size={19} color="#fff" />
          <Text style={s.addBtnText}>Add room</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Room Details & Edit Modal */}
      <Modal
        visible={isModalOpen}
        transparent
        animationType="slide"
        onRequestClose={closeSheet}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={closeSheet}
          style={s.modalOverlay}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation?.()}
            style={s.sheetContent}
          >
            <View style={s.sheetHeader}>
              <View>
                <Text style={s.sheetTitle}>
                  {editingRoom
                    ? isEditingMode
                      ? `Edit Room ${editingRoom.room_number}`
                      : `Room ${editingRoom.room_number}`
                    : 'Add New Room'}
                </Text>
                <Text style={s.sheetSub}>
                  {editingRoom
                    ? isEditingMode
                      ? 'Update pricing, room type or status'
                      : `${editingRoom.room_type || 'Standard'} · ₹${editingRoom.price || 0}/night`
                    : 'Create a room in your property inventory'}
                </Text>
              </View>
              <TouchableOpacity onPress={closeSheet} style={s.sheetClose}>
                <Icon name="x" size={18} color={C.ink} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 20 }}
            >
              {/* If viewing details and not editing */}
              {editingRoom && !isEditingMode ? (
                <View style={{ gap: 14 }}>
                  {/* Status selector directly on view mode */}
                  <Text style={s.formLabel}>ROOM STATUS</Text>
                  <View style={s.statusSelectRow}>
                    {(
                      [
                        'available',
                        'occupied',
                        'cleaning',
                        'maintenance',
                      ] as const
                    ).map((st) => {
                      const m = STATUS_META[st];
                      const active = roomStatus === st;
                      return (
                        <TouchableOpacity
                          key={st}
                          activeOpacity={0.75}
                          onPress={async () => {
                            setRoomStatus(st);
                            await editRoom(
                              editingRoom.id,
                              editingRoom.room_number,
                              editingRoom.room_type,
                              st,
                              editingRoom.price ?? undefined
                            );
                          }}
                          style={[
                            s.statusSelectBtn,
                            active && {
                              borderColor: m.color,
                              backgroundColor: m.bg,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              s.statusSelectText,
                              active && { color: m.color, fontWeight: '700' },
                            ]}
                          >
                            {m.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* Checked-in Guests section */}
                  <View style={{ marginTop: 8 }}>
                    <Text style={s.formLabel}>CURRENT OCCUPANTS</Text>
                    {isLoadingGuests ? (
                      <ActivityIndicator
                        size="small"
                        color={C.primary}
                        style={{ marginVertical: 12 }}
                      />
                    ) : roomGuests.length === 0 ? (
                      <View style={s.noGuestsBox}>
                        <Text style={s.noGuestsText}>
                          No active guests in this room
                        </Text>
                      </View>
                    ) : (
                      roomGuests.map((g) => (
                        <View key={g.id} style={s.roomGuestCard}>
                          <View style={{ flex: 1 }}>
                            <Text style={s.roomGuestName}>{g.full_name}</Text>
                            <Text style={s.roomGuestMeta}>
                              {g.phone || 'No phone'} · {g.id_number || 'N/A'}
                            </Text>
                          </View>
                          <TouchableOpacity
                            onPress={() => handleCheckoutGuest(g)}
                            style={s.checkoutBtn}
                          >
                            <Text style={s.checkoutBtnText}>Check out</Text>
                          </TouchableOpacity>
                        </View>
                      ))
                    )}
                  </View>

                  {/* Action buttons */}
                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
                    <SecondaryButton
                      label="Edit Room"
                      icon="edit"
                      onPress={() => setIsEditingMode(true)}
                      style={{ flex: 1 }}
                    />
                    <TouchableOpacity
                      onPress={handleDelete}
                      style={s.deleteBtn}
                    >
                      <Icon name="trash" size={17} color={C.rose} />
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                /* Edit or Add Room Form */
                <View style={{ gap: 12 }}>
                  <Field
                    label="Room Number *"
                    value={roomNumber}
                    onChangeText={setRoomNumber}
                    placeholder="e.g. 101, 204, Suite A"
                  />
                  <Field
                    label="Room Type"
                    value={roomType}
                    onChangeText={setRoomType}
                    placeholder="e.g. Deluxe, Suite, Cottage, Standard"
                  />
                  <Field
                    label="Price per Night (₹)"
                    value={roomPrice}
                    onChangeText={setRoomPrice}
                    placeholder="e.g. 2400"
                    keyboardType="numeric"
                  />

                  <Text style={s.formLabel}>ROOM STATUS</Text>
                  <View style={s.statusSelectRow}>
                    {(
                      [
                        'available',
                        'occupied',
                        'cleaning',
                        'maintenance',
                      ] as const
                    ).map((st) => {
                      const m = STATUS_META[st];
                      const active = roomStatus === st;
                      return (
                        <TouchableOpacity
                          key={st}
                          activeOpacity={0.75}
                          onPress={() => setRoomStatus(st)}
                          style={[
                            s.statusSelectBtn,
                            active && {
                              borderColor: m.color,
                              backgroundColor: m.bg,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              s.statusSelectText,
                              active && { color: m.color, fontWeight: '700' },
                            ]}
                          >
                            {m.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
                    {editingRoom && (
                      <SecondaryButton
                        label="Cancel"
                        onPress={() => setIsEditingMode(false)}
                        style={{ flex: 1 }}
                      />
                    )}
                    <PrimaryButton
                      label={editingRoom ? 'Save Changes' : 'Create Room'}
                      icon="check"
                      onPress={handleSave}
                      style={{ flex: 1 }}
                    />
                  </View>
                </View>
              )}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
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
    paddingTop: 6,
    paddingBottom: 130,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
  },
  h1: {
    fontFamily: 'Inter',
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.4,
    color: '#222222',
  },
  sub: {
    fontFamily: 'Inter',
    fontSize: 13.5,
    fontWeight: '400',
    color: '#6a6a6a',
    marginTop: 4,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f2f2f2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stats: {
    marginTop: 16,
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ECEAF0',
    backgroundColor: '#FAF8FD',
    flexDirection: 'row',
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    minWidth: 0,
  },
  statNum: {
    fontFamily: 'Inter',
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 23,
    color: '#222222',
  },
  statLabel: {
    fontFamily: 'Inter',
    fontSize: 11,
    fontWeight: '600',
    color: '#6a6a6a',
    marginTop: 4,
  },
  chipsRow: {
    gap: 8,
    marginTop: 14,
    paddingBottom: 2,
  },
  chip: {
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: R.full,
    borderWidth: 1,
    borderColor: '#dddddd',
    backgroundColor: '#fff',
  },
  chipActive: {
    backgroundColor: '#222222',
    borderColor: '#222222',
    shadowColor: '#111827',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  chipText: {
    fontFamily: 'Inter',
    fontSize: 12.5,
    fontWeight: '600',
    color: '#222222',
  },
  chipTextActive: {
    color: '#fff',
  },
  grid: {
    marginTop: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
  },
  gridItem: {
    width: '48.2%',
  },
  listCard: {
    minHeight: 70,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#ECEAF0',
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#241840',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  listBed: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#F7F3FF',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  listCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  listNum: {
    fontFamily: 'Inter',
    fontSize: 18,
    fontWeight: '800',
    color: '#222222',
  },
  listMeta: {
    fontFamily: 'Inter',
    fontSize: 13,
    fontWeight: '400',
    color: '#6a6a6a',
    marginTop: 2,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: R.full,
    borderWidth: 1.2,
  },
  statusPillText: {
    fontFamily: 'Inter',
    fontSize: 10,
    fontWeight: '700',
  },
  addBtn: {
    height: 52,
    borderRadius: 16,
    marginTop: 20,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    shadowColor: C.primary,
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  addBtnText: {
    fontFamily: 'Inter',
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  emptyTitle: {
    fontFamily: 'Inter',
    fontSize: 15,
    fontWeight: '600',
    color: '#222222',
  },
  emptySub: {
    fontFamily: 'Inter',
    fontSize: 13,
    color: '#6a6a6a',
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
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  sheetTitle: {
    fontFamily: 'Inter',
    fontSize: 20,
    fontWeight: '700',
    color: '#222222',
  },
  sheetSub: {
    fontFamily: 'Inter',
    fontSize: 13,
    color: '#6a6a6a',
    marginTop: 2,
  },
  sheetClose: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#f2f2f2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  formLabel: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: '#6a6a6a',
    textTransform: 'uppercase',
    marginTop: 6,
    marginBottom: 6,
  },
  statusSelectRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusSelectBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1.2,
    borderColor: '#ECEAF0',
    backgroundColor: '#FAF8FD',
  },
  statusSelectText: {
    fontFamily: 'Inter',
    fontSize: 12.5,
    fontWeight: '600',
    color: '#222222',
  },
  noGuestsBox: {
    backgroundColor: '#FAF8FD',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  noGuestsText: {
    fontFamily: 'Inter',
    fontSize: 13,
    color: '#6a6a6a',
  },
  roomGuestCard: {
    backgroundColor: '#FAF8FD',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ECEAF0',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  roomGuestName: {
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '700',
    color: '#222222',
  },
  roomGuestMeta: {
    fontFamily: 'Inter',
    fontSize: 12,
    color: '#6a6a6a',
    marginTop: 2,
  },
  checkoutBtn: {
    backgroundColor: '#FFF1F0',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: R.full,
    borderWidth: 1,
    borderColor: C.rose,
  },
  checkoutBtnText: {
    fontFamily: 'Inter',
    fontSize: 11,
    fontWeight: '700',
    color: C.rose,
  },
  deleteBtn: {
    width: 50,
    height: 50,
    borderRadius: R.sm,
    backgroundColor: '#FFF1F0',
    borderWidth: 1,
    borderColor: '#FEE4E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
