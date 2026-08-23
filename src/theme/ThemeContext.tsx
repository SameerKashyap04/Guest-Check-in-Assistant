import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  useColorScheme as useSystemColorScheme,
  Appearance,
  ColorSchemeName,
} from 'react-native';
import { storage } from '../store/storage';
import { C_LIGHT, C_DARK } from './tokens';

export type ThemeMode = 'system' | 'light' | 'dark';

interface ThemeContextType {
  themeMode: ThemeMode;
  isDark: boolean;
  systemScheme: ColorSchemeName;
  colors: typeof C_LIGHT;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
}

const STORAGE_KEY = '@staymate_theme_mode';

const ThemeContext = createContext<ThemeContextType>({
  themeMode: 'system',
  isDark: false,
  systemScheme: 'light',
  colors: C_LIGHT,
  setThemeMode: async () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const hookScheme = useSystemColorScheme();
  const [currentSystemScheme, setCurrentSystemScheme] = useState<ColorSchemeName>(
    Appearance.getColorScheme() || hookScheme || 'light'
  );
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');
  const [isLoaded, setIsLoaded] = useState(false);

  // Active listener for OS system theme changes (Light <-> Dark mode in iOS/Android)
  useEffect(() => {
    const initialScheme = Appearance.getColorScheme();
    if (initialScheme) {
      setCurrentSystemScheme(initialScheme);
    }

    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      if (colorScheme) {
        setCurrentSystemScheme(colorScheme);
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // Also sync from hook
  useEffect(() => {
    if (hookScheme) {
      setCurrentSystemScheme(hookScheme);
    }
  }, [hookScheme]);

  // Load user theme preference
  useEffect(() => {
    try {
      const saved = storage.getString(STORAGE_KEY);
      if (saved && (saved === 'system' || saved === 'light' || saved === 'dark')) {
        setThemeModeState(saved as ThemeMode);
      } else {
        setThemeModeState('system');
      }
    } catch (e) {
      console.warn('Failed to load theme preference', e);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  const setThemeMode = async (mode: ThemeMode) => {
    setThemeModeState(mode);
    try {
      storage.set(STORAGE_KEY, mode);
    } catch (e) {
      console.warn('Failed to save theme preference', e);
    }
  };

  // Evaluate isDark: if 'system', use currentSystemScheme (dark or light)
  const isSystemDark = currentSystemScheme === 'dark';
  const isDark =
    themeMode === 'dark' ||
    (themeMode === 'system' && isSystemDark);

  const colors = isDark ? C_DARK : C_LIGHT;

  return (
    <ThemeContext.Provider
      value={{
        themeMode,
        isDark,
        systemScheme: currentSystemScheme,
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
