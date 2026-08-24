import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { normalizeText } from '../../src/file/cleaner/normalizeText';
import { extractPdfText } from '../../src/file/parser/pdfParser';
import { getPickedFile, setCleanedText } from '../../src/file/uploadDraft';
import { useTheme } from '../../src/ui/theme/ThemeProvider';

export default function PdfPasswordScreen() {
  const { tokens, fonts, spacing, radii } = useTheme();
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleUnlock = async () => {
    const file = getPickedFile();
    if (!file) {
      router.replace('/upload');
      return;
    }

    setSubmitting(true);
    setError(null);

    const result = await extractPdfText(file.uri, password);
    setSubmitting(false);

    if (result.status === 'incorrect-password') {
      setError('That password didn’t work. Try again.');
      return;
    }
    if (result.status === 'success') {
      const cleaned = normalizeText(result.text);
      setCleanedText(cleaned);
      router.replace('/upload/review-chapters');
      return;
    }
    setError('Something went wrong opening this PDF.');
  };

  return (
    <View style={{ flex: 1, backgroundColor: tokens.background, padding: spacing.lg, justifyContent: 'center' }}>
      <Text style={[styles.title, { color: tokens.textPrimary, fontFamily: fonts.uiMedium }]}>
        This PDF is password protected
      </Text>
      <Text style={[styles.body, { color: tokens.textSecondary, fontFamily: fonts.ui, marginTop: spacing.xs }]}>
        Enter the password to continue
      </Text>

      <TextInput
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        placeholder="••••••••"
        placeholderTextColor={tokens.textSecondary}
        style={[
          styles.input,
          { color: tokens.textPrimary, fontFamily: fonts.ui, borderColor: tokens.border, borderRadius: radii.md, marginTop: spacing.lg, padding: spacing.md },
        ]}
      />

      {error ? (
        <Text style={[styles.error, { color: tokens.error, fontFamily: fonts.ui, marginTop: spacing.sm }]}>
          {error}
        </Text>
      ) : null}

      <Pressable
        onPress={handleUnlock}
        disabled={submitting || password.length === 0}
        style={[
          styles.cta,
          { backgroundColor: tokens.accent, borderRadius: radii.md, padding: spacing.md, marginTop: spacing.lg, opacity: submitting || password.length === 0 ? 0.6 : 1 },
        ]}
      >
        {submitting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={[styles.ctaText, { fontFamily: fonts.uiMedium }]}>Unlock</Text>}
      </Pressable>

      <Pressable onPress={() => router.replace('/upload')} style={{ marginTop: spacing.md, alignItems: 'center' }}>
        <Text style={{ color: tokens.textSecondary, fontFamily: fonts.ui, fontSize: 13 }}>Choose a different file</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 18, textAlign: 'center' },
  body: { fontSize: 14, textAlign: 'center' },
  input: { borderWidth: StyleSheet.hairlineWidth, fontSize: 14, textAlign: 'center' },
  error: { fontSize: 13, textAlign: 'center' },
  cta: { alignItems: 'center' },
  ctaText: { color: '#FFFFFF', fontSize: 15 },
});
