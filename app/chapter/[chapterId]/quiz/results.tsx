import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { DIFFICULTY_LABELS } from '../../../../src/core/constants/difficulty';
import {
  getQuiz,
  listQuestionsForQuiz,
  setQuizFeedback,
  type Quiz,
  type QuizFeedback,
  type QuizQuestion,
} from '../../../../src/data/repositories/quizRepository';
import { useTheme } from '../../../../src/ui/theme/ThemeProvider';

const FEEDBACK_OPTIONS: { label: string; value: QuizFeedback }[] = [
  { label: 'Too easy', value: 'too_easy' },
  { label: 'Just right', value: 'just_right' },
  { label: 'Too hard', value: 'too_hard' },
];

function describeDifficultyBreakdown(quiz: Quiz, questions: QuizQuestion[]): string {
  const counts: Record<string, number> = {};
  for (const q of questions) {
    counts[q.generatedDifficulty] = (counts[q.generatedDifficulty] ?? 0) + 1;
  }
  const breakdown = Object.entries(counts)
    .map(([level, n]) => `${level} (${n})`)
    .join(', ');
  return `Requested: ${DIFFICULTY_LABELS[quiz.requestedDifficulty]} · Generated: ${breakdown}`;
}

export default function QuizResultsScreen() {
  const { chapterId, quizId } = useLocalSearchParams<{ chapterId: string; quizId: string }>();
  const { tokens, fonts, spacing, radii } = useTheme();
  const router = useRouter();

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [feedback, setFeedback] = useState<QuizFeedback | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [quizRow, questionRows] = await Promise.all([getQuiz(quizId), listQuestionsForQuiz(quizId)]);
      if (cancelled) return;
      setQuiz(quizRow);
      setQuestions(questionRows);
      setFeedback(quizRow?.userFeedback ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [quizId]);

  const toggleExpanded = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleFeedback = async (value: QuizFeedback) => {
    setFeedback(value);
    await setQuizFeedback(quizId, value);
  };

  if (!quiz) {
    return (
      <View style={{ flex: 1, backgroundColor: tokens.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={tokens.accent} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: tokens.background, padding: spacing.lg }}>
      <Pressable onPress={() => router.back()}>
        <Text style={[styles.back, { color: tokens.accent, fontFamily: fonts.ui }]}>{'← Quiz results'}</Text>
      </Pressable>

      <View style={{ alignItems: 'center', marginTop: spacing.lg }}>
        <Text style={[styles.score, { color: tokens.textPrimary, fontFamily: fonts.uiMedium }]}>
          {quiz.score ?? 0} / {questions.length} correct
        </Text>
        <Text style={[styles.meta, { color: tokens.textSecondary, fontFamily: fonts.ui }]}>
          {describeDifficultyBreakdown(quiz, questions)}
        </Text>
      </View>

      <FlatList
        data={questions}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ gap: spacing.sm, paddingVertical: spacing.lg }}
        renderItem={({ item, index }) => {
          const isExpanded = expanded.has(item.id);
          return (
            <Pressable
              onPress={() => toggleExpanded(item.id)}
              style={[
                styles.resultCard,
                { backgroundColor: tokens.surface, borderColor: tokens.border, borderRadius: radii.md, padding: spacing.md },
              ]}
            >
              <Text
                style={[
                  styles.resultLabel,
                  { color: item.isCorrect ? tokens.accent : tokens.error, fontFamily: fonts.uiMedium },
                ]}
              >
                {`Q${index + 1} · ${item.isCorrect ? 'Correct' : 'Incorrect'} ${item.isCorrect ? '✓' : '✗'}`}
              </Text>
              <Text style={{ color: tokens.accent, fontFamily: fonts.ui, fontSize: 12, marginTop: spacing.xs / 2 }}>
                {isExpanded ? 'Hide explanation ▴' : 'Show explanation ▾'}
              </Text>
              {isExpanded ? (
                <View style={{ marginTop: spacing.sm, gap: 4 }}>
                  <Text style={{ color: tokens.textPrimary, fontFamily: fonts.reading, fontSize: 14 }}>{item.question}</Text>
                  <Text style={{ color: tokens.textSecondary, fontFamily: fonts.ui, fontSize: 13, marginTop: spacing.xs / 2 }}>
                    Your answer: {item.userAnswer || '(no answer)'}
                  </Text>
                  {!item.isCorrect ? (
                    <Text style={{ color: tokens.textSecondary, fontFamily: fonts.ui, fontSize: 13 }}>
                      Correct answer: {item.referenceAnswer}
                    </Text>
                  ) : null}
                  <Text style={{ color: tokens.textSecondary, fontFamily: fonts.ui, fontSize: 13, marginTop: spacing.xs / 2 }}>
                    {item.gradingExplanation}
                  </Text>
                </View>
              ) : null}
            </Pressable>
          );
        }}
      />

      <Text style={[styles.label, { color: tokens.textPrimary, fontFamily: fonts.uiMedium }]}>Did this feel right?</Text>
      <View style={[styles.feedbackRow, { marginTop: spacing.sm }]}>
        {FEEDBACK_OPTIONS.map((option) => (
          <Pressable
            key={option.value}
            onPress={() => handleFeedback(option.value)}
            style={[
              styles.feedbackChip,
              {
                borderColor: tokens.border,
                borderRadius: radii.sm,
                backgroundColor: feedback === option.value ? tokens.accent : 'transparent',
              },
            ]}
          >
            <Text style={{ color: feedback === option.value ? '#FFFFFF' : tokens.textPrimary, fontFamily: fonts.ui, fontSize: 12 }}>
              {option.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <Pressable
        onPress={() => router.push(`/chapter/${chapterId}/actions`)}
        style={[styles.cta, { backgroundColor: tokens.accent, borderRadius: radii.md, padding: spacing.md, marginTop: spacing.lg }]}
      >
        <Text style={[styles.ctaText, { fontFamily: fonts.uiMedium }]}>Back to chapter</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  back: { fontSize: 14 },
  score: { fontSize: 24 },
  meta: { fontSize: 12, marginTop: 4, textAlign: 'center' },
  resultCard: { borderWidth: StyleSheet.hairlineWidth },
  resultLabel: { fontSize: 14 },
  label: { fontSize: 14 },
  feedbackRow: { flexDirection: 'row', gap: 8 },
  feedbackChip: { borderWidth: StyleSheet.hairlineWidth, paddingVertical: 8, paddingHorizontal: 12 },
  cta: { alignItems: 'center' },
  ctaText: { color: '#FFFFFF', fontSize: 15 },
});
