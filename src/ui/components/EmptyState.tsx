import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

type EmptyStateProps = {
  title: string;
  description: string;
  action?: React.ReactNode;
};

export function EmptyState({ title, description, action }: EmptyStateProps) {
  const { tokens, fonts, spacing } = useTheme();

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: tokens.textPrimary, fontFamily: fonts.uiMedium }]}>
        {title}
      </Text>
      <Text
        style={[
          styles.description,
          { color: tokens.textSecondary, fontFamily: fonts.ui, marginTop: spacing.xs },
        ]}
      >
        {description}
      </Text>
      {action ? <View style={{ marginTop: spacing.lg }}>{action}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 48,
  },
  title: {
    fontSize: 18,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
