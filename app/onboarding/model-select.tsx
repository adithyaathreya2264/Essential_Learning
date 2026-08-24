import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { startModelDownload } from '../../src/ai/engine/modelDownloader';
import { getTotalRamGB, recommendModel } from '../../src/core/utils/deviceCapability';
import { ModelId, MODELS } from '../../src/core/constants/models';
import { useTheme } from '../../src/ui/theme/ThemeProvider';

function formatGB(sizeBytes: number): string {
  return `${(sizeBytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export default function ModelSelectScreen() {
  const { tokens, fonts, spacing, radii } = useTheme();
  const router = useRouter();
  const recommended = useMemo(() => recommendModel(), []);
  const ramGB = useMemo(() => getTotalRamGB(), []);
  const [selected, setSelected] = useState<ModelId>(recommended);
  const [storageError, setStorageError] = useState(false);

  const handleDownloadAndContinue = async () => {
    setStorageError(false);
    const result = await startModelDownload(selected);
    if (!result.ok) {
      setStorageError(true);
      return;
    }
    router.push('/onboarding/permissions');
  };

  return (
    <View style={{ flex: 1, backgroundColor: tokens.background, padding: spacing.lg }}>
      <Text style={[styles.title, { color: tokens.textPrimary, fontFamily: fonts.uiMedium }]}>
        Choose your AI model
      </Text>
      <Text style={[styles.body, { color: tokens.textSecondary, fontFamily: fonts.ui, marginTop: spacing.xs }]}>
        {ramGB != null
          ? `Based on your device (${ramGB.toFixed(1)} GB RAM), we'd recommend ${MODELS[recommended].label}.`
          : `We'd recommend ${MODELS[recommended].label}.`}
      </Text>

      <View style={{ marginTop: spacing.lg, gap: spacing.sm }}>
        {(Object.keys(MODELS) as ModelId[]).map((modelId) => {
          const model = MODELS[modelId];
          return (
            <Pressable
              key={modelId}
              onPress={() => setSelected(modelId)}
              style={[
                styles.option,
                {
                  borderColor: selected === modelId ? tokens.accent : tokens.border,
                  backgroundColor: tokens.surface,
                  borderRadius: radii.md,
                  padding: spacing.md,
                },
              ]}
            >
              <Text style={[styles.optionTitle, { color: tokens.textPrimary, fontFamily: fonts.uiMedium }]}>
                {model.label}
                {modelId === recommended ? ' · Recommended' : ''}
              </Text>
              <Text style={[styles.optionBody, { color: tokens.textSecondary, fontFamily: fonts.ui }]}>
                {formatGB(model.sizeBytes)} ·{' '}
                {modelId === 'E2B' ? 'runs smoothly on most phones. Faster responses.' : 'for higher-end phones. Richer answers, more memory.'}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {storageError ? (
        <Text style={[styles.body, { color: tokens.error, fontFamily: fonts.ui, marginTop: spacing.md }]}>
          Not enough free storage for {MODELS[selected].label} ({formatGB(MODELS[selected].sizeBytes)}). Free up
          space and try again.
        </Text>
      ) : null}

      <Pressable
        onPress={handleDownloadAndContinue}
        style={[styles.cta, { backgroundColor: tokens.accent, borderRadius: radii.md, padding: spacing.md, marginTop: spacing.xl }]}
      >
        <Text style={[styles.ctaText, { fontFamily: fonts.uiMedium }]}>
          Download {MODELS[selected].label.replace('Gemma ', '')} and continue
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 20 },
  body: { fontSize: 14 },
  option: { borderWidth: StyleSheet.hairlineWidth },
  optionTitle: { fontSize: 15 },
  optionBody: { fontSize: 12, marginTop: 2 },
  cta: { alignItems: 'center' },
  ctaText: { color: '#FFFFFF', fontSize: 15 },
});
