import { type SQLiteDatabase } from 'expo-sqlite';
import { CREATE_CHAT_MESSAGE_TABLE_SQL } from '../schema';

export async function migrate0004ChatMessages(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(CREATE_CHAT_MESSAGE_TABLE_SQL);
}
