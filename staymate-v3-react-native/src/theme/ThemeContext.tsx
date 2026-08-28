import React, { createContext, useContext, useState, useEffect } from 'react';
import { ColorSchemeName, Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { C_LIGHT, C_DARK } from './tokens';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextType {
  themeMode: ThemeMode;
  isDark: boolean;
  systemScheme: ColorSchemeName;
  colors: typeof C_LIGHT;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
}

const STORAGE_KEY = '@staymate_theme_mode';

const ThemeContext = createContext<ThemeContextType>({
  themeMode: 'light',
  isDark: false,
  systemScheme: 'light',
  colors: C_LIGHT,
  setThemeMode: async () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeMode, setThemeModeState] = useState<ThemeMode>('light');
  const [systemScheme, setSystemScheme] = useState<ColorSchemeName>(Appearance.getColorScheme() || 'light');
  const [isLoaded, setIsLoaded] = useState(false);

  // Listen to OS system color scheme changes for 'system' preference mode
  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemScheme(colorScheme || 'light');
    });
    return () => subscription.remove();
  }, []);

  // Load user theme preference from storage (defaults to clean 'light' mode)
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved === 'dark' || saved === 'light' || saved === 'system') {
          setThemeModeState(saved as ThemeMode);
        } else {
          setThemeModeState('light');
        }
      } catch (e) {
        console.warn('Failed to load theme preference', e);
      } finally {
        setIsLoaded(true);
      }
    })();
  }, []);

  const setThemeMode = async (mode: ThemeMode) => {
    setThemeModeState(mode);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, mode);
    } catch (e) {
      console.warn('Failed to save theme preference', e);
    }
  };

  // Evaluate isDark: if 'system', respect device systemScheme, otherwise use strict selection
  const isDark = themeMode === 'system' ? systemScheme === 'dark' : themeMode === 'dark';
  const colors = isDark ? C_DARK : C_LIGHT;

  return (
    <ThemeContext.Provider
      value={{
        themeMode,
        isDark,
        systemScheme,
        colors,
        setThemeMode,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
