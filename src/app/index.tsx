import { useEffect } from 'react';
import { useRouter, Stack } from 'expo-router';
import { useAuthStore } from '@/store/useAuthStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { View, ActivityIndicator } from 'react-native';

export default function Index() {
  const router = useRouter();
  const { isUnlocked, checkPinSetup } = useAuthStore();
  const { hasCompletedSetup } = useSettingsStore();

  useEffect(() => {
    if (typeof checkPinSetup === 'function') {
      checkPinSetup();
    }
  }, [checkPinSetup]);

  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        if (!isUnlocked) {
          router.replace('/auth');
        } else if (!hasCompletedSetup) {
          router.replace('/setup');
        } else {
          router.replace('/(tabs)');
        }
      } catch (e) {
        console.warn('Navigation redirect error', e);
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [isUnlocked, hasCompletedSetup, router]);

  return (
    <View className="flex-1 items-center justify-center bg-background">
      <Stack.Screen options={{ headerShown: false }} />
      <ActivityIndicator size="large" color="#38BDF8" />
    </View>
  );
}
