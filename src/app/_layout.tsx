import { useEffect } from 'react';
import { DarkTheme, DefaultTheme, ThemeProvider, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'nativewind';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Platform } from 'react-native';
import i18n from '../i18n';
import { initDatabase } from '@/database';
import { useSettingsStore } from '@/store/useSettingsStore';

import { CustomAlertProvider } from '@/components/CustomAlert';

import '../global.css';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { colorScheme, setColorScheme } = useColorScheme();
  const theme = useSettingsStore((s) => s.theme);
  const language = useSettingsStore((s) => s.language);

  // Synchronize stored theme preference with NativeWind colorScheme & Web document root
  useEffect(() => {
    try {
      const targetScheme = (theme && theme !== 'system') ? theme : 'system';
      setColorScheme(targetScheme as any);

      if (Platform.OS === 'web' && typeof document !== 'undefined') {
        const isDark = targetScheme === 'dark' || (targetScheme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
        if (isDark) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }
    } catch (e) {
      console.warn('Unable to set color scheme', e);
    }
  }, [theme, setColorScheme]);

  // Synchronize stored language preference with i18n
  useEffect(() => {
    if (language) {
      i18n.changeLanguage(language);
    }
  }, [language]);

  useEffect(() => {
    async function init() {
      try {
        await initDatabase();
      } catch (e) {
        console.error('Failed to init database', e);
      } finally {
        SplashScreen.hideAsync().catch(() => {});
      }
    }
    init();
  }, []);

  const isDark = (colorScheme as string) === 'dark' || (theme as string) === 'dark';

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
