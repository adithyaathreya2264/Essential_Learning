import { Redirect } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { isOnboardingComplete } from '../src/data/preferences/settingsStore';

export default function Index() {
  const [complete, setComplete] = useState<boolean | null>(null);

  useEffect(() => {
    isOnboardingComplete().then(setComplete);
  }, []);

  if (complete === null) {
    return null;
  }

  return <Redirect href={complete ? '/(tabs)/home' : '/onboarding/intro'} />;
}
