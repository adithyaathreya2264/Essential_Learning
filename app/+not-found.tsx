import { Link } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../src/ui/theme/ThemeProvider';

export default function NotFoundScreen() {
  const { tokens, fonts, spacing } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: tokens.background, padding: spacing.lg }]}>
      <Text style={[styles.title, { color: tokens.textPrimary, fontFamily: fonts.uiMedium }]}>
        This screen doesn't exist.
      </Text>
      <Link href="/(tabs)/home" style={{ marginTop: spacing.md }}>
        <Text style={{ color: tokens.accent, fontFamily: fonts.ui }}>Go to home screen</Text>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 16 },
});
