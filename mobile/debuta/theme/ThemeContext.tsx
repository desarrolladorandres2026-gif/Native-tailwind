// theme/ThemeContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const THEME_STORAGE_KEY = 'debuta_theme_mode';

// ─── Color Palettes ───────────────────────────────────────────────────────────

const DARK_COLORS = {
  // Backgrounds (gradient array)
  bg: ['#050505', '#160B2A', '#050505'] as [string, string, ...string[]],
  // Cards / surfaces
  card: '#121212',
  // Input backgrounds
  inputBg: 'rgba(20, 20, 35, 0.6)',
  // Glass border
  glassBorder: 'rgba(255, 255, 255, 0.1)',
  // Text colors
  text: '#FFFFFF',
  textDim: '#D1D5DB', // textSoft
  textLight: '#9CA3AF',
  // Brand
  primary: '#8B5CF6',
  secondary: '#D946EF',
  tertiary: '#6366F1',
  // Status
  error: '#EF4444',
  success: '#10B981',
  warning: '#FFD700',
};

const LIGHT_COLORS = {
  bg: ['#FFFFFF', '#F8F9FA', '#FFFFFF'] as [string, string, ...string[]],
  card: '#FFFFFF',
  inputBg: 'rgba(0, 0, 0, 0.05)',
  glassBorder: '#EEEEEE',
  text: '#000000',
  textDim: '#424242', // textSoft
  textLight: 'rgba(66,66,66,0.5)',
  primary: '#FD297B',
  secondary: '#FF655B',
  tertiary: '#FF5864',
  error: '#EF4444',
  success: '#10B981',
  warning: '#FFD700',
};

// ─── Types ────────────────────────────────────────────────────────────────────

type ColorTokens = typeof DARK_COLORS;
export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextValue {
  colors: ColorTokens;
  isDark: boolean;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const ThemeContext = createContext<ThemeContextValue>({
  colors: DARK_COLORS,
  isDark: true,
  themeMode: 'system',
  setThemeMode: () => {},
  toggleTheme: () => {},
});

// ─── Provider ─────────────────────────────────────────────────────────────────

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');
  const [isDark, setIsDark] = useState(systemScheme === 'dark');

  // Load saved theme preference
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedMode = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (savedMode) {
          setThemeModeState(savedMode as ThemeMode);
        }
      } catch (e) {
        console.error('Failed to load theme preference', e);
      }
    };
    loadTheme();
  }, []);

  // Update isDark based on themeMode and systemScheme
  useEffect(() => {
    if (themeMode === 'system') {
      setIsDark(systemScheme === 'dark');
    } else {
      setIsDark(themeMode === 'dark');
    }
  }, [themeMode, systemScheme]);

  const setThemeMode = async (mode: ThemeMode) => {
    setThemeModeState(mode);
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
    } catch (e) {
      console.error('Failed to save theme preference', e);
    }
  };

  const toggleTheme = () => {
    const nextMode = isDark ? 'light' : 'dark';
    setThemeMode(nextMode);
  };

  const colors = isDark ? DARK_COLORS : LIGHT_COLORS;

  return (
    <ThemeContext.Provider value={{ colors, isDark, themeMode, setThemeMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}

export default ThemeContext;
