import { type SQLiteDatabase } from 'expo-sqlite';
import { CREATE_MODEL_INSTALL_TABLE_SQL } from '../schema';

export async function migrate0002ModelInstall(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(CREATE_MODEL_INSTALL_TABLE_SQL);
}
