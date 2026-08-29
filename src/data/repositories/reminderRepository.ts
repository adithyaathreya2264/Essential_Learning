import { getDb } from '../db/client';

export type ReminderStatus = 'pending' | 'fired' | 'cancelled';

export type Reminder = {
  id: string;
  chapterId: string;
  note: string | null;
  remindAt: number;
  status: ReminderStatus;
  createdAt: number;
};

export async function createReminder(chapterId: string, note: string | null, remindAt: number): Promise<Reminder> {
  const db = await getDb();
  const now = Date.now();
  const id = `reminder_${now}_${Math.random().toString(36).slice(2, 8)}`;

  await db.runAsync(
    'INSERT INTO Reminder (id, chapterId, note, remindAt, status, createdAt) VALUES (?, ?, ?, ?, ?, ?)',
    [id, chapterId, note, remindAt, 'pending', now]
  );

  return { id, chapterId, note, remindAt, status: 'pending', createdAt: now };
}

export async function listPendingReminders(now: number = Date.now()): Promise<Reminder[]> {
  const db = await getDb();
  return db.getAllAsync<Reminder>(
    "SELECT * FROM Reminder WHERE status = 'pending' AND remindAt <= ? ORDER BY remindAt ASC",
    [now]
  );
}

export async function listRemindersForChapter(chapterId: string): Promise<Reminder[]> {
  const db = await getDb();
  return db.getAllAsync<Reminder>('SELECT * FROM Reminder WHERE chapterId = ? ORDER BY remindAt ASC', [chapterId]);
}

export async function cancelReminder(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync("UPDATE Reminder SET status = 'cancelled' WHERE id = ?", [id]);
}

export async function markFired(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync("UPDATE Reminder SET status = 'fired' WHERE id = ?", [id]);
}
