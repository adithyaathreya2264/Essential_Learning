import { Stack } from 'expo-router';
import React from 'react';
import { useTheme } from '../../../src/ui/theme/ThemeProvider';

export default function SettingsLayout() {
  const { tokens } = useTheme();
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: tokens.background } }} />
  );
}
