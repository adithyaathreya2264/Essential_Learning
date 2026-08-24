import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { PermissionsAndroid, Pressable, StyleSheet, Text, View } from 'react-native';
import { markOnboardingComplete } from '../../src/data/preferences/settingsStore';
import { useTheme } from '../../src/ui/theme/ThemeProvider';

type PermissionState = 'idle' | 'granted' | 'denied';

type PermissionItem = {
  key: 'notifications';
  label: string;
  androidPermission: (typeof PermissionsAndroid.PERMISSIONS)[keyof typeof PermissionsAndroid.PERMISSIONS];
};

const PERMISSIONS: PermissionItem[] = [
  { key: 'notifications', label: 'Notifications — revision reminders', androidPermission: PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS },
];

export default function PermissionsScreen() {
  const { tokens, fonts, spacing, radii } = useTheme();
  const router = useRouter();
  const [states, setStates] = useState<Record<PermissionItem['key'], PermissionState>>({
    notifications: 'idle',
  });
  const [requesting, setRequesting] = useState(false);

  const handleContinue = async () => {
    setRequesting(true);
    const next: Record<PermissionItem['key'], PermissionState> = { ...states };

    for (const item of PERMISSIONS) {
      try {
        const result = await PermissionsAndroid.request(item.androidPermission);
        next[item.key] = result === PermissionsAndroid.RESULTS.GRANTED ? 'granted' : 'denied';
      } catch {
        next[item.key] = 'denied';
      }
    }

    setStates(next);
    setRequesting(false);
    await markOnboardingComplete();
    router.replace('/(tabs)/home');
  };

  return (
    <View style={{ flex: 1, backgroundColor: tokens.background, padding: spacing.lg, justifyContent: 'center' }}>
      <Text style={[styles.title, { color: tokens.textPrimary, fontFamily: fonts.uiMedium }]}>
        Enable permissions
      </Text>

      <View style={{ marginTop: spacing.lg, gap: spacing.sm }}>
        <Text style={[styles.permission, { color: tokens.textPrimary, fontFamily: fonts.ui }]}>
          ☐ Storage — save your material
        </Text>
        {PERMISSIONS.map((item) => (
          <Text key={item.key} style={[styles.permission, { color: tokens.textPrimary, fontFamily: fonts.ui }]}>
            {states[item.key] === 'granted' ? '☑' : states[item.key] === 'denied' ? '☒' : '☐'} {item.label}
          </Text>
        ))}
      </View>

      <Pressable
        onPress={handleContinue}
        disabled={requesting}
        style={[styles.cta, { backgroundColor: tokens.accent, borderRadius: radii.md, padding: spacing.md, marginTop: spacing.xl, opacity: requesting ? 0.6 : 1 }]}
      >
        <Text style={[styles.ctaText, { fontFamily: fonts.uiMedium }]}>Continue</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 20 },
  permission: { fontSize: 14 },
  cta: { alignItems: 'center' },
  ctaText: { color: '#FFFFFF', fontSize: 15 },
});
