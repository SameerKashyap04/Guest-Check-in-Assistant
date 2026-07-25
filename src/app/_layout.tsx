import { useEffect } from 'react';
import { DarkTheme, DefaultTheme, ThemeProvider, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'nativewind';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import i18n from '../i18n';
import { initDatabase } from '@/database';
import { useSettingsStore } from '@/store/useSettingsStore';

import '../global.css';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { colorScheme, setColorScheme } = useColorScheme();
  const theme = useSettingsStore((s) => s.theme);
  const language = useSettingsStore((s) => s.language);

  // Synchronize stored theme preference with NativeWind colorScheme
  useEffect(() => {
    try {
      if (theme && theme !== 'system') {
        setColorScheme(theme);
      } else {
        setColorScheme('system');
      }
    } catch (e) {
      console.warn('Unable to set color scheme', e);
    }
  }, [theme]);

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

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="auth" />
          <Stack.Screen name="setup" />
          <Stack.Screen name="checkin" />
          <Stack.Screen name="self-checkin/[token]" />
          <Stack.Screen name="search" />
          <Stack.Screen name="reports" />
          <Stack.Screen name="registrations" />
        </Stack>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
