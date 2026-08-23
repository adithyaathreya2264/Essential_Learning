import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { DIFFICULTY_LABELS, DIFFICULTY_LEVELS, DifficultyLevel } from '../../../../src/core/constants/difficulty';
import { generateQuiz } from '../../../../src/ai/engine/inferenceSession';
import { ModelLoadError } from '../../../../src/ai/engine/modelManager';
import { getChapterById } from '../../../../src/data/repositories/chapterRepository';
import { createQuiz } from '../../../../src/data/repositories/quizRepository';
import { useTheme } from '../../../../src/ui/theme/ThemeProvider';

const QUESTION_COUNTS = [4, 6, 8, 10];

export default function QuizSetupScreen() {
  const { chapterId } = useLocalSearchParams<{ chapterId: string }>();
  const { tokens, fonts, spacing, radii } = useTheme();
  const router = useRouter();
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('medium');
  const [count, setCount] = useState(4);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const describeError = (e: unknown): string => {
    if (e instanceof ModelLoadError) return e.message;
    if (e instanceof Error) return e.message;
    return 'Something went wrong generating the quiz.';
  };

  const handleStart = async () => {
    setBusy(true);
    setError(null);
    try {
      const chapter = await getChapterById(chapterId);
      if (!chapter) throw new Error('Chapter not found.');

      const questions = await generateQuiz(chapter.id, chapter.title, chapter.content, difficulty, count);
      const quiz = await createQuiz(chapterId, difficulty, questions);

      router.push(`/chapter/${chapterId}/quiz/taking?quizId=${quiz.id}`);
    } catch (e) {
      setError(describeError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: tokens.background, padding: spacing.lg }}>
      <Pressable onPress={() => router.back()} disabled={busy}>
        <Text style={[styles.back, { color: tokens.accent, fontFamily: fonts.ui }]}>{'← Quiz setup'}</Text>
      </Pressable>

      <Text style={[styles.label, { color: tokens.textPrimary, fontFamily: fonts.uiMedium, marginTop: spacing.lg }]}>
        Difficulty
      </Text>
      <View style={[styles.segmentRow, { marginTop: spacing.sm }]}>
        {DIFFICULTY_LEVELS.map((level) => (
          <Pressable
            key={level}
            onPress={() => setDifficulty(level)}
            disabled={busy}
            style={[
              styles.segment,
              {
                backgroundColor: difficulty === level ? tokens.accent : tokens.surface,
                borderColor: tokens.border,
                borderRadius: radii.sm,
                opacity: busy ? 0.6 : 1,
              },
            ]}
          >
            <Text style={{ color: difficulty === level ? '#FFFFFF' : tokens.textPrimary, fontFamily: fonts.ui, fontSize: 13 }}>
              {DIFFICULTY_LABELS[level]}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={[styles.label, { color: tokens.textPrimary, fontFamily: fonts.uiMedium, marginTop: spacing.lg }]}>
        Number of questions
      </Text>
      <View style={[styles.segmentRow, { marginTop: spacing.sm }]}>
        {QUESTION_COUNTS.map((n) => (
          <Pressable
            key={n}
            onPress={() => setCount(n)}
            disabled={busy}
            style={[
              styles.segment,
              {
                backgroundColor: count === n ? tokens.accent : tokens.surface,
                borderColor: tokens.border,
                borderRadius: radii.sm,
                opacity: busy ? 0.6 : 1,
              },
            ]}
          >
            <Text style={{ color: count === n ? '#FFFFFF' : tokens.textPrimary, fontFamily: fonts.ui, fontSize: 13 }}>{n}</Text>
          </Pressable>
        ))}
      </View>

      {error ? (
        <Text style={[styles.error, { color: tokens.error, fontFamily: fonts.ui, marginTop: spacing.lg }]}>{error}</Text>
      ) : null}

      <Pressable
        onPress={handleStart}
        disabled={busy}
        style={[
          styles.cta,
          { backgroundColor: tokens.accent, borderRadius: radii.md, padding: spacing.md, marginTop: spacing.xl, opacity: busy ? 0.7 : 1 },
        ]}
      >
        {busy ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={[styles.ctaText, { fontFamily: fonts.uiMedium }]}>{error ? 'Try again' : 'Start quiz'}</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  back: { fontSize: 14 },
  label: { fontSize: 14 },
  segmentRow: { flexDirection: 'row', gap: 8 },
  segment: { borderWidth: StyleSheet.hairlineWidth, paddingVertical: 8, paddingHorizontal: 14 },
  error: { fontSize: 13, lineHeight: 18 },
  cta: { alignItems: 'center' },
  ctaText: { color: '#FFFFFF', fontSize: 15 },
});
