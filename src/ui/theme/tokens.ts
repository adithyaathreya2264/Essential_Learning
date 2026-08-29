export type ThemeTokens = {
  background: string;
  surface: string;
  textPrimary: string;
  textSecondary: string;
  accent: string;
  accentSecondary: string;
  border: string;
  error: string;
};

export const lightTokens: ThemeTokens = {
  background: '#FAF7F2',
  surface: '#FFFFFF',
  textPrimary: '#1C1B19',
  textSecondary: '#8B8578',
  accent: '#3D5A4C',
  accentSecondary: '#B5651D',
  border: '#E4DFD5',
  error: '#C4483A',
};

export const darkTokens: ThemeTokens = {
  background: '#17181A',
  surface: '#211F1C',
  textPrimary: '#F2EFE9',
  textSecondary: '#A6A093',
  accent: '#7FA491',
  accentSecondary: '#D08A46',
  border: '#332F29',
  error: '#E08277',
};

export const fonts = {
  reading: 'SourceSerif4_400Regular',
  readingBold: 'SourceSerif4_700Bold',
  ui: 'Inter_400Regular',
  uiMedium: 'Inter_500Medium',
  signature: 'Caveat_600SemiBold',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const radii = {
  sm: 6,
  md: 10,
  lg: 16,
};
