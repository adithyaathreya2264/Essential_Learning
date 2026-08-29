import { type SQLiteDatabase } from 'expo-sqlite';
import { CREATE_REMINDER_TABLE_SQL } from '../schema';

export async function migrate0007Reminders(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(CREATE_REMINDER_TABLE_SQL);
}
