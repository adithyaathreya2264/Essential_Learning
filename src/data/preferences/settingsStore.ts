import { getDb } from '../db/client';

const ONBOARDING_COMPLETE_KEY = 'onboardingComplete';

export async function getSetting(key: string): Promise<string | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM Setting WHERE key = ?', [key]);
  return row?.value ?? null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO Setting (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    [key, value]
  );
}

export async function isOnboardingComplete(): Promise<boolean> {
  return (await getSetting(ONBOARDING_COMPLETE_KEY)) === '1';
}

export async function markOnboardingComplete(): Promise<void> {
  await setSetting(ONBOARDING_COMPLETE_KEY, '1');
}
