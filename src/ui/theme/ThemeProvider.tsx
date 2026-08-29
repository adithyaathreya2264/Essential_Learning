import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { darkTokens, fonts, lightTokens, radii, spacing, ThemeTokens } from './tokens';

type ThemeContextValue = {
  tokens: ThemeTokens;
  fonts: typeof fonts;
  spacing: typeof spacing;
  radii: typeof radii;
  scheme: 'light' | 'dark';
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const scheme: 'light' | 'dark' = systemScheme === 'dark' ? 'dark' : 'light';

  const value = useMemo<ThemeContextValue>(
    () => ({
      tokens: scheme === 'dark' ? darkTokens : lightTokens,
      fonts,
      spacing,
      radii,
      scheme,
    }),
    [scheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return ctx;
}
