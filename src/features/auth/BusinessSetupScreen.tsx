import React, { useState } from 'react';
import { View, Text, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { GlassCard } from '@/components/GlassCard';
import { useSettingsStore } from '@/store/useSettingsStore';
import { Hotel, MapPin, Building2 } from 'lucide-react-native';
import { useRouter } from 'expo-router';

export function BusinessSetupScreen() {
  const [businessName, setBusinessName] = useState('');
  const [address, setAddress] = useState('');
  const { setBusinessSetup } = useSettingsStore();
  const router = useRouter();

  const handleComplete = () => {
    if (businessName.trim().length > 0) {
      setBusinessSetup(businessName.trim());
      router.replace('/');
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}>
          <View className="mb-10 items-center">
            <View className="w-20 h-20 bg-primary/10 rounded-full items-center justify-center mb-6">
              <Hotel size={40} color="#000000" />
            </View>
            <Text className="text-3xl font-bold text-foreground text-center mb-2">
              Welcome to Guest Check-in Assistant
            </Text>
            <Text className="text-base text-gray-500 text-center">
              Let's set up your property details to get started.
            </Text>
          </View>

          <GlassCard className="mb-8">
            <Input
              label="Property / Business Name"
              placeholder="e.g. Sunrise Homestay"
              value={businessName}
              onChangeText={setBusinessName}
              icon={<Building2 size={20} color="#9CA3AF" />}
            />
            
            <Input
              label="Address (Optional)"
              placeholder="e.g. 123 Main St, City"
              value={address}
              onChangeText={setAddress}
              icon={<MapPin size={20} color="#9CA3AF" />}
            />
          </GlassCard>

          <Button 
            label="Complete Setup" 
            size="lg" 
            onPress={handleComplete}
            disabled={businessName.trim().length === 0}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
