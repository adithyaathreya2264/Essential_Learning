import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ModelId, MODELS } from '../../../src/core/constants/models';
import { getTotalRamGB, recommendModel } from '../../../src/core/utils/deviceCapability';
import { deleteModelInstall, getVerifiedModelInstall } from '../../../src/data/repositories/modelRepository';
import { useModel } from '../../../src/hooks/useModel';
import { useTheme } from '../../../src/ui/theme/ThemeProvider';

function formatGB(bytes: number): string {
  return (bytes / (1024 * 1024 * 1024)).toFixed(1);
}

export default function ModelSettingsScreen() {
  const { tokens, fonts, spacing, radii } = useTheme();
  const router = useRouter();
  const [currentModelId, setCurrentModelId] = useState<ModelId | null>(null);
  const [selected, setSelected] = useState<ModelId>('E2B');
  // Until the installed model is known, we can't tell a "switch" from a no-op.
  // Guard on it so a multi-gigabyte download can't be started by a tap that
  // lands in the gap before this resolves.
  const [loaded, setLoaded] = useState(false);
  const recommended = useMemo(() => recommendModel(), []);
  const ramGB = useMemo(() => getTotalRamGB(), []);

  useEffect(() => {
    getVerifiedModelInstall()
      .then((row) => {
        if (row) {
          setCurrentModelId(row.modelId);
          setSelected(row.modelId);
        }
      })
      .finally(() => setLoaded(true));
  }, []);

  const target = useModel(selected);
  const isSwitching = loaded && selected !== currentModelId;
  const busy = target.status === 'downloading' || target.status === 'verifying';

  useEffect(() => {
    if (target.status === 'verified' && currentModelId && currentModelId !== selected) {
      deleteModelInstall(currentModelId).then(() => setCurrentModelId(selected));
    }
  }, [target.status, currentModelId, selected]);

  const handleDelete = () => {
    if (!currentModelId) return;
    deleteModelInstall(currentModelId).then(() => setCurrentModelId(null));
  };

  return (
    <View style={{ flex: 1, backgroundColor: tokens.background, padding: spacing.md }}>
      <Pressable onPress={() => router.back()}>
        <Text style={[styles.back, { color: tokens.accent, fontFamily: fonts.ui }]}>{'← Switch model'}</Text>
      </Pressable>
      <Text style={[styles.body, { color: tokens.textSecondary, fontFamily: fonts.ui, marginTop: spacing.md }]}>
        {currentModelId
          ? `Currently: ${MODELS[currentModelId].label} (${formatGB(MODELS[currentModelId].sizeBytes)} GB)`
          : 'No model installed yet'}
      </Text>
      {ramGB != null ? (
        <Text style={[styles.body, { color: tokens.textSecondary, fontFamily: fonts.ui, marginTop: spacing.xs / 2 }]}>
          Based on this device ({ramGB.toFixed(1)} GB RAM), we'd recommend {MODELS[recommended].label}.
        </Text>
      ) : null}

      <View style={{ marginTop: spacing.md, gap: spacing.sm }}>
        {(Object.keys(MODELS) as ModelId[]).map((modelId) => (
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
            <Text style={[styles.optionLabel, { color: tokens.textPrimary, fontFamily: fonts.uiMedium }]}>
              {MODELS[modelId].label}
              {modelId === currentModelId ? ' (current)' : ` — ${formatGB(MODELS[modelId].sizeBytes)} GB`}
              {modelId === recommended ? ' · Recommended for this device' : ''}
            </Text>
          </Pressable>
        ))}
      </View>

      {isSwitching ? (
        <Text style={[styles.note, { color: tokens.textSecondary, fontFamily: fonts.ui, marginTop: spacing.md }]}>
          Downloading the new model, then removing the old one once verified. Your progress and content are
          unaffected.
        </Text>
      ) : null}

      {busy ? (
        <Text style={[styles.note, { color: tokens.textSecondary, fontFamily: fonts.ui, marginTop: spacing.sm }]}>
          {target.status === 'verifying'
            ? 'Verifying...'
            : `${formatGB(target.bytesDownloaded)} / ${formatGB(target.totalBytes)} GB`}
        </Text>
      ) : null}

      {target.insufficientStorage ? (
        <Text style={[styles.note, { color: tokens.error, fontFamily: fonts.ui, marginTop: spacing.sm }]}>
          Not enough free storage for {MODELS[selected].label} ({formatGB(MODELS[selected].sizeBytes)}). Free up
          space and try again.
        </Text>
      ) : target.status === 'failed' ? (
        <View style={{ marginTop: spacing.sm }}>
          <Text style={[styles.note, { color: tokens.error, fontFamily: fonts.ui }]}>
            The download stopped before finishing.
          </Text>
          <Pressable onPress={target.retry} style={{ marginTop: spacing.xs }}>
            <Text style={{ color: tokens.accent, fontFamily: fonts.uiMedium, fontSize: 13 }}>Retry</Text>
          </Pressable>
        </View>
      ) : null}

      <Pressable
        onPress={target.start}
        disabled={!isSwitching || busy}
        style={[
          styles.cta,
          { backgroundColor: tokens.accent, borderRadius: radii.md, padding: spacing.md, marginTop: spacing.lg, opacity: !isSwitching || busy ? 0.6 : 1 },
        ]}
      >
        <Text style={[styles.ctaText, { fontFamily: fonts.uiMedium }]}>
          {busy ? 'Downloading...' : 'Download and switch'}
        </Text>
      </Pressable>

      {currentModelId ? (
        <Pressable onPress={handleDelete} style={{ marginTop: spacing.md, alignItems: 'center' }}>
          <Text style={{ color: tokens.error, fontFamily: fonts.ui, fontSize: 13 }}>Delete model</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  back: { fontSize: 14 },
  body: { fontSize: 14 },
  option: { borderWidth: StyleSheet.hairlineWidth },
  optionLabel: { fontSize: 14 },
  note: { fontSize: 13, lineHeight: 18 },
  cta: { alignItems: 'center' },
  ctaText: { color: '#FFFFFF', fontSize: 15 },
});
