import { type SQLiteDatabase } from 'expo-sqlite';
import { CREATE_QUIZ_TABLES_SQL } from '../schema';

export async function migrate0005Quiz(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(CREATE_QUIZ_TABLES_SQL);
}
