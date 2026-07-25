import { useEffect } from 'react';
import { useRootNavigationState, useRouter } from 'expo-router';
import { useAuthStore } from '@/store/useAuthStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { View, ActivityIndicator } from 'react-native';

export default function Index() {
  const rootNavigationState = useRootNavigationState();
  const router = useRouter();
  const { isUnlocked, hasPin, checkPinSetup } = useAuthStore();
  const { hasCompletedSetup } = useSettingsStore();

  useEffect(() => {
    checkPinSetup();
  }, []);

  useEffect(() => {
    // Wait until root navigation state context is initialized before performing redirection
    if (!rootNavigationState?.key) return;

    if (!hasPin || !isUnlocked) {
      router.replace('/auth');
    } else if (!hasCompletedSetup) {
      router.replace('/setup');
    } else {
      router.replace('/(tabs)');
    }
  }, [rootNavigationState?.key, hasPin, isUnlocked, hasCompletedSetup]);

  return (
    <View className="flex-1 items-center justify-center bg-background">
      <ActivityIndicator size="large" color="#38BDF8" />
    </View>
  );
}
