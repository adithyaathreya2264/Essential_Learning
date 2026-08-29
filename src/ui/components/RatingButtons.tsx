import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

const RATINGS = ['Again', 'Hard', 'Good', 'Easy'] as const;
export type Rating = (typeof RATINGS)[number];

type RatingButtonsProps = {
  onRate?: (rating: Rating) => void;
};

export function RatingButtons({ onRate }: RatingButtonsProps) {
  const { tokens, fonts, radii } = useTheme();

  return (
    <View style={styles.row}>
      {RATINGS.map((rating) => (
        <Pressable
          key={rating}
          onPress={() => onRate?.(rating)}
          style={[
            styles.button,
            {
              backgroundColor: tokens.surface,
              borderColor: tokens.border,
              borderRadius: radii.sm,
            },
          ]}
        >
          <Text style={{ color: tokens.textPrimary, fontFamily: fonts.ui, fontSize: 13 }}>{rating}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 6 },
  button: { flex: 1, alignItems: 'center', paddingVertical: 10, borderWidth: StyleSheet.hairlineWidth },
});
