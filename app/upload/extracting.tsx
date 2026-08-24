import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { normalizeText } from '../../src/file/cleaner/normalizeText';
import { extractPdfText } from '../../src/file/parser/pdfParser';
import { extractTxtText } from '../../src/file/parser/txtParser';
import { getPickedFile, setCleanedText } from '../../src/file/uploadDraft';
import { segmentContent } from '../../src/domain/usecases/segmentContent';
import { useTheme } from '../../src/ui/theme/ThemeProvider';

type ExtractionError = 'corrupt' | 'scanned-or-empty' | 'unavailable' | 'unsupported' | 'unknown';

const ERROR_COPY: Record<ExtractionError, { title: string; body: string }> = {
  corrupt: {
    title: 'This file looks corrupted',
    body: "We couldn't read this PDF. Try opening it in another app to confirm it's valid, then upload again.",
  },
  'scanned-or-empty': {
    title: 'No selectable text found',
    body: 'This looks like a scanned or image-only PDF. Only PDFs with real text content are supported right now.',
  },
  unavailable: {
    title: 'PDF extraction unavailable',
    body: 'This build does not have PDF support installed. Try a TXT file, or reinstall the app.',
  },
  unsupported: {
    title: 'Unsupported file',
    body: 'Only PDF and TXT files are supported right now.',
  },
  unknown: {
    title: 'Something went wrong',
    body: "We couldn't extract text from this file. Please try again.",
  },
};

function isPdf(name: string, mimeType: string | null): boolean {
  return mimeType === 'application/pdf' || name.toLowerCase().endsWith('.pdf');
}

function isTxt(name: string, mimeType: string | null): boolean {
  return mimeType === 'text/plain' || name.toLowerCase().endsWith('.txt');
}

export default function ExtractingScreen() {
  const { tokens, fonts, spacing, radii } = useTheme();
  const router = useRouter();
  const [error, setError] = useState<ExtractionError | null>(null);

  const runExtraction = useCallback(async () => {
    setError(null);
    const file = getPickedFile();
    if (!file) {
      setError('unknown');
      return;
    }

    try {
      let rawText: string;

      if (isPdf(file.name, file.mimeType)) {
        const result = await extractPdfText(file.uri);
        if (result.status === 'password-required') {
          router.replace('/upload/pdf-password');
          return;
        }
        if (result.status === 'unavailable') {
          setError('unavailable');
          return;
        }
        if (result.status === 'corrupt') {
          setError('corrupt');
          return;
        }
        if (result.status === 'scanned-or-empty') {
          setError('scanned-or-empty');
          return;
        }
        if (result.status === 'incorrect-password') {
          setError('unknown');
          return;
        }
        rawText = result.text;
      } else if (isTxt(file.name, file.mimeType)) {
        rawText = await extractTxtText(file.uri);
      } else {
        setError('unsupported');
        return;
      }

      const cleaned = normalizeText(rawText);
      if (cleaned.trim().length === 0) {
        setError('scanned-or-empty');
        return;
      }

      setCleanedText(cleaned);
      router.replace('/upload/review-chapters');
    } catch {
      setError('unknown');
    }
  }, [router]);

  useFocusEffect(
    useCallback(() => {
      runExtraction();
    }, [runExtraction])
  );

  if (error) {
    const copy = ERROR_COPY[error];
    return (
      <View style={[styles.container, { backgroundColor: tokens.background, padding: spacing.lg }]}>
        <Text style={[styles.title, { color: tokens.error, fontFamily: fonts.uiMedium }]}>{copy.title}</Text>
        <Text style={[styles.body, { color: tokens.textSecondary, fontFamily: fonts.ui, marginTop: spacing.xs }]}>
          {copy.body}
        </Text>
        <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg }}>
          <Pressable
            onPress={runExtraction}
            style={[styles.button, { borderColor: tokens.border, borderRadius: radii.md, padding: spacing.md }]}
          >
            <Text style={{ color: tokens.textPrimary, fontFamily: fonts.ui }}>Retry</Text>
          </Pressable>
          <Pressable
            onPress={() => router.replace('/upload')}
            style={[styles.button, { backgroundColor: tokens.accent, borderRadius: radii.md, padding: spacing.md }]}
          >
            <Text style={{ color: '#FFFFFF', fontFamily: fonts.uiMedium }}>Choose different file</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: tokens.background, padding: spacing.lg }]}>
      <ActivityIndicator color={tokens.accent} />
      <Text style={[styles.title, { color: tokens.textPrimary, fontFamily: fonts.uiMedium, marginTop: spacing.lg }]}>
        Extracting text...
      </Text>
      <Text style={[styles.body, { color: tokens.textSecondary, fontFamily: fonts.ui, marginTop: spacing.xs }]}>
        This can take a few seconds for longer documents.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 16, textAlign: 'center' },
  body: { fontSize: 13, textAlign: 'center' },
  button: { alignItems: 'center', flex: 1 },
});
