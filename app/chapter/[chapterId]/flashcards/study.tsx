import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { getChapterById, type Chapter } from '../../../../src/data/repositories/chapterRepository';
import { listDueCards, type DueCard } from '../../../../src/data/repositories/reviewStateRepository';
import { useFlashcardSession } from '../../../../src/hooks/useFlashcardSession';
import { FlashcardFace } from '../../../../src/ui/components/FlashcardFace';
import { RatingButtons } from '../../../../src/ui/components/RatingButtons';
import { useTheme } from '../../../../src/ui/theme/ThemeProvider';

export default function FlashcardStudyScreen() {
  const { chapterId } = useLocalSearchParams<{ chapterId: string }>();
  const { tokens, fonts, spacing } = useTheme();
  const router = useRouter();

  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [queue, setQueue] = useState<DueCard[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [chapterRow, due] = await Promise.all([getChapterById(chapterId), listDueCards(chapterId)]);
      if (cancelled) return;
      setChapter(chapterRow);
      setQueue(due);
    })();
    return () => {
      cancelled = true;
    };
  }, [chapterId]);

  const session = useFlashcardSession(queue ?? []);

  if (!chapter || !queue) {
    return (
      <View style={{ flex: 1, backgroundColor: tokens.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={tokens.accent} />
      </View>
    );
  }

  if (session.done) {
    return (
      <View style={{ flex: 1, backgroundColor: tokens.background, padding: spacing.lg, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={[styles.summaryTitle, { color: tokens.textPrimary, fontFamily: fonts.uiMedium }]}>Session complete</Text>
        <Text style={[styles.summaryCount, { color: tokens.textPrimary, fontFamily: fonts.uiMedium, marginTop: spacing.md }]}>
          {session.summary.reviewed} cards reviewed
        </Text>
        <Text style={[styles.summaryBreakdown, { color: tokens.textSecondary, fontFamily: fonts.ui, marginTop: spacing.sm }]}>
          Again: {session.summary.counts.Again}   Hard: {session.summary.counts.Hard}
          {'\n'}Good: {session.summary.counts.Good}   Easy: {session.summary.counts.Easy}
        </Text>
        <Pressable
          onPress={() => router.replace(`/chapter/${chapterId}/flashcards`)}
          style={[styles.cta, { backgroundColor: tokens.accent, borderRadius: 10, padding: spacing.md, marginTop: spacing.lg }]}
        >
          <Text style={[styles.ctaText, { fontFamily: fonts.uiMedium }]}>Back to chapter</Text>
        </Pressable>
      </View>
    );
  }

  const { current } = session;
  if (!current) return null;

  const nextReviewLabel =
    !session.revealed && current.state.scheduledDays > 0 ? `next: ${Math.round(current.state.scheduledDays)}d` : undefined;

  return (
    <View style={{ flex: 1, backgroundColor: tokens.background, padding: spacing.lg }}>
      <Text style={[styles.progress, { color: tokens.textSecondary, fontFamily: fonts.ui }]}>
        Card {session.progress.index + 1} of {session.progress.total}
      </Text>

      <View style={{ marginTop: spacing.lg }}>
        <Pressable onPress={session.reveal}>
          <FlashcardFace
            eyebrow={chapter.title}
            text={session.revealed ? current.card.back : current.card.front}
            nextReviewLabel={nextReviewLabel}
          />
        </Pressable>
      </View>

      {!session.revealed ? (
        <Text style={[styles.tapHint, { color: tokens.textSecondary, fontFamily: fonts.ui, marginTop: spacing.md }]}>
          Tap to reveal
        </Text>
      ) : (
        <Text style={[styles.tapHint, { color: tokens.textPrimary, fontFamily: fonts.uiMedium, marginTop: spacing.md }]}>
          How well did you know this?
        </Text>
      )}

      <View style={{ marginTop: spacing.lg }}>
        <RatingButtons onRate={session.rate} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  progress: { fontSize: 13 },
  tapHint: { fontSize: 13, textAlign: 'center' },
  summaryTitle: { fontSize: 18 },
  summaryCount: { fontSize: 22 },
  summaryBreakdown: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  cta: { alignItems: 'center', minWidth: 200 },
  ctaText: { color: '#FFFFFF', fontSize: 15 },
});
