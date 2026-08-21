import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { listDueCards, type DueCard } from '../../src/data/repositories/reviewStateRepository';
import { EmptyState } from '../../src/ui/components/EmptyState';
import { useTheme } from '../../src/ui/theme/ThemeProvider';

type ChapterDueGroup = { chapterId: string; chapterTitle: string; count: number };

function groupByChapter(cards: DueCard[]): ChapterDueGroup[] {
  const groups = new Map<string, ChapterDueGroup>();
  for (const card of cards) {
    const existing = groups.get(card.chapterId);
    if (existing) {
      existing.count += 1;
    } else {
      groups.set(card.chapterId, { chapterId: card.chapterId, chapterTitle: card.chapterTitle, count: 1 });
    }
  }
  return Array.from(groups.values());
}

export default function DueTodayScreen() {
  const { tokens, fonts, spacing, radii } = useTheme();
  const router = useRouter();
  const [dueCards, setDueCards] = useState<DueCard[] | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      listDueCards().then((cards) => {
        if (!cancelled) setDueCards(cards);
      });
      return () => {
        cancelled = true;
      };
    }, [])
  );

  if (dueCards === null) return null;

  const groups = groupByChapter(dueCards);

  if (dueCards.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: tokens.background, justifyContent: 'center' }}>
        <EmptyState
          title="Nothing due right now"
          description="Come back later, or review ahead from any chapter."
        />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: tokens.background, padding: spacing.md }}>
      <Text style={[styles.title, { color: tokens.textPrimary, fontFamily: fonts.uiMedium }]}>
        Due today
      </Text>
      <Text style={[styles.subtitle, { color: tokens.textSecondary, fontFamily: fonts.ui }]}>
        {dueCards.length} cards across {groups.length} chapter{groups.length === 1 ? '' : 's'}
      </Text>
      <FlatList
        data={groups}
        keyExtractor={(item) => item.chapterId}
        contentContainerStyle={{ gap: spacing.sm, paddingTop: spacing.md }}
        renderItem={({ item }) => (
          <View
            style={[
              styles.card,
              { backgroundColor: tokens.surface, borderColor: tokens.border, borderRadius: radii.md, padding: spacing.md },
            ]}
          >
            <Text style={[styles.cardTitle, { color: tokens.textPrimary, fontFamily: fonts.uiMedium }]}>
              {item.chapterTitle}
            </Text>
            <Text style={[styles.cardMeta, { color: tokens.textSecondary, fontFamily: fonts.ui }]}>
              {item.count} card{item.count === 1 ? '' : 's'} due
            </Text>
          </View>
        )}
      />
      <Pressable
        onPress={() => router.push('/review-session')}
        style={[styles.reviewButton, { backgroundColor: tokens.accent, borderRadius: radii.md, padding: spacing.md, marginTop: spacing.md }]}
      >
        <Text style={[styles.reviewButtonText, { fontFamily: fonts.uiMedium }]}>
          Review all {dueCards.length} cards
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 18 },
  subtitle: { fontSize: 13, marginTop: 2 },
  card: { borderWidth: StyleSheet.hairlineWidth },
  cardTitle: { fontSize: 15 },
  cardMeta: { fontSize: 12, marginTop: 2 },
  reviewButton: { alignItems: 'center' },
  reviewButtonText: { color: '#FFFFFF', fontSize: 15 },
});
