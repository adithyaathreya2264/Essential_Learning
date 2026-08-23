import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { evaluateAnswer } from '../../../../src/ai/engine/inferenceSession';
import { ModelLoadError } from '../../../../src/ai/engine/modelManager';
import { getChapterById, type Chapter } from '../../../../src/data/repositories/chapterRepository';
import {
  completeQuiz,
  getQuiz,
  listQuestionsForQuiz,
  recordAnswer,
  type Quiz,
  type QuizQuestion,
} from '../../../../src/data/repositories/quizRepository';
import { useTheme } from '../../../../src/ui/theme/ThemeProvider';

export default function QuizTakingScreen() {
  const { chapterId, quizId } = useLocalSearchParams<{ chapterId: string; quizId: string }>();
  const { tokens, fonts, spacing, radii } = useTheme();
  const router = useRouter();

  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[] | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [chapterRow, quizRow, questionRows] = await Promise.all([
        getChapterById(chapterId),
        getQuiz(quizId),
        listQuestionsForQuiz(quizId),
      ]);
      if (cancelled) return;
      setChapter(chapterRow);
      setQuiz(quizRow);
      setQuestions(questionRows);
      // Resume where the app left off if this quiz was already partially answered.
      const firstUnanswered = questionRows.findIndex((q) => q.isCorrect === null);
      setCurrentIndex(firstUnanswered === -1 ? 0 : firstUnanswered);
    })();
    return () => {
      cancelled = true;
    };
  }, [chapterId, quizId]);

  const describeError = (e: unknown): string => {
    if (e instanceof ModelLoadError) return e.message;
    if (e instanceof Error) return e.message;
    return 'Something went wrong grading that answer.';
  };

  if (!chapter || !quiz || !questions) {
    return (
      <View style={{ flex: 1, backgroundColor: tokens.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={tokens.accent} />
      </View>
    );
  }

  const total = questions.length;
  const question = questions[currentIndex];
  const showMismatch = quiz.requestedDifficulty !== 'mix' && question.generatedDifficulty !== quiz.requestedDifficulty;

  const handleSubmit = async () => {
    const trimmed = answer.trim();
    if (trimmed.length === 0 || busy) return;

    setBusy(true);
    setError(null);
    try {
      const result = await evaluateAnswer(
        chapter.id,
        chapter.title,
        chapter.content,
        question.question,
        question.referenceAnswer,
        trimmed
      );
      await recordAnswer(question.id, trimmed, result.correct, result.explanation);

      const updated = [...questions];
      updated[currentIndex] = {
        ...question,
        userAnswer: trimmed,
        isCorrect: result.correct,
        gradingExplanation: result.explanation,
      };
      setQuestions(updated);
      setAnswer('');

      if (currentIndex + 1 >= total) {
        const score = updated.filter((q) => q.isCorrect === true).length;
        await completeQuiz(quiz.id, score);
        router.replace(`/chapter/${chapterId}/quiz/results?quizId=${quiz.id}`);
      } else {
        setCurrentIndex(currentIndex + 1);
      }
    } catch (e) {
      setError(describeError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: tokens.background, padding: spacing.lg }}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={[styles.back, { color: tokens.accent, fontFamily: fonts.ui }]}>
            {`← Question ${currentIndex + 1} of ${total}`}
          </Text>
        </Pressable>
        <Pressable onPress={() => router.back()}>
          <Text style={{ color: tokens.textSecondary }}>✕</Text>
        </Pressable>
      </View>

      <View style={[styles.progressTrack, { backgroundColor: tokens.border, borderRadius: 2, marginTop: spacing.sm }]}>
        <View
          style={[
            styles.progressFill,
            { backgroundColor: tokens.accent, borderRadius: 2, width: `${((currentIndex + 1) / total) * 100}%` },
          ]}
        />
      </View>

      {showMismatch ? (
        <View style={[styles.pill, { backgroundColor: tokens.accentSecondary, borderRadius: radii.sm, marginTop: spacing.lg }]}>
          <Text style={styles.pillText}>
            {`Generated as: ${question.generatedDifficulty} — you asked for: ${quiz.requestedDifficulty}`}
          </Text>
        </View>
      ) : null}

      <Text
        style={[
          styles.question,
          { color: tokens.textPrimary, fontFamily: fonts.reading, marginTop: showMismatch ? spacing.md : spacing.lg },
        ]}
      >
        {question.question}
      </Text>

      <TextInput
        value={answer}
        onChangeText={setAnswer}
        editable={!busy}
        placeholder="Your answer..."
        placeholderTextColor={tokens.textSecondary}
        multiline
        style={[
          styles.input,
          { color: tokens.textPrimary, fontFamily: fonts.ui, borderColor: tokens.border, borderRadius: radii.md, marginTop: spacing.lg, padding: spacing.md },
        ]}
      />

      {error ? (
        <Text style={[styles.error, { color: tokens.error, fontFamily: fonts.ui, marginTop: spacing.sm }]}>{error}</Text>
      ) : null}

      <Pressable
        onPress={handleSubmit}
        disabled={busy || answer.trim().length === 0}
        style={[
          styles.cta,
          {
            backgroundColor: tokens.accent,
            borderRadius: radii.md,
            padding: spacing.md,
            marginTop: spacing.lg,
            opacity: busy || answer.trim().length === 0 ? 0.6 : 1,
          },
        ]}
      >
        {busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={[styles.ctaText, { fontFamily: fonts.uiMedium }]}>Submit answer</Text>}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  back: { fontSize: 14 },
  progressTrack: { height: 4, overflow: 'hidden' },
  progressFill: { height: 4 },
  pill: { paddingHorizontal: 8, paddingVertical: 4, alignSelf: 'flex-start' },
  pillText: { color: '#FFFFFF', fontSize: 11 },
  question: { fontSize: 18, lineHeight: 25 },
  input: { borderWidth: StyleSheet.hairlineWidth, fontSize: 14, minHeight: 44 },
  error: { fontSize: 13, lineHeight: 18 },
  cta: { alignItems: 'center' },
  ctaText: { color: '#FFFFFF', fontSize: 15 },
});
