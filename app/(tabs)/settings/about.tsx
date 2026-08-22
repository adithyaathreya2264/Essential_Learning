import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../../src/ui/theme/ThemeProvider';

export default function AboutScreen() {
  const { tokens, fonts, spacing } = useTheme();
  const router = useRouter();

  return (
    <View style={{ flex: 1, backgroundColor: tokens.background, padding: spacing.md }}>
      <Pressable onPress={() => router.back()}>
        <Text style={[styles.back, { color: tokens.accent, fontFamily: fonts.ui }]}>{'← Privacy'}</Text>
      </Pressable>
      <Text style={[styles.body, { color: tokens.textSecondary, fontFamily: fonts.ui, marginTop: spacing.md }]}>
        Nothing leaves this device. No accounts, no cloud — your study material and progress stay local, except for
        the one-time model download.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  back: { fontSize: 14 },
  body: { fontSize: 14, lineHeight: 20 },
});
