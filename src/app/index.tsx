import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/store/useAuthStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { View, ActivityIndicator } from 'react-native';

export default function Index() {
  const router = useRouter();
  const { isUnlocked, checkPinSetup } = useAuthStore();
  const { hasCompletedSetup } = useSettingsStore();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    if (typeof checkPinSetup === 'function') {
      checkPinSetup();
    }
    // Give navigation container a moment to mount before redirecting
    const timer = setTimeout(() => {
      setIsMounted(true);
    }, 50);
    return () => clearTimeout(timer);
  }, [checkPinSetup]);

  useEffect(() => {
    if (!isMounted) return;

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
  }, [isMounted, isUnlocked, hasCompletedSetup, router]);

  return (
    <View className="flex-1 items-center justify-center bg-background">
      <ActivityIndicator size="large" color="#38BDF8" />
    </View>
  );
}
