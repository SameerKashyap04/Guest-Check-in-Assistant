import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GlassCard } from '@/components/GlassCard';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useAuthStore } from '@/store/useAuthStore';
import { Button } from '@/components/Button';
import { Building2, UserCircle, LogOut, ChevronRight } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { TouchableOpacity } from 'react-native';

export default function SettingsScreen() {
  const { businessName } = useSettingsStore();
  const { lock } = useAuthStore();
  const router = useRouter();

  const handleLock = () => {
    lock();
    router.replace('/auth');
  };

  return (
    <SafeAreaView edges={['left', 'right']} className="flex-1 bg-background">
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        
        <GlassCard className="mb-6 flex-row items-center p-5">
          <View className="w-20 h-20 rounded-full bg-indigo-50 dark:bg-indigo-900/20 items-center justify-center mr-5">
            <View className="w-16 h-16 bg-primary rounded-full items-center justify-center shadow-lg shadow-primary/30">
              <Building2 size={32} color="#ffffff" />
            </View>
          </View>
          <View>
            <Text className="text-2xl font-bold text-foreground mb-1">{businessName || 'Property Name'}</Text>
            <Text className="text-sm font-medium text-foreground">Owner Account</Text>
          </View>
        </GlassCard>

        <Text className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
          General Settings
        </Text>

        <GlassCard className="mb-6 p-2 overflow-hidden">
          {['Property Profile', 'Language', 'Theme (Dark/Light)'].map((item, index) => (
            <TouchableOpacity 
              key={item}
              activeOpacity={0.7}
              className={`flex-row justify-between items-center p-4 active:bg-gray-50 dark:active:bg-gray-800/50 ${
                index !== 2 ? 'border-b border-transparent dark:border-transparent' : ''
              }`}
            >
              <Text className="text-base font-medium text-foreground">{item}</Text>
              <ChevronRight size={20} color="#9CA3AF" />
            </TouchableOpacity>
          ))}
        </GlassCard>

        <Text className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
          Security
        </Text>

        <GlassCard className="mb-8 p-2 overflow-hidden">
          {['Change PIN', 'Biometrics', 'Auto-Lock'].map((item, index) => (
            <TouchableOpacity 
              key={item}
              activeOpacity={0.7}
              className={`flex-row justify-between items-center p-4 active:bg-gray-50 dark:active:bg-gray-800/50 ${
                index !== 2 ? 'border-b border-transparent dark:border-transparent' : ''
              }`}
            >
              <Text className="text-base font-medium text-foreground">{item}</Text>
              <ChevronRight size={20} color="#9CA3AF" />
            </TouchableOpacity>
          ))}
        </GlassCard>

        <Button 
          label="Lock App" 
          variant="outline" 
          icon={<LogOut size={20} color="#1F2937" className="mr-2" />}
          onPress={handleLock}
          className="mb-8"
        />

        <View className="items-center justify-center">
          <Text className="text-muted text-sm text-gray-400">Guest Check-in Assistant v1.0.0</Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
