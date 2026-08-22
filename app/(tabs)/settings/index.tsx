import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MODELS } from '../../../src/core/constants/models';
import { useActiveModel } from '../../../src/hooks/useModel';
import { useTheme } from '../../../src/ui/theme/ThemeProvider';

function formatGB(bytes: number): string {
  return (bytes / (1024 * 1024 * 1024)).toFixed(1);
}

function modelStatusLabel(model: ReturnType<typeof useActiveModel>): string {
  if (!model.modelId) return 'No model installed';
  const label = MODELS[model.modelId].label;
  if (model.status === 'verified') return `${label} installed · ${formatGB(MODELS[model.modelId].sizeBytes)} GB`;
  if (model.status === 'downloading') return `${label} downloading...`;
  if (model.status === 'paused') return `${label} download paused`;
  if (model.status === 'verifying') return `${label} verifying...`;
  if (model.status === 'failed') return `${label} download failed`;
  return label;
}

type RowProps = { label: string; value?: string; onPress?: () => void };

function SettingsSection({ title, children }: { title: string; children: React.ReactNode }) {
  const { tokens, fonts, spacing } = useTheme();
  return (
    <View style={{ marginTop: spacing.lg }}>
      <Text style={[styles.sectionTitle, { color: tokens.textSecondary, fontFamily: fonts.uiMedium }]}>
        {title}
      </Text>
      <View style={{ marginTop: spacing.sm, gap: spacing.sm }}>{children}</View>
    </View>
  );
}

function SettingsRow({ label, value, onPress }: RowProps) {
  const { tokens, fonts, spacing, radii } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.row,
        { backgroundColor: tokens.surface, borderColor: tokens.border, borderRadius: radii.md, padding: spacing.md },
      ]}
    >
      <Text style={[styles.rowLabel, { color: tokens.textPrimary, fontFamily: fonts.ui }]}>{label}</Text>
      {value ? (
        <Text style={[styles.rowValue, { color: tokens.textSecondary, fontFamily: fonts.ui }]}>{value} ›</Text>
      ) : null}
    </Pressable>
  );
}

export default function SettingsScreen() {
  const { tokens, fonts, spacing } = useTheme();
  const router = useRouter();
  const model = useActiveModel();

  return (
    <ScrollView style={{ backgroundColor: tokens.background }} contentContainerStyle={{ padding: spacing.md }}>
      <Text style={[styles.title, { color: tokens.textPrimary, fontFamily: fonts.uiMedium }]}>Settings</Text>

      <SettingsSection title="AI model">
        <SettingsRow label={modelStatusLabel(model)} onPress={() => router.push('/settings/model')} />
      </SettingsSection>

      <SettingsSection title="Study preferences">
        <SettingsRow label="Default quiz difficulty" value="Medium" onPress={() => router.push('/settings/preferences')} />
        <SettingsRow label="Daily reminder time" value="6:00 PM" onPress={() => router.push('/settings/preferences')} />
      </SettingsSection>

      <SettingsSection title="Data">
        <SettingsRow label="Storage used: 340 MB" onPress={() => router.push('/settings/data')} />
        <SettingsRow label="Export all data" onPress={() => router.push('/settings/data')} />
      </SettingsSection>

      <SettingsSection title="About">
        <SettingsRow label="Privacy — nothing leaves this device" onPress={() => router.push('/settings/about')} />
      </SettingsSection>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 18 },
  sectionTitle: { fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: StyleSheet.hairlineWidth },
  rowLabel: { fontSize: 14 },
  rowValue: { fontSize: 13 },
});
