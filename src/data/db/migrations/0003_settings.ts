import { type SQLiteDatabase } from 'expo-sqlite';
import { CREATE_SETTING_TABLE_SQL } from '../schema';

export async function migrate0003Settings(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(CREATE_SETTING_TABLE_SQL);
}
