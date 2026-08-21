import { useFocusEffect } from '@react-navigation/native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Chapter, listChaptersForSubject } from '../../../src/data/repositories/chapterRepository';
import { getChapterQuizStats, type ChapterQuizStats } from '../../../src/data/repositories/quizRepository';
import { countDueCards } from '../../../src/data/repositories/reviewStateRepository';
import { getSubjectById, Subject } from '../../../src/data/repositories/subjectRepository';
import { ChapterCard } from '../../../src/ui/components/ChapterCard';
import { EmptyState } from '../../../src/ui/components/EmptyState';
import { useTheme } from '../../../src/ui/theme/ThemeProvider';

type ChapterProgress = {
  quizStats: ChapterQuizStats | null;
  dueCount: number;
};

export default function SubjectScreen() {
  const { subjectId } = useLocalSearchParams<{ subjectId: string }>();
  const { tokens, fonts, spacing } = useTheme();
  const router = useRouter();
  const [subject, setSubject] = useState<Subject | null | undefined>(undefined);
  const [chapters, setChapters] = useState<Chapter[] | null>(null);
  const [progress, setProgress] = useState<Record<string, ChapterProgress>>({});

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        const [subjectRow, chapterRows] = await Promise.all([
          getSubjectById(subjectId),
          listChaptersForSubject(subjectId),
        ]);
        if (cancelled) return;
        setSubject(subjectRow);
        setChapters(chapterRows);

        const entries = await Promise.all(
          chapterRows.map(async (chapter) => {
            const [quizStats, dueCount] = await Promise.all([
              getChapterQuizStats(chapter.id),
              countDueCards(chapter.id),
            ]);
            return [chapter.id, { quizStats, dueCount }] as const;
          })
        );
        if (!cancelled) setProgress(Object.fromEntries(entries));
      })();
      return () => {
        cancelled = true;
      };
    }, [subjectId])
  );

  if (subject === undefined || chapters === null) {
    return (
      <View style={{ flex: 1, backgroundColor: tokens.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={tokens.accent} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: tokens.background, padding: spacing.md }}>
      <Pressable onPress={() => router.back()}>
        <Text style={[styles.back, { color: tokens.accent, fontFamily: fonts.ui }]}>{'← Back'}</Text>
      </Pressable>
      <Text style={[styles.title, { color: tokens.textPrimary, fontFamily: fonts.uiMedium, marginTop: spacing.sm }]}>
        {subject?.name ?? 'Subject'}
      </Text>
      <Text style={[styles.count, { color: tokens.textSecondary, fontFamily: fonts.ui }]}>
        {chapters.length} chapter{chapters.length === 1 ? '' : 's'}
      </Text>

      {chapters.length === 0 ? (
        <EmptyState title="No chapters yet" description="Upload material for this subject to see chapters here." />
      ) : (
        <FlatList
          data={chapters}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ gap: spacing.sm, paddingTop: spacing.sm }}
          renderItem={({ item, index }) => {
            const chapterProgress = progress[item.id];
            const quizSuffix = chapterProgress?.quizStats
              ? ` · quiz ${Math.round(chapterProgress.quizStats.avgPercent)}% avg`
              : ' · no quiz yet';
            const flashcardsNote =
              chapterProgress === undefined
                ? undefined
                : chapterProgress.dueCount > 0
                  ? `🗂 flashcards: ${chapterProgress.dueCount} due`
                  : '🗂 no flashcards due';

            return (
              <ChapterCard
                title={`${index + 1}. ${item.title}`}
                subtitle={`${item.content.length.toLocaleString()} characters${quizSuffix}`}
                flashcardsNote={flashcardsNote}
                onPress={() => router.push(`/chapter/${item.id}/actions`)}
              />
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  back: { fontSize: 14 },
  title: { fontSize: 18 },
  count: { fontSize: 13, marginTop: 2 },
});
