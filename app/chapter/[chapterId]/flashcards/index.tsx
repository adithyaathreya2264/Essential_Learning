import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  deleteCard,
  deleteDeck,
  listCardsForDeck,
  getDeckForChapter,
  updateCard,
  type Flashcard,
  type FlashcardDeck,
} from '../../../../src/data/repositories/flashcardRepository';
import { countDueCards } from '../../../../src/data/repositories/reviewStateRepository';
import { EmptyState } from '../../../../src/ui/components/EmptyState';
import { useTheme } from '../../../../src/ui/theme/ThemeProvider';

export default function FlashcardDeckScreen() {
  const { chapterId } = useLocalSearchParams<{ chapterId: string }>();
  const { tokens, fonts, spacing, radii } = useTheme();
  const router = useRouter();

  const [deck, setDeck] = useState<FlashcardDeck | null | undefined>(undefined);
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [dueCount, setDueCount] = useState(0);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ front: string; back: string }>({ front: '', back: '' });

  const load = useCallback(async () => {
    const deckRow = await getDeckForChapter(chapterId);
    setDeck(deckRow);
    if (deckRow) {
      const [cardRows, due] = await Promise.all([listCardsForDeck(deckRow.id), countDueCards(chapterId)]);
      setCards(cardRows);
      setDueCount(due);
    } else {
      setCards([]);
      setDueCount(0);
    }
  }, [chapterId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const toggleExpanded = (card: Flashcard) => {
    if (expanded === card.id) {
      setExpanded(null);
    } else {
      setExpanded(card.id);
      setDraft({ front: card.front, back: card.back });
    }
  };

  const handleSaveEdit = async (cardId: string) => {
    await updateCard(cardId, draft.front, draft.back);
    setExpanded(null);
    await load();
  };

  const handleDeleteCard = (cardId: string) => {
    Alert.alert('Delete this card?', 'This removes the card and its review history.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteCard(cardId);
          await load();
        },
      },
    ]);
  };

  const handleRegenerate = () => {
    if (!deck) return;
    Alert.alert(
      'Regenerate this deck?',
      'This deletes every existing card and its review history, replacing them with a fresh set. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Regenerate',
          style: 'destructive',
          onPress: () => router.push(`/chapter/${chapterId}/flashcards/generate-review?mode=regenerate&deckId=${deck.id}`),
        },
      ]
    );
  };

  const handleDeleteDeck = () => {
    if (!deck) return;
    Alert.alert('Delete this deck?', 'This removes every card and all review history for this chapter.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteDeck(deck.id);
          await load();
        },
      },
    ]);
  };

  if (deck === undefined) {
    return (
      <View style={{ flex: 1, backgroundColor: tokens.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={tokens.accent} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: tokens.background, padding: spacing.lg }}>
      <Pressable onPress={() => router.back()}>
        <Text style={[styles.back, { color: tokens.accent, fontFamily: fonts.ui }]}>{'← Flashcards'}</Text>
      </Pressable>

      {!deck ? (
        <EmptyState
          title="No flashcards yet for this chapter"
          description="Generate a set of front/back cards from this chapter's content."
          action={
            <Pressable
              onPress={() => router.push(`/chapter/${chapterId}/flashcards/generate-review?mode=create`)}
              style={[styles.cta, { backgroundColor: tokens.accent, borderRadius: radii.md, padding: spacing.md }]}
            >
              <Text style={[styles.ctaText, { fontFamily: fonts.uiMedium }]}>Generate flashcards</Text>
            </Pressable>
          }
        />
      ) : (
        <View style={{ flex: 1, marginTop: spacing.lg }}>
          <Text style={[styles.deckMeta, { color: tokens.textSecondary, fontFamily: fonts.ui }]}>
            {cards.length} cards · {dueCount} due today
          </Text>
          <Pressable
            onPress={() => router.push(`/chapter/${chapterId}/flashcards/study`)}
            disabled={dueCount === 0}
            style={[
              styles.cta,
              { backgroundColor: tokens.accent, borderRadius: radii.md, padding: spacing.md, marginTop: spacing.md, opacity: dueCount === 0 ? 0.5 : 1 },
            ]}
          >
            <Text style={[styles.ctaText, { fontFamily: fonts.uiMedium }]}>
              {dueCount === 0 ? 'Nothing due right now' : 'Review due cards'}
            </Text>
          </Pressable>

          <View style={styles.maintenanceRow}>
            <Pressable onPress={() => router.push(`/chapter/${chapterId}/flashcards/generate-review?mode=add&deckId=${deck.id}`)}>
              <Text style={[styles.maintenanceLink, { color: tokens.accent, fontFamily: fonts.ui }]}>+ Add more</Text>
            </Pressable>
            <Pressable onPress={handleRegenerate}>
              <Text style={[styles.maintenanceLink, { color: tokens.error, fontFamily: fonts.ui }]}>↻ Regenerate</Text>
            </Pressable>
            <Pressable onPress={handleDeleteDeck}>
              <Text style={[styles.maintenanceLink, { color: tokens.error, fontFamily: fonts.ui }]}>Delete deck</Text>
            </Pressable>
          </View>

          <Text style={[styles.sectionLabel, { color: tokens.textPrimary, fontFamily: fonts.uiMedium, marginTop: spacing.lg }]}>
            All cards
          </Text>
          <FlatList
            data={cards}
            keyExtractor={(c) => c.id}
            contentContainerStyle={{ gap: spacing.sm, paddingTop: spacing.sm }}
            renderItem={({ item }) => {
              const isExpanded = expanded === item.id;
              return (
                <View style={[styles.cardRow, { backgroundColor: tokens.surface, borderColor: tokens.border, borderRadius: radii.md, padding: spacing.md }]}>
                  <Pressable onPress={() => toggleExpanded(item)} style={styles.cardRowHeader}>
                    <Text numberOfLines={isExpanded ? undefined : 1} style={[styles.cardFront, { color: tokens.textPrimary, fontFamily: fonts.reading }]}>
                      {item.front}
                    </Text>
                    <Pressable onPress={() => handleDeleteCard(item.id)}>
                      <Text style={{ color: tokens.error, fontSize: 13 }}>✕</Text>
                    </Pressable>
                  </Pressable>
                  {isExpanded ? (
                    <View style={{ marginTop: spacing.sm }}>
                      <TextInput
                        value={draft.front}
                        onChangeText={(v) => setDraft((d) => ({ ...d, front: v }))}
                        multiline
                        style={[styles.input, { color: tokens.textPrimary, fontFamily: fonts.reading, borderColor: tokens.border, borderRadius: radii.sm }]}
                      />
                      <TextInput
                        value={draft.back}
                        onChangeText={(v) => setDraft((d) => ({ ...d, back: v }))}
                        multiline
                        style={[styles.input, { color: tokens.textPrimary, fontFamily: fonts.reading, borderColor: tokens.border, borderRadius: radii.sm, marginTop: spacing.xs }]}
                      />
                      <Pressable onPress={() => handleSaveEdit(item.id)} style={{ marginTop: spacing.xs, alignSelf: 'flex-start' }}>
                        <Text style={{ color: tokens.accent, fontFamily: fonts.uiMedium, fontSize: 13 }}>Save</Text>
                      </Pressable>
                    </View>
                  ) : null}
                </View>
              );
            }}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  back: { fontSize: 14 },
  deckMeta: { fontSize: 13 },
  cta: { alignItems: 'center' },
  ctaText: { color: '#FFFFFF', fontSize: 15 },
  maintenanceRow: { flexDirection: 'row', gap: 16, marginTop: 16 },
  maintenanceLink: { fontSize: 13 },
  sectionLabel: { fontSize: 14 },
  cardRow: { borderWidth: StyleSheet.hairlineWidth },
  cardRowHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  cardFront: { fontSize: 14, flex: 1 },
  input: { borderWidth: StyleSheet.hairlineWidth, fontSize: 13, padding: 8 },
});
