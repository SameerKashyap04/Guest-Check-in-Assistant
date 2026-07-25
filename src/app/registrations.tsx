import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, Modal, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GlassCard } from '@/components/GlassCard';
import { ChevronLeft, ChevronRight, Search, X, User, Phone, Mail, IdCard, MapPin, Calendar, Globe, DoorOpen, Users } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { Input } from '@/components/Input';
import { openDatabase } from '@/database';

const ITEMS_PER_PAGE = 8;

export default function RegistrationsScreen() {
  const router = useRouter();
  const [guests, setGuests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedGuest, setSelectedGuest] = useState<any | null>(null);

  const fetchAllGuests = async () => {
    try {
      setIsLoading(true);
      const db = await openDatabase();
      const result = await db.getAllAsync(`
        SELECT g.*, r.room_number, r.room_type, s.check_in_date, s.check_out_date
        FROM guests g
        LEFT JOIN stays s ON s.guest_id = g.id
        LEFT JOIN rooms r ON r.id = s.room_id
        ORDER BY g.id DESC
      `);
      setGuests(result as any[]);
    } catch (e) {
      console.error('Failed to fetch all registrations', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllGuests();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAllGuests();
    setRefreshing(false);
  }, []);

  // Filter guests based on search query
  const filteredGuests = guests.filter((g) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const nameMatch = g.full_name?.toLowerCase().includes(q);
    const idMatch = g.id_number?.toLowerCase().includes(q);
    const phoneMatch = g.phone?.toLowerCase().includes(q);
    const roomMatch = g.room_number?.toString().toLowerCase().includes(q);
    return nameMatch || idMatch || phoneMatch || roomMatch;
  });

  // Reset to page 1 whenever search query changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  // Pagination calculations
  const totalItems = filteredGuests.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedGuests = filteredGuests.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  return (
    <SafeAreaView edges={['top', 'left', 'right', 'bottom']} className="flex-1 bg-background">
      {/* Header Bar */}
      <View className="flex-row items-center justify-between px-4 pt-3 pb-3 border-b border-gray-200/50 dark:border-gray-800">
        <View className="flex-row items-center flex-1 mr-2">
          <TouchableOpacity 
            onPress={() => router.back()}
            className="mr-3 p-2 -ml-2 rounded-full active:bg-gray-100 dark:active:bg-gray-800"
          >
            <ChevronLeft size={26} color="#000000" />
          </TouchableOpacity>
          <View>
            <Text className="text-xl font-bold text-foreground">All Registrations</Text>
            <Text className="text-xs text-gray-500 font-medium">{totalItems} Total Registered Guests</Text>
          </View>
        </View>

        {/* Page Badge */}
        <View className="bg-primary/10 px-3 py-1 rounded-full">
          <Text className="text-xs font-bold text-primary">Page {currentPage} of {totalPages}</Text>
        </View>
      </View>

      <ScrollView 
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Search Input */}
        <View className="mb-4">
          <Input 
            placeholder="Search by name, phone, ID number, room..." 
            value={searchQuery}
            onChangeText={setSearchQuery}
            icon={<Search size={20} color="#9498AA" />}
            className="mb-0"
          />
        </View>

        {/* Registrations List */}
        {isLoading ? (
          <View className="py-16 items-center">
            <ActivityIndicator size="large" color="#38BDF8" />
            <Text className="text-xs text-gray-400 font-medium mt-3">Loading registrations...</Text>
          </View>
        ) : paginatedGuests.length === 0 ? (
          <GlassCard className="p-8 items-center justify-center rounded-2xl my-6">
            <Users size={32} color="#9CA3AF" className="mb-2" />
            <Text className="text-base font-bold text-foreground">No Registrations Found</Text>
            <Text className="text-xs text-gray-400 mt-1 text-center">
              {searchQuery ? 'No guests match your search criteria.' : 'No guest registration records available.'}
            </Text>
          </GlassCard>
        ) : (
          <View className="gap-3 mb-6">
            {paginatedGuests.map((guest) => (
              <TouchableOpacity
                key={guest.id}
                activeOpacity={0.7}
                onPress={() => setSelectedGuest(guest)}
                className="bg-white dark:bg-black/20 p-4 rounded-2xl border border-gray-100 dark:border-white/10 shadow-sm"
              >
                <View className="flex-row items-center justify-between mb-3">
                  <View className="flex-row items-center flex-1 mr-2">
                    <View className="w-10 h-10 rounded-full bg-primary/10 items-center justify-center mr-3">
                      <Text className="text-foreground font-bold text-base">
                        {guest.full_name ? guest.full_name.charAt(0).toUpperCase() : '?'}
                      </Text>
                    </View>
                    <View className="flex-1">
                      <Text className="text-base font-bold text-foreground" numberOfLines={1}>{guest.full_name}</Text>
                      <Text className="text-xs text-gray-500 font-medium">{guest.phone || 'No phone number'}</Text>
                    </View>
                  </View>

                  <View className="bg-emerald-100 dark:bg-emerald-950/40 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800/40">
                    <Text className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400">Verified</Text>
                  </View>
                </View>

                {/* Sub details row */}
                <View className="pt-2 border-t border-gray-100 dark:border-gray-800 flex-row items-center justify-between">
                  <View className="flex-row items-center gap-2">
                    {guest.room_number ? (
                      <View className="bg-foreground/10 px-2 py-0.5 rounded-md">
                        <Text className="text-[11px] font-bold text-foreground">Room {guest.room_number}</Text>
                      </View>
                    ) : null}
                    <Text className="text-xs text-gray-500 font-medium">
                      {guest.id_type || 'ID'}: {guest.id_number || 'N/A'}
                    </Text>
                  </View>

                  <Text className="text-[11px] text-primary font-bold">Tap to view ID Card →</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* PAGINATION CONTROLS */}
        {totalPages > 1 && (
          <GlassCard className="p-4 rounded-2xl border border-gray-100 dark:border-white/10 flex-row items-center justify-between mb-8">
            <TouchableOpacity
              onPress={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className={`flex-row items-center px-4 py-2.5 rounded-xl ${currentPage === 1 ? 'opacity-40 bg-gray-100 dark:bg-gray-800' : 'bg-primary'}`}
            >
              <ChevronLeft size={16} color={currentPage === 1 ? '#9CA3AF' : '#FFFFFF'} className="mr-1" />
              <Text className={`text-xs font-bold ${currentPage === 1 ? 'text-gray-400' : 'text-white'}`}>Previous</Text>
            </TouchableOpacity>

            <View className="items-center">
              <Text className="text-xs font-bold text-foreground">Page {currentPage} of {totalPages}</Text>
              <Text className="text-[10px] text-gray-400 mt-0.5">Showing {startIndex + 1} - {Math.min(startIndex + ITEMS_PER_PAGE, totalItems)} of {totalItems}</Text>
            </View>

            <TouchableOpacity
              onPress={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className={`flex-row items-center px-4 py-2.5 rounded-xl ${currentPage === totalPages ? 'opacity-40 bg-gray-100 dark:bg-gray-800' : 'bg-primary'}`}
            >
              <Text className={`text-xs font-bold ${currentPage === totalPages ? 'text-gray-400' : 'text-white'}`}>Next</Text>
              <ChevronRight size={16} color={currentPage === totalPages ? '#9CA3AF' : '#FFFFFF'} className="ml-1" />
            </TouchableOpacity>
          </GlassCard>
        )}
      </ScrollView>

      {/* GUEST ID & DETAILS MODAL POPUP */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={selectedGuest !== null}
        onRequestClose={() => setSelectedGuest(null)}
        statusBarTranslucent={true}
      >
        <TouchableOpacity 
          activeOpacity={1}
          onPress={() => setSelectedGuest(null)}
          className="flex-1 bg-black/70 justify-end"
        >
          <TouchableOpacity 
            activeOpacity={1}
            onPress={(e) => e.stopPropagation?.()}
            className="bg-white dark:bg-[#12141C] rounded-t-3xl p-6 max-h-[90%]"
          >
            {selectedGuest && (
              <View>
                <View className="flex-row justify-between items-center mb-4 pb-3 border-b border-gray-100 dark:border-gray-800">
                  <View>
                    <Text className="text-xl font-bold text-foreground">{selectedGuest.full_name}</Text>
                    <Text className="text-xs text-emerald-600 font-semibold">Verified Registration Record</Text>
                  </View>
                  <TouchableOpacity onPress={() => setSelectedGuest(null)} className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full">
                    <X size={20} color="#9CA3AF" />
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
                  {/* GUEST SELFIE PHOTO (IF AVAILABLE) */}
                  {selectedGuest.selfie_uri ? (
                    <View className="mb-6">
                      <Text className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 ml-1">
                        Guest Selfie Photo 🤳
                      </Text>
                      <View className="bg-sky-50 dark:bg-sky-950/30 p-3 rounded-2xl border border-sky-100 dark:border-sky-800/40">
                        <View className="bg-primary/20 px-3 py-1 rounded-md self-start mb-2">
                          <Text className="text-xs font-bold text-primary">Self Check-in Selfie</Text>
                        </View>
                        <Image 
                          source={{ uri: selectedGuest.selfie_uri }} 
                          style={{ width: '100%', height: 180, borderRadius: 12 }}
                          resizeMode="cover"
                        />
                      </View>
                    </View>
                  ) : null}

                  {/* ID CARD PHOTOS (FRONT & BACK) */}
                  {(selectedGuest.photo_uri || selectedGuest.back_photo_uri) ? (
                    <View className="mb-6">
                      <Text className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 ml-1">
                        ID Card Photos ({selectedGuest.photo_uri && selectedGuest.back_photo_uri ? 'Front & Back' : 'Scanned ID'})
                      </Text>
                      <View className="gap-4">
                        {selectedGuest.photo_uri ? (
                          <View className="bg-gray-50 dark:bg-gray-800/40 p-3 rounded-2xl border border-gray-100 dark:border-gray-800">
                            <View className="bg-gray-200 dark:bg-gray-700 px-3 py-1 rounded-md self-start mb-2">
                              <Text className="text-xs font-bold text-foreground">Front Side ID</Text>
                            </View>
                            <Image 
                              source={{ uri: selectedGuest.photo_uri }} 
                              style={{ width: '100%', height: 180, borderRadius: 14 }}
                              resizeMode="cover"
                            />
                          </View>
                        ) : null}

                        {selectedGuest.back_photo_uri ? (
                          <View className="bg-gray-50 dark:bg-gray-800/40 p-3 rounded-2xl border border-gray-100 dark:border-gray-800">
                            <View className="bg-gray-200 dark:bg-gray-700 px-3 py-1 rounded-md self-start mb-2">
                              <Text className="text-xs font-bold text-foreground">Back Side ID</Text>
                            </View>
                            <Image 
                              source={{ uri: selectedGuest.back_photo_uri }} 
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
                    {selectedGuest.room_number && (
                      <View className="flex-row items-center justify-between pb-2 border-b border-gray-200/50 dark:border-gray-700/40">
                        <Text className="text-xs font-medium text-gray-500">Assigned Room</Text>
                        <Text className="text-xs font-bold text-foreground">Room {selectedGuest.room_number} ({selectedGuest.room_type || 'Standard'})</Text>
                      </View>
                    )}

                    <View className="flex-row items-center justify-between pb-2 border-b border-gray-200/50 dark:border-gray-700/40">
                      <Text className="text-xs font-medium text-gray-500">Document Type</Text>
                      <Text className="text-xs font-bold text-foreground">{selectedGuest.id_type || 'N/A'}</Text>
                    </View>

                    <View className="flex-row items-center justify-between pb-2 border-b border-gray-200/50 dark:border-gray-700/40">
                      <Text className="text-xs font-medium text-gray-500">ID Number</Text>
                      <Text className="text-xs font-bold text-foreground">{selectedGuest.id_number || 'N/A'}</Text>
                    </View>

                    <View className="flex-row items-center justify-between pb-2 border-b border-gray-200/50 dark:border-gray-700/40">
                      <Text className="text-xs font-medium text-gray-500">Phone</Text>
                      <Text className="text-xs font-bold text-foreground">{selectedGuest.phone || 'N/A'}</Text>
                    </View>

                    <View className="flex-row items-center justify-between pb-2 border-b border-gray-200/50 dark:border-gray-700/40">
                      <Text className="text-xs font-medium text-gray-500">Date of Birth</Text>
                      <Text className="text-xs font-bold text-foreground">{selectedGuest.dob || 'N/A'}</Text>
                    </View>

                    <View className="flex-row items-center justify-between pb-2 border-b border-gray-200/50 dark:border-gray-700/40">
                      <Text className="text-xs font-medium text-gray-500">Registration Date</Text>
                      <Text className="text-xs font-bold text-foreground">{selectedGuest.created_at ? new Date(selectedGuest.created_at).toLocaleDateString() : 'N/A'}</Text>
                    </View>

                    <View className="flex-row items-center justify-between">
                      <Text className="text-xs font-medium text-gray-500">Address</Text>
                      <Text className="text-xs font-bold text-foreground max-w-[60%] text-right">{selectedGuest.address || 'N/A'}</Text>
                    </View>
                  </View>
                </ScrollView>
              </View>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}
