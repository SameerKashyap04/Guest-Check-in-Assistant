import { useEffect, useCallback } from 'react';
import { DarkTheme, DefaultTheme, ThemeProvider, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Platform } from 'react-native';
import i18n from '../i18n';
import { initDatabase } from '@/database';
import { useSettingsStore } from '@/store/useSettingsStore';
import { CustomAlertProvider } from '@/components/CustomAlert';

import '../global.css';

// Prevent the splash screen from auto-hiding before app is ready
SplashScreen.preventAutoHideAsync().catch(() => {});

// Hard safety net: always hide splash within 4 seconds no matter what
const splashSafetyTimeout = setTimeout(() => {
  SplashScreen.hideAsync().catch(() => {});
}, 4000);

export default function RootLayout() {
  const systemColorScheme = useColorScheme();

  let theme = 'system';
  let language = 'en';
  try {
    theme = useSettingsStore.getState().theme || 'system';
    language = useSettingsStore.getState().language || 'en';
  } catch (_) {}

  const storedTheme = useSettingsStore((s) => s.theme);
  const storedLanguage = useSettingsStore((s) => s.language);

  // Apply stored theme to NativeWind + Web document root
  useEffect(() => {
    try {
      if (Platform.OS === 'web' && typeof document !== 'undefined') {
        const isDark =
          storedTheme === 'dark' ||
          ((!storedTheme || storedTheme === 'system') &&
            window.matchMedia?.('(prefers-color-scheme: dark)').matches);
        if (isDark) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }
    } catch (e) {
      console.warn('Unable to set color scheme', e);
    }
  }, [storedTheme]);

  // Sync i18n language
  useEffect(() => {
    try {
      if (storedLanguage) {
        i18n.changeLanguage(storedLanguage);
      }
    } catch (_) {}
  }, [storedLanguage]);

  // Initialize database and hide splash — with guaranteed timeout fallback
  useEffect(() => {
    async function init() {
      try {
        await initDatabase();
      } catch (e) {
        console.error('Failed to init database', e);
      } finally {
        clearTimeout(splashSafetyTimeout);
        SplashScreen.hideAsync().catch(() => {});
      }
    }
    init();
  }, []);

  const isDark =
    storedTheme === 'dark' ||
    ((!storedTheme || storedTheme === 'system') && systemColorScheme === 'dark');

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="auth" />
          <Stack.Screen name="setup" />
          <Stack.Screen name="checkin" />
          <Stack.Screen name="search" />
          <Stack.Screen name="reports" />
          <Stack.Screen name="registrations" />
        </Stack>
        <CustomAlertProvider />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
