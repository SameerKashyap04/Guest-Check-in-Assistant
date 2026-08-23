import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';
import { storage } from '../store/storage';
import { C_LIGHT, C_DARK } from './tokens';

export type ThemeMode = 'system' | 'light' | 'dark';

interface ThemeContextType {
  themeMode: ThemeMode;
  isDark: boolean;
  colors: typeof C_LIGHT;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
}

const STORAGE_KEY = '@staymate_theme_mode';

const ThemeContext = createContext<ThemeContextType>({
  themeMode: 'system',
  isDark: false,
  colors: C_LIGHT,
  setThemeMode: async () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useSystemColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const saved = storage.getString(STORAGE_KEY);
      if (saved && (saved === 'system' || saved === 'light' || saved === 'dark')) {
        setThemeModeState(saved as ThemeMode);
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

  const isDark =
    themeMode === 'dark' ||
    (themeMode === 'system' && systemScheme === 'dark');

  const colors = isDark ? C_DARK : C_LIGHT;

  return (
    <ThemeContext.Provider value={{ themeMode, isDark, colors, setThemeMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
