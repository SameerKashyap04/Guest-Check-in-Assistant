import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, Alert, TextInput, Modal, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GlassCard } from '@/components/GlassCard';
import { useRoomsStore } from '@/store/useRoomsStore';
import { Plus, X, Trash, Search, LayoutGrid, List, BedDouble, CheckCircle2, UserCheck, Sparkles, Wrench, Users, Calendar, Phone, IdCard, Edit, LogOut, UserX } from 'lucide-react-native';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { Room } from '@/database/rooms';
import { getGuestsForRoom, checkoutGuestOrRemoveFromRoom } from '@/database/stays';
import { useTranslation } from 'react-i18next';
import { isRoomLimitReached, getLimit } from '@/services/entitlementService';
import { formatLimit } from '@/config/plans';

export default function RoomsScreen() {
  const { t } = useTranslation();
  const { rooms, fetchRooms, createRoom, editRoom, removeRoom, isLoading } = useRoomsStore();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [roomGuests, setRoomGuests] = useState<any[]>([]);
  const [isLoadingGuests, setIsLoadingGuests] = useState(false);
  const [isEditingMode, setIsEditingMode] = useState(false);
  const [selectedGuestDetail, setSelectedGuestDetail] = useState<any | null>(null);

  const [roomNumber, setRoomNumber] = useState('');
  const [roomType, setRoomType] = useState('');
  const [roomPrice, setRoomPrice] = useState('');
  const [roomStatus, setRoomStatus] = useState<'available' | 'occupied' | 'cleaning' | 'maintenance'>('available');
  
  const [filter, setFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isGridView, setIsGridView] = useState(true);

  useEffect(() => {
    fetchRooms();
  }, []);

  const total = rooms.length;
  const available = rooms.filter(r => r.status === 'available').length;
  const occupied = rooms.filter(r => r.status === 'occupied').length;
  const cleaning = rooms.filter(r => r.status === 'cleaning').length;
  const maintenance = rooms.filter(r => r.status === 'maintenance').length;

  const filteredRooms = rooms.filter(r => {
    const matchesFilter = filter === 'All' ? true : r.status === filter.toLowerCase();
    const matchesSearch = r.room_number.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (r.room_type && r.room_type.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesFilter && matchesSearch;
  });

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'available':
        return {
          label: 'Available',
          badgeBg: 'bg-emerald-500/15',
          textColor: 'text-emerald-700 dark:text-emerald-400',
          borderColor: 'border-emerald-500/30',
          icon: <CheckCircle2 size={12} color="#10B981" />
        };
      case 'occupied':
        return {
          label: 'Occupied',
          badgeBg: 'bg-sky-500/15',
          textColor: 'text-sky-700 dark:text-sky-400',
          borderColor: 'border-sky-500/30',
          icon: <UserCheck size={12} color="#0EA5E9" />
        };
      case 'cleaning':
        return {
          label: 'Cleaning',
          badgeBg: 'bg-amber-500/15',
          textColor: 'text-amber-700 dark:text-amber-400',
          borderColor: 'border-amber-500/30',
          icon: <Sparkles size={12} color="#F59E0B" />
        };
      case 'maintenance':
        return {
          label: 'Maintenance',
          badgeBg: 'bg-rose-500/15',
          textColor: 'text-rose-700 dark:text-rose-400',
          borderColor: 'border-rose-500/30',
          icon: <Wrench size={12} color="#F43F5E" />
        };
      default:
        return {
          label: status,
          badgeBg: 'bg-gray-500/15',
          textColor: 'text-gray-700 dark:text-gray-400',
          borderColor: 'border-gray-500/30',
          icon: null
        };
    }
  };

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

  const openEditSheet = async (room: Room) => {
    setEditingRoom(room);
    setIsEditingMode(false);
    setRoomNumber(room.room_number);
    setRoomType(room.room_type || '');
    setRoomPrice(room.price ? String(room.price) : '');
    setRoomStatus(room.status);
    setIsModalOpen(true);

    // Fetch guests checked into this room
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
      await editRoom(editingRoom.id, roomNumber, roomType, roomStatus, parsedPrice);
    } else {
      // ── Subscription: check room limit before creating ──
      if (isRoomLimitReached(rooms.length)) {
        const limit = getLimit('maxRoomsPerProperty');
        Alert.alert(
          'Room Limit Reached',
          `Your current plan allows up to ${formatLimit(limit)} rooms. Upgrade to add more rooms.`,
          [
            { text: 'OK', style: 'cancel' },
            { text: 'View Plans', onPress: () => require('expo-router').router.push('/subscription/pricing') },
          ]
        );
        return;
      }
      await createRoom(roomNumber, roomType, roomStatus, parsedPrice);
    }
    closeSheet();
  };

  const handleDelete = () => {
    if (editingRoom) {
      Alert.alert(
        "Delete Room",
        `Are you sure you want to delete Room ${editingRoom.room_number}?`,
        [
          { text: "Cancel", style: "cancel" },
          { 
            text: "Delete", 
            style: "destructive",
            onPress: async () => {
              await removeRoom(editingRoom.id);
              closeSheet();
            }
          }
        ]
      );
    }
  };

  const handleCheckoutGuest = (guest: any) => {
    if (!editingRoom && !guest?.room_id) return;
    const rId = editingRoom ? editingRoom.id : guest.room_id;
    const gName = guest.full_name || 'Guest';
    const rNum = editingRoom ? editingRoom.room_number : (guest.room_number || '');

    Alert.alert(
      "Check-out Guest?",
      `Are you sure you want to check out ${gName}${rNum ? ` from Room ${rNum}` : ''}?`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Check-out Guest", 
          style: "destructive",
          onPress: async () => {
            await checkoutGuestOrRemoveFromRoom(guest.id, rId);
            if (editingRoom) {
              const updated = await getGuestsForRoom(editingRoom.id);
              setRoomGuests(updated);
            }
            await fetchRooms();
            if (selectedGuestDetail?.id === guest.id) {
              setSelectedGuestDetail(null);
            }
            Alert.alert('Checked Out', `${gName} has been removed from the room.`);
          }
        }
      ]
    );
  };

  const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
    available:   { bg: '#e5f6e6', text: '#008a05' },
    occupied:    { bg: '#e7f3fb', text: '#0f7dc2' },
    cleaning:    { bg: '#fef3cd', text: '#b45900' },
    maintenance: { bg: '#fdeae5', text: '#c13515' },
  };

  const renderGridItem = ({ item }: { item: Room }) => {
    const config = getStatusConfig(item.status);
    const colors = STATUS_COLORS[item.status] || { bg: '#f2f2f2', text: '#6a6a6a' };

    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => openEditSheet(item)}
        style={{ width: '47.5%', marginBottom: 14 }}
      >
        <View style={{
          backgroundColor: '#ffffff', borderRadius: 14, padding: 14,
          borderWidth: 1, borderColor: '#ebebeb',
          shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
          minHeight: 130, justifyContent: 'space-between',
        }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
            <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#f2f2f2', alignItems: 'center', justifyContent: 'center' }}>
              <BedDouble size={18} color="#222222" />
            </View>
            <View style={{ backgroundColor: colors.bg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 9999 }}>
              <Text style={{ fontSize: 10.5, fontWeight: '700', color: colors.text }}>{config.label}</Text>
            </View>
          </View>
          <View>
            <Text style={{ fontSize: 18, fontWeight: '700', color: '#222222', letterSpacing: -0.3 }}>{item.room_number}</Text>
            <Text style={{ fontSize: 12, color: '#6a6a6a', marginTop: 2 }} numberOfLines={1}>{item.room_type || 'Standard'}</Text>
            <Text style={{ fontSize: 12.5, fontWeight: '600', color: '#ff385c', marginTop: 4 }}>₹{item.price || 0}/night</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };


  const renderListItem = ({ item }: { item: Room }) => {
    const config = getStatusConfig(item.status);
    const colors = STATUS_COLORS[item.status] || { bg: '#f2f2f2', text: '#6a6a6a' };

    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => openEditSheet(item)}
        style={{ marginBottom: 10 }}
      >
        <View style={{
          backgroundColor: '#ffffff', borderRadius: 14, padding: 14,
          borderWidth: 1, borderColor: '#ebebeb',
          shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
          flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: '#f2f2f2', alignItems: 'center', justifyContent: 'center' }}>
              <BedDouble size={20} color="#222222" />
            </View>
            <View>
              <Text style={{ fontSize: 15, fontWeight: '700', color: '#222222' }}>{item.room_number}</Text>
              <Text style={{ fontSize: 12.5, color: '#6a6a6a', marginTop: 2 }}>{item.room_type || 'Standard'}{item.price ? ` · ₹${item.price}/night` : ''}</Text>
            </View>
          </View>
          <View style={{ backgroundColor: colors.bg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 9999 }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: colors.text }}>{config.label}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };


  const filterOptions = [
    { label: 'All', count: total },
    { label: 'Available', count: available },
    { label: 'Occupied', count: occupied },
    { label: 'Cleaning', count: cleaning },
    { label: 'Maintenance', count: maintenance },
  ];

  return (
    <SafeAreaView edges={['left', 'right', 'top']} style={{ flex: 1, backgroundColor: '#f7f7f7' }}>
      {/* ── Header ── */}
      <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View>
          <Text style={{ fontSize: 20, fontWeight: '700', color: '#222222' }}>Rooms</Text>
          <Text style={{ fontSize: 12.5, color: '#6a6a6a', marginTop: 2 }}>{total} Total Properties & Rooms</Text>
        </View>
        <TouchableOpacity
          onPress={openAddSheet}
          activeOpacity={0.8}
          style={{ backgroundColor: '#ff385c', height: 40, paddingHorizontal: 14, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 6 }}
        >
          <Plus size={18} color="#ffffff" />
          <Text style={{ fontSize: 13.5, fontWeight: '500', color: '#ffffff' }}>{t('addRoom')}</Text>
        </TouchableOpacity>
      </View>

      {/* ── Stats Scroll ── */}
      <View style={{ marginBottom: 8 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 10 }}>
          {[
            { label: t('available'), count: available, bg: '#e5f6e6', text: '#008a05', icon: <CheckCircle2 size={16} color="#008a05" /> },
            { label: t('occupied'), count: occupied, bg: '#e7f3fb', text: '#0f7dc2', icon: <UserCheck size={16} color="#0f7dc2" /> },
            { label: t('cleaning'), count: cleaning, bg: '#fef3cd', text: '#b45900', icon: <Sparkles size={16} color="#b45900" /> },
            { label: t('maintenance'), count: maintenance, bg: '#fdeae5', text: '#c13515', icon: <Wrench size={16} color="#c13515" /> },
          ].map((s) => (
            <View key={s.label} style={{
              flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 10,
              backgroundColor: '#ffffff', borderRadius: 9999, borderWidth: 1, borderColor: '#ebebeb',
              shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
            }}>
              {s.icon}
              <View>
                <Text style={{ fontSize: 10.5, color: '#6a6a6a', fontWeight: '500' }}>{s.label}</Text>
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#222222' }}>{s.count}</Text>
              </View>
            </View>
          ))}
        </ScrollView>
      </View>

      {/* ── Search + View Toggle ── */}
      <View style={{ paddingHorizontal: 20, marginBottom: 10, flexDirection: 'row', gap: 10, alignItems: 'center' }}>
        <View style={{
          flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
          backgroundColor: '#ffffff', borderRadius: 9999, paddingHorizontal: 14, paddingVertical: 10,
          borderWidth: 1, borderColor: '#dddddd',
        }}>
          <Search size={17} color="#929292" />
          <TextInput
            placeholder="Search room number or type..."
            placeholderTextColor="#929292"
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={{ flex: 1, fontSize: 13.5, color: '#222222', padding: 0 }}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={15} color="#929292" />
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={{ flexDirection: 'row', backgroundColor: '#f2f2f2', borderRadius: 8, padding: 3 }}>
          <TouchableOpacity
            onPress={() => setIsGridView(true)}
            style={{ padding: 6, borderRadius: 6, backgroundColor: isGridView ? '#222222' : 'transparent' }}
          >
            <LayoutGrid size={17} color={isGridView ? '#ffffff' : '#6a6a6a'} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setIsGridView(false)}
            style={{ padding: 6, borderRadius: 6, backgroundColor: !isGridView ? '#222222' : 'transparent' }}
          >
            <List size={17} color={!isGridView ? '#ffffff' : '#6a6a6a'} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Filter Tabs ── */}
      <View style={{ marginBottom: 10 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}>
          {filterOptions.map(f => (
            <TouchableOpacity
              key={f.label}
              onPress={() => setFilter(f.label)}
              activeOpacity={0.7}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 6,
                paddingHorizontal: 14, paddingVertical: 7, borderRadius: 9999,
                backgroundColor: filter === f.label ? '#222222' : '#ffffff',
                borderWidth: 1, borderColor: filter === f.label ? '#222222' : '#dddddd',
              }}
            >
              <Text style={{ fontSize: 12.5, fontWeight: '600', color: filter === f.label ? '#ffffff' : '#222222' }}>{f.label}</Text>
              <View style={{ backgroundColor: filter === f.label ? 'rgba(255,255,255,0.2)' : '#f2f2f2', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 9999 }}>
                <Text style={{ fontSize: 10, fontWeight: '700', color: filter === f.label ? '#ffffff' : '#6a6a6a' }}>{f.count}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>


      {/* Room Cards List / Grid */}
      <FlatList
        key={isGridView ? 'grid' : 'list'}
        data={filteredRooms}
        keyExtractor={(item) => item.id.toString()}
        numColumns={isGridView ? 2 : 1}
        columnWrapperStyle={isGridView ? { justifyContent: 'space-between', paddingHorizontal: 20 } : undefined}
        contentContainerStyle={{ paddingHorizontal: isGridView ? 0 : 20, paddingBottom: 100 }}
        refreshing={isLoading}
        onRefresh={fetchRooms}
        renderItem={isGridView ? renderGridItem : renderListItem}
        ListEmptyComponent={
          !isLoading ? (
            <View style={{ paddingVertical: 48, alignItems: 'center', justifyContent: 'center' }}>
              <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: '#f2f2f2', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                <BedDouble size={26} color="#929292" />
              </View>
              <Text style={{ fontSize: 15, fontWeight: '600', color: '#222222' }}>No rooms found</Text>
              <Text style={{ fontSize: 13, color: '#6a6a6a', marginTop: 4, textAlign: 'center' }}>Try adjusting your filter or search query</Text>
            </View>
          ) : null
        }
      />

      {/* ── Room Modal ── */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isModalOpen}
        onRequestClose={closeSheet}
        statusBarTranslucent={true}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={closeSheet}
            style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}
          >
            <TouchableOpacity
              activeOpacity={1}
              onPress={(e) => e.stopPropagation?.()}
              style={{ backgroundColor: '#ffffff', borderRadius: 24, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }}
            >
              {/* Handle */}
              <View style={{ width: 36, height: 4, borderRadius: 9999, backgroundColor: '#dddddd', alignSelf: 'center', marginTop: 10, marginBottom: 6 }} />

              <View className="flex-row justify-between items-center mb-6">
                <View className="flex-row items-center gap-2.5">
                  <Text className="text-2xl font-bold text-foreground">
                    {editingRoom ? `${editingRoom.room_number}` : 'Add New Room'}
                  </Text>
                  {editingRoom && (
                    <TouchableOpacity 
                      onPress={() => setIsEditingMode(!isEditingMode)}
                      className="px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-800 flex-row items-center gap-1"
                    >
                      <Edit size={12} color="#6B7280" />
                      <Text className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                        {isEditingMode ? 'View Guests' : 'Edit'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
                <TouchableOpacity onPress={closeSheet} className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full">
                  <X size={20} color="#9CA3AF" />
                </TouchableOpacity>
              </View>

              <ScrollView 
                showsVerticalScrollIndicator={false} 
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ paddingBottom: 10 }}
              >
                {editingRoom && !isEditingMode ? (
                  /* ROOM DETAILS & CHECKED-IN GUESTS VIEW */
                  <View>
                    <View className="bg-gray-50 dark:bg-gray-800/40 p-4 rounded-2xl mb-6 border border-gray-100 dark:border-gray-800 flex-row justify-between items-center">
                      <View>
                        <Text className="text-xs text-gray-400 font-medium">Room Type</Text>
                        <Text className="text-base font-bold text-foreground">{editingRoom.room_type || 'Standard Room'}</Text>
                      </View>
                      <View className={`px-3 py-1 rounded-full ${getStatusConfig(editingRoom.status).badgeBg} ${getStatusConfig(editingRoom.status).borderColor} border`}>
                        <Text className={`text-xs font-bold capitalize ${getStatusConfig(editingRoom.status).textColor}`}>
                          {editingRoom.status}
                        </Text>
                      </View>
                    </View>

                    <Text className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 ml-1">
                      Today's / Active Guests ({roomGuests.length})
                    </Text>

                    {isLoadingGuests ? (
                      <Text className="text-gray-400 text-center py-6 text-sm">Loading guest records...</Text>
                    ) : roomGuests.length === 0 ? (
                      <View className="bg-gray-50 dark:bg-gray-800/20 p-6 rounded-2xl items-center justify-center border border-dashed border-gray-200 dark:border-gray-800 mb-6">
                        <Users size={24} color="#9CA3AF" className="mb-2" />
                        <Text className="text-gray-500 text-sm font-semibold">No guests checked in</Text>
                        <Text className="text-xs text-gray-400 mt-1">This room is currently empty.</Text>
                      </View>
                    ) : (
                      <View className="space-y-3 mb-6">
                        {roomGuests.map((guest) => (
                          <View 
                            key={guest.id} 
                            className="bg-gray-50 dark:bg-gray-800/40 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 mb-3 flex-row items-center justify-between"
                          >
                            <TouchableOpacity 
                              onPress={() => setSelectedGuestDetail(guest)}
                              className="flex-row items-center gap-3 flex-1 mr-2"
                            >
                              <View className="w-10 h-10 rounded-full bg-primary/10 items-center justify-center">
                                <Text className="text-foreground font-bold text-base">
                                  {guest.full_name ? guest.full_name.charAt(0).toUpperCase() : '?'}
                                </Text>
                              </View>
                              <View className="flex-1">
                                <Text className="text-sm font-bold text-foreground" numberOfLines={1}>{guest.full_name}</Text>
                                <Text className="text-[11px] text-gray-500 font-medium">{guest.id_type || 'ID'}: {guest.id_number || 'N/A'}</Text>
                              </View>
                            </TouchableOpacity>

                            <View className="flex-row items-center gap-2">
                              <TouchableOpacity 
                                onPress={() => setSelectedGuestDetail(guest)}
                                className="bg-primary/10 px-2.5 py-1.5 rounded-xl"
                              >
                                <Text className="text-[10px] font-bold text-primary">View ID</Text>
                              </TouchableOpacity>

                              <TouchableOpacity 
                                onPress={() => handleCheckoutGuest(guest)}
                                className="bg-red-500/10 active:bg-red-500/20 px-2.5 py-1.5 rounded-xl flex-row items-center gap-1"
                              >
                                <UserX size={12} color="#EF4444" />
                                <Text className="text-[10px] font-bold text-red-500">Check-out</Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        ))}
                      </View>
                    )}

                    <TouchableOpacity 
                      onPress={() => setIsEditingMode(true)}
                      className="bg-gray-100 dark:bg-gray-800 p-3.5 rounded-2xl items-center mb-2"
                    >
                      <Text className="text-xs font-bold text-foreground">Edit Room Details & Status</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  /* EDIT / CREATE FORM VIEW */
                  <View>
                    <Input
                      label="Room Number *"
                      placeholder="e.g. 101, 102"
                      value={roomNumber}
                      onChangeText={setRoomNumber}
                      returnKeyType="next"
                    />
                    
                    <Input
                      label="Room Type"
                      placeholder="e.g. Standard, Deluxe, Suite"
                      value={roomType}
                      onChangeText={setRoomType}
                      returnKeyType="next"
                    />

                    <Input
                      label="Price per Night (₹)"
                      placeholder="e.g. 1500"
                      keyboardType="numeric"
                      value={roomPrice}
                      onChangeText={setRoomPrice}
                      returnKeyType="done"
                      blurOnSubmit={true}
                    />

                    <Text className="text-sm font-semibold text-foreground mb-2 ml-1 mt-2">Status</Text>
                    <View className="flex-row flex-wrap gap-2.5 mb-6">
                      {(['available', 'occupied', 'cleaning', 'maintenance'] as const).map((status) => {
                        const cfg = getStatusConfig(status);
                        const isSelected = roomStatus === status;
                        return (
                          <TouchableOpacity
                            key={status}
                            activeOpacity={0.7}
                            onPress={() => setRoomStatus(status)}
                            className={`flex-row items-center gap-1.5 px-4 py-2.5 rounded-xl border ${
                              isSelected 
                                ? `${cfg.badgeBg} ${cfg.borderColor}` 
                                : 'border-gray-200 bg-white dark:border-gray-800'
                            }`}
                          >
                            {cfg.icon}
                            <Text className={`font-semibold capitalize text-xs ${
                              isSelected ? cfg.textColor : 'text-gray-600 dark:text-gray-400'
                            }`}>
                              {status}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    <View className="pt-4 border-t border-gray-100 dark:border-gray-800 flex-row gap-3">
                      {editingRoom && (
                        <TouchableOpacity 
                          onPress={handleDelete}
                          activeOpacity={0.7}
                          className="bg-red-50 dark:bg-red-950/40 h-14 w-14 rounded-2xl items-center justify-center border border-red-200 dark:border-red-900/40"
                        >
                          <Trash size={24} color="#EF4444" />
                        </TouchableOpacity>
                      )}
                      <Button 
                        label={editingRoom ? "Save Changes" : "Create Room"} 
                        onPress={handleSave}
                        className="flex-1 h-14"
                        isLoading={isLoading}
                      />
                    </View>
                  </View>
                )}
              </ScrollView>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

      {/* GUEST ID & DETAILS MODAL POPUP */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={selectedGuestDetail !== null}
        onRequestClose={() => setSelectedGuestDetail(null)}
        statusBarTranslucent={true}
      >
        <TouchableOpacity 
          activeOpacity={1}
          onPress={() => setSelectedGuestDetail(null)}
          className="flex-1 bg-black/70 justify-end"
        >
          <TouchableOpacity 
            activeOpacity={1}
            onPress={(e) => e.stopPropagation?.()}
            className="bg-white dark:bg-[#12141C] rounded-t-3xl p-6 max-h-[90%]"
          >
            <View className="flex-row justify-between items-center mb-4 pb-3 border-b border-gray-100 dark:border-gray-800">
              <View>
                <Text className="text-xl font-bold text-foreground">{selectedGuestDetail?.full_name}</Text>
                <Text className="text-xs text-gray-500 font-medium">Guest Registration & ID Documents</Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedGuestDetail(null)} className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full">
                <X size={20} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
              {/* ID CARD PHOTOS (FRONT & BACK) */}
              {(selectedGuestDetail?.photo_uri || selectedGuestDetail?.back_photo_uri) ? (
                <View className="mb-6">
                  <Text className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 ml-1">
                    ID Card Photos ({selectedGuestDetail?.photo_uri && selectedGuestDetail?.back_photo_uri ? 'Front & Back' : 'Scanned ID'})
                  </Text>
                  <View className="gap-4">
                    {selectedGuestDetail?.photo_uri ? (
                      <View className="bg-gray-50 dark:bg-gray-800/40 p-3 rounded-2xl border border-gray-100 dark:border-gray-800">
                        <View className="bg-gray-200 dark:bg-gray-700 px-3 py-1 rounded-md self-start mb-2">
                          <Text className="text-xs font-bold text-foreground">Front Side ID</Text>
                        </View>
                        <Image 
                          source={{ uri: selectedGuestDetail.photo_uri }} 
                          style={{ width: '100%', height: 180, borderRadius: 14 }}
                          resizeMode="cover"
                        />
                      </View>
                    ) : null}

                    {selectedGuestDetail?.back_photo_uri ? (
                      <View className="bg-gray-50 dark:bg-gray-800/40 p-3 rounded-2xl border border-gray-100 dark:border-gray-800">
                        <View className="bg-gray-200 dark:bg-gray-700 px-3 py-1 rounded-md self-start mb-2">
                          <Text className="text-xs font-bold text-foreground">Back Side ID</Text>
                        </View>
                        <Image 
                          source={{ uri: selectedGuestDetail.back_photo_uri }} 
                          style={{ width: '100%', height: 180, borderRadius: 14 }}
                          resizeMode="cover"
                        />
                      </View>
                    ) : null}
                  </View>
                </View>
              ) : (
                <View className="bg-gray-50 dark:bg-gray-800/20 p-6 rounded-2xl items-center justify-center border border-dashed border-gray-200 dark:border-gray-800 mb-6">
                  <IdCard size={28} color="#9CA3AF" className="mb-2" />
                  <Text className="text-gray-500 text-sm font-semibold">No ID Card Photo Saved</Text>
                </View>
              )}

              {/* GUEST INFO DETAILS */}
              <View className="bg-gray-50 dark:bg-gray-800/40 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 gap-3 mb-6">
                <View className="flex-row items-center justify-between pb-2 border-b border-gray-200/50 dark:border-gray-700/40">
                  <Text className="text-xs font-medium text-gray-500">Document Type</Text>
                  <Text className="text-xs font-bold text-foreground">{selectedGuestDetail?.id_type || 'N/A'}</Text>
                </View>

                <View className="flex-row items-center justify-between pb-2 border-b border-gray-200/50 dark:border-gray-700/40">
                  <Text className="text-xs font-medium text-gray-500">ID Number</Text>
                  <Text className="text-xs font-bold text-foreground">{selectedGuestDetail?.id_number || 'N/A'}</Text>
                </View>

                <View className="flex-row items-center justify-between pb-2 border-b border-gray-200/50 dark:border-gray-700/40">
                  <Text className="text-xs font-medium text-gray-500">Phone</Text>
                  <Text className="text-xs font-bold text-foreground">{selectedGuestDetail?.phone || 'N/A'}</Text>
                </View>

                <View className="flex-row items-center justify-between pb-2 border-b border-gray-200/50 dark:border-gray-700/40">
                  <Text className="text-xs font-medium text-gray-500">Date of Birth</Text>
                  <Text className="text-xs font-bold text-foreground">{selectedGuestDetail?.dob || 'N/A'}</Text>
                </View>

                <View className="flex-row items-center justify-between">
                  <Text className="text-xs font-medium text-gray-500">Address</Text>
                  <Text className="text-xs font-bold text-foreground max-w-[60%] text-right">{selectedGuestDetail?.address || 'N/A'}</Text>
                </View>
              </View>

              {/* CHECK-OUT GUEST ACTION BUTTON */}
              <TouchableOpacity
                onPress={() => handleCheckoutGuest(selectedGuestDetail)}
                className="bg-red-500/10 border border-red-500/30 p-4 rounded-2xl flex-row items-center justify-center gap-2 active:bg-red-500/20"
              >
                <UserX size={18} color="#EF4444" />
                <Text className="font-bold text-red-500 text-sm">Check-out & Remove Guest from Room</Text>
              </TouchableOpacity>
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}
