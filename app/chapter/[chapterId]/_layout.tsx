import { Stack } from 'expo-router';
import React from 'react';
import { useTheme } from '../../../src/ui/theme/ThemeProvider';

export default function ChapterLayout() {
  const { tokens } = useTheme();
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: tokens.background } }}>
      <Stack.Screen name="actions" options={{ presentation: 'modal' }} />
    </Stack>
  );
}
