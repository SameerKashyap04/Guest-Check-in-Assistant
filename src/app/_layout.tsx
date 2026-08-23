import { useEffect } from 'react';
import { DefaultTheme, ThemeProvider, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Platform } from 'react-native';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
  Inter_900Black,
} from '@expo-google-fonts/inter';
import i18n from '../i18n';
import { initDatabase } from '@/database';
import { useSettingsStore } from '@/store/useSettingsStore';
import { CustomAlertProvider } from '@/components/CustomAlert';

import '../global.css';

// Inject authentic Inter web font and typography styles on web platform
if (Platform.OS === 'web' && typeof document !== 'undefined') {
  // Prevent iOS Safari / mobile browser auto-zoom on input focus
  let viewportMeta = document.querySelector('meta[name="viewport"]');
  if (!viewportMeta) {
    viewportMeta = document.createElement('meta');
    viewportMeta.setAttribute('name', 'viewport');
    document.head.appendChild(viewportMeta);
  }
  viewportMeta.setAttribute(
    'content',
    'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover'
  );

  if (!document.getElementById('staymate-inter-webfont')) {
    const link = document.createElement('link');
    link.id = 'staymate-inter-webfont';
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap';
    document.head.appendChild(link);
  }
  if (!document.getElementById('staymate-inter-css')) {
    const style = document.createElement('style');
    style.id = 'staymate-inter-css';
    style.textContent = `
      *, *::before, *::after, html, body, #root, input, button, textarea, [data-testid] {
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif !important;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
        text-rendering: optimizeLegibility;
      }
      input, textarea, select {
        font-size: 16px !important;
      }
      @media screen and (max-width: 768px) {
        input, textarea, select {
          font-size: 16px !important;
        }
      }
    `;
    document.head.appendChild(style);
  }
}

// Prevent the splash screen from auto-hiding before app is ready
SplashScreen.preventAutoHideAsync().catch(() => {});

// Hard safety net: always hide splash within 4 seconds no matter what
const splashSafetyTimeout = setTimeout(() => {
  SplashScreen.hideAsync().catch(() => {});
}, 4000);

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
    Inter_900Black,
  });

  const storedLanguage = useSettingsStore((s) => s.language);

  // Force light mode on Web document root
  useEffect(() => {
    try {
      if (Platform.OS === 'web' && typeof document !== 'undefined') {
        document.documentElement.classList.remove('dark');
      }
    } catch (e) {
      console.warn('Unable to set color scheme', e);
    }
  }, []);

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

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={DefaultTheme}>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="auth" />
          <Stack.Screen name="setup" />
          <Stack.Screen name="checkin" />
          <Stack.Screen name="subscription" />
          <Stack.Screen name="search" />
          <Stack.Screen name="reports" />
          <Stack.Screen name="registrations" />
        </Stack>
        <CustomAlertProvider />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
