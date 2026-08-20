import {
  useFonts as useCaveatFonts,
  Caveat_600SemiBold,
} from '@expo-google-fonts/caveat';
import {
  useFonts as useInterFonts,
  Inter_400Regular,
  Inter_500Medium,
} from '@expo-google-fonts/inter';
import {
  useFonts as useSourceSerifFonts,
  SourceSerif4_400Regular,
  SourceSerif4_700Bold,
} from '@expo-google-fonts/source-serif-4';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import React, { useCallback, useEffect, useState } from 'react';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { reconcileModelInstalls } from '../src/ai/engine/modelDownloader';
import { getDb } from '../src/data/db/client';
import { useNotificationRouter } from '../src/notifications/notificationRouter';
import { ThemeProvider, useTheme } from '../src/ui/theme/ThemeProvider';

SplashScreen.preventAutoHideAsync().catch(() => {});

function RootStack() {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  useNotificationRouter();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        // Applied once, here, for every screen in the app — every route nests
        // under this single root Stack (directly, or via a nested Stack/Tabs
        // navigator of its own), so a per-screen top inset would double up
        // wherever navigators are nested.
        contentStyle: { backgroundColor: tokens.background, paddingTop: insets.top },
      }}
    >
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}

export default function RootLayout() {
  const [serifLoaded] = useSourceSerifFonts({
    SourceSerif4_400Regular,
    SourceSerif4_700Bold,
  });
  const [interLoaded] = useInterFonts({ Inter_400Regular, Inter_500Medium });
  const [caveatLoaded] = useCaveatFonts({ Caveat_600SemiBold });
  const [dbReady, setDbReady] = useState(false);

  useEffect(() => {
    getDb()
      .then(() => reconcileModelInstalls())
      .catch((error) => {
        console.error('Failed to initialize database', error);
      })
      .finally(() => setDbReady(true));
  }, []);

  const fontsLoaded = serifLoaded && interLoaded && caveatLoaded;
  const ready = fontsLoaded && dbReady;

  const onLayoutRootView = useCallback(() => {
    if (ready) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [ready]);

  useEffect(() => {
    onLayoutRootView();
  }, [onLayoutRootView]);

  if (!ready) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <RootStack />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
