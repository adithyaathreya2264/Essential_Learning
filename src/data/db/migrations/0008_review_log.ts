import { type SQLiteDatabase } from 'expo-sqlite';
import { CREATE_REVIEW_LOG_TABLE_SQL } from '../schema';

export async function migrate0008ReviewLog(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(CREATE_REVIEW_LOG_TABLE_SQL);
}
