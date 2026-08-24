import * as DocumentPicker from 'expo-document-picker';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { PickedFile, setPickedFile } from '../../src/file/uploadDraft';
import { useTheme } from '../../src/ui/theme/ThemeProvider';

function deriveSubjectName(fileName: string): string {
  const withoutExtension = fileName.replace(/\.[^./\\]+$/, '');
  return withoutExtension.replace(/[_-]+/g, ' ').trim() || 'Untitled subject';
}

export default function UploadScreen() {
  const { tokens, fonts, spacing, radii } = useTheme();
  const router = useRouter();
  const [pickedFile, setPickedFileState] = useState<PickedFile | null>(null);
  const [subjectName, setSubjectName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleBrowse = async () => {
    setError(null);
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'text/plain'],
      copyToCacheDirectory: true,
    });

    if (result.canceled || result.assets.length === 0) return;

    const asset = result.assets[0];
    const file: PickedFile = { uri: asset.uri, name: asset.name, mimeType: asset.mimeType ?? null };
    setPickedFileState(file);
    setSubjectName(deriveSubjectName(asset.name));
  };

  const handleContinue = () => {
    if (!pickedFile) return;
    const trimmed = subjectName.trim();
    if (trimmed.length === 0) {
      setError('Give this subject a name before continuing.');
      return;
    }
    setPickedFile(pickedFile, trimmed);
    router.push('/upload/extracting');
  };

  return (
    <View style={{ flex: 1, backgroundColor: tokens.background, padding: spacing.lg }}>
      <Pressable onPress={() => router.back()}>
        <Text style={[styles.back, { color: tokens.accent, fontFamily: fonts.ui }]}>{'← Add study material'}</Text>
      </Pressable>

      <View
        style={[
          styles.dropZone,
          { borderColor: tokens.border, borderRadius: radii.md, marginTop: spacing.lg, padding: spacing.xl },
        ]}
      >
        <Text style={[styles.dropTitle, { color: tokens.textPrimary, fontFamily: fonts.uiMedium }]}>
          {pickedFile?.name ?? 'Choose a PDF or TXT file'}
        </Text>
        <Pressable
          onPress={handleBrowse}
          style={[styles.browseButton, { backgroundColor: tokens.accent, borderRadius: radii.md, padding: spacing.md, marginTop: spacing.md }]}
        >
          <Text style={[styles.browseButtonText, { fontFamily: fonts.uiMedium }]}>
            {pickedFile ? 'Choose a different file' : 'Browse files'}
          </Text>
        </Pressable>
      </View>

      <Text style={[styles.note, { color: tokens.textSecondary, fontFamily: fonts.ui, marginTop: spacing.md }]}>
        Supported: PDF, TXT (DOCX coming soon)
      </Text>

      {pickedFile ? (
        <View style={{ marginTop: spacing.lg }}>
          <Text style={[styles.label, { color: tokens.textPrimary, fontFamily: fonts.uiMedium }]}>
            Subject name
          </Text>
          <TextInput
            value={subjectName}
            onChangeText={setSubjectName}
            placeholder="e.g. Cell Biology"
            placeholderTextColor={tokens.textSecondary}
            style={[
              styles.input,
              { color: tokens.textPrimary, fontFamily: fonts.ui, borderColor: tokens.border, borderRadius: radii.md, marginTop: spacing.sm, padding: spacing.md },
            ]}
          />
          {error ? (
            <Text style={[styles.error, { color: tokens.error, fontFamily: fonts.ui, marginTop: spacing.sm }]}>
              {error}
            </Text>
          ) : null}
          <Pressable
            onPress={handleContinue}
            style={[styles.cta, { backgroundColor: tokens.accent, borderRadius: radii.md, padding: spacing.md, marginTop: spacing.lg }]}
          >
            <Text style={[styles.ctaText, { fontFamily: fonts.uiMedium }]}>Continue</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  back: { fontSize: 14 },
  dropZone: { borderWidth: StyleSheet.hairlineWidth, alignItems: 'center' },
  dropTitle: { fontSize: 15, textAlign: 'center' },
  browseButton: { alignItems: 'center', alignSelf: 'stretch' },
  browseButtonText: { color: '#FFFFFF', fontSize: 14 },
  note: { fontSize: 13 },
  label: { fontSize: 14 },
  input: { borderWidth: StyleSheet.hairlineWidth, fontSize: 14 },
  error: { fontSize: 12 },
  cta: { alignItems: 'center' },
  ctaText: { color: '#FFFFFF', fontSize: 15 },
});
