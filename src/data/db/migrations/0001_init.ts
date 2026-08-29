import { type SQLiteDatabase } from 'expo-sqlite';
import { CREATE_TABLES_SQL } from '../schema';

export async function migrate0001Init(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(CREATE_TABLES_SQL);
}
