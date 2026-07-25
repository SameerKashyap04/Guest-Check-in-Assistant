import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, Alert, TextInput, Modal, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GlassCard } from '@/components/GlassCard';
import { useRoomsStore } from '@/store/useRoomsStore';
import { Plus, X, Trash, Search, LayoutGrid, List, BedDouble, CheckCircle2, UserCheck, Sparkles, Wrench, Users, Calendar, Phone, IdCard, Edit } from 'lucide-react-native';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { Room } from '@/database/rooms';
import { getGuestsForRoom } from '@/database/stays';
import { useColorScheme } from 'nativewind';

export default function RoomsScreen() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
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

  const renderGridItem = ({ item }: { item: Room }) => {
    const config = getStatusConfig(item.status);

    return (
      <TouchableOpacity 
        activeOpacity={0.7} 
        onPress={() => openEditSheet(item)}
        className="w-[48%] mb-4"
      >
        <GlassCard variant="elevated" className={`p-4 rounded-2xl border border-gray-100 dark:border-white/10 flex-col justify-between min-h-[130px]`}>
          <View className="flex-row justify-between items-start mb-3">
            <View className="w-10 h-10 rounded-xl bg-primary/10 items-center justify-center">
              <BedDouble size={20} color={isDark ? '#38BDF8' : '#000000'} />
            </View>
            <View className={`flex-row items-center gap-1.5 px-2.5 py-1 rounded-full ${config.badgeBg} ${config.borderColor} border`}>
              {config.icon}
              <Text className={`text-[11px] font-bold capitalize ${config.textColor}`}>
                {config.label}
              </Text>
            </View>
          </View>
          
          <View>
            <Text className="text-xl font-bold text-foreground tracking-tight">Room {item.room_number}</Text>
            <Text className="text-xs text-gray-400 font-medium mt-0.5" numberOfLines={1}>{item.room_type || 'Standard Room'}</Text>
            <Text className="text-xs font-bold text-primary mt-1">₹{item.price || 0} / night</Text>
          </View>
        </GlassCard>
      </TouchableOpacity>
    );
  };

  const renderListItem = ({ item }: { item: Room }) => {
    const config = getStatusConfig(item.status);

    return (
      <TouchableOpacity 
        activeOpacity={0.7} 
        onPress={() => openEditSheet(item)}
        className="mb-3"
      >
        <GlassCard variant="elevated" className="p-4 rounded-2xl border border-gray-100 dark:border-white/10 flex-row justify-between items-center">
          <View className="flex-row items-center space-x-3 gap-3">
            <View className="w-11 h-11 rounded-xl bg-primary/10 items-center justify-center">
              <BedDouble size={22} color={isDark ? '#38BDF8' : '#000000'} />
            </View>
            <View>
              <Text className="text-lg font-bold text-foreground tracking-tight">Room {item.room_number}</Text>
              <Text className="text-xs text-gray-400 font-medium mt-0.5">{item.room_type || 'Standard Room'} {item.price ? `• ₹${item.price}/night` : ''}</Text>
            </View>
          </View>

          <View className={`flex-row items-center gap-1.5 px-3 py-1.5 rounded-full ${config.badgeBg} ${config.borderColor} border`}>
            {config.icon}
            <Text className={`text-xs font-bold capitalize ${config.textColor}`}>
              {config.label}
            </Text>
          </View>
        </GlassCard>
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
    <SafeAreaView edges={['left', 'right', 'top']} className="flex-1 bg-background">
      {/* Top Header */}
      <View className="px-5 pt-6 mt-2 pb-2 flex-row justify-between items-center">
        <View>
          <Text className="text-3xl font-bold text-foreground">Rooms</Text>
          <Text className="text-xs text-gray-400 font-medium mt-0.5">{total} Total Properties & Rooms</Text>
        </View>
        <TouchableOpacity 
          onPress={openAddSheet}
          activeOpacity={0.8}
          className="bg-primary h-11 px-4 rounded-xl flex-row items-center gap-2 shadow-md shadow-primary/20"
        >
          <Plus size={20} color="#ffffff" />
          <Text className="text-white font-semibold text-sm">Add Room</Text>
        </TouchableOpacity>
      </View>

      {/* Quick Summary Cards Horizontal Row */}
      <View className="my-3">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 10 }}>
          <GlassCard className="p-3 px-4 rounded-2xl border border-gray-100 dark:border-white/10 flex-row items-center gap-3">
            <View className="w-8 h-8 rounded-lg bg-emerald-500/15 items-center justify-center">
              <CheckCircle2 size={18} color="#10B981" />
            </View>
            <View>
              <Text className="text-xs font-medium text-gray-400">Available</Text>
              <Text className="text-base font-bold text-foreground">{available}</Text>
            </View>
          </GlassCard>

          <GlassCard className="p-3 px-4 rounded-2xl border border-gray-100 dark:border-white/10 flex-row items-center gap-3">
            <View className="w-8 h-8 rounded-lg bg-sky-500/15 items-center justify-center">
              <UserCheck size={18} color="#0EA5E9" />
            </View>
            <View>
              <Text className="text-xs font-medium text-gray-400">Occupied</Text>
              <Text className="text-base font-bold text-foreground">{occupied}</Text>
            </View>
          </GlassCard>

          <GlassCard className="p-3 px-4 rounded-2xl border border-gray-100 dark:border-white/10 flex-row items-center gap-3">
            <View className="w-8 h-8 rounded-lg bg-amber-500/15 items-center justify-center">
              <Sparkles size={18} color="#F59E0B" />
            </View>
            <View>
              <Text className="text-xs font-medium text-gray-400">Cleaning</Text>
              <Text className="text-base font-bold text-foreground">{cleaning}</Text>
            </View>
          </GlassCard>

          <GlassCard className="p-3 px-4 rounded-2xl border border-gray-100 dark:border-white/10 flex-row items-center gap-3">
            <View className="w-8 h-8 rounded-lg bg-rose-500/15 items-center justify-center">
              <Wrench size={18} color="#F43F5E" />
            </View>
            <View>
              <Text className="text-xs font-medium text-gray-400">Maintenance</Text>
              <Text className="text-base font-bold text-foreground">{maintenance}</Text>
            </View>
          </GlassCard>
        </ScrollView>
      </View>

      {/* Search & Layout View Toggle */}
      <View className="px-5 mb-3 flex-row gap-3 items-center">
        <View className="flex-1 flex-row items-center bg-white dark:bg-black/30 border border-gray-100 dark:border-white/10 rounded-xl px-3.5 py-2.5">
          <Search size={18} color="#9498AA" className="mr-2" />
          <TextInput 
            placeholder="Search room number or type..."
            placeholderTextColor="#9498AA"
            value={searchQuery}
            onChangeText={setSearchQuery}
            className="flex-1 text-sm text-foreground p-0 font-medium"
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={16} color="#9498AA" />
            </TouchableOpacity>
          ) : null}
        </View>

        <View className="flex-row bg-white dark:bg-black/30 border border-gray-100 dark:border-white/10 rounded-xl p-1">
          <TouchableOpacity 
            onPress={() => setIsGridView(true)}
            className={`p-1.5 rounded-lg ${isGridView ? 'bg-primary' : 'bg-transparent'}`}
          >
            <LayoutGrid size={18} color={isGridView ? '#FFFFFF' : '#9498AA'} />
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => setIsGridView(false)}
            className={`p-1.5 rounded-lg ${!isGridView ? 'bg-primary' : 'bg-transparent'}`}
          >
            <List size={18} color={!isGridView ? '#FFFFFF' : '#9498AA'} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Filter Tabs */}
      <View className="mb-3">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}>
          {filterOptions.map(f => (
            <TouchableOpacity 
              key={f.label}
              onPress={() => setFilter(f.label)}
              activeOpacity={0.7}
              className={`flex-row items-center gap-1.5 px-3.5 py-1.5 rounded-full border ${
                filter === f.label 
                  ? 'bg-primary border-primary' 
                  : 'bg-white/80 border-gray-100 dark:bg-black/30 dark:border-white/10'
              }`}
            >
              <Text className={`font-semibold text-xs ${filter === f.label ? 'text-white' : 'text-gray-600 dark:text-gray-300'}`}>
                {f.label}
              </Text>
              <View className={`px-1.5 py-0.5 rounded-full ${filter === f.label ? 'bg-white/20' : 'bg-gray-100 dark:bg-gray-800'}`}>
                <Text className={`text-[10px] font-bold ${filter === f.label ? 'text-white' : 'text-gray-500 dark:text-gray-400'}`}>
                  {f.count}
                </Text>
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
            <View className="py-12 items-center justify-center">
              <View className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 items-center justify-center mb-3">
                <BedDouble size={28} color="#9498AA" />
              </View>
              <Text className="text-gray-600 dark:text-gray-300 font-semibold text-base">No rooms found</Text>
              <Text className="text-gray-400 text-xs mt-1 text-center">Try adjusting your filter or search query</Text>
            </View>
          ) : null
        }
      />

      {/* Add / Edit / Room Details Modal */}
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
            className="flex-1 bg-black/60 justify-end"
          >
            <TouchableOpacity 
              activeOpacity={1}
              onPress={(e) => e.stopPropagation?.()}
              className="bg-white dark:bg-[#12141C] rounded-t-3xl p-6"
            >
              <View className="flex-row justify-between items-center mb-6">
                <View className="flex-row items-center gap-2.5">
                  <Text className="text-2xl font-bold text-foreground">
                    {editingRoom ? `Room ${editingRoom.room_number}` : 'Add New Room'}
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
                          <TouchableOpacity 
                            key={guest.id} 
                            onPress={() => setSelectedGuestDetail(guest)}
                            activeOpacity={0.7}
                            className="bg-gray-50 dark:bg-gray-800/40 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 mb-3 flex-row items-center justify-between"
                          >
                            <View className="flex-row items-center gap-3">
                              <View className="w-10 h-10 rounded-full bg-primary/10 items-center justify-center">
                                <Text className="text-foreground font-bold text-base">
                                  {guest.full_name ? guest.full_name.charAt(0).toUpperCase() : '?'}
                                </Text>
                              </View>
                              <View>
                                <Text className="text-sm font-bold text-foreground">{guest.full_name}</Text>
                                <Text className="text-[11px] text-gray-500 font-medium">{guest.id_type || 'ID'}: {guest.id_number || 'N/A'}</Text>
                              </View>
                            </View>

                            <View className="items-end gap-1">
                              <View className="bg-emerald-100 dark:bg-emerald-950/40 px-2.5 py-0.5 rounded-full">
                                <Text className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">Checked In</Text>
                              </View>
                              <Text className="text-[10px] text-primary font-semibold">Tap to view ID Card →</Text>
                            </View>
                          </TouchableOpacity>
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
                      label="Room Number"
                      placeholder="e.g. 101"
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
              <View className="bg-gray-50 dark:bg-gray-800/40 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 gap-3">
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
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}
