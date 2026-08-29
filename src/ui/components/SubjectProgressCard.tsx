import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

type SubjectProgressCardProps = {
  name: string;
  chapterCount: number;
  startedCount: number;
  quizAvgPercent: number | null;
  onPress?: () => void;
};

export function SubjectProgressCard({ name, chapterCount, startedCount, quizAvgPercent, onPress }: SubjectProgressCardProps) {
  const { tokens, fonts, spacing, radii } = useTheme();
  const fraction = chapterCount > 0 ? startedCount / chapterCount : 0;

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.card,
        { backgroundColor: tokens.surface, borderColor: tokens.border, borderRadius: radii.md, padding: spacing.md },
      ]}
    >
      <Text style={[styles.title, { color: tokens.textPrimary, fontFamily: fonts.uiMedium }]}>{name}</Text>
      <Text style={[styles.subtitle, { color: tokens.textSecondary, fontFamily: fonts.ui, marginTop: spacing.xs / 2 }]}>
        {chapterCount} chapter{chapterCount === 1 ? '' : 's'}
        {quizAvgPercent != null ? ` · quiz avg ${Math.round(quizAvgPercent)}%` : ''}
      </Text>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm }}>
        <View style={[styles.track, { backgroundColor: tokens.background, borderRadius: radii.sm }]}>
          <View
            style={[
              styles.fill,
              { width: `${Math.round(fraction * 100)}%`, backgroundColor: tokens.accent, borderRadius: radii.sm },
            ]}
          />
        </View>
        <Text style={[styles.progressLabel, { color: tokens.textSecondary, fontFamily: fonts.ui }]}>
          {startedCount}/{chapterCount} started
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: StyleSheet.hairlineWidth },
  title: { fontSize: 15 },
  subtitle: { fontSize: 13 },
  track: { flex: 1, height: 6, overflow: 'hidden' },
  fill: { height: '100%' },
  progressLabel: { fontSize: 12 },
});
