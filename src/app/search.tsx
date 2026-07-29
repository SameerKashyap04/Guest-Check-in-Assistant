import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, Modal, Image, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Input } from '@/components/Input';
import { Search, ChevronLeft, User, DoorOpen, X, Phone, IdCard, MapPin, Calendar, CheckCircle2 } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { openDatabase } from '@/database';
import { GlassCard } from '@/components/GlassCard';
import { useSettingsStore } from '@/store/useSettingsStore';

export default function SearchScreen() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedGuest, setSelectedGuest] = useState<any | null>(null);
  const router = useRouter();

  const handleSearch = async (searchTerm: string) => {
    setQuery(searchTerm);
    if (!searchTerm.trim()) {
      setResults([]);
      return;
    }

    try {
      setIsLoading(true);
      const { propertyId } = useSettingsStore.getState();
      const activePropertyId = propertyId || 'HS-DEFAULT';
      const db = await openDatabase();
      const searchPattern = `%${searchTerm.trim()}%`;

      const searchResults = await db.getAllAsync(`
        SELECT g.*, r.room_number, r.room_type, s.check_in_date, s.check_out_date
        FROM guests g
        LEFT JOIN stays s ON s.guest_id = g.id
        LEFT JOIN rooms r ON r.id = s.room_id
        WHERE (g.property_id = ? OR g.property_id IS NULL OR g.property_id = '')
          AND (g.full_name LIKE ? OR g.phone LIKE ? OR g.id_number LIKE ? OR r.room_number LIKE ? OR g.address LIKE ?)
        ORDER BY g.id DESC
        LIMIT 25
      `, [activePropertyId, searchPattern, searchPattern, searchPattern, searchPattern, searchPattern]);

      setResults(searchResults as any[]);
    } catch (e) {
      console.error('Search query error', e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-background">
      {/* Header Search Bar */}
      <View className="flex-row items-center px-4 pt-3 pb-3 border-b border-gray-200/50 dark:border-gray-800 gap-2">
        <TouchableOpacity 
          onPress={() => router.back()}
          className="p-2 -ml-2 rounded-full active:bg-gray-100 dark:active:bg-gray-800"
        >
          <ChevronLeft size={26} color="#38BDF8" />
        </TouchableOpacity>
        
        <View className="flex-1">
          <Input 
            placeholder="Search by name, phone, ID, room..." 
            value={query}
            onChangeText={handleSearch}
            autoFocus
            icon={<Search size={18} color="#38BDF8" />}
            className="mb-0"
          />
        </View>
        {query.length > 0 && (
          <TouchableOpacity onPress={() => handleSearch('')} className="p-2">
            <X size={20} color="#9CA3AF" />
          </TouchableOpacity>
        )}
      </View>

      {/* Results Header */}
      {query.trim().length > 0 && (
        <View className="px-5 py-2.5 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-800">
          <Text className="text-xs font-semibold text-gray-500">
            {isLoading ? 'Searching...' : `Found ${results.length} matching guest records`}
          </Text>
        </View>
      )}

      {/* Search Results List */}
      <FlatList
        data={results}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center mt-20 px-8">
            <View className="w-16 h-16 rounded-full bg-sky-500/10 items-center justify-center mb-4">
              <Search size={32} color="#38BDF8" />
            </View>
            <Text className="text-gray-500 font-semibold text-center text-base">
              {query.length > 0 ? `No guests found for "${query}"` : 'Type a guest name, phone, Aadhaar/ID, or room number to search'}
            </Text>
            <Text className="text-gray-400 text-xs text-center mt-2">
              Results update in real-time across all guest registrations.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity 
            onPress={() => setSelectedGuest(item)}
            activeOpacity={0.8}
            className="mb-3"
          >
            <GlassCard variant="elevated" className="p-4 rounded-2xl">
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center flex-1 mr-2">
                  <View className="w-12 h-12 rounded-2xl bg-sky-500/10 items-center justify-center mr-3 border border-sky-500/20 overflow-hidden">
                    {item.photo_uri || item.selfie_uri ? (
                      <Image source={{ uri: item.photo_uri || item.selfie_uri }} className="w-full h-full" resizeMode="cover" />
                    ) : (
                      <User size={22} color="#38BDF8" />
                    )}
                  </View>

                  <View className="flex-1">
                    <Text className="text-base font-bold text-foreground" numberOfLines={1}>
                      {item.full_name || 'Guest'}
                    </Text>
                    <Text className="text-xs text-gray-500 mt-0.5" numberOfLines={1}>
                      📱 {item.phone || 'No Phone'}
                    </Text>
                  </View>
                </View>

                {item.room_number && (
                  <View className="bg-sky-500/10 px-3 py-1.5 rounded-xl flex-row items-center gap-1 border border-sky-500/20">
                    <DoorOpen size={14} color="#38BDF8" />
                    <Text className="text-xs font-bold text-sky-500">Room {item.room_number}</Text>
                  </View>
                )}
              </View>

              <View className="mt-3 pt-2.5 border-t border-gray-100 dark:border-gray-800/80 flex-row items-center justify-between">
                <Text className="text-xs text-gray-500">
                  {item.id_type || 'ID'}: <Text className="font-semibold text-foreground">{item.id_number || 'N/A'}</Text>
                </Text>
                <Text className="text-xs font-bold text-sky-500">View ID Card →</Text>
              </View>
            </GlassCard>
          </TouchableOpacity>
        )}
      />

      {/* Guest ID Card Modal */}
      {selectedGuest && (
        <Modal
          visible={!!selectedGuest}
          animationType="slide"
          transparent
          onRequestClose={() => setSelectedGuest(null)}
        >
          <View className="flex-1 bg-black/60 justify-end">
            <View className="bg-white dark:bg-[#181A24] rounded-t-3xl p-6 max-h-[90%] border-t border-gray-200 dark:border-gray-800">
              <View className="flex-row justify-between items-center pb-4 border-b border-gray-200/50 dark:border-gray-800">
                <View>
                  <Text className="text-xl font-bold text-foreground">{selectedGuest.full_name}</Text>
                  <Text className="text-xs text-gray-500 font-medium">Guest Registration Card</Text>
                </View>
                <TouchableOpacity onPress={() => setSelectedGuest(null)} className="p-2 rounded-full bg-gray-100 dark:bg-gray-800">
                  <X size={20} color="#9498AA" />
                </TouchableOpacity>
              </View>

              <ScrollView className="mt-4">
                <View className="flex-row gap-4 mb-6">
                  {selectedGuest.photo_uri || selectedGuest.selfie_uri ? (
                    <Image source={{ uri: selectedGuest.photo_uri || selectedGuest.selfie_uri }} className="w-28 h-28 rounded-2xl bg-gray-100 border border-gray-200 dark:border-gray-700" resizeMode="cover" />
                  ) : (
                    <View className="w-28 h-28 rounded-2xl bg-sky-500/10 items-center justify-center border border-sky-500/20">
                      <User size={40} color="#38BDF8" />
                    </View>
                  )}
                  {selectedGuest.back_photo_uri ? (
                    <Image source={{ uri: selectedGuest.back_photo_uri }} className="w-28 h-28 rounded-2xl bg-gray-100 border border-gray-200 dark:border-gray-700" resizeMode="cover" />
                  ) : null}
                </View>

                <View className="gap-3">
                  <View className="flex-row items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900/60 rounded-xl">
                    <DoorOpen size={18} color="#38BDF8" />
                    <View>
                      <Text className="text-xs text-gray-400 font-medium">Assigned Room</Text>
                      <Text className="text-sm font-bold text-foreground">Room {selectedGuest.room_number || 'N/A'} ({selectedGuest.room_type || 'Standard'})</Text>
                    </View>
                  </View>

                  <View className="flex-row items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900/60 rounded-xl">
                    <Phone size={18} color="#38BDF8" />
                    <View>
                      <Text className="text-xs text-gray-400 font-medium">Phone Number</Text>
                      <Text className="text-sm font-bold text-foreground">{selectedGuest.phone || 'N/A'}</Text>
                    </View>
                  </View>

                  <View className="flex-row items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900/60 rounded-xl">
                    <IdCard size={18} color="#38BDF8" />
                    <View>
                      <Text className="text-xs text-gray-400 font-medium">{selectedGuest.id_type || 'ID'} Number</Text>
                      <Text className="text-sm font-bold text-foreground">{selectedGuest.id_number || 'N/A'}</Text>
                    </View>
                  </View>

                  {selectedGuest.address ? (
                    <View className="flex-row items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900/60 rounded-xl">
                      <MapPin size={18} color="#38BDF8" />
                      <View className="flex-1">
                        <Text className="text-xs text-gray-400 font-medium">Address</Text>
                        <Text className="text-sm font-bold text-foreground">{selectedGuest.address}</Text>
                      </View>
                    </View>
                  ) : null}

                  {selectedGuest.check_in_date ? (
                    <View className="flex-row items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900/60 rounded-xl">
                      <Calendar size={18} color="#38BDF8" />
                      <View>
                        <Text className="text-xs text-gray-400 font-medium">Check-in Date</Text>
                        <Text className="text-sm font-bold text-foreground">{selectedGuest.check_in_date}</Text>
                      </View>
                    </View>
                  ) : null}
                </View>
              </ScrollView>

              <TouchableOpacity
                onPress={() => setSelectedGuest(null)}
                className="mt-6 bg-black dark:bg-white py-3.5 rounded-2xl items-center"
              >
                <Text className="text-white dark:text-black font-bold text-base">Close Card</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}
