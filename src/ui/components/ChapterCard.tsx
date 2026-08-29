import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

type ChapterCardProps = {
  title: string;
  subtitle: string;
  flashcardsNote?: string;
  onPress?: () => void;
};

export function ChapterCard({ title, subtitle, flashcardsNote, onPress }: ChapterCardProps) {
  const { tokens, fonts, spacing, radii } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.card,
        {
          backgroundColor: tokens.surface,
          borderColor: tokens.border,
          borderRadius: radii.md,
          padding: spacing.md,
        },
      ]}
    >
      <Text style={[styles.title, { color: tokens.textPrimary, fontFamily: fonts.uiMedium }]}>
        {title}
      </Text>
      <Text
        style={[
          styles.subtitle,
          { color: tokens.textSecondary, fontFamily: fonts.ui, marginTop: spacing.xs / 2 },
        ]}
      >
        {subtitle}
      </Text>
      {flashcardsNote ? (
        <Text
          style={[
            styles.flashcardsNote,
            { color: tokens.accentSecondary, fontFamily: fonts.ui, marginTop: spacing.xs },
          ]}
        >
          {flashcardsNote}
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: StyleSheet.hairlineWidth,
  },
  title: {
    fontSize: 15,
  },
  subtitle: {
    fontSize: 13,
  },
  flashcardsNote: {
    fontSize: 12,
  },
});
