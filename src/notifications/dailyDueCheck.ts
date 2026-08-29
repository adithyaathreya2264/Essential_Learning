import * as Notifications from 'expo-notifications';
import { listPendingReminders, markFired } from '../data/repositories/reminderRepository';
import { getSetting, setSetting } from '../data/preferences/settingsStore';
import { listDueCards } from '../data/repositories/reviewStateRepository';

const LAST_DUE_CHECK_DATE_KEY = 'lastDueNotificationDate';

function todayKey(now: number): string {
  return new Date(now).toISOString().slice(0, 10);
}

/** Once-per-day aggregate: "N cards ready across M chapters", deep-linking to Due Today. */
async function checkAggregateDueNotification(now: number): Promise<void> {
  const today = todayKey(now);
  const lastChecked = await getSetting(LAST_DUE_CHECK_DATE_KEY);
  if (lastChecked === today) return;

  const dueCards = await listDueCards(undefined, now);
  if (dueCards.length > 0) {
    const chapterCount = new Set(dueCards.map((c) => c.chapterId)).size;
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `${dueCards.length} card${dueCards.length === 1 ? '' : 's'} ready across ${chapterCount} chapter${chapterCount === 1 ? '' : 's'}`,
        data: { route: '/due-today' },
      },
      trigger: null,
    });
  }

  await setSetting(LAST_DUE_CHECK_DATE_KEY, today);
}

/** Manual chat-based reminders — additive to, not replaced by, the FSRS aggregate above. */
async function checkPendingReminders(now: number): Promise<void> {
  const due = await listPendingReminders(now);
  for (const reminder of due) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Time to revise',
        body: reminder.note ?? undefined,
        data: { route: `/chapter/${reminder.chapterId}/actions` },
      },
      trigger: null,
    });
    await markFired(reminder.id);
  }
}

export async function runDailyDueCheck(now: number = Date.now()): Promise<void> {
  await checkAggregateDueNotification(now);
  await checkPendingReminders(now);
}
