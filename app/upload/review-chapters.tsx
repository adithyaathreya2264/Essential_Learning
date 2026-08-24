import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { segmentContent } from '../../src/domain/usecases/segmentContent';
import { saveChapters } from '../../src/data/repositories/chapterRepository';
import { getOrCreateSubject } from '../../src/data/repositories/subjectRepository';
import { clearDraft, getCleanedText, getSubjectName, ProposedChapter } from '../../src/file/uploadDraft';
import { useTheme } from '../../src/ui/theme/ThemeProvider';

function buildProposedChapters(text: string): ProposedChapter[] {
  return segmentContent(text).map((chapter, index) => ({
    id: `draft_${index}_${Math.random().toString(36).slice(2, 8)}`,
    title: chapter.title,
    content: chapter.content,
    orderIndex: index,
  }));
}

function reindex(chapters: ProposedChapter[]): ProposedChapter[] {
  return chapters.map((chapter, index) => ({ ...chapter, orderIndex: index }));
}

function splitInHalf(chapter: ProposedChapter): ProposedChapter[] {
  const paragraphs = chapter.content.split(/\n{2,}/).filter((p) => p.trim().length > 0);
  if (paragraphs.length < 2) return [chapter];

  const mid = Math.ceil(paragraphs.length / 2);
  const firstHalf = paragraphs.slice(0, mid).join('\n\n');
  const secondHalf = paragraphs.slice(mid).join('\n\n');

  return [
    { ...chapter, content: firstHalf },
    {
      id: `draft_split_${Math.random().toString(36).slice(2, 8)}`,
      title: `${chapter.title} (cont.)`,
      content: secondHalf,
      orderIndex: chapter.orderIndex,
    },
  ];
}

export default function ReviewChaptersScreen() {
  const { tokens, fonts, spacing, radii } = useTheme();
  const router = useRouter();
  const [chapters, setChapters] = useState<ProposedChapter[] | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [saving, setSaving] = useState(false);

  const cleanedText = getCleanedText();
  const subjectName = getSubjectName();

  useEffect(() => {
    if (!cleanedText) {
      router.replace('/upload');
      return;
    }
    setChapters(buildProposedChapters(cleanedText));
  }, [cleanedText, router]);

  const handleRedoSegmentation = useCallback(() => {
    if (!cleanedText) return;
    setChapters(buildProposedChapters(cleanedText));
    setActiveMenuId(null);
    setEditingId(null);
  }, [cleanedText]);

  const startRename = (chapter: ProposedChapter) => {
    setEditingId(chapter.id);
    setEditingTitle(chapter.title);
    setActiveMenuId(null);
  };

  const commitRename = () => {
    if (!editingId) return;
    setChapters((prev) =>
      prev ? prev.map((c) => (c.id === editingId ? { ...c, title: editingTitle.trim() || c.title } : c)) : prev
    );
    setEditingId(null);
  };

  const mergeWithNext = (chapter: ProposedChapter) => {
    setChapters((prev) => {
      if (!prev) return prev;
      const index = prev.findIndex((c) => c.id === chapter.id);
      if (index === -1 || index + 1 >= prev.length) return prev;
      const merged: ProposedChapter = {
        ...chapter,
        content: `${chapter.content}\n\n${prev[index + 1].content}`,
      };
      const next = [...prev];
      next.splice(index, 2, merged);
      return reindex(next);
    });
    setActiveMenuId(null);
  };

  const splitChapter = (chapter: ProposedChapter) => {
    setChapters((prev) => {
      if (!prev) return prev;
      const index = prev.findIndex((c) => c.id === chapter.id);
      if (index === -1) return prev;
      const parts = splitInHalf(chapter);
      const next = [...prev];
      next.splice(index, 1, ...parts);
      return reindex(next);
    });
    setActiveMenuId(null);
  };

  const deleteChapter = (chapter: ProposedChapter) => {
    setChapters((prev) => (prev ? reindex(prev.filter((c) => c.id !== chapter.id)) : prev));
    setActiveMenuId(null);
  };

  const moveChapter = (chapter: ProposedChapter, direction: -1 | 1) => {
    setChapters((prev) => {
      if (!prev) return prev;
      const index = prev.findIndex((c) => c.id === chapter.id);
      const target = index + direction;
      if (index === -1 || target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return reindex(next);
    });
    setActiveMenuId(null);
  };

  const handleSave = async () => {
    if (!chapters || !subjectName || chapters.length === 0) return;
    setSaving(true);
    try {
      const subject = await getOrCreateSubject(subjectName);
      await saveChapters(
        subject.id,
        chapters.map((c) => ({ title: c.title, content: c.content, orderIndex: c.orderIndex }))
      );
      clearDraft();
      router.replace('/library');
    } finally {
      setSaving(false);
    }
  };

  if (!chapters) {
    return (
      <View style={{ flex: 1, backgroundColor: tokens.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={tokens.accent} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: tokens.background, padding: spacing.md }}>
      <Pressable onPress={() => router.back()}>
        <Text style={[styles.back, { color: tokens.accent, fontFamily: fonts.ui }]}>{'← Review chapters'}</Text>
      </Pressable>

      <Text style={[styles.body, { color: tokens.textSecondary, fontFamily: fonts.ui, marginTop: spacing.sm }]}>
        We split this into {chapters.length} chapter{chapters.length === 1 ? '' : 's'}. Edit before saving.
      </Text>

      <FlatList
        data={chapters}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ gap: spacing.sm, paddingVertical: spacing.md }}
        renderItem={({ item, index }) => (
          <View
            style={[
              styles.card,
              { backgroundColor: tokens.surface, borderColor: tokens.border, borderRadius: radii.md, padding: spacing.md },
            ]}
          >
            <View style={styles.cardHeader}>
              {editingId === item.id ? (
                <TextInput
                  value={editingTitle}
                  onChangeText={setEditingTitle}
                  onBlur={commitRename}
                  onSubmitEditing={commitRename}
                  autoFocus
                  style={[styles.titleInput, { color: tokens.textPrimary, fontFamily: fonts.uiMedium, borderColor: tokens.border }]}
                />
              ) : (
                <Text style={[styles.cardTitle, { color: tokens.textPrimary, fontFamily: fonts.uiMedium }]}>
                  {item.title}
                </Text>
              )}
              <Pressable onPress={() => setActiveMenuId(activeMenuId === item.id ? null : item.id)}>
                <Text style={{ color: tokens.textSecondary }}>⋮</Text>
              </Pressable>
            </View>

            <Text
              style={[styles.cardPreview, { color: tokens.textSecondary, fontFamily: fonts.reading, marginTop: spacing.xs }]}
              numberOfLines={2}
            >
              {item.content}
            </Text>
            <Text style={[styles.cardMeta, { color: tokens.textSecondary, fontFamily: fonts.ui, marginTop: spacing.xs }]}>
              {item.content.length.toLocaleString()} characters
            </Text>

            {activeMenuId === item.id ? (
              <View style={[styles.menu, { borderTopColor: tokens.border, marginTop: spacing.sm, paddingTop: spacing.sm }]}>
                <Pressable onPress={() => startRename(item)}>
                  <Text style={[styles.menuItem, { color: tokens.textPrimary, fontFamily: fonts.ui }]}>Rename</Text>
                </Pressable>
                {index + 1 < chapters.length ? (
                  <Pressable onPress={() => mergeWithNext(item)}>
                    <Text style={[styles.menuItem, { color: tokens.textPrimary, fontFamily: fonts.ui }]}>Merge with next</Text>
                  </Pressable>
                ) : null}
                <Pressable onPress={() => splitChapter(item)}>
                  <Text style={[styles.menuItem, { color: tokens.textPrimary, fontFamily: fonts.ui }]}>Split</Text>
                </Pressable>
                {index > 0 ? (
                  <Pressable onPress={() => moveChapter(item, -1)}>
                    <Text style={[styles.menuItem, { color: tokens.textPrimary, fontFamily: fonts.ui }]}>Move up</Text>
                  </Pressable>
                ) : null}
                {index + 1 < chapters.length ? (
                  <Pressable onPress={() => moveChapter(item, 1)}>
                    <Text style={[styles.menuItem, { color: tokens.textPrimary, fontFamily: fonts.ui }]}>Move down</Text>
                  </Pressable>
                ) : null}
                <Pressable onPress={() => deleteChapter(item)}>
                  <Text style={[styles.menuItem, { color: tokens.error, fontFamily: fonts.ui }]}>Delete</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        )}
      />

      <Pressable
        onPress={handleRedoSegmentation}
        style={[styles.redoButton, { borderColor: tokens.border, borderRadius: radii.md, padding: spacing.md }]}
      >
        <Text style={[styles.redoText, { color: tokens.textPrimary, fontFamily: fonts.ui }]}>
          ↻ Redo automatic segmentation
        </Text>
      </Pressable>

      <Pressable
        onPress={handleSave}
        disabled={saving || chapters.length === 0}
        style={[
          styles.saveButton,
          { backgroundColor: tokens.accent, borderRadius: radii.md, padding: spacing.md, marginTop: spacing.sm, opacity: saving || chapters.length === 0 ? 0.6 : 1 },
        ]}
      >
        {saving ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={[styles.saveText, { fontFamily: fonts.uiMedium }]}>
            Save {chapters.length} chapter{chapters.length === 1 ? '' : 's'}
          </Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  back: { fontSize: 14 },
  body: { fontSize: 13 },
  card: { borderWidth: StyleSheet.hairlineWidth },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 14, flex: 1 },
  titleInput: { fontSize: 14, flex: 1, borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: 2 },
  cardPreview: { fontSize: 13 },
  cardMeta: { fontSize: 11 },
  menu: { borderTopWidth: StyleSheet.hairlineWidth, gap: 8 },
  menuItem: { fontSize: 13, paddingVertical: 2 },
  redoButton: { borderWidth: StyleSheet.hairlineWidth, alignItems: 'center' },
  redoText: { fontSize: 13 },
  saveButton: { alignItems: 'center' },
  saveText: { color: '#FFFFFF', fontSize: 15 },
});
