import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../src/ui/theme/ThemeProvider';

const SLIDES = [
  {
    title: 'Study anything, offline',
    body: 'Upload your notes and get quizzes, flashcards, and explanations, no internet needed.',
  },
  {
    title: "Ask, don't just read",
    body: 'Explain, quiz, summarize — just ask naturally, in your own words.',
  },
  {
    title: 'Nothing leaves your phone',
    body: 'No accounts. No cloud. Your material and your progress stay on this device.',
  },
];

export default function IntroScreen() {
  const { tokens, fonts, spacing } = useTheme();
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const isLast = index === SLIDES.length - 1;
  const slide = SLIDES[index];

  const handleNext = () => {
    if (isLast) {
      router.push('/onboarding/model-select');
    } else {
      setIndex((i) => i + 1);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: tokens.background, padding: spacing.lg }]}>
      <Text style={[styles.progress, { color: tokens.textSecondary, fontFamily: fonts.ui }]}>
        {index + 1}/{SLIDES.length}
      </Text>

      <View style={styles.content}>
        <Text style={[styles.title, { color: tokens.textPrimary, fontFamily: fonts.readingBold }]}>
          {slide.title}
        </Text>
        <Text style={[styles.body, { color: tokens.textSecondary, fontFamily: fonts.ui, marginTop: spacing.md }]}>
          {slide.body}
        </Text>
      </View>

      <View style={styles.footer}>
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                { backgroundColor: i === index ? tokens.accent : tokens.border },
              ]}
            />
          ))}
        </View>
        <Pressable onPress={handleNext}>
          <Text style={[styles.next, { color: tokens.accent, fontFamily: fonts.uiMedium }]}>
            {isLast ? 'Get started' : 'Next'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'space-between' },
  progress: { fontSize: 12 },
  content: { flex: 1, justifyContent: 'center' },
  title: { fontSize: 26 },
  body: { fontSize: 15, lineHeight: 22 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dots: { flexDirection: 'row', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  next: { fontSize: 15 },
});
