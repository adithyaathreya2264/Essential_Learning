import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

type FlashcardFaceProps = {
  eyebrow: string;
  text: string;
  nextReviewLabel?: string;
};

export function FlashcardFace({ eyebrow, text, nextReviewLabel }: FlashcardFaceProps) {
  const { tokens, fonts, spacing, radii } = useTheme();

  return (
    <View
      style={[
        styles.card,
        styles.shadow,
        {
          backgroundColor: tokens.surface,
          borderColor: tokens.border,
          borderRadius: radii.md,
          padding: spacing.lg,
        },
      ]}
    >
      <Text style={[styles.eyebrow, { color: tokens.textSecondary, fontFamily: fonts.uiMedium }]}>
        {eyebrow}
      </Text>
      <Text style={[styles.text, { color: tokens.textPrimary, fontFamily: fonts.reading, marginTop: spacing.md }]}>
        {text}
      </Text>
      {nextReviewLabel ? (
        <Text style={[styles.nextReview, { color: tokens.accentSecondary, fontFamily: fonts.signature }]}>
          {nextReviewLabel}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 220,
  },
  shadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  eyebrow: {
    fontSize: 11,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  text: {
    fontSize: 18,
    lineHeight: 25,
  },
  nextReview: {
    position: 'absolute',
    bottom: 12,
    right: 16,
    fontSize: 20,
  },
});
