import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GlassCard } from '@/components/GlassCard';
import { ChevronLeft, Download, TrendingUp, Users, Calendar } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { Button } from '@/components/Button';

export default function ReportsScreen() {
  const router = useRouter();

  return (
    <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-background">
      <View className="flex-row items-center px-4 pt-4 pb-4 border-b border-transparent dark:border-transparent">
        <TouchableOpacity 
          onPress={() => router.back()}
          className="mr-3 p-2 -ml-2 rounded-full active:bg-gray-100 dark:active:bg-gray-800"
        >
          <ChevronLeft size={28} color="#000000" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-foreground">Property Reports</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        
        <Text className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
          This Month
        </Text>
        
        <GlassCard className="mb-4">
          <View className="flex-row items-center mb-6">
            <View className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full items-center justify-center mr-4">
              <TrendingUp size={24} color="#16A34A" />
            </View>
            <View>
              <Text className="text-sm text-gray-500">Estimated Revenue</Text>
              <Text className="text-2xl font-bold text-foreground">₹1,24,500</Text>
            </View>
          </View>

          <View className="flex-row items-center mb-6">
            <View className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full items-center justify-center mr-4">
              <Users size={24} color="#2563EB" />
            </View>
          <GlassCard className="mb-4 flex-row items-center p-4">
          <View className="w-12 h-12 rounded-full bg-primary/10 items-center justify-center mr-4">
            <Users size={24} color="#000000" />
          </View>
          <View className="flex-1">
            <Text className="text-base font-semibold text-foreground">Monthly Occupancy</Text>
            <Text className="text-xs text-gray-500 mt-0.5">84% Average rate</Text>
          </View>
          <Text className="text-lg font-bold text-foreground">248 Guests</Text>
        </GlassCard>

          <View className="flex-row items-center">
            <View className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-full items-center justify-center mr-4">
              <Calendar size={24} color="#9333EA" />
            </View>
            <View>
              <Text className="text-sm text-gray-500">Occupancy Rate</Text>
              <Text className="text-2xl font-bold text-foreground">82%</Text>
            </View>
          </View>
        </GlassCard>

        <Text className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4 mt-4">
          Export Options
        </Text>

        <Button 
          label="Export Guest Register (PDF)" 
          variant="outline" 
          icon={<Download size={18} color="#000000" className="mr-2" />}
          className="mb-3"
        />

        <Button 
          label="Export Monthly Report (CSV)" 
          variant="outline" 
          icon={<Download size={18} color="#000000" className="mr-2" />}
        />

      </ScrollView>
    </SafeAreaView>
  );
}
