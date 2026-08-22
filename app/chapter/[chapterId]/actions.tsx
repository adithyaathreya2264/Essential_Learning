import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useActiveModel } from '../../../src/hooks/useModel';
import { useTheme } from '../../../src/ui/theme/ThemeProvider';

const ACTIONS = [
  { label: '💬 Ask about this chapter', route: 'chat', requiresAi: true },
  { label: '📝 Take a quiz', route: 'quiz/setup', requiresAi: true },
  { label: '🗂 Flashcards', route: 'flashcards', requiresAi: true },
  { label: '🔔 Remind me to revise', route: 'reminder', requiresAi: false },
] as const;

export default function ChapterActionsScreen() {
  const { chapterId } = useLocalSearchParams<{ chapterId: string }>();
  const { tokens, fonts, spacing, radii } = useTheme();
  const router = useRouter();
  const model = useActiveModel();
  const aiReady = model.status === 'verified';

  return (
    <View style={{ flex: 1, backgroundColor: tokens.background, padding: spacing.lg, justifyContent: 'flex-end' }}>
      <Text style={[styles.title, { color: tokens.textPrimary, fontFamily: fonts.uiMedium, marginBottom: spacing.md }]}>
        {chapterId}
      </Text>

      {!aiReady ? (
        <View
          style={[
            styles.notice,
            { backgroundColor: tokens.surface, borderColor: tokens.border, borderRadius: radii.md, padding: spacing.md, marginBottom: spacing.sm },
          ]}
        >
          <Text style={[styles.noticeText, { color: tokens.textSecondary, fontFamily: fonts.ui }]}>
            Still setting up your AI — try again in a few minutes.
          </Text>
        </View>
      ) : null}

      <View style={{ gap: spacing.sm }}>
        {ACTIONS.map((action) => {
          const disabled = action.requiresAi && !aiReady;
          return (
            <Pressable
              key={action.route}
              onPress={() => {
                if (disabled) return;
                router.push(`/chapter/${chapterId}/${action.route}`);
              }}
              style={[
                styles.action,
                {
                  backgroundColor: tokens.surface,
                  borderColor: tokens.border,
                  borderRadius: radii.md,
                  padding: spacing.md,
                  opacity: disabled ? 0.5 : 1,
                },
              ]}
            >
              <Text style={[styles.actionLabel, { color: tokens.textPrimary, fontFamily: fonts.ui }]}>
                {action.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Pressable onPress={() => router.back()} style={{ marginTop: spacing.md, alignItems: 'center' }}>
        <Text style={[styles.cancel, { color: tokens.textSecondary, fontFamily: fonts.ui }]}>Cancel</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 16 },
  notice: { borderWidth: StyleSheet.hairlineWidth },
  noticeText: { fontSize: 13 },
  action: { borderWidth: StyleSheet.hairlineWidth },
  actionLabel: { fontSize: 15 },
  cancel: { fontSize: 14 },
});
