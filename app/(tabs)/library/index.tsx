import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { countChaptersForSubject } from '../../../src/data/repositories/chapterRepository';
import { listSubjects, Subject } from '../../../src/data/repositories/subjectRepository';
import { ChapterCard } from '../../../src/ui/components/ChapterCard';
import { EmptyState } from '../../../src/ui/components/EmptyState';
import { useTheme } from '../../../src/ui/theme/ThemeProvider';

type SubjectRow = Subject & { chapterCount: number };

export default function LibraryScreen() {
  const { tokens, fonts, spacing } = useTheme();
  const router = useRouter();
  const [subjects, setSubjects] = useState<SubjectRow[] | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        const list = await listSubjects();
        const withCounts = await Promise.all(
          list.map(async (subject) => ({ ...subject, chapterCount: await countChaptersForSubject(subject.id) }))
        );
        if (!cancelled) setSubjects(withCounts);
      })();
      return () => {
        cancelled = true;
      };
    }, [])
  );

  if (subjects === null) {
    return (
      <View style={{ flex: 1, backgroundColor: tokens.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={tokens.accent} />
      </View>
    );
  }

  if (subjects.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: tokens.background, justifyContent: 'center' }}>
        <EmptyState
          title="Add your first subject"
          description="Upload a PDF or text file and we'll turn it into chapters you can study."
          action={
            <Pressable onPress={() => router.push('/upload')}>
              <Text style={{ color: tokens.accent, fontFamily: fonts.uiMedium, textAlign: 'center' }}>
                Add study material
              </Text>
            </Pressable>
          }
        />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: tokens.background, padding: spacing.md }}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: tokens.textPrimary, fontFamily: fonts.uiMedium }]}>
          Library
        </Text>
        <Pressable onPress={() => router.push('/upload')}>
          <Text style={[styles.addLink, { color: tokens.accent, fontFamily: fonts.uiMedium }]}>+ Add</Text>
        </Pressable>
      </View>
      <FlatList
        data={subjects}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ gap: spacing.sm, paddingTop: spacing.sm }}
        renderItem={({ item }) => (
          <ChapterCard
            title={item.name}
            subtitle={`${item.chapterCount} chapter${item.chapterCount === 1 ? '' : 's'}`}
            onPress={() => router.push(`/library/${item.id}`)}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 18 },
  addLink: { fontSize: 14 },
});
