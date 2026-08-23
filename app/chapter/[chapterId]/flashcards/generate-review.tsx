import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { generateFlashcards } from '../../../../src/ai/engine/inferenceSession';
import { ModelLoadError } from '../../../../src/ai/engine/modelManager';
import { getChapterById } from '../../../../src/data/repositories/chapterRepository';
import { addCards, createDeck, regenerateDeck } from '../../../../src/data/repositories/flashcardRepository';
import { createInitialReviewState } from '../../../../src/fsrs/scheduler';
import { useTheme } from '../../../../src/ui/theme/ThemeProvider';

const DEFAULT_CARD_COUNT = 10;
const MORE_CARD_COUNT = 5;

type Mode = 'create' | 'add' | 'regenerate';
type Draft = { front: string; back: string };

export default function GenerateReviewScreen() {
  const { chapterId, mode, deckId } = useLocalSearchParams<{ chapterId: string; mode: Mode; deckId?: string }>();
  const { tokens, fonts, spacing, radii } = useTheme();
  const router = useRouter();

  const [drafts, setDrafts] = useState<Draft[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [moreLoading, setMoreLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const describeError = (e: unknown): string => {
    if (e instanceof ModelLoadError) return e.message;
    if (e instanceof Error) return e.message;
    return 'Something went wrong generating flashcards.';
  };

  const runGeneration = async (count: number) => {
    const chapter = await getChapterById(chapterId);
    if (!chapter) throw new Error('Chapter not found.');
    return generateFlashcards(chapter.id, chapter.title, chapter.content, count);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const cards = await runGeneration(DEFAULT_CARD_COUNT);
        if (!cancelled) setDrafts(cards);
      } catch (e) {
        if (!cancelled) setError(describeError(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [chapterId]);

  const handleMore = async () => {
    setMoreLoading(true);
    setError(null);
    try {
      const cards = await runGeneration(MORE_CARD_COUNT);
      setDrafts((prev) => [...(prev ?? []), ...cards]);
    } catch (e) {
      setError(describeError(e));
    } finally {
      setMoreLoading(false);
    }
  };

  const handleEdit = (index: number, field: 'front' | 'back', value: string) => {
    setDrafts((prev) => {
      if (!prev) return prev;
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleDelete = (index: number) => {
    setDrafts((prev) => (prev ? prev.filter((_, i) => i !== index) : prev));
  };

  const handleSave = async () => {
    if (!drafts || drafts.length === 0) return;
    setSaving(true);
    setError(null);
    try {
      if (mode === 'create') {
        const deck = await createDeck(chapterId);
        await addCards(deck.id, drafts, createInitialReviewState);
      } else if (mode === 'add' && deckId) {
        await addCards(deckId, drafts, createInitialReviewState);
      } else if (mode === 'regenerate' && deckId) {
        await regenerateDeck(deckId, drafts, createInitialReviewState);
      } else {
        throw new Error('Missing deck for this action.');
      }
      router.replace(`/chapter/${chapterId}/flashcards`);
    } catch (e) {
      setError(describeError(e));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: tokens.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={tokens.accent} />
      </View>
    );
  }

  if (error && !drafts) {
    return (
      <View style={{ flex: 1, backgroundColor: tokens.background, padding: spacing.lg, justifyContent: 'center' }}>
        <Text style={[styles.error, { color: tokens.error, fontFamily: fonts.ui, textAlign: 'center' }]}>{error}</Text>
        <Pressable
          onPress={() => router.back()}
          style={[styles.cta, { backgroundColor: tokens.accent, borderRadius: radii.md, padding: spacing.md, marginTop: spacing.lg }]}
        >
          <Text style={[styles.ctaText, { fontFamily: fonts.uiMedium }]}>Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: tokens.background, padding: spacing.lg }}>
      <Pressable onPress={() => router.back()} disabled={saving}>
        <Text style={[styles.back, { color: tokens.accent, fontFamily: fonts.ui }]}>{'← Review flashcards'}</Text>
      </Pressable>
      <Text style={[styles.count, { color: tokens.textSecondary, fontFamily: fonts.ui, marginTop: spacing.xs }]}>
        {drafts?.length ?? 0} cards generated
      </Text>

      <FlatList
        data={drafts ?? []}
        keyExtractor={(_, i) => `draft_${i}`}
        contentContainerStyle={{ gap: spacing.sm, paddingVertical: spacing.md }}
        renderItem={({ item, index }) => (
          <View
            style={[styles.card, { backgroundColor: tokens.surface, borderColor: tokens.border, borderRadius: radii.md, padding: spacing.md }]}
          >
            <View style={styles.cardHeader}>
              <Text style={[styles.label, { color: tokens.textSecondary, fontFamily: fonts.uiMedium }]}>Front</Text>
              <Pressable onPress={() => handleDelete(index)}>
                <Text style={{ color: tokens.error, fontSize: 13 }}>✕</Text>
              </Pressable>
            </View>
            <TextInput
              value={item.front}
              onChangeText={(v) => handleEdit(index, 'front', v)}
              multiline
              style={[styles.input, { color: tokens.textPrimary, fontFamily: fonts.reading, borderColor: tokens.border, borderRadius: radii.sm }]}
            />
            <Text style={[styles.label, { color: tokens.textSecondary, fontFamily: fonts.uiMedium, marginTop: spacing.sm }]}>
              Back
            </Text>
            <TextInput
              value={item.back}
              onChangeText={(v) => handleEdit(index, 'back', v)}
              multiline
              style={[styles.input, { color: tokens.textPrimary, fontFamily: fonts.reading, borderColor: tokens.border, borderRadius: radii.sm }]}
            />
          </View>
        )}
      />

      {error ? <Text style={[styles.error, { color: tokens.error, fontFamily: fonts.ui }]}>{error}</Text> : null}

      <View style={styles.actionsRow}>
        <Pressable onPress={handleMore} disabled={moreLoading || saving} style={{ opacity: moreLoading ? 0.6 : 1 }}>
          {moreLoading ? (
            <ActivityIndicator color={tokens.accent} size="small" />
          ) : (
            <Text style={{ color: tokens.accent, fontFamily: fonts.uiMedium, fontSize: 13 }}>+ More cards</Text>
          )}
        </Pressable>
      </View>

      <Pressable
        onPress={handleSave}
        disabled={saving || !drafts || drafts.length === 0}
        style={[
          styles.cta,
          { backgroundColor: tokens.accent, borderRadius: radii.md, padding: spacing.md, marginTop: spacing.md, opacity: saving ? 0.7 : 1 },
        ]}
      >
        {saving ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={[styles.ctaText, { fontFamily: fonts.uiMedium }]}>Save {drafts?.length ?? 0} cards</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  back: { fontSize: 14 },
  count: { fontSize: 13 },
  card: { borderWidth: StyleSheet.hairlineWidth },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { borderWidth: StyleSheet.hairlineWidth, fontSize: 14, padding: 8, marginTop: 4 },
  error: { fontSize: 13, lineHeight: 18, marginTop: 8 },
  actionsRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 8 },
  cta: { alignItems: 'center' },
  ctaText: { color: '#FFFFFF', fontSize: 15 },
});
