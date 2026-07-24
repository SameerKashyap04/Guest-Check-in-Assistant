import { useEffect } from 'react';
import { Redirect } from 'expo-router';
import { useAuthStore } from '@/store/useAuthStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { View, ActivityIndicator } from 'react-native';

export default function Index() {
  const { isUnlocked, hasPin, checkPinSetup } = useAuthStore();
  const { hasCompletedSetup } = useSettingsStore();

  useEffect(() => {
    checkPinSetup();
  }, []);

  // Show a loading state while hydration completes if necessary
  if ((useAuthStore as any).persist?.hasHydrated && !(useAuthStore as any).persist.hasHydrated()) {
     return <View className="flex-1 items-center justify-center bg-background"><ActivityIndicator size="large" color="#2563EB" /></View>;
  }

  if (!hasPin || !isUnlocked) {
    return <Redirect href="/auth" />;
  }

  if (!hasCompletedSetup) {
    return <Redirect href="/setup" />;
  }

  return <Redirect href="/(tabs)" />;
}
