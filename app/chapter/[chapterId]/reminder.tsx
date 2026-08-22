import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { getChapterById } from '../../../src/data/repositories/chapterRepository';
import { createReminder } from '../../../src/data/repositories/reminderRepository';
import { useTheme } from '../../../src/ui/theme/ThemeProvider';

const DAY_OPTIONS = [1, 3, 7, 14] as const;

export default function ReminderScreen() {
  const { chapterId } = useLocalSearchParams<{ chapterId: string }>();
  const { tokens, fonts, spacing, radii } = useTheme();
  const router = useRouter();

  const [chapterTitle, setChapterTitle] = useState<string | null>(null);
  const [days, setDays] = useState<number>(3);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!chapterId) return;
    getChapterById(chapterId).then((chapter) => setChapterTitle(chapter?.title ?? chapterId));
  }, [chapterId]);

  async function handleSetReminder() {
    if (!chapterId || saving) return;
    setSaving(true);
    const remindAt = Date.now() + days * 24 * 60 * 60 * 1000;
    await createReminder(chapterId, note.trim() || null, remindAt);
    setSaving(false);
    router.back();
  }

  return (
    <View style={{ flex: 1, backgroundColor: tokens.background, padding: spacing.lg }}>
      <Pressable onPress={() => router.back()}>
        <Text style={[styles.back, { color: tokens.accent, fontFamily: fonts.ui }]}>{'← Remind me to revise'}</Text>
      </Pressable>

      <Text style={[styles.body, { color: tokens.textSecondary, fontFamily: fonts.ui, marginTop: spacing.md }]}>
        Set a manual reminder for {chapterTitle ?? '…'}, independent of flashcard scheduling.
      </Text>

      <Text style={[styles.label, { color: tokens.textPrimary, fontFamily: fonts.uiMedium, marginTop: spacing.lg }]}>
        Remind me in
      </Text>
      <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm }}>
        {DAY_OPTIONS.map((d) => {
          const selected = d === days;
          return (
            <Pressable
              key={d}
              onPress={() => setDays(d)}
              style={[
                styles.dayOption,
                {
                  backgroundColor: selected ? tokens.accent : tokens.surface,
                  borderColor: tokens.border,
                  borderRadius: radii.sm,
                  paddingVertical: spacing.sm,
                  paddingHorizontal: spacing.md,
                },
              ]}
            >
              <Text style={{ color: selected ? '#FFFFFF' : tokens.textPrimary, fontFamily: fonts.ui, fontSize: 14 }}>
                {d}d
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={[styles.label, { color: tokens.textPrimary, fontFamily: fonts.uiMedium, marginTop: spacing.lg }]}>
        Note (optional)
      </Text>
      <TextInput
        value={note}
        onChangeText={setNote}
        placeholder="What to focus on when you come back"
        placeholderTextColor={tokens.textSecondary}
        style={[
          styles.input,
          {
            color: tokens.textPrimary,
            fontFamily: fonts.ui,
            backgroundColor: tokens.surface,
            borderColor: tokens.border,
            borderRadius: radii.md,
            padding: spacing.md,
            marginTop: spacing.sm,
          },
        ]}
        multiline
      />

      <Pressable
        onPress={handleSetReminder}
        disabled={saving}
        style={[
          styles.cta,
          { backgroundColor: tokens.accent, borderRadius: radii.md, padding: spacing.md, marginTop: spacing.lg, opacity: saving ? 0.6 : 1 },
        ]}
      >
        {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={[styles.ctaText, { fontFamily: fonts.uiMedium }]}>Set reminder</Text>}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  back: { fontSize: 14 },
  body: { fontSize: 14, lineHeight: 20 },
  label: { fontSize: 14 },
  dayOption: { borderWidth: StyleSheet.hairlineWidth },
  input: { fontSize: 15, minHeight: 72, textAlignVertical: 'top', borderWidth: StyleSheet.hairlineWidth },
  cta: { alignItems: 'center' },
  ctaText: { color: '#FFFFFF', fontSize: 15 },
});
