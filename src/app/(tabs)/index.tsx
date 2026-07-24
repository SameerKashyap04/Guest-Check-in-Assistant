import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, RefreshControl, TouchableOpacity, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GlassCard } from '@/components/GlassCard';
import { Users, LogIn, LogOut, AlertCircle, Search, FileBarChart } from 'lucide-react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Input } from '@/components/Input';
import { openDatabase } from '@/database';

export default function DashboardScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [recentGuests, setRecentGuests] = useState<any[]>([]);
  const router = useRouter();

  const currentHour = new Date().getHours();
  let greeting = 'Good Evening';
  if (currentHour < 12) greeting = 'Good Morning';
  else if (currentHour < 18) greeting = 'Good Afternoon';
  const todayDate = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  const fetchGuests = async () => {
    try {
      const db = await openDatabase();
      const guests = await db.getAllAsync('SELECT * FROM guests ORDER BY id DESC LIMIT 5');
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

        <View className="flex-row justify-between items-center mb-6">
          <TouchableOpacity 
            className="flex-1 mr-3"
            onPress={() => router.push('/search')}
            activeOpacity={0.7}
          >
            <View pointerEvents="none">
              <Input 
                placeholder="Search guests, rooms, IDs..." 
                icon={<Search size={20} color="#9498AA" />}
                editable={false}
              />
            </View>
          </TouchableOpacity>
          <TouchableOpacity 
            className="w-14 h-14 bg-white dark:bg-black/20 border border-transparent dark:border-transparent rounded-2xl items-center justify-center"
            style={Platform.OS === 'web' ? { transition: 'all 0.2s ease' } : undefined}
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

        <Text className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4 mt-4">
          Recent Registrations
        </Text>
        
        <GlassCard className="mb-4">
          {recentGuests.length === 0 ? (
            <Text className="text-gray-500 text-center py-4">No recent guests found.</Text>
          ) : (
            recentGuests.map((guest, index) => (
              <View 
                key={guest.id} 
                className={`flex-row justify-between items-center ${index !== recentGuests.length - 1 ? 'border-b border-transparent dark:border-transparent pb-3 mb-3' : ''}`}
              >
                <View className="flex-row items-center">
                  <View className="w-10 h-10 rounded-full bg-[#38BDF8]/10 items-center justify-center mr-3">
                    <Text className="text-[#38BDF8] font-bold text-lg">
                      {guest.full_name ? guest.full_name.charAt(0).toUpperCase() : '?'}
                    </Text>
                  </View>
                  <View>
                    <Text className="text-base font-semibold text-foreground">{guest.full_name}</Text>
                    <Text className="text-xs text-gray-500 mt-0.5">ID: {guest.id_number} • {guest.id_type}</Text>
                  </View>
                </View>
                <View className="bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded-full">
                  <Text className="text-xs font-medium text-green-700 dark:text-green-400">Verified</Text>
                </View>
              </View>
            ))
          )}
        </GlassCard>

      </ScrollView>
    </SafeAreaView>
  );
}
