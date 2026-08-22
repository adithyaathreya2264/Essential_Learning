import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { classifyIntent, getChapterConversation, runTool } from '../../../src/ai/engine/inferenceSession';
import { ModelLoadError } from '../../../src/ai/engine/modelManager';
import { getChapterById, type Chapter } from '../../../src/data/repositories/chapterRepository';
import {
  addMessage,
  listMessagesForChapter,
  type ChatMessage,
} from '../../../src/data/repositories/chatRepository';
import { useTheme } from '../../../src/ui/theme/ThemeProvider';

type PendingClarification = { message: string };

export default function ChatScreen() {
  const { chapterId } = useLocalSearchParams<{ chapterId: string }>();
  const { tokens, fonts, spacing, radii } = useTheme();
  const router = useRouter();

  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [streamingText, setStreamingText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clarify, setClarify] = useState<PendingClarification | null>(null);
  const listRef = useRef<FlatList<ChatMessage>>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [chapterRow, history] = await Promise.all([
        getChapterById(chapterId),
        listMessagesForChapter(chapterId),
      ]);
      if (cancelled) return;
      setChapter(chapterRow);
      setMessages(history);
    })();
    return () => {
      cancelled = true;
    };
  }, [chapterId]);

  const describeError = (e: unknown): string => {
    if (e instanceof ModelLoadError) return e.message;
    if (e instanceof Error) return e.message;
    return 'Something went wrong generating a response.';
  };

  /** Runs a known tool and persists both sides of the exchange. */
  const respondWith = useCallback(
    async (tool: 'explain' | 'summarize', prompt: string) => {
      if (!chapter) return;
      setBusy(true);
      setStreamingText('');
      try {
        const conversation = await getChapterConversation(chapter.id, chapter.title, chapter.content);
        let accumulated = '';
        const full = await runTool(conversation, tool, prompt, {
          onToken: (token) => {
            accumulated += token;
            setStreamingText(accumulated);
          },
        });

        const finalText = (full || accumulated).trim();
        const saved = await addMessage(chapterId, 'assistant', finalText);
        setMessages((prev) => [...prev, saved]);
      } catch (e) {
        setError(describeError(e));
      } finally {
        setStreamingText('');
        setBusy(false);
      }
    },
    [chapter, chapterId]
  );

  const handleSend = useCallback(async () => {
    const trimmed = input.trim();
    if (trimmed.length === 0 || busy || !chapter) return;

    setInput('');
    setError(null);
    setClarify(null);

    const userMessage = await addMessage(chapterId, 'user', trimmed);
    setMessages((prev) => [...prev, userMessage]);

    setBusy(true);
    try {
      const intent = await classifyIntent(trimmed);

      if (intent === 'ambiguous') {
        // Ask instead of guessing — a wrong silent guess wastes a slow
        // on-device generation and misleads the student.
        setClarify({ message: trimmed });
        setBusy(false);
        return;
      }

      setBusy(false);
      await respondWith(intent, trimmed);
    } catch (e) {
      setError(describeError(e));
      setBusy(false);
    }
  }, [input, busy, chapter, chapterId, respondWith]);

  const handleClarify = useCallback(
    async (tool: 'explain' | 'summarize') => {
      const pending = clarify;
      setClarify(null);
      if (pending) await respondWith(tool, pending.message);
    },
    [clarify, respondWith]
  );

  useEffect(() => {
    if (messages.length > 0 || streamingText) {
      listRef.current?.scrollToEnd({ animated: true });
    }
  }, [messages.length, streamingText]);

  const renderBubble = (role: 'user' | 'assistant', content: string, key?: string) => {
    const isUser = role === 'user';
    return (
      <View
        key={key}
        style={[
          isUser ? styles.userBubble : styles.assistantBubble,
          {
            backgroundColor: isUser ? tokens.accent : tokens.surface,
            borderColor: tokens.border,
            borderRadius: radii.md,
            padding: isUser ? spacing.sm : spacing.md,
            alignSelf: isUser ? 'flex-end' : 'flex-start',
            marginBottom: spacing.sm,
          },
        ]}
      >
        <Text
          style={{
            color: isUser ? '#FFFFFF' : tokens.textPrimary,
            fontFamily: isUser ? fonts.ui : fonts.reading,
            fontSize: isUser ? 14 : 15,
            lineHeight: isUser ? 20 : 22,
          }}
        >
          {content}
        </Text>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: tokens.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={{ padding: spacing.md }}>
        <Pressable onPress={() => router.back()}>
          <Text style={[styles.back, { color: tokens.accent, fontFamily: fonts.ui }]}>
            {`← ${chapter?.title ?? 'Chapter'}`}
          </Text>
        </Pressable>
      </View>

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: spacing.md, paddingBottom: spacing.md }}
        renderItem={({ item }) => renderBubble(item.role, item.content)}
        ListFooterComponent={
          <View>
            {streamingText ? renderBubble('assistant', streamingText, 'streaming') : null}
            {busy && !streamingText ? (
              <View style={{ alignSelf: 'flex-start', padding: spacing.md }}>
                <ActivityIndicator color={tokens.accent} />
              </View>
            ) : null}
            {clarify ? (
              <View
                style={[
                  styles.assistantBubble,
                  { backgroundColor: tokens.surface, borderColor: tokens.border, borderRadius: radii.md, padding: spacing.md, alignSelf: 'flex-start' },
                ]}
              >
                <Text style={{ color: tokens.textPrimary, fontFamily: fonts.reading, fontSize: 15 }}>
                  Did you want me to explain this, or summarize it?
                </Text>
                <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm }}>
                  <Pressable
                    onPress={() => handleClarify('explain')}
                    style={[styles.choice, { borderColor: tokens.border, borderRadius: radii.sm }]}
                  >
                    <Text style={{ color: tokens.accent, fontFamily: fonts.uiMedium, fontSize: 13 }}>Explain</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => handleClarify('summarize')}
                    style={[styles.choice, { borderColor: tokens.border, borderRadius: radii.sm }]}
                  >
                    <Text style={{ color: tokens.accent, fontFamily: fonts.uiMedium, fontSize: 13 }}>Summarize</Text>
                  </Pressable>
                </View>
              </View>
            ) : null}
            {error ? (
              <View style={{ padding: spacing.md }}>
                <Text style={{ color: tokens.error, fontFamily: fonts.ui, fontSize: 13 }}>{error}</Text>
              </View>
            ) : null}
          </View>
        }
      />

      <View
        style={[
          styles.inputBar,
          { backgroundColor: tokens.surface, borderColor: tokens.border, borderRadius: radii.md, margin: spacing.md, padding: spacing.sm },
        ]}
      >
        <TextInput
          value={input}
          onChangeText={setInput}
          onSubmitEditing={handleSend}
          editable={!busy}
          placeholder="Ask about this chapter..."
          placeholderTextColor={tokens.textSecondary}
          style={[styles.input, { color: tokens.textPrimary, fontFamily: fonts.ui }]}
        />
        <Pressable onPress={handleSend} disabled={busy || input.trim().length === 0}>
          <Text
            style={{
              color: busy || input.trim().length === 0 ? tokens.textSecondary : tokens.accent,
              fontFamily: fonts.uiMedium,
              fontSize: 14,
            }}
          >
            Send
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  back: { fontSize: 14 },
  userBubble: { maxWidth: '85%' },
  assistantBubble: { maxWidth: '95%', borderWidth: StyleSheet.hairlineWidth },
  choice: { borderWidth: StyleSheet.hairlineWidth, paddingVertical: 8, paddingHorizontal: 14 },
  inputBar: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: StyleSheet.hairlineWidth },
  input: { flex: 1, fontSize: 14 },
});
