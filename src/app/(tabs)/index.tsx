import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, RefreshControl, TouchableOpacity, Platform, Modal, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GlassCard } from '@/components/GlassCard';
import { Users, LogIn, LogOut, AlertCircle, Search, FileBarChart, X, User, Phone, Mail, IdCard, MapPin, Calendar, Globe, DoorOpen } from 'lucide-react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Input } from '@/components/Input';
import { openDatabase } from '@/database';

export default function DashboardScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [recentGuests, setRecentGuests] = useState<any[]>([]);
  const [selectedGuest, setSelectedGuest] = useState<any | null>(null);
  const router = useRouter();

  const currentHour = new Date().getHours();
  let greeting = 'Good Evening';
  if (currentHour < 12) greeting = 'Good Morning';
  else if (currentHour < 18) greeting = 'Good Afternoon';
  const todayDate = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  const fetchGuests = async () => {
    try {
      const db = await openDatabase();
      const guests = await db.getAllAsync(`
        SELECT g.*, r.room_number, r.room_type, s.check_in_date, s.check_out_date
        FROM guests g
        LEFT JOIN stays s ON s.guest_id = g.id
        LEFT JOIN rooms r ON r.id = s.room_id
        ORDER BY g.id DESC LIMIT 10
      `);
      setRecentGuests(guests as any[]);
    } catch (e) {
      console.error('Failed to fetch guests', e);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchGuests();
    }, [])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchGuests();
    setRefreshing(false);
  }, []);

  return (
    <SafeAreaView edges={['top', 'left', 'right']} className="flex-1 bg-background">
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View className="mb-6 mt-2">
          <Text className="text-2xl font-bold text-foreground">{greeting}</Text>
          <Text className="text-sm text-gray-500 mt-1 font-medium">{todayDate}</Text>
        </View>

        <View className="flex-row items-center gap-3 mb-6">
          <TouchableOpacity 
            className="flex-1"
            onPress={() => router.push('/search')}
            activeOpacity={0.7}
          >
            <View pointerEvents="none">
              <Input 
                placeholder="Search guests, rooms, IDs..." 
                icon={<Search size={20} color="#9498AA" />}
                editable={false}
                className="mb-0"
              />
            </View>
          </TouchableOpacity>
          <TouchableOpacity 
            className="w-14 h-14 bg-white dark:bg-black/20 border border-gray-100 dark:border-white/10 rounded-2xl items-center justify-center"
            style={Platform.OS === 'web' ? ({ transition: 'all 0.2s ease' } as any) : undefined}
            activeOpacity={0.7}
            onPress={() => router.push('/reports')}
          >
            <FileBarChart size={24} color="#38BDF8" />
          </TouchableOpacity>
        </View>

        <Text className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
          Today's Overview
        </Text>
        
        <View className="flex-row flex-wrap justify-between">
          <GlassCard variant="elevated" className="w-[48%] mb-4 p-5 flex-col items-center rounded-2xl border border-gray-100 dark:border-white/10">
            <LogIn size={28} color="#38BDF8" className="mb-2" />
            <Text className="text-3xl font-bold text-foreground">12</Text>
            <Text className="text-xs text-gray-500 font-medium">Check-ins</Text>
          </GlassCard>
          
          <GlassCard variant="elevated" className="w-[48%] mb-4 p-5 flex-col items-center rounded-2xl border border-gray-100 dark:border-white/10">
            <LogOut size={28} color="#14B8A6" className="mb-2" />
            <Text className="text-3xl font-bold text-foreground">5</Text>
            <Text className="text-xs text-gray-500 font-medium">Check-outs</Text>
          </GlassCard>

          <GlassCard variant="elevated" className="w-[48%] mb-4 p-5 flex-col items-center rounded-2xl border border-gray-100 dark:border-white/10">
            <Users size={28} color="#F59E0B" className="mb-2" />
            <Text className="text-3xl font-bold text-foreground">42</Text>
            <Text className="text-xs text-gray-500 font-medium">Current Guests</Text>
          </GlassCard>

          <GlassCard variant="elevated" className="w-[48%] mb-4 p-5 flex-col items-center rounded-2xl border border-gray-100 dark:border-white/10">
            <AlertCircle size={28} color="#EF4444" className="mb-2" />
            <Text className="text-3xl font-bold text-foreground">3</Text>
            <Text className="text-xs text-gray-500 font-medium">Pending Verif.</Text>
          </GlassCard>
        </View>

        <View className="flex-row justify-between items-center mb-4 mt-4">
          <Text className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
            Recent Registrations
          </Text>
          <TouchableOpacity 
            onPress={() => router.push('/registrations')}
            activeOpacity={0.7}
            className="flex-row items-center gap-1 bg-primary/10 px-3 py-1.5 rounded-full"
          >
            <Text className="text-xs font-bold text-primary">Show All →</Text>
          </TouchableOpacity>
        </View>
        
        <GlassCard className="mb-6 p-5 rounded-2xl border border-gray-100 dark:border-white/10">
          {recentGuests.length === 0 ? (
            <Text className="text-gray-500 text-center py-4">No recent guests found.</Text>
          ) : (
            recentGuests.map((guest, index) => (
              <TouchableOpacity 
                key={guest.id}
                activeOpacity={0.7}
                onPress={() => setSelectedGuest(guest)}
                className={`flex-row justify-between items-center ${index !== recentGuests.length - 1 ? 'border-b border-gray-100 dark:border-gray-800 pb-3 mb-3' : ''}`}
              >
                <View className="flex-row items-center flex-1 mr-2">
                  <View className="w-10 h-10 rounded-full bg-primary/10 items-center justify-center mr-3">
                    <Text className="text-foreground font-bold text-lg">
                      {guest.full_name ? guest.full_name.charAt(0).toUpperCase() : '?'}
                    </Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-base font-semibold text-foreground" numberOfLines={1}>{guest.full_name}</Text>
                    <View className="flex-row items-center gap-1.5 mt-0.5">
                      {guest.room_number ? (
                        <View className="bg-foreground/10 px-1.5 py-0.5 rounded">
                          <Text className="text-[11px] font-bold text-foreground">Room {guest.room_number}</Text>
                        </View>
                      ) : null}
                      <Text className="text-xs text-gray-500" numberOfLines={1}>ID: {guest.id_number || 'N/A'}</Text>
                    </View>
                  </View>
                </View>

                <View className="items-end gap-1">
                  <View className="bg-emerald-100 dark:bg-emerald-950/40 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800/40">
                    <Text className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400">Verified</Text>
                  </View>
                  <Text className="text-[10px] text-primary font-semibold">Tap to view ID Card →</Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </GlassCard>

      </ScrollView>

      {/* Guest Details Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={!!selectedGuest}
        onRequestClose={() => setSelectedGuest(null)}
      >
        <TouchableOpacity 
          activeOpacity={1} 
          onPress={() => setSelectedGuest(null)}
          className="flex-1 bg-black/50 justify-end"
        >
          <TouchableOpacity 
            activeOpacity={1}
            onPress={(e) => e.stopPropagation?.()}
            className="bg-white dark:bg-[#12141C] rounded-t-3xl p-6 max-h-[85%]"
          >
            {selectedGuest && (
              <View>
                <View className="flex-row justify-between items-center mb-6">
                  <View className="flex-row items-center gap-3">
                    <View className="w-12 h-12 rounded-full bg-primary/10 items-center justify-center">
                      <User size={24} color="#000000" />
                    </View>
                    <View>
                      <Text className="text-xl font-bold text-foreground">{selectedGuest.full_name}</Text>
                      <Text className="text-xs text-emerald-600 font-semibold">Verified Registration</Text>
                    </View>
                  </View>
                  <TouchableOpacity onPress={() => setSelectedGuest(null)} className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full">
                    <X size={20} color="#9CA3AF" />
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
                  
                  {/* ID CARD PHOTOS (FRONT & BACK) */}
                  {(selectedGuest.photo_uri || selectedGuest.back_photo_uri) ? (
                    <View className="mb-4">
                      <Text className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 ml-1">
                        ID Card Photos ({selectedGuest.photo_uri && selectedGuest.back_photo_uri ? 'Front & Back' : 'Scanned ID'})
                      </Text>
                      <View className="gap-3">
                        {selectedGuest.photo_uri ? (
                          <View className="bg-gray-50 dark:bg-gray-800/40 p-3 rounded-2xl border border-gray-100 dark:border-gray-800">
                            <View className="bg-gray-200 dark:bg-gray-700 px-2.5 py-1 rounded-md self-start mb-2">
                              <Text className="text-xs font-bold text-foreground">Front Side ID</Text>
                            </View>
                            <Image 
                              source={{ uri: selectedGuest.photo_uri }} 
                              style={{ width: '100%', height: 160, borderRadius: 12 }}
                              resizeMode="cover"
                            />
                          </View>
                        ) : null}

                        {selectedGuest.back_photo_uri ? (
                          <View className="bg-gray-50 dark:bg-gray-800/40 p-3 rounded-2xl border border-gray-100 dark:border-gray-800">
                            <View className="bg-gray-200 dark:bg-gray-700 px-2.5 py-1 rounded-md self-start mb-2">
                              <Text className="text-xs font-bold text-foreground">Back Side ID</Text>
                            </View>
                            <Image 
                              source={{ uri: selectedGuest.back_photo_uri }} 
                              style={{ width: '100%', height: 160, borderRadius: 12 }}
                              resizeMode="cover"
                            />
                          </View>
                        ) : null}
                      </View>
                    </View>
                  ) : null}

                  <View className="bg-gray-50 dark:bg-gray-800/40 p-4 rounded-2xl mb-4 border border-gray-100 dark:border-gray-800 space-y-3">
                    
                    {selectedGuest.room_number && (
                      <View className="flex-row items-center gap-3">
                        <DoorOpen size={18} color="#6B7280" />
                        <View>
                          <Text className="text-xs text-gray-400 font-medium">Assigned Room</Text>
                          <Text className="text-sm font-bold text-foreground">Room {selectedGuest.room_number} ({selectedGuest.room_type || 'Standard'})</Text>
                        </View>
                      </View>
                    )}

                    <View className="flex-row items-center gap-3">
                      <IdCard size={18} color="#6B7280" />
                      <View>
                        <Text className="text-xs text-gray-400 font-medium">Document ID ({selectedGuest.id_type || 'ID'})</Text>
                        <Text className="text-sm font-semibold text-foreground">{selectedGuest.id_number || 'N/A'}</Text>
                      </View>
                    </View>

                    <View className="flex-row items-center gap-3">
                      <Phone size={18} color="#6B7280" />
                      <View>
                        <Text className="text-xs text-gray-400 font-medium">Phone</Text>
                        <Text className="text-sm font-semibold text-foreground">{selectedGuest.phone || 'N/A'}</Text>
                      </View>
                    </View>

                    <View className="flex-row items-center gap-3">
                      <Mail size={18} color="#6B7280" />
                      <View>
                        <Text className="text-xs text-gray-400 font-medium">Email</Text>
                        <Text className="text-sm font-semibold text-foreground">{selectedGuest.email || 'N/A'}</Text>
                      </View>
                    </View>

                    <View className="flex-row items-center gap-3">
                      <Globe size={18} color="#6B7280" />
                      <View>
                        <Text className="text-xs text-gray-400 font-medium">Nationality / Gender</Text>
                        <Text className="text-sm font-semibold text-foreground">{selectedGuest.nationality || 'Indian'} • {selectedGuest.gender || 'N/A'}</Text>
                      </View>
                    </View>

                    <View className="flex-row items-center gap-3">
                      <MapPin size={18} color="#6B7280" />
                      <View className="flex-1">
                        <Text className="text-xs text-gray-400 font-medium">Address</Text>
                        <Text className="text-sm font-semibold text-foreground">
                          {[selectedGuest.address, selectedGuest.city, selectedGuest.state, selectedGuest.country, selectedGuest.pin_code].filter(Boolean).join(', ') || 'N/A'}
                        </Text>
                      </View>
                    </View>

                    <View className="flex-row items-center gap-3">
                      <Calendar size={18} color="#6B7280" />
                      <View>
                        <Text className="text-xs text-gray-400 font-medium">Registration Time</Text>
                        <Text className="text-sm font-semibold text-foreground">
                          {selectedGuest.created_at ? new Date(selectedGuest.created_at).toLocaleString() : 'Recent'}
                        </Text>
                      </View>
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
