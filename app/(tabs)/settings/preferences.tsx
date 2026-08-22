import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../../src/ui/theme/ThemeProvider';

export default function PreferencesScreen() {
  const { tokens, fonts, spacing } = useTheme();
  const router = useRouter();

  return (
    <View style={{ flex: 1, backgroundColor: tokens.background, padding: spacing.md }}>
      <Pressable onPress={() => router.back()}>
        <Text style={[styles.back, { color: tokens.accent, fontFamily: fonts.ui }]}>{'← Study preferences'}</Text>
      </Pressable>
      <Text style={[styles.body, { color: tokens.textSecondary, fontFamily: fonts.ui, marginTop: spacing.md }]}>
        Default quiz difficulty and daily reminder time controls go here.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  back: { fontSize: 14 },
  body: { fontSize: 14, lineHeight: 20 },
});
